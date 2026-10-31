import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { seg, steps } from "./pass";

/**
 * L'appareil du dessin en volume, pour le passage vers /astres (option A,
 * choisie le 31/10/2026 ; maquette dans portfolio-build/travail/explore3d).
 *
 * Construit à partir du SVG affiché, sans modèle ni photo : chaque pièce
 * (coque as-xs, plaque as-xp, organes as-xc) garde sa face avant rasterisée
 * à l'identique (styles calculés recopiés, polices de la page embarquées) et
 * reçoit une épaisseur extrudée depuis les formes réelles du dessin. À
 * l'instant 0 l'épaisseur est nulle : l'image est celle du dessin, sans saut.
 * Même construction pour le dessin large, le vertical et la vue éclatée du
 * pied (les pièces y partent écartées et se rassemblent).
 *
 * Exemple :
 *   const prep = await prepare(svg);            // au survol ou au focus
 *   const f = fly(svg, prep, canvas);           // au clic
 *   f.pose(t);                                  // t de 0 à GO.arrive, dans les deux sens
 *   f.dispose();
 */

/** Chronologie de l'aller, en ms (le retour la rejoue à l'envers). */
export const GO = {
  press: 120, // renvoi enfoncé, 2 crans
  fade: 360, // épaisseur et effacement des notes, 3 crans
  tilt: [120, 700] as const, // pivot de trois quarts, la seule courbe douce
  dive: [700, 1400] as const, // retour de face et plongée dans la vitre
  veil: [1150, 1400] as const, // la vague s'éteint en 3 crans, couleur vitre
  arrive: 1400, // changement de page, au noir
};

/* ---------- temps ---------- */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const xt = ((ax * t + bx) * t + cx) * t - x;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(xt) < 1e-5 || !d) break;
      t -= xt / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
/** ease-draw de l'identité (cubic-bezier(.4,0,.2,1)). */
export const easeDraw = bezier(0.4, 0, 0.2, 1);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- formes de l'appareil, en unités du dessin (Appareil.tsx) ---------- */
function rrect(x: number, y: number, w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function disc(cx: number, cy: number, r: number) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}
type Key = "xs" | "xp" | "xc";
const KEYS: Key[] = ["xs", "xp", "xc"];
/** Face avant commune par pièce ; chaque forme a son propre dos. */
const FRONT: Record<Key, number> = { xs: 34, xp: 40, xc: 54 };
const PARTS: Record<Key, [() => THREE.Shape, number][]> = {
  xs: [
    [() => rrect(250, 120, 300, 470, 44), 0],
    [() => rrect(281, 30, 22, 98, 11), 18],
    [() => rrect(273, 104, 38, 20, 6), 16],
    [() => rrect(362, 111, 40, 12, 4), 20],
    [() => rrect(414, 111, 40, 12, 4), 20],
    [() => rrect(241, 300, 12, 56, 4), 14],
  ],
  xp: [[() => rrect(266, 136, 268, 410, 30), 34]],
  xc: [
    [() => disc(340, 222, 42), 40],
    [() => disc(460, 222, 42), 40],
    [() => rrect(286, 304, 228, 118, 14), 44],
    [() => disc(346, 488, 44), 42],
    [() => disc(506, 160, 8), 48],
  ],
};
const PIVOT = { x: 400, y: 355 };
const FRAME = [228, 20, 340, 580] as const; // l'appareil, antenne et bouton latéral compris
const SCREEN = [286, 304, 228, 118] as const; // cadre de l'écran
const GLASS = { cx: 400, cy: 363, w: 208, h: 98 }; // vitre (rect.a-glass)

/* ---------- rasterisation ---------- */
const PROPS = [
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "opacity", "visibility", "display", "font-family", "font-size",
  "font-weight", "font-stretch", "letter-spacing", "transform", "transform-origin", "transform-box",
];

let fonts: Promise<string> | null = null;
/** Les @font-face de la page (Archivo, Martian Mono) en data: : un SVG en image ne voit pas les polices du document. */
function fontCSS() {
  fonts ??= (async () => {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of Array.from(list)) if (r instanceof CSSFontFaceRule) rules.push(r);
    }
    const wanted = rules.filter((r) => {
      const fam = r.style.getPropertyValue("font-family");
      const range = r.style.getPropertyValue("unicode-range");
      // sous-ensemble latin seulement (u+00?? chez next/font)
      return /archivo|martian/i.test(fam) && /url\(/.test(r.style.getPropertyValue("src")) && (!range || /U\+0{0,2}\?\?|U\+0-FF\b|U\+0000-00FF/i.test(range));
    });
    const out = await Promise.all(
      wanted.map(async (r) => {
        const url = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+)/)?.[1];
        if (!url) return "";
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        let css = r.cssText.replace(url, `data:font/woff2;base64,${btoa(bin)}`);
        // l'étiquette est en Archivo condensé : la face doit annoncer son axe de largeur
        if (/archivo/i.test(r.style.getPropertyValue("font-family")) && !/font-stretch/.test(css)) css = css.replace(/}\s*$/, "font-stretch:62% 125%;}");
        return css;
      }),
    );
    return out.join("\n");
  })().catch(() => "");
  return fonts;
}

/** Copie d'un groupe avec ses styles calculés en ligne (état affiché à l'instant, sans classes). */
function frozen(group: Element) {
  const copy = group.cloneNode(true) as Element;
  const src = [group, ...Array.from(group.querySelectorAll("*"))];
  const dst = [copy, ...Array.from(copy.querySelectorAll("*"))];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    let style = PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
    if (el.classList.contains("a-pulse")) style += ";display:none";
    dst[i].setAttribute("style", style);
    dst[i].removeAttribute("class");
  });
  // l'esquisse au survol (soulèvement, ombre) ne fait pas partie de la pièce
  (copy as SVGElement).style.transform = "none";
  return copy.outerHTML;
}

async function rasterize(svg: SVGSVGElement, group: Element, vb: readonly number[], ppu: number) {
  const w = Math.max(2, Math.round(vb[2] * ppu));
  const h = Math.max(2, Math.round(vb[3] * ppu));
  const defs = svg.querySelector("defs")?.outerHTML ?? "";
  const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb.join(" ")}"><style>${await fontCSS()}</style>${defs}${frozen(group)}</svg>`;
  const url = URL.createObjectURL(new Blob([src], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")?.drawImage(img, 0, 0, w, h);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Prepared = {
  faces: Record<Key, HTMLCanvasElement>;
  screen: HTMLCanvasElement;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

const groupsOf = (svg: SVGSVGElement) => ({
  xs: svg.querySelector(".as-xs"),
  xp: svg.querySelector(".as-xp"),
  xc: svg.querySelector(".as-xc"),
});

const cache = new WeakMap<SVGSVGElement, Promise<Prepared | null>>();

/** Rasterise les faces du dessin (une fois par dessin ; à lancer au survol ou au focus). */
export function prepare(svg: SVGSVGElement): Promise<Prepared | null> {
  let p = cache.get(svg);
  if (!p) {
    p = (async () => {
      const g = groupsOf(svg);
      if (!g.xs || !g.xp || !g.xc) return null;
      const k = (g.xs as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ppu = Math.min(6, Math.max(2, k * dpr * 1.5));
      const body = g.xs.querySelectorAll(".a-body")[1] ?? g.xs.querySelector(".a-body");
      const cs = body ? getComputedStyle(body) : null;
      const [xs, xp, xc, screen] = await Promise.all([
        rasterize(svg, g.xs, FRAME, ppu),
        rasterize(svg, g.xp, FRAME, ppu),
        rasterize(svg, g.xc, FRAME, ppu * 1.4),
        rasterize(svg, g.xc, SCREEN, 14),
      ]);
      return {
        faces: { xs, xp, xc },
        screen,
        fill: cs?.fill ?? "#ece9e1",
        stroke: cs?.stroke ?? "#0a0d16",
        strokeWidth: parseFloat(cs?.strokeWidth ?? "2") || 2,
      };
    })().catch(() => null);
    cache.set(svg, p);
  }
  return p;
}

export type Flight = {
  /** Pose l'appareil et la caméra à l'instant t (0 à GO.arrive). */
  pose: (t: number) => void;
  dispose: () => void;
};

/** Monte la scène sur `canvas` (plein écran, fixe), calée sur le dessin tel qu'il est à l'écran. */
export function fly(svg: SVGSVGElement, prep: Prepared, canvas: HTMLCanvasElement): Flight | null {
  const g = groupsOf(svg);
  if (!g.xs || !g.xp || !g.xc) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);

  const fov = 20;
  const D = H / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
  const camera = new THREE.PerspectiveCamera(fov, W / H, D - 900, D + 900);
  camera.position.set(0, 0, D);
  const scene = new THREE.Scene();
  const world = (m: DOMMatrix, x: number, y: number) => new THREE.Vector3(m.a * x + m.e - W / 2, H / 2 - (m.d * y + m.f), 0);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);
  const fill = new THREE.Color(prep.fill);
  const ink = new THREE.Color(prep.stroke);
  const side = keep(new THREE.MeshBasicMaterial({ color: fill.clone().lerp(ink, 0.15), side: THREE.DoubleSide }));
  const cap = keep(new THREE.MeshBasicMaterial({ visible: false }));

  const m0 = (g.xs as SVGGraphicsElement).getScreenCTM();
  if (!m0) return null;
  const k = m0.a;
  const line = keep(new LineMaterial({ color: ink.getHex(), linewidth: prep.strokeWidth * k, worldUnits: true }));
  line.resolution.set(W, H);

  const root = new THREE.Group();
  root.position.copy(world(m0, PIVOT.x, PIVOT.y));
  scene.add(root);

  const texture = (c: HTMLCanvasElement) => {
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // le repère du dessin descend
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const face = (c: HTMLCanvasElement, vb: readonly number[], z: number, order: number) => {
    const mat = keep(new THREE.MeshBasicMaterial({ map: texture(c), transparent: true, alphaTest: 0.02, side: THREE.DoubleSide }));
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(vb[2], vb[3])), mat);
    mesh.position.set(vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, z);
    mesh.renderOrder = order;
    return mesh;
  };

  const layers = {} as Record<Key, THREE.Group & { userData: { home: THREE.Vector3 } }>;
  KEYS.forEach((key, i) => {
    const m = (g[key] as SVGGraphicsElement).getScreenCTM() ?? m0;
    const L = new THREE.Group() as THREE.Group & { userData: { home: THREE.Vector3 } };
    L.userData.home = world(m, PIVOT.x, PIVOT.y).sub(root.position);
    L.position.copy(L.userData.home);
    L.scale.set(k, -k, k);
    const inner = new THREE.Group();
    inner.position.set(-PIVOT.x, -PIVOT.y, 0);
    L.add(inner);
    for (const [shape, back] of PARTS[key]) {
      const geo = keep(new THREE.ExtrudeGeometry(shape(), { depth: FRONT[key] - back, bevelEnabled: false, curveSegments: 20 }));
      const mesh = new THREE.Mesh(geo, [cap, side]);
      mesh.position.z = back;
      mesh.renderOrder = i + 1;
      const edges = keep(new THREE.EdgesGeometry(geo, 35));
      const lg = keep(new LineSegmentsGeometry().setPositions(edges.attributes.position.array as Float32Array));
      const ls = new LineSegments2(lg, line);
      ls.position.z = back;
      inner.add(mesh, ls);
    }
    inner.add(face(prep.faces[key], FRAME, FRONT[key] + 0.05, 10 + i));
    if (key === "xc") inner.add(face(prep.screen, SCREEN, FRONT.xc + 0.1, 20));
    root.add(L);
    layers[key] = L;
  });

  // la vitre doit couvrir tout l'écran au bout de la plongée
  const cover = 1.2 * Math.max(W / (GLASS.w * k), H / (GLASS.h * k));

  const pose = (t: number) => {
    const depth = Math.max(0.01, steps(3)(seg(t, 0, GO.fade)));
    const gather = 1 - steps(3)(seg(t, 0, GO.fade)); // vue éclatée du pied : les pièces se rassemblent
    const tilt = easeDraw(seg(t, GO.tilt[0], GO.tilt[1]));
    const p = easeDraw(seg(t, GO.dive[0], GO.dive[1]));
    const front = easeDraw(seg(t, GO.dive[0], GO.dive[0] + (GO.dive[1] - GO.dive[0]) * 0.6));
    root.rotation.y = -0.6 * tilt * (1 - front);
    root.rotation.x = 0.2 * tilt * (1 - front);
    for (const key of KEYS) {
      const L = layers[key];
      L.scale.z = k * depth;
      L.position.copy(L.userData.home).multiplyScalar(gather);
    }
    // plongée : zoom géométrique (vitesse perçue constante), la visée rejoint la vitre au même rythme
    const zoom = Math.pow(cover, p);
    const aim = (1 - 1 / zoom) / (1 - 1 / cover); // atteint la vitre pile au bout
    const L = layers.xc;
    const gz = FRONT.xc * k * depth + L.position.z;
    const gx = root.position.x + L.position.x + (GLASS.cx - PIVOT.x) * k;
    const gy = root.position.y + L.position.y - (GLASS.cy - PIVOT.y) * k;
    camera.position.set(lerp(0, gx, aim), lerp(0, gy, aim), gz + (D - gz) / zoom);
    camera.near = Math.max(1, camera.position.z - gz - 400 * k);
    camera.far = camera.position.z + 1400;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  return {
    pose,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

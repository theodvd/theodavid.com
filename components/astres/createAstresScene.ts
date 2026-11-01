import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import gsap from "gsap";

/**
 * /astres : tout ce que Théo a construit, en un seul système solaire.
 *
 * Refaite le 01/11/2026 (chantier « astres-v2 », moteur porté du banc
 * d'essai travail/astres/proto) :
 *  - système P4 : les produits dans l'ordre de la home (01 au plus près du
 *    soleil), l'atelier en ceinture d'astéroïdes nommés, les ventures
 *    au-delà (fermée : globe estompé, orbite en tirets), les lunes autour de
 *    leur planète, les expériences en anneaux inclinés autour du soleil
 *    (à venir : en tirets) ;
 *  - couleurs C-F « vraies couleurs » (façon Eyes on the Solar System) :
 *    chaque corps garde sa teinte, son orbite et son étiquette la prennent,
 *    soleil orange, étoiles discrètes, aucun halo.
 * La scène ne lit que la liste des corps (slug, famille, parent, état) :
 * orbites, tailles et teintes en sont déduites, en boucle sur les tables
 * ci-dessous, pour qu'un ajout dans content/ y entre seul.
 *
 * Langage visuel : des globes en lignes de crête (Unknown Pleasures). Chaque
 * corps est une pile d'anneaux de latitude déplacés par un bruit simplex 3D ;
 * une sphère opaque de la couleur du ciel, cachée dedans, masque les lignes
 * de l'arrière. Sans elle, tout se lit en fil de fer.
 *
 * Budget : UN appel de dessin par globe (anneaux de latitude et anneaux de
 * Saturne dans la même géométrie, un attribut `aRing` choisit la règle).
 *
 * Tout l'impératif vit ici. React ne touche aucun objet Three : il reçoit
 * focusBody, setInset, setTimeScale, registerMarkerEl et des rappels, et
 * confie les étiquettes en DOM brut, positionnées à chaque image sans état
 * React.
 */

export const SUN_ID = "sun";

/** Familles de corps. */
export type AstresKind = "product" | "venture" | "tool" | "exp" | "moon";

/** Ce que la scène lit d'un corps : son slug, sa famille, son parent (lune), son état. */
export type AstresItem = {
  slug: string;
  kind: AstresKind;
  /** Lune : slug du produit ou de la venture autour duquel elle tourne. */
  parent?: string;
  /** closed : venture fermée (estompée, orbite en tirets) ; future : expérience à venir (anneau en tirets). */
  state?: "closed" | "future";
};

/* ------------------------------------------------------------------ *
 *  Tables d'aspect                                                    *
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const SUN_RADIUS = 6;
const SUN_DIST = 30; // assez loin pour garder les deux premières orbites à l'image

/** Couleurs du thème sombre de l'identité (app/styles/td.css). */
const T = {
  glass: "#0a0d16", // device-glass : le ciel, la couleur de la vitre du passage
  ink: "#e7eef5",
  strong: "#6f86a3",
  tech: "#5d7593",
  rec: "#8c93ad",
  wave: "#3e4c70",
  rule: "#2c4058",
};

/** Teinte d'un globe : ligne claire (crêtes) et ligne sombre (creux). */
type Hue = { a: string; b: string };

/**
 * Aspect des produits, attribué dans l'ordre de la home, en boucle :
 * les planètes de la scène d'avant (Neptune, Saturne, Vénus, Mars, Jupiter),
 * puis deux teintes ajoutées pour les 6e et 7e produits, puis Mercure.
 */
const PRODUCT_LOOKS: (Hue & { radius: number; ring: boolean; tilt: number; band: number })[] = [
  { a: "#6F9FE8", b: "#142C68", radius: 1.9, ring: true, tilt: 0.49, band: 7 }, // Neptune
  { a: "#EFC34E", b: "#6E4C14", radius: 2.3, ring: true, tilt: 0.47, band: 12 }, // Saturne
  { a: "#F2A86C", b: "#9C4E22", radius: 1.55, ring: false, tilt: 0.05, band: 4 }, // Vénus
  { a: "#E25638", b: "#531405", radius: 1.35, ring: false, tilt: 0.44, band: 3 }, // Mars
  { a: "#EDB05C", b: "#7A4418", radius: 2.5, ring: false, tilt: 0.05, band: 10 }, // Jupiter
  { a: "#8FD3D8", b: "#1E4F57", radius: 1.7, ring: false, tilt: 0.3, band: 8 }, // turquoise
  { a: "#B9A6EC", b: "#33255E", radius: 1.6, ring: false, tilt: 0.22, band: 5 }, // lilas
  { a: "#CFC9BC", b: "#575044", radius: 1.15, ring: false, tilt: 0.01, band: 6 }, // Mercure
];

/** Ventures, dans l'ordre de Founder, en boucle. */
const VENTURE_LOOKS: (Hue & { radius: number; tilt: number; band: number; phase: number; approach: number })[] = [
  { a: "#CFC9BC", b: "#575044", radius: 1.5, tilt: 0.2, band: 5, phase: 0.4, approach: 0.3 },
  { a: "#7FB0D8", b: "#1D3A55", radius: 1.7, tilt: 0.35, band: 6, phase: 2.6, approach: 2.4 },
  { a: "#9FC28A", b: "#2F4A23", radius: 1.6, tilt: 0.1, band: 4, phase: 4.6, approach: -1.8 },
];

/**
 * Orbites des produits, de l'intérieur vers l'extérieur. Périodes de 90 s à
 * 12 min à l'échelle 1, d'où l'échelle 10 par défaut. Inclinaisons minimes :
 * assez pour éviter les éclipses vues de bas, pas assez pour casser la
 * lecture d'un système plat.
 */
const PRODUCT_ORBITS = [
  { r: 18, period: 90, phase: 0.55, inc: 0.03, approach: 0.9 },
  { r: 28, period: 165, phase: 2.4, inc: -0.06, approach: -0.7 },
  { r: 40, period: 255, phase: 4.1, inc: 0.05, approach: 2.2 },
  { r: 52, period: 360, phase: 5.6, inc: -0.04, approach: -2.5 },
  { r: 64, period: 500, phase: 1.7, inc: 0.05, approach: 1.6 },
  { r: 74, period: 600, phase: 3.3, inc: -0.03, approach: 0.4 },
  { r: 84, period: 700, phase: 5.0, inc: 0.04, approach: -1.2 },
];

/** Au-delà de la table, une orbite tous les 10, en reprenant les phases en boucle. */
const orbitOf = (i: number) => {
  const n = PRODUCT_ORBITS.length;
  if (i < n) return PRODUCT_ORBITS[i];
  const extra = i - n + 1;
  return { ...PRODUCT_ORBITS[i % n], r: PRODUCT_ORBITS[n - 1].r + 10 * extra, period: 700 + 100 * extra };
};

/** Expériences : anneaux inclinés juste autour du soleil (inclinaison, noeud), en boucle. */
const EXP_PLANES = [
  { inc: 1.1, node: 0.2 },
  { inc: 0.75, node: 1.4 },
  { inc: 0.45, node: 2.6 },
  { inc: 0.9, node: 3.7 },
];

/* ------------------------------------------------------------------ *
 *  Corps                                                              *
 * ------------------------------------------------------------------ */

type Body = {
  id: string;
  kind: AstresKind | "sun";
  parent: Body | null;
  radius: number;
  /* orbite */
  r: number;
  omega: number; // rad/s à l'échelle 1
  phase: number;
  inc: number;
  node: number;
  /* aspect */
  hue: Hue | null; // teinte propre (produits, ventures) : globe, orbite et étiquette
  colorA: string;
  colorB: string;
  opacity: number;
  lat: number; // anneaux de latitude (ordinateur)
  ring: boolean;
  tilt: number;
  freq: number;
  amp: number;
  seed: number;
  /* caméra */
  approach: number;
  state?: AstresItem["state"];
};

/**
 * Le soleil puis un corps par entrée, rangés par famille : produits, ceinture
 * de l'atelier juste après le dernier produit, ventures au-delà, lunes autour
 * de leur parent, expériences en anneaux autour du soleil. Renvoie aussi la
 * ceinture et le rayon du système (recul maximal).
 */
function buildBodies(items: AstresItem[]) {
  const sun: Body = {
    id: SUN_ID, kind: "sun", parent: null, radius: SUN_RADIUS, r: 0, omega: 0, phase: 0, inc: 0, node: 0,
    hue: null, colorA: "#FFB23D", colorB: "#A8330A", opacity: 0.6, lat: 74, ring: false, tilt: 0,
    freq: 2.6, amp: 0.1, seed: 4.2, approach: 0.55,
  };
  const of = (k: AstresKind) => items.filter((it) => it.kind === k);
  const bodies: Body[] = [sun];
  let seeds = 0;
  const nextSeed = () => 11.7 + seeds++ * 37.13;

  of("product").forEach((it, i) => {
    const look = PRODUCT_LOOKS[i % PRODUCT_LOOKS.length];
    const o = orbitOf(i);
    bodies.push({
      id: it.slug, kind: "product", parent: sun, radius: look.radius, r: o.r, omega: TAU / o.period, phase: o.phase,
      inc: o.inc, node: 0, hue: look, colorA: look.a, colorB: look.b, opacity: 1, lat: 74, ring: look.ring,
      tilt: look.tilt, freq: 2 + look.band * 0.4, amp: 0.075, seed: nextSeed(), approach: o.approach,
    });
  });
  const lastProduct = Math.max(PRODUCT_ORBITS[0].r, ...bodies.map((b) => (b.kind === "product" ? b.r : 0)));

  // ceinture de l'atelier : de quoi loger le dernier produit, puis 7 d'épaisseur
  const belt = { r0: lastProduct + 6, r1: lastProduct + 13 };
  const beltMid = (belt.r0 + belt.r1) / 2;
  of("tool").forEach((it, i) => {
    bodies.push({
      id: it.slug, kind: "tool", parent: sun, radius: 0.55 + (i % 2) * 0.12, r: beltMid + (i % 3) - 1, omega: TAU / 760,
      phase: 0.6 + i * 1.25, inc: (i % 2 ? 1 : -1) * 0.02, node: 0, hue: null, colorA: T.rec, colorB: T.wave, opacity: 1,
      lat: 74, ring: false, tilt: i * 0.7, freq: 3.6, amp: 0.32, seed: nextSeed(), approach: i * 1.3,
    });
  });

  const v0 = belt.r1 + 12;
  of("venture").forEach((it, i) => {
    const look = VENTURE_LOOKS[i % VENTURE_LOOKS.length];
    bodies.push({
      id: it.slug, kind: "venture", parent: sun, radius: look.radius, r: v0 + 13 * i, omega: TAU / (900 + 200 * i),
      phase: look.phase + Math.floor(i / VENTURE_LOOKS.length), inc: (i % 2 ? -1 : 1) * 0.04, node: 0, hue: look,
      colorA: look.a, colorB: look.b, opacity: it.state === "closed" ? 0.3 : 0.75, lat: 34, ring: false, tilt: look.tilt,
      freq: 2 + look.band * 0.4, amp: 0.075, seed: nextSeed(), approach: look.approach, state: it.state,
    });
  });

  const byId = new Map(bodies.map((b) => [b.id, b]));
  const perParent = new Map<string, number>();
  of("moon").forEach((it, i) => {
    const parent = (it.parent && byId.get(it.parent)) || sun;
    const k = perParent.get(parent.id) ?? 0;
    perParent.set(parent.id, k + 1);
    // au-delà des anneaux de la planète s'il y en a (ils s'étendent jusqu'à 2,4 rayons)
    const r = parent.radius * (parent.ring ? 2.9 : 2.2) + 1.2 + k * 1.1;
    bodies.push({
      id: it.slug, kind: "moon", parent, radius: [0.55, 0.42, 0.6][i % 3], r, omega: TAU / (30 + 8 * i),
      phase: 1 + i * 1.5, inc: [0.3, 0.4, -0.25][i % 3], node: 0, hue: null, colorA: T.rec, colorB: T.rule, opacity: 1,
      lat: 74, ring: false, tilt: 0.3, freq: 4.4, amp: 0.075, seed: nextSeed(), approach: (i * 1.7) % TAU,
    });
  });

  of("exp").forEach((it, i) => {
    const plane = EXP_PLANES[i % EXP_PLANES.length];
    bodies.push({
      id: it.slug, kind: "exp", parent: sun, radius: 0.35, r: 8.6 + 1.2 * i, omega: TAU / (26 + 4 * i),
      phase: 0.3 + i * 1.9, inc: plane.inc, node: plane.node + Math.floor(i / EXP_PLANES.length) * 0.5, hue: null,
      colorA: T.ink, colorB: T.ink, opacity: 1, lat: 0, ring: false, tilt: 0, freq: 0, amp: 0, seed: 0,
      approach: (i * 1.7) % TAU, state: it.state,
    });
  });

  const outer = Math.max(belt.r1, ...bodies.map((b) => (b.parent === sun ? b.r : 0)));
  return { sun, bodies, belt, outer, hasBelt: of("tool").length > 0 };
}

/* ------------------------------------------------------------------ *
 *  Shaders                                                            *
 * ------------------------------------------------------------------ */

/* Bruit simplex d'Ashima et Stefan Gustavson (webgl-noise, MIT), recopié
   ici pour ne tirer aucune dépendance. */
const SIMPLEX = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // 3 octaves : assez de détail pour la silhouette des crêtes à 180 segments,
  // assez peu pour tourner sur chaque sommet à chaque image
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * snoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

const VERTEX = /* glsl */ `
  attribute vec3 aDir;   // direction sur la sphère unité (ou dans le plan pour l'anneau)
  attribute float aRad;  // multiple du rayon : 1 sur le globe, plus de 1 sur l'anneau
  attribute float aRing; // 0 = anneau de latitude, 1 = anneaux équatoriaux

  uniform float uRadius;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uSeed;
  uniform float uTime; // 0 pour les planètes (relief fixe), dérive pour le soleil

  varying float vElev;

  ${SIMPLEX}

  void main() {
    vec3 d = normalize(aDir);
    vec3 p;
    if (aRing > 0.5) {
      // anneaux : plats dans le plan de l'équateur, à peine rugueux
      float rn = fbm(d * uFreq * 1.6 + vec3(uSeed + 11.0));
      p = d * uRadius * aRad * (1.0 + 0.012 * rn);
      p.y += uRadius * 0.015 * rn;
      vElev = 0.30 + 0.35 * (rn * 0.5 + 0.5);
    } else {
      // tout le style : l'anneau de latitude poussé vers l'extérieur par le relief
      float n = fbm(d * uFreq + vec3(uSeed) + vec3(uTime));
      p = d * uRadius * (1.0 + uAmp * n);
      vElev = clamp(n * 0.5 + 0.5, 0.0, 1.0);
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vElev;

  void main() {
    // des creux (ligne sombre) aux crêtes (ligne claire), crêtes éclaircies ;
    // le plancher des deux mélanges garde les creux visibles sur un vrai écran
    vec3 col = mix(uColorB, uColorA, 0.12 + 0.88 * vElev);
    col *= 0.7 + 0.8 * vElev;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ *
 *  Géométrie                                                          *
 * ------------------------------------------------------------------ */

/**
 * Une géométrie LineSegments par globe : `lat` anneaux de latitude (chacun
 * `seg` segments, rangés par paires de sommets), plus des cercles concentriques
 * à l'équateur pour les planètes à anneaux. Le téléphone tourne à environ 60 %
 * du budget de l'ordinateur sur chaque compte ; les petits corps (outils,
 * lunes) se contentent de 22 anneaux de 64 segments.
 */
function buildRidgeGeometry(b: Body, isMobile: boolean) {
  const small = b.radius < 0.9;
  const lat = Math.max(8, Math.round((isMobile ? 0.6 : 1) * (small ? Math.min(b.lat, 22) : b.lat)));
  const seg = isMobile ? 108 : small ? 64 : 180;
  const ringCount = b.ring ? (isMobile ? 8 : 12) : 0;
  const ringSeg = isMobile ? 110 : 190;

  const total = (lat * seg + ringCount * ringSeg) * 2;
  const position = new Float32Array(total * 3);
  const aDir = new Float32Array(total * 3);
  const aRad = new Float32Array(total);
  const aRing = new Float32Array(total);

  let v = 0;
  const put = (x: number, y: number, z: number, r: number, ring: number) => {
    const i3 = v * 3;
    aDir[i3] = x;
    aDir[i3 + 1] = y;
    aDir[i3 + 2] = z;
    // `position` sert à Three (sphère englobante) ; la vraie position est calculée par le shader
    position[i3] = x * b.radius * r;
    position[i3 + 1] = y * b.radius * r;
    position[i3 + 2] = z * b.radius * r;
    aRad[v] = r;
    aRing[v] = ring;
    v++;
  };

  for (let j = 0; j < lat; j++) {
    // (j + 0.5) laisse les deux pôles ouverts : un pôle fermé fait un point brillant
    const theta = (Math.PI * (j + 0.5)) / lat;
    const y = Math.cos(theta);
    const rr = Math.sin(theta);
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * TAU;
      const a1 = ((k + 1) / seg) * TAU;
      put(Math.cos(a0) * rr, y, Math.sin(a0) * rr, 1, 0);
      put(Math.cos(a1) * rr, y, Math.sin(a1) * rr, 1, 0);
    }
  }
  for (let j = 0; j < ringCount; j++) {
    const r = 1.45 + (j / Math.max(ringCount - 1, 1)) * 0.95;
    for (let k = 0; k < ringSeg; k++) {
      const a0 = (k / ringSeg) * TAU;
      const a1 = ((k + 1) / ringSeg) * TAU;
      put(Math.cos(a0), 0, Math.sin(a0), r, 1);
      put(Math.cos(a1), 0, Math.sin(a1), r, 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));
  geometry.setAttribute("aRad", new THREE.BufferAttribute(aRad, 1));
  geometry.setAttribute("aRing", new THREE.BufferAttribute(aRing, 1));
  geometry.computeBoundingSphere();
  // le shader pousse les sommets vers l'extérieur : sphère englobante élargie
  if (geometry.boundingSphere) geometry.boundingSphere.radius *= 1.15;
  return geometry;
}

/* ------------------------------------------------------------------ *
 *  Fabrique                                                           *
 * ------------------------------------------------------------------ */

export type AstresScene = {
  focusBody: (id: string, instant?: boolean) => void;
  /** Recentre le rendu dans la partie libre (px masqués à droite et en bas ; négatif : décale vers la droite). */
  setInset: (right: number, bottom: number) => void;
  setTimeScale: (n: number) => void;
  /** Étiquette d'un corps (DOM brut) : la scène la place à chaque image et lui donne la teinte du corps. */
  registerMarkerEl: (id: string, el: HTMLElement | null) => void;
  setOnArrive: (cb: (id: string) => void) => void;
  setOnBodyClick: (cb: (id: string) => void) => void;
  destroy: () => void;
};

export type AstresSceneOptions = {
  reducedMotion: boolean;
  timeScale: number;
  /** Les corps à mettre en orbite, dans l'ordre de la home pour chaque famille. */
  items: AstresItem[];
  /** Arrivée par le calque : la caméra glisse jusqu'au soleil (1,1 s, dur-draw). */
  intro?: boolean;
  /** Appelé une fois, au premier rendu. */
  onReady?: () => void;
};

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/** Angle équivalent le plus proche, pour qu'un voyage ne fasse jamais le grand tour. */
const nearestAngle = (from: number, to: number) => to + TAU * Math.round((from - to) / TAU);

/** Priorité des étiquettes (anti-collision) : après l'objet choisi, le soleil, les produits, les ventures, les outils, les lunes. */
const LABEL_RANK: Record<Body["kind"], number> = { sun: 0, product: 1, venture: 2, exp: 3, tool: 4, moon: 5 };

export function createAstresScene(container: HTMLElement, opts: AstresSceneOptions): AstresScene | null {
  let renderer: THREE.WebGLRenderer;
  const isMobile = window.innerWidth < 768;

  try {
    renderer = new THREE.WebGLRenderer({
      // les lignes gagnent bien plus au MSAA que des particules : il vaut son prix ici
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null; // pas de WebGL : React garde la page noire et le repli
  }

  const { reducedMotion } = opts;
  let timeScale = opts.timeScale;

  const { sun, bodies, belt, outer, hasBelt } = buildBodies(opts.items);
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const MAX_DIST = Math.max(260, outer * 2.4);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);

  // Effacement en NOIR pur : par le compositeur, la couleur d'effacement prend
  // un encodage sRGB de plus (un #0a0d16 s'affiche délavé) alors que le noir
  // ne bouge pas. La couleur du ciel vient de la sphère plus bas, qui passe
  // par la même chaîne que les lignes.
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;";
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  // Plus de halo (C-F, 01/11/2026). Le compositeur reste, réduit au rendu puis
  // à la conversion sRGB finale : les lignes additives se mélangent ainsi en
  // espace linéaire, comme sur le banc d'essai ; rendues directement, elles se
  // mélangeraient en sRGB et le soleil, très dense, blanchirait.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ---- corps ----------------------------------------------------- */

  type Rig = {
    b: Body;
    root: THREE.Group; // position sur l'orbite et inclinaison de l'axe
    spin: THREE.Group; // lente rotation sur l'axe incliné
    material?: THREE.ShaderMaterial;
    glyph?: THREE.Object3D; // expérience : un point toujours face à la caméra
  };
  const occluders: THREE.Mesh[] = [];
  // une seule matière pour tous les masques, de la couleur du ciel
  const occluderMaterial = keep(new THREE.MeshBasicMaterial({ color: T.glass, depthWrite: true }));
  const pickMaterial = keep(new THREE.MeshBasicMaterial({ visible: false }));

  const rigs: Rig[] = bodies.map((b) => {
    const root = new THREE.Group();
    const spin = new THREE.Group();
    root.rotation.z = b.tilt;
    root.add(spin);
    scene.add(root);
    const rig: Rig = { b, root, spin };

    if (b.kind === "exp") {
      // une expérience : un point sur son anneau, et une sphère invisible pour le clic
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
      const dot = new THREE.Points(
        g,
        keep(new THREE.PointsMaterial({ color: T.ink, size: 7, sizeAttenuation: false, transparent: true, opacity: b.state === "future" ? 0.5 : 1 })),
      );
      root.add(dot);
      rig.glyph = dot;
      const hit = new THREE.Mesh(keep(new THREE.SphereGeometry(1.2, 8, 6)), pickMaterial);
      hit.userData.bodyId = b.id;
      root.add(hit);
      occluders.push(hit);
      return rig;
    }

    const material = keep(
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uRadius: { value: b.radius },
          uAmp: { value: b.amp },
          uFreq: { value: b.freq },
          uSeed: { value: b.seed },
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(b.colorA) },
          uColorB: { value: new THREE.Color(b.colorB) },
          uOpacity: { value: b.opacity },
        },
        transparent: true,
        depthWrite: false, // les lignes n'écrivent pas la profondeur...
        depthTest: true, // ...mais la testent : c'est ce dont le masque a besoin
        blending: THREE.AdditiveBlending,
      }),
    );
    const lines = new THREE.LineSegments(keep(buildRidgeGeometry(b, isMobile)), material);
    // Le masque : une sphère opaque juste sous le plancher du relief. Three
    // dessine l'opaque avant le transparent : la moitié arrière du globe est
    // rejetée par la profondeur.
    const occluder = new THREE.Mesh(keep(new THREE.SphereGeometry(b.radius * (1 - b.amp) * 0.99, 32, 24)), occluderMaterial);
    occluder.userData.bodyId = b.id;
    spin.add(lines);
    spin.add(occluder);
    occluders.push(occluder);
    rig.material = material;
    return rig;
  });

  /* ---- orbites : un cercle par corps, dans le plan (noeud puis inclinaison) de son orbite ---- */

  type OrbitRig = { b: Body; holder: THREE.Group; mat: THREE.LineBasicMaterial; opacity: number };
  const orbitRigs: OrbitRig[] = [];
  for (const b of bodies) {
    if (!b.parent) continue;
    const pts = new Float32Array(257 * 3);
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * TAU;
      pts[i * 3] = Math.cos(a) * b.r;
      pts[i * 3 + 2] = Math.sin(a) * b.r;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const future = b.state === "future";
    const closed = b.state === "closed";
    // l'orbite prend la teinte de son corps ; lunes plus discrètes ; anneaux des expériences en trait de notice
    const color = b.hue ? b.hue.a : b.kind === "exp" ? (future ? T.tech : T.strong) : T.tech;
    const opacity = b.kind === "exp" ? 0.9 : b.kind === "moon" ? 0.3 : closed ? 0.27 : b.hue ? 0.45 : 0.5;
    const dashed = future || closed;
    const scale = Math.max(b.r, 1);
    const mat = keep(
      dashed
        ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, depthWrite: false, dashSize: 0.072 * scale, gapSize: 0.012 * scale * (future ? 6 : 3) })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
    );
    const loop = new THREE.LineLoop(g, mat);
    if (dashed) loop.computeLineDistances(); // les tirets ont besoin des distances le long de la ligne
    const tiltG = new THREE.Group();
    tiltG.rotation.x = b.inc;
    tiltG.add(loop);
    const nodeG = new THREE.Group();
    nodeG.rotation.y = b.node;
    nodeG.add(tiltG);
    const holder = new THREE.Group();
    holder.add(nodeG);
    scene.add(holder);
    orbitRigs.push({ b, holder, mat, opacity });
  }

  /* ---- ceinture de l'atelier ---------------------------------------- */

  if (hasBelt) {
    const n = isMobile ? 540 : 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const r = belt.r0 + Math.random() * (belt.r1 - belt.r0);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(
      new THREE.Points(g, keep(new THREE.PointsMaterial({ color: T.tech, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }))),
    );
  }

  /* ---- ciel ------------------------------------------------------ */

  // La couleur de la vitre (device-glass), en vraie géométrie (sphère tournée
  // vers l'intérieur) plutôt qu'en couleur d'effacement : elle passe ainsi par
  // la même gestion des couleurs que tout le reste et s'affiche à #0a0d16,
  // le noir de fin du passage Explore in 3D.
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(1400, 24, 16)),
    keep(new THREE.MeshBasicMaterial({ color: T.glass, side: THREE.BackSide, depthWrite: false })),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---- étoiles, discrètes ---------------------------------------- */

  const starCount = isMobile ? 252 : 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const r = 600 + Math.random() * 500;
    starPos[i * 3] = s * Math.cos(phi) * r;
    starPos[i * 3 + 1] = u * r;
    starPos[i * 3 + 2] = s * Math.sin(phi) * r;
  }
  const starGeometry = keep(new THREE.BufferGeometry());
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      starGeometry,
      keep(new THREE.PointsMaterial({ color: T.rec, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false })),
    ),
  );

  /* ---- état de la caméra ---------------------------------------- */

  const cam = { theta: 0.55, phi: 0.3, dist: SUN_DIST };
  const blend = { v: 1 }; // 0 = sur `fromId`, 1 = sur `toId`
  let fromId = SUN_ID;
  let toId = SUN_ID;
  const fromOffset = new THREE.Vector3(); // voir focusBody() : continuité si on interrompt
  let transitioning = false;

  let orbitTime = 0; // avance de dt × timeScale : une pause ne fait jamais sauter un corps
  let sunTime = 0;
  let spinTime = 0;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;
  let velTheta = 0;
  let velPhi = 0;
  const pointer = { x: 0, y: 0 };

  // au doigt : deux doigts passent de l'orbite au pincement
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinching = false;
  let pinchGap = 0;
  const pointerGap = () => {
    const pts = Array.from(activePointers.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  let onArrive: ((id: string) => void) | null = null;
  let onBodyClick: ((id: string) => void) | null = null;

  const tmp = new THREE.Vector3();
  const tmpFrom = new THREE.Vector3();
  const tmpTo = new THREE.Vector3();
  const tmpNdc = new THREE.Vector3();
  const tmpCam = new THREE.Vector3();
  const anchor = new THREE.Vector3();

  /** Position d'un corps : somme des orbites de sa chaîne (la lune autour de sa planète). */
  function bodyPos(b: Body, out: THREE.Vector3) {
    out.set(0, 0, 0);
    for (let c: Body | null = b; c && c.parent; c = c.parent) {
      const a = c.phase + orbitTime * c.omega;
      const x = Math.cos(a) * c.r;
      const z0 = Math.sin(a) * c.r;
      const y1 = z0 * Math.sin(c.inc);
      const z1 = z0 * Math.cos(c.inc);
      const cn = Math.cos(c.node);
      const sn = Math.sin(c.node);
      out.x += x * cn + z1 * sn;
      out.y += y1;
      out.z += -x * sn + z1 * cn;
    }
    return out;
  }

  /** Cible de la caméra : les deux bouts sont réévalués à chaque image, le voyage suit les corps qui tournent. */
  function computeAnchor(out: THREE.Vector3) {
    bodyPos(byId.get(fromId) ?? sun, tmpFrom).add(fromOffset);
    bodyPos(byId.get(toId) ?? sun, tmpTo);
    return out.lerpVectors(tmpFrom, tmpTo, blend.v);
  }

  // Le téléphone en portrait a un champ horizontal étroit : on recule.
  const defaultDist = (b: Body) =>
    b === sun ? (isMobile ? SUN_DIST * 1.55 : SUN_DIST) : b.kind === "exp" ? (isMobile ? 16 : 12) : Math.max(b.radius, 0.9) * (isMobile ? 8.5 : 7);

  /** Corps choisi : son orbite ressort (la couleur ne change pas, l'étiquette passe à l'encre). */
  function highlight(id: string) {
    for (const o of orbitRigs) o.mat.opacity = o.b.id === id ? Math.min(1, o.opacity * 1.8) : o.opacity;
  }

  function focusBody(id: string, instant = false) {
    const target = byId.get(id);
    if (!target) return;

    // Continuité si on interrompt : la cible actuelle devient un décalage par
    // rapport à la destination précédente, pour que le mélange reparte de 0
    // sans ramener la caméra au début du voyage.
    computeAnchor(anchor);
    fromId = toId;
    bodyPos(byId.get(fromId) ?? sun, tmpFrom);
    fromOffset.copy(anchor).sub(tmpFrom);
    toId = id;
    highlight(id);

    gsap.killTweensOf(blend);
    gsap.killTweensOf(cam);

    const dist = defaultDist(target);
    const phi = target === sun ? 0.3 : 0.22;
    const theta = nearestAngle(cam.theta, target.approach);

    if (instant || reducedMotion) {
      blend.v = 1;
      fromOffset.set(0, 0, 0);
      fromId = toId;
      cam.dist = dist;
      cam.phi = phi;
      cam.theta = theta;
      transitioning = false;
      onArrive?.(id);
      return;
    }

    blend.v = 0;
    transitioning = true;
    gsap.to(blend, {
      v: 1,
      duration: 2.2,
      ease: "power3.inOut",
      onComplete() {
        fromOffset.set(0, 0, 0);
        fromId = toId;
        transitioning = false;
        onArrive?.(id);
      },
    });
    gsap.to(cam, { dist, phi, theta, duration: 2.2, ease: "power3.inOut" });
  }

  /* ---- clic sur un corps ---------------------------------------- */

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    // on vise les sphères des masques, pas les dizaines de milliers de segments
    const hits = raycaster.intersectObjects(occluders, false);
    return hits.length ? (hits[0].object.userData.bodyId as string) : null;
  }

  /* ---- gestes ---------------------------------------------------- */

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      // second doigt : l'orbite passe la main au pincement
      pinching = true;
      dragging = false;
      pinchGap = pointerGap();
      gsap.killTweensOf(cam, "dist");
      return;
    }
    if (pinching) return; // un 3e doigt ne change rien
    dragging = true;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    velTheta = 0;
    velPhi = 0;
    // le glisser prend l'orientation tout de suite, le voyage et le recul finissent seuls
    gsap.killTweensOf(cam, "theta,phi");
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (e: PointerEvent) => {
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinching) {
      if (activePointers.size >= 2) {
        const gap = pointerGap();
        if (gap > 0 && pinchGap > 0) {
          const b = byId.get(toId) ?? sun;
          cam.dist = clamp(cam.dist * (pinchGap / gap), b.radius * 2.5, MAX_DIST);
        }
        pinchGap = gap;
      }
      return;
    }
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velTheta = -dx * 0.005;
      velPhi = dy * 0.005;
      cam.theta += velTheta;
      cam.phi = clamp(cam.phi + velPhi, -1.2, 1.2);
      return;
    }
    canvas.style.cursor = pick(e.clientX, e.clientY) ? "pointer" : "grab";
  };

  const endDrag = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    if (pinching && activePointers.size < 2) pinching = false;
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "grab";
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDragging = dragging;
    endDrag(e);
    if (!wasDragging) return;
    // un clic est un relâché qui a à peine bougé ; le reste était une orbite
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (!id) return;
    // Le rappel part avant focusBody() : en mouvement réduit l'arrivée est
    // immédiate, et React doit déjà savoir qu'on est parti.
    onBodyClick?.(id);
    if (id !== toId) focusBody(id);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    gsap.killTweensOf(cam, "dist");
    const b = byId.get(toId) ?? sun;
    cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), b.radius * 2.5, MAX_DIST);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---- étiquettes accrochées (DOM, projetées à chaque image) ---- */

  type Marker = { el: HTMLElement; box: HTMLElement | null; bw: number; off: string; hide: string; on: string };
  const markers = new Map<string, Marker>();

  function registerMarkerEl(id: string, el: HTMLElement | null) {
    if (!el) {
      markers.delete(id);
      return;
    }
    const b = byId.get(id);
    if (b?.hue) el.style.color = b.hue.a; // l'étiquette prend la teinte de son orbite (Atlas of Moons)
    markers.set(id, { el, box: el.querySelector<HTMLElement>("[data-box]"), bw: 0, off: "", hide: "", on: "" });
  }

  const setFlag = (m: Marker, key: "off" | "hide" | "on", v: string) => {
    if (m[key] === v) return;
    m[key] = v;
    m.el.dataset[key] = v;
  };

  /**
   * Place chaque étiquette sur son corps : trait de rappel à 45° depuis le
   * bord du globe, puis symbole et nom. Une étiquette qui touche une étiquette
   * plus importante s'efface. Écrit directement dans le DOM, 60 fois par
   * seconde, sans React.
   */
  function updateMarkers() {
    if (!markers.size) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const focal = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
    type Box = { m: Marker; x: number; y: number; bw: number; p: number };
    const boxes: Box[] = [];
    markers.forEach((m, id) => {
      const b = byId.get(id);
      if (!b) return;
      bodyPos(b, tmp);
      // la profondeur dans le repère de la caméra dit si le corps est derrière nous
      tmpCam.copy(tmp).applyMatrix4(camera.matrixWorldInverse);
      tmpNdc.copy(tmp).project(camera);
      const sx = (tmpNdc.x * 0.5 + 0.5) * w;
      const sy = (-tmpNdc.y * 0.5 + 0.5) * h;
      const off = tmpCam.z > -0.5 || sx < 8 || sx > w - 8 || sy < 8 || sy > h - 8;
      // rayon apparent, pour accrocher le trait au bord du globe
      const rpx = Math.min((b.radius / Math.max(-tmpCam.z, 0.1)) * focal, 400);
      m.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      m.el.style.setProperty("--r", `${rpx.toFixed(1)}px`);
      setFlag(m, "off", off ? "1" : "0");
      const on = id === toId;
      setFlag(m, "on", on ? "1" : "0");
      if (!m.bw && m.box) m.bw = m.box.offsetWidth;
      if (!off) boxes.push({ m, x: sx + rpx * 0.71 + 15, y: sy - rpx * 0.71 - 21, bw: m.bw || 80, p: on ? -1 : LABEL_RANK[b.kind] });
    });
    boxes.sort((a, b) => a.p - b.p);
    const kept: Box[] = [];
    for (const bx of boxes) {
      const hit = kept.some((k) => bx.x < k.x + k.bw + 6 && k.x < bx.x + bx.bw + 6 && Math.abs(bx.y - k.y) < 13);
      setFlag(bx.m, "hide", hit ? "1" : "0");
      if (!hit) kept.push(bx);
    }
  }

  /* ---- taille et partie libre ------------------------------------ */

  // fiche ou cartouche : le centre de l'image glisse au milieu de la partie libre
  const inset = { right: 0, bottom: 0 };
  const applyInset = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (inset.right || inset.bottom) camera.setViewOffset(w, h, inset.right / 2, inset.bottom / 2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h || 1;
    applyInset();
    markers.forEach((m) => (m.bw = 0)); // les étiquettes ont pu changer de taille
  };
  resize();
  window.addEventListener("resize", resize);

  /* ---- boucle ---------------------------------------------------- */

  const IDLE_DRIFT = 0.02; // rad/s : au repos, le système continue de respirer
  let readySent = false;
  let last = performance.now();
  const q = new THREE.Quaternion();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (!reducedMotion) {
      orbitTime += dt * timeScale;
      // la surface du soleil ondule toujours, à peine plus vite quand l'horloge accélère
      sunTime += dt * (1 + Math.min(timeScale, 100) * 0.01);
      spinTime += dt * 0.05 * clamp(timeScale, 0, 3);
    }

    camera.getWorldQuaternion(q);
    for (const rig of rigs) {
      bodyPos(rig.b, tmp);
      rig.root.position.copy(tmp);
      rig.spin.rotation.y = rig.b === sun ? spinTime * 0.6 : spinTime;
      if (rig.b === sun && rig.material) rig.material.uniforms.uTime.value = sunTime * 0.15;
      if (rig.glyph) rig.glyph.quaternion.copy(q);
    }
    // l'orbite d'une lune suit sa planète
    for (const o of orbitRigs) bodyPos(o.b.parent ?? sun, o.holder.position);

    // orientation : glisser, sinon élan, sinon dérive (jamais deux à la fois)
    if (!dragging) {
      if (!transitioning) {
        cam.theta += velTheta;
        cam.phi = clamp(cam.phi + velPhi, -1.2, 1.2);
        if (!reducedMotion) cam.theta += IDLE_DRIFT * dt;
      }
      velTheta *= 0.9;
      velPhi *= 0.9;
    }

    computeAnchor(anchor);
    const th = cam.theta + pointer.x * 0.05; // léger parallaxe au pointeur
    const ph = clamp(cam.phi - pointer.y * 0.04, -1.35, 1.35);
    const cp = Math.cos(ph);
    camera.position.set(anchor.x + cam.dist * cp * Math.sin(th), anchor.y + cam.dist * Math.sin(ph), anchor.z + cam.dist * cp * Math.cos(th));
    camera.lookAt(anchor);

    // les étiquettes se projettent avec les matrices de la caméra : à jour d'abord
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    updateMarkers();

    composer.render();
    if (!readySent) {
      readySent = true;
      opts.onReady?.();
    }
  });

  // ouverture sur le soleil, immédiate (le calque d'arrivée fait l'apparition)
  focusBody(SUN_ID, true);
  // arrivée par le calque : la caméra part de plus loin et glisse en 1,1 s
  if (opts.intro && !reducedMotion) {
    const dist = cam.dist;
    const phi = cam.phi;
    cam.dist = dist * 1.8;
    cam.phi = 0.7;
    gsap.to(cam, { dist, phi, duration: 1.1, ease: "power2.inOut" });
  }

  return {
    focusBody,
    setInset(right: number, bottom: number) {
      inset.right = right;
      inset.bottom = bottom;
      applyInset();
    },
    setTimeScale(n: number) {
      timeScale = n;
    },
    registerMarkerEl,
    setOnArrive(cb) {
      onArrive = cb;
    },
    setOnBodyClick(cb) {
      onBodyClick = cb;
    },
    destroy() {
      renderer.setAnimationLoop(null);
      gsap.killTweensOf(cam);
      gsap.killTweensOf(blend);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      markers.clear();
      disposables.forEach((d) => d.dispose());
      outputPass.dispose();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

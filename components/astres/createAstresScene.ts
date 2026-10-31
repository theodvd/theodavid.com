import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";

/**
 * /astres: the portfolio rendered as ONE navigable solar system.
 *
 * Rebranché le 30/10/2026 sur le contenu (content/products) : une planète par
 * produit, dans l'ordre de la page, numérotée comme sur la home ; les
 * ventures restent hors scène. L'aspect des planètes vient de LOOKS, attribué
 * dans l'ordre (plus de dépendance à data/).
 *
 * Visual language: "ridgeline globes" (Unknown Pleasures). Every body is a
 * stack of constant-latitude rings; each ring is an elevation profile line
 * displaced by 3D simplex noise. No shaded surfaces anywhere: the volume is
 * implied purely by line density and by an opaque black sphere hidden inside
 * each globe that lets the front rings occlude the back ones. Without that
 * occluder the whole thing reads as wireframe mush, so it is not optional.
 *
 * Budget: ONE draw call per body. The globe rings AND the equatorial ring
 * system live in the same merged BufferGeometry, drawn as a single
 * THREE.LineSegments; a per-vertex `aRing` flag selects the displacement rule
 * in the vertex shader.
 *
 * Everything imperative lives here. React never touches a Three object: it
 * gets four entry points (focusBody / setTimeScale / registerMarkerEl /
 * callbacks) and hands over raw DOM elements for the markers, whose screen
 * positions are written directly each frame: no per-frame React state.
 */

/* ------------------------------------------------------------------ *
 *  Body table: single source of truth, shared with the React layer   *
 * ------------------------------------------------------------------ */

export const SUN_ID = "sun";

export type AstresBody = {
  id: string; // "sun" or a project slug
  label: string; // "SUN" / "NEPTUNE": display name
  index: string; // "" for the sun, "01".."04" for projects
  title: string; // project title (empty for the sun)
  accent: string; // "R G B", from LOOKS: tints the marker index
  radius: number;
  isSun: boolean;
  /* orbit */
  orbitRadius: number;
  omega: number; // rad/s at timeScale 1
  phase: number;
  inclination: number; // tiny tilt of the orbital plane, rad
  /* look */
  colorA: string; // high-elevation line color
  colorB: string; // low-elevation line color
  ring: boolean;
  tilt: number; // axial tilt, rad (from LOOKS)
  freq: number; // noise frequency
  amp: number; // noise amplitude
  seed: number;
  opacity: number;
  /* camera */
  approach: number; // preferred azimuth to arrive from, rad
};

/**
 * Orbit slots run inner → outer. Periods run ~90s inner to ~6min outer at
 * timeScale 1, which is why the HUD defaults to 10×: at 1× the outer planets
 * barely crawl. Inclinations are deliberately tiny: enough to stop planets
 * eclipsing each other from a low camera, not enough to break the "flat
 * system" reading.
 */
const ORBITS = [
  { radius: 18, period: 90, phase: 0.55, inclination: 0.03, approach: 0.9 },
  { radius: 28, period: 165, phase: 2.4, inclination: -0.06, approach: -0.7 },
  { radius: 40, period: 255, phase: 4.1, inclination: 0.05, approach: 2.2 },
  { radius: 54, period: 360, phase: 5.6, inclination: -0.04, approach: -2.5 },
  { radius: 70, period: 500, phase: 1.7, inclination: 0.05, approach: 1.6 },
  // keep one more slot than there are projects: a new planet must never
  // fall back onto the last orbit and collide with its neighbour
  { radius: 86, period: 640, phase: 3.3, inclination: -0.03, approach: 0.4 },
  { radius: 102, period: 800, phase: 5.0, inclination: 0.04, approach: -1.2 },
  { radius: 118, period: 960, phase: 0.9, inclination: -0.05, approach: 2.8 },
];

/**
 * Slots are assigned by the planet's REAL solar-system rank, not by project
 * index: Neptune orbiting inside Venus reads as a mistake to anyone who knows
 * the sky. The project numbering (01 to 04) stays on the markers; only the
 * orbital layout is astronomical. Sizes follow the same logic: gas giants
 * bigger than rocky planets.
 */
const SOLAR_RANK: Record<string, number> = {
  Mercury: 0,
  Venus: 1,
  Earth: 2,
  Mars: 3,
  Jupiter: 4,
  Saturn: 5,
  Uranus: 6,
  Neptune: 7,
};

const BODY_RADIUS: Record<string, number> = {
  Mercury: 1.15,
  Venus: 1.55,
  Mars: 1.35,
  Jupiter: 2.5,
  Saturn: 2.3,
  Neptune: 1.9,
};

/** Ce que la scène lit d'un produit : son slug, son numéro (« 01 ») et son nom. */
export type AstresItem = { slug: string; n: string; name: string };

/** Aspect d'une planète (repris de l'ancien data/planets.ts). */
type Look = {
  name: string;
  colorA: string;
  colorB: string;
  ring: boolean;
  tilt: number;
  bandFreq: number;
  accent: string;
};

/** Une planète par produit, attribuée dans l'ordre de la page, en boucle. */
const LOOKS: Look[] = [
  { name: "Neptune", colorA: "#6F9FE8", colorB: "#142C68", ring: true, tilt: 0.49, bandFreq: 7, accent: "111 159 232" },
  { name: "Saturn", colorA: "#EFC34E", colorB: "#6E4C14", ring: true, tilt: 0.47, bandFreq: 12, accent: "230 190 76" },
  { name: "Venus", colorA: "#F2A86C", colorB: "#9C4E22", ring: false, tilt: 0.05, bandFreq: 4, accent: "240 158 100" },
  { name: "Mars", colorA: "#E25638", colorB: "#531405", ring: false, tilt: 0.44, bandFreq: 3, accent: "228 84 54" },
  { name: "Jupiter", colorA: "#EDB05C", colorB: "#7A4418", ring: false, tilt: 0.05, bandFreq: 10, accent: "237 176 92" },
  { name: "Mercury", colorA: "#CFC9BC", colorB: "#575044", ring: false, tilt: 0.01, bandFreq: 6, accent: "207 201 188" },
];

const TAU = Math.PI * 2;
const SUN_RADIUS = 6;
const SUN_DIST = 30; // far enough that the two inner orbits stay in frame
const MAX_DIST = 120; // far enough to frame the outermost orbit

const SUN: AstresBody = {
  id: SUN_ID,
  label: "Sun",
  index: "",
  title: "",
  accent: "255 178 61",
  radius: SUN_RADIUS,
  isSun: true,
  orbitRadius: 0,
  omega: 0,
  phase: 0,
  inclination: 0,
  colorA: "#FFB23D",
  colorB: "#A8330A",
  ring: false,
  tilt: 0,
  freq: 2.6,
  amp: 0.1,
  seed: 4.2,
  // below the planets: the sun has 74 dense rings; at full opacity its
  // centre would over-accumulate into a white blob under bloom
  opacity: 0.72,
  approach: 0.55,
};

/** Le soleil puis une planète par produit, sur des orbites rangées comme le vrai système. */
export function buildBodies(items: AstresItem[]): AstresBody[] {
  const looks = items.map((_, i) => LOOKS[i % LOOKS.length]);
  const slots = new Map(
    items
      .map((it, i) => ({ slug: it.slug, rank: SOLAR_RANK[looks[i].name] ?? 9, i }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map((x, slot) => [x.slug, slot] as const),
  );
  return [
    SUN,
    ...items.map((it, i) => {
      const spec = looks[i];
      const orbit = ORBITS[slots.get(it.slug) ?? i] ?? ORBITS[ORBITS.length - 1];
      return {
        id: it.slug,
        label: spec.name,
        index: it.n,
        title: it.name,
        accent: spec.accent,
        radius: BODY_RADIUS[spec.name] ?? 1.5,
        isSun: false,
        orbitRadius: orbit.radius,
        omega: TAU / orbit.period,
        phase: orbit.phase,
        inclination: orbit.inclination,
        colorA: spec.colorA,
        colorB: spec.colorB,
        ring: spec.ring,
        tilt: spec.tilt,
        freq: 2 + spec.bandFreq * 0.4,
        amp: 0.075,
        seed: 11.7 + i * 37.13,
        opacity: 1,
        approach: orbit.approach,
      };
    }),
  ];
}

/* ------------------------------------------------------------------ *
 *  Shaders                                                            *
 * ------------------------------------------------------------------ */

/* Ashima / Stefan Gustavson simplex noise (webgl-noise, MIT): inlined so
   the page pulls in no extra dependency. */
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

  // 3 octaves is the sweet spot: enough detail for the ridge silhouette to
  // read at 180 segments, cheap enough to run on every vertex every frame.
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
  attribute vec3 aDir;   // unit-sphere direction (or in-plane dir for the ring)
  attribute float aRad;  // radius multiplier: 1.0 on the globe, >1 on the ring
  attribute float aRing; // 0 = globe ring, 1 = equatorial ring system

  uniform float uRadius;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uSeed;
  uniform float uTime; // 0 for planets (static terrain), drifting for the sun

  varying float vElev;

  ${SIMPLEX}

  void main() {
    vec3 d = normalize(aDir);
    vec3 p;

    if (aRing > 0.5) {
      // Ring system: stays flat in the equatorial plane, just roughened a
      // little so the concentric circles don't read as perfect vector art.
      float rn = fbm(d * uFreq * 1.6 + vec3(uSeed + 11.0));
      p = d * uRadius * aRad * (1.0 + 0.012 * rn);
      p.y += uRadius * 0.015 * rn;
      vElev = 0.30 + 0.35 * (rn * 0.5 + 0.5);
    } else {
      // The whole look: displace the latitude ring radially by the terrain.
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
    // ridges climb from the dark band color to the bright one, and get a
    // brightness boost on top so peaks separate from the mass under additive.
    // The floor on both mixes keeps valleys visible: pure colorB at low
    // brightness read as "black on black" on real screens.
    vec3 col = mix(uColorB, uColorA, 0.12 + 0.88 * vElev);
    col *= 0.7 + 0.8 * vElev;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ *
 *  Geometry                                                           *
 * ------------------------------------------------------------------ */

/**
 * One merged LineSegments geometry per body: `lat` constant-latitude rings
 * (each `seg` straight segments, stored as vertex PAIRS) plus, for ringed
 * specs, a set of concentric equatorial circles.
 */
function buildRidgeGeometry(body: AstresBody, isMobile: boolean) {
  // mobile runs ~60% of the desktop budget (both counts, so ~36% of vertices)
  const lat = isMobile ? 44 : 74;
  const seg = isMobile ? 108 : 180;
  const ringCount = body.ring ? (isMobile ? 8 : 12) : 0;
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
    // `position` is required by Three (bounding sphere, frustum culling); the
    // real vertex position is computed in the shader from aDir.
    position[i3] = x * body.radius * r;
    position[i3 + 1] = y * body.radius * r;
    position[i3 + 2] = z * body.radius * r;
    aRad[v] = r;
    aRing[v] = ring;
    v++;
  };

  for (let j = 0; j < lat; j++) {
    // (j + 0.5) keeps both poles open: a closed pole is a bright dot artifact
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
  // the shader pushes vertices outward, so pad the culling sphere
  if (geometry.boundingSphere) geometry.boundingSphere.radius *= 1.15;
  return geometry;
}

/* ------------------------------------------------------------------ *
 *  Factory                                                            *
 * ------------------------------------------------------------------ */

export type AstresScene = {
  focusBody: (id: string, instant?: boolean) => void;
  /** Recentre le rendu hors de la fiche ouverte (px masqués à droite et en bas). */
  setInset: (right: number, bottom: number) => void;
  setTimeScale: (n: number) => void;
  registerMarkerEl: (id: string, el: HTMLElement | null) => void;
  setOnArrive: (cb: (id: string) => void) => void;
  setOnBodyClick: (cb: (id: string) => void) => void;
  destroy: () => void;
};

export type AstresSceneOptions = {
  reducedMotion: boolean;
  timeScale: number;
  /** Les produits à mettre en orbite. */
  items: AstresItem[];
  /** Arrivée par le calque : la caméra glisse jusqu'au soleil (1,1 s, dur-draw). */
  intro?: boolean;
  /** Appelé une fois, au premier rendu. */
  onReady?: () => void;
};

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/** Nearest equivalent angle, so a tween never takes the long way round. */
const nearestAngle = (from: number, to: number) =>
  to + TAU * Math.round((from - to) / TAU);

export function createAstresScene(
  container: HTMLElement,
  opts: AstresSceneOptions
): AstresScene | null {
  let renderer: THREE.WebGLRenderer;
  const isMobile = window.innerWidth < 768;

  try {
    renderer = new THREE.WebGLRenderer({
      // lines benefit from MSAA far more than particles do: worth it here
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null; // WebGL unavailable -> React keeps the black page + overlays
  }

  const { reducedMotion } = opts;
  let timeScale = opts.timeScale;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

  // Clear stays PURE BLACK: through the composer the clear color gets an
  // extra sRGB encode (a #05070c clear displays as washed-out slate) while
  // black is invariant. The visible sky color comes from the sky sphere
  // below, which goes through the same correct pipeline as the lines.
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;";
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  // Bloom is what makes 1px additive lines actually READ on a real screen:
  // each line gets a soft halo instead of staying a dry hairline. The
  // threshold must sit ABOVE the clear color's luminance: at 0 the flat
  // background blooms itself into a washed-out slate (gamma amplifies the
  // lift on dark values enormously): lines glow, the sky must not.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Strength/radius kept tight: the sun is a huge bright mass, and at wide
  // radii its largest blur mip washes the ENTIRE frame into grey slate.
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.35, 0.1);
  composer.addPass(bloomPass);

  const bodies = buildBodies(opts.items);
  const byId = new Map(bodies.map((b) => [b.id, b]));

  /* ---- bodies ---------------------------------------------------- */

  type BodyRig = {
    body: AstresBody;
    root: THREE.Group; // orbital position + axial tilt
    spin: THREE.Group; // slow rotation about the tilted axis
    lines: THREE.LineSegments;
    geometry: THREE.BufferGeometry;
    material: THREE.ShaderMaterial;
    occluder: THREE.Mesh;
    occGeometry: THREE.SphereGeometry;
  };

  // one shared black material for every occluder: 5 meshes, 1 material
  const occluderMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthWrite: true,
  });

  const rigs: BodyRig[] = bodies.map((body) => {
    const geometry = buildRidgeGeometry(body, isMobile);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uRadius: { value: body.radius },
        uAmp: { value: body.amp },
        uFreq: { value: body.freq },
        uSeed: { value: body.seed },
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(body.colorA) },
        uColorB: { value: new THREE.Color(body.colorB) },
        uOpacity: { value: body.opacity },
      },
      transparent: true,
      depthWrite: false, // lines never write depth...
      depthTest: true, // ...but they DO test it, which is what the occluder needs
      blending: THREE.AdditiveBlending,
    });

    const lines = new THREE.LineSegments(geometry, material);

    // The occluder: an opaque black sphere just under the terrain floor
    // (min displaced radius is R * (1 - amp * 0.875), so this never eats the
    // front-facing lines). Three renders opaque before transparent, so the
    // back half of the globe is depth-rejected: the Joy Division read.
    const occGeometry = new THREE.SphereGeometry(
      body.radius * (1 - body.amp) * 0.99,
      32,
      24
    );
    const occluder = new THREE.Mesh(occGeometry, occluderMaterial);
    occluder.userData.bodyId = body.id;

    const spin = new THREE.Group();
    spin.add(lines);
    spin.add(occluder);

    const root = new THREE.Group();
    root.rotation.z = body.tilt; // axial tilt from LOOKS
    root.add(spin);
    scene.add(root);

    return { body, root, spin, lines, geometry, material, occluder, occGeometry };
  });

  const occluders = rigs.map((r) => r.occluder);

  /* ---- orbits ---------------------------------------------------- */

  const orbitLines: THREE.LineLoop[] = [];
  const orbitGeometries: THREE.BufferGeometry[] = [];
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0x8fa4bd,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  for (const body of bodies) {
    if (body.isSun) continue;
    const pts = new Float32Array(257 * 3);
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * TAU;
      pts[i * 3] = Math.cos(a) * body.orbitRadius;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = Math.sin(a) * body.orbitRadius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const loop = new THREE.LineLoop(g, orbitMaterial);
    loop.rotation.x = body.inclination; // same plane as the body itself
    scene.add(loop);
    orbitLines.push(loop);
    orbitGeometries.push(g);
  }

  /* ---- sky ------------------------------------------------------- */

  // NOT pure black: 1px lines on #000 crush into invisibility on dim panels.
  // A deep blue-black floor lets the lines separate from the void. Done as
  // real geometry (inward-facing sphere) rather than the clear color, so it
  // is color-managed exactly like every other material.
  const skyGeometry = new THREE.SphereGeometry(900, 24, 16);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0d16,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = -1; // drawn first; everything else paints over it
  scene.add(sky);

  /* ---- starfield ------------------------------------------------- */

  const starCount = isMobile ? 500 : 800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const r = 420 + Math.random() * 320;
    starPos[i * 3] = s * Math.cos(phi) * r;
    starPos[i * 3 + 1] = u * r;
    starPos[i * 3 + 2] = s * Math.sin(phi) * r;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  scene.add(new THREE.Points(starGeometry, starMaterial));

  /* ---- camera rig state ------------------------------------------ */

  const cam = { theta: 0.55, phi: 0.3, dist: SUN_DIST };
  const blend = { v: 1 }; // 0 = at `fromId`, 1 = at `toId`
  let fromId = SUN_ID;
  let toId = SUN_ID;
  const fromOffset = new THREE.Vector3(); // see focusBody(): interrupt continuity
  let transitioning = false;

  let orbitTime = 0; // advances at dt * timeScale: pausing never jumps a planet
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

  // touch: two fingers switch from orbit to pinch-dolly
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

  /** World position of a body at the current orbital time. */
  function bodyPos(body: AstresBody, out: THREE.Vector3) {
    if (body.isSun) return out.set(0, 0, 0);
    const a = body.phase + orbitTime * body.omega;
    out.set(Math.cos(a) * body.orbitRadius, 0, Math.sin(a) * body.orbitRadius);
    // tiny orbital inclination, applied as a rotation about X
    const c = Math.cos(body.inclination);
    const s = Math.sin(body.inclination);
    const y = out.y * c - out.z * s;
    const z = out.y * s + out.z * c;
    out.y = y;
    out.z = z;
    return out;
  }

  /**
   * The camera target. Both endpoints are re-evaluated every frame, so a
   * 2.2s flight between two orbiting planets tracks them the whole way.
   */
  function computeAnchor(out: THREE.Vector3) {
    bodyPos(byId.get(fromId) ?? bodies[0], tmpFrom).add(fromOffset);
    bodyPos(byId.get(toId) ?? bodies[0], tmpTo);
    return out.lerpVectors(tmpFrom, tmpTo, blend.v);
  }

  // Portrait phones have a narrow horizontal FOV: the same distance that
  // frames the sun on desktop fills the whole screen on mobile, so pull back.
  const defaultDist = (body: AstresBody) =>
    body.isSun
      ? isMobile
        ? SUN_DIST * 1.55
        : SUN_DIST
      : body.radius * (isMobile ? 8.5 : 7);

  function focusBody(id: string, instant = false) {
    const target = byId.get(id);
    if (!target) return;

    // Continuity on interrupt: snapshot where the anchor is RIGHT NOW and
    // store it as an offset from the previous destination, so restarting the
    // blend at 0 does not snap the camera back to where the flight began.
    computeAnchor(anchor);
    fromId = toId;
    bodyPos(byId.get(fromId) ?? bodies[0], tmpFrom);
    fromOffset.copy(anchor).sub(tmpFrom);
    toId = id;

    gsap.killTweensOf(blend);
    gsap.killTweensOf(cam);

    const dist = defaultDist(target);
    const phi = target.isSun ? 0.3 : 0.22;
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

  /* ---- picking --------------------------------------------------- */

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    // raycast the occluder spheres, not the 25k-vertex line soup
    const hits = raycaster.intersectObjects(occluders, false);
    return hits.length ? (hits[0].object.userData.bodyId as string) : null;
  }

  /* ---- interactions ---------------------------------------------- */

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      // second finger down: the orbit hands over to the pinch
      pinching = true;
      dragging = false;
      pinchGap = pointerGap();
      gsap.killTweensOf(cam, "dist");
      return;
    }
    if (pinching) return; // a 3rd finger changes nothing
    dragging = true;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    velTheta = 0;
    velPhi = 0;
    // a drag takes over the orientation immediately, but lets the in-flight
    // blend & dolly finish on their own
    gsap.killTweensOf(cam, "theta,phi");
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (e: PointerEvent) => {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinching) {
      if (activePointers.size >= 2) {
        const gap = pointerGap();
        if (gap > 0 && pinchGap > 0) {
          const body = byId.get(toId) ?? bodies[0];
          cam.dist = clamp(
            cam.dist * (pinchGap / gap),
            body.radius * 2.5,
            MAX_DIST
          );
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
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    canvas.style.cursor = "grab";
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDragging = dragging;
    endDrag(e);
    if (!wasDragging) return;
    // a click is a pointerup that barely moved: anything else was an orbit
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (!id) return;
    // The callback fires in BOTH cases so React can mirror the state change;
    // it runs before focusBody() because under reduced motion focusBody()
    // arrives synchronously, and React must already know it departed.
    onBodyClick?.(id);
    if (id !== toId) focusBody(id);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    gsap.killTweensOf(cam, "dist");
    const body = byId.get(toId) ?? bodies[0];
    cam.dist = clamp(
      cam.dist * Math.exp(e.deltaY * 0.0012),
      body.radius * 2.5,
      MAX_DIST
    );
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---- markers --------------------------------------------------- */

  type MarkerEntry = { el: HTMLElement; arrow: HTMLElement | null; off: string };
  const markers = new Map<string, MarkerEntry>();

  function registerMarkerEl(id: string, el: HTMLElement | null) {
    if (!el) {
      markers.delete(id);
      return;
    }
    markers.set(id, {
      el,
      arrow: el.querySelector<HTMLElement>(".astres-arrow"),
      off: "",
    });
  }

  const MARKER_INSET = 28;

  /**
   * Projects every registered body to screen px and writes the result straight
   * onto the DOM node. Deliberately bypasses React: this runs 60×/s.
   */
  function updateMarkers() {
    if (markers.size === 0) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;

    type Placed = {
      m: MarkerEntry;
      sx: number;
      sy: number;
      halfW: number;
      halfH: number;
      off: boolean;
    };
    const placed: Placed[] = [];

    markers.forEach((m, id) => {
      const body = byId.get(id);
      if (!body) return;
      bodyPos(body, tmp);

      // camera-space z tells us whether the body is actually behind us :
      // NDC alone can't, because the projection wraps points behind the eye
      tmpCam.copy(tmp).applyMatrix4(camera.matrixWorldInverse);
      const behind = tmpCam.z > -0.5;

      tmpNdc.copy(tmp).project(camera);
      let sx = (tmpNdc.x * 0.5 + 0.5) * w;
      let sy = (-tmpNdc.y * 0.5 + 0.5) * h;
      if (behind) {
        // mirror through the screen centre so the edge arrow points backwards
        sx = w - sx;
        sy = h - sy;
      }

      const off =
        behind ||
        sx < MARKER_INSET ||
        sx > w - MARKER_INSET ||
        sy < MARKER_INSET ||
        sy > h - MARKER_INSET;

      if (off) {
        const dx = sx - cx;
        let dy = sy - cy;
        if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) dy = 1;
        // push the point out to the inset rectangle border
        const s = Math.min(
          (cx - MARKER_INSET) / Math.max(Math.abs(dx), 1e-4),
          (cy - MARKER_INSET) / Math.max(Math.abs(dy), 1e-4)
        );
        sx = cx + dx * s;
        sy = cy + dy * s;
        if (m.arrow) m.arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      }

      // The transform centres the chip on (sx, sy), so an edge-clamped point
      // leaves half the chip outside the viewport: re-clamp by its half-size.
      const halfW = m.el.offsetWidth / 2 + 4;
      const halfH = m.el.offsetHeight / 2 + 4;
      sx = clamp(sx, halfW, w - halfW);
      sy = clamp(sy, halfH, h - halfH);

      placed.push({ m, sx, sy, halfW, halfH, off });
    });

    // Anti-collision: when two chips overlap (planets crossing on screen, or
    // clamped to the same edge), slide the later one below the earlier one.
    // Six chips at most, so the quadratic re-check is nothing.
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i];
      for (let j = 0; j < i; j++) {
        const b = placed[j];
        if (
          Math.abs(a.sx - b.sx) < a.halfW + b.halfW &&
          Math.abs(a.sy - b.sy) < a.halfH + b.halfH
        ) {
          a.sy = b.sy + b.halfH + a.halfH + 2;
          j = -1; // moved: re-check against every earlier chip
        }
      }
      a.sy = clamp(a.sy, a.halfH, h - a.halfH);
    }

    for (const p of placed) {
      p.m.el.style.transform = `translate(${p.sx.toFixed(1)}px, ${p.sy.toFixed(
        1
      )}px) translate(-50%, -50%)`;
      const flag = p.off ? "true" : "false";
      if (p.m.off !== flag) {
        p.m.el.dataset.offscreen = flag;
        p.m.off = flag;
      }
    }
  }

  /* ---- resize ---------------------------------------------------- */

  // fiche ouverte : le centre de l'image glisse au milieu de la partie visible
  const inset = { right: 0, bottom: 0 };
  const applyInset = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (inset.right || inset.bottom) {
      camera.setViewOffset(w, h, inset.right / 2, inset.bottom / 2, w, h);
    } else {
      camera.clearViewOffset();
    }
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
  };
  resize();
  window.addEventListener("resize", resize);

  /* ---- frame loop ------------------------------------------------ */

  const IDLE_DRIFT = 0.02; // rad/s: the system keeps breathing when idle
  let readySent = false;
  let last = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (!reducedMotion) {
      orbitTime += dt * timeScale;
      // the sun's surface keeps undulating, only slightly faster when the
      // orbital clock is cranked up (100× would otherwise boil it)
      sunTime += dt * (1 + Math.min(timeScale, 100) * 0.01);
      spinTime += dt * 0.05 * clamp(timeScale, 0, 3);
    }

    // bodies follow their orbits; the whole rig moves, tilt and all
    for (const rig of rigs) {
      bodyPos(rig.body, tmp);
      rig.root.position.copy(tmp);
      rig.spin.rotation.y = rig.body.isSun ? spinTime * 0.6 : spinTime;
      if (rig.body.isSun) rig.material.uniforms.uTime.value = sunTime * 0.15;
    }

    // orientation: drag > inertia > idle drift (never two at once)
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
    const th = cam.theta + pointer.x * 0.05; // tiny pointer parallax
    const ph = clamp(cam.phi - pointer.y * 0.04, -1.35, 1.35);
    const cp = Math.cos(ph);
    camera.position.set(
      anchor.x + cam.dist * cp * Math.sin(th),
      anchor.y + cam.dist * Math.sin(ph),
      anchor.z + cam.dist * cp * Math.cos(th)
    );
    camera.lookAt(anchor);

    // markers project from the camera matrices, so refresh them before use
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    updateMarkers();

    composer.render();
    if (!readySent) {
      readySent = true;
      opts.onReady?.();
    }
  });

  // open on the sun, immediately (the landing overlay does the reveal)
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
      for (const rig of rigs) {
        rig.geometry.dispose();
        rig.material.dispose();
        rig.occGeometry.dispose();
      }
      occluderMaterial.dispose();
      for (const g of orbitGeometries) g.dispose();
      orbitMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/**
 * Passage vers /astres : ce que partagent les entrées de la home (ExploreLink),
 * le calque de transition du layout (AstresTransition) et la page /astres.
 *
 * - `sceneMode()` dit si l'appareil fait tourner la scène : « scene », « weak »
 *   (deviceMemory sous 4 ou économie de données : 3D à la demande) ou « nogl ».
 * - Les clés de sessionStorage gardent le lien d'origine (pour lui rendre le
 *   focus au retour et rejouer le passage à l'envers) et l'heure du départ
 *   (pour l'arrivée chorégraphiée).
 * - `drawingOf()` trouve le dessin d'une entrée (préparé au survol, animé au clic).
 */

export type SceneMode = "scene" | "weak" | "nogl";

export const RENDER_DARK = "/images/astres/appareil-3d-sombre.jpg";

export const KEY_FROM = "td-astres-from";
export const KEY_ARRIVAL = "td-astres-arrival";

export const GO_EVENT = "td:astres-go";
export type GoDetail = { el: HTMLElement; href: string; handled?: boolean };

let cached: SceneMode | null = null;

export function sceneMode(): SceneMode {
  if (cached) return cached;
  let gl = false;
  try {
    const c = document.createElement("canvas");
    gl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    gl = false;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory < 4) || Boolean(nav.connection?.saveData);
  cached = !gl ? "nogl" : weak ? "weak" : "scene";
  return cached;
}

export function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function store(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : le passage marche sans mémoire */
  }
}

export function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Les entrées vers /astres de la page, dans l'ordre du document. */
export function entries(href: string): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href="${href}"]`));
}

/**
 * Le dessin d'une entrée : premier ancêtre qui contient un SVG d'appareil visible
 * (le Menu remonte jusqu'à l'en-tête, dont le dessin est juste dessous).
 */
export function drawingOf(el: HTMLElement): { host: HTMLElement; svg: SVGSVGElement } | null {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    const svg = Array.from(node.querySelectorAll<SVGSVGElement>('svg[role="img"]')).find(
      (s) => s.querySelector(".as-xs") && s.getBoundingClientRect().width > 0,
    );
    if (svg) return { host: node, svg };
  }
  return null;
}

/** steps(n, end) de l'identité (ease-fade : 3 crans, ease-title : 4). */
export const steps = (n: number) => (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.floor(p * n) / n);
/** Avancement de t entre a et b, borné à [0, 1]. */
export const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));

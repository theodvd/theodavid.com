/**
 * Passage vers /astres : ce que partagent les entrées de la home (ExploreLink),
 * le calque de transition du layout (AstresTransition) et la page /astres.
 *
 * - `sceneMode()` dit si l'appareil fait tourner la scène : « scene », « weak »
 *   (deviceMemory sous 4 ou économie de données : 3D à la demande) ou « nogl ».
 * - Les clés de sessionStorage gardent le lien d'origine (pour lui rendre le
 *   focus au retour) et l'heure du départ (pour l'arrivée chorégraphiée).
 */

export type SceneMode = "scene" | "weak" | "nogl";

export const RENDER_DARK = "/images/astres/appareil-3d-sombre.jpg";
/** Taille du rendu, et centre et largeur de sa vitre (fractions), pour le poser sur le dessin. */
export const RENDER_SIZE = { w: 1600, h: 1195 };
export const RENDER_GLASS = { cx: 1128 / 1600, cy: 556 / 1195, w: 300 / 1600 };

export const KEY_FROM = "td-astres-from";
export const KEY_ARRIVAL = "td-astres-arrival";

export const GO_EVENT = "td:astres-go";
export const BACK_EVENT = "td:astres-back";
export type GoDetail = { el: HTMLElement; href: string; handled?: boolean };
export type BackDetail = { handled?: boolean };

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

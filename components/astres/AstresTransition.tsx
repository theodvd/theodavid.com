"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import "@/app/styles/astres.css";
import { GO_EVENT, KEY_FROM, drawingOf, entries, read, reducedMotion, sceneMode, seg, steps, type GoDetail } from "./pass";

/**
 * Calque du passage vers /astres, monté une fois dans le layout racine : il
 * survit au changement de route. Option A choisie le 31/10/2026, C en repli
 * (maquettes : portfolio-build/travail/explore3d/options.html).
 *
 * A, « plongée dans l'écran », sur un appareil capable (sceneMode « scene ») :
 *   0 à 120 ms     renvoi enfoncé
 *   0 à 360        l'appareil prend son épaisseur en 3 crans (device3d) ; notes,
 *                  notice et renvoi s'effacent en 3 crans ; au pied, les pièces
 *                  de la vue éclatée se rassemblent
 *   120 à 700      pivot de trois quarts (dur-draw, seule courbe douce)
 *   700 à 1400     retour de face et plongée dans la vitre
 *   1150 à 1400    la vague s'éteint sous un voile couleur vitre, en 3 crans
 *   1400           router.push(/astres), au noir : la vitre a la couleur du fond
 *                  de /astres, qui allume ensuite sa scène puis sa barre
 * C, « la vitre s'ouvre », en repli (appareil faible, sans WebGL) : la vitre du
 *   dessin grandit jusqu'à l'écran en 4 crans (120 à 600), push au noir à 600.
 * Retour (« ← Back to the page », Échap, précédent du navigateur) : le calque
 *   couvre au noir dès le popstate, avant que la home se peigne ; la home
 *   revient sans rejouer son entrée (html.td-return), puis le film à l'envers.
 * Mouvement réduit : ExploreLink navigue sans passer par ici, coupure nette.
 */

const HREF = "/astres";
const PARTS = ".as-xs, .as-xp, .as-xc";
const NOTES = ".as-notes, .as-tech, .t-line, .t-head, .t-text";
const C = { grow: [120, 600] as const, wave: [120, 480] as const, arrive: 600 };

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Attend que la route affichée soit `path` (8 s au plus). */
async function arrived(path: string) {
  for (let t = 0; t < 8000 && window.location.pathname !== path; t += 40) await wait(40);
}

/** Joue fn(t) de `from` à `to` (ms), à l'horloge de l'écran, dans un sens ou dans l'autre. */
function play(from: number, to: number, fn: (t: number) => void) {
  return new Promise<void>((done) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = now - t0;
      const t = to > from ? Math.min(to, from + e) : Math.max(to, from - e);
      fn(t);
      if (t === to) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** L'écran du dessin (vague découpée par la vitre), en SVG autonome pour la vitre de C. */
function screenCopy(svg: SVGSVGElement) {
  const clip = svg.querySelector(".as-xc g[clip-path]");
  if (!clip) return "";
  let html = (svg.querySelector("defs")?.outerHTML ?? "") + clip.outerHTML;
  svg.querySelectorAll("defs [id]").forEach((n) => {
    html = html.split(`id="${n.id}"`).join(`id="${n.id}-pass"`).split(`#${n.id})`).join(`#${n.id}-pass)`);
  });
  return `<svg viewBox="296 314 208 98" preserveAspectRatio="none" aria-hidden="true">${html}</svg>`;
}

type Stage = { arrive: number; ready: Promise<void>; at: (t: number) => void; done: () => void };

/**
 * Le film d'une entrée, posable à tout instant t (aller ou retour) : A si
 * l'appareil fait tourner la scène et que le dessin se laisse construire, sinon C,
 * sinon (pas de dessin visible) un simple voile en 3 crans.
 * Rendu tout de suite : renvoi et notes partent dès le clic, pendant que la scène
 * Three se monte (environ 300 ms) ; le volume prend ensuite le relais à l'instant
 * où en est le film, sur une face identique au dessin.
 */
function stageFor(root: HTMLElement, el: HTMLElement | null, drawing: ReturnType<typeof drawingOf>): Stage {
  const ov = document.createElement("div");
  ov.className = "td-pass";
  ov.setAttribute("aria-hidden", "true");
  const veil = document.createElement("div");
  veil.className = "td-pass-veil";
  ov.append(veil);
  root.appendChild(ov);

  const notes: (HTMLElement | SVGElement)[] = drawing ? Array.from(drawing.host.querySelectorAll<SVGElement>(NOTES)) : [];
  if (el && el.getClientRects().length) notes.push(el);
  const parts = drawing ? Array.from(drawing.svg.querySelectorAll<SVGElement>(PARTS)) : [];
  const fadeNotes = (t: number) => {
    const o = String(1 - steps(3)(seg(t, 0, 360)));
    notes.forEach((n) => (n.style.opacity = o));
  };
  const showParts = (on: boolean) => parts.forEach((p) => (on ? p.style.removeProperty("visibility") : (p.style.visibility = "hidden")));
  let dispose = () => {};
  const done = () => {
    dispose();
    notes.forEach((n) => n.style.removeProperty("opacity"));
    showParts(true);
    ov.remove();
  };

  const g = drawing?.svg.querySelector(".a-glass")?.getBoundingClientRect();
  const wantA = Boolean(drawing) && sceneMode() === "scene";
  const arrive = wantA ? 1400 : g && g.width > 0 ? C.arrive : 360;
  // voile seul, jusqu'au noir à l'arrivée (sans dessin, ou si A échoue)
  const veilOnly = (t: number) => (veil.style.opacity = String(steps(3)(seg(t, arrive - 360, arrive))));
  let film: ((t: number) => void) | null = null;
  let ready = Promise.resolve();

  if (wantA && drawing) {
    // A : l'appareil en volume
    ready = (async () => {
      try {
        const m = await import("./device3d");
        const prep = await m.prepare(drawing.svg);
        const canvas = document.createElement("canvas");
        canvas.className = "td-pass-gl";
        ov.insertBefore(canvas, veil);
        const flight = prep ? m.fly(drawing.svg, prep, canvas) : null;
        if (!flight) {
          canvas.remove();
          film = veilOnly;
          return;
        }
        dispose = flight.dispose;
        film = (t) => {
          showParts(t <= 0);
          canvas.style.visibility = t > 0 ? "visible" : "hidden";
          flight.pose(t);
          veil.style.opacity = String(steps(3)(seg(t, m.GO.veil[0], m.GO.veil[1])));
        };
      } catch {
        film = veilOnly; // module ou WebGL indisponible
      }
    })();
  } else if (drawing && g && g.width > 0) {
    // C : la vitre du dessin s'ouvre jusqu'à l'écran
    const glass = document.createElement("div");
    glass.className = "td-pass-glass";
    glass.innerHTML = screenCopy(drawing.svg);
    ov.insertBefore(glass, veil);
    const r0 = (8 * g.width) / 208;
    film = (t) => {
      const p = steps(4)(seg(t, C.grow[0], C.grow[1]));
      glass.style.visibility = t > 0 ? "visible" : "hidden";
      Object.assign(glass.style, {
        left: `${lerp(g.left, 0, p)}px`,
        top: `${lerp(g.top, 0, p)}px`,
        width: `${lerp(g.width, window.innerWidth, p)}px`,
        height: `${lerp(g.height, window.innerHeight, p)}px`,
        borderRadius: `${lerp(r0, 0, p)}px`,
      });
      glass.style.setProperty("--wave", String(1 - steps(3)(seg(t, C.wave[0], C.wave[1]))));
      veil.style.opacity = t >= C.arrive ? "1" : "0";
    };
  } else {
    film = veilOnly;
  }

  return {
    arrive,
    ready,
    at: (t) => {
      fadeNotes(t);
      film?.(t);
    },
    done,
  };
}

export default function AstresTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const prev = useRef(pathname);

  // La home revenue sans rejouer son entrée : html.td-return dure jusqu'à ce qu'on la quitte.
  useEffect(() => {
    prev.current = pathname;
    if (pathname !== "/") document.documentElement.classList.remove("td-return");
  }, [pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const go = async (e: Event) => {
      const detail = (e as CustomEvent<GoDetail>).detail;
      detail.handled = true;
      if (busy.current) return;
      busy.current = true;
      const { el, href } = detail;
      try {
        el.closest("details")?.removeAttribute("open"); // le Menu se referme d'un cran
        el.classList.add("td-press");
        const stage = stageFor(root, el, drawingOf(el));
        await play(0, stage.arrive, stage.at);
        // scène pas encore montée au bout du film (appareil lent) : on attend au noir
        await stage.ready;
        stage.at(stage.arrive);
        router.push(href);
        await arrived(href);
        await nextFrame();
        await nextFrame();
        stage.done();
      } finally {
        el.classList.remove("td-press");
        busy.current = false;
      }
    };

    // Retour depuis /astres (bouton, Échap ou précédent du navigateur) : le popstate
    // part avant que la home se peigne, le calque la couvre donc dès sa première image.
    const back = () => {
      const from = read(KEY_FROM);
      if (prev.current !== HREF || window.location.pathname !== "/" || !from || busy.current || reducedMotion()) return;
      busy.current = true;
      document.documentElement.classList.add("td-return");
      const cover = document.createElement("div");
      cover.className = "td-pass";
      cover.setAttribute("aria-hidden", "true");
      cover.innerHTML = '<div class="td-pass-veil" style="opacity:1"></div>';
      root.appendChild(cover);
      void (async () => {
        try {
          await arrived("/");
          // la home est montée, ExploreLink a rendu la position et le focus
          await nextFrame();
          await nextFrame();
          const { i } = JSON.parse(from) as { i: number };
          const link = entries(HREF)[i] ?? null;
          const stage = stageFor(root, link, link ? drawingOf(link) : null);
          await stage.ready;
          stage.at(stage.arrive);
          cover.remove();
          await play(stage.arrive, 0, stage.at);
          stage.done();
        } finally {
          cover.remove();
          busy.current = false;
        }
      })();
    };

    window.addEventListener(GO_EVENT, go);
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener(GO_EVENT, go);
      window.removeEventListener("popstate", back);
    };
  }, [router]);

  return <div ref={rootRef} className="td-pass-root" />;
}

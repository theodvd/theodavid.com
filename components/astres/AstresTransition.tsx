"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import "@/app/styles/astres.css";
import {
  BACK_EVENT,
  GO_EVENT,
  RENDER_DARK,
  RENDER_GLASS,
  RENDER_SIZE,
  type BackDetail,
  type GoDetail,
} from "./pass";

/**
 * Calque de transition vers /astres, monté une fois dans le layout racine :
 * il survit au changement de route.
 *
 * Chronologie (composition.md, « Passage vers /astres ») :
 *   0 à 120 ms     renvoi enfoncé
 *   0 à 360        éclatement du dessin en 3 crans (dur-thunk), notes effacées
 *   360 à 660      calque sombre en 4 bandes, copie du dessin à la craie
 *   660 à 1160     rendu 3D posé sur la vitre en 3 crans, la craie s'efface ;
 *                  router.push(/astres) sous le calque
 *   1160 à 2260    le rendu glisse à sa place (dur-draw, seule courbe douce)
 *   1660 à 2160    le calque s'efface en 3 crans sur la scène et son interface
 * Retour : le calque couvre, router.back(), puis redescend en 4 bandes.
 * Sous prefers-reduced-motion, ExploreLink navigue sans passer par ici.
 */

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Attend que la route affichée soit `path` (8 s au plus). */
async function arrived(path: string) {
  for (let t = 0; t < 8000 && window.location.pathname !== path; t += 80) await wait(80);
}

/** Le bloc qui porte le dessin du lien : premier ancêtre qui contient un SVG visible. */
function drawingOf(el: HTMLElement): { host: HTMLElement; svg: SVGSVGElement } | null {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    const svg = Array.from(node.querySelectorAll<SVGSVGElement>('svg[role="img"]')).find(
      (s) => s.getBoundingClientRect().width > 0,
    );
    if (svg) return { host: node, svg };
  }
  return null;
}

/** Rendu calé plein écran comme sur /astres (object-fit cover, ancré à droite). */
function coverRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.max(vw / RENDER_SIZE.w, vh / RENDER_SIZE.h);
  const w = RENDER_SIZE.w * s;
  const h = RENDER_SIZE.h * s;
  const phone = vw <= 760;
  return { left: (vw - w) * (phone ? 0.8 : 1), top: (vh - h) * (phone ? 0.34 : 0.5), width: w };
}

function place(img: HTMLElement, r: { left: number; top: number; width: number }) {
  img.style.left = `${r.left}px`;
  img.style.top = `${r.top}px`;
  img.style.width = `${r.width}px`;
}

export default function AstresTransition() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const go = async (e: Event) => {
      const detail = (e as CustomEvent<GoDetail>).detail;
      if (busy.current) {
        detail.handled = true;
        return;
      }
      busy.current = true;
      detail.handled = true;
      const { el, href } = detail;
      const drawing = drawingOf(el);

      // T1 : renvoi enfoncé, dessin éclaté en 3 crans
      el.classList.add("td-press");
      drawing?.host.classList.add("td-launch");

      // le calque (encore caché sous sa première bande)
      const ov = document.createElement("div");
      ov.className = "td-pass";
      ov.dataset.theme = "dark";
      ov.setAttribute("aria-hidden", "true");
      let glass: Element | null = null;
      if (drawing) {
        const r = drawing.svg.getBoundingClientRect();
        const box = document.createElement("div");
        // la vue éclatée du pied s'écarte moins que le dessin de l'en-tête (astres.css)
        box.className = `td-pass-plot td-launch${drawing.host.classList.contains("nw-x") ? " is-near" : ""}`;
        Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
        const copy = drawing.svg.cloneNode(true) as SVGSVGElement;
        copy.removeAttribute("role");
        copy.removeAttribute("aria-label");
        // identifiants uniques : la copie suffixe ses clipPath et filtres
        copy.querySelectorAll("[id]").forEach((n) => {
          const id = n.id;
          n.id = `${id}-pass`;
          copy.querySelectorAll("*").forEach((m) => {
            for (const a of ["clip-path", "filter", "mask", "fill", "href"]) {
              const v = m.getAttribute(a);
              if (v && v.includes(`#${id}`)) m.setAttribute(a, v.split(`#${id}`).join(`#${id}-pass`));
            }
          });
        });
        box.appendChild(copy);
        ov.appendChild(box);
        glass = copy.querySelector(".a-glass");
      }
      const img = document.createElement("img");
      img.className = "td-pass-r";
      img.src = RENDER_DARK;
      img.alt = "";
      ov.appendChild(img);
      root.appendChild(ov);

      // T3 : le rendu se pose sur la vitre de la copie (sinon, directement à sa place)
      const g = glass?.getBoundingClientRect();
      if (g && g.width > 0) {
        const width = g.width / RENDER_GLASS.w;
        const height = (width * RENDER_SIZE.h) / RENDER_SIZE.w;
        place(img, {
          left: g.left + g.width / 2 - RENDER_GLASS.cx * width,
          top: g.top + g.height / 2 - RENDER_GLASS.cy * height,
          width,
        });
      } else {
        place(img, coverRect());
      }

      await wait(660);
      router.push(href);
      await wait(500);
      // T4 : le rendu glisse à sa place plein écran
      ov.classList.add("is-glide");
      place(img, coverRect());
      await wait(500);
      await arrived(href);
      ov.classList.add("is-out");
      await wait(500);
      ov.remove();
      el.classList.remove("td-press");
      drawing?.host.classList.remove("td-launch");
      busy.current = false;
    };

    const back = async (e: Event) => {
      const detail = (e as CustomEvent<BackDetail>).detail;
      detail.handled = true;
      const ov = document.createElement("div");
      ov.className = "td-pass is-cover";
      ov.dataset.theme = "dark";
      ov.setAttribute("aria-hidden", "true");
      root.appendChild(ov);
      router.back();
      await arrived("/");
      await wait(60);
      ov.classList.add("is-down");
      await wait(320);
      ov.remove();
    };

    window.addEventListener(GO_EVENT, go);
    window.addEventListener(BACK_EVENT, back);
    return () => {
      window.removeEventListener(GO_EVENT, go);
      window.removeEventListener(BACK_EVENT, back);
    };
  }, [router]);

  return <div ref={rootRef} className="td-pass-root" />;
}

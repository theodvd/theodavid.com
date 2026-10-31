"use client";

import { useEffect } from "react";

/**
 * Navigation de la home par ancres : liens 01 à 05 de la barre collante, Menu
 * au téléphone, logo, et tout lien interne de la page (sauf l'évitement).
 *
 * - Clic : le Menu se referme, une entrée d'historique `#section` est poussée,
 *   puis le navigateur défile en douceur jusqu'à la section ; le titre se pose
 *   sous la barre (scroll-margin-top de nav.css) et le focus va sur la section.
 * - Pendant le trajet, les sections traversées s'affichent sans rejouer leurs
 *   apparitions ; celles de la section visée partent dès qu'elle entre à l'écran.
 * - La section en cours est marquée `aria-current="location"` dans la barre et
 *   le Menu ; pendant un trajet, elle reste sur la cible.
 * - Précédent / Suivant : le navigateur restaure la position, on la rejoint en
 *   douceur depuis l'ancienne.
 * - Mouvement réduit : saut direct. Surimpression ouverte : rien (page figée).
 */

const IDS = ["experience", "products", "founder", "workbench", "now"];

export default function NavMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const sheetOpen = () => root.classList.contains("td-sheet-open") || !!document.querySelector("[data-sheet-dialog]");

    let lock: string | null = null;
    let target: HTMLElement | null = null;
    let stop: (() => void) | null = null;
    let lastY = Math.round(scrollY);

    const links = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('.hd-bar a[href^="#"]'));
    const setCurrent = (id: string | null) =>
      links().forEach((a) =>
        id && a.hash === `#${id}` ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current"),
      );
    // Section en cours : la dernière dont le haut a passé le tiers de l'écran sous la barre.
    const current = () => {
      const bar = document.querySelector<HTMLElement>(".hd-bar")?.offsetHeight ?? 0;
      const line = bar + (innerHeight - bar) / 3;
      let cur: string | null = null;
      for (const id of IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      return cur;
    };

    // Position d'arrivée : celle d'un saut natif (scroll-margin-top), bornée au bas de page.
    const targetY = (el: HTMLElement) => {
      if (el.id === "top") return 0;
      const m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const y = el.getBoundingClientRect().top + scrollY - m;
      return Math.round(Math.max(0, Math.min(root.scrollHeight - innerHeight, y)));
    };

    // Pendant un trajet : les blocs traversés à l'écran sont posés à leur état final ; ceux de
    // la section visée sont lancés dès qu'ils entrent, pour finir pendant le freinage.
    const transit = () => {
      if (!target) return;
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top >= innerHeight || r.bottom <= 0) return;
        el.classList.add("is-in");
        if (target?.contains(el)) return;
        el.getAnimations({ subtree: true }).forEach((a) => {
          if (a.effect?.getTiming().iterations !== Infinity) a.finish();
        });
      });
    };

    // Défilement doux du navigateur ; fin à `scrollend`, ou position stable (navigateurs sans).
    const glide = (y: number, done: (ok: boolean) => void) => {
      let raf = 0;
      let still = 0;
      let prev = -1;
      const off = () => {
        removeEventListener("scrollend", fin);
        cancelAnimationFrame(raf);
      };
      const fin = () => {
        off();
        done(Math.abs(scrollY - y) < 4);
      };
      const watch = () => {
        still = scrollY === prev ? still + 1 : 0;
        prev = scrollY;
        if (still > 8) return fin();
        raf = requestAnimationFrame(watch);
      };
      if ("onscrollend" in window) addEventListener("scrollend", fin);
      else raf = requestAnimationFrame(watch);
      scrollTo({ top: y, behavior: "smooth" });
      stop = off;
    };

    const move = (y: number, el: HTMLElement | null, from = Math.round(scrollY)) => {
      stop?.();
      stop = null;
      target = el && el.id !== "top" ? el : null;
      lock = el && IDS.includes(el.id) ? el.id : null;
      if (lock) setCurrent(lock);
      const done = (ok: boolean) => {
        stop = null;
        lock = null;
        target = null;
        setCurrent(current());
        if (ok && el && el.id !== "top") {
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        }
      };
      if (reduce.matches || Math.abs(y - from) < 2) {
        scrollTo(0, y);
        return done(true);
      }
      if (from !== Math.round(scrollY)) scrollTo(0, from);
      transit();
      glide(y, done);
    };

    const go = (id: string) => {
      const el = document.getElementById(id);
      if (!el || sheetOpen()) return false;
      document.querySelectorAll<HTMLDetailsElement>(".hd-menu[open]").forEach((d) => (d.open = false));
      // Nouvelle entrée d'historique : l'état de Next est conservé, sinon Précédent recharge la page.
      if (location.hash !== `#${id}`) history.pushState(history.state, "", `#${id}`);
      move(targetY(el), el);
      return true;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || a.classList.contains("td-skip")) return;
      const id = decodeURIComponent(a.hash.slice(1));
      if (id && go(id)) e.preventDefault();
    };

    // Précédent / Suivant : le navigateur restaure la position juste après popstate ; à l'image
    // suivante, on repart de l'ancienne et on glisse jusqu'à la nouvelle.
    const onPop = () => {
      if (sheetOpen()) return;
      const from = lastY;
      requestAnimationFrame(() => {
        const to = Math.round(scrollY);
        if (Math.abs(to - from) < 2 || sheetOpen()) return;
        const id = decodeURIComponent(location.hash.slice(1));
        const el = id ? document.getElementById(id) : null;
        move(to, el && Math.abs(targetY(el) - to) < 4 ? el : null, from);
      });
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        lastY = Math.round(scrollY);
        transit();
        if (!lock) setCurrent(current());
      });
    };

    document.addEventListener("click", onClick);
    addEventListener("popstate", onPop);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    setCurrent(current());
    return () => {
      stop?.();
      document.removeEventListener("click", onClick);
      removeEventListener("popstate", onPop);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

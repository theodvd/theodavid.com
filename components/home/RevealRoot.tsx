"use client";

import { useEffect } from "react";

/**
 * Apparitions au scroll, une seule fois, pour toute la page.
 *
 * Un élément marqué `data-reveal="0.85"` reçoit la classe `is-in` quand son
 * haut passe au-dessus de 85 % de la hauteur de la fenêtre, y compris quand on
 * le dépasse d'un coup (saut d'ancre, retour à une position). Tant qu'il ne
 * l'a pas reçue, ses animations CSS (celles de la maquette, en `both`) restent
 * en pause sur leur première image (règle dans app/styles/td.css, classe
 * html.js posée par le script de thème). Sans JavaScript, tout s'affiche.
 * Sous prefers-reduced-motion, les animations sont coupées : état final.
 *
 * Exemple : <header className="pg-head" data-reveal="0.85">…</header>
 */
export default function RevealRoot() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    let pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    let frame = 0;

    const check = () => {
      frame = 0;
      const h = window.innerHeight;
      pending = pending.filter((el) => {
        const f = Number(el.dataset.reveal || "0.8");
        if (el.getBoundingClientRect().top <= h * f) {
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
      if (pending.length === 0) stop();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const stop = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    check();
    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

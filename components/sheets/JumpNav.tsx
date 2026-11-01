"use client";

import { useEffect, useState } from "react";

/**
 * Sommaire « Jump to » du rail de la page produit : `aria-current="location"`
 * va à la section dont le titre a passé 30 % de la hauteur de l'écran (la
 * première tant qu'aucune ne l'a fait).
 *
 * Exemple : <JumpNav label="Jump to" items={[{ id: "problem", n: "01", label: "Problem" }]} />
 */
export default function JumpNav({
  label,
  items,
}: {
  label: string;
  items: { id: string; n: string; label: string }[];
}) {
  const [current, setCurrent] = useState(items[0]?.id);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let here = items[0]?.id;
      for (const it of items) {
        const h = document.getElementById(`${it.id}-h`);
        if (h && h.getBoundingClientRect().top <= line) here = it.id;
      }
      setCurrent(here);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // Arrivée par le lien « Read the case study » de la fiche (CaseLink recharge la page) : après un
    // rechargement, Chrome ne suit pas l'ancre ; on amène la section à l'écran si la page est restée en haut.
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target && window.scrollY === 0) target.scrollIntoView({ block: "start" });
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  return (
    <nav className="as-jump" aria-label={label}>
      <p className="v7-k">{label}</p>
      <ol>
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} aria-current={it.id === current ? "location" : undefined}>
              <span className="as-jn">{it.n}</span>
              <span className="as-jl">{it.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

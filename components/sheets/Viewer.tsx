"use client";

import { useState } from "react";
import Pic from "@/components/Pic";
import { dims, fill, ratioVars, type Shot } from "./lib";

/**
 * Visionneuse de la fiche produit : chaque capture garde son format, plafonnée
 * à 520 px de haut (380 au téléphone) et à la largeur de la colonne, dans un
 * cadre `radius-screen` à deux coins de repère ; rien n'est recadré. Plusieurs
 * captures : une à la fois, vignettes-boutons en `aria-pressed` ; versions de
 * marque (Rayon) légendées « <nom>, <version> version », écrans d'un même
 * produit (Outbound agent) légendés par leur propre légende.
 *
 * Exemple : <Viewer shots={shots(p)} name="Rayon" fig={4} labels={ui.products} />
 */
export default function Viewer({
  shots,
  name,
  fig,
  labels,
  className = "",
  eager = false,
}: {
  shots: Shot[];
  name: string;
  fig: number;
  labels: { fig: string; version: string; showVersion: string; versions: string; screens: string; showScreen: string };
  className?: string;
  eager?: boolean;
}) {
  const [k, setK] = useState(0);
  const multi = shots.length > 1;
  const s = shots[Math.min(k, shots.length - 1)];
  const versions = multi && s.version;
  const caption = versions ? `${name}, ${fill(labels.version, { label: s.label })}` : (s.caption ?? name);
  const img = (
    <span className="v6-glass">
      <Pic
        src={s.src}
        alt={s.alt}
        width={s.width}
        height={s.height}
        loading={eager ? "eager" : "lazy"}
        sizes="(max-width: 760px) 100vw, 720px"
      />
      <span aria-hidden="true" className="v6-corner v6-c1" />
      <span aria-hidden="true" className="v6-corner v6-c2" />
    </span>
  );
  return (
    <figure className={`v7-view ${className}`.trim()} style={ratioVars(s)}>
      {s.href ? (
        <a className="v7-shot" href={s.href}>
          {img}
        </a>
      ) : (
        <span className="v7-shot">{img}</span>
      )}
      <figcaption className="v6-cap">
        <span>{fill(labels.fig, { n: fig, caption })}</span>
        <span>{multi ? `${k + 1} / ${shots.length} · ${dims(s)}` : dims(s)}</span>
      </figcaption>
      {multi && (
        <div className="v7-thumbs" role="group" aria-label={versions ? labels.versions : labels.screens}>
          {shots.map((t, j) => (
            <button
              key={t.src}
              type="button"
              className="v7-th"
              aria-pressed={j === k}
              aria-label={fill(t.version ? labels.showVersion : labels.showScreen, { label: t.label })}
              onClick={() => setK(j)}
            >
              <span className="v6-glass v6-glass-sm" style={ratioVars(t)}>
                <Pic src={t.src} alt="" width={t.width} height={t.height} sizes="120px" />
              </span>
              <span className="v7-thl">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

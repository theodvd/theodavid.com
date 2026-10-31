/* eslint-disable @next/next/no-img-element -- vignette servie telle quelle, à son format */
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Content, Tool } from "@/lib/content";

/** Boîte de la vignette qui sort du tiroir au survol (Atelier V6) : l'image y garde son format. */
const PEEK = { w: 200, h: 120 };

/**
 * 04 Workbench · Atelier V6, « Casier » (plateau Assemblage-Page-2).
 * Rail de 240 avec l'intro, casier de trois colonnes à filets partagés ; chaque
 * outil est un tiroir (porte-étiquette encadré, poignée, ligne) qui ouvre
 * /workbench/<slug>. La dernière rangée est complétée par des tiroirs vides en
 * pointillé, cachés au téléphone.
 */
export default function Workbench({ c }: { c: Content }) {
  const { workbench, ui } = c;
  const items = workbench.items;
  const empties = (3 - (items.length % 3)) % 3;
  return (
    <section className="wb-sec pg-sec" id="workbench" aria-label={ui.sections.workbench}>
      <div className="wb-in">
        <header className="pg-head" data-reveal="0.85">
          <span className="pg-num">04</span>
          <h2 className="pg-h2">{ui.sections.workbench}</h2>
        </header>
        <div className="wb-grid">
          <p className="wb-intro">{workbench.intro}</p>
          <ul className="wb-cab" data-reveal="0.8">
            {items.map((t, i) => (
              <Drawer key={t.slug} t={t} i={i} c={c} />
            ))}
            {Array.from({ length: empties }, (_, k) => (
              <li
                key={`empty-${k}`}
                className="wb-dr is-empty"
                aria-hidden="true"
                style={{ ["--i" as string]: items.length + k } as CSSProperties}
              >
                <div className="wb-top">
                  <div className="wb-tag" />
                  <span className="wb-handle" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Drawer({ t, i, c }: { t: Tool; i: number; c: Content }) {
  const w = c.ui.workbench;
  const im = t.image;
  const scale = im ? Math.min(PEEK.w / im.width, PEEK.h / im.height) : 0;
  return (
    <li className="wb-dr" style={{ ["--i" as string]: i } as CSSProperties}>
      {im && (
        <span className="wb-peek" aria-hidden="true">
          <img
            src={im.src}
            alt=""
            width={Math.round(im.width * scale)}
            height={Math.round(im.height * scale)}
            loading="lazy"
            decoding="async"
          />
        </span>
      )}
      <div className="wb-top">
        <div className="wb-tag">
          <span className="wb-ref">{t.ref}</span>
          <h3 className="wb-name">
            <Link className="wb-open" href={`/workbench/${t.slug}`} aria-haspopup="dialog" scroll={false}>
              {t.name}
            </Link>
          </h3>
        </div>
        <span className="wb-handle" aria-hidden="true" />
      </div>
      <p className="wb-line">{t.line}</p>
      <span className="wb-oh" aria-hidden="true">
        {w.open}
        <span className="wb-kh"> {w.openHint}</span>
      </span>
    </li>
  );
}

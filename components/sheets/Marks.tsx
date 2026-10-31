import type { Product } from "@/lib/content";

/**
 * Pièces dessinées communes à la carte de la home (préfixe pr-) et à la fiche
 * (préfixe v6-, celui de la maquette) : tampon, filtre d'usure, note
 * manuscrite, soulignement au feutre, marque de statut.
 */

type Prefix = "pr" | "v6";

/** Filtre d'usure du tampon, déclaré une seule fois par page (`#td-wear`). */
export function WearFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <filter id="td-wear" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={4} result="bruit" />
          <feColorMatrix
            in="bruit"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.75"
            result="usure"
          />
          <feComposite in="SourceGraphic" in2="usure" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/** Tampon « Built to get hired » : double bordure, rotation de -6°, usure. */
export function Stamp({
  prefix,
  main,
  sub,
  small,
  ink,
  className = "",
}: {
  prefix: Prefix;
  main: string;
  sub: string;
  small?: boolean;
  ink?: boolean;
  className?: string;
}) {
  const cls = ["td-stamp", `${prefix}-stamp`, ink && "is-ink", small && "is-sm", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className={`${prefix}-stamp-in`}>
        <span className={`${prefix}-stamp-main td-cond`}>{main}</span>
        <span aria-hidden="true" className={`${prefix}-stamp-rule`} />
        <span className={`${prefix}-stamp-sub td-mono`}>{sub}</span>
      </div>
    </div>
  );
}

/** Note manuscrite en braise et sa flèche, sous le titre (décorative : la phrase dit la même chose). */
export function Note({ prefix, text, className = "" }: { prefix: Prefix; text: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`${prefix}-notebox ${prefix}-n ${className}`.trim()}>
      <span className={`${prefix}-note`}>{text}</span>
      <svg viewBox="0 0 44 40" className={`${prefix}-arrow`}>
        <path className="td-draw td-d2 h-ember" pathLength={1} d="M4,34 C22,34 32,24 34,6 M26,14 L34,4 L40,15" />
      </svg>
    </div>
  );
}

/** Phrase dont la fin `u` est soulignée au feutre encre, là où elle apparaît. */
export function Underlined({ prefix, text, u }: { prefix: Prefix; text: string; u?: string }) {
  const i = u ? text.lastIndexOf(u) : -1;
  if (!u || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className={`${prefix}-u`}>
        {u}
        <svg aria-hidden="true" viewBox="0 0 200 20" preserveAspectRatio="none" className={`${prefix}-usvg`}>
          <path
            className="td-draw td-d3 h-ink"
            pathLength={1}
            d="M2,12 C40,4 80,16 120,8 C150,3 180,12 198,6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      {text.slice(i + u.length)}
    </>
  );
}

/**
 * Marque de statut : LED pour `live`, anneau pour `in-test`, carré pour
 * `archived`. Sur la carte la LED est à l'encre (braise au survol) ; dans la
 * fiche elle est en braise et clignote.
 */
export function StatusMark({ status, where }: { status: Product["status"]; where: "card" | "sheet" }) {
  const p = where === "card" ? "pr" : "v6";
  const cls =
    status === "live"
      ? where === "card"
        ? "pr-led is-ink"
        : "v7-led td-blink"
      : status === "in-test"
        ? `${p}-ring`
        : `${p}-sq`;
  return <span aria-hidden="true" className={cls} />;
}

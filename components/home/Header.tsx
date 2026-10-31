import type { CSSProperties } from "react";
import type { Content } from "@/lib/content";
import ExploreLink from "@/components/astres/ExploreLink";
import { AppareilLarge, AppareilVertical } from "@/components/home/Appareil";

/**
 * En-tête V6 « Panneau de commande » (préfixe hd-), hors de main.pg :
 * navigation, règle graduée, planche symétrique 270 | 1fr | 270 (rôle, nom,
 * statut ; appareil ; accroche et touches), puis compteurs à fenêtres.
 * Tout le texte vient de profile.json et de ui.json (header, nav, sections).
 */

/* Ancres de la navigation, dans l'ordre de la page (01 à 05). */
const NAV = ["experience", "products", "founder", "workbench", "now"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Découpe un compteur en fenêtres : un chiffre par fenêtre, l'espace devient
 * un blanc, tout le reste (unité, ~, →, virgule) reste hors fenêtre.
 * Chaque fenêtre porte un rouleau 0 à 9 puis 0 à la valeur : il défile en
 * steps() jusqu'au chiffre quand la bande entre (fix-hd.css).
 */
function Drum({ value }: { value: string }) {
  return (
    <span className="hd-drum" aria-hidden="true">
      {Array.from(value).map((ch, i) => {
        if (/\d/.test(ch)) {
          const d = Number(ch);
          const reel = [...Array(10).keys(), ...Array(d + 1).keys()];
          return (
            <span className="hd-cell" key={i}>
              <span className="hd-win">
                <span className="hd-reel" style={{ "--n": 10 + d } as CSSProperties}>
                  {reel.map((k, j) => (
                    <span key={j}>{k}</span>
                  ))}
                </span>
              </span>
            </span>
          );
        }
        if (ch === " ") return <span className="hd-gap" key={i} />;
        return (
          <span className="hd-sep" key={i}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

export default function Header({ c }: { c: Content }) {
  const { profile: p, ui } = c;
  const h = ui.header;
  const [first, ...rest] = p.name.split(" ");
  const status = `${p.availability} · ${p.founderLine}`;
  const [exploreFirst, ...exploreRest] = p.explore3d.label.split(" ");

  return (
    <div className="hd td-header" id="top">
      <header className="td-nav hd-nav">
        <a className="hd-logo" href="#top">
          <span>{p.name}</span>
        </a>
        <nav aria-label={h.navLabel} className="hd-links">
          {NAV.map((id, i) => (
            <a className="hd-nl" href={`#${id}`} key={id}>
              <span className="hd-num">{pad(i + 1)}</span>
              <span className="td-navl hd-navl">{ui.sections[id]}</span>
            </a>
          ))}
        </nav>
        <details className="hd-menu">
          <summary>{ui.nav.menu}</summary>
          <nav aria-label={h.navLabel} className="hd-panel">
            {NAV.map((id, i) => (
              <a href={`#${id}`} key={id}>
                <span className="hd-num">{pad(i + 1)}</span>
                <span>{ui.sections[id]}</span>
              </a>
            ))}
            <ExploreLink href={p.explore3d.href} className="hd-panel3d">
              <span>{p.explore3d.label}</span>
              <span aria-hidden="true">↗</span>
            </ExploreLink>
          </nav>
        </details>
      </header>
      <div className="td-ruler hd-ruler" aria-hidden="true" />

      <div className="hd-main">
        <div className="hd-left">
          <p className="hd-role">
            {p.roles.map((r, i) => (
              <span className={i ? "hd-next" : undefined} key={i}>
                {i ? " · " : ""}
                {r.title} {h.roleAt}
                {r.org}
                {r.from ? ` ${h.roleFrom} ${r.from}` : ""}
              </span>
            ))}
          </p>
          <h1 className="hd-name">
            <span className="td-first">{first}</span>
            <span>{rest.join(" ")}</span>
          </h1>
          <p className="hd-meta">
            <span aria-hidden="true" className="td-blink hd-led" />
            <span>{status}</span>
          </p>
        </div>

        <div className="hd-plot td-plot td-big">
          <AppareilLarge labels={h.drawing} callout={p.availability} />
          <ExploreLink href={p.explore3d.href} className="hd-3d hd-3d-l">
            <span className="hd-go">{p.explore3d.label}</span> <span aria-hidden="true">↗</span>
          </ExploreLink>
        </div>
        <div className="hd-plot td-plot td-small">
          <AppareilVertical labels={h.drawing} />
          <ExploreLink href={p.explore3d.href} className="hd-3d hd-3d-s">
            <span className="hd-go">
              {exploreFirst}
              <br />
              {exploreRest.join(" ")}
            </span>{" "}
            <span aria-hidden="true">↗</span>
          </ExploreLink>
        </div>

        <div className="hd-right">
          <p className="hd-hook">{p.tagline}</p>
          <div className="hd-keys">
            <a className="td-key td-key-primary" href={p.contact.primary.href}>
              <span>{p.contact.primary.label}</span>
              <span className="hd-hint" aria-hidden="true">
                {h.hintPrimary}
              </span>
            </a>
            {p.contact.secondary && (
              <a className="td-key td-key-secondary" href={p.contact.secondary.href}>
                <span>{p.contact.secondary.label}</span>
                <span className="hd-hint" aria-hidden="true">
                  {h.hintSecondary}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      <dl className="hd-dials" data-reveal="0.8">
        {p.counters.map((k) => (
          <div className="hd-dial" key={k.label}>
            <dt>{k.label}</dt>
            <dd>
              <span className="hd-sr">{k.value}</span>
              <Drum value={k.value} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

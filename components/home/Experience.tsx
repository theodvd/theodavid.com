import { useId } from "react";
import type { Content, Experience as Entry, Highlight, Ui } from "@/lib/content";

/**
 * 01 Experience V7 « Intercalaires à chiffres géants » (préfixe ex-).
 * Radio et :has, sans script : l'onglet coché ouvre le panneau de même rang
 * (règles génériques dans fix-ex.css). Onglet `current` coché au chargement.
 * Chaque panneau s'ouvre sur son chiffre clé ; une entrée sans chiffre (à
 * venir) montre sa date de début en contour creux. Les entrées Earlier ont un
 * intercalaire réduit et un panneau sobre. Les réalisations se replient sur
 * leur numéro et leur titre ; un chiffre secondaire s'affiche sur la ligne de
 * sa réalisation. Au téléphone, fiches empilées : celle de l'onglet coché est
 * ouverte, les autres repliées sur leur tête (second label du même radio).
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** « 2026-10 » devient « Oct 2026 » (mois anglais abrégé). */
function month(ym: string, withYear = true) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(d);
}

/** Période lisible : « Since Oct 2026 », « From Feb 2027 », « Apr to Aug 2026 ». */
function period(e: Entry, t: Ui["experience"]) {
  const { start, end } = e.period;
  if (e.status === "upcoming") return `${t.from} ${month(start)}`;
  if (!end) return `${t.since} ${month(start)}`;
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${month(start, !sameYear)} ${t.to} ${month(end)}`;
}

/**
 * Sépare le chiffre de son libellé : « ~190 h a month back to the teams »
 * donne « ~190 h » et « a month back to the teams ». `metricLabel` prime
 * quand `metric` n'est qu'un chiffre (« 7 h → 10 min »).
 */
const NUM = String.raw`~?\d[\d,.]*\+?(?:\s?(?:h|min|k|%|x)(?=\s|$))?`;
const FIG = new RegExp(String.raw`^(${NUM}(?:\s?→\s?${NUM})?)(?:\s+(.*))?$`);
function split(h: Highlight) {
  const m = (h.metric ?? "").match(FIG);
  const figure = m ? m[1] : h.metric ?? "";
  const label = h.metricLabel ?? (m ? m[2] ?? "" : "");
  return { figure, label };
}

function host(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function Status({ e, t }: { e: Entry; t: Ui["experience"] }) {
  return (
    <span className="ex-stat">
      {e.status === "current" ? (
        <span className="ex-led td-blink" aria-hidden="true" />
      ) : (
        <span className={e.status === "upcoming" ? "ex-sq is-open" : "ex-sq"} aria-hidden="true" />
      )}
      {t.status[e.status]}
    </span>
  );
}

/** Soulignement au feutre braise du chiffre géant. */
function Underline() {
  return (
    <svg className="ex-ul" aria-hidden="true" viewBox="0 0 200 20" preserveAspectRatio="none">
      <path
        className="td-draw td-d3"
        pathLength={1}
        d="M2,12 C40,4 80,16 120,8 C150,3 180,12 198,6"
        fill="none"
        style={{ stroke: "var(--ember)", strokeWidth: "var(--stroke-underline)", strokeLinecap: "round" }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Tab({ e, name, checked, t }: { e: Entry; name: string; checked: boolean; t: Ui["experience"] }) {
  const key = e.keyFigure ? split(e.keyFigure) : null;
  return (
    <label className={e.isEarlier ? "ex-tab is-sm" : "ex-tab"}>
      <input type="radio" name={name} id={`${name}-${e.slug}`} value={e.slug} defaultChecked={checked} />
      <span className="ex-tco">
        <span className="ex-tname">{e.company}</span>
      </span>
      <Status e={e} t={t} />
      <span className="ex-tper">
        {period(e, t)} · {e.role}
      </span>
      {!e.isEarlier && (
        <span className="ex-tkey">
          {key ? (
            <>
              <b>{key.figure}</b>
              <span className="ex-cap">{key.label}</span>
            </>
          ) : (
            <>
              <b className="is-date">{month(e.period.start)}</b>
              <span className="ex-cap">{t.startDate}</span>
            </>
          )}
        </span>
      )}
    </label>
  );
}

function Panel({ e, t, rid }: { e: Entry; t: Ui["experience"]; rid: string }) {
  const key = e.keyFigure ? split(e.keyFigure) : null;
  const figAt = new Map(e.figures.map((f) => [f.n, split(f)]));
  return (
    <article className={e.isEarlier ? "ex-panel is-sm" : "ex-panel"} data-co={e.slug}>
      {/* téléphone : toute la tête d'une fiche repliée coche son onglet (le radio garde le clavier) */}
      <label className="ex-open" htmlFor={rid} aria-hidden="true">
        <span className="td-plus" />
      </label>
      {e.isEarlier && <p className="ex-kick">{t.earlier}</p>}
      <div className="ex-top">
        <div>
          <h3 className="ex-co">
            {e.url ? (
              <a className="td-title" href={e.url}>
                {e.company}
                <span className="ex-ext" aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : (
              e.company
            )}
          </h3>
          <p className="ex-role">{e.role}</p>
        </div>
        <div className="ex-meta">
          <span>{period(e, t)}</span>
          <Status e={e} t={t} />
        </div>
      </div>

      {!e.isEarlier && (
        <div className="ex-hero">
          {key ? (
            <p className="ex-giant">
              {key.figure}
              <Underline />
            </p>
          ) : (
            <p className="ex-giant is-date">{month(e.period.start)}</p>
          )}
          <div className="ex-gside">
            <p className="ex-glabel">{key ? key.label : t.startDate}</p>
            <p className="ex-gsrc">
              {key && e.keyFigure ? (
                <>
                  <span>{pad(e.keyFigure.n)}</span>
                  {e.keyFigure.title}
                </>
              ) : (
                <>
                  <span className={e.status === "upcoming" ? "ex-sq is-open" : "ex-sq"} aria-hidden="true" />
                  {t.status[e.status]}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="ex-pair">
        <p className="ex-ctx">{e.context}</p>
        <p className="ex-sum">{e.summary}</p>
      </div>

      {e.highlights.length > 0 && (
        <ol className="ex-hls">
          {e.highlights.map((h, i) => (
            <li className={h.metric ? "ex-hl has-fig" : "ex-hl"} key={i}>
              <details className="ex-hd">
                <summary className="td-sum">
                  <span className="ex-idx" aria-hidden="true">
                    {pad(i + 1)}
                  </span>
                  <h4 className="ex-hlt">{h.title}</h4>
                  {figAt.has(i + 1) && (
                    <span className="ex-hfig">
                      <b>{figAt.get(i + 1)!.figure}</b>
                      <span className="ex-cap">{figAt.get(i + 1)!.label}</span>
                    </span>
                  )}
                  <span className="td-plus" aria-hidden="true" />
                </summary>
                <p className="ex-hlx">{h.text}</p>
              </details>
            </li>
          ))}
        </ol>
      )}

      {(e.recognition || e.url) && (
        <div className="ex-foot">
          {e.recognition && (
            <div className="ex-rec">
              <span className="ex-cap">{t.recognition}</span>
              <p>{e.recognition}</p>
            </div>
          )}
          {e.url && (
            <p className="ex-link">
              <a className="td-link" href={e.url}>
                {host(e.url)} <span aria-hidden="true">↗</span>
              </a>
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function Experience({ c }: { c: Content }) {
  const t = c.ui.experience;
  const name = `ex-tab${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const all = [...c.experience, ...c.earlier];
  const open = (all.find((e) => e.status === "current") ?? all[0])?.slug;

  return (
    <section className="ex-sec pg-sec" id="experience" aria-label={c.ui.sections.experience}>
      <div className="ex-in">
        <header className="pg-head" data-reveal="1.15">
          <span className="pg-num">01</span>
          <h2 className="pg-h2">{c.ui.sections.experience}</h2>
        </header>
        <div className="ex-tabs" data-reveal="1.15">
          <ul className="ex-list" aria-label={t.companies}>
            {c.experience.map((e) => (
              <li key={e.slug}>
                <Tab e={e} name={name} checked={e.slug === open} t={t} />
              </li>
            ))}
            {c.earlier.map((e, i) => (
              <li className="ex-early" key={e.slug}>
                {i === 0 && (
                  <span className="ex-earlyl" aria-hidden="true">
                    {t.earlier}
                  </span>
                )}
                <Tab e={e} name={name} checked={e.slug === open} t={t} />
              </li>
            ))}
          </ul>
          <div className="ex-panels">
            {all.map((e) => (
              <Panel e={e} t={t} rid={`${name}-${e.slug}`} key={e.slug} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

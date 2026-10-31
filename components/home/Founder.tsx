import type { CSSProperties } from "react";
import type { Content, Image, Venture } from "@/lib/content";

/**
 * 03 Founder · Fondateur V5 « Escalier » (préfixe fo-).
 *
 * Chaque venture est une marche plus haute que la précédente (contremarche
 * et giron en filets, période sur le giron), sa fiche posée dessus ; la
 * dernière marche est vide, bordée de tirets, et ne porte que la LED et
 * `founderLine`. Jusqu'à 3 ventures sur une volée ; à partir de 4, une
 * seconde volée repart dessous. Les figures suivent la numérotation commune
 * de la page, après celles des produits (lib/content.ts, `figures`).
 */

type Ui = Content["ui"];
const pad = (n: number) => String(n).padStart(2, "0");
const FLIGHT = 3;

/** « €15K revenue » devient le grand chiffre « €15K » et son libellé. */
function splitMetric(m: string) {
  const i = m.indexOf(" ");
  return i < 0 ? { fig: m, label: "" } : { fig: m.slice(0, i), label: m.slice(i + 1) };
}

/** Une leçon : sa première phrase en gras (jusqu'au premier « : » ou « . »). */
function splitLesson(text: string) {
  const m = /^([^]+?[:.])\s+([^]+)$/.exec(text);
  return m ? { head: m[1], rest: m[2] } : { head: "", rest: text };
}

/** Souligne au feutre braise la phrase de décision là où elle paraît. */
function withDecision(text: string, decision?: string) {
  const i = decision ? text.indexOf(decision) : -1;
  if (!decision || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="fo-ul">{decision}</span>
      {text.slice(i + decision.length)}
    </>
  );
}

function statusOf(v: Venture, ui: Ui) {
  const label = v.statusLabel ?? ui.founder.status?.[v.status] ?? v.status;
  return v.status === "explored" && v.year ? `${label} · ${v.year}` : label;
}

function periodOf(v: Venture, ui: Ui) {
  if (v.period) {
    return `${v.period.start} ${ui.founder.periodTo} ${v.period.end ?? ui.founder.present}`;
  }
  return v.year ?? "";
}

/** Capture dans son cadre d'écran à deux coins de repère. */
function Shot({ img, fig, ui, dims }: { img: Image; fig: number; ui: Ui; dims: boolean }) {
  return (
    <figure className="fo-fig-w">
      <div className="fo-shot">
        <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy" />
        <span className="fo-cor is-a" aria-hidden="true" />
        <span className="fo-cor is-b" aria-hidden="true" />
      </div>
      <figcaption className="fo-cap">
        <span>
          {ui.founder.fig} {fig} · {img.caption ?? img.alt}
        </span>
        {dims && (
          <span>
            {img.width} × {img.height}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** Fiche de la première venture : rôle, tirage photo, capture et chiffres, leçons numérotées. */
function FirstSheet({ v, ui, fig0 }: { v: Venture; ui: Ui; fig0: number }) {
  let fig = fig0;
  const figs = () => ++fig;
  const photo = v.images?.find((i) => i.kind === "photo");
  const shots = (v.images ?? []).filter((i) => i !== photo);
  const metrics = (v.metrics ?? []).map(splitMetric);
  const link = v.links?.[0];
  return (
    <>
      <div className="fo-sb">
        <h3 className="fo-name">
          {link ? (
            <a className="td-title" href={link.href}>
              {v.name}
            </a>
          ) : (
            v.name
          )}
        </h3>
        {v.role && <p className="fo-role">{v.role}</p>}
        {photo && (
          <figure className="fo-print">
            <div className="fo-photo">
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" />
            </div>
            <figcaption className="fo-cap">
              <span>
                {ui.founder.fig} {figs()} · {photo.caption ?? v.name}
              </span>
              {photo.credit && <span>{photo.credit}</span>}
            </figcaption>
          </figure>
        )}
        <p className="fo-body">{v.story}</p>
        {(shots.length > 0 || metrics.length > 0) && (
          <div className={shots.length && metrics.length ? "fo-pair" : "fo-solo"}>
            {shots.map((img) => (
              <Shot key={img.src} img={img} fig={figs()} ui={ui} dims={false} />
            ))}
            {metrics.length > 0 && (
              <dl className="fo-mx">
                {metrics.map((m) => (
                  <div key={m.fig + m.label}>
                    <dt className="fo-figl">{m.label}</dt>
                    <dd className="fo-fig">{m.fig}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
        {v.lessons && v.lessons.length > 0 && (
          <>
            <span className="fo-lab">{ui.founder.learned}</span>
            <ol className="fo-ls">
              {v.lessons.map((l, i) => {
                const { head, rest } = splitLesson(l);
                return (
                  <li key={l}>
                    <span className="fo-ln" aria-hidden="true">
                      {i + 1}
                    </span>
                    <p>
                      {head && <b>{withDecision(head, v.decision)}</b>} <span>{withDecision(rest, v.decision)}</span>
                    </p>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
      {link && (
        <div className="fo-sf">
          <a className="fo-link td-link" href={link.href}>
            {link.label} <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </>
  );
}

/** Fiche d'une venture explorée : capture, histoire, jusqu'où, ce que j'ai appris. */
function Sheet({ v, ui, fig0 }: { v: Venture; ui: Ui; fig0: number }) {
  let fig = fig0;
  const figs = () => ++fig;
  const img = v.images?.[0];
  const link = v.links?.[0];
  return (
    <>
      <div className="fo-sb">
        <h3 className="fo-name">
          {link ? (
            <a className="td-title" href={link.href}>
              {v.name}
            </a>
          ) : (
            v.name
          )}
        </h3>
        {img && <Shot img={img} fig={figs()} ui={ui} dims />}
        <p className="fo-body">{v.story}</p>
        {(v.wentAsFar || v.learned) && (
          <dl className="fo-dl">
            {v.wentAsFar && (
              <div>
                <dt className="fo-lab">{ui.founder.howFar}</dt>
                <dd>{v.wentAsFar}</dd>
              </div>
            )}
            {v.learned && (
              <div>
                <dt className="fo-lab">{ui.founder.learned}</dt>
                <dd>{withDecision(v.learned, v.decision)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
      {link && (
        <div className="fo-sf">
          <a className="fo-link td-link" href={link.href}>
            {link.label} <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </>
  );
}

export default function Founder({ c }: { c: Content }) {
  const { ventures, ui, profile, figures } = c;
  // Figures numérotées dans l'ordre de la page (suite commune, lib/content.ts) :
  // numéro de départ de chaque fiche.
  const fig0 = new Map<string, number>();
  ventures.reduce((acc, v) => {
    fig0.set(v.slug, acc);
    return acc + (v.index === 1 ? (v.images?.length ?? 0) : Math.min(v.images?.length ?? 0, 1));
  }, figures.founder - 1);

  // Volées : 3 ventures au plus par volée ; la marche vide ferme la dernière.
  const flights: Venture[][] = [];
  for (let i = 0; i < ventures.length; i += FLIGHT) flights.push(ventures.slice(i, i + FLIGHT));
  if (flights.length === 0) flights.push([]);
  const total = ventures.length + 1;

  return (
    <section className="fo-sec pg-sec" id="founder" aria-label={ui.sections.founder}>
      <div className="fo-in">
        <header className="pg-head" data-reveal="0.85">
          <span className="pg-num">03</span>
          <h2 className="pg-h2">{ui.sections.founder}</h2>
        </header>
        {flights.map((flight, f) => {
          const last = f === flights.length - 1;
          const first = f === 0;
          // Gabarit : 1.45fr pour la première venture, 1fr pour les suivantes, 0.72fr pour la marche vide.
          const cols = [
            ...flight.map((_, i) => (first && i === 0 ? "minmax(0,1.45fr)" : "minmax(0,1fr)")),
            ...(last ? ["minmax(0,.72fr)"] : []),
          ].join(" ");
          return (
            <ol
              key={f}
              className={`fo-stairs${first ? "" : " is-cont"}`}
              style={{ "--fo-cols": cols } as CSSProperties}
              data-reveal="0.75"
            >
              {flight.map((v, i) => {
                const n = v.index;
                return (
                  <li
                    key={v.slug}
                    className={`fo-step${n === 1 ? " is-first" : ""}`}
                    style={{ "--i": i, "--o": n - 1 } as CSSProperties}
                  >
                    <article className="fo-sheet" aria-label={v.name}>
                      <div className="fo-sh">
                        <span className="fo-lab">
                          {ui.founder.venture} {pad(n)}
                        </span>
                        <span className="fo-st">
                          <span className={v.status === "closed" ? "fo-off" : "fo-sq"} aria-hidden="true" />
                          {statusOf(v, ui)}
                        </span>
                      </div>
                      {n === 1 ? (
                        <FirstSheet v={v} ui={ui} fig0={fig0.get(v.slug) ?? 0} />
                      ) : (
                        <Sheet v={v} ui={ui} fig0={fig0.get(v.slug) ?? 0} />
                      )}
                    </article>
                    <div className="fo-tread">
                      <span className="fo-lab">{periodOf(v, ui)}</span>
                      <span className="fo-ti" aria-hidden="true">
                        {pad(n)}
                      </span>
                    </div>
                  </li>
                );
              })}
              {last && (
                <li
                  className="fo-step is-next"
                  style={{ "--i": flight.length, "--o": total - 1 } as CSSProperties}
                >
                  <div className="fo-next">
                    <span className="fo-led td-blink" aria-hidden="true" />
                    <p className="fo-nl">{profile.founderLine}</p>
                  </div>
                  <div className="fo-tread">
                    <span />
                    <span className="fo-ti" aria-hidden="true">
                      {pad(total)}
                    </span>
                  </div>
                </li>
              )}
            </ol>
          );
        })}
      </div>
    </section>
  );
}

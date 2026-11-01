import type { Content } from "@/lib/content";
import ExploreLink from "@/components/astres/ExploreLink";
import { explodedSvg } from "./nowExplodedSvg";

/**
 * 05 Now · Contact V4 « Grand appel » avec la vue éclatée de V3 (préfixe nw-),
 * jusqu'au pied inclus.
 *
 * Tête compacte (cases Now numérotées 01 à 0n comme le plateau, specs en 3 cases), puis un écran
 * entier pour écrire (phrase fine, adresse en corps de nom, touche géante,
 * liens, LED et founderLine), le nom en mot-signature, l'appareil éclaté qui
 * pointe vers /astres, la règle graduée et le pied.
 */

const SECTIONS = ["experience", "products", "founder", "workbench", "now"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export default function Now({ c }: { c: Content }) {
  const { profile, ui } = c;
  const { primary, secondary, links } = profile.contact;
  const mail = primary.href.replace(/^mailto:/, "");
  const at = mail.indexOf("@");
  const [first, ...rest] = profile.name.split(" ");

  return (
    <section className="nw-sec pg-sec" id="now" aria-label={ui.sections.now}>
      <div className="nw-in">
        <header className="pg-head" data-reveal="1.15">
          <span className="pg-num">05</span>
          <h2 className="pg-h2">{ui.sections.now}</h2>
        </header>

        <ol className="nw-now">
          {profile.now.map((line, i) => (
            <li key={line.text}>
              <span className="nw-idx">{String(i + 1).padStart(2, "0")}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
        <dl className="nw-spec">
          {profile.specs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="nw-cta" data-reveal="1.15">
          <h3 className="nw-lab">{ui.now.contact}</h3>
          <p className="nw-big">
            <span className="nw-thin">{profile.availability}.</span>
            <a className="nw-mail" href={primary.href}>
              {at < 0 ? (
                mail
              ) : (
                <>
                  {mail.slice(0, at + 1)}
                  <wbr />
                  {mail.slice(at + 1)}
                </>
              )}
            </a>
          </p>
          <div className="nw-row">
            <a className="td-key td-key-primary nw-giant" href={primary.href}>
              <span>{primary.label}</span>
              <span className="nw-hint" aria-hidden="true">
                {ui.now.keyHint}
              </span>
            </a>
            <div className="nw-sub">
              {secondary && (
                <a className="td-link nw-a" href={secondary.href}>
                  {secondary.label} <span aria-hidden="true">↗</span>
                </a>
              )}
              <ul className="nw-ext">
                {links.map((l) => (
                  <li key={l.href}>
                    <a className="td-link" href={l.href}>
                      {l.label} <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="nw-meta">
            <span aria-hidden="true" className="td-blink nw-led" />
            <span>{profile.founderLine}</span>
          </p>
        </div>

        <p className="nw-word" aria-hidden="true">
          <span className="td-first">{first}</span> {rest.join(" ")}
        </p>

        <div className="nw-x" data-reveal="0.7">
          <div className="td-plot" dangerouslySetInnerHTML={{ __html: explodedSvg("nw", ui.now.explodedAlt, c.figures.exploded) }} />
          <ExploreLink className="nw-xa" href={profile.explore3d.href}>
            <span className="nw-lab">{ui.now.exploded}</span>
            <span className="nw-xl">
              {profile.explore3d.label} <span aria-hidden="true">↗</span>
            </span>
          </ExploreLink>
        </div>

        <div className="td-ruler nw-ruler" aria-hidden="true" />
        <footer className="nw-foot">
          <a className="nw-name" href="#top">
            {profile.name}
          </a>
          <nav className="nw-fnav td-nav" aria-label={ui.footer.nav}>
            {SECTIONS.map((s, i) => (
              <a key={s} href={`#${s}`}>
                <span className="nw-fn">{pad(i + 1)}</span>
                <span className="td-navl">{ui.sections[s]}</span>
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </section>
  );
}

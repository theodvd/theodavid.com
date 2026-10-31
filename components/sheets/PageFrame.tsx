import Link from "next/link";
import type { Content } from "@/lib/content";
import "@/app/styles/product-sheet.css";

/**
 * Enveloppe « page » des fiches en accès direct (/products/<slug>,
 * /workbench/<slug>), d'après le plateau Assemblage-Sirocco : barre de
 * navigation (repli « Menu » au téléphone), règle graduée, fil de retour
 * « ← Products », la fiche, puis le contact compact.
 *
 * Exemple : <PageFrame c={c} here="products" title="Sirocco">…fiche…</PageFrame>
 */

const SECTIONS = ["experience", "products", "founder", "workbench", "now"] as const;

export default function PageFrame({
  c,
  here,
  title,
  children,
}: {
  c: Content;
  here: "products" | "workbench";
  title: string;
  children: React.ReactNode;
}) {
  const { ui, profile } = c;
  const back = here === "products" ? ui.products.back : ui.workbench.back;
  const nav = SECTIONS.map((s, i) => ({ href: `/#${s}`, n: `0${i + 1}`, label: ui.sections[s], here: s === here }));
  return (
    <div className="as-page">
      <a className="td-skip" href="#main">
        {ui.nav.skip}
      </a>
      <div className="td-header as-top">
        <header className="td-nav v6-nav">
          <Link className="v6-logo" href="/">
            <span>{profile.name}</span>
          </Link>
          <nav aria-label={ui.products.mainNav} className="v6-links">
            {nav.map((l) => (
              <a
                key={l.href}
                className={`v6-nl${l.here ? " is-here" : ""}`}
                href={l.href}
                aria-current={l.here ? "true" : undefined}
              >
                <span className="v6-num">{l.n}</span>
                <span className="td-navl v6-navl">{l.label}</span>
              </a>
            ))}
          </nav>
          <details className="v6-menu">
            <summary>{ui.nav.menu}</summary>
            <nav aria-label={ui.products.mainNav} className="v6-panel">
              {nav.map((l) => (
                <a key={l.href} href={l.href} aria-current={l.here ? "true" : undefined}>
                  <span className="v6-num">{l.n}</span>
                  <span>{l.label}</span>
                </a>
              ))}
            </nav>
          </details>
        </header>
        <div className="td-ruler v6-ruler" aria-hidden="true" />
      </div>
      <main className="as-main" id="main">
        <div className="as-crumbs">
          <a className="as-back" href={`/#${here}`}>
            <span aria-hidden="true">←</span> {back}
          </a>
          <nav aria-label={ui.products.breadcrumb} className="as-trail">
            <ol>
              <li>
                <Link href="/">{profile.name}</Link>
              </li>
              <li>
                <a href={`/#${here}`}>{back}</a>
              </li>
              <li>
                <span aria-current="page">{title}</span>
              </li>
            </ol>
          </nav>
        </div>
        {children}
        <Contact c={c} />
      </main>
    </div>
  );
}

/** Contact compact du pied de fiche : statut, adresse, Write to me, Book 30 min, LinkedIn, GitHub. */
function Contact({ c }: { c: Content }) {
  const { profile, ui } = c;
  const { primary, secondary, links } = profile.contact;
  const mail = primary.href.replace(/^mailto:/, "");
  return (
    <section className="as-contact" aria-labelledby="contact-h">
      <div className="as-c-l">
        <h2 className="as-c-h" id="contact-h">
          <span aria-hidden="true" className="as-c-led td-blink" />
          {profile.availability}
        </h2>
        <a className="as-mail td-link" href={primary.href}>
          {mail}
        </a>
      </div>
      <div className="as-c-r">
        <div className="as-keys">
          <a className="td-key td-key-primary" href={primary.href}>
            <span>{primary.label}</span>
            <span className="as-hint" aria-hidden="true">
              {ui.products.writeHint}
            </span>
          </a>
          {secondary && (
            <a className="td-key td-key-secondary" href={secondary.href}>
              <span>{secondary.label}</span>
              <span className="as-hint" aria-hidden="true">
                {ui.products.bookHint}
              </span>
            </a>
          )}
        </div>
        <p className="as-else">
          {links.map((l) => (
            <a key={l.href} className="td-link" href={l.href}>
              {l.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </p>
      </div>
    </section>
  );
}

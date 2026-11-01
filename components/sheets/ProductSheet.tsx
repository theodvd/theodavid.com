import Link from "next/link";
import type { CaseBlock, Content, Product } from "@/lib/content";
import Pic from "@/components/Pic";
import SheetDialog, { CloseButton } from "./SheetDialog";
import Viewer from "./Viewer";
import CaseLink from "./CaseLink";
import JumpNav from "./JumpNav";
import { Note, Stamp, StatusMark, Underlined } from "./Marks";
import { productTitle } from "./meta";
import { builtFor, dims, figNo, fill, proofLines, ratioVars, shots, stampSub, statusText, two } from "./lib";
import "@/app/styles/product-sheet.css";

/**
 * Fiche produit (`ProductSheet`) : un composant, deux enveloppes.
 * - `overlay` : surimpression depuis la home (plateau Produits-V7-Fiche) :
 *   tête mono avec Close, à gauche Problem, Built, Stack, liens et mention
 *   légale, à droite la visionneuse puis Proof ; pied Previous / Next en boucle.
 * - `page` : accès direct (plateau Assemblage-Sirocco) : titre en h1, rail de
 *   272 px collant (Jump to, Year, Built for, Stack, Link) et colonne de lecture
 *   (visionneuse, 01 Problem, 02 Built, 03 Proof, 04 Case study s'il existe),
 *   pied « Next product » en grand.
 *
 * Exemple : <ProductSheet c={c} p={product} prev={prev} next={next} mode="overlay" />
 */

type Props = { c: Content; p: Product; prev: Product; next: Product; mode: "overlay" | "page" };

/** Étude de cas : seulement si le contenu en porte une (blocs déjà filtrés par date), jamais inventée. */
function caseStudy(p: Product): CaseBlock[] {
  return p.caseStudy?.blocks ?? [];
}

/**
 * Les blocs de l'étude de cas : texte, choix (écartés et retenus, en cases à
 * filets), captures (chacune à son format, numérotée Fig. n.k après la
 * capture principale du produit).
 */
function CaseBlocks({ p, blocks, figLabel }: { p: Product; blocks: CaseBlock[]; figLabel: string }) {
  let k = 0;
  return (
    <div className="as-case">
      {blocks.map((b, i) => (
        <div className={`as-cs as-cs--${b.kind}`} key={i}>
          {b.title && <h3 className="as-cs-k">{b.title}</h3>}
          {b.kind === "text" && b.paragraphs.map((t) => <p key={t}>{t}</p>)}
          {b.kind === "choices" && (
            <ul className="as-cs-choices">
              {b.items.map((it) => (
                <li key={it.name} className={it.kept ? "is-kept" : undefined}>
                  <span className="as-cs-v">{it.verdict}</span>
                  <span className="as-cs-n">{it.name}</span>
                  <span className="as-cs-t">{it.text}</span>
                </li>
              ))}
            </ul>
          )}
          {b.kind === "figures" && (
            <div className="as-cs-figs">
              {b.images.map((im) => {
                k += 1;
                return (
                  <figure className="as-cs-fig" key={im.src} style={ratioVars(im)}>
                    <span className="v6-glass">
                      <Pic src={im.src} alt={im.alt} width={im.width} height={im.height} sizes="(max-width: 760px) 100vw, 480px" />
                      <span aria-hidden="true" className="v6-corner v6-c1" />
                      <span aria-hidden="true" className="v6-corner v6-c2" />
                    </span>
                    <figcaption className="v6-cap">
                      <span>{fill(figLabel, { n: `${figNo(p)}.${k}`, caption: im.caption ?? im.alt })}</span>
                      <span>{dims(im)}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProductSheet(props: Props) {
  return props.mode === "overlay" ? <Overlay {...props} /> : <Page {...props} />;
}

/* ---------- pièces communes ---------- */

function Bar({ c, p, close }: { c: Content; p: Product; close?: boolean }) {
  const u = c.ui.products;
  return (
    <header className="v7-bar">
      <span className="v7-bar-id">
        {u.sheet} {two(p.index)}
      </span>
      <span className="v7-bar-m">{p.year}</span>
      <span className="v7-st">
        <StatusMark status={p.status} where="sheet" />
        {statusText(p, c.ui)}
      </span>
      {p.statusNote && <span className="v7-bar-m">{p.statusNote}</span>}
      <span className="v7-pos">
        {p.index} / {p.total}
      </span>
      {close && (
        <CloseButton className="v7-close" label={u.closeLabel} text={u.close} hint={u.closeHint} hintClass="v7-kh" />
      )}
    </header>
  );
}

function Lead({ c, p, titleId, h1 }: { c: Content; p: Product; titleId: string; h1?: boolean }) {
  const u = c.ui.products;
  const sub = stampSub(p);
  const Title = h1 ? "h1" : "h2";
  return (
    <div className="v7-lead">
      <div className="v7-no">
        <span className="v7-big td-cond">{two(p.index)}</span>
        <span className="v7-sheetl">{u.sheet}</span>
      </div>
      <div className="v7-lmain">
        <Title className={`v7-title${h1 ? " as-title" : ""}`} id={titleId}>
          {p.name}
        </Title>
        {p.note && <Note prefix="v6" text={p.note} className="v7-note" />}
        <p className="v7-line">{p.oneLiner}</p>
        {h1 && p.disclaimer && <p className="as-legal">{p.disclaimer}</p>}
      </div>
      {sub && (
        <div className="v7-stampbox">
          <Stamp prefix="v6" main={u.builtToGetHired} sub={sub} className="v7-stamp" />
        </div>
      )}
    </div>
  );
}

function Figures({ p, page }: { p: Product; page?: boolean }) {
  const figures = p.figures ?? [];
  if (!figures.length) return null;
  return (
    <dl
      className={`v7-figs${page ? " as-figs" : ""}`}
      style={{ ["--n" as string]: Math.min(figures.length, 4) } as React.CSSProperties}
    >
      {figures.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd className="td-cond">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Lines({ p, page }: { p: Product; page?: boolean }) {
  const lines = proofLines(p);
  if (!lines.length) return null;
  return (
    <ul className={`v7-plines${page ? " as-plines" : ""}`}>
      {lines.map((l) => (
        <li key={l}>
          <Underlined prefix="v6" text={l} u={p.proofUnderline} />
        </li>
      ))}
    </ul>
  );
}

function BuiltList({ p, page }: { p: Product; page?: boolean }) {
  return (
    <ol className={`v7-built${page ? " as-built" : ""}`}>
      {p.built.map((b, i) => (
        <li key={b}>
          <span className="v7-bn">{two(i + 1)}</span>
          <span>{b}</span>
        </li>
      ))}
    </ol>
  );
}

function LinkList({ p, className }: { p: Product; className: string }) {
  return (
    <div className={className}>
      {p.links.map((l) => (
        <a key={l.href} className="td-link v6-a" href={l.href}>
          {l.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

/* Fiche en surimpression : l'étude de cas ne vit que sur la page directe. Sous Proof,
   ses parties titrées, puis un lien vers elle (chargement complet de la page, CaseLink). */
function CaseTeaser({ p, blocks, u }: { p: Product; blocks: CaseBlock[]; u: Content["ui"]["products"] }) {
  const parts = blocks.map((b) => b.title).filter((t): t is string => Boolean(t));
  return (
    <section className="v7-sec v7-case">
      <h3 className="v7-k">{u.caseStudy}</h3>
      {parts.length > 0 && (
        <ol className="v7-built v7-parts">
          {parts.map((t, i) => (
            <li key={t}>
              <span className="v7-bn">{two(i + 1)}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      )}
      <CaseLink className="td-link v7-cgo" href={`/products/${p.slug}#case`}>
        {u.readCaseStudy} <span aria-hidden="true">→</span>
      </CaseLink>
    </section>
  );
}

function viewerLabels(c: Content) {
  const u = c.ui.products;
  return { fig: u.fig, version: u.version, showVersion: u.showVersion, versions: u.versions };
}

/* ---------- surimpression ---------- */

function Overlay({ c, p, prev, next }: Props) {
  const u = c.ui.products;
  const list = shots(p);
  const cs = caseStudy(p);
  const titleId = `v7-t-${p.slug}`;
  const href = (x: Product) => `/products/${x.slug}`;
  return (
    <SheetDialog
      layer="v7-layer"
      sheet=".v7-sheet"
      labelledBy={titleId}
      title={productTitle(p)}
      self={href(p)}
      prev={href(prev)}
      next={href(next)}
      fallback="/#products"
    >
      <article className={`v7-sheet${list.length ? "" : " is-noview"}`}>
        <span className="v7-grip" aria-hidden="true" />
        <Bar c={c} p={p} close />
        <Lead c={c} p={p} titleId={titleId} />
        <div className="v7-body">
          <div className="v7-col v7-col-a">
            <section className="v7-sec v7-s-problem">
              <h3 className="v7-k">{u.problem}</h3>
              <p className="v7-p">{p.problem}</p>
            </section>
            <section className="v7-sec v7-s-built">
              <h3 className="v7-k">{u.built}</h3>
              <BuiltList p={p} />
            </section>
            <section className="v7-sec v7-s-meta">
              <div className="v7-meta">
                <div>
                  <h3 className="v7-k">{u.stack}</h3>
                  <p className="v7-stack">{p.stack.join(", ")}</p>
                </div>
                {p.links.length > 0 && (
                  <div>
                    <h3 className="v7-k">{p.links.length > 1 ? u.links : u.link}</h3>
                    <LinkList p={p} className="v6-lk" />
                  </div>
                )}
              </div>
              {p.disclaimer && <p className="v7-legal">{p.disclaimer}</p>}
            </section>
          </div>
          <div className="v7-col v7-col-b">
            {list.length > 0 && <Viewer key={p.slug} shots={list} name={p.name} fig={figNo(p)} labels={viewerLabels(c)} />}
            <section className="v7-sec v7-proof">
              <h3 className="v7-k">{u.proof}</h3>
              <Figures p={p} />
              <Lines p={p} />
            </section>
            {cs.length > 0 && <CaseTeaser p={p} blocks={cs} u={u} />}
          </div>
        </div>
        <nav className="v7-foot" aria-label={u.otherSheets}>
          <Link className="v7-step" href={href(prev)} replace scroll={false}>
            <span className="v7-stepk">{u.previous}</span>
            <span className="v7-stepn">
              <span className="td-title">
                {two(prev.index)} {prev.name}
              </span>
            </span>
          </Link>
          <Link className="v7-step v7-step-next" href={href(next)} replace scroll={false}>
            <span className="v7-stepk">{u.next}</span>
            <span className="v7-stepn">
              <span className="td-title">
                {two(next.index)} {next.name}
              </span>
            </span>
          </Link>
        </nav>
      </article>
    </SheetDialog>
  );
}

/* ---------- page en accès direct ---------- */

function Page({ c, p, prev, next }: Props) {
  const u = c.ui.products;
  const list = shots(p);
  const cs = caseStudy(p);
  const forWhom = builtFor(p);
  const jump = [
    { id: "problem", n: "01", label: u.problem },
    { id: "built", n: "02", label: u.built },
    { id: "proof", n: "03", label: u.proof },
    ...(cs.length ? [{ id: "case", n: "04", label: u.caseStudy }] : []),
  ];
  return (
    <>
      <article className={`v7-sheet as-sheet${list.length ? "" : " is-noview"}`} aria-labelledby="as-t">
        <Bar c={c} p={p} />
        <Lead c={c} p={p} titleId="as-t" h1 />
        <div className="as-body">
          <aside className="as-rail" aria-label={u.onThisPage}>
            <div className="as-rail-in">
              <JumpNav label={u.jumpTo} items={jump} />
              <dl className="as-facts">
                <div>
                  <dt>{u.year}</dt>
                  <dd>{p.year}</dd>
                </div>
                {forWhom && (
                  <div>
                    <dt>{u.builtFor}</dt>
                    <dd>{forWhom}</dd>
                  </div>
                )}
                <div>
                  <dt>{u.stack}</dt>
                  <dd>
                    <ul className="as-stack">
                      {p.stack.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                {p.links.length > 0 && (
                  <div>
                    <dt>{p.links.length > 1 ? u.links : u.link}</dt>
                    <dd>
                      <LinkList p={p} className="as-links" />
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
          <div className="as-flow">
            {list.length > 0 && (
              <Viewer shots={list} name={p.name} fig={figNo(p)} labels={viewerLabels(c)} className="as-view" eager />
            )}
            <section className="as-sec as-s-problem" id="problem" aria-labelledby="problem-h">
              <h2 className="as-h" id="problem-h">
                <span className="as-hn">01</span>
                {u.problem}
              </h2>
              <p className="as-big">{p.problem}</p>
            </section>
            <section className="as-sec as-s-built" id="built" aria-labelledby="built-h">
              <h2 className="as-h" id="built-h">
                <span className="as-hn">02</span>
                {u.built}
              </h2>
              <BuiltList p={p} page />
            </section>
            <section className="as-sec as-s-proof" id="proof" aria-labelledby="proof-h">
              <h2 className="as-h" id="proof-h">
                <span className="as-hn">03</span>
                {u.proof}
              </h2>
              <Figures p={p} page />
              <Lines p={p} page />
            </section>
            {cs.length > 0 && (
              <section className="as-sec as-s-case" id="case" aria-labelledby="case-h">
                <h2 className="as-h" id="case-h">
                  <span className="as-hn">04</span>
                  {u.caseStudy}
                </h2>
                <CaseBlocks p={p} blocks={cs} figLabel={u.fig} />
              </section>
            )}
          </div>
        </div>
        {/* Liens pleins (pas de Link) : sur une page directe, la fiche suivante s'ouvre en page, pas en surimpression. */}
        <nav className="v7-foot as-foot" aria-label={u.otherSheets}>
          <a className="v7-step" href={`/products/${prev.slug}`}>
            <span className="v7-stepk">{u.previous}</span>
            <span className="v7-stepn">
              <span className="td-title">
                {two(prev.index)} {prev.name}
              </span>
            </span>
          </a>
          <a className="v7-step v7-step-next as-next" href={`/products/${next.slug}`}>
            <span className="v7-stepk">{u.nextProduct}</span>
            <span className="v7-stepn as-nextn">
              <span className="td-title">
                {two(next.index)} {next.name}
              </span>
              <span className="as-arrow" aria-hidden="true">
                →
              </span>
            </span>
            <span className="as-nextl">{next.oneLiner}</span>
          </a>
        </nav>
      </article>
    </>
  );
}

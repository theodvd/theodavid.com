import { useId } from "react";
import Link from "next/link";
import type { Content, Product } from "@/lib/content";
import Pic from "@/components/Pic";
import { fill, figNo, shots, stampSub, statusText, two } from "@/components/sheets/lib";
import { Note, Stamp, StatusMark, Underlined, WearFilter } from "@/components/sheets/Marks";

/**
 * 02 Products · Produits V7, « Pile de fiches » (plateau Assemblage-Page-1).
 * Chaque produit est une fiche de notice ; sa capture est glissée de travers
 * derrière elle et dépasse à droite, elle sort entière au survol. La fiche
 * entière ouvre /products/<slug> (surimpression depuis la home), les liens
 * externes restent cliquables au-dessus. Au téléphone : une colonne, capture
 * à plat sous le texte (home.css).
 * Une seule fiche ouverte à la fois, comme les onglets d'Experience : un radio
 * par fiche (nommé par le produit), sans script ; les autres fiches se replient
 * sur leur tête et un clic sur la tête les ouvre (fix-pr.css).
 */
export default function Products({ c }: { c: Content }) {
  const { products, ui, profile } = c;
  const u = ui.products;
  const hired = products.filter((p) => p.origin.builtToGetHired).length;
  const aside = fill(u.aside, { n: products.length, k: hired });
  const name = `pr-pick${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <section id="products" className="pr pr-list pg-sec" aria-label={ui.sections.products}>
      <WearFilter />
      <div className="pr-in">
        <header className="pg-head" data-reveal="1.15">
          <span className="pg-num">02</span>
          <h2 className="pg-h2">{ui.sections.products}</h2>
          <span className="pg-aside">{hired ? aside : aside.split(" · ")[0]}</span>
        </header>
        {profile.productsIntro && <p className="pr-intro">{profile.productsIntro}</p>}
        <div className="pr-pile">
          {products.map((p, i) => (
            <Card key={p.slug} p={p} c={c} name={name} open={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ p, c, name, open }: { p: Product; c: Content; name: string; open: boolean }) {
  const u = c.ui.products;
  const sub = stampSub(p);
  const list = shots(p);
  const figures = p.figures ?? [];
  return (
    <article className={`pr-s pr-hov${list.length ? " has-tuck" : ""}`} data-reveal="1.15">
      <input className="pr-r" type="radio" name={name} id={`${name}-${p.slug}`} defaultChecked={open} aria-label={p.name} />
      <label className="pr-open" htmlFor={`${name}-${p.slug}`} aria-hidden="true">
        <span className="td-plus" />
      </label>
      <div className="pr-no">
        <span className="pr-big td-cond">{two(p.index)}</span>
        <span className="pr-sheet">{u.sheet}</span>
        <span className="pr-oh" aria-hidden="true">
          {u.openSheet}
          <span className="pr-kh"> {u.openHint}</span>
        </span>
      </div>
      <div className="pr-main">
        <h3 className="pr-title pr-t">
          <Link className="td-title" href={`/products/${p.slug}`} aria-haspopup="dialog" scroll={false}>
            {p.name}
          </Link>
        </h3>
        {p.note && <Note prefix="pr" text={p.note} />}
        <p className="pr-line">{p.oneLiner}</p>
        {p.cardProof && (
          <p className="pr-proof">
            <Underlined prefix="pr" text={p.cardProof} u={p.proofUnderline} />
          </p>
        )}
        {p.links.length > 0 && (
          <div className="pr-lk">
            {p.links.map((l) => (
              <a key={l.href} className="td-link pr-a" href={l.href}>
                {l.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
        {p.disclaimer && <p className="pr-legal">{p.disclaimer}</p>}
      </div>
      <div className="pr-side">
        <span className="pr-st">
          <StatusMark status={p.status} where="card" />
          {statusText(p, c.ui)}
        </span>
        {p.statusNote && <span className="pr-stnote">{p.statusNote}</span>}
        {figures.length > 0 && (
          <dl className="pr-nums">
            {figures.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd className="td-cond">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {sub && <Stamp prefix="pr" main={u.builtToGetHired} sub={sub} small ink />}
        <p className="pr-stack">{p.stack.join(", ")}</p>
      </div>
      <Tuck p={p} fig={u.fig} />
    </article>
  );
}

/** Capture glissée derrière la fiche ; plusieurs versions (Rayon) : un éventail de quatre liens et une seule légende numérotée. */
function Tuck({ p, fig }: { p: Product; fig: string }) {
  const list = shots(p);
  if (!list.length) return null;
  if (list.length > 1) {
    return (
      <div className="pr-tuck pr-tuck-fan">
        {list.slice(0, 4).map((s, j) => {
          const inner = (
            <>
              <span className="pr-glass pr-glass-sm">
                <Pic src={s.src} alt={s.alt} width={s.width} height={s.height} sizes="(max-width: 760px) 100vw, 480px" />
                <span aria-hidden="true" className="pr-corner pr-c1" />
                <span aria-hidden="true" className="pr-corner pr-c2" />
              </span>
              <span className="pr-tkl">
                {s.label} {s.href && <span aria-hidden="true">↗</span>}
              </span>
            </>
          );
          return s.href ? (
            <a key={s.src} className={`pr-tk pr-tk${j}`} href={s.href}>
              {inner}
            </a>
          ) : (
            <span key={s.src} className={`pr-tk pr-tk${j}`}>
              {inner}
            </span>
          );
        })}
        <span className="pr-tcap">{fill(fig, { n: figNo(p), caption: p.imagesCaption ?? p.name })}</span>
      </div>
    );
  }
  const s = list[0];
  return (
    <div className="pr-tuck">
      <span className="pr-glass">
        <Pic src={s.src} alt={s.alt} width={s.width} height={s.height} sizes="(max-width: 760px) 100vw, 480px" />
        <span aria-hidden="true" className="pr-corner pr-c1" />
        <span aria-hidden="true" className="pr-corner pr-c2" />
      </span>
      <span className="pr-tcap">{fill(fig, { n: figNo(p), caption: s.caption ?? p.name })}</span>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- capture servie telle quelle, à son format */
import Link from "next/link";
import type { Content, Tool } from "@/lib/content";
import SheetDialog, { CloseButton } from "./SheetDialog";
import { dims, fill, ratioVars } from "./lib";
import { toolTitle } from "./meta";
import "@/app/styles/tool-sheet.css";

/**
 * Fiche d'outil (`ToolSheet`) : même schéma que la fiche produit, plus légère
 * (plateau Atelier-V6-Play). Tête mono (Tool sheet 04.n, n / total, Close),
 * porte-étiquette du tiroir repris en grand, la ligne, How it works et Stack,
 * visionneuse à droite (une colonne de 720 px sans photo), Previous / Next.
 * Deux enveloppes : `overlay` depuis la home, `page` en accès direct.
 *
 * Exemple : <ToolSheet c={c} t={tool} prev={prev} next={next} mode="overlay" />
 */

type Props = { c: Content; t: Tool; prev: Tool; next: Tool; mode: "overlay" | "page" };

export default function ToolSheet({ c, t, prev, next, mode }: Props) {
  const w = c.ui.workbench;
  const overlay = mode === "overlay";
  const titleId = overlay ? `w6-t-${t.slug}` : "w6-t";
  const Title = overlay ? "h2" : "h1";
  const im = t.image;
  const href = (x: Tool) => `/workbench/${x.slug}`;
  const Step = ({ x, dir }: { x: Tool; dir: "prev" | "next" }) => {
    const cls = `w6-step${dir === "next" ? " w6-step-next" : ""}`;
    const inner = (
      <>
        <span className="w6-stepk">{dir === "next" ? w.next : w.previous}</span>
        <span className="w6-stepn">
          <span className="td-title">
            {x.ref} {x.name}
          </span>
        </span>
      </>
    );
    // En page directe, des liens pleins : la fiche voisine s'ouvre en page, pas en surimpression.
    return overlay ? (
      <Link className={cls} href={href(x)} replace scroll={false}>
        {inner}
      </Link>
    ) : (
      <a className={cls} href={href(x)}>
        {inner}
      </a>
    );
  };

  const sheet = (
    <article className={`w6-sheet${im ? "" : " is-noview"}`} aria-labelledby={overlay ? undefined : titleId}>
      <span className="w6-grip" aria-hidden="true" />
      <header className="w6-bar">
        <span className="w6-bar-id">
          {w.toolSheet} {t.ref}
        </span>
        <span className="w6-pos">
          {t.index} / {t.total}
        </span>
        {overlay && (
          <CloseButton className="w6-close" label={w.closeLabel} text={w.close} hint={w.closeHint} hintClass="w6-kh" />
        )}
      </header>
      <div className="w6-body">
        <div className="w6-text">
          <div className="w6-lead">
            <div className="w6-tag">
              <span className="w6-ref">{t.ref}</span>
              <Title className="w6-title" id={titleId}>
                {t.name}
              </Title>
            </div>
            <p className="w6-line">{t.line}</p>
          </div>
          {t.howItWorks && (
            <section className="w6-sec">
              <h3 className="w6-k">{w.howItWorks}</h3>
              <p className="w6-p">{t.howItWorks}</p>
            </section>
          )}
          {t.stack && t.stack.length > 0 && (
            <section className="w6-sec">
              <h3 className="w6-k">{w.stack}</h3>
              <ul className="w6-stack">
                {t.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {im && (
          <figure className="w6-view">
            <div className="w6-stage">
              <img
                className="w6-shot"
                style={ratioVars(im)}
                src={im.src}
                alt={im.alt}
                width={im.width}
                height={im.height}
                loading={overlay ? "lazy" : "eager"}
                decoding="async"
              />
            </div>
            <figcaption className="w6-cap">
              <span>{fill(w.fig, { ref: t.ref, name: im.caption ?? t.name })}</span>
              <span>{dims(im)}</span>
            </figcaption>
          </figure>
        )}
      </div>
      <nav className="w6-foot" aria-label={w.otherSheets}>
        <Step x={prev} dir="prev" />
        <Step x={next} dir="next" />
      </nav>
    </article>
  );

  if (!overlay) return sheet;
  return (
    <SheetDialog
      layer="w6-layer"
      sheet=".w6-sheet"
      labelledBy={titleId}
      title={toolTitle(t)}
      self={href(t)}
      prev={href(prev)}
      next={href(next)}
      fallback="/#workbench"
    >
      {sheet}
    </SheetDialog>
  );
}

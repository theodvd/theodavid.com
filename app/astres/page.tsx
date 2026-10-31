import type { Metadata, Viewport } from "next";
import AstresApp, { type AstresLabels, type AstresProduct } from "@/components/astres/AstresApp";
import { getContent } from "@/lib/content";

/**
 * /astres : l'expérience 3D secondaire, une planète par produit
 * (content/products, ventures hors scène). Toujours sombre.
 * Le texte vient de content/ (profile.json, ui.json, products/).
 */

export function generateMetadata(): Metadata {
  const { profile, ui } = getContent();
  return {
    title: `${profile.explore3d.label} · ${profile.name}`,
    description: ui.astres.intro,
  };
}

export const viewport: Viewport = { themeColor: "#0a0d16" };

export default function AstresPage() {
  const { products, profile, ui } = getContent();
  const items: AstresProduct[] = products.map((p) => ({
    slug: p.slug,
    n: String(p.index).padStart(2, "0"),
    name: p.name,
    status: p.status,
    statusText: p.statusLabel ?? ui.products.status[p.status],
    oneLiner: p.oneLiner,
    proof: p.proof[0],
    links: p.links,
  }));
  const a = ui.astres;
  const labels: AstresLabels = {
    back: a.back,
    backHint: a.backHint,
    keyHint: a.keyHint,
    intro: a.intro,
    howLg: a.howLg,
    howSm: a.howSm,
    index: a.index,
    still: a.still,
    noGl: a.noGl,
    noGlHow: a.noGlHow,
    weakTitle: a.weakTitle,
    weakNote: a.weakNote,
    weakHow: a.weakHow,
    load: a.load,
    loading: a.loading,
    renderAlt: a.renderAlt,
    readOnPage: a.readOnPage,
    sheet: ui.products.sheet,
    close: ui.products.close,
  };
  return <AstresApp products={items} labels={labels} name={profile.name} contact={profile.contact.primary} />;
}

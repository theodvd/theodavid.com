import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  const title = `${profile.explore3d.label} · ${profile.name}`;
  // partage propre à /astres (il reprenait le titre et la phrase de la home) ; l'image reste celle du site,
  // redonnée ici parce qu'un bloc openGraph propre à la route ne reprend pas celle de app/opengraph-image.jpg
  const alt = readFileSync(join(process.cwd(), "app/opengraph-image.alt.txt"), "utf8").trim();
  const images = [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt }];
  return {
    title,
    description: ui.astres.intro,
    alternates: { canonical: "/astres" },
    openGraph: { title, description: ui.astres.intro, url: "https://theodavid.com/astres", siteName: profile.name, type: "website", images },
    twitter: { card: "summary_large_image", title, description: ui.astres.intro, images },
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

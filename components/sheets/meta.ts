import type { Metadata } from "next";
import { getContent, getProduct, getTool, type Product, type Tool } from "@/lib/content";
import { cut } from "./lib";

/**
 * Métadonnées des fiches, partagées par la page directe et la surimpression.
 * Produit : « Sirocco · <oneLiner jusqu'à la première virgule> · Théo David »,
 * description = oneLiner, og:image = première capture (sinon la carte titre et
 * chiffres de opengraph-image). Outil : même règle sur sa ligne.
 */
/** Titre d'onglet d'un produit : « Sirocco · <oneLiner jusqu'à la première virgule> · Théo David ». */
export function productTitle(p: Product): string {
  return `${p.name} · ${cut(p.oneLiner)} · ${getContent().profile.name}`;
}

/** Titre d'onglet d'un outil : même règle sur sa ligne (jusqu'au premier deux-points ou à la première virgule). */
export function toolTitle(t: Tool): string {
  return `${t.name} · ${cut(t.line, /[,:]/)} · ${getContent().profile.name}`;
}

export function productMetadata(slug: string): Metadata {
  const found = getProduct(slug);
  if (!found) return {};
  const { product: p } = found;
  const { profile } = getContent();
  const title = productTitle(p);
  const url = `/products/${p.slug}`;
  const im = p.images?.[0];
  const images = im ? [{ url: im.src, width: im.width, height: im.height, alt: im.alt }] : undefined;
  return {
    title,
    description: p.oneLiner,
    alternates: { canonical: url },
    openGraph: { title, description: p.oneLiner, url, type: "article", siteName: profile.name, ...(images && { images }) },
    twitter: { card: "summary_large_image", title, description: p.oneLiner, ...(images && { images }) },
  };
}

export function toolMetadata(slug: string): Metadata {
  const found = getTool(slug);
  if (!found) return {};
  const { tool: t } = found;
  const { profile } = getContent();
  const title = toolTitle(t);
  const url = `/workbench/${t.slug}`;
  const im = t.image;
  const images = im ? [{ url: im.src, width: im.width, height: im.height, alt: im.alt }] : undefined;
  return {
    title,
    description: t.line,
    alternates: { canonical: url },
    openGraph: { title, description: t.line, url, type: "article", siteName: profile.name, ...(images && { images }) },
    twitter: { card: "summary_large_image", title, description: t.line, ...(images && { images }) },
  };
}

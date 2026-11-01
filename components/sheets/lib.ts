import type { CSSProperties } from "react";
import type { Image, Product, Ui } from "@/lib/content";

/**
 * Petites règles partagées par la pile de fiches (home), la fiche produit
 * (surimpression et page) et la fiche d'outil. Aucune chaîne affichée ici :
 * les libellés viennent de content/ui.json, les textes de content/.
 */

/** Remplace les {clés} d'un libellé de ui.json. Exemple : fill("{n} / {t}", { n: 1, t: 5 }). */
export function fill(label: string, vars: Record<string, string | number>): string {
  return label.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Numéro sur deux chiffres : 1 devient « 01 ». */
export const two = (n: number) => String(n).padStart(2, "0");

/** Libellé de statut : `statusLabel` s'il existe, sinon le statut de ui.json. */
export function statusText(p: Product, ui: Ui): string {
  return p.statusLabel ?? ui.products.status[p.status] ?? p.status;
}

/** Numéro de figure des captures de Products (plateaux : Sirocco, premier produit, est Fig. 2). */
export const figNo = (p: Product) => p.index + 1;

/** Le tampon « Built to get hired » : seulement pour les produits construits pour un poste. */
export function stampSub(p: Product): string | null {
  if (!p.origin.builtToGetHired) return null;
  return [p.stampCompany, p.origin.outcome].filter(Boolean).join(" · ");
}

/**
 * Ligne « Built for » de la page : entreprise et poste ; tant que l'entreprise
 * est masquée par la date (Sirocco avant le 02/11), le poste seul.
 */
export function builtFor(p: Product): string | null {
  if (!p.origin.builtToGetHired) return null;
  const masked = p.stampCompany !== p.origin.company;
  return (masked ? [p.origin.role] : [p.origin.company, p.origin.role]).filter(Boolean).join(" · ") || null;
}

/** Lignes de preuve sous les chiffres : celles que les chiffres disent déjà sont retirées. */
export function proofLines(p: Product): string[] {
  const said = new Set(p.proofInFigures ?? []);
  return p.proof.filter((_, i) => !said.has(i));
}

/** `version` : capture d'une version de marque, appariée à son lien (Rayon) ; sinon un écran du produit. */
export type Shot = Image & { label: string; href?: string; version: boolean };

/**
 * Captures de la visionneuse. Avec autant de liens que de captures (Rayon),
 * chaque capture porte le nom et l'adresse de sa version ; sinon le premier lien.
 */
export function shots(p: Product): Shot[] {
  const images = p.images ?? [];
  const paired = images.length > 1 && p.links.length === images.length;
  // dans l'éventail, la légende commune « Fig. n » nomme déjà le produit : « Outbound agent, Monday call sheet » devient « Monday call sheet »
  const short = (c: string) => (images.length > 1 ? c.replace(`${p.name}, `, "") : c);
  return images.map((im, j) => ({
    ...im,
    label: paired ? p.links[j].label : short(im.caption ?? p.name),
    version: paired,
    href: (paired ? p.links[j] : p.links[0])?.href,
  }));
}

/** Dimensions affichées sous une capture : « 1200 × 750 ». */
export const dims = (im: { width: number; height: number }) => `${im.width} × ${im.height}`;

/** Début d'une phrase jusqu'au premier séparateur (virgule par défaut), pour les titres d'onglet. */
export function cut(text: string, sep: RegExp = /,/): string {
  const i = text.search(sep);
  return (i > 0 ? text.slice(0, i) : text).trim();
}

/** Variables CSS du format d'une image (--w, --h), pour la garder à son format. */
export function ratioVars(im: { width: number; height: number }): CSSProperties {
  return { ["--w" as string]: im.width, ["--h" as string]: im.height } as CSSProperties;
}

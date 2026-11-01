import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata, Viewport } from "next";
import AstresApp, { type AstresEntry, type AstresLabels } from "@/components/astres/AstresApp";
import { period } from "@/components/home/Experience";
import { fill } from "@/components/sheets/lib";
import { getContent } from "@/lib/content";

/**
 * /astres : l'expérience 3D secondaire, tout ce que Théo a construit en un
 * système (P4, décision du 01/11/2026) : produits, ventures, outils de
 * l'atelier, expériences et lunes. Toujours sombre.
 * Le texte vient de content/ (profile.json, ui.json, products/, ventures/,
 * workbench.json, experience/, moons.json) : un ajout y entre seul dans la
 * scène, l'index et le repli.
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

const two = (n: number) => String(n).padStart(2, "0");

export default function AstresPage() {
  const { products, ventures, workbench, experience, earlier, moons, profile, ui } = getContent();
  const a = ui.astres;

  // identifiants de la scène : le slug pour un produit, préfixé par la famille ailleurs (deux familles peuvent partager un slug)
  const ventureId = (slug: string) => `venture-${slug}`;
  const productSlugs = new Set(products.map((p) => p.slug));
  const nameOf = new Map<string, string>([...products, ...ventures].map((x) => [x.slug, x.name]));

  const entries: AstresEntry[] = [
    ...products.map(
      (p): AstresEntry => ({
        id: p.slug,
        kind: "product",
        n: two(p.index),
        name: p.name,
        head: `${ui.products.sheet} ${two(p.index)}`,
        mark: p.status === "live" ? "led" : p.status === "in-test" ? "ring" : "square",
        statusText: p.statusLabel ?? ui.products.status[p.status],
        lead: p.oneLiner,
        proof: p.proof[0],
        links: p.links,
        page: `/products/${p.slug}`,
      }),
    ),
    ...ventures.map(
      (v): AstresEntry => ({
        id: ventureId(v.slug),
        kind: "venture",
        n: "",
        name: v.name,
        head: `${ui.founder.venture} ${v.index}`,
        mark: v.status === "closed" ? "ring" : null,
        statusText: v.statusLabel ?? ui.founder.status[v.status],
        state: v.status === "closed" ? "closed" : undefined,
        lead: v.story,
        links: v.links ?? [],
        page: "/#founder",
      }),
    ),
    ...workbench.items.map(
      (t): AstresEntry => ({
        id: `tool-${t.slug}`,
        kind: "tool",
        n: t.ref,
        name: t.name,
        head: `${ui.workbench.toolSheet} ${t.ref}`,
        mark: null,
        lead: t.line,
        more: t.howItWorks ? [t.howItWorks] : [],
        links: [],
        page: `/workbench/${t.slug}`,
      }),
    ),
    // expériences : de la plus ancienne (anneau intérieur) à la plus récente, Earlier comprises
    ...[...experience, ...earlier]
      .sort((x, y) => x.period.start.localeCompare(y.period.start))
      .map(
        (e): AstresEntry => ({
          id: `exp-${e.slug}`,
          kind: "exp",
          n: "",
          name: e.company,
          head: ui.sections.experience,
          mark: e.status === "current" ? "led" : e.status === "upcoming" ? "ring" : null,
          statusText: e.statusLabel ?? ui.experience.status[e.status],
          state: e.status === "upcoming" ? "future" : undefined,
          meta: `${period(e, ui.experience)} · ${e.role}`,
          lead: e.summary,
          links: [],
          page: "/#experience",
        }),
      ),
    ...moons.map(
      (m): AstresEntry => ({
        id: `moon-${m.slug}`,
        kind: "moon",
        n: "",
        name: m.name,
        parent: productSlugs.has(m.parent) ? m.parent : ventureId(m.parent),
        head: fill(a.moonOf, { name: nameOf.get(m.parent) ?? "" }),
        mark: null,
        lead: m.text,
        links: [],
        page: m.href,
      }),
    ),
  ];

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
    close: ui.products.close,
    families: { venture: ui.sections.founder, tool: ui.sections.workbench, exp: ui.sections.experience, moon: a.moons },
  };
  return <AstresApp entries={entries} labels={labels} name={profile.name} contact={profile.contact.primary} />;
}

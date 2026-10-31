import fs from "node:fs";
import path from "node:path";

/**
 * Lecture du contenu (dossier content/), au build uniquement.
 *
 * Règles appliquées ici, une seule fois, pour que les composants n'aient
 * rien à décider :
 * - `publishAfter` est filtré AVANT toute numérotation : une entrée masquée
 *   n'existe pas, les index (onglets, cases Now 05.n, « 1 / n ») se
 *   recalculent sans trou. Un rebuild à la date suffit, rien côté client.
 * - Une expérience `past` sans highlight chiffré passe en « Earlier ».
 * - `origin.untilPublished` remplace l'entreprise et la mention légale d'un
 *   produit tant que `origin.publishAfter` n'est pas atteint (Sirocco).
 *
 * Deux variables servent aux tests de composition :
 * - CONTENT_DATE=2026-11-02 simule la date de lecture ;
 * - CONTENT_DIR=chemin/vers/fixtures lit un autre dossier de contenu.
 *
 * Exemple : CONTENT_DATE=2026-11-02 npm run build
 */

/* ---------- Types du contenu brut ---------- */

export type Image = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  credit?: string;
  kind?: "photo" | "capture";
};

export type Link = { label: string; href: string };

type Dated = { publishAfter?: string };

export type Role = Dated & { title: string; org: string; from?: string };
export type Counter = { value: string; label: string };
export type NowLine = Dated & { text: string };

export type Profile = {
  name: string;
  roles: Role[];
  tagline: string;
  counters: Counter[];
  availability: string;
  founderLine: string;
  bio: string[];
  bioLink?: Link & { text: string };
  productsIntro?: string;
  now: NowLine[];
  specs: [string, string][];
  contact: {
    primary: Link;
    secondary?: Link;
    links: Link[];
  };
  explore3d: Link;
};

/** `metricLabel` : libellé du chiffre quand `metric` n'est qu'un chiffre (« 7 h → 10 min »). */
export type Highlight = { title: string; metric?: string; metricLabel?: string; text: string };

export type ExperienceRaw = Dated & {
  slug: string;
  order: number;
  status: "current" | "past" | "upcoming";
  statusLabel?: string;
  company: string;
  url?: string;
  role: string;
  period: { start: string; end: string | null };
  context: string;
  summary: string;
  highlights: Highlight[];
  recognition?: string;
};

export type Origin = {
  builtToGetHired: boolean;
  company?: string;
  role?: string;
  outcome?: string;
  publishAfter?: string;
  untilPublished?: { company?: string; disclaimer?: string };
};

/** Chiffre en grand (carte, fiche, page) et son libellé. */
export type Figure = { value: string; label: string };

/**
 * Étude de cas d'un produit (partie 04 de la page projet), en blocs :
 * texte, choix écartés et retenus, captures. Un bloc peut porter son
 * `publishAfter` (filtré à la lecture, comme le reste).
 */
export type CaseBlock = Dated &
  (
    | { kind: "text"; title?: string; paragraphs: string[] }
    | { kind: "choices"; title?: string; items: { verdict: string; kept?: boolean; name: string; text: string }[] }
    | { kind: "figures"; title?: string; images: Image[] }
  );
export type CaseStudy = { blocks: CaseBlock[] };

export type ProductRaw = Dated & {
  slug: string;
  order: number;
  status: "live" | "in-test" | "archived";
  statusLabel?: string;
  statusNote?: string;
  year: string;
  name: string;
  oneLiner: string;
  /** Note manuscrite posée sous le titre (« built in a weekend »). */
  note?: string;
  origin: Origin;
  disclaimer?: string;
  problem: string;
  /** Deux bouts de `problem`, copiés mot pour mot : la note « what breaks » de l'appareil quand ce produit est choisi. */
  problemExcerpt?: [string, string];
  built: string[];
  proof: string[];
  /** Chiffres en grand de la preuve. */
  figures?: Figure[];
  /** Index des lignes de `proof` que les chiffres disent déjà : pas répétées sous eux. */
  proofInFigures?: number[];
  /** Ligne de preuve de la carte de la home ; absente, la carte n'en montre pas. */
  cardProof?: string;
  /** Fin de phrase soulignée au feutre partout où elle apparaît. */
  proofUnderline?: string;
  stack: string[];
  links: Link[];
  images?: Image[];
  /** Légende de l'éventail de la home quand il y a plusieurs captures (« Fig. n · … ») ; absente, le nom du produit. */
  imagesCaption?: string;
  caseStudy?: CaseStudy;
};

export type VentureRaw = Dated & {
  slug: string;
  order: number;
  status: "closed" | "explored";
  statusLabel?: string;
  year?: string;
  name: string;
  role?: string;
  period?: { start: string; end: string | null };
  story: string;
  wentAsFar?: string;
  learned?: string;
  metrics?: string[];
  lessons?: string[];
  /** Phrase de décision, soulignée au feutre braise là où elle paraît dans les leçons. */
  decision?: string;
  links?: Link[];
  images?: Image[];
};

export type ToolRaw = Dated & {
  slug: string;
  name: string;
  line: string;
  howItWorks?: string;
  stack?: string[];
  image?: Image;
};

/* ---------- Types dérivés (ce que lisent les composants) ---------- */

export type Experience = ExperienceRaw & {
  /** Rang parmi les entrées principales (01, 02…), null pour Earlier. */
  index: number | null;
  isEarlier: boolean;
  /** Premier highlight chiffré : le chiffre géant du panneau. */
  keyFigure: (Highlight & { n: number }) | null;
  /** Autres highlights chiffrés, avec leur numéro de réalisation (1-based). */
  figures: (Highlight & { n: number })[];
};

export type Product = ProductRaw & {
  index: number;
  total: number;
  /** Entreprise affichée sur le tampon, après la règle de date. */
  stampCompany?: string;
};

export type Venture = VentureRaw & { index: number; total: number };
export type Tool = ToolRaw & { index: number; total: number; ref: string };

export type Content = {
  date: string;
  profile: Profile;
  experience: Experience[];
  earlier: Experience[];
  products: Product[];
  ventures: Venture[];
  workbench: { title: string; intro: string; items: Tool[] };
  ui: Ui;
  /** Numéros « Fig. » en une seule suite du haut au bas de la page (décidé le 30/10). */
  figures: Figures;
};

/**
 * Fig. 1 : le dessin de l'en-tête. Puis une figure par produit (Fig. 2 à n+1),
 * puis les images de Founder (toutes celles de la première venture, une pour
 * les suivantes, comme les affiche l'escalier), puis la vue éclatée du pied.
 */
export type Figures = { products: number; founder: number; exploded: number };

function buildFigures(products: Product[], ventures: Venture[]): Figures {
  const founderCount = ventures.reduce(
    (n, v) => n + (v.index === 1 ? (v.images?.length ?? 0) : Math.min(v.images?.length ?? 0, 1)),
    0,
  );
  const founder = products.length + 2;
  return { products: 2, founder, exploded: founder + founderCount };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ui = Record<string, any>;

/* ---------- Lecture ---------- */

const ROOT = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");

/** Date de lecture au format AAAA-MM-JJ, heure de Paris. */
export function contentDate(): string {
  if (process.env.CONTENT_DATE) return process.env.CONTENT_DATE;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isPublished(item: Dated, date = contentDate()): boolean {
  return !item.publishAfter || item.publishAfter <= date;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")) as T;
}

function readDir<T extends { order: number }>(dir: string): T[] {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<T>(path.join(dir, f)))
    .sort((a, b) => a.order - b.order);
}

function buildExperience(raw: ExperienceRaw[]) {
  const main: Experience[] = [];
  const earlier: Experience[] = [];
  for (const e of raw) {
    const numbered = e.highlights
      .map((h, i) => ({ ...h, n: i + 1 }))
      .filter((h) => Boolean(h.metric));
    const isEarlier = e.status === "past" && numbered.length === 0;
    const entry: Experience = {
      ...e,
      index: null,
      isEarlier,
      keyFigure: numbered[0] ?? null,
      figures: numbered.slice(1),
    };
    (isEarlier ? earlier : main).push(entry);
  }
  main.forEach((e, i) => (e.index = i + 1));
  return { main, earlier };
}

function buildProducts(raw: ProductRaw[], date: string): Product[] {
  const list = raw.filter((p) => isPublished(p, date));
  // L'extrait remplace une annotation au feutre : il doit exister tel quel dans `problem`.
  for (const p of list) {
    const off = p.problemExcerpt?.find((l) => !p.problem.includes(l));
    if (off) throw new Error(`products/${p.slug}.json : problemExcerpt « ${off} » absent de problem`);
  }
  return list.map((p, i) => {
    const o = p.origin;
    const masked = o.publishAfter && o.publishAfter > date ? o.untilPublished : undefined;
    return {
      ...p,
      index: i + 1,
      total: list.length,
      stampCompany: masked?.company ?? o.company,
      disclaimer: masked?.disclaimer ?? p.disclaimer,
      caseStudy: p.caseStudy
        ? { blocks: p.caseStudy.blocks.filter((b) => isPublished(b, date)) }
        : undefined,
    };
  });
}

let cache: Content | null = null;

export function getContent(): Content {
  if (cache) return cache;
  const date = contentDate();

  const rawProfile = readJson<Profile>("profile.json");
  const profile: Profile = {
    ...rawProfile,
    roles: rawProfile.roles.filter((r) => isPublished(r, date)),
    now: rawProfile.now.filter((n) => isPublished(n, date)),
  };

  const exp = buildExperience(
    readDir<ExperienceRaw>("experience").filter((e) => isPublished(e, date)),
  );

  const products = buildProducts(readDir<ProductRaw>("products"), date);

  const venturesRaw = readDir<VentureRaw>("ventures").filter((v) => isPublished(v, date));
  const ventures = venturesRaw.map((v, i) => ({ ...v, index: i + 1, total: venturesRaw.length }));

  const wbRaw = readJson<{ title: string; intro: string; items: ToolRaw[] }>("workbench.json");
  const tools = wbRaw.items.filter((t) => isPublished(t, date));
  const workbench = {
    ...wbRaw,
    items: tools.map((t, i) => ({ ...t, index: i + 1, total: tools.length, ref: `04.${i + 1}` })),
  };

  const ui = readJson<Ui>("ui.json");

  cache = {
    date,
    profile,
    experience: exp.main,
    earlier: exp.earlier,
    products,
    ventures,
    workbench,
    ui,
    figures: buildFigures(products, ventures),
  };
  return cache;
}

export function getProduct(slug: string) {
  const { products } = getContent();
  const i = products.findIndex((p) => p.slug === slug);
  if (i < 0) return null;
  const n = products.length;
  return { product: products[i], prev: products[(i - 1 + n) % n], next: products[(i + 1) % n] };
}

export function getTool(slug: string) {
  const { workbench } = getContent();
  const items = workbench.items;
  const i = items.findIndex((t) => t.slug === slug);
  if (i < 0) return null;
  const n = items.length;
  return { tool: items[i], prev: items[(i - 1 + n) % n], next: items[(i + 1) % n] };
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { AstresScene } from "./createAstresScene";
import {
  KEY_ARRIVAL,
  KEY_FROM,
  RENDER_DARK,
  read,
  reducedMotion,
  sceneMode,
  store,
  type SceneMode,
} from "./pass";

/**
 * /astres : l'interface autour de la scène (plateau Assemblage-Astres-3).
 *
 * Toujours sombre. Barre fixe (« ← Back to the page », Échap ; le nom ;
 * « Write to me »), une phrase, puis l'index numéroté des produits : un seul
 * clic voyage jusqu'à la planète et ouvre la fiche.
 *
 * Modes : « boot » (rendu serveur, identique au repli), « scene » (WebGL),
 * « weak » (appareil faible ou économie de données : 3D à la demande),
 * « nogl » (pas de WebGL, ou scène qui ne démarre pas en 8 s). Hors scène,
 * le rendu 3D mat est l'image et l'index renvoie aux fiches produit.
 */

export type AstresProduct = {
  slug: string;
  n: string;
  name: string;
  status: "live" | "in-test" | "archived";
  statusText: string;
  oneLiner: string;
  proof?: string;
  links: { label: string; href: string }[];
};

export type AstresLabels = {
  back: string;
  backHint: string;
  keyHint: string;
  intro: string;
  howLg: string;
  howSm: string;
  index: string;
  still: string;
  noGl: string;
  noGlHow: string;
  weakTitle: string;
  weakNote: string;
  weakHow: string;
  load: string;
  loading: string;
  renderAlt: string;
  readOnPage: string;
  sheet: string;
  close: string;
};

type Mode = "boot" | SceneMode;

const sheetHref = (slug: string) => `/products/${slug}`;

function StatusMark({ status }: { status: AstresProduct["status"] }) {
  const cls = status === "live" ? "td-blink as-a-led" : status === "in-test" ? "as-a-ring" : "as-a-sq";
  return <span aria-hidden="true" className={cls} />;
}

export default function AstresApp({
  products,
  labels,
  name,
  contact,
}: {
  products: AstresProduct[];
  labels: AstresLabels;
  name: string;
  contact: { label: string; href: string };
}) {
  const router = useRouter();
  const glRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AstresScene | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement | null>());
  const sheetTitle = useRef<HTMLHeadingElement>(null);

  const [mode, setMode] = useState<Mode>("boot");
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [arrival, setArrival] = useState(false);

  // Mode de l'appareil, et arrivée par le calque (départ il y a moins de 4 s)
  useEffect(() => {
    setMode(sceneMode());
    const t = Number(read(KEY_ARRIVAL));
    store(KEY_ARRIVAL, null);
    if (t && Date.now() - t < 4000 && !reducedMotion()) setArrival(true);
  }, []);

  /* ---- retour vers la page ---- */
  const goBack = useCallback(() => {
    // arrivé par la home : l'historique y revient, et le calque (AstresTransition)
    // rejoue le passage à l'envers, comme pour le bouton précédent du navigateur
    if (read(KEY_FROM) && window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  /* ---- voyage et fiche ---- */
  const open = useCallback(
    (slug: string, focusSheet: boolean) => {
      setActive(slug);
      sceneRef.current?.focusBody(slug);
      track("astres_travel", { slug });
      if (focusSheet) window.setTimeout(() => sheetTitle.current?.focus(), 0);
    },
    [],
  );

  const close = useCallback(() => {
    setActive((cur) => {
      if (cur) window.setTimeout(() => itemRefs.current.get(cur)?.focus(), 0);
      return null;
    });
  }, []);

  /* ---- la scène (module chargé à la demande) ---- */
  useEffect(() => {
    if (mode !== "scene" || !glRef.current) return;
    const mount = glRef.current;
    let handle: AstresScene | null = null;
    let cancelled = false;
    let isReady = false;
    const slowTimer = window.setTimeout(() => setSlow(true), 1500);
    const failTimer = window.setTimeout(() => {
      if (!isReady) setMode("nogl");
    }, 8000);

    import("./createAstresScene").then(({ createAstresScene, SUN_ID }) => {
      if (cancelled) return;
      handle = createAstresScene(mount, {
        reducedMotion: reducedMotion(),
        timeScale: 10,
        items: products.map((p) => ({ slug: p.slug, n: p.n, name: p.name })),
        intro: arrival,
        onReady: () => {
          isReady = true;
          setReady(true);
          setSlow(false);
        },
      });
      if (!handle) {
        setMode("nogl");
        return;
      }
      sceneRef.current = handle;
      handle.setOnBodyClick((id) => {
        if (id === SUN_ID) setActive(null);
        else open(id, false);
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(failTimer);
      sceneRef.current = null;
      handle?.destroy();
    };
    // la scène se monte une fois par passage en mode « scene »
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Fiche fermée : la caméra revient sur le soleil
  useEffect(() => {
    if (active === null && sceneRef.current) {
      import("./createAstresScene").then(({ SUN_ID }) => sceneRef.current?.focusBody(SUN_ID));
    }
  }, [active]);

  // Fiche ouverte : la scène se recentre dans la partie que la fiche laisse visible.
  // Fiche fermée sur ordinateur : le soleil glisse à droite de la phrase, comme le
  // rendu de la maquette, pour que la phrase et l'index restent lisibles.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".as-a-sheet");
    const r = el?.getBoundingClientRect();
    const phone = window.innerWidth <= 760;
    const lede = document.querySelector<HTMLElement>(".as-a-h")?.getBoundingClientRect();
    const right = r ? (phone ? 0 : r.width) : !phone && lede ? -0.6 * lede.right : 0;
    sceneRef.current?.setInset(right, r && phone ? r.height : 0);
  }, [active, ready]);

  /* ---- Échap : ferme la fiche, sinon revient à la page ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (active) close();
      else goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, goBack]);

  const scene = mode === "scene";
  const sheet = scene ? products.find((p) => p.slug === active) : undefined;
  const modeClass = mode === "boot" ? "scene" : mode;

  const index = (
    <ol className="as-a-idx" aria-label={labels.index}>
      {products.map((p) => {
        const inner = (
          <>
            <span className="as-a-n">{p.n}</span>
            <span className="as-a-nm">{p.name}</span>
            <span className="as-a-st">{p.statusText}</span>
          </>
        );
        return (
          <li key={p.slug}>
            {scene ? (
              <button
                ref={(el) => {
                  itemRefs.current.set(p.slug, el);
                }}
                className="as-a-it"
                type="button"
                aria-current={active === p.slug ? "true" : undefined}
                onClick={() => open(p.slug, true)}
              >
                {inner}
              </button>
            ) : (
              <a className="as-a-it" href={sheetHref(p.slug)}>
                {inner}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={`as-a as-m-${modeClass}${arrival ? " is-arrival" : ""}`} data-theme="dark">
      <div className="as-a-scene" aria-hidden={scene ? true : undefined}>
        <img
          className="as-a-render"
          src={RENDER_DARK}
          alt={scene ? "" : labels.renderAlt}
          width={1600}
          height={1195}
        />
        {scene && <div ref={glRef} className={`as-a-gl${ready ? " is-ready" : ""}`} />}
      </div>

      <header className="as-a-bar">
        <Link
          className="as-a-back"
          href="/"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            goBack();
          }}
        >
          <span className="as-a-bl">← {labels.back}</span>
          <span className="as-a-hint td-hidesm" aria-hidden="true">
            {labels.backHint}
          </span>
        </Link>
        <Link className="as-a-name td-hidesm" href="/">
          {name}
        </Link>
        <a className="td-key td-key-primary as-a-key" href={contact.href}>
          <span>{contact.label}</span>
          <span className="as-a-hint td-hidesm" aria-hidden="true">
            {labels.keyHint}
          </span>
        </a>
      </header>

      <section className="as-a-intro" aria-labelledby="as-h">
        {mode === "nogl" ? (
          <>
            <p className="as-a-lab">{labels.still}</p>
            <h1 className="as-a-h" id="as-h">
              {labels.noGl}
            </h1>
            <p className="as-a-how">{labels.noGlHow}</p>
          </>
        ) : mode === "weak" ? (
          <>
            <p className="as-a-lab">{labels.still}</p>
            <h1 className="as-a-h" id="as-h">
              {labels.weakTitle}
            </h1>
            <p className="as-a-how">{labels.weakNote}</p>
            <div className="as-a-keys">
              <button className="td-key td-key-secondary" type="button" onClick={() => setMode("scene")}>
                {labels.load}
              </button>
            </div>
            <p className="as-a-how">{labels.weakHow}</p>
          </>
        ) : (
          <>
            <h1 className="as-a-h" id="as-h">
              {labels.intro}
            </h1>
            <p className="as-a-how">
              <span className="td-hidesm">{labels.howLg}</span>
              <span className="td-hidelg">{labels.howSm}</span>
            </p>
          </>
        )}
        {index}
      </section>

      {scene && slow && !ready && (
        <p className="as-a-load" role="status">
          <span className="as-a-rec td-blink" aria-hidden="true" />
          {labels.loading}
        </p>
      )}

      {sheet && (
        <aside className="as-a-sheet" aria-labelledby="as-sh">
          <div className="as-a-shh">
            <span>
              {labels.sheet} {sheet.n}
            </span>
            <span className="as-a-live">
              <StatusMark status={sheet.status} />
              {sheet.statusText}
            </span>
            <button className="as-a-close" type="button" onClick={close}>
              {labels.close}{" "}
              <span className="as-a-hint td-hidesm" aria-hidden="true">
                {labels.backHint}
              </span>
            </button>
          </div>
          <h2 className="as-a-sht" id="as-sh" ref={sheetTitle} tabIndex={-1}>
            {sheet.name}
          </h2>
          <p className="as-a-shp">{sheet.oneLiner}</p>
          {sheet.proof && <p className="as-a-proof">{sheet.proof}</p>}
          <ul className="as-a-links">
            {sheet.links.map((l) => (
              <li key={l.href}>
                <a className="td-link" href={l.href}>
                  {l.label} <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
            <li>
              <Link className="td-link" href={sheetHref(sheet.slug)}>
                {labels.readOnPage}
              </Link>
            </li>
          </ul>
        </aside>
      )}
    </div>
  );
}

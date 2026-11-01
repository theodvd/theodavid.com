"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@vercel/analytics";
import type { AstresKind, AstresScene } from "./createAstresScene";
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
 * /astres : l'interface autour de la scène (interface U3, décision du 01/11/2026).
 *
 * Toujours sombre. Barre fixe (« ← Back to the page », Échap ; le nom ;
 * « Write to me »). Un cartouche sur le calque quadrillé porte la phrase et
 * l'index groupé : les produits numérotés, puis une ligne par famille sous
 * les titres de la nav (Founder, Workbench, Experience) et les lunes. Dans la
 * scène, chaque corps porte son étiquette mono accrochée par un trait de
 * rappel. Un clic (index, étiquette ou corps) voyage et ouvre la fiche ;
 * l'objet d'arrivée se centre dans la partie libre (à gauche de la fiche,
 * au-dessus du cartouche).
 *
 * Modes : « boot » (rendu serveur, identique au repli), « scene » (WebGL),
 * « weak » (appareil faible ou économie de données : 3D à la demande),
 * « nogl » (pas de WebGL, ou scène qui ne démarre pas en 8 s). Hors scène,
 * le rendu 3D mat est l'image et l'index renvoie aux pages.
 */

/** Un corps de la scène et ce que sa fiche affiche (construit par app/astres/page.tsx depuis content/). */
export type AstresEntry = {
  id: string;
  kind: AstresKind;
  /** Numéro affiché : « 01 » pour un produit, « 04.1 » pour un outil, vide sinon. */
  n: string;
  name: string;
  /** Lune : identifiant du corps autour duquel elle tourne. */
  parent?: string;
  state?: "closed" | "future";
  /** Tête de la fiche : « Product sheet 01 », « Venture 3 », « Moon of Solvio »… */
  head: string;
  mark: "led" | "ring" | "square" | null;
  statusText?: string;
  /** Ligne mono au-dessus de la phrase (période et poste d'une expérience). */
  meta?: string;
  lead: string;
  more?: string[];
  proof?: string;
  links: { label: string; href: string }[];
  /** Où lire l'entrée sur le site : « Read it on the page », et lien du repli. */
  page: string;
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
  close: string;
  /** Titre de chaque ligne de l'index groupé. */
  families: Record<Exclude<AstresKind, "product">, string>;
};

type Mode = "boot" | SceneMode;

const FAMILIES = ["venture", "tool", "exp", "moon"] as const;

function StatusMark({ mark }: { mark: AstresEntry["mark"] }) {
  if (!mark) return null;
  const cls = mark === "led" ? "td-blink as-a-led" : mark === "ring" ? "as-a-ring" : "as-a-sq";
  return <span aria-hidden="true" className={cls} />;
}

export default function AstresApp({
  entries,
  labels,
  name,
  contact,
}: {
  entries: AstresEntry[];
  labels: AstresLabels;
  name: string;
  contact: { label: string; href: string };
}) {
  const router = useRouter();
  const glRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AstresScene | null>(null);
  const sunId = useRef("sun");
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
  const open = useCallback((id: string, focusSheet: boolean) => {
    setActive(id);
    sceneRef.current?.focusBody(id);
    track("astres_travel", { slug: id });
    if (focusSheet) window.setTimeout(() => sheetTitle.current?.focus(), 0);
  }, []);

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
      sunId.current = SUN_ID;
      handle = createAstresScene(mount, {
        reducedMotion: reducedMotion(),
        timeScale: 10,
        items: entries.map((e) => ({ slug: e.id, kind: e.kind, parent: e.parent, state: e.state })),
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
      setReady(false);
      handle?.destroy();
    };
    // la scène se monte une fois par passage en mode « scene »
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Fiche fermée : la caméra revient sur le soleil
  useEffect(() => {
    if (active === null) sceneRef.current?.focusBody(sunId.current);
  }, [active]);

  // Partie libre : sous la barre, à gauche de la fiche et au-dessus du
  // cartouche (au téléphone, au-dessus de la fiche ou du cartouche). Fiche
  // fermée sur ordinateur : le soleil glisse à droite de la phrase, pour que
  // la phrase et l'index restent lisibles.
  useEffect(() => {
    const place = () => {
      const rect = (sel: string) => document.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
      const sheet = rect(".as-a-sheet");
      const card = rect(".as-a-intro");
      const lede = rect(".as-a-h");
      const top = rect(".as-a-bar")?.bottom ?? 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const phone = w <= 760;
      if (!phone && !sheet) {
        sceneRef.current?.setInset(lede ? -0.6 * lede.right : 0, 0);
        return;
      }
      // le centre de l'image va au milieu du rectangle libre : décalages à droite et en bas
      const right = sheet && !phone ? sheet.left : w;
      const bottom = (phone ? (sheet ?? card)?.top : card?.top) ?? h;
      sceneRef.current?.setInset(w - right, h - top - bottom);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
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
  const sheet = scene ? entries.find((e) => e.id === active) : undefined;
  const modeClass = mode === "boot" ? "scene" : mode;
  const products = entries.filter((e) => e.kind === "product");

  // une entrée de l'index : bouton qui voyage dans la scène, sinon lien vers la page
  const item = (e: AstresEntry, className: string, children: ReactNode) =>
    scene ? (
      <button
        ref={(el) => {
          itemRefs.current.set(e.id, el);
        }}
        className={className}
        type="button"
        aria-current={active === e.id ? "true" : undefined}
        onClick={() => open(e.id, true)}
      >
        {children}
      </button>
    ) : (
      <a className={className} href={e.page}>
        {children}
      </a>
    );

  const index = (
    <>
      <ol className="as-a-idx" aria-label={labels.index}>
        {products.map((p) => (
          <li key={p.id}>
            {item(
              p,
              "as-a-it",
              <>
                <span className="as-a-n">{p.n}</span>
                <span className="as-a-nm">{p.name}</span>
                <span className="as-a-st">{p.statusText}</span>
              </>,
            )}
          </li>
        ))}
      </ol>
      <div className="as-a-fams">
        {FAMILIES.map((k) => {
          const list = entries.filter((e) => e.kind === k);
          if (!list.length) return null;
          return (
            <div className="as-a-fam" key={k} role="group" aria-labelledby={`as-f-${k}`}>
              <p className="as-a-famh" id={`as-f-${k}`}>
                {labels.families[k]}
              </p>
              <p className="as-a-famv">
                {list.map((e, i) => (
                  <Fragment key={e.id}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {item(e, "as-a-fi", e.name)}
                  </Fragment>
                ))}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );

  // étiquettes : le soleil et chaque corps, sauf les anneaux des expériences (nommés par l'index)
  const marked = ready
    ? [{ id: sunId.current, kind: "sun", n: "", name, state: undefined }, ...entries.filter((e) => e.kind !== "exp")]
    : [];

  return (
    <div className={`as-a as-m-${modeClass}${arrival ? " is-arrival" : ""}`} data-theme="dark">
      <div className="as-a-scene" aria-hidden={scene ? true : undefined}>
        <img className="as-a-render" src={RENDER_DARK} alt={scene ? "" : labels.renderAlt} width={1600} height={1195} />
        {scene && <div ref={glRef} className={`as-a-gl${ready ? " is-ready" : ""}`} />}
        {scene && (
          <div className="as-l-layer">
            {marked.map((e) => (
              <div
                key={e.id}
                className={`as-l as-l-${e.kind}${e.state ? ` is-${e.state}` : ""}`}
                ref={(el) => sceneRef.current?.registerMarkerEl(e.id, el)}
              >
                <i />
                <span className="as-l-box" data-box="" onClick={() => (e.kind === "sun" ? setActive(null) : open(e.id, false))}>
                  <span className="as-l-g" />
                  <span className="as-l-t">
                    {e.kind === "product" && <b>{e.n}</b>}
                    {e.name}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
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
            <span>{sheet.head}</span>
            {sheet.statusText && (
              <span className="as-a-live">
                <StatusMark mark={sheet.mark} />
                {sheet.statusText}
              </span>
            )}
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
          {sheet.meta && <p className="as-a-meta">{sheet.meta}</p>}
          <p className="as-a-shp">{sheet.lead}</p>
          {sheet.more?.map((t) => (
            <p className="as-a-more" key={t}>
              {t}
            </p>
          ))}
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
              <Link className="td-link" href={sheet.page}>
                {labels.readOnPage}
              </Link>
            </li>
          </ul>
        </aside>
      )}
    </div>
  );
}

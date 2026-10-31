"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WearFilter } from "./Marks";

/**
 * Enveloppe « surimpression » d'une fiche (produit ou outil), ouverte depuis la
 * home par les routes interceptées app/@modal/(.)products et (.)workbench.
 *
 * - Ouvrir est un push (fait par le lien de la carte) : Retour ferme et rend la
 *   home à sa position. Previous / Next font un replace (liens de la fiche).
 * - Close, Échap et clic sur le voile : router.back(), ou `fallback`
 *   (/#products, /#workbench) s'il n'y a pas d'historique.
 * - Focus piégé dans la fiche (le reste de la page passe en `inert`), puis rendu
 *   à ce qui l'a ouverte (SHIP de l'en-tête par exemple), sinon au lien de la
 *   fiche d'origine ; page bloquée dessous ; flèches gauche et
 *   droite pour la fiche précédente et suivante.
 * - Téléphone : glisser la feuille vers le bas la ferme.
 *
 * Exemple : <SheetDialog layer="v7-layer" sheet=".v7-sheet" labelledBy="t-sirocco"
 *   title="Sirocco · … · Théo David" self="/products/sirocco" prev="/products/fact-checker" next="/products/target"
 *   fallback="/#products">…</SheetDialog>
 */

const SheetCtx = createContext<{ close: () => void }>({ close: () => {} });

/** Lien de la carte ou du tiroir d'où la surimpression a été ouverte (gardé à travers Previous / Next). */
let origin: string | null = null;
/** Élément qui avait le focus à l'ouverture (bouton SHIP, carte), rendu à la fermeture s'il est encore là. */
let opener: HTMLElement | null = null;
/** Titre de l'onglet avant l'ouverture, rendu à la fermeture. */
let pageTitle = "";

export default function SheetDialog({
  layer,
  sheet,
  labelledBy,
  title,
  self,
  prev,
  next,
  fallback,
  children,
}: {
  layer: string;
  sheet: string;
  labelledBy: string;
  /** Titre d'onglet de la fiche (le même que sa page directe). */
  title: string;
  self: string;
  prev: string;
  next: string;
  fallback: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [needWear, setNeedWear] = useState(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (window.history.length > 1) router.back();
    else router.push(fallback, { scroll: false });
  }, [router, fallback]);

  const go = useCallback((href: string) => router.replace(href, { scroll: false }), [router]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (origin === null) {
      origin = self;
      const a = document.activeElement;
      opener = a instanceof HTMLElement && a !== document.body ? a : null;
      pageTitle = document.title;
    }
    // Next ne pose pas les métadonnées d'un emplacement parallèle : la fiche nomme l'onglet elle-même.
    document.title = title;
    // Le filtre d'usure du tampon vit dans la section Products ; ailleurs (/astres), la fiche le déclare.
    setNeedWear(!document.getElementById("td-wear"));

    // Page bloquée dessous, et hors d'atteinte du clavier et des lecteurs d'écran.
    const html = document.documentElement;
    html.classList.add("td-sheet-open");
    const host = Array.from(document.body.children).find((n) => n.contains(el));
    const muted = Array.from(document.body.children).filter(
      (n): n is HTMLElement => n !== host && n instanceof HTMLElement && !n.inert,
    );
    muted.forEach((n) => (n.inert = true));

    (el.querySelector<HTMLElement>("[data-sheet-close]") ?? el).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(prev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(next);
      } else if (e.key === "Tab") {
        // Piège de focus : de la dernière commande on revient à la première, et inversement.
        const f = Array.from(
          el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'),
        ).filter((n) => n.offsetParent !== null || n === document.activeElement);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Glisser vers le bas ferme la feuille (seulement quand elle est en haut de sa course).
    const card = el.querySelector<HTMLElement>(sheet);
    let y0: number | null = null;
    let dy = 0;
    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0 || e.touches.length !== 1) return;
      y0 = e.touches[0].clientY;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (y0 === null || !card) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 || el.scrollTop > 0) {
        card.style.transform = "";
        return;
      }
      e.preventDefault();
      card.classList.add("is-drag");
      card.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (y0 === null || !card) return;
      y0 = null;
      card.classList.remove("is-drag");
      if (dy > 110) {
        close();
        return;
      }
      card.classList.add("is-back");
      card.style.transform = "";
      window.setTimeout(() => card.classList.remove("is-back"), 220);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);

    return () => {
      document.removeEventListener("keydown", onKey);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      muted.forEach((n) => (n.inert = false));
      html.classList.remove("td-sheet-open");
      // Previous / Next remontent une fiche aussitôt ; si rien ne remonte, la
      // surimpression est fermée : le focus revient au lien d'origine.
      window.setTimeout(() => {
        if (document.querySelector("[data-sheet-dialog]")) return;
        const back = origin;
        const by = opener;
        origin = null;
        opener = null;
        if (pageTitle) document.title = pageTitle;
        if (by?.isConnected) return by.focus({ preventScroll: true });
        if (!back) return;
        const link = document.querySelector<HTMLElement>(`main a[href="${back}"]`);
        link?.focus({ preventScroll: true });
      }, 60);
    };
  }, [self, prev, next, sheet, title, close, go]);

  return (
    <SheetCtx.Provider value={{ close }}>
      <div
        ref={ref}
        className={layer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-sheet-dialog=""
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {needWear && <WearFilter />}
        {children}
      </div>
    </SheetCtx.Provider>
  );
}

/** Bouton Close de la tête de fiche : ferme la surimpression comme Échap. */
export function CloseButton({
  className,
  label,
  text,
  hint,
  hintClass,
}: {
  className: string;
  label: string;
  text: string;
  hint: string;
  hintClass: string;
}) {
  const { close } = useContext(SheetCtx);
  return (
    <button type="button" className={className} aria-label={label} onClick={close} data-sheet-close="">
      <span>{text}</span>
      <span className={hintClass} aria-hidden="true">
        {hint}
      </span>
    </button>
  );
}

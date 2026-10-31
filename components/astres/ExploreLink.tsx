"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import {
  GO_EVENT,
  KEY_ARRIVAL,
  KEY_FROM,
  RENDER_DARK,
  entries,
  read,
  reducedMotion,
  sceneMode,
  store,
  type GoDetail,
} from "./pass";

/**
 * Entrée vers /astres (renvoi de l'en-tête, ligne du Menu, vue éclatée du pied).
 * Contrat stable pour les sections : href, className, children, aria-label.
 *
 * - Prefetch après 120 ms de survol, au focus, ou au doigt quand le lien
 *   entre à mi-écran, seulement sur un appareil capable (WebGL, deviceMemory
 *   4 ou plus, pas d'économie de données) : route, rendu 3D, module de la scène.
 * - Clic ou Entrée sans touche de modification : la transition chorégraphiée
 *   du calque (AstresTransition, dans le layout). Ctrl, Cmd ou clic milieu
 *   ouvrent un onglet sans animation ; sous mouvement réduit, coupure nette.
 * - Au retour, le lien d'origine reprend le focus.
 */
export default function ExploreLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | null>(null);
  const done = useRef(false);

  const prefetch = useCallback(() => {
    if (done.current || sceneMode() !== "scene") return;
    done.current = true;
    router.prefetch(href);
    new Image().src = RENDER_DARK;
    void import("./createAstresScene");
  }, [router, href]);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // retour depuis /astres : focus rendu au lien d'origine, position quittée
    const from = read(KEY_FROM);
    if (from) {
      const { i, y } = JSON.parse(from) as { i: number; y: number };
      if (entries(href).indexOf(el) === i) {
        store(KEY_FROM, null);
        if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
        el.focus({ preventScroll: true });
      }
    }
    // au doigt, pas de survol : préchargement quand le lien entre à mi-écran
    if (!window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          prefetch();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [href, prefetch]);

  useEffect(() => cancel, []);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    store(KEY_FROM, JSON.stringify({ i: entries(href).indexOf(el), y: window.scrollY }));
    if (reducedMotion()) {
      router.push(href);
      return;
    }
    const detail: GoDetail = { el, href };
    window.dispatchEvent(new CustomEvent(GO_EVENT, { detail }));
    if (!detail.handled) router.push(href);
    else store(KEY_ARRIVAL, String(Date.now()));
  };

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      prefetch={false}
      onClick={onClick}
      onPointerEnter={() => {
        cancel();
        timer.current = window.setTimeout(prefetch, 120);
      }}
      onPointerLeave={cancel}
      onFocus={prefetch}
      {...rest}
    >
      {children}
    </Link>
  );
}

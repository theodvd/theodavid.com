"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Adresse au bout de la barre collante (choix 6A du 31/10/2026, référence Akash Tyagi).
 * Elle n'apparaît qu'une fois l'en-tête (#top, qui a déjà ses touches) sorti de l'écran ;
 * un clic copie l'adresse et affiche « Copied » un instant. Sans JavaScript ou sans
 * presse-papiers, le lien reste un mailto ordinaire. Ordinateur seulement, à partir de 820 px (nav.css).
 *
 * Entre 820 et 1100 px, la barre n'a pas la place de l'adresse : « Email » la remplace (nav.css).
 *
 * Exemple : <BarMail href="mailto:hello@theodavid.com" hint="[ copy ]" copied="Copied" label="Copy the email address" short="Email" />
 */
export default function BarMail({ href, hint, copied, label, short }: { href: string; hint: string; copied: string; label: string; short: string }) {
  const address = href.replace(/^mailto:/, "");
  const [on, setOn] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    const top = document.getElementById("top");
    if (!top) return;
    const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(top);
    return () => {
      io.disconnect();
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !navigator.clipboard) return;
    e.preventDefault();
    navigator.clipboard.writeText(address).then(
      () => {
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1600);
      },
      () => (window.location.href = href),
    );
  };

  return (
    <div className={`hd-mail${on ? " is-on" : ""}`}>
      <a className="hd-ml" href={href} aria-label={`${label} ${address}`} onClick={copy}>
        <span className="hd-mla">{done ? copied : address}</span>
        <span className="hd-mla hd-mls" aria-hidden="true">
          {done ? copied : short}
        </span>
        {!done && (
          <span className="hd-mlk" aria-hidden="true">
            {hint}
          </span>
        )}
      </a>
      <span className="hd-sr" aria-live="polite">
        {done ? copied : ""}
      </span>
    </div>
  );
}

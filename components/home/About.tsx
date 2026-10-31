import { useId, type ReactNode } from "react";
import type { Content, Profile } from "@/lib/content";

/**
 * Bande À propos (préfixe ab-), premier enfant de main.pg : h2 mono dans le
 * rail de 240, premier paragraphe de `bio` en chapeau, les suivants en deux
 * colonnes sous un filet, règle graduée au bas (fin de la couverture).
 * `bioLink` devient un lien souligné au feutre encre là où son texte apparaît.
 */

function withLink(text: string, link: Profile["bioLink"]): ReactNode {
  if (!link || !text.includes(link.text)) return text;
  const at = text.indexOf(link.text);
  return (
    <>
      {text.slice(0, at)}
      <a className="ab-go" href={link.href}>
        {link.text}
      </a>
      {text.slice(at + link.text.length)}
    </>
  );
}

export default function About({ c }: { c: Content }) {
  const { profile: p, ui } = c;
  const id = `about-h${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [lead, ...more] = p.bio;

  return (
    <section className="ab" id="about" aria-labelledby={id}>
      <div className="ab-in" data-reveal="0.8">
        <h2 className="ab-lab" id={id}>
          {ui.sections.about}
        </h2>
        <div>
          <p className="ab-lead">{withLink(lead, p.bioLink)}</p>
          {more.length > 0 && (
            <div className="ab-cols">
              {more.map((t, i) => (
                <p key={i}>{withLink(t, p.bioLink)}</p>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="td-ruler ab-ruler" aria-hidden="true" />
    </section>
  );
}

import Link from "next/link";
import { getContent } from "@/lib/content";

/**
 * Page 404 dans l'identité : en-tête de section numéroté (code en ember-text),
 * titre en Archivo élargi, une ligne mono, la touche de retour, une règle
 * graduée. Styles dans app/styles/astres.css (préfixe nf-), texte dans
 * content/ui.json (clé notFound).
 */
export default function NotFound() {
  const { ui, profile } = getContent();
  const t = ui.notFound;
  return (
    <main className="nf">
      <header className="nf-head">
        <span className="nf-num">{t.code}</span>
        <span className="nf-lab">{t.label}</span>
      </header>
      <h1 className="nf-h">{t.title}</h1>
      <p className="nf-p">{t.text}</p>
      <div className="nf-keys">
        <Link className="td-key td-key-primary" href="/">
          ← {t.back}
        </Link>
      </div>
      <div className="td-ruler nf-ruler" aria-hidden="true" />
      <p className="nf-p">{profile.name}</p>
    </main>
  );
}

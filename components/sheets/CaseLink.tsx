"use client";

/**
 * Lien de la fiche en surimpression vers l'étude de cas de la page directe.
 * Dans la fiche, l'adresse est déjà /products/<slug> : un simple lien vers
 * /products/<slug>#case ne changerait que l'ancre et resterait dans la fiche.
 * On remplace donc l'entrée d'historique de la fiche par l'adresse de l'étude,
 * puis on recharge : la page complète s'ouvre sur l'étude, Retour ramène à la home.
 * Cmd ou Ctrl clic : nouvel onglet, comportement natif.
 *
 * Exemple : <CaseLink className="td-link" href="/products/sirocco#case">Read the case study</CaseLink>
 */
export default function CaseLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    history.scrollRestoration = "manual";
    history.replaceState(null, "", href);
    location.reload();
  };
  return (
    <a className={className} href={href} onClick={go}>
      {children}
    </a>
  );
}

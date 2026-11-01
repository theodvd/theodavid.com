# Contenu du portfolio

Source unique du texte du site : les pages lisent ces fichiers, jamais de texte en dur dans les composants. Un fichier par entrée, pour qu'un agent puisse proposer une modification ciblée (une PR = une entrée).

| Dossier ou fichier | Rôle |
|---|---|
| `profile.json` | En-tête, bio, « Now », contact |
| `experience/*.json` | Expérience en entreprise, triée par `order` |
| `products/*.json` | Produits construits, triés par `order` |
| `ventures/*.json` | Côté fondateur |
| `workbench.json` | Atelier : outils perso, une ligne chacun |
| `moons.json` | Lunes de /astres : petit projet accroché à un produit ou une venture (`parent`), une phrase, la page où le lire |

Champs communs :
- `publishAfter` (AAAA-MM-JJ) : l'entrée ou la ligne reste masquée avant cette date. Aucune entrée datée pour l’instant (Harmattan visible depuis le 30/10/2026).
- `status` : `current`, `past`, `upcoming` (expérience) ; `live`, `in-test`, `archived` (produits) ; `closed`, `explored` (ventures). `statusLabel` remplace le libellé par défaut.
- `origin.builtToGetHired` : affiche le badge « Built to get hired » avec `company` et `outcome`.
- `imagesCaption` (produits à plusieurs captures) : légende unique de l'éventail de la home, numérotée comme les autres (« Fig. 4 · Rayon, four branded versions ») ; absente, le nom du produit.

Règles de rédaction : anglais, aucun tiret cadratin, seulement des chiffres qui parlent à un lecteur extérieur (jamais un chiffre de vérification comme un nombre de tests ou d'exécutions).

import { useId } from "react";

/**
 * L'appareil de terrain au trait, repris tel quel du plateau d'assemblage
 * (Entete V6). Deux dessins : large (couche de notice, annotations au feutre)
 * et vertical (sous 760 px). Le corps de l'appareil est commun aux deux.
 * Identifiants de clipPath et de filtre propres à chaque instance (useId).
 * Groupes du plateau Assemblage-Astres, lus par le passage vers /astres
 * (app/styles/astres.css) : as-tech (notice), as-dev > as-xs (coque),
 * as-xp (plaque), as-xc (organes), as-side (bouton latéral), as-notes.
 * Les mots du dessin viennent de content/ui.json (header.drawing) ; le renvoi
 * OPEN TO CONVERSATIONS reprend profile.availability.
 * Points d'accroche des commandes (Commandes.tsx), sans effet au repos : hd-cap
 * (capuchon de SHIP), hd-read (nom du produit à l'écran, vide), hd-n-* (feutre :
 * cust, circle, breaks, btext, ship, stext, sketch).
 *
 * Exemple : <AppareilLarge labels={c.ui.header.drawing} callout="Open to conversations" />
 */

export type AppareilLabels = {
  aria: string;
  fig: string;
  dialLeft: string;
  dialRight: string;
  rec: string;
  ship: string;
  sticker: string;
  customers: string;
  product: string;
  breaks: [string, string];
  ship2: [string, string];
};

/* Familles de l'identité : les attributs font-family du plateau ne
   connaissent pas les noms générés par next/font. */
const F = {
  mono: { fontFamily: "var(--font-mono)" },
  display: { fontFamily: "var(--font-display)" },
  hand: { fontFamily: "var(--font-hand)" },
} as const;

const SVG_STYLE = { width: "100%", height: "auto", display: "block", overflow: "visible" } as const;

/** Suffixe d'identifiant sûr pour url(#…). */
function useGid(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

function Defs({ gid }: { gid: string }) {
  return (
    <defs><clipPath id={`${gid}-glass`}><rect x="296" y="314" width="208" height="98" rx="8" /></clipPath><filter id={`${gid}-glow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter></defs>
  );
}

/** Corps de l'appareil : antenne, molettes, écran et sa vague, SHIP, grille, LED, vis, étiquette. */
function Device({ gid, l }: { gid: string; l: AppareilLabels }) {
  return (
    <>
      <g className="as-dev"><g className="as-xs">
      <rect className="a-body" x="281" y="30" width="22" height="98" rx="11" />
      <rect className="a-knob" x="273" y="104" width="38" height="20" rx="6" />
      <rect className="a-knob" x="362" y="111" width="40" height="12" rx="4" />
      <rect className="a-knob" x="414" y="111" width="40" height="12" rx="4" />
      <g className="as-side"><rect className="a-knob hd-side" x="241" y="300" width="12" height="56" rx="4" /></g>
      <rect className="a-body" x="250" y="120" width="300" height="470" rx="44" />
      <line className="a-thin" x1="254" y1="566" x2="546" y2="566" />
      <rect className="a-thin" x="470" y="574" width="44" height="6" rx="3" />
      <g transform="rotate(-3 336 563)"><rect className="a-sticker" x="270" y="552" width="138" height="22" />
      <path className="a-stink" d="M280 569 L287 557 L294 569 Z" />
      <text className="a-stink" x="300" y="567.5" style={F.display} fontStretch="62%" fontSize="11" fontWeight="800" letterSpacing=".6">{l.sticker}</text></g>
      </g>
      <g className="as-xp">
      <rect className="a-face" x="266" y="136" width="268" height="410" rx="30" />
      <g className="a-engrave"><circle cx="435" cy="468" r="2.2" /><circle cx="435" cy="477" r="2.2" /><circle cx="435" cy="486" r="2.2" /><circle cx="435" cy="495" r="2.2" /><circle cx="435" cy="504" r="2.2" /><circle cx="444" cy="459" r="2.2" /><circle cx="444" cy="468" r="2.2" /><circle cx="444" cy="477" r="2.2" /><circle cx="444" cy="486" r="2.2" /><circle cx="444" cy="495" r="2.2" /><circle cx="444" cy="504" r="2.2" /><circle cx="444" cy="513" r="2.2" /><circle cx="453" cy="459" r="2.2" /><circle cx="453" cy="468" r="2.2" /><circle cx="453" cy="477" r="2.2" /><circle cx="453" cy="486" r="2.2" /><circle cx="453" cy="495" r="2.2" /><circle cx="453" cy="504" r="2.2" /><circle cx="453" cy="513" r="2.2" /><circle cx="462" cy="459" r="2.2" /><circle cx="462" cy="468" r="2.2" /><circle cx="462" cy="477" r="2.2" /><circle cx="462" cy="486" r="2.2" /><circle cx="462" cy="495" r="2.2" /><circle cx="462" cy="504" r="2.2" /><circle cx="462" cy="513" r="2.2" /><circle cx="471" cy="459" r="2.2" /><circle cx="471" cy="468" r="2.2" /><circle cx="471" cy="477" r="2.2" /><circle cx="471" cy="486" r="2.2" /><circle cx="471" cy="495" r="2.2" /><circle cx="471" cy="504" r="2.2" /><circle cx="471" cy="513" r="2.2" /><circle cx="480" cy="459" r="2.2" /><circle cx="480" cy="468" r="2.2" /><circle cx="480" cy="477" r="2.2" /><circle cx="480" cy="486" r="2.2" /><circle cx="480" cy="495" r="2.2" /><circle cx="480" cy="504" r="2.2" /><circle cx="480" cy="513" r="2.2" /><circle cx="489" cy="468" r="2.2" /><circle cx="489" cy="477" r="2.2" /><circle cx="489" cy="486" r="2.2" /><circle cx="489" cy="495" r="2.2" /><circle cx="489" cy="504" r="2.2" /></g>
      <circle className="a-thin" cx="286" cy="528" r="4.5" /><line className="a-thin" x1="283" y1="525" x2="289" y2="531" />
      <circle className="a-thin" cx="514" cy="528" r="4.5" /><line className="a-thin" x1="511" y1="525" x2="517" y2="531" />
      </g>
      <g className="as-xc">
      <circle className="a-knob" cx="340" cy="222" r="42" />
      <path className="a-ticks" d="M376.0,222.0 L382.0,222.0 M375.2,229.5 L381.1,230.7 M372.9,236.6 L378.4,239.1 M369.1,243.2 L374.0,246.7 M364.1,248.8 L368.1,253.2 M358.0,253.2 L361.0,258.4 M351.1,256.2 L353.0,261.9 M343.8,257.8 L344.4,263.8 M336.2,257.8 L335.6,263.8 M328.9,256.2 L327.0,261.9 M322.0,253.2 L319.0,258.4 M315.9,248.8 L311.9,253.2 M310.9,243.2 L306.0,246.7 M307.1,236.6 L301.6,239.1 M304.8,229.5 L298.9,230.7 M304.0,222.0 L298.0,222.0 M304.8,214.5 L298.9,213.3 M307.1,207.4 L301.6,204.9 M310.9,200.8 L306.0,197.3 M315.9,195.2 L311.9,190.8 M322.0,190.8 L319.0,185.6 M328.9,187.8 L327.0,182.1 M336.2,186.2 L335.6,180.2 M343.8,186.2 L344.4,180.2 M351.1,187.8 L353.0,182.1 M358.0,190.8 L361.0,185.6 M364.1,195.2 L368.1,190.8 M369.1,200.8 L374.0,197.3 M372.9,207.4 L378.4,204.9 M375.2,214.5 L381.1,213.3" />
      <circle className="a-cap" cx="340" cy="222" r="29" />
      <line className="td-knob a-needle" x1="340" y1="222" x2="340" y2="198" />
      <circle className="a-ink" cx="310" cy="272" r="1.6" />
      <circle className="a-ink" cx="370" cy="272" r="1.6" />
      <text className="a-engrave" x="340" y="286" textAnchor="middle" style={F.mono} fontSize="8.5" letterSpacing=".8">{l.dialLeft}</text>
      <circle className="a-knob" cx="460" cy="222" r="42" />
      <path className="a-ticks" d="M496.0,222.0 L502.0,222.0 M495.2,229.5 L501.1,230.7 M492.9,236.6 L498.4,239.1 M489.1,243.2 L494.0,246.7 M484.1,248.8 L488.1,253.2 M478.0,253.2 L481.0,258.4 M471.1,256.2 L473.0,261.9 M463.8,257.8 L464.4,263.8 M456.2,257.8 L455.6,263.8 M448.9,256.2 L447.0,261.9 M442.0,253.2 L439.0,258.4 M435.9,248.8 L431.9,253.2 M430.9,243.2 L426.0,246.7 M427.1,236.6 L421.6,239.1 M424.8,229.5 L418.9,230.7 M424.0,222.0 L418.0,222.0 M424.8,214.5 L418.9,213.3 M427.1,207.4 L421.6,204.9 M430.9,200.8 L426.0,197.3 M435.9,195.2 L431.9,190.8 M442.0,190.8 L439.0,185.6 M448.9,187.8 L447.0,182.1 M456.2,186.2 L455.6,180.2 M463.8,186.2 L464.4,180.2 M471.1,187.8 L473.0,182.1 M478.0,190.8 L481.0,185.6 M484.1,195.2 L488.1,190.8 M489.1,200.8 L494.0,197.3 M492.9,207.4 L498.4,204.9 M495.2,214.5 L501.1,213.3" />
      <circle className="a-cap" cx="460" cy="222" r="29" />
      <line className="a-needle" transform="rotate(48 460 222)" x1="460" y1="222" x2="460" y2="198" />
      <circle className="a-ink" cx="430" cy="272" r="1.6" />
      <circle className="a-ink" cx="490" cy="272" r="1.6" />
      <text className="a-engrave" x="460" y="286" textAnchor="middle" style={F.mono} fontSize="8.5" letterSpacing=".8">{l.dialRight}</text>
      <rect className="a-bezel" x="286" y="304" width="228" height="118" rx="14" />
      <rect className="a-glass" x="296" y="314" width="208" height="98" rx="8" />
      <g clipPath={`url(#${gid}-glass)`}><g>
      <path className="td-br-a a-wave" d="M288,336.5 L292,336.5 L296,336.6 L300,336.4 L304,336.4 L308,336.3 L312,335.9 L316,335.4 L320,335.3 L324,335.4 L328,335.7 L332,335.6 L336,335.5 L340,335.5 L344,335.7 L348,335.7 L352,335.2 L356,334.9 L360,334.5 L364,334.4 L368,334.2 L372,334.0 L376,334.2 L380,334.2 L384,334.4 L388,334.4 L392,334.6 L396,334.7 L400,334.6 L404,334.4 L408,334.2 L412,334.6 L416,334.5 L420,334.5 L424,334.1 L428,334.3 L432,334.1 L436,333.9 L440,333.2 L444,333.0 L448,333.1 L452,333.7 L456,334.1 L460,334.6 L464,334.8 L468,335.1 L472,335.2 L476,335.3 L480,335.5 L484,335.8 L488,335.7 L492,335.6 L496,335.5 L500,335.7 L504,335.8 L508,336.0 L512,336.0 L512,432 L288,432 Z" />
      <path className="td-br-b a-wave" d="M288,342.8 L292,342.9 L296,343.1 L300,343.2 L304,343.2 L308,343.1 L312,343.2 L316,342.9 L320,342.7 L324,342.4 L328,342.5 L332,342.5 L336,342.4 L340,342.2 L344,342.2 L348,341.8 L352,341.4 L356,341.2 L360,341.2 L364,341.0 L368,340.6 L372,340.5 L376,340.5 L380,340.8 L384,341.1 L388,341.3 L392,341.1 L396,340.7 L400,340.3 L404,340.0 L408,339.7 L412,339.7 L416,339.9 L420,340.2 L424,340.3 L428,340.4 L432,340.2 L436,340.0 L440,339.6 L444,339.7 L448,339.8 L452,340.4 L456,340.7 L460,340.9 L464,340.7 L468,340.7 L472,340.9 L476,341.5 L480,341.8 L484,342.0 L488,341.9 L492,342.1 L496,342.4 L500,342.8 L504,342.9 L508,342.9 L512,342.8 L512,432 L288,432 Z" />
      <path className="td-br-c a-wave" d="M288,350.1 L292,350.2 L296,350.3 L300,350.5 L304,350.3 L308,349.8 L312,349.5 L316,349.2 L320,349.3 L324,349.4 L328,349.7 L332,349.8 L336,349.7 L340,349.5 L344,349.2 L348,349.0 L352,348.7 L356,348.3 L360,347.9 L364,347.6 L368,347.6 L372,347.3 L376,346.9 L380,346.8 L384,346.9 L388,347.0 L392,347.0 L396,346.9 L400,347.1 L404,347.2 L408,347.1 L412,346.6 L416,346.2 L420,345.9 L424,345.6 L428,345.2 L432,345.0 L436,345.4 L440,346.0 L444,346.4 L448,346.5 L452,346.5 L456,346.6 L460,347.0 L464,347.4 L468,347.9 L472,348.3 L476,348.8 L480,349.5 L484,349.8 L488,350.0 L492,350.0 L496,350.1 L500,350.0 L504,349.9 L508,350.0 L512,350.2 L512,432 L288,432 Z" />
      <path className="td-br-a a-wave" d="M288,356.8 L292,357.2 L296,357.5 L300,357.4 L304,357.0 L308,356.5 L312,356.5 L316,356.5 L320,356.5 L324,356.4 L328,356.5 L332,356.7 L336,356.8 L340,356.5 L344,355.7 L348,355.0 L352,354.7 L356,354.5 L360,354.2 L364,353.8 L368,353.2 L372,352.9 L376,352.6 L380,352.6 L384,352.6 L388,352.8 L392,352.7 L396,352.7 L400,352.4 L404,352.2 L408,352.1 L412,352.0 L416,351.7 L420,351.3 L424,351.2 L428,351.4 L432,351.8 L436,351.8 L440,351.7 L444,351.8 L448,352.2 L452,352.9 L456,353.5 L460,354.1 L464,354.6 L468,354.8 L472,355.1 L476,355.4 L480,355.9 L484,356.4 L488,357.1 L492,357.4 L496,357.5 L500,357.1 L504,356.9 L508,356.9 L512,357.0 L512,432 L288,432 Z" />
      <path className="td-br-b a-wave" d="M288,364.3 L292,364.2 L296,364.1 L300,364.3 L304,364.4 L308,364.3 L312,363.8 L316,363.4 L320,363.0 L324,362.8 L328,362.6 L332,362.6 L336,362.8 L340,362.7 L344,362.4 L348,361.8 L352,361.0 L356,360.4 L360,359.8 L364,359.4 L368,359.3 L372,359.4 L376,359.6 L380,359.7 L384,360.0 L388,360.4 L392,360.7 L396,360.6 L400,360.5 L404,360.8 L408,361.5 L412,361.9 L416,362.1 L420,361.9 L424,361.6 L428,361.4 L432,361.5 L436,361.9 L440,362.1 L444,361.9 L448,361.7 L452,361.9 L456,362.3 L460,362.8 L464,362.7 L468,362.7 L472,362.7 L476,363.0 L480,363.3 L484,363.6 L488,363.7 L492,363.6 L496,363.6 L500,364.0 L504,364.5 L508,364.8 L512,364.9 L512,432 L288,432 Z" />
      <path className="td-br-c a-wave" d="M288,370.2 L292,370.5 L296,371.0 L300,371.4 L304,371.5 L308,371.1 L312,370.9 L316,370.6 L320,370.6 L324,370.5 L328,370.7 L332,370.6 L336,370.3 L340,369.4 L344,368.5 L348,367.6 L352,366.8 L356,366.2 L360,365.3 L364,364.4 L368,363.9 L372,363.8 L376,364.0 L380,364.3 L384,364.7 L388,365.5 L392,366.1 L396,366.5 L400,366.5 L404,366.7 L408,367.0 L412,367.5 L416,367.5 L420,367.4 L424,367.0 L428,366.8 L432,366.9 L436,367.0 L440,367.2 L444,367.4 L448,367.7 L452,368.2 L456,368.6 L460,369.1 L464,369.5 L468,369.7 L472,369.9 L476,370.1 L480,370.4 L484,370.6 L488,370.8 L492,370.7 L496,370.9 L500,371.2 L504,371.4 L508,371.2 L512,371.0 L512,432 L288,432 Z" />
      <path className="td-br-a a-glow" d="M288,378.4 L292,378.5 L296,378.5 L300,378.2 L304,377.9 L308,377.8 L312,377.9 L316,378.0 L320,378.2 L324,378.1 L328,378.2 L332,377.9 L336,377.9 L340,377.7 L344,377.5 L348,376.4 L352,373.4 L356,368.8 L360,364.9 L364,355.7 L368,337.7 L372,327.4 L376,343.0 L380,371.5 L384,384.0 L388,379.8 L392,376.1 L396,375.4 L400,374.9 L404,374.5 L408,373.9 L412,373.5 L416,373.3 L420,373.3 L424,373.4 L428,373.4 L432,373.4 L436,373.5 L440,373.8 L444,374.4 L448,375.1 L452,375.8 L456,376.2 L460,376.5 L464,376.9 L468,377.2 L472,377.5 L476,377.5 L480,377.6 L484,377.8 L488,378.1 L492,378.2 L496,378.2 L500,378.1 L504,378.0 L508,377.8 L512,377.6" filter={`url(#${gid}-glow)`} />
      <path className="td-br-a a-spike" d="M288,378.4 L292,378.5 L296,378.5 L300,378.2 L304,377.9 L308,377.8 L312,377.9 L316,378.0 L320,378.2 L324,378.1 L328,378.2 L332,377.9 L336,377.9 L340,377.7 L344,377.5 L348,376.4 L352,373.4 L356,368.8 L360,364.9 L364,355.7 L368,337.7 L372,327.4 L376,343.0 L380,371.5 L384,384.0 L388,379.8 L392,376.1 L396,375.4 L400,374.9 L404,374.5 L408,373.9 L412,373.5 L416,373.3 L420,373.3 L424,373.4 L428,373.4 L432,373.4 L436,373.5 L440,373.8 L444,374.4 L448,375.1 L452,375.8 L456,376.2 L460,376.5 L464,376.9 L468,377.2 L472,377.5 L476,377.5 L480,377.6 L484,377.8 L488,378.1 L492,378.2 L496,378.2 L500,378.1 L504,378.0 L508,377.8 L512,377.6 L512,432 L288,432 Z" />
      <path className="td-br-b a-wave" d="M288,384.1 L292,384.5 L296,385.0 L300,385.0 L304,384.7 L308,384.4 L312,384.5 L316,384.5 L320,384.6 L324,384.3 L328,384.0 L332,383.8 L336,383.5 L340,383.0 L344,382.1 L348,381.2 L352,380.2 L356,379.4 L360,378.7 L364,378.4 L368,378.1 L372,377.8 L376,377.4 L380,377.2 L384,377.1 L388,376.9 L392,377.0 L396,377.3 L400,377.7 L404,378.2 L408,378.6 L412,378.9 L416,378.9 L420,378.6 L424,378.4 L428,378.5 L432,379.1 L436,380.1 L440,381.1 L444,381.7 L448,381.9 L452,382.3 L456,382.9 L460,383.5 L464,383.9 L468,384.3 L472,384.6 L476,384.8 L480,385.0 L484,385.1 L488,385.1 L492,385.0 L496,385.1 L500,385.2 L504,385.4 L508,385.5 L512,385.6 L512,432 L288,432 Z" />
      <path className="td-br-c a-wave" d="M288,392.4 L292,392.1 L296,391.5 L300,391.2 L304,391.3 L308,391.9 L312,392.2 L316,392.0 L320,391.4 L324,391.1 L328,391.1 L332,391.1 L336,390.8 L340,390.3 L344,389.9 L348,389.8 L352,389.4 L356,388.9 L360,388.2 L364,387.7 L368,387.4 L372,387.1 L376,386.9 L380,386.7 L384,386.6 L388,386.6 L392,386.9 L396,387.3 L400,387.8 L404,388.2 L408,388.5 L412,388.7 L416,388.8 L420,389.0 L424,389.1 L428,389.4 L432,389.5 L436,389.7 L440,389.8 L444,389.8 L448,389.8 L452,390.0 L456,390.3 L460,390.7 L464,390.9 L468,391.1 L472,391.5 L476,391.9 L480,392.0 L484,392.0 L488,391.7 L492,391.9 L496,391.9 L500,392.1 L504,392.0 L508,391.9 L512,391.7 L512,432 L288,432 Z" />
      <path className="td-br-a a-wave" d="M288,399.2 L292,399.2 L296,399.0 L300,398.6 L304,398.4 L308,398.6 L312,398.7 L316,398.7 L320,398.6 L324,398.4 L328,398.4 L332,398.2 L336,398.3 L340,398.3 L344,398.4 L348,398.0 L352,397.2 L356,396.2 L360,395.5 L364,395.2 L368,395.1 L372,394.9 L376,394.6 L380,394.4 L384,394.1 L388,394.3 L392,394.4 L396,394.7 L400,394.7 L404,394.9 L408,395.2 L412,395.6 L416,395.7 L420,395.8 L424,395.7 L428,396.0 L432,396.1 L436,396.4 L440,396.5 L444,396.6 L448,396.8 L452,397.3 L456,397.9 L460,398.6 L464,398.9 L468,398.9 L472,398.7 L476,398.6 L480,398.5 L484,398.6 L488,399.0 L492,399.5 L496,399.8 L500,399.6 L504,399.5 L508,399.4 L512,399.5 L512,432 L288,432 Z" />
      <path className="td-br-b a-wave" d="M288,406.8 L292,406.5 L296,405.9 L300,405.7 L304,405.6 L308,405.8 L312,405.9 L316,406.0 L320,405.8 L324,405.4 L328,405.3 L332,405.2 L336,405.4 L340,405.4 L344,405.3 L348,404.7 L352,404.1 L356,403.4 L360,402.9 L364,402.3 L368,402.0 L372,401.5 L376,401.2 L380,400.7 L384,400.5 L388,400.2 L392,400.4 L396,400.6 L400,400.7 L404,400.6 L408,400.5 L412,400.6 L416,400.8 L420,401.1 L424,401.6 L428,402.4 L432,403.1 L436,403.8 L440,404.1 L444,404.5 L448,404.9 L452,405.4 L456,405.8 L460,406.1 L464,406.3 L468,406.2 L472,406.1 L476,405.9 L480,405.9 L484,405.8 L488,405.7 L492,405.5 L496,405.5 L500,405.8 L504,406.1 L508,406.4 L512,406.5 L512,432 L288,432 Z" />
      <path className="td-br-a td-pulse a-pulse" pathLength="100" d="M288,378.4 L292,378.5 L296,378.5 L300,378.2 L304,377.9 L308,377.8 L312,377.9 L316,378.0 L320,378.2 L324,378.1 L328,378.2 L332,377.9 L336,377.9 L340,377.7 L344,377.5 L348,376.4 L352,373.4 L356,368.8 L360,364.9 L364,355.7 L368,337.7 L372,327.4 L376,343.0 L380,371.5 L384,384.0 L388,379.8 L392,376.1 L396,375.4 L400,374.9 L404,374.5 L408,373.9 L412,373.5 L416,373.3 L420,373.3 L424,373.4 L428,373.4 L432,373.4 L436,373.5 L440,373.8 L444,374.4 L448,375.1 L452,375.8 L456,376.2 L460,376.5 L464,376.9 L468,377.2 L472,377.5 L476,377.5 L480,377.6 L484,377.8 L488,378.1 L492,378.2 L496,378.2 L500,378.1 L504,378.0 L508,377.8 L512,377.6" />
      </g></g>
      <circle className="td-blink a-recdot" cx="470" cy="325" r="2.6" />
      <text className="a-rec" x="478" y="328" style={F.mono} fontSize="7">{l.rec}</text>
      <text className="a-rec hd-read" x="306" y="406" style={F.mono} fontSize="7" letterSpacing=".6" />
      <g className="td-ship"><circle className="a-shipbase" cx="346" cy="488" r="44" />
      <g className="hd-cap"><circle className="a-ship" cx="346" cy="484" r="38" />
      <text className="a-shiplabel" x="346" y="489" textAnchor="middle" style={F.display} fontSize="14" fontWeight="800" letterSpacing="1">{l.ship}</text></g></g>
      <circle className="a-ledring" cx="506" cy="160" r="8" />
      <circle className="td-blink a-led" cx="506" cy="160" r="4.5" />
      </g></g>
    </>
  );
}

export function AppareilLarge({ labels: l, callout }: { labels: AppareilLabels; callout: string }) {
  const gid = useGid("hdl");
  return (
    <svg viewBox="0 18 800 624" role="img" aria-label={l.aria} style={SVG_STYLE}>
      <Defs gid={gid} />
      <g className="as-tech">
      <g className="t-line">
      <line x1="400" y1="92" x2="400" y2="610" strokeDasharray="14 4 2 4" />
      <line x1="250" y1="598" x2="250" y2="632" /><line x1="550" y1="598" x2="550" y2="632" />
      <line x1="250" y1="622" x2="370" y2="622" /><line x1="430" y1="622" x2="550" y2="622" />
      <polyline points="514,156 590,120 760,120" />
      </g>
      <path className="t-head" d="M250 622 L260 618 L260 626 Z M550 622 L540 618 L540 626 Z" />
      <text className="t-text" x="400" y="626" textAnchor="middle" style={F.mono} fontSize="10">{l.fig}</text>
      <text className="t-text" x="594" y="112" style={F.mono} fontSize="9.5" letterSpacing=".4">{callout.toUpperCase()}</text>
      </g>
      <Device gid={gid} l={l} />
      <g className="as-notes">
      <g className="h-ink">
      <path className="td-draw" pathLength="1" d="M58,168 C56,156 66,148 76,150 C86,152 88,164 82,172 C76,180 62,178 58,168 Z M44,204 C46,188 58,182 70,184 C82,186 92,194 92,206" />
      <path className="td-draw" pathLength="1" d="M98,160 C96,147 106,140 117,142 C128,144 131,157 124,165 C117,172 101,170 98,160 Z M86,200 C88,184 100,176 112,178 C124,180 134,188 134,202" />
      <path className="td-draw" pathLength="1" d="M140,170 C138,159 147,152 157,154 C166,156 168,168 162,175 C155,182 142,179 140,170 Z M130,208 C131,194 142,188 152,189 C163,190 171,198 171,210" />
      <path className="td-draw td-d1 hd-n-cust" pathLength="1" d="M178,236 C214,214 254,212 292,222 M277,211 L293,222 L276,229" />
      <path className="td-draw td-d3 hd-n-sketch" pathLength="1" d="M618,438 C652,434 700,432 738,436 C742,460 742,488 738,512 C700,516 656,516 620,512 C616,488 615,462 618,438 Z M632,454 L664,454 M632,472 L716,470 M632,490 L700,490" />
      </g>
      <g className="h-ember">
      <path className="td-draw td-d1 hd-n-circle" pathLength="1" d="M348,346 C336,326 350,306 374,306 C398,306 410,324 402,344 C394,362 362,366 348,352 C342,344 344,334 352,326" />
      <path className="td-draw td-d2 hd-n-breaks" pathLength="1" d="M168,392 C220,384 286,372 336,358 M321,352 L338,357 L326,370" />
      <path className="td-draw td-d3 hd-n-ship" pathLength="1" d="M386,520 C420,578 520,580 608,486 M590,488 L609,485 L606,503" />
      </g>
      <g style={F.hand}>
      <text className="td-fade h-t-ink" x="40" y="250" fontSize="25" fontWeight="500">{l.customers}</text>
      <text className="td-fade td-f2 h-t-ember hd-n-btext" x="30" y="400" fontSize="21">{l.breaks[0]}</text>
      <text className="td-fade td-f2 h-t-ember hd-n-btext" x="30" y="427" fontSize="21">{l.breaks[1]}</text>
      <text className="td-fade td-f3 h-t-ember hd-n-stext" x="590" y="390" fontSize="21">{l.ship2[0]}</text>
      <text className="td-fade td-f3 h-t-ember hd-n-stext" x="590" y="416" fontSize="21">{l.ship2[1]}</text>
      <text className="td-fade td-f3 h-t-ink" x="634" y="548" fontSize="25" fontWeight="500">{l.product}</text>
      </g>
      </g>
    </svg>
  );
}

export function AppareilVertical({ labels: l }: { labels: AppareilLabels }) {
  const gid = useGid("hds");
  return (
    <svg viewBox="0 0 360 492" role="img" aria-label={l.aria} style={SVG_STYLE}>
      <Defs gid={gid} />
      <g transform="translate(-60,80) scale(.6)">
        <Device gid={gid} l={l} />
      </g>
      <g className="as-notes">
        <g className="h-ink-sm">
        <path className="td-draw" pathLength="1" d="M20,22 C19,14 25,9 31,10 C38,11 39,19 35,24 C31,29 22,28 20,22 Z M12,46 C13,36 21,32 28,33 C36,34 42,39 42,48" />
        <path className="td-draw" pathLength="1" d="M46,18 C45,10 52,6 58,7 C65,8 66,16 62,21 C57,26 48,25 46,18 Z M38,44 C39,34 47,30 54,31 C62,32 68,37 68,46" />
        <path className="td-draw td-d1 hd-n-cust" pathLength="1" d="M50,82 C58,140 80,190 116,208 M101,207 L117,209 L109,195" />
        <path className="td-draw td-d3 hd-n-sketch" pathLength="1" d="M282,420 C302,418 334,418 352,420 C354,436 354,452 352,466 C332,468 302,468 283,466 C281,452 281,436 282,420 Z M292,432 L310,432 M292,444 L340,443 M292,456 L328,456" />
        </g>
        <g className="h-ember-sm">
        <path className="td-draw td-d1 hd-n-circle" pathLength="1" d="M151,288 C142,276 150,262 164,262 C178,262 186,272 182,284 C177,296 158,298 151,290 C147,285 148,278 153,273" />
        <path className="td-draw td-d2 hd-n-breaks" pathLength="1" d="M300,58 C324,150 320,262 192,282 M206,273 L191,282 L205,291" />
        <path className="td-draw td-d3 hd-n-ship" pathLength="1" d="M166,390 C186,440 230,452 276,442 M262,434 L277,442 L264,452" />
        </g>
        <g style={F.hand}>
        <text className="td-fade h-t-ink" x="8" y="70" fontSize="18" fontWeight="500">{l.customers}</text>
        <text className="td-fade td-f2 h-t-ember hd-n-btext" x="226" y="24" fontSize="15">{l.breaks[0]}</text>
        <text className="td-fade td-f2 h-t-ember hd-n-btext" x="226" y="43" fontSize="15">{l.breaks[1]}</text>
        <text className="td-fade td-f3 h-t-ember hd-n-stext" x="8" y="458" fontSize="15">{l.ship2[0]}</text>
        <text className="td-fade td-f3 h-t-ember hd-n-stext" x="8" y="477" fontSize="15">{l.ship2[1]}</text>
        <text className="td-fade td-f3 h-t-ink" x="288" y="488" fontSize="16" fontWeight="500">{l.product}</text>
        </g>
      </g>
    </svg>
  );
}

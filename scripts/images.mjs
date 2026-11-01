// Variantes AVIF des captures et photos (choix TA du 31/10/2026) : pour chaque JPEG de
// public/images/{products,workbench,ventures}, écrit <nom>-640.avif et <nom>-1280.avif
// (largeur plafonnée à celle de l'original, qualité 60), versionnées à côté du JPEG.
// components/Pic.tsx les sert dans un <picture>, le JPEG restant en secours.
//
// À relancer après l'ajout ou le remplacement d'une image :
//   node scripts/images.mjs           génère ce qui manque ou est plus ancien que le JPEG
//   node scripts/images.mjs --check   sort en erreur si une variante manque ou est périmée
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("../public/images/", import.meta.url).pathname;
const DIRS = ["products", "workbench", "ventures"];
const WIDTHS = [640, 1280];
const QUALITY = 60;
const check = process.argv.includes("--check");

let todo = 0;
for (const dir of DIRS) {
  for (const f of readdirSync(join(ROOT, dir)).filter((x) => x.endsWith(".jpg"))) {
    const src = join(ROOT, dir, f);
    const { width } = await sharp(src).metadata();
    for (const w of WIDTHS) {
      const out = src.replace(/\.jpg$/, `-${w}.avif`);
      if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
      todo++;
      if (check) {
        console.log(`manquante ou périmée : ${dir}/${f} (${w})`);
        continue;
      }
      const info = await sharp(src).resize({ width: Math.min(w, width) }).avif({ quality: QUALITY }).toFile(out);
      console.log(`${dir}/${f} → ${w} : ${Math.round(info.size / 1024)} Ko`);
    }
  }
}
if (check && todo) process.exit(1);
console.log(check ? "variantes AVIF à jour" : `${todo} variante(s) écrite(s)`);

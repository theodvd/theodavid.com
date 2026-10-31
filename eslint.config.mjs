// Config ESLint (format « flat config » d'ESLint 9), identique au modèle
// officiel de create-next-app 15 : règles Next + Core Web Vitals + TypeScript.
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Dossiers générés : les builds de vérification (NEXT_DIST_DIR) inclus.
    ignores: ["node_modules/**", ".next/**", ".next-verify/**", "out/**", "next-env.d.ts"],
  },
];

export default eslintConfig;

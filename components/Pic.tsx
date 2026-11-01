import type { CSSProperties } from "react";

/**
 * Image de contenu servie en AVIF (640 et 1280 px, générées par scripts/images.mjs),
 * avec le JPEG d'origine en secours. Le <picture> est transparent à la mise en page
 * (display: contents, td.css) : les styles qui visent l'img restent valables.
 * Les images hors de /images/{products,workbench,ventures}/ restent un simple <img>.
 *
 * Exemple : <Pic src="/images/products/sirocco.jpg" width={1200} height={750} alt="…" sizes="(max-width: 760px) 100vw, 640px" />
 */
type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
  /** Largeur réelle du fichier, quand width/height décrivent la taille affichée (vignette du Workbench). */
  natural?: number;
  loading?: "lazy" | "eager";
  className?: string;
  style?: CSSProperties;
};

const VARIANTS = /^\/images\/(products|workbench|ventures)\/[^/]+\.jpg$/;

export default function Pic({ src, width, height, alt, sizes, natural, loading = "lazy", className, style }: Props) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- capture servie à son format, variantes AVIF faites au build
    <img className={className} style={style} src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" />
  );
  if (!VARIANTS.test(src)) return img;
  const base = src.replace(/\.jpg$/, "");
  const full = natural ?? width;
  // une image de 640 px ou moins n'a qu'une variante utile (deux descripteurs égaux rendraient le srcset invalide)
  const set = full <= 640 ? `${base}-640.avif ${full}w` : `${base}-640.avif 640w, ${base}-1280.avif ${Math.min(1280, full)}w`;
  return (
    <picture>
      <source type="image/avif" srcSet={set} sizes={sizes} />
      {img}
    </picture>
  );
}

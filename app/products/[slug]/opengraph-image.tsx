import { ImageResponse } from "next/og";
import { getContent, getProduct } from "@/lib/content";
import { two } from "@/components/sheets/lib";

/**
 * Image de partage d'un produit SANS capture : une carte titre et chiffres,
 * aux couleurs claires de l'identité. Un produit qui a une capture n'en
 * génère pas : son og:image est la capture elle-même (components/sheets/meta.ts).
 */

type Params = { params: { slug: string } };

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getContent().products.map((p) => ({ slug: p.slug }));
}

export function generateImageMetadata({ params }: Params) {
  const found = getProduct(params.slug);
  if (!found || found.product.images?.length) return [];
  return [{ id: "card", size, contentType, alt: found.product.oneLiner }];
}

export default function Image({ params }: Params) {
  const found = getProduct(params.slug);
  const { profile } = getContent();
  if (!found) return new ImageResponse(<div />, size);
  const p = found.product;
  const figures = (p.figures ?? []).slice(0, 3);
  // Jetons clairs de l'identité (app/styles/td.css) : os, encre, encre atténuée.
  const ground = "#ece9e1";
  const ink = "#0a0d16";
  const muted = "#3a3f4c";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: ground,
          color: ink,
          border: `6px solid ${ink}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: muted }}>
          <span>{two(p.index)}</span>
          <span>{profile.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 0.95 }}>{p.name}</div>
          <div style={{ fontSize: 30, lineHeight: 1.35, maxWidth: 980 }}>{p.oneLiner}</div>
        </div>
        <div style={{ display: "flex", gap: 0, borderTop: `3px solid ${ink}` }}>
          {figures.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "16px 20px 0",
                paddingLeft: i ? 20 : 0,
                borderLeft: i ? `1px solid ${muted}` : "none",
              }}
            >
              <span style={{ fontSize: 64, fontWeight: 800 }}>{f.value}</span>
              <span style={{ fontSize: 18, color: muted, textTransform: "uppercase" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

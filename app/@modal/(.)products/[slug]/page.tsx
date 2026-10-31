import { notFound } from "next/navigation";
import { getContent, getProduct } from "@/lib/content";
import ProductSheet from "@/components/sheets/ProductSheet";
import { productMetadata } from "@/components/sheets/meta";

/* /products/<slug> ouvert depuis la home : la fiche en surimpression, la home reste dessous. */

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  return productMetadata((await params).slug);
}

export default async function ProductOverlay({ params }: Params) {
  const found = getProduct((await params).slug);
  if (!found) notFound();
  return <ProductSheet c={getContent()} p={found.product} prev={found.prev} next={found.next} mode="overlay" />;
}

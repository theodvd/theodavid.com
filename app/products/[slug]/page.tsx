import { notFound } from "next/navigation";
import { getContent, getProduct } from "@/lib/content";
import ProductSheet from "@/components/sheets/ProductSheet";
import PageFrame from "@/components/sheets/PageFrame";
import { productMetadata } from "@/components/sheets/meta";

/* /products/<slug> en accès direct (lien partagé, rechargement) : la fiche dépliée en page. */

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  return productMetadata((await params).slug);
}

export default async function ProductPage({ params }: Params) {
  const found = getProduct((await params).slug);
  if (!found) notFound();
  const c = getContent();
  return (
    <PageFrame c={c} here="products" title={found.product.name}>
      <ProductSheet c={c} p={found.product} prev={found.prev} next={found.next} mode="page" />
    </PageFrame>
  );
}

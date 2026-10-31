import { notFound } from "next/navigation";
import { getContent, getTool } from "@/lib/content";
import ToolSheet from "@/components/sheets/ToolSheet";
import { toolMetadata } from "@/components/sheets/meta";

/* /workbench/<slug> ouvert depuis la home : la fiche d'outil en surimpression. */

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().workbench.items.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params) {
  return toolMetadata((await params).slug);
}

export default async function ToolOverlay({ params }: Params) {
  const found = getTool((await params).slug);
  if (!found) notFound();
  return <ToolSheet c={getContent()} t={found.tool} prev={found.prev} next={found.next} mode="overlay" />;
}

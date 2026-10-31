import { notFound } from "next/navigation";
import { getContent, getTool } from "@/lib/content";
import ToolSheet from "@/components/sheets/ToolSheet";
import PageFrame from "@/components/sheets/PageFrame";
import { toolMetadata } from "@/components/sheets/meta";

/* /workbench/<slug> en accès direct : la fiche d'outil en page, avec la barre, le fil et le contact. */

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().workbench.items.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params) {
  return toolMetadata((await params).slug);
}

export default async function ToolPage({ params }: Params) {
  const found = getTool((await params).slug);
  if (!found) notFound();
  const c = getContent();
  return (
    <PageFrame c={c} here="workbench" title={found.tool.name}>
      <ToolSheet c={c} t={found.tool} prev={found.prev} next={found.next} mode="page" />
    </PageFrame>
  );
}

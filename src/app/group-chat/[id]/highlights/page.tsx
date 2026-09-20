import HighlightsCard from "@/components/HighlightsCard";

export default async function HighlightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HighlightsCard id={id} />;
}

import IndividualHighlightsCard from "@/components/IndividualHighlightsCard";

export default async function IndividualHighlightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IndividualHighlightsCard id={id} />;
}

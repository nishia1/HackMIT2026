import IndividualView from "@/components/IndividualView";

export default async function IndividualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IndividualView id={id} />;
}

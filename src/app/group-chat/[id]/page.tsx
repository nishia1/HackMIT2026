import GroupChatView from "@/components/GroupChatView";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupChatView id={id} />;
}

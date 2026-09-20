import Link from "next/link";
import GroupChatNameEditor from "@/components/GroupChatNameEditor";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="pt-8">
      <Link href="/circle" className="text-inkSoft underline">
        &larr; Back to your circle
      </Link>
      <GroupChatNameEditor id={id} />
      <p className="mt-1 text-inkSoft">
        This group chat isn&rsquo;t built yet &mdash; placeholder for <code>{id}</code>.
      </p>
    </div>
  );
}

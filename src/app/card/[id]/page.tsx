import Link from "next/link";
import ConnectionCard from "@/components/ConnectionCard";
import { getPerson } from "@/lib/world";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getPerson(id);

  if (!view) {
    return (
      <div className="pt-16">
        <h1 className="font-display text-3xl">No one by that name</h1>
        <Link href="/circle" className="mt-3 inline-block underline">
          Back to your circle
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <ConnectionCard view={view} />
      {!view.known && (
        <p className="mt-4 text-inkSoft">You two haven&rsquo;t met yet.</p>
      )}
    </div>
  );
}

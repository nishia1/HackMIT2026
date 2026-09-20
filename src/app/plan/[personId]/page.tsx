import Link from "next/link";
import PlanForPerson from "@/components/PlanForPerson";
import { loadString } from "@/lib/world";

export const dynamic = "force-dynamic";

/**
 * The planner for one person — where the fading popup's "Make a plan" goes.
 * `/plan` itself stays the harness it always was.
 */
export default async function PlanForPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ now?: string }>;
}) {
  const [{ personId }, { now }] = await Promise.all([params, searchParams]);
  const string = await loadString(personId, now);

  if (!string) {
    return (
      <div className="pt-16">
        <h1 className="font-display text-3xl">No string here</h1>
        <Link href="/circle" className="mt-3 inline-block underline">
          Back to your circle
        </Link>
      </div>
    );
  }

  return <PlanForPerson personId={personId} name={string.name} now={now} />;
}

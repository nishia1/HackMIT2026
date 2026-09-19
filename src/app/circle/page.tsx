import { getCircle } from "@/lib/world";
import CircleView from "./CircleView";

// Server component: the data is fetched here and handed down. When you swap
// `getCircle` for a real API call, this file doesn't change.
export default async function CirclePage() {
  const circle = await getCircle();
  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Your circle</h1>
      <p className="mt-1 text-inkSoft">
        Everything one step from you. Tap anything to follow it outward.
      </p>
      <CircleView {...circle} />
    </div>
  );
}

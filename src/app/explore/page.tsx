import { getDiscoveries } from "@/lib/world";
import ExploreView from "./ExploreView";

export default async function ExplorePage() {
  const discoveries = await getDiscoveries(4);
  return <ExploreView discoveries={discoveries} />;
}

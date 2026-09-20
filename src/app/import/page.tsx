import ImportView from "@/app/import/ImportView";
import { getPeople } from "@/lib/world";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  return <ImportView people={await getPeople()} />;
}

import ImportView from "@/app/import/ImportView";
import { getPeople } from "@/lib/world";

export default async function ImportPage() {
  return <ImportView people={await getPeople()} />;
}

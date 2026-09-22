import type { QueryParams } from "@/lib/table";
import { DirectoryListPage } from "@/components/directory/DirectoryListPage";

export default async function Page({ searchParams }: { searchParams: Promise<QueryParams> }) {
  return <DirectoryListPage kind="STAFF" params={await searchParams} />;
}

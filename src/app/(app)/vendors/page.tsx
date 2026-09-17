import { DirectoryListPage } from "@/components/directory/DirectoryListPage";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DirectoryListPage kind="VENDOR" params={await searchParams} />;
}

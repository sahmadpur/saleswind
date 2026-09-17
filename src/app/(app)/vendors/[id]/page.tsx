import { DirectoryDetailPage } from "@/components/directory/DirectoryDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DirectoryDetailPage kind="VENDOR" id={(await params).id} />;
}

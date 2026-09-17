import { DirectoryDetailPage } from "@/components/directory/DirectoryDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DirectoryDetailPage kind="PARTNER" id={(await params).id} />;
}

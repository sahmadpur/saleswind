import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const rows = await listOpportunities();
  const isKanban = view === "kanban";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Opportunities</h1>
        <div className="flex items-center gap-2">
          <Link href="/opportunities?view=table" className={`rounded-lg px-3 py-1.5 text-sm ${!isKanban ? "bg-neutral-200" : "hover:bg-neutral-100"}`}>Table</Link>
          <Link href="/opportunities?view=kanban" className={`rounded-lg px-3 py-1.5 text-sm ${isKanban ? "bg-neutral-200" : "hover:bg-neutral-100"}`}>Board</Link>
          <Link href="/opportunities/new"><Button>New opportunity</Button></Link>
        </div>
      </div>
      {isKanban ? <KanbanBoard rows={rows} /> : <Card className="p-0"><OpportunityTable rows={rows} /></Card>}
    </div>
  );
}

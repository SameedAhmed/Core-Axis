import { prisma } from "@/lib/prisma";
import { DealBoard } from "@/components/deals/deal-board";
import { DealForecast } from "@/components/deals/deal-forecast";
import { CreateDealDialog } from "@/components/deals/create-deal-dialog";
import { ImportDealsDialog } from "@/components/deals/import-deals-dialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DealsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const effectiveRole = await getEffectiveRole(user);

    const resolvedParams = await searchParams;
    const view = resolvedParams.view || "kanban";

    const deals = await prisma.deal.findMany({
        where: {
            ...getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId),
            customStage: null
        },
        include: {
            organization: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    const organizations = await prisma.organization.findMany({
        where: { workspaceId: (user as any).activeWorkspaceId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
    });

    let activeWorkspace = null;
    if ((user as any).activeWorkspaceId) {
        activeWorkspace = await prisma.workspace.findUnique({
            where: { id: (user as any).activeWorkspaceId }
        });
    }
    const dealStages = (activeWorkspace as any)?.dealStages || null;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0 bg-card p-4 sm:p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Sales Pipeline</h1>
                    <div className="flex gap-6 text-sm font-bold border-b border-border/50">
                        <Link
                            href="/dashboard/deals?view=kanban"
                            className={`pb-2 transition-all ${view === 'kanban' || view === 'list' ? 'text-primary border-b-2 border-primary translate-y-0.5' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Kanban Board
                        </Link>
                        <Link
                            href="/dashboard/deals?view=forecast"
                            className={`pb-2 transition-all ${view === 'forecast' ? 'text-primary border-b-2 border-primary translate-y-0.5' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Forecast Area
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                        <ImportDealsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateDealDialog organizations={organizations as any} dealStages={dealStages} />
                    </div>
                </div>
            </div>

            {view === "forecast" ? (
                <DealForecast data={deals as any} effectiveRole={effectiveRole} organizations={organizations as any} dealStages={dealStages} />
            ) : (
                <DealBoard data={deals as any} effectiveRole={effectiveRole} organizations={organizations as any} dealStages={dealStages} />
            )}
        </div>
    );
}


import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole, getScopeWhere } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArchiveX } from "lucide-react";
import { LostDealsList } from "@/components/deals/lost-deals-list";

export const dynamic = "force-dynamic";

export default async function ClosedLostPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) {
        redirect("/dashboard");
    }

    const effectiveRole = await getEffectiveRole(user);
    const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

    const archivedDeals = await prisma.deal.findMany({
        where: {
            ...scopeWhere,
            customStage: "ARCHIVED"
        },
        include: {
            owner: { select: { name: true, email: true } },
            organization: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" }
    });

    const workspace = await prisma.workspace.findUnique({
        where: { id: (user as any).activeWorkspaceId || "" }
    });
    const dealStages = (workspace as any)?.dealStages || null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-1">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex flex-wrap items-center gap-2 sm:gap-3">
                        Closed-Lost Archive
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-500/10 text-stone-600 border border-stone-500/20 text-[10px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap">
                            {archivedDeals.length} Archived
                        </span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed max-w-2xl">
                        Historical timeline of deals that were marked as lost and archived from the board.
                    </p>
                </div>
            </div>

            <LostDealsList 
                archivedDeals={archivedDeals as any} 
                effectiveRole={effectiveRole}
                dealStages={dealStages}
            />
        </div>
    );
}

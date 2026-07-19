import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole, getScopeWhere } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, UserCircle } from "lucide-react";
import { OrdersList } from "@/components/deals/orders-list";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) {
        redirect("/dashboard");
    }

    const effectiveRole = await getEffectiveRole(user);
    const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

    const onboardedDeals = await prisma.deal.findMany({
        where: {
            ...scopeWhere,
            customStage: "ONBOARDED"
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
            <div className="flex items-center justify-between mb-8 flex-col items-start gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        Orders Control
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold tracking-wider uppercase">
                            {onboardedDeals.length} Orders
                        </span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage confirmed sales and track deals currently in the fulfillment process.
                    </p>
                </div>
            </div>

            <OrdersList 
                onboardedDeals={onboardedDeals as any[]} 
                effectiveRole={effectiveRole}
                dealStages={dealStages}
            />
        </div>
    );
}

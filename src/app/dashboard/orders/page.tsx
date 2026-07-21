import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole, getScopeWhere } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, UserCircle, ClipboardCheck } from "lucide-react";
import { OrdersList } from "@/components/deals/orders-list";
import { PageHeader } from "@/components/dashboard/page-header";

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
            <PageHeader
                icon={<ClipboardCheck />}
                theme="navy"
                title="Orders Control"
                subtitle="Manage confirmed sales and track deals currently in the fulfillment process."
                badgeText={`${onboardedDeals.length} Orders`}
            />

            <OrdersList 
                onboardedDeals={onboardedDeals as any[]} 
                effectiveRole={effectiveRole}
                dealStages={dealStages}
            />
        </div>
    );
}

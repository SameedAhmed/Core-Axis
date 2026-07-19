import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole, getScopeWhere } from "@/lib/permissions";
import { PerformanceHub } from "@/components/activities/performance-hub";
import { getMonthlyTargets } from "@/lib/actions/targets";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({
        where: { email: session?.user?.email || "" }
    });

    if (!user) {
        redirect("/dashboard");
    }

    const effectiveRole = await getEffectiveRole(user);
    const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

    const leads = await prisma.lead.findMany({
        where: scopeWhere,
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });

    const deals = await prisma.deal.findMany({
        where: scopeWhere,
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });
    
    // Fetch all workspace users to let managers set individual targets
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: (user as any).activeWorkspaceId },
        include: { user: { select: { id: true, name: true, role: true } } }
    });
    const workspaceUsers = members.map((m: any) => ({ 
        id: m.user.id, 
        name: m.user.name || "Unknown", 
        role: m.role || "REP" 
    }));

    const targets = await getMonthlyTargets();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Performance Hub</h1>
                <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed max-w-2xl">
                    Track vital sales metrics, team leadership, and individual progress.
                </p>
            </div>
            
            <div className="animate-in fade-in duration-300">
                <PerformanceHub 
                    currentUser={user} 
                    effectiveRole={effectiveRole} 
                    leads={leads as any} 
                    deals={deals as any} 
                    targets={targets} 
                    workspaceUsers={workspaceUsers} 
                />
            </div>
        </div>
    );
}

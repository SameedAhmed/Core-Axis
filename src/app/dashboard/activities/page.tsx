import { prisma } from "@/lib/prisma";
import { CreateActivityDialog } from "@/components/activities/create-activity-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { AuditLogTable } from "@/components/activities/audit-log-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Activity as ActivityIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { getEffectiveRole, getScopeWhere } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({
        where: { email: session?.user?.email || "" }
    });

    const effectiveRole = await getEffectiveRole(user);

    if (!user || effectiveRole === "REP") {
        redirect("/dashboard");
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";
    const isSuperAdmin = user.email === superAdminEmail;

    const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

    // Apply strict workspace isolation to Activities and AuditLogs too!
    const activityWhere: any = { ...scopeWhere };
    
    // Hide super admin internal activities from standard workspace admins
    if (!isSuperAdmin) {
        activityWhere.user = { email: { not: superAdminEmail } };
    }

    const activities = await prisma.activity.findMany({
        where: activityWhere,
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { name: true } },
            lead: true,
            deal: true,
        },
    });

    // @ts-ignore
    const auditLogs = await prisma.auditLog.findMany({
        where: activityWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            user: { select: { name: true, email: true } }
        }
    });

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

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={<ActivityIcon />}
                theme="navy"
                title="Activity & Audit Center"
                subtitle="Track sales interactions and system-wide user actions."
                actions={
                <div className="w-full sm:w-auto">
                    <CreateActivityDialog leads={leads as any} deals={deals as any} />
                </div>
                }
            />

            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="bg-muted p-1 rounded-xl mb-6 w-full">
                    <TabsTrigger value="sales" className="rounded-lg px-2 sm:px-6 flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-2 text-muted-foreground text-xs sm:text-sm">
                        <ActivityIcon className="w-4 h-4" />
                        Sales Activities
                    </TabsTrigger>
                    {effectiveRole === "ADMIN" && (
                        <TabsTrigger value="system" className="rounded-lg px-2 sm:px-6 flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-2 text-muted-foreground text-xs sm:text-sm">
                            <History className="w-4 h-4" />
                            System Audit Logs
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="sales" className="mt-0 space-y-4">
                    <ActivityTimeline activities={activities as any} />
                </TabsContent>

                {effectiveRole === "ADMIN" && (
                    <TabsContent value="system" className="mt-0">
                        <AuditLogTable data={auditLogs as any} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

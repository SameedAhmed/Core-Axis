import { prisma } from "@/lib/prisma";
import { OrganizationList } from "@/components/organizations/organization-list";
import { CreateOrgDialog } from "@/components/organizations/create-org-dialog";
import { ImportOrgsDialog } from "@/components/organizations/import-orgs-dialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const effectiveRole = await getEffectiveRole(user);

    const organizations = await prisma.organization.findMany({
        where: getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId),
        include: { leads: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-4 sm:p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        Organizations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed max-w-2xl">
                        Manage company accounts and institutional profiles.
                    </p>
                </div>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex-1 sm:flex-none">
                        <ImportOrgsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateOrgDialog />
                    </div>
                </div>
            </div>

            <OrganizationList data={organizations} />
        </div>
    );
}

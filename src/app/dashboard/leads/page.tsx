import { prisma } from "@/lib/prisma";
import { LeadList } from "@/components/leads/lead-list";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import { getLeadFormSuggestions } from "@/lib/actions/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const effectiveRole = await getEffectiveRole(user);

    const [leads, organizations, suggestionsRes] = await Promise.all([
        prisma.lead.findMany({
            where: getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId),
            include: { 
                organization: { select: { id: true, name: true } },
                owner: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.organization.findMany({
            where: { workspaceId: (user as any).activeWorkspaceId },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }),
        getLeadFormSuggestions()
    ]);

    const suggestions = suggestionsRes.success && suggestionsRes.data 
        ? suggestionsRes.data 
        : { services: [], sources: [] };


    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-4 sm:p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Leads</h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Manage and track your incoming prospects.</p>
                </div>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                        <ImportLeadsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateLeadDialog organizations={organizations as any} suggestions={suggestions} />
                    </div>
                </div>
            </div>
            <LeadList data={leads} organizations={organizations as any} suggestions={suggestions} />
        </div>
    );
}

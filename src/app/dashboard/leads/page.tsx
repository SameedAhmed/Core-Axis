import { prisma } from "@/lib/prisma";
import { LeadList } from "@/components/leads/lead-list";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import { getLeadFormSuggestions } from "@/lib/actions/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadIntelligencePanel } from "@/components/leads/lead-intelligence-panel";
import { getLeadScores } from "@/lib/actions/lead-intelligence";
import { Users } from "lucide-react";

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

    const scoresRes = await getLeadScores();
    const leadScores = scoresRes.success && scoresRes.data ? scoresRes.data.scores : undefined;

    return (
        <div className="space-y-6 flex flex-col h-full">
            <PageHeader
                icon={<Users />}
                theme="navy"
                title="Leads"
                subtitle="Manage and track your incoming prospects."
                actions={
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                        <ImportLeadsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateLeadDialog organizations={organizations as any} suggestions={suggestions} />
                    </div>
                </div>
                }
            />
            {scoresRes.success && scoresRes.data && leads.length > 0 && (
                <LeadIntelligencePanel result={scoresRes.data} leads={leads as any} />
            )}
            <LeadList data={leads} organizations={organizations as any} suggestions={suggestions} leadScores={leadScores} />
        </div>
    );
}

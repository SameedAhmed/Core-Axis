import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LeadDetailsView } from "@/components/leads/lead-details-view";
import { markLeadAsViewed } from "@/lib/actions/leads";

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const { id } = await params;
    
    // Authorization check
    const effectiveRole = await getEffectiveRole(user);
    const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
            organization: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } }
        }
    });

    if (!lead) return notFound();

    // Verify access
    if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGER" && lead.ownerId !== user.id) {
        return <div className="p-10 text-center">Unauthorized access to this lead.</div>;
    }

    // Auto-view logic: if lead is currently unread (isViewed is false), mark as viewed
    if (!lead.isViewed) {
        // Run as a background task to not block the main UI render
        markLeadAsViewed(id).catch(err => console.error("View update failure:", err));
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
             <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between">
                <Link href="/dashboard/leads">
                    <Button variant="ghost" size="sm" className="gap-2 font-semibold">
                         <ChevronLeft className="w-4 h-4" /> Back to Leads
                    </Button>
                </Link>
                <div className="text-xs text-muted-foreground font-mono">
                    ID: {lead.id}
                </div>
             </div>
             <div className="flex-1 overflow-hidden">
                <LeadDetailsView lead={lead} />
             </div>
        </div>
    );
}

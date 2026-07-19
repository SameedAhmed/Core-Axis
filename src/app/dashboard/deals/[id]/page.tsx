import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DealDetailsView } from "@/components/deals/deal-details-view";

export default async function DealDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const { id } = await params;
    
    // Authorization check
    const effectiveRole = await getEffectiveRole(user);
    const deal = await prisma.deal.findUnique({
        where: { id },
        include: {
            organization: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true, email: true } }
        }
    });

    if (!deal) return notFound();

    // Verify access
    if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGER" && deal.ownerId !== user.id) {
        return <div className="p-10 text-center">Unauthorized access to this deal.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
             <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between">
                <Link href="/dashboard/deals">
                    <Button variant="ghost" size="sm" className="gap-2 font-semibold">
                         <ChevronLeft className="w-4 h-4" /> Back to Deals
                    </Button>
                </Link>
                <div className="text-xs text-muted-foreground font-mono">
                    ID: {deal.id}
                </div>
             </div>
             <div className="flex-1 overflow-hidden">
                <DealDetailsView deal={deal as any} />
             </div>
        </div>
    );
}

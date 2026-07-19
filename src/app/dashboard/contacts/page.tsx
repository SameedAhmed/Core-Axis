import { prisma } from "@/lib/prisma";
import { ContactList } from "@/components/leads/contact-list";
import { CreateContactDialog } from "@/components/leads/create-contact-dialog";
import { ImportContactsDialog } from "@/components/leads/import-contacts-dialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import { UserCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (!user) return <div>Access Denied</div>;

    const effectiveRole = await getEffectiveRole(user);

    const [contacts, organizations] = await Promise.all([
        prisma.contact.findMany({
            where: getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId),
            include: { 
                organization: { select: { id: true, name: true } },
                owner: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.organization.findMany({
            where: { workspaceId: (user as any).activeWorkspaceId },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        })
    ]);

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-4 sm:p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                        <UserCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        Contacts
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Manage your people and relationships across all workspaces.</p>
                </div>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex-1 sm:flex-none">
                        <ImportContactsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateContactDialog organizations={organizations as any} />
                    </div>
                </div>
            </div>
            
            <ContactList data={contacts} organizations={organizations as any} />
        </div>
    );
}

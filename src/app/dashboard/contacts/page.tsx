import { prisma } from "@/lib/prisma";
import { ContactList } from "@/components/leads/contact-list";
import { CreateContactDialog } from "@/components/leads/create-contact-dialog";
import { ImportContactsDialog } from "@/components/leads/import-contacts-dialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import { UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

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
            <PageHeader
                icon={<UserCircle2 />}
                theme="navy"
                title="Contacts"
                subtitle="Manage your people and relationships across all workspaces."
                actions={
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex-1 sm:flex-none">
                        <ImportContactsDialog />
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <CreateContactDialog organizations={organizations as any} />
                    </div>
                </div>
                }
            />
            
            <ContactList data={contacts} organizations={organizations as any} />
        </div>
    );
}

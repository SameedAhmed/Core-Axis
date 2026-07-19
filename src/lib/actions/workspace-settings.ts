"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Update workspace organizational settings.
 */
export async function updateWorkspaceSettings(data: {
    id: string;
    name: string;
    description?: string;
    website?: string;
    industry?: string;
    timezone?: string;
    currency?: string;
    logo?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { success: false, error: "Authentication required." };
    }

    try {
        // Verify ownership/admin rights/super admin status
        const isSuper = (session.user as any).email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        let authorized = isSuper;

        if (!authorized) {
            const member = await prisma.workspaceMember.findFirst({
                where: {
                    workspaceId: data.id,
                    userId: (session.user as any).id,
                    role: "ADMIN"
                }
            });
            const workspace = await prisma.workspace.findUnique({ where: { id: data.id } });
            
            if (member || (workspace && workspace.ownerId === (session.user as any).id)) {
                authorized = true;
            }
        }

        if (!authorized) {
            return { success: false, error: "Unauthorized. Admin rights required." };
        }

        await prisma.workspace.update({
            where: { id: data.id },
            data: {
                name: data.name,
                description: data.description,
                website: data.website,
                industry: data.industry,
                timezone: data.timezone || "UTC",
                currency: data.currency || "USD",
                logo: data.logo
            }
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Workspace Update Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePaymentProvider(workspaceId: string, provider: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Authentication required." };

    try {
        const workspace = await (prisma as any).workspace.findUnique({
            where: { id: workspaceId },
            include: { account: true }
        });

        if (!workspace?.accountId) {
             return { success: false, error: "Subscription account not linked to this workspace." };
        }

        await (prisma as any).subscriptionAccount.update({
            where: { id: workspace.accountId },
            data: { paymentProvider: provider }
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Payment Provider Update Error:", error);
        return { success: false, error: error.message };
    }
}

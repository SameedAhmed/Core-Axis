"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getMonthlyTargets(): Promise<Record<string, number>> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return {};
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user || !(user as any).activeWorkspaceId) return {};

        const targetSetting = await prisma.integration.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: (user as any).activeWorkspaceId,
                    provider: "TARGET_SETTINGS"
                }
            }
        });

        if (targetSetting?.apiKey) {
            return JSON.parse(targetSetting.apiKey);
        }
    } catch (e) {
        console.error("Failed to fetch custom targets", e);
    }
    return {};
}

export async function updateUserTarget(targetUserId: string, newTarget: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user || !(user as any).activeWorkspaceId) throw new Error("No active workspace");

        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGER") {
            throw new Error("Only managers can update monthly targets");
        }

        const workspaceId = (user as any).activeWorkspaceId;

        const currentSetting = await prisma.integration.findUnique({
            where: { workspaceId_provider: { workspaceId, provider: "TARGET_SETTINGS" } }
        });

        const targetsMap = currentSetting?.apiKey ? JSON.parse(currentSetting.apiKey) : {};
        targetsMap[targetUserId] = newTarget;

        await prisma.integration.upsert({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider: "TARGET_SETTINGS"
                }
            },
            update: {
                apiKey: JSON.stringify(targetsMap)
            },
            create: {
                workspaceId,
                provider: "TARGET_SETTINGS",
                apiKey: JSON.stringify(targetsMap),
                isActive: true
            }
        });

        revalidatePath("/dashboard/performance");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "./audit";
import { scoreResumeAgainstRole } from "@/lib/ai/embeddings";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

export async function getCandidates() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const candidates = await (prisma as any).candidate.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: candidates };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch candidates", data: [] };
    }
}

const candidateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    appliedRole: z.string().min(1, "Applied role is required"),
    resumeText: z.string().optional().default(""),
});

export async function createCandidate(rawData: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (!workspaceId) throw new Error("No active workspace");

        const data = candidateSchema.parse(rawData);

        const candidate = await (prisma as any).candidate.create({
            data: {
                name: data.name,
                email: data.email,
                appliedRole: data.appliedRole,
                resumeText: data.resumeText || null,
                workspaceId,
            },
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "CANDIDATE",
            entityId: candidate.id,
            details: `Added candidate: ${candidate.name} (${candidate.appliedRole})`,
        });

        revalidatePath("/dashboard/hr/recruitment");
        return { success: true, data: candidate };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to add candidate" };
    }
}

/**
 * Runs the local pretrained-model AI screening for a single candidate,
 * comparing their resume/skills text against the role they applied for,
 * and persists the resulting score + rationale.
 */
export async function scoreCandidate(candidateId: string, roleDescription?: string) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const candidate = await (prisma as any).candidate.findFirst({
            where: { id: candidateId, workspaceId },
        });
        if (!candidate) throw new Error("Candidate not found");

        const resumeText = (candidate.resumeText || "").trim();
        if (!resumeText) {
            throw new Error("This candidate has no resume/skills text to screen. Add some first.");
        }

        const roleText = (roleDescription && roleDescription.trim()) || candidate.appliedRole;

        const { score, reason } = await scoreResumeAgainstRole(resumeText, roleText);

        const updated = await (prisma as any).candidate.update({
            where: { id: candidateId },
            data: { aiScore: score, aiScoreReason: reason },
        });

        await createAuditLog({
            action: "AI_SCORE",
            entityType: "CANDIDATE",
            entityId: candidateId,
            details: `AI-screened ${candidate.name}: score ${score} (${reason})`,
        });

        revalidatePath("/dashboard/hr/recruitment");
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to run AI screening" };
    }
}

export async function updateCandidateStatus(candidateId: string, status: string) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const candidate = await (prisma as any).candidate.findFirst({
            where: { id: candidateId, workspaceId },
        });
        if (!candidate) throw new Error("Candidate not found");

        const updated = await (prisma as any).candidate.update({
            where: { id: candidateId },
            data: { status: status as any },
        });

        revalidatePath("/dashboard/hr/recruitment");
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update candidate status" };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import {
    trainLeadModel,
    scoreLead,
    type LeadFeatures,
    type ScoredLead,
} from "@/lib/ai/lead-scoring";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user;
}

function daysSince(date: Date): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

function leadToFeatures(lead: any, activityCount: number): LeadFeatures {
    return {
        source: lead.source || null,
        quotation: lead.quotation ?? null,
        activityCount,
        hasEmail: !!lead.email,
        hasPhone: !!lead.phone,
        hasOrganization: !!lead.organizationId,
        hasRemarks: !!(lead.remarks && lead.remarks.trim()),
        ageDays: daysSince(lead.createdAt),
    };
}

export interface LeadScoreResult {
    scores: Record<string, ScoredLead>; // leadId -> score
    model: {
        method: "model" | "heuristic";
        trainable: boolean;
        trainSize: number;
        hotCount: number;
        coldCount: number;
        accuracy: number | null;
        scoredCount: number;
        hotLeads: number;
        warmLeads: number;
        coldLeads: number;
    };
}

/**
 * Trains the lead-conversion Naive Bayes model on the workspace's own resolved
 * leads and scores every lead. Resolved-lead labeling:
 *   - hot  = reached QUALIFIED or CONVERTED
 *   - cold = still NEW/CONTACTED after 30+ days (had time to progress, didn't)
 * Fresh NEW/CONTACTED leads are unresolved, so they're scored but not used as
 * training labels.
 */
export async function getLeadScores(): Promise<{ success: boolean; data?: LeadScoreResult; error?: string }> {
    try {
        const user = await requireUser();
        const effectiveRole = await getEffectiveRole(user);
        const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

        const leads = await prisma.lead.findMany({
            where: scopeWhere,
            select: {
                id: true,
                email: true,
                phone: true,
                quotation: true,
                remarks: true,
                status: true,
                source: true,
                organizationId: true,
                createdAt: true,
                _count: { select: { activities: true } },
            },
        });

        // Build labeled training set from resolved leads only.
        const labeled = leads
            .map((l) => {
                const features = leadToFeatures(l, l._count.activities);
                const isHot = l.status === "QUALIFIED" || l.status === "CONVERTED";
                const isColdStalled = (l.status === "NEW" || l.status === "CONTACTED") && features.ageDays >= 30;
                if (isHot) return { features, label: "hot" as const };
                if (isColdStalled) return { features, label: "cold" as const };
                return null;
            })
            .filter((x): x is { features: LeadFeatures; label: "hot" | "cold" } => x !== null);

        const trained = trainLeadModel(labeled);

        const scores: Record<string, ScoredLead> = {};
        let hotLeads = 0;
        let warmLeads = 0;
        let coldLeads = 0;
        for (const l of leads) {
            const scored = scoreLead(trained, leadToFeatures(l, l._count.activities));
            scores[l.id] = scored;
            if (scored.band === "HOT") hotLeads++;
            else if (scored.band === "WARM") warmLeads++;
            else coldLeads++;
        }

        return {
            success: true,
            data: {
                scores,
                model: {
                    method: trained.trainable ? "model" : "heuristic",
                    trainable: trained.trainable,
                    trainSize: trained.trainSize,
                    hotCount: trained.hotCount,
                    coldCount: trained.coldCount,
                    accuracy: trained.accuracy,
                    scoredCount: leads.length,
                    hotLeads,
                    warmLeads,
                    coldLeads,
                },
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to score leads" };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "./audit";
import {
    parseCsvLineItems,
    parseExcelLineItems,
    extractLineItemsLocally,
    extractLineItemsWithAI,
    analyzeLineItems,
    generateLocalNarrative,
    enhanceNarrativeWithAI,
    type FinancialLineItem,
    type FinancialAnalysisResult,
} from "@/lib/ai/financial-intelligence";
import { evaluateModel } from "@/lib/ai/naive-bayes";
import { FINANCIAL_TRAINING_DATA } from "@/lib/ai/financial-training-data";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

/**
 * Returns the Naive Bayes classifier's measured performance on a held-out
 * test split of our own labeled dataset, plus a sample of the training data
 * so it can be shown in the UI. This is real evaluation, computed live from
 * the actual dataset — not a hardcoded figure.
 */
export async function getModelPerformance() {
    try {
        await requireUser();
        const evaluation = evaluateModel(FINANCIAL_TRAINING_DATA);
        const sample = FINANCIAL_TRAINING_DATA.filter((_, i) => i % 17 === 0).slice(0, 12);
        return { success: true, data: { evaluation, sample } };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to evaluate model" };
    }
}

interface AnalyzeInput {
    inputType: "csv" | "excel" | "pdf" | "text";
    text?: string; // for "csv" and "text" input types
    fileBase64?: string; // for "excel" and "pdf" input types
}

export async function extractPdfText(fileBase64: string) {
    try {
        await requireUser();
        const { PDFParse } = await import("pdf-parse");
        const buffer = Buffer.from(fileBase64, "base64");
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return { success: true, text: result.text };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to extract PDF text" };
    }
}

export async function analyzeFinancialData(input: AnalyzeInput) {
    try {
        await requireUser();

        let items: FinancialLineItem[] = [];

        if (input.inputType === "csv") {
            if (!input.text) throw new Error("No CSV data provided");
            items = parseCsvLineItems(input.text);
        } else if (input.inputType === "excel") {
            if (!input.fileBase64) throw new Error("No Excel file provided");
            const buffer = Buffer.from(input.fileBase64, "base64");
            items = parseExcelLineItems(buffer);
        } else if (input.inputType === "pdf") {
            if (!input.fileBase64) throw new Error("No PDF file provided");
            const { PDFParse } = await import("pdf-parse");
            const buffer = Buffer.from(input.fileBase64, "base64");
            const parser = new PDFParse({ data: buffer });
            const extracted = await parser.getText();
            items = extractLineItemsLocally(extracted.text);
        } else if (input.inputType === "text") {
            if (!input.text) throw new Error("No text provided");
            items = extractLineItemsLocally(input.text);
        } else {
            throw new Error("Unknown input type");
        }

        if (items.length === 0) {
            throw new Error("No revenue or expense line items could be identified in this input. Try a clearer format (e.g. columns: Department, Amount, Type, or sentences with a dollar amount).");
        }

        // Fully local by default: deterministic extraction/math + our own
        // trained Naive Bayes classifier + rule-based narrative templates.
        // No external API call happens anywhere in this path.
        const analysis = analyzeLineItems(items);
        const narrative = generateLocalNarrative(analysis);

        return { success: true, data: { ...analysis, ...narrative, itemCount: items.length, aiEnhanced: false } };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to analyze financial data" };
    }
}

/**
 * Optional: re-runs extraction (if free text) with Gemini and regenerates
 * the narrative with Gemini, for a more natural-language result. Only ever
 * called when the user explicitly clicks "Enhance with AI" — the default
 * analyzeFinancialData() flow above never depends on this.
 */
export async function enhanceReportWithAI(inputText: string | null, currentResult: FinancialAnalysisResult) {
    try {
        await requireUser();

        let items: FinancialLineItem[] | null = null;
        if (inputText) {
            items = await extractLineItemsWithAI(inputText);
        }

        const analysis = items && items.length > 0 ? analyzeLineItems(items) : currentResult;
        const narrative = await enhanceNarrativeWithAI(analysis);

        return { success: true, data: { ...analysis, ...narrative, itemCount: items?.length ?? (currentResult as any).itemCount, aiEnhanced: true } };
    } catch (error: any) {
        return { success: false, error: error.message || "AI enhancement unavailable — check GEMINI_API_KEY and connectivity." };
    }
}

export async function saveFinancialReport(name: string, result: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (!workspaceId) throw new Error("No active workspace");

        const report = await (prisma as any).financialReport.create({
            data: {
                name: name || `Analysis ${new Date().toLocaleDateString()}`,
                status: result.status,
                revenue: result.revenue,
                expenses: result.expenses,
                netProfit: result.netProfit,
                departments: result.departments,
                recommendations: {
                    executiveSummary: result.executiveSummary,
                    riskFactors: result.riskFactors,
                    strategicAdvice: result.strategicAdvice,
                    departmentActions: result.departmentActions,
                    metrics: result.metrics,
                    chartData: result.chartData,
                },
                workspaceId,
            },
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "FINANCIAL_REPORT",
            entityId: report.id,
            details: `Saved AI financial analysis: ${report.name} (${report.status})`,
        });

        revalidatePath("/dashboard/finance/analyst");
        return { success: true, data: report };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to save report" };
    }
}

export async function getFinancialReports() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const reports = await (prisma as any).financialReport.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return { success: true, data: reports };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch reports", data: [] };
    }
}

export async function deleteFinancialReport(id: string) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        await (prisma as any).financialReport.deleteMany({ where: { id, workspaceId } });

        revalidatePath("/dashboard/finance/analyst");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete report" };
    }
}

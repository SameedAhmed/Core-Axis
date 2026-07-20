"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { askGemini, type FunctionDeclaration } from "@/lib/ai/gemini";
import { getFinanceOverview, createExpense } from "./finance";
import { getInventoryOverview, recordStockMovement } from "./inventory";
import { getAttendanceOverview } from "./hr";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

// --- Tool declarations -----------------------------------------------------
// Deliberately small and explicit: two tools, each mapping 1:1 onto an
// already-tested server action (createExpense, recordStockMovement). The
// model can only ever *propose* a call to one of these — see askAssistant()
// below, which never executes a tool itself. Execution happens exclusively
// in confirmAssistantAction(), and only after the user clicks Confirm.

const TOOLS: FunctionDeclaration[] = [
    {
        name: "log_expense",
        description: "Log a new business expense in the Finance module.",
        parameters: {
            type: "OBJECT",
            properties: {
                title: { type: "STRING", description: "Short description of the expense" },
                amount: { type: "NUMBER", description: "Amount in dollars" },
                category: { type: "STRING", description: "Category, e.g. Software, Marketing, Travel, Facilities, Hardware" },
            },
            required: ["title", "amount", "category"],
        },
    },
    {
        name: "receive_stock",
        description: "Record newly received stock for an existing inventory product (a stock-in movement).",
        parameters: {
            type: "OBJECT",
            properties: {
                productName: { type: "STRING", description: "Name (or close match) of the product" },
                quantity: { type: "NUMBER", description: "Quantity received" },
            },
            required: ["productName", "quantity"],
        },
    },
];

function describeAction(name: string, args: any): string {
    if (name === "log_expense") {
        return `Log expense: "${args.title}" — $${Number(args.amount).toFixed(2)} (${args.category})`;
    }
    if (name === "receive_stock") {
        return `Receive stock: +${args.quantity} units of "${args.productName}"`;
    }
    return `Run ${name}`;
}

/**
 * Basic AI assistant for system navigation and data questions (per project
 * scope: an "advanced NLP chatbot" is explicitly out of scope). Real
 * workspace data is summarized into the prompt so answers are grounded in
 * what's actually in the database. It may also propose ONE of the two tools
 * above — but only ever proposes; the caller must call
 * confirmAssistantAction() to actually execute it.
 */
export async function askAssistant(message: string) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const [finance, inventory, attendance, leadCount, dealCount, candidateCount] = await Promise.all([
            getFinanceOverview(),
            getInventoryOverview(),
            getAttendanceOverview(),
            prisma.lead.count({ where: { workspaceId } }),
            prisma.deal.count({ where: { workspaceId } }),
            (prisma as any).candidate.count({ where: { workspaceId } }),
        ]);

        const financeSummary = finance.success && finance.data
            ? `Total revenue (6mo): $${finance.data.totalRevenue.toFixed(2)}. Total expenses (6mo): $${finance.data.totalExpenses.toFixed(2)}. Forecasted next month's expenses: $${finance.data.forecastNextMonth.toFixed(2)} (trend: ${finance.data.trend}). Flagged expense anomalies: ${finance.data.anomalies.length}.`
            : "Finance data unavailable.";

        const inventorySummary = inventory.success && inventory.data
            ? `${inventory.data.totalProducts} products tracked: ${inventory.data.products.map((p: any) => p.name).join(", ") || "none"}. ${inventory.data.lowStockCount} need reordering. Total stock value: $${inventory.data.totalStockValue.toFixed(2)}.`
            : "Inventory data unavailable.";

        const attendanceSummary = attendance.success && attendance.data
            ? `Team size: ${attendance.data.totalMembers}. Present today: ${attendance.data.presentToday}. Absent today: ${attendance.data.absentToday}. Flagged attendance anomalies: ${attendance.data.anomalies.length}.`
            : "Attendance data unavailable.";

        const systemContext = `You are the built-in AI assistant for CoreAxis, a Business Automation System (BAS). Answer the user's question using ONLY the real workspace data summarized below. Be concise (2-4 sentences). If the question can't be answered from this data, say so plainly instead of guessing.

If — and only if — the user is clearly asking you to record/log/add something (an expense, or received stock), call the matching tool instead of replying in text. Otherwise, always reply in plain text. Never call a tool for a question that's just asking for information.

Workspace snapshot:
- Sales/CRM: ${leadCount} leads, ${dealCount} deals in pipeline.
- Finance: ${financeSummary}
- Inventory: ${inventorySummary}
- HR/Attendance: ${attendanceSummary}
- Recruitment: ${candidateCount} candidates in the pipeline.`;

        const result = await askGemini(systemContext, message, TOOLS);

        if (result.type === "functionCall") {
            return {
                success: true,
                kind: "confirm" as const,
                action: { name: result.name, args: result.args },
                label: describeAction(result.name, result.args),
            };
        }

        return { success: true, kind: "text" as const, reply: result.text };
    } catch (error: any) {
        return { success: false, error: error.message || "The assistant is unavailable right now." };
    }
}

/**
 * Executes a tool the assistant proposed — ONLY called after the user
 * explicitly clicks "Confirm" in the UI. Re-validates everything server-side;
 * never trusts the proposed args blindly.
 */
export async function confirmAssistantAction(name: string, args: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        if (name === "log_expense") {
            const res = await createExpense({
                title: String(args.title || "").slice(0, 200),
                amount: args.amount,
                category: String(args.category || "Other").slice(0, 100),
            });
            if (!res.success) throw new Error(res.error);
            return { success: true, message: `Logged expense: ${args.title} ($${Number(args.amount).toFixed(2)})` };
        }

        if (name === "receive_stock") {
            const productName = String(args.productName || "").toLowerCase();
            const products = await (prisma as any).product.findMany({ where: { workspaceId } });
            const matches = products.filter((p: any) => p.name.toLowerCase().includes(productName) || productName.includes(p.name.toLowerCase()));

            if (matches.length === 0) {
                throw new Error(`No product matching "${args.productName}" found in your inventory.`);
            }
            if (matches.length > 1) {
                throw new Error(`Multiple products match "${args.productName}": ${matches.map((m: any) => m.name).join(", ")}. Be more specific.`);
            }

            const res = await recordStockMovement(matches[0].id, "IN", Number(args.quantity), "Added via AI assistant");
            if (!res.success) throw new Error(res.error);
            const newStock = matches[0].currentStock + Number(args.quantity);
            return { success: true, message: `Received ${args.quantity} units of ${matches[0].name}. New stock level: ${newStock}.` };
        }

        throw new Error(`Unknown action: ${name}`);
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to execute action" };
    }
}

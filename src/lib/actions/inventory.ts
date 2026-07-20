"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "./audit";
import { holtForecast } from "@/lib/ai/forecast";

// Assumed supplier lead time used for reorder-point / safety-stock math.
// A real system would source this per-supplier; this is a documented,
// reasonable default for an SME with no supplier-lead-time data modeled yet.
const LEAD_TIME_WEEKS = 2;
// z-score for a ~95% service level (standard value in inventory theory —
// probability that stock does not run out before the next delivery).
const SERVICE_LEVEL_Z = 1.65;

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

function weekKey(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // ISO-ish week bucket: days since epoch / 7
    const daysSinceEpoch = Math.floor(d.getTime() / 86400000);
    return Math.floor(daysSinceEpoch / 7);
}

/**
 * Loads real Product + StockMovement data for the workspace, and for each
 * product fits a Holt's linear trend (double exponential smoothing) model
 * over its trailing weekly OUT (sold/consumed) quantities to forecast next
 * week's demand — weighting recent weeks more heavily than older ones, and
 * tracking trend separately from level. The forecast's residual error is
 * then used to compute a safety stock buffer and a suggested reorder
 * quantity via the standard reorder-point formula (demand over lead time +
 * safety stock), not just a binary low-stock flag.
 */
export async function getInventoryOverview() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const products = await (prisma as any).product.findMany({
            where: { workspaceId },
            orderBy: { name: "asc" },
        });

        const sixWeeksAgo = new Date();
        sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

        const movements = await (prisma as any).stockMovement.findMany({
            where: { workspaceId, date: { gte: sixWeeksAgo } },
            orderBy: { date: "asc" },
        });

        const movementsByProduct = new Map<string, any[]>();
        for (const m of movements) {
            const arr = movementsByProduct.get(m.productId) || [];
            arr.push(m);
            movementsByProduct.set(m.productId, arr);
        }

        const currentWeek = weekKey(new Date());

        const productInsights = products.map((p: any) => {
            const productMovements = movementsByProduct.get(p.id) || [];

            // Build the last 6 weekly buckets of OUT quantity (demand), oldest first.
            const weeklyDemand: number[] = [];
            for (let i = 5; i >= 0; i--) {
                const bucket = currentWeek - i;
                const qty = productMovements
                    .filter((m: any) => m.type === "OUT" && weekKey(new Date(m.date)) === bucket)
                    .reduce((sum: number, m: any) => sum + m.quantity, 0);
                weeklyDemand.push(qty);
            }

            const { nextValue: forecastedWeeklyDemand, trend, residualStdDev } = holtForecast(weeklyDemand);
            const roundedForecast = Math.round(forecastedWeeklyDemand);

            // Safety stock: buffer against demand variability during the lead time,
            // sized to the forecast's own residual error rather than a guess.
            const safetyStock = Math.round(SERVICE_LEVEL_Z * residualStdDev * Math.sqrt(LEAD_TIME_WEEKS));
            // Reorder point: expected demand across the supplier lead time, plus the safety buffer.
            const reorderPoint = roundedForecast * LEAD_TIME_WEEKS + safetyStock;
            const suggestedReorderQty = Math.max(0, reorderPoint - p.currentStock);

            const weeksOfStockLeft = roundedForecast > 0 ? p.currentStock / roundedForecast : Infinity;
            const willStockOutSoon = weeksOfStockLeft < 3;
            const belowReorderLevel = p.currentStock <= p.reorderLevel;
            const belowReorderPoint = p.currentStock < reorderPoint;

            let recommendation: string | null = null;
            if (belowReorderLevel || belowReorderPoint) {
                recommendation = `Order ${suggestedReorderQty} units — covers ${LEAD_TIME_WEEKS}wk lead time at ~${roundedForecast}/wk demand plus a ${safetyStock}-unit safety buffer.`;
            } else if (willStockOutSoon) {
                recommendation = `At the forecasted demand of ~${roundedForecast}/week, stock will run out in ~${weeksOfStockLeft.toFixed(1)} weeks.`;
            }

            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                category: p.category,
                currentStock: p.currentStock,
                reorderLevel: p.reorderLevel,
                unitPrice: p.unitPrice,
                weeklyDemand,
                forecastedWeeklyDemand: roundedForecast,
                trend: trend > 0.3 ? "up" : trend < -0.3 ? "down" : "flat",
                safetyStock,
                suggestedReorderQty,
                needsReorder: belowReorderLevel || belowReorderPoint || willStockOutSoon,
                recommendation,
            };
        });

        const lowStockCount = productInsights.filter((p: any) => p.needsReorder).length;
        const totalStockValue = products.reduce((sum: number, p: any) => sum + p.currentStock * p.unitPrice, 0);

        return {
            success: true,
            data: {
                products: productInsights,
                totalProducts: products.length,
                lowStockCount,
                totalStockValue,
                hasData: products.length > 0,
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to load inventory overview" };
    }
}

const productSchema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category: z.string().optional().default(""),
    currentStock: z.coerce.number().int().min(0).default(0),
    reorderLevel: z.coerce.number().int().min(0).default(10),
    unitPrice: z.coerce.number().min(0).default(0),
});

export async function createProduct(rawData: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (!workspaceId) throw new Error("No active workspace");

        const data = productSchema.parse(rawData);

        const product = await (prisma as any).product.create({
            data: {
                name: data.name,
                sku: data.sku,
                category: data.category || null,
                currentStock: data.currentStock,
                reorderLevel: data.reorderLevel,
                unitPrice: data.unitPrice,
                workspaceId,
            },
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "PRODUCT",
            entityId: product.id,
            details: `Added product: ${product.name} (${product.sku})`,
        });

        revalidatePath("/dashboard/inventory");
        return { success: true, data: product };
    } catch (error: any) {
        if (error.code === "P2002") {
            return { success: false, error: "A product with this SKU already exists." };
        }
        return { success: false, error: error.message || "Failed to create product" };
    }
}

export async function recordStockMovement(productId: string, type: "IN" | "OUT", quantity: number, note?: string) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const product = await (prisma as any).product.findFirst({ where: { id: productId, workspaceId } });
        if (!product) throw new Error("Product not found");

        if (quantity <= 0) throw new Error("Quantity must be positive");
        if (type === "OUT" && quantity > product.currentStock) {
            throw new Error(`Cannot remove ${quantity} units — only ${product.currentStock} in stock.`);
        }

        const newStock = type === "IN" ? product.currentStock + quantity : product.currentStock - quantity;

        const [movement] = await prisma.$transaction([
            (prisma as any).stockMovement.create({
                data: { productId, type, quantity, note: note || null, workspaceId },
            }),
            (prisma as any).product.update({
                where: { id: productId },
                data: { currentStock: newStock },
            }),
        ]);

        await createAuditLog({
            action: type === "IN" ? "STOCK_IN" : "STOCK_OUT",
            entityType: "PRODUCT",
            entityId: productId,
            details: `${type === "IN" ? "Received" : "Shipped"} ${quantity} x ${product.name}`,
        });

        revalidatePath("/dashboard/inventory");
        return { success: true, data: movement };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to record stock movement" };
    }
}

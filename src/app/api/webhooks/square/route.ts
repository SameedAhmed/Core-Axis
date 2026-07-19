import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { square } from "@/lib/square";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const eventType = body.type;

        // 1. Payment Created or Success (From Checkout Link)
        if (eventType === "payment.updated") {
            const payment = body.data.object.payment;
            
            // In a real Square webhook, you'd match the 'reference_id' or 'note'
            // For Square Payment Links, the order ID is usually the key.
            const orderId = payment.order_id;
            const status = payment.status;

            if (status === "COMPLETED") {
                // Fetch the order to find the metadata/workspaceId
                const { result } = await (square as any).ordersApi.retrieveOrder(orderId);
                const workspaceId = result.order.metadata?.workspace_id;
                const planTier = result.order.metadata?.plan_tier;

                if (workspaceId) {
                    const workspace = await prisma.workspace.findUnique({
                        where: { id: workspaceId },
                        include: { account: true }
                    });

                    if (workspace?.accountId) {
                        await (prisma as any).subscriptionAccount.update({
                            where: { id: workspace.accountId },
                            data: {
                                planTier: planTier || "FREE",
                                providerCustomerId: payment.customer_id || null,
                                hasPaymentSetup: true,
                                paymentProvider: "SQUARE"
                            }
                        });
                        console.log(`[SQUARE_WEBHOOK] Workspace ${workspaceId} upgraded to ${planTier}`);
                    }
                }
            }
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err: any) {
        console.error("[SQUARE_WEBHOOK_ERROR]", err);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }
}

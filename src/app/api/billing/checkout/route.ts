import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { square } from "@/lib/square";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        const body = await req.json();
        const { planTier, workspaceId, isYearly } = body;

        // Security check: Verify the workspace and its account
        const workspace = await prisma.workspace.findUnique({ 
            where: { id: workspaceId },
            include: { account: true }
        }) as any;
        
        if (!workspace) return new NextResponse("Workspace not found", { status: 404 });

        const isSaaSAdmin = user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        const isOrgOwner = (user as any).isAccountOwner && (user as any).accountId === workspace.accountId;

        if (!isSaaSAdmin && !isOrgOwner) {
            return new NextResponse("Forbidden: Only the Account Owner or Super Admin can manage billing.", { status: 403 });
        }

        const paymentProvider = workspace.account?.paymentProvider || "STRIPE";
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost") 
            ? (process.env.NEXTAUTH_URL.endsWith("/") ? process.env.NEXTAUTH_URL.slice(0, -1) : process.env.NEXTAUTH_URL)
            : `${protocol}://${host}/dashboard`;

        // --- STRIPE FLOW ---
        if (paymentProvider === "STRIPE") {
            if (!process.env.STRIPE_SECRET_KEY) {
                return new NextResponse("Stripe secret key is missing in environment variables.", { status: 500 });
            }

            // 1. Get or Create Stripe Customer Object
            let customerId = workspace.account?.providerCustomerId;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email || "",
                    name: workspace.name,
                    metadata: { workspaceId: workspace.id }
                });
                customerId = customer.id;
                
                if (workspace.accountId) {
                    await (prisma as any).subscriptionAccount.update({
                        where: { id: workspace.accountId },
                        data: { providerCustomerId: customerId }
                    });
                }
            }

            // 2. Identify the Product Price IDs
            let priceId: string | undefined;
            if (planTier === "STARTER") priceId = isYearly ? process.env.STRIPE_PRICE_STARTER_YEARLY : process.env.STRIPE_PRICE_STARTER_MONTHLY;
            else if (planTier === "PRO") priceId = isYearly ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
            else if (planTier === "ENTERPRISE") priceId = isYearly ? process.env.STRIPE_PRICE_ENT_YEARLY : process.env.STRIPE_PRICE_ENT_MONTHLY;

            if (!priceId) {
                if (planTier === "STARTER") priceId = process.env.STRIPE_PRICE_STARTER_MONTHLY;
                else if (planTier === "PRO") priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
                else if (planTier === "ENTERPRISE") priceId = process.env.STRIPE_PRICE_ENT_MONTHLY;
            }

            if (!priceId) return new NextResponse("Stripe Price ID missing.", { status: 400 });

            const stripeSession = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [{ price: priceId, quantity: (workspace as any).activeSeats || 1 }],
                success_url: `${baseUrl}/dashboard/settings?billing_success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/dashboard/settings?billing_canceled=true`,
                metadata: { workspaceId: workspace.id, planTier: planTier }
            });

            return NextResponse.json({ url: stripeSession.url });
        }

        // --- SQUARE FLOW ---
        if (paymentProvider === "SQUARE") {
            const accessToken = process.env.SQUARE_ACCESS_TOKEN;
            const locationId = process.env.SQUARE_LOCATION_ID;
            if (!accessToken || !locationId) {
                return new NextResponse("Square credentials missing in .env", { status: 500 });
            }

            let planId: string | undefined;
            if (planTier === "STARTER") planId = isYearly ? process.env.SQUARE_PLAN_STARTER_YEARLY : process.env.SQUARE_PLAN_STARTER_MONTHLY;
            else if (planTier === "PRO") planId = isYearly ? process.env.SQUARE_PLAN_PRO_YEARLY : process.env.SQUARE_PLAN_PRO_MONTHLY;
            else if (planTier === "ENTERPRISE") planId = isYearly ? process.env.SQUARE_PLAN_ENT_YEARLY : process.env.SQUARE_PLAN_ENT_MONTHLY;

            if (!planId) return new NextResponse("Square Plan ID missing.", { status: 400 });

            // Calculate Square price (amounts in cents as BigInt)
            let amount: bigint;
            if (planTier === "STARTER") amount = isYearly ? BigInt(3900) : BigInt(4900);
            else if (planTier === "PRO") amount = isYearly ? BigInt(7900) : BigInt(9900);
            else if (planTier === "ENTERPRISE") amount = isYearly ? BigInt(19900) : BigInt(24900);
            else amount = BigInt(1000);

            // Create a Square Payment Link (Checkout)
            const { result } = await (square as any).checkout.createPaymentLink({
                idempotencyKey: randomUUID(),
                paymentLink: {
                    name: `${planTier} Plan (${isYearly ? "Annual" : "Monthly"})`,
                    order: {
                        locationId: locationId,
                        lineItems: [{
                            name: `${planTier} Subscription`,
                            quantity: "1",
                            basePriceMoney: {
                                amount: amount,
                                currency: "USD"
                            }
                        }],
                        metadata: {
                            workspace_id: workspace.id,
                            plan_tier: planTier
                        }
                    },
                    checkoutOptions: {
                        redirectUrl: `${baseUrl}/dashboard/settings?billing_success=true`,
                    }
                }
            });

            return NextResponse.json({ url: result.paymentLink?.url });
        }

        return new NextResponse("Unsupported Payment Provider", { status: 400 });

    } catch (error: any) {
        console.error("[CHECKOUT_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

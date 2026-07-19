import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import crypto from "crypto";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ""
        );
    } catch (err: any) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 1. Initial Payment Success (Checkout)
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const planTier = session.metadata?.planTier;
        
        console.log(`📡 Stripe Webhook: Received completed checkout for workspace ${workspaceId}`);

        if (workspaceId) {
            // Find the workspace to get its associated account
            const workspace = await (prisma as any).workspace.findUnique({
                where: { id: workspaceId },
                include: { account: true }
            });

            if (workspace?.accountId) {
                // Update the SubscriptionAccount
                await (prisma as any).subscriptionAccount.update({
                    where: { id: workspace.accountId },
                    data: {
                        planTier: (planTier as any) || "FREE",
                        providerCustomerId: session.customer as string,
                        providerSubscriptionId: session.subscription as string,
                        hasPaymentSetup: true,
                        paymentProvider: "STRIPE"
                    }
                });

                // Redundantly update the workspace planTier if it exists as a field (Phase 4 compatibility)
                await (prisma as any).workspace.update({
                    where: { id: workspaceId },
                    data: { planTier: (planTier as any) || "FREE" }
                }).catch(() => {/* Ignore if field doesn't exist anymore */});

                console.log(`✅ Stripe Sync: Account [${workspace.accountId}] and Workspace [${workspaceId}] updated to ${planTier}.`);
            } else {
                console.error(`❌ Stripe Error: Workspace [${workspaceId}] has no associated account.`);
                // Recovery: Create and link missing account
                const newAccount = await (prisma as any).subscriptionAccount.create({
                    data: {
                        name: workspace?.name || "Auto-Created Account",
                        planTier: (planTier as any) || "FREE",
                        ownerId: workspace?.ownerId || "",
                        providerCustomerId: session.customer as string,
                        providerSubscriptionId: session.subscription as string,
                        hasPaymentSetup: true
                    }
                });
                await (prisma as any).workspace.update({
                    where: { id: workspaceId },
                    data: { accountId: newAccount.id, planTier: (planTier as any) || "FREE" }
                });
            }
        } else {
            // --- NEW CUSTOMER / PRE-REGISTRATION FLOW ---
            const customerEmail = session.customer_details?.email;
            if (!customerEmail) {
                console.error("❌ Stripe Webhook: External Checkout missing customer email.");
                return new NextResponse("Email Missing", { status: 400 });
            }

            console.log(`📡 Stripe Webhook: External checkout for new customer ${customerEmail}`);

            // 1. Check if user already exists (maybe they just didn't log in during checkout)
            const existingUser = await prisma.user.findUnique({ where: { email: customerEmail } });
            
            if (existingUser) {
                console.log(`ℹ️ Stripe Sync: Customer ${customerEmail} already exists. Updating their account.`);
                // If they have an account, find their primary workspace/account and update it
                const userAccount = await (prisma as any).subscriptionAccount.findFirst({
                    where: { users: { some: { id: existingUser.id } } }
                });

                if (userAccount) {
                    await (prisma as any).subscriptionAccount.update({
                        where: { id: userAccount.id },
                        data: {
                            planTier: (planTier as any) || "FREE",
                            providerCustomerId: session.customer as string,
                            providerSubscriptionId: session.subscription as string,
                            hasPaymentSetup: true
                        }
                    });
                }
            } else {
                // 2. TRUE NEW CUSTOMER: Create Pending Registration
                const token = crypto.randomUUID();
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

                // Create the paid subscription account first
                const newAccount = await (prisma as any).subscriptionAccount.create({
                    data: {
                        name: `Pre-Registered [${customerEmail}]`,
                        planTier: (planTier as any) || "FREE",
                        ownerId: "PENDING", // Temporary holder
                        providerCustomerId: session.customer as string,
                        providerSubscriptionId: session.subscription as string,
                        hasPaymentSetup: true
                    }
                });

                // Save the magic token
                await (prisma as any).pendingRegistration.create({
                    data: {
                        email: customerEmail,
                        planTier: (planTier as any) || "FREE",
                        accountId: newAccount.id,
                        token,
                        expiresAt
                    }
                });

                // 3. Send the Magic Setup Link
                const { sendEmail } = await import("@/lib/mail");
                const appUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://digixcrm.com";
                const setupUrl = `${appUrl}/auth/register?token=${token}`;

                await sendEmail({
                    to: customerEmail,
                    subject: "Action Required: Complete your DigiXCrm setup",
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #eaeaec; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1e1b4b;">Welcome to DigiXCrm!</h2>
                            <p>Thank you for your purchase of the <strong>${planTier}</strong> plan.</p>
                            <p>Click the button below to claim your workspace and complete your registration:</p>
                            <div style="margin: 30px 0;">
                                <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1e1b4b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete My Setup</a>
                            </div>
                            <p style="font-size: 13px; color: #666;">This link will expire in 24 hours.</p>
                        </div>
                    `
                }).catch(console.error);

                console.log(`📧 Stripe Webhook: Sent Magic Setup Link to ${customerEmail}`);
            }
        }
    }

    // 2. Renewal or Policy Change
    if (event.type === "invoice.payment_succeeded") {
        // Handled basically by subscription status elsewhere usually
    }

    // 3. Subscription Cancellation or Expiry
    if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`📡 Stripe Webhook: Received subscription deletion ${subscription.id}`);
        
        // Find the account by subscription ID
        const account = await (prisma as any).subscriptionAccount.findFirst({
            where: { providerSubscriptionId: subscription.id }
        });

        if (account) {
            await (prisma as any).subscriptionAccount.update({
                where: { id: account.id },
                data: {
                    planTier: "FREE", // Downgrade to Free
                    providerSubscriptionId: null // Clear on cancellation
                }
            });
            console.log(`⚠️ Subscription Account [${account.id}] downgraded to FREE.`);
        }
    }

    return new NextResponse(null, { status: 200 });
}

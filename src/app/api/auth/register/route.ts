import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, companyName, plan, token } = body;

        if (!name || (!email && !token) || !password || !companyName) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        let finalEmail = email;
        let pending = null;
        let finalPlanTier = plan?.toUpperCase() || "FREE";

        // 1. TOKEN HANDLING (Pre-Paid Flow) - Must resolve token first to get email if omitted
        if (token) {
            pending = await (prisma as any).pendingRegistration.findUnique({
                where: { token },
                include: { account: true }
            });

            if (!pending || pending.used || new Date() > pending.expiresAt) {
                return NextResponse.json({ error: "Invalid or expired registration token." }, { status: 400 });
            }

            if (!finalEmail) {
                finalEmail = pending.email;
            } else if (finalEmail.toLowerCase() !== pending.email.toLowerCase()) {
                console.warn(`[AUTH] Registration email mismatch. Token email: ${pending.email}, Provided: ${finalEmail}`);
                // Overriding to token's email to maintain strict access control for the paid account
                finalEmail = pending.email;
            }
        }

        if (!finalEmail) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: finalEmail.toLowerCase() }
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }

        // Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 12);

        // Run a Prisma transaction to ensure Atomicity
        const result = await prisma.$transaction(async (tx) => {
            let accountId: string;

            if (token && pending) {
                accountId = pending.accountId;
                finalPlanTier = pending.planTier;

                // Mark token as used
                await (tx as any).pendingRegistration.update({
                    where: { id: pending.id },
                    data: { used: true }
                });
            } else {
                // 2. NORMAL FLOW (Trial/Free) - Enhanced with Trial Tracking
                const requestedPlan = ["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(finalPlanTier) 
                    ? finalPlanTier 
                    : "FREE";

                // Set dynamic trials: 30 days for PRO, 14 days for STARTER
                let trialEndsAt: Date | null = null;
                if (requestedPlan === "PRO") {
                    trialEndsAt = new Date();
                    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
                } else if (requestedPlan === "STARTER") {
                    trialEndsAt = new Date();
                    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
                }

                // Create a temporary holder ID for ownerId
                const tempUserId = crypto.randomUUID();

                const newAccount = await tx.subscriptionAccount.create({
                    data: {
                        name: companyName,
                        planTier: requestedPlan as any,
                        hasPaymentSetup: false,
                        paymentProvider: "STRIPE",
                        ownerId: tempUserId,
                        trialEndsAt: trialEndsAt
                    }
                });
                accountId = newAccount.id;
            }

            // 3. Create User linked to the Account
            const newUser = await tx.user.create({
                data: {
                    name,
                    email: finalEmail.toLowerCase(),
                    password: hashedPassword,
                    role: "ADMIN", // Global role is ADMIN for Owner
                    accountId: accountId
                }
            });

            // 4. Update the account ownerId to the real user ID
            await tx.subscriptionAccount.update({
                where: { id: accountId },
                data: { ownerId: newUser.id }
            });

            // 5. Create the Workspace matching the Company Name linked to User and Account
            const newWorkspace = await tx.workspace.create({
                data: {
                    name: companyName,
                    ownerId: newUser.id,
                    accountId: accountId
                }
            });

            // 6. Link the new User as the Owner/ADMIN of this new Workspace
            await tx.workspaceMember.create({
                data: {
                    userId: newUser.id,
                    workspaceId: newWorkspace.id,
                    role: "ADMIN"
                }
            });

            return { user: newUser, workspace: newWorkspace };
        });

        // Notify Sales Admin about the new high-velocity lead
        try {
            await sendEmail({
                to: "digicarehouse.sales@gmail.com",
                subject: `[NEW SIGNUP] ${companyName} - DigiXCrm Onboarding`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <h2 style="color: #1a3a8f; margin-bottom: 20px;">New Organization Created</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Full Name</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Work Email</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${finalEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Organization</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${companyName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Plan Tier</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
                                    ${finalPlanTier} 
                                    ${finalPlanTier === 'PRO' ? ' (30-Day Trial)' : finalPlanTier === 'STARTER' ? ' (14-Day Trial)' : ''}
                                </td>
                            </tr>
                        </table>
                        <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
                            &copy; 2026 DigiXCrm Sales Intelligence
                        </p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error("[ADMIN_NOTIFY_ERROR] Failed to notify sales admin:", emailError);
        }

        return NextResponse.json({ 
            success: true, 
            message: "Account created successfully.",
            data: { id: result.user.id, email: result.user.email, workspaceId: result.workspace.id }
        });

    } catch (error: any) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error during registration." }, { status: 500 });
    }
}

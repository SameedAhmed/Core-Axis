import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/lib/sendEmail";

import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, name, phoneNumber, password, companyName, personalOrOrg, employeeSize, foundUsVia } = body;
        
        // Turnstile check skipped by global request

        if (!token || !name || !phoneNumber || !password || !companyName) {
            return NextResponse.json({ error: "Missing required onboarding fields. Please ensure Name, Phone, and Company name are provided." }, { status: 400 });
        }

        // 1. Verify the JWT Token
        const secret = process.env.NEXTAUTH_SECRET || "fallback_secret";
        let decoded: any;
        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            return NextResponse.json({ error: "Your secure onboarding session has expired. Please request a new link." }, { status: 401 });
        }

        const email = decoded.email.toLowerCase();
        const plan = decoded.plan || "FREE";

        // 2. Validate user doesn't exist
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: "This email has already completed onboarding. Please sign in." }, { status: 409 });
        }

        // 3. Define Trial Logic
        let trialEndsAt: Date | null = null;
        if (plan === "STARTER") {
            trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
        } else if (plan === "PRO") {
            trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
        }

        // 4. Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 12);

        // 5. Secure Prisma Transaction to create identical records
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    phoneNumber,
                    password: hashedPassword,
                    role: "ADMIN", // Elevate to ADMIN status for new Tenant Master
                    isAccountOwner: true, // They are the root account owner
                    hasCompletedOnboarding: true,
                }
            });

            // Phase 4: Create Global Subscription Account
            const newAccount = await (tx as any).subscriptionAccount.create({
                data: {
                    name: companyName,
                    planTier: plan as any,
                    ownerId: newUser.id,
                    trialEndsAt, // Grant the trial period
                }
            });

            // Map user to the account
            await tx.user.update({
                where: { id: newUser.id },
                data: { accountId: newAccount.id }
            });

            const newWorkspace = await tx.workspace.create({
                data: {
                    name: companyName,
                    ownerId: newUser.id,
                    accountId: newAccount.id,
                } as any
            });

            await tx.workspaceMember.create({
                data: {
                    userId: newUser.id,
                    workspaceId: newWorkspace.id,
                    role: "ADMIN"
                }
            });

            // Instantly map their default UI view to their blank workspace
            await tx.user.update({
                where: { id: newUser.id },
                data: { activeWorkspaceId: newWorkspace.id }
            });

            return { user: newUser, workspace: newWorkspace, accountId: newAccount.id };
        });

        // 5. Send Notification To Admin automatically (as requested by User)
        const superAdminEmail = "sameed.blackink@gmail.com"; 
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2 style="color: #1e1b4b;">🎉 New CRM Client Registration Alert</h2>
                <p><strong>A new lead has successfully verified their email and completed onboarding.</strong></p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phoneNumber}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${companyName}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Plan Selected:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${plan}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${personalOrOrg || 'N/A'}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Employee Size:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${employeeSize || 'N/A'}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Found Via:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${foundUsVia || 'N/A'}</td></tr>
                </table>
            </div>
        `;

        try {
            await sendEmail({
                to: superAdminEmail,
                subject: `🚀 New Client Secured: ${companyName}`,
                html: adminHtml
            });
        } catch (emailErr) {
            console.error("Non-blocking Email Notification Error:", emailErr);
            // Non-blocking error for admin notification to not break user registration
        }

        // 6. Handle Enterprise Manual Registration (No Automated Gateway)
        if (plan === "ENTERPRISE") {
             // Enterprise users are successfully onboarded silently and wait for manual invoice workflow 
             // via the "Contact Sales" request they made.
        }

        return NextResponse.json({ 
            success: true, 
            message: "Workspace onboarding successfully completed.",
            data: { id: result.user.id, email: result.user.email, workspaceId: result.workspace.id }
        });

    } catch (error: any) {
        console.error("Registration Completion Error:", error);
        return NextResponse.json({ 
            error: "Internal server error during finalization.", 
            details: process.env.NODE_ENV === "development" ? error.message : undefined 
        }, { status: 500 });
    }
}

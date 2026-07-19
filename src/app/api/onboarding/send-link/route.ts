import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/lib/sendEmail";
import { prisma } from "@/lib/prisma";
import { validateTurnstileToken } from "@/lib/turnstile";

export async function POST(req: Request) {
    try {
        const { email, plan, captchaToken } = await req.json();

        // Validate Captcha
        const isHuman = await validateTurnstileToken(captchaToken);
        if (!isHuman) {
            return NextResponse.json({ error: "Security check failed. Bots are not allowed." }, { status: 403 });
        }

        if (!email) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists. Please Sign In." }, { status: 409 });
        }

        // Create JWT token wrapping the email and plan
        const secret = process.env.NEXTAUTH_SECRET || "fallback_secret";
        const token = jwt.sign(
            { email: email.toLowerCase(), plan: plan || 'FREE' },
            secret,
            { expiresIn: "24h" }
        );

        // Construct dynamic absolute URL: Prioritize NEXTAUTH_URL for production accuracy
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        
        let baseUrl = `${protocol}://${host}`;
        if (process.env.NEXTAUTH_URL) {
            baseUrl = process.env.NEXTAUTH_URL.endsWith("/") 
                ? process.env.NEXTAUTH_URL.slice(0, -1) 
                : process.env.NEXTAUTH_URL;
        }
            
        const registrationLink = `${baseUrl}/auth/register-flow?token=${token}`;

        const trialDescription = plan === 'PRO' 
            ? '30-Day Free Advanced Trial' 
            : plan === 'STARTER' 
                ? '14-Day Free Professional Trial' 
                : plan === 'ENTERPRISE' 
                    ? 'Premium Identity Activation' 
                    : 'Free Workspace Access';

        // Send Email
        const html = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                <div style="background-color: #1a3a8f; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">DigiXCrm</h1>
                </div>
                <div style="padding: 40px 20px;">
                    <h2 style="color: #111827; margin-top: 0; font-size: 20px; font-weight: 700;">Claim Your ${trialDescription}</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 35px;">
                        You requested to build a <span style="font-weight: bold; color: #1a3a8f;">${plan}</span> workspace on DigiXCrm. Click the secure link below to proceed with your fast onboarding!
                    </p>
                    <a href="${registrationLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Secure Setup My Workspace</a>
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 40px;">
                        This link will securely expire in 24 hours.
                    </p>
                </div>
                <div style="padding: 20px; border-top: 1px solid #f3f4f6; color: #94a3b8; font-size: 12px;">
                    &copy; 2026 DigiXCrm Automation. Professional CRM Infrastructure.
                    &copy; 2026 DigiXCrm Automation. Professional CRM Infrastructure.
                </div>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: "Your DigiXCrm Access Link",
            html
        });

        return NextResponse.json({ success: true, message: "Magic link sent successfully." });

    } catch (error: any) {
        console.error("Magic Link Error:", error);
        return NextResponse.json({ error: "Internal server error while sending email." }, { status: 500 });
    }
}

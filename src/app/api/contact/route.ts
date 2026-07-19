import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { validateTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
    try {
        const { name, email, phone, message, captchaToken } = await req.json();

        // 1. Validate Captcha
        const isHuman = await validateTurnstileToken(captchaToken);
        if (!isHuman) {
            return NextResponse.json({ error: "Security check failed. Bots are not allowed." }, { status: 403 });
        }

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
            secure: process.env.EMAIL_SERVER_PORT === "465",
        });

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"DigiXCrm" <noreply@digixcrm.com>`,
            to: "digicarehouse.sales@gmail.com",
            replyTo: email,
            subject: `🚀 New Lead from DigiXCrm: ${name}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #312e81, #1e3a8a); padding: 32px; text-align: center;">
                        <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">DigiXCrm</h1>
                        <p style="color: #a5b4fc; margin: 8px 0 0; font-size: 14px;">New Sales Inquiry</p>
                    </div>
                    <div style="padding: 32px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 100px;">Name</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-weight: 600;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Email</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #818cf8;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Phone</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9;">${phone || "Not provided"}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; vertical-align: top;">Message</td>
                                <td style="padding: 12px 0; color: #f1f5f9; line-height: 1.6;">${message.replace(/\n/g, "<br/>")}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="background: #0f172a; border-top: 1px solid #1e293b; padding: 20px 32px; text-align: center;">
                        <p style="color: #475569; font-size: 12px; margin: 0;">DigiXCrm — A DigiCare House Product</p>
                    </div>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
    }
}

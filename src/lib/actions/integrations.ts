"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getIntegrations() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { error: "Unauthorized access." };

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });
        if (!user) return { error: "User not found." };

        const activeWorkspaceId = (user as any).activeWorkspaceId;
        if (!activeWorkspaceId) return { success: true, integrations: [] };

        const integrations = await prisma.integration.findMany({
            where: { workspaceId: activeWorkspaceId }
        });
        return { success: true, integrations };
    } catch (error: any) {
        console.error("Failed to fetch integrations:", error.message);
        return { error: "Failed to fetch integrations." };
    }
}

import nodemailer from "nodemailer";

export async function saveIntegrationSettings(provider: string, data: { 
    isActive: boolean; 
    apiKey?: string; 
    webhookSecret?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { error: "Unauthorized access." };

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });
        if (!user || user.role !== "ADMIN") {
            return { error: "Unauthorized access. Only system admins can manage integrations." };
        }

        const activeWorkspaceId = (user as any).activeWorkspaceId;
        if (!activeWorkspaceId) return { error: "No active workspace selected." };

        const integration = await prisma.integration.upsert({
            where: {
                workspaceId_provider: {
                    workspaceId: activeWorkspaceId,
                    provider
                }
            },
            update: {
                isActive: data.isActive,
                apiKey: data.apiKey,
                webhookSecret: data.webhookSecret,
                smtpHost: data.smtpHost,
                smtpPort: data.smtpPort ? Number(data.smtpPort) : undefined,
                smtpUser: data.smtpUser,
                smtpPass: data.smtpPass,
                smtpFrom: data.smtpFrom
            },
            create: {
                provider,
                workspaceId: activeWorkspaceId,
                isActive: data.isActive,
                apiKey: data.apiKey,
                webhookSecret: data.webhookSecret,
                smtpHost: data.smtpHost,
                smtpPort: data.smtpPort ? Number(data.smtpPort) : undefined,
                smtpUser: data.smtpUser,
                smtpPass: data.smtpPass,
                smtpFrom: data.smtpFrom
            }
        });

        revalidatePath("/dashboard/settings");
        return { success: true, integration };
    } catch (error: any) {
        console.error("Failed to save integration settings:", error.message);
        return { error: "Failed to save integration settings." };
    }
}

export async function testSmtpConnection(config: { 
    host: string; 
    port: number; 
    user: string; 
    pass: string; 
    from: string;
}) {
    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: Number(config.port),
            secure: Number(config.port) === 465,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        const isVerified = await transporter.verify();
        if (isVerified) {
             // send a test email to the user
             await transporter.sendMail({
                from: config.from,
                to: config.user, // Send to themselves
                subject: "✨ DigiXCrm SMTP Test: Connection Verified",
                text: "Success! Your custom SMTP connection has been verified. You can now use your professional domain to send automated client communications from DigiXCrm.",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaec; border-radius: 12px; max-width: 500px;">
                        <h2 style="color: #1e1b4b;">Connection Verified!</h2>
                        <p>This is a test email from your custom SMTP server configured in <strong>DigiXCrm</strong>.</p>
                        <p>Your server is correctly communicating with our platform.</p>
                        <div style="margin-top: 20px; font-size: 12px; color: #777;">
                            Sending as: ${config.from}
                        </div>
                    </div>
                `
             });
             return { success: true };
        }
        return { success: false, error: "Connection could not be established." };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to connect to SMTP server." };
    }
}

export async function testMetaConnection(token: string) {
    if (!token) return { success: false, error: "Token is required." };
    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`);
        const data = await response.json();

        if (data.error) {
            return { success: false, error: data.error.message };
        }

        return { success: true, name: data.name || `ID: ${data.id}` };
    } catch (e: any) {
        return { success: false, error: e.message || "Network error." };
    }
}

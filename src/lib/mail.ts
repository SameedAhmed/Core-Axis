import nodemailer from "nodemailer";

/**
 * Professional Mailer Configuration
 * 
 * To use this, add these to your .env:
 * EMAIL_SERVER_HOST=smtp.brevo.com (example)
 * EMAIL_SERVER_PORT=587
 * EMAIL_SERVER_USER=your_professional_id@service.com
 * EMAIL_SERVER_PASSWORD=your_api_key_or_password
 * EMAIL_FROM="DigiXCrm <noreply@yourdomain.com>"
 */

import { prisma } from "@/lib/prisma";

const systemTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  secure: process.env.EMAIL_SERVER_PORT === "465",
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  workspaceId?: string; // Optional: Send via workspace custom SMTP if provided & active
}

export async function sendEmail({ to, subject, html, text, workspaceId }: SendEmailParams) {
  let activeTransporter = systemTransporter;
  let fromEmail = process.env.EMAIL_FROM || '"DigiXCrm" <noreply@crm.com>';

  // DYNAMIC SMTP ROUTING: Use workspace SMTP if it exists and is active
  if (workspaceId) {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider: "SMTP"
          }
        }
      });

      if (integration?.isActive && integration.smtpHost) {
        activeTransporter = nodemailer.createTransport({
          host: integration.smtpHost,
          port: integration.smtpPort || 587,
          secure: integration.smtpPort === 465,
          auth: {
            user: integration.smtpUser || "",
            pass: integration.smtpPass || "",
          },
        });
        if (integration.smtpFrom) {
          fromEmail = integration.smtpFrom;
        }
      }
    } catch (e) {
      console.error("Custom SMTP Lookup Failed, falling back to system default:", e);
    }
  }

  try {
    const info = await activeTransporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text: text || "Please view the HTML version of this email.",
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending professional email:", error);
    return { success: false, error };
  }
}

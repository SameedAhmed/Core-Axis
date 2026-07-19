"use server";

import { sendEmail } from "@/lib/mail";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function sendTestEmail() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await sendEmail({
    to: session.user.email,
    subject: "🚀 DigiXCrm Email Connection Success!",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h1 style="color: #1e3a8a; font-weight: 800;">Connection successful!</h1>
        <p style="color: #334155; line-height: 1.6;">Your professional SMTP relay is now correctly configured in <strong>DigiXCrm</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="font-size: 13px; color: #64748b;">This email was sent from <strong>${process.env.EMAIL_FROM}</strong> to verify your settings.</p>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 40px;">&copy; 2026 DigiXCrm Automation. All rights reserved.</p>
      </div>
    `,
    text: "Your DigiXCrm email connection is working perfectly! Sent via Brevo SMTP."
  });

  return result;
}

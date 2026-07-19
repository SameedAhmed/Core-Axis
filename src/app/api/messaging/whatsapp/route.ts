import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { leadId, message, phone } = body;

        if (!leadId || !message || !phone) {
            return NextResponse.json({ error: "Missing required fields (leadId, message, phone)" }, { status: 400 });
        }

        // ==========================================
        // EXTERNAL INTEGRATION POINT:
        const integration = await prisma.integration.findFirst({ where: { provider: "WHATSAPP", workspaceId: user.activeWorkspaceId } });
        if (!integration || !integration.isActive) {
            return NextResponse.json({ error: "WhatsApp Integration is currently disabled by Admin." }, { status: 503 });
        }

        const accessToken = integration.apiKey;
        const phoneId = integration.webhookSecret; // We stored Phone ID here

        // Here you would connect to WhatsApp Cloud API or Twilio API
        if (accessToken && phoneId) {
            // Example actual fetch
            // await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            //     method: 'POST',
            //     headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } })
            // });
        }
        // ==========================================

        console.log(`[SIMULATION] Sending WhatsApp to ${phone}: ${message}`);

        // Log this outgoing message as a WhatsApp activity on the lead
        const activity = await prisma.activity.create({
            data: {
                type: "NOTE", // We use Note type, but record that it was an SMS/WhatsApp sent
                notes: `[Outgoing WhatsApp Sent] to ${phone}:\n"${message}"`,
                leadId: leadId,
                userId: user.id
            }
        });

        // Update the lead status to CONTACTED if it was a new lead
        await prisma.lead.updateMany({
            where: { id: leadId, status: "NEW" },
            data: { status: "CONTACTED" }
        });

        return NextResponse.json({ success: true, activity }, { status: 200 });

    } catch (error) {
        console.error("WhatsApp Integration Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to send WhatsApp message." },
            { status: 500 }
        );
    }
}

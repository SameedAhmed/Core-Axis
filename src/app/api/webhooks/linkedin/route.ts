import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultLeadOwner } from "@/lib/permissions";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // LinkedIn Lead Gen Forms typically send a 'lead' object or similar
        // Note: Actual LinkedIn webhooks require validation of the 'X-LI-Signature' header

        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");

        if (!secret) return NextResponse.json({ error: "Missing secret" }, { status: 401 });

        const integration = await prisma.integration.findFirst({
            where: { provider: "LINKEDIN", webhookSecret: secret, isActive: true }
        });

        if (!integration) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        let defaultAdmin = null;
        if (integration.workspaceId) {
            defaultAdmin = await getDefaultLeadOwner("LINKEDIN", integration.workspaceId);
        } else {
            return NextResponse.json({ error: "Integration not fully configured." }, { status: 400 });
        }

        const firstName = body.firstName || body.first_name || "LinkedIn";
        const lastName = body.lastName || body.last_name || "Prospect";
        const email = body.email || body.email_address;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const newLead = await prisma.lead.create({
            data: {
                firstName,
                lastName,
                email,
                phone: body.phone || body.phone_number || null,
                status: "NEW",
                source: "LINKEDIN",
                ownerId: defaultAdmin.id,
                workspaceId: integration.workspaceId,
            },
        });

        await prisma.activity.create({
            data: {
                type: "NOTE",
                notes: `LinkedIn Lead Gen Form Submission Captured.\nAd Campaign: ${body.campaign_name || 'N/A'}\nForm ID: ${body.form_id || 'N/A'}`,
                leadId: newLead.id,
                userId: defaultAdmin.id,
                workspaceId: integration.workspaceId,
            },
        });

        return NextResponse.json({ success: true, leadId: newLead.id }, { status: 201 });
    } catch (error: any) {
        console.error("LinkedIn Webhook Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

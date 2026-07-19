import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultLeadOwner } from "@/lib/permissions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Fetch integration from DB using the verify_token to support multi-tenant
    const integration = await prisma.integration.findFirst({ 
        where: { 
            provider: "META",
            // Fallback to finding by webhookSecret or simply returning 403 later
            ...(token ? { webhookSecret: token } : {})
        } 
    });
    
    const VERIFY_TOKEN = integration?.webhookSecret || process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (!integration?.isActive && !process.env.META_WEBHOOK_VERIFY_TOKEN) {
        return new NextResponse("Service Unavailable - Integration Disabled", { status: 503 });
    }

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("Meta Webhook Verified Successfully.");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse("Forbidden", { status: 403 });
        }
    }

    return new NextResponse("Bad Request", { status: 400 });
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");
        const body = await request.json();

        if (!secret) {
            console.warn(`[META] Unauthorized lead sync blocked. Missing secret parameter.`);
            return NextResponse.json({ error: "Unauthorized. Missing secret." }, { status: 401 });
        }

        // Must scope by the provided secret in the Webhook URL (e.g., ?secret=XYZ)
        // Without this, the system would leak leads across tenants
        const integration = await prisma.integration.findFirst({ 
            where: { 
                provider: "META",
                webhookSecret: secret
            } 
        });

        if (!integration || !integration.isActive) {
            console.warn(`[META] Unauthorized lead sync blocked. Mismatched secret or disabled integration.`);
            return NextResponse.json({ error: "Integration disabled or unauthorized." }, { status: 403 });
        }

        let defaultOwner = null;
        if (integration.workspaceId) {
            const workspaceAdmin = await prisma.workspaceMember.findFirst({
                where: {
                    workspaceId: integration.workspaceId,
                    user: { role: "ADMIN" }
                },
                include: { user: true }
            });
            defaultOwner = workspaceAdmin?.user ?? null;
        }

        if (!defaultOwner) {
            defaultOwner = await getDefaultLeadOwner("META_ADS");
        }

        // 1. Meta Lead Ads Event Handling
        if (body.object === "page" && body.entry) {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === "leadgen") {
                        const leadGenId = change.value.leadgen_id;

                        // Optional: Server-to-server call to fetch Lead details using Graph API
                        let leadFirstName = "Meta";
                        let leadLastName = `Lead (${leadGenId.substring(0, 6)})`;
                        let leadEmail = body.email || `meta.${leadGenId}@ad-prospect.com`;
                        let leadLocation = null;

                        if (integration.apiKey) {
                            try {
                                const response = await fetch(`https://graph.facebook.com/v18.0/${leadGenId}?access_token=${integration.apiKey}`);
                                if (response.ok) {
                                    const leadData = await response.json();
                                    const emailField = leadData.field_data?.find((f: any) => f.name === 'email');
                                    const fnField = leadData.field_data?.find((f: any) => f.name === 'first_name');
                                    const lnField = leadData.field_data?.find((f: any) => f.name === 'last_name');
                                    const nameField = leadData.field_data?.find((f: any) => f.name === 'full_name');
                                    const cityField = leadData.field_data?.find((f: any) => f.name === 'city');
                                    const countryField = leadData.field_data?.find((f: any) => f.name === 'country');

                                    if (emailField) leadEmail = emailField.values[0];
                                    if (fnField) leadFirstName = fnField.values[0];
                                    if (lnField) leadLastName = lnField.values[0];
                                    else if (nameField) {
                                        const parts = nameField.values[0].split(" ");
                                        leadFirstName = parts[0] || "Meta";
                                        leadLastName = parts.slice(1).join(" ") || "Lead";
                                    }

                                    if (cityField || countryField) {
                                        leadLocation = [cityField?.values[0], countryField?.values[0]].filter(Boolean).join(", ");
                                    } else if (leadData.location) {
                                        leadLocation = leadData.location;
                                    }
                                }
                            } catch (e) {
                                console.error("Could not fetch extended lead info from Graph API", e);
                            }
                        }

                        const newLead = await prisma.lead.create({
                            data: {
                                firstName: leadFirstName,
                                lastName: leadLastName,
                                email: leadEmail,
                                location: leadLocation,
                                status: "NEW",
                                ownerId: defaultOwner.id,
                                workspaceId: integration.workspaceId, // Link to the specific tenant
                                source: "META_ADS"
                            }
                        });

                        await prisma.activity.create({
                            data: {
                                type: "NOTE",
                                notes: `Inbound Meta Lead. ID: ${leadGenId}\nForm: ${change.value.form_id}`,
                                leadId: newLead.id,
                                userId: defaultOwner.id,
                                workspaceId: integration.workspaceId
                            }
                        });
                    }
                }
            }
            return NextResponse.json({ status: "success" }, { status: 200 });
        }

        // 2. Direct Hub/Automation Test Payload
        if (body.test_mode) {
            const newLead = await prisma.lead.create({
                data: {
                    firstName: body.firstName || "Meta",
                    lastName: body.lastName || "Test",
                    email: body.email || "meta-test@example.com",
                    status: "NEW",
                    ownerId: defaultOwner.id,
                    workspaceId: integration.workspaceId,
                    source: "META_ADS"
                }
            });
            return NextResponse.json({ success: true, leadId: newLead.id }, { status: 201 });
        }

        return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });

    } catch (error: any) {
        console.error("Meta Webhook Sync Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


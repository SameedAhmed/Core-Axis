import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocationFromIP } from "@/lib/geoip";
import { getDefaultLeadOwner } from "@/lib/permissions";

// Flexible payload interface to handle various form setups
interface WordPressPayload {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email: string;
    phone?: string;
    service?: string;
    source?: string;
    message?: string;
    ip_address?: string;
    fields?: Record<string, any>; // Support WPForms numbered fields
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const authHeader = request.headers.get("x-wp-webhook-secret") || searchParams.get("x-wp-webhook-secret");

        if (!authHeader) {
            return NextResponse.json({ status: "error", message: "Unauthorized: Missing Webhook Secret" }, { status: 401 });
        }

        // 1. Fetch Integration Settings 
        // We look up the specific integration using the secret to support multiple workspaces
        const integration = await prisma.integration.findFirst({
            where: {
                provider: "WPFORMS",
                isActive: true,
                webhookSecret: authHeader
            }
        });

        if (!integration) {
            console.warn(`Unauthorized or unmatched WordPress sync attempt blocked. Received Secret: "${authHeader.substring(0, 3)}..."`);
            return NextResponse.json({ status: "error", message: "Unauthorized or Integration Disabled" }, { status: 401 });
        }

        const body: WordPressPayload = await request.json();

        // 2. Handle Name, Email, Phone, Message, Service & Source Extraction
        let firstName = body.first_name || "";
        let lastName = body.last_name || "";
        let email = body.email || "";
        let phone = body.phone || "";
        let message = body.message || "";
        let service = body.service || "";
        let source = body.source || "WP_SYNC";

        // If data is in 'fields' object (standard WPForms Webhooks addon format)
        if (body.fields) {
            for (const [, field] of Object.entries(body.fields as Record<string, any>)) {
                const fieldType: string = field?.type || "";
                const value: string = typeof field?.value === "object" ? "" : String(field?.value || "").trim();
                const valueRaw = field?.value_raw;
                const fieldLabel: string = String(field?.label || "").toLowerCase();

                if (!value && !valueRaw) continue;

                // Capture 'service' if field label contains 'service' or 'interest'
                if (fieldLabel.includes("service") || fieldLabel.includes("interest")) {
                    if (!service) service = value;
                }

                // If label includes 'source' or 'form'
                if (fieldLabel.includes("source") || fieldLabel.includes("form")) {
                    if (source === "WP_SYNC" || !source) source = value;
                }

                switch (fieldType) {
                    case "name":
                        // WPForms name field has value_raw with first/last keys
                        if (!firstName && !lastName) {
                            if (valueRaw && typeof valueRaw === "object") {
                                firstName = String(valueRaw.first || "").trim();
                                lastName = String(valueRaw.last || "").trim();
                            } else if (value) {
                                const parts = value.split(/\s+/);
                                firstName = parts[0] || "";
                                lastName = parts.slice(1).join(" ") || "";
                            }
                        }
                        break;

                    case "email":
                        if (!email && value) email = value;
                        break;

                    case "phone":
                        if (!phone && value) phone = value;
                        break;

                    case "textarea":
                    case "text":
                        // Use first textarea as message, or text if no message yet
                        if (!message && value && fieldType === "textarea") message = value;
                        else if (!email && value.includes("@")) email = value; // fallback email detection
                        break;

                    default:
                        // Generic fallback heuristics for unmapped/unknown field types
                        if (!email && value.includes("@")) {
                            email = value;
                        } else if (!phone && /^[\d\s\+\-\(\)]{7,15}$/.test(value)) {
                            phone = value;
                        } else if (!firstName && value && !value.includes("@")) {
                            const parts = value.split(/\s+/);
                            firstName = parts[0] || "";
                            lastName = parts.slice(1).join(" ") || "";
                        } else if (!message && value) {
                            message = value;
                        }
                        break;
                }
            }
        }

        if (body.full_name && !firstName && !lastName) {
            const parts = body.full_name.trim().split(/\s+/);
            firstName = parts[0] || "New";
            lastName = parts.slice(1).join(" ") || "Prospect";
        }

        // 3. Validation
        if (!email) {
            return NextResponse.json(
                { status: "error", message: "Missing required field: email." },
                { status: 400 }
            );
        }

        firstName = firstName || "New";
        lastName = lastName || "Prospect";

        // 4. Find Assignment — prefer an ADMIN who is a member of this workspace
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

        // Fallback: use global default
        if (!defaultOwner) {
            defaultOwner = await getDefaultLeadOwner(source);
        }

        console.log(`[WP Webhook] Assigning lead to owner: ${defaultOwner.id} (${defaultOwner.email})`);
        console.log(`[WP Webhook] Lead data: firstName="${firstName}", lastName="${lastName}", email="${email}", source="${source}", service="${service}"`);

        // 5. GeoIP Resolution
        let location = null;
        if (body.ip_address) {
            location = await getLocationFromIP(body.ip_address);
        }

        // 6. Create the lead in CRM
        const newLead = await prisma.lead.create({
            data: {
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                service: service || null,
                location: location,
                status: "NEW",
                source: source || "WP_SYNC",
                ownerId: defaultOwner.id,
                workspaceId: integration.workspaceId,
            },
        });

        // 7. Log activity
        await prisma.activity.create({
            data: {
                type: "NOTE",
                notes: `WordPress Lead Captured.\nSource Page: ${source}\nDetected Service: ${service}\nUser Message: ${message || 'No message provided.'}`,
                leadId: newLead.id,
                userId: defaultOwner.id,
                workspaceId: integration.workspaceId,
            },
        });

        // 8. Update Integration Status to show connected domain
        let domain = "Connected Site";
        try {
            const originStr = request.headers.get("origin") || request.headers.get("referer") || "";
            if (originStr) {
                domain = new URL(originStr).hostname;
            }
        } catch (e) {
            domain = request.headers.get("origin") || "Connected Site";
        }

        const metaData = JSON.stringify({
            domain: domain,
            lastSync: new Date().toISOString()
        });

        await prisma.integration.update({
            where: { id: integration.id },
            data: { apiKey: metaData }
        });

        console.log(`Successfully ingested lead: ${firstName} ${lastName} (${email})`);

        return NextResponse.json({
            status: "success",
            message: "Lead synchronized with CRM.",
            leadId: newLead.id
        }, { status: 201 });

    } catch (error: any) {
        console.error("Critical Webhook Failure:", error?.message ?? error);
        return NextResponse.json(
            { status: "error", message: "Internal Server Error during synchronization.", detail: error?.message },
            { status: 500 }
        );
    }
}

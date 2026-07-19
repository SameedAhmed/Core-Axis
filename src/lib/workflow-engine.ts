import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/actions/audit";

/**
 * Enterprise Workflow Execution Engine
 * Evaluates and executes matching rules asynchronously to avoid blocking main requests.
 */
export async function executeWorkflows(
    trigger: "LEAD_CREATED" | "DEAL_CREATED" | "LEAD_STATUS_CHANGED" | "DEAL_WON",
    workspaceId: string | null,
    entity: any, // The Lead or Deal
    context?: any
) {
    if (!workspaceId) return;

    try {
        // Fetch all active rules for this trigger in this workspace
        const rules = await (prisma as any).automationRule.findMany({
            where: {
                workspaceId,
                trigger,
                isActive: true
            }
        });

        for (const rule of rules) {
            // Evaluate Conditions
            let matches = true;
            const conditions = rule.conditions as any;
            
            if (conditions) {
                if (conditions.source && entity.source) {
                    if (!entity.source.toUpperCase().includes(conditions.source.toUpperCase())) {
                        matches = false;
                    }
                }
                if (conditions.status && entity.status) {
                    if (entity.status.toUpperCase() !== conditions.status.toUpperCase()) {
                        matches = false;
                    }
                }
            }

            if (!matches) continue;

            // Execute Action
            await runAction(rule, entity);
        }
    } catch (e) {
        console.error("Workflow Engine Failure:", e);
    }
}

async function runAction(rule: any, entity: any) {
    const action = rule.action;
    const val = rule.actionValue;

    try {
        let parsedVal: any = val;
        try { parsedVal = JSON.parse(val); } catch (e) {}

        if (action === "ASSIGN_OWNER") {
            // Already handled dynamically before creation via permissions.ts for leads
            // But if it's a DEAL or delayed lead update, we assign it here:
            if (entity.status && entity.firstName && rule.trigger !== "LEAD_CREATED") {
                await prisma.lead.update({ where: { id: entity.id }, data: { ownerId: val } });
            } else if (entity.stage && entity.title) {
                await prisma.deal.update({ where: { id: entity.id }, data: { ownerId: val } });
            }
        } 
        
        else if (action === "CREATE_TASK") {
            const title = parsedVal?.title || "Automated Task";
            await prisma.activity.create({
                data: {
                    type: "NOTE",
                    notes: `[SYSTEM AUTOMATION]: ${title}`,
                    userId: entity.ownerId || entity.createdById,
                    workspaceId: rule.workspaceId,
                    ...(entity.firstName ? { leadId: entity.id } : { dealId: entity.id })
                }
            });
        }
        
        else if (action === "UPDATE_STATUS") {
            if (entity.firstName) {
                await prisma.lead.update({ where: { id: entity.id }, data: { status: val } });
            } else if (entity.title) {
                await prisma.deal.update({ where: { id: entity.id }, data: { stage: val } });
            }
        }

        else if (action === "SEND_EMAIL") {
            // Log the attempt
            await prisma.activity.create({
                data: {
                    type: "EMAIL",
                    notes: `[AUTOMATED EMAIL OUTBOUND]\nSubject: ${parsedVal?.subject}\nBody: ${parsedVal?.body}`,
                    userId: entity.ownerId || entity.createdById,
                    workspaceId: rule.workspaceId,
                    ...(entity.firstName ? { leadId: entity.id } : { dealId: entity.id })
                }
            });

            // ACTUALLY Dispatch the email using the local transporter
            if (entity.email || entity.ownerId) {
                try {
                    const nodemailer = require("nodemailer");
                    const transporter = nodemailer.createTransport({
                        host: process.env.EMAIL_SERVER_HOST,
                        port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
                        secure: process.env.EMAIL_SERVER_PORT === "465",
                        auth: {
                            user: process.env.EMAIL_SERVER_USER,
                            pass: process.env.EMAIL_SERVER_PASSWORD,
                        },
                    });

                    // If it's a Welcome Email to Lead, send to lead.email. Otherwise send to internal owner.
                    const targetEmail = entity.email || (await prisma.user.findUnique({where: {id: entity.ownerId}}))?.email;
                    
                    if (targetEmail) {
                        // Replace template variables like {{lead.name}}
                        let formattedBody = parsedVal?.body || "";
                        if (entity.firstName) {
                            formattedBody = formattedBody.replace(/{{lead.name}}/ig, entity.firstName);
                        }

                        await transporter.sendMail({
                            from: process.env.EMAIL_FROM || "DigiXCrm Automations <noreply@digixcrm.com>",
                            to: targetEmail,
                            subject: parsedVal?.subject || "Automated Notification",
                            html: `
                                <div style="font-family: sans-serif; padding: 20px;">
                                    <p>${formattedBody.replace(/\n/g, "<br/>")}</p>
                                    <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;" />
                                    <p style="font-size: 12px; color: #999;">Automated by DigiXCrm Automation</p>
                                </div>
                            `
                        });
                    }
                } catch (err) {
                    console.error("Workflow SMTP Transport Failed:", err);
                }
            }
        }

        else if (action === "SEND_WHATSAPP") {
            // Mocking WA send
            await prisma.activity.create({
                data: {
                    type: "NOTE",
                    notes: `[AUTOMATED WHATSAPP SENT]: ${val}`,
                    userId: entity.ownerId || entity.createdById,
                    workspaceId: rule.workspaceId,
                    ...(entity.firstName ? { leadId: entity.id } : { dealId: entity.id })
                }
            });
        }

        else if (action === "ADD_TAG") {
            await prisma.activity.create({
                data: {
                    type: "NOTE",
                    notes: `[SYSTEM TAG APPLIED]: ${val}`,
                    userId: entity.ownerId || entity.createdById,
                    workspaceId: rule.workspaceId,
                    ...(entity.firstName ? { leadId: entity.id } : { dealId: entity.id })
                }
            });
        }

    } catch (e: any) {
        console.error(`Action ${action} failed for rule ${rule.id}: ${e.message}`);
    }
}

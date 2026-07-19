import { prisma } from "./prisma";
import { sendEmail as sendProfessionalEmail } from "@/lib/mail";
import { notificationEmitter } from "./event-emitter";

type NotificationType = "ASSIGNMENT" | "STATUS_CHANGE" | "DEAL_UPDATE";

interface NotificationOptions {
    userId: string;
    workspaceId?: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    sendEmail?: boolean;
}

export async function createNotification(options: NotificationOptions) {
    const { userId, workspaceId, title, message, type, link, sendEmail = true } = options;

    try {
        // 1. Save to database
        const notification = await prisma.notification.create({
            data: {
                userId,
                workspaceId,
                title,
                message,
                type,
                link,
            },
            include: {
                user: true
            }
        });

        // Broadcast real-time event to that exact user's stream
        if (notification) {
            notificationEmitter.emit(`notification:${userId}`, {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
                createdAt: notification.createdAt,
                isRead: false
            });
        }

        // 2. Send email if requested
        if (sendEmail && notification.user.email) {
            await sendProfessionalEmail({
                to: notification.user.email,
                subject: title,
                text: message,
                workspaceId, // Contextual SMTP
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #eaeaec; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                        <h2 style="color: #1e1b4b; margin-top: 0; font-size: 20px;">${title}</h2>
                        <p style="font-size: 16px; color: #444; line-height: 1.5;">${message}</p>
                        ${link ? `
                        <div style="margin-top: 25px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://digicareproducts.com'}${link}" style="display: inline-block; padding: 12px 24px; background-color: #1e1b4b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Details</a>
                        </div>` : ""}
                        <hr style="margin-top: 25px; border: 0; border-top: 1px solid #eaeaec;" />
                        <p style="font-size: 11px; color: #999; text-align: center; margin-top: 15px;">
                            Automated notification from <strong>DigiXCrm</strong>.
                        </p>
                    </div>
                `,
            });
        }

        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
}

export async function sendAssignmentNotification(lead: { id: string, firstName: string, lastName: string }, assignedUserId: string, workspaceId?: string) {
    const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
    if (!user) return;

    // 1. Notify the specific owner
    await createNotification({
        userId: assignedUserId,
        workspaceId,
        title: "New Lead Assigned",
        message: `You have been assigned a new lead: ${lead.firstName} ${lead.lastName}`,
        type: "ASSIGNMENT",
        link: `/dashboard/leads/${lead.id}`,
    });

    // 2. Notify all workspace admins and managers
    if (workspaceId) {
        const workspaceStaff = await (prisma as any).workspaceMember.findMany({
            where: {
                workspaceId,
                role: { in: ["ADMIN", "MANAGER"] },
                userId: { not: assignedUserId } // Don't notify the same person twice
            },
            select: { userId: true }
        });

        await Promise.all(workspaceStaff.map((staff: any) => createNotification({
                userId: staff.userId,
                workspaceId,
                title: "New Lead Assignment (Broadcast)",
                message: `Lead ${lead.firstName} ${lead.lastName} has been assigned to ${user.name || user.email}`,
                type: "ASSIGNMENT",
                link: `/dashboard/leads/${lead.id}`,
                sendEmail: false,
            })));
    }
}

export async function sendLeadStatusNotification(lead: { id: string, firstName: string, lastName: string, ownerId: string }, status: string, workspaceId?: string) {
    // 1. Notify the owner
    await createNotification({
        userId: lead.ownerId,
        workspaceId,
        title: "Lead Status Updated",
        message: `Lead ${lead.firstName} ${lead.lastName} status has been updated to ${status}`,
        type: "STATUS_CHANGE",
        link: `/dashboard/leads/${lead.id}`,
    });

    // 2. Notify all workspace admins and managers
    if (workspaceId) {
        const workspaceStaff = await (prisma as any).workspaceMember.findMany({
            where: {
                workspaceId,
                role: { in: ["ADMIN", "MANAGER"] },
                userId: { not: lead.ownerId }
            },
            select: { userId: true }
        });

        await Promise.all(workspaceStaff.map((staff: any) => createNotification({
                userId: staff.userId,
                workspaceId,
                title: "Lead Status Changed (Broadcast)",
                message: `Lead ${lead.firstName} ${lead.lastName} moved to ${status}`,
                type: "STATUS_CHANGE",
                link: `/dashboard/leads/${lead.id}`,
                sendEmail: false,
            })));
    }
}

export async function sendDealStageNotification(deal: { id: string, title: string, ownerId: string }, stage: string, workspaceId?: string) {
    // 1. Notify owner
    await createNotification({
        userId: deal.ownerId,
        workspaceId,
        title: "Deal Stage Updated",
        message: `Deal "${deal.title}" stage has been updated to ${stage}`,
        type: "DEAL_UPDATE",
        link: `/dashboard/deals/${deal.id}`,
    });

    // 2. Notify all workspace admins and managers
    if (workspaceId) {
        const workspaceStaff = await (prisma as any).workspaceMember.findMany({
            where: {
                workspaceId,
                role: { in: ["ADMIN", "MANAGER"] },
                userId: { not: deal.ownerId }
            },
            select: { userId: true }
        });

        await Promise.all(workspaceStaff.map((staff: any) => createNotification({
                userId: staff.userId,
                workspaceId,
                title: "Deal Pipeline Movement",
                message: `Deal "${deal.title}" has moved to ${stage}`,
                type: "DEAL_UPDATE",
                link: `/dashboard/deals/${deal.id}`,
                sendEmail: false,
            })));
    }
}

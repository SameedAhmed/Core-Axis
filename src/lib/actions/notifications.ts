"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getUnreadNotifications() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return [];

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return [];

        const notifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
                isRead: false
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 5
        });

        return notifications;
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return [];
    }
}

export async function markAsRead(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { success: false };

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { success: false };

        await prisma.notification.update({
            where: { id, userId: user.id },
            data: { isRead: true }
        });

        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

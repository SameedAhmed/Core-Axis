"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const twofactor = require("node-2fa");
import qrcode from "qrcode";

export async function generate2FA() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        const newSecret = twofactor.generateSecret({ name: "DigiXCrm", account: session.user.email });
        const secretStr = newSecret.secret;
        
        await prisma.user.update({
            where: { email: session.user.email },
            data: { twoFactorSecret: secretStr, isTwoFactorEnabled: false }
        });

        const qrCodeUrl = await qrcode.toDataURL(newSecret.uri || "");

        return { success: true, secret: secretStr, qrCodeUrl };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function verifyAndEnable2FA(token: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user || !(user as any).twoFactorSecret) return { success: false, error: "2FA setup not initiated" };

        const isCodeValid = twofactor.verifyToken((user as any).twoFactorSecret, token, 1);

        if (isCodeValid) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isTwoFactorEnabled: true }
            });
            return { success: true };
        }
        
        return { success: false, error: "Invalid token. Please try again." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function disable2FA() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        await prisma.user.update({
            where: { email: session.user.email },
            data: { isTwoFactorEnabled: false, twoFactorSecret: null }
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function adminDisableUser2FA(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!admin || (admin.role !== "ADMIN" && admin.role !== "MANAGER")) {
            return { success: false, error: "Unauthorized. Admin access required." };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isTwoFactorEnabled: false, twoFactorSecret: null }
        });
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

"use server";

import { prisma } from "@/lib/prisma";

/**
 * Validates a verification token (password reset or setup)
 * - Returns success if valid
 * - Returns error if not found or expired
 */
export async function validateToken(email: string, token: string) {
    try {
        if (!email || !token) {
            return { success: false, error: "Missing email or token." };
        }

        const normalizedEmail = email.toLowerCase();

        const verify = await prisma.verificationToken.findFirst({
            where: { identifier: normalizedEmail, token: token }
        });

        if (!verify) {
            return { success: false, error: "Link has already been used or is invalid." };
        }

        if (verify.expires < new Date()) {
            return { success: false, error: "This link has expired. Please request a new one." };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Security check failed." };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "./audit";
import { Role } from "@/generated/prisma/client/client";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";

export async function updateUserSettings(data: {
    name?: string;
    image?: string;
    jobTitle?: string;
    phoneNumber?: string;
    bio?: string;
    timezone?: string;
    language?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data
        });

        await createAuditLog({
            action: "UPDATE_PROFILE",
            entityType: "USER",
            entityId: updatedUser.id,
            details: `User updated profile settings: ${Object.keys(data).join(", ")}`
        });

        revalidatePath("/dashboard/settings");
        return { success: true, user: updatedUser };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUsers(workspaceId?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const currentUser = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: { workspaceMemberships: true }
        });

        if (!currentUser) return [];

        const isSuperAdmin = currentUser.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        const isAccountOwner = (currentUser as any).isAccountOwner;
        const accountId = (currentUser as any).accountId;

        // 1. If a specific workspaceId is provided, filter strictly to that workspace
        if (workspaceId) {
            const membership = currentUser.workspaceMemberships.find((m: any) => m.workspaceId === workspaceId);
            const isAuthorized = isSuperAdmin || isAccountOwner || (membership && (membership.role === "ADMIN" || membership.role === "MANAGER"));

            if (!isAuthorized) {
                return [currentUser];
            }

            return await (prisma as any).user.findMany({
                where: {
                    workspaceMemberships: {
                        some: {
                            workspaceId: workspaceId
                        }
                    }
                },
                include: { workspaceMemberships: true },
                orderBy: { createdAt: "desc" }
            });
        }

        // 2. Global/Account wide Fetch
        const managedWorkspaceIds = currentUser.workspaceMemberships
            .filter((m: any) => m.role === "ADMIN" || m.role === "MANAGER")
            .map((m: any) => m.workspaceId);

        if (managedWorkspaceIds.length === 0 && !isSuperAdmin && !isAccountOwner) {
            return [currentUser];
        }

        const where: any = {};
        if (!isSuperAdmin) {
            const orConditions: any[] = [
                { workspaceMemberships: { some: { workspaceId: { in: managedWorkspaceIds } } } }
            ];
            
            if (isAccountOwner && accountId) {
                orConditions.push({ accountId });
            }
            
            where.OR = orConditions;
        }

        return await (prisma as any).user.findMany({
            where,
            include: { workspaceMemberships: true },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        return [];
    }
}

import { canAddUserToAccount } from "@/lib/billing";
// ... (rest of imports)

export async function createUser(data: {
    name?: string;
    email: string;
    workspaceAssignments?: { 
        workspaceId: string, 
        role: "ADMIN" | "MANAGER" | "REP",
        customRoleId?: string | null
    }[];
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const currentUser = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: { workspaceMemberships: true }
        });

        if (!currentUser) throw new Error("Unauthorized");

        const accountId = (currentUser as any).accountId;
        if (!accountId) throw new Error("Organization Error: Your user account is not linked to a valid tenant/account structure.");

        // PROACTIVE HARD ENFORCEMENT: Check seat capacity before anything else
        const capacity = await canAddUserToAccount(accountId);
        if (!capacity.canAdd) {
            throw new Error(capacity.reason);
        }

        const { workspaceAssignments, ...userDetails } = data;

        // Ensure current user is an ADMIN in all assigned workspaces
        if (workspaceAssignments && workspaceAssignments.length > 0) {
            for (const wa of workspaceAssignments) {
                const membership = currentUser.workspaceMemberships.find((m: any) => m.workspaceId === wa.workspaceId);
                if (!membership || membership.role !== "ADMIN") {
                    throw new Error("Forbidden: You can only assign users to workspaces where you are an Admin.");
                }
            }
        }

        const primaryRole = (workspaceAssignments && workspaceAssignments.length > 0) 
            ? workspaceAssignments[0].role 
            : "REP";

        const newUser = await (prisma as any).user.create({
            data: {
                ...userDetails,
                accountId: accountId, // Critical: Link to parent account for billing isolation
                role: primaryRole, 
                activeWorkspaceId: workspaceAssignments && workspaceAssignments.length > 0
                    ? workspaceAssignments[0].workspaceId
                    : null
            }
        });

        // Handle workspace assignments
        if (workspaceAssignments && workspaceAssignments.length > 0) {
            // prisma.workspaceMember.createMany does not return results or allow include, and some engines have issues with customRoleId in createMany
            // We'll use individual creates for stability or a single transaction
            await prisma.$transaction(
                workspaceAssignments.map(wa => 
                    prisma.workspaceMember.create({
                        data: {
                            userId: newUser.id,
                            workspaceId: wa.workspaceId,
                            role: wa.role as Role,
                            customRoleId: wa.customRoleId || null
                        }
                    })
                )
            );
        }


        await createAuditLog({
            action: "CREATE_USER",
            entityType: "USER",
            entityId: newUser.id,
            details: `Workspace Admin created user: ${newUser?.name || newUser.email} (${newUser.email}). Assigned to ${workspaceAssignments?.length || 0} workspaces.`
        });

        // 1. Generate unique token for them to set up their password
        const token = crypto.randomBytes(32).toString('hex');


        const normalizedEmail = (newUser.email as string).toLowerCase();

        // Delete any existing tokens for this email
        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedEmail }
        });

        // Save token to DB via VerificationToken
        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token: token,
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) // 3 days expiry
            }
        });

        // 2. Send an invitation email to the user
        const firstWorkspaceId = workspaceAssignments && workspaceAssignments.length > 0
            ? workspaceAssignments[0].workspaceId
            : null;

        let workspaceName = "DigiXCrm";
        let workspaceLogo = null;
        
        if (firstWorkspaceId) {
            const ws = await (prisma as any).workspace.findUnique({
                where: { id: firstWorkspaceId },
                select: { name: true, logo: true }
            });
            if (ws) {
                workspaceName = ws.name;
                workspaceLogo = ws.logo;
            }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://digixcrm.com";
        const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
        const setupUrl = `${baseUrl}/auth/setup?email=${encodeURIComponent(newUser.email as string)}&token=${token}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 25px;">
                    ${workspaceLogo ? `<img src="${workspaceLogo}" alt="${workspaceName}" style="max-height: 50px; margin-bottom: 10px;" />` : ''}
                    <h2 style="color: #1e1b4b; margin: 0; font-size: 22px;">Welcome to ${workspaceName}</h2>
                </div>
                <p style="font-size: 15px; color: #333;">Hello,</p>
                <p style="font-size: 15px; color: #333; line-height: 1.6;">
                    You have been invited by an Administrator to join the <strong>${workspaceName}</strong> workspace on DigiXCrm. You have been assigned the role of <strong>${newUser.role}</strong>.
                </p>
                <p style="font-size: 15px; color: #333; line-height: 1.6;">
                    Please click the button below to set up your account and gain access to the system.
                </p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${setupUrl}" style="background-color: #1e1b4b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Complete Setup</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
                <p style="color: #777; font-size: 12px; text-align: center;">
                    If you did not expect this invitation, you can simply ignore this email.<br>
                    © ${new Date().getFullYear()} ${workspaceName} Powered by DigiXCrm
                </p>
            </div>
        `;

        await sendEmail({
            to: newUser.email as string,
            subject: `You have been invited to ${workspaceName}`,
            html,
            workspaceId: firstWorkspaceId || undefined
        });

        revalidatePath("/dashboard/settings");
        return { success: true, user: newUser };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "A user with this email already exists" };
        return { success: false, error: error.message };
    }
}

export async function deleteUser(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (currentUser?.role !== "ADMIN") throw new Error("Forbidden");
        if (currentUser.id === id) throw new Error("You cannot delete your own account");

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) throw new Error("User not found.");

        const isSuperAdmin = currentUser.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        if (!isSuperAdmin && targetUser.accountId !== (currentUser as any).accountId) {
            throw new Error("Forbidden: User belongs to a different organization.");
        }

        // Safety check to prevent altering the Super Admin
        if (targetUser?.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) {
            throw new Error("Cannot delete the Super Admin.");
        }

        // ─── Now safe to delete (Schema handles Cascade/SetNull for relations) ────

        // ─── Now safe to delete ───────────────────────────────────────────────
        const deletedUser = await prisma.user.delete({
            where: { id }
        });

        await createAuditLog({
            action: "DELETE_USER",
            entityType: "USER",
            entityId: id,
            details: `Admin deleted user: ${deletedUser.name} (${deletedUser.email})`
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserRole(id: string, role: "ADMIN" | "MANAGER" | "REP") {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (currentUser?.role !== "ADMIN") throw new Error("Forbidden: Only Admins can modify roles");
        if (currentUser.id === id) throw new Error("You cannot change your own role to prevent lockout");

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) throw new Error("User not found.");

        const isSuperAdmin = currentUser.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        if (!isSuperAdmin && targetUser.accountId !== (currentUser as any).accountId) {
            throw new Error("Forbidden: User belongs to a different organization.");
        }

        if (targetUser?.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) {
            throw new Error("Cannot modify the role of the Super Admin.");
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role: role as Role }
        });

        await createAuditLog({
            action: "UPDATE_USER_ROLE",
            entityType: "USER",
            entityId: id,
            details: `Admin updated user ${updatedUser.email} role to ${role}`
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ---- CUSTOM AUTH FLOW ACTIONS ----

export async function completeUserSetup(data: { 
    email: string, 
    token: string, 
    name: string, 
    jobTitle?: string,
    phoneNumber?: string,
    password: string 
}) {
    try {
        const normalizedEmail = data.email.toLowerCase();

        // Find token
        const verify = await prisma.verificationToken.findFirst({
            where: { identifier: normalizedEmail, token: data.token }
        });

        if (!verify) throw new Error("This setup link is invalid or has already been used.");
        if (verify.expires < new Date()) throw new Error("Sign-up link has expired. Ask admin for a new one.");

        // Hash new password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const updatedUser = await prisma.user.update({
            where: { email: data.email },
            data: {
                name: data.name,
                jobTitle: data.jobTitle || null,
                phoneNumber: data.phoneNumber || null,
                password: hashedPassword,
                emailVerified: new Date()
            }
        });

        // Clear token
        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedEmail }
        });

        await createAuditLog({
            action: "USER_SETUP",
            entityType: "USER",
            entityId: updatedUser.id,
            details: `User completed initial setup`
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function requestPasswordReset(email: string) {
    try {
        const targetUser = await (prisma as any).user.findUnique({ 
            where: { email },
            include: { activeWorkspace: true }
        });

        if (!targetUser) {
            // we return success even if user not found for security purposes
            return { success: true };
        }

        const normalizedEmail = email.toLowerCase();
        const token = crypto.randomBytes(32).toString('hex');

        // SECURITY: Clear existing tokens and create new one with 1-hour expiry
        await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token: token,
                expires: new Date(Date.now() + 1000 * 60 * 60) // 1 hour for password reset
            }
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://digixcrm.com";
        const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
        const resetUrl = `${baseUrl}/auth/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

        const workspaceName = (targetUser as any).activeWorkspace?.name || "DigiXCrm";
        const workspaceLogo = (targetUser as any).activeWorkspace?.logo || null;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    ${workspaceLogo ? `<img src="${workspaceLogo}" alt="${workspaceName}" style="max-height: 40px; margin-bottom: 10px;" />` : ''}
                    <h2 style="color: #1e1b4b; margin: 0;">Reset Your Password</h2>
                </div>
                <p>We received a request to reset your password for your account at <strong>${workspaceName}</strong>.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${resetUrl}" style="background-color: #1e1b4b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #777; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="color: #999; font-size: 10px; text-align: center;">Powered by DigiXCrm</p>
            </div>
        `;

        await sendEmail({
            to: (targetUser.email as string),
            subject: `Password Reset Request - ${workspaceName}`,
            html,
            workspaceId: targetUser.activeWorkspaceId || undefined
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resetPassword(data: { email: string, token: string, password: string }) {
    try {
        const normalizedEmail = data.email.toLowerCase();

        const verify = await prisma.verificationToken.findFirst({
            where: { identifier: normalizedEmail, token: data.token }
        });

        if (!verify) throw new Error("This reset link is invalid or has already been used.");
        if (verify.expires < new Date()) throw new Error("Password reset link has expired.");

        const hashedPassword = await bcrypt.hash(data.password, 10);

        await prisma.user.update({
            where: { email: data.email },
            data: { password: hashedPassword }
        });

        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedEmail }
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleUserStatus(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const currentUser = await (prisma as any).user.findUnique({
            where: { email: session.user.email }
        });

        const isSuperAdmin = currentUser?.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
        const isAccountOwner = (currentUser as any)?.isAccountOwner;

        if (!isSuperAdmin && !isAccountOwner) {
            throw new Error("Forbidden: Only Account Owners or Super Admin can toggle user status");
        }

        const targetUser = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (!targetUser) throw new Error("User not found");

        if (!isSuperAdmin && targetUser.accountId !== (currentUser as any).accountId) {
            throw new Error("Forbidden: User belongs to a different organization.");
        }

        if (currentUser?.id === userId) {
            throw new Error("You cannot suspend your own account.");
        }

        if (targetUser.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) {
            throw new Error("Cannot suspend the Master Admin.");
        }

        const updated = await (prisma as any).user.update({
            where: { id: userId },
            data: { isActive: !targetUser.isActive }
        });

        await createAuditLog({
            action: "TOGGLE_USER_STATUS",
            entityType: "USER",
            entityId: userId,
            details: `Admin toggled status for ${updated.email} to ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}`
        });

        revalidatePath("/dashboard/settings");
        return { success: true, isActive: updated.isActive };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

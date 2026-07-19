"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "./audit";
import { getVerifiedRecord, getEffectiveRole } from "@/lib/permissions";
import { touchWorkspace } from "./workspaces";
import { z } from "zod";

const contactSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    organizationId: z.string().optional().nullable(),
});

export async function createContact(rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        const data = contactSchema.parse(rawData);

        const workspaceId = (user as any).activeWorkspaceId || null;

        const newContact = await prisma.contact.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || null,
                phone: data.phone || null,
                organizationId: data.organizationId || null,
                ownerId: user.id,
                workspaceId
            }
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "CONTACT",
            entityId: newContact.id,
            details: `Created contact: ${newContact.firstName} ${newContact.lastName}`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/contacts");
        return { success: true, data: newContact };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create contact" };
    }
}

export async function updateContact(id: string, rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        await getVerifiedRecord(prisma.contact, id, user.id, effectiveRole, workspaceId);

        const data = contactSchema.partial().parse(rawData);

        const updatedContact = await prisma.contact.update({
            where: { id },
            data: {
                ...data,
                email: data.email || null,
                phone: data.phone || null,
            }
        });

        await createAuditLog({
            action: "UPDATE",
            entityType: "CONTACT",
            entityId: updatedContact.id,
            details: `Updated contact: ${updatedContact.firstName} ${updatedContact.lastName}`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/contacts");
        return { success: true, data: updatedContact };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update contact" };
    }
}

export async function deleteContact(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        await getVerifiedRecord(prisma.contact, id, user.id, effectiveRole, workspaceId);

        const deletedContact = await prisma.contact.delete({
            where: { id }
        });

        await createAuditLog({
            action: "DELETE",
            entityType: "CONTACT",
            entityId: id,
            details: `Deleted contact: ${deletedContact.firstName} ${deletedContact.lastName}`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/contacts");
        return { success: true, data: deletedContact };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete contact" };
    }
}

export async function importBulkContacts(contacts: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const workspaceId = (user as any).activeWorkspaceId || null;

        const formattedContacts = contacts.map(contact => ({
            firstName: contact.firstName || contact["First Name"] || "Unknown",
            lastName: contact.lastName || contact["Last Name"] || "Unknown",
            email: contact.email || contact.Email || null,
            phone: String(contact.phone || contact.Phone || "").trim(),
            organizationId: contact.organizationId || null,
            ownerId: user.id,
            workspaceId,
            createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
            updatedAt: new Date()
        }));

        const result = await prisma.contact.createMany({
            data: formattedContacts,
            skipDuplicates: true
        });

        await createAuditLog({
            action: "BULK_IMPORT",
            entityType: "CONTACT",
            details: `Imported ${result.count} contacts via CSV`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/contacts");
        return { success: true, count: result.count };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to import contacts" };
    }
}

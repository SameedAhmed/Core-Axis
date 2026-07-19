"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

export async function provisionDemoAccount() {
    // 1. Verify Authorization
    if (!await isSuperAdmin()) {
        return { success: false, error: "Unauthorized. Super Admin rights required." };
    }

    try {
        const DEMO_EMAIL = "demo@digixcrm.com";

        console.log("[Demo Provision] Initiating...");

        // 2. Cascade Cleanup Existing Demo Account
        const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

        if (existingUser) {
            console.log("[Demo Provision] Cleaning up old demo data...");
            await prisma.auditLog.deleteMany({ where: { userId: existingUser.id } });
            await prisma.activity.deleteMany({ where: { userId: existingUser.id } });
            await prisma.contact.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.deal.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.lead.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.organization.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.workspaceMember.deleteMany({ where: { userId: existingUser.id } });
            await prisma.workspace.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.subscriptionAccount.deleteMany({ where: { ownerId: existingUser.id } });
            await prisma.user.deleteMany({ where: { id: existingUser.id } });
        }

        // 3. Environment Generation
        console.log("[Demo Provision] Generating new Subscription & Global Hierarchy...");
        const passwordHash = await bcrypt.hash("demo123", 10);

        const newAccount = await (prisma as any).subscriptionAccount.create({
            data: {
                name: "Acme Corp (Global)",
                planTier: "ENTERPRISE",
                hasPaymentSetup: true,
                ownerId: "TEMP" // temporary bypass will update post user
            }
        });

        const demoUser = await prisma.user.create({
            data: {
                name: "Demo Account",
                email: DEMO_EMAIL,
                password: passwordHash,
                role: "ADMIN",
                isAccountOwner: true,
                accountId: newAccount.id,
                hasCompletedOnboarding: true,
                jobTitle: "VP of Sales",
                isActive: true,
            }
        });

        await (prisma as any).subscriptionAccount.update({
            where: { id: newAccount.id },
            data: { ownerId: demoUser.id }
        });

        console.log("[Demo Provision] Generating Demo Workspace...");
        const demoWorkspace = await prisma.workspace.create({
            data: {
                name: "Acme Corp Operations",
                accountId: newAccount.id,
                ownerId: demoUser.id,
                industry: "technology",
                website: "https://acmecorp.demo"
            }
        });

        await prisma.user.update({
            where: { id: demoUser.id },
            data: { activeWorkspaceId: demoWorkspace.id }
        });

        await prisma.workspaceMember.create({
            data: {
                workspaceId: demoWorkspace.id,
                userId: demoUser.id,
                role: "ADMIN"
            }
        });

        // 4. Data Population Engine
        console.log("[Demo Provision] Seeding 15 Realistic Organizations...");
        const organizations = [];
        for (let i = 0; i < 15; i++) {
            const org = await prisma.organization.create({
                data: {
                    name: faker.company.name(),
                    website: faker.internet.url(),
                    workspaceId: demoWorkspace.id,
                    ownerId: demoUser.id,
                    createdById: demoUser.id
                }
            });
            organizations.push(org);
        }

        console.log("[Demo Provision] Seeding 50 Robust Leads...");
        const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"];
        const leads = [];
        for (let i = 0; i < 50; i++) {
            const randomOrg = faker.helpers.arrayElement(organizations);
            const status = faker.helpers.arrayElement(leadStatuses) as any;
            const leadDate = faker.date.recent({ days: 30 });
            
            const lead = await prisma.lead.create({
                data: {
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    email: faker.internet.email(),
                    phone: faker.phone.number(),
                    service: faker.helpers.arrayElement(["Enterprise Implementation", "Analytics Audit", "Cloud Migration", "Managed Services"]),
                    quotation: faker.number.float({ min: 500, max: 25000, fractionDigits: 2 }),
                    remarks: faker.lorem.sentence(),
                    status,
                    source: faker.helpers.arrayElement(["MANUAL", "CSV_IMPORT", "WEBHOOK", "API"]),
                    workspaceId: demoWorkspace.id,
                    ownerId: demoUser.id,
                    createdById: demoUser.id,
                    organizationId: randomOrg.id,
                    createdAt: leadDate,
                    updatedAt: leadDate,
                    isViewed: faker.datatype.boolean()
                }
            });
            leads.push(lead);
        }

        console.log("[Demo Provision] Seeding 25 CRM Contacts...");
        const contacts = [];
        for (let i = 0; i < 25; i++) {
            const randomOrg = faker.helpers.arrayElement(organizations);
            const contact = await prisma.contact.create({
                data: {
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    email: faker.internet.email(),
                    phone: faker.phone.number(),
                    workspaceId: demoWorkspace.id,
                    ownerId: demoUser.id,
                    organizationId: randomOrg.id,
                }
            });
            contacts.push(contact);
        }

        console.log("[Demo Provision] Seeding 20 Deals...");
        const dealStages = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
        const deals = [];
        for (let i = 0; i < 20; i++) {
            const randomOrg = faker.helpers.arrayElement(organizations);
            const stage = faker.helpers.arrayElement(dealStages) as any;
            const dealDate = faker.date.recent({ days: 45 });
            
            const deal = await prisma.deal.create({
                data: {
                    title: `${randomOrg.name} - ${faker.helpers.arrayElement(["Q3 Expansion", "Platform Contract", "Pilot Program", "Renewals"])}`,
                    value: faker.number.float({ min: 5000, max: 150000, fractionDigits: 2 }),
                    stage,
                    workspaceId: demoWorkspace.id,
                    ownerId: demoUser.id,
                    createdById: demoUser.id,
                    organizationId: randomOrg.id,
                    createdAt: dealDate,
                    updatedAt: dealDate
                }
            });
            deals.push(deal);
        }

        console.log("[Demo Provision] Generating Timeline Activities...");
        for (let i = 0; i < 60; i++) {
            const randomLead = faker.helpers.arrayElement(leads);
            const randomContact = faker.helpers.arrayElement(contacts);
            const randomDeal = faker.helpers.arrayElement(deals);
            const activityType = faker.helpers.arrayElement(["Email", "Call", "Meeting", "Note"]);
            const activityDate = faker.date.recent({ days: 28 });

            await prisma.activity.create({
                data: {
                    type: activityType,
                    notes: faker.lorem.paragraph(),
                    userId: demoUser.id,
                    workspaceId: demoWorkspace.id,
                    leadId: faker.datatype.boolean() ? randomLead.id : null,
                    contactId: faker.datatype.boolean() ? randomContact.id : null,
                    dealId: faker.datatype.boolean() ? randomDeal.id : null,
                    createdAt: activityDate,
                    updatedAt: activityDate
                }
            });
        }

        console.log("[Demo Provision] Demo Environment Completely Provisioned!");
        return { success: true, email: DEMO_EMAIL, password: "demo123" };
    } catch (error: any) {
        console.error("[Demo Provision Error]:", error);
        return { success: false, error: error.message };
    }
}

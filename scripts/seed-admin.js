const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding High-Authority Super Admin & Global SaaS Context...");
    
    const email = "admin@crm.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create User (Identity)
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: "ADMIN",
            isAccountOwner: true,
            hasCompletedOnboarding: true
        },
        create: {
            email,
            name: "Super Admin",
            password: hashedPassword,
            role: "ADMIN",
            isAccountOwner: true,
            hasCompletedOnboarding: true
        },
    });

    // 2. Create Global Subscription Account (Billing Context)
    const accountName = "DigiXCrm Global Operations";
    const account = await prisma.subscriptionAccount.create({
        data: {
            name: accountName,
            planTier: "ENTERPRISE",
            ownerId: user.id,
            activeSeats: 1
        }
    });

    // Update user with account reference
    await prisma.user.update({
        where: { id: user.id },
        data: { accountId: account.id }
    });

    // 3. Create Default Workspace (Sub-Partition)
    const workspaceName = "Primary Command Center";
    const workspace = await prisma.workspace.create({
        data: {
            name: workspaceName,
            ownerId: user.id,
            accountId: account.id,
            industry: "Technology",
            website: "https://digicareproducts.com",
            description: "Default command center for the DigiXCrm ecosystem."
        },
    });

    // 4. Add User to Workspace (Membership)
    await prisma.workspaceMember.create({
        data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "ADMIN"
        },
    });

    // 5. Set Active Workspace (UI Mapping)
    await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspace.id },
    });

    console.log("-----------------------------------------");
    console.log("✅ Platform Master Ready for Deployment!");
    console.log("📧 Email: " + email);
    console.log("🔑 Password: " + password);
    console.log("🏢 Account: " + accountName);
    console.log("🌐 Workspace: " + workspaceName);
    console.log("-----------------------------------------");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

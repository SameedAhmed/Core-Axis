import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client/client'
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from 'bcryptjs'

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com"
  const password = process.env.SUPER_ADMIN_PASSWORD || "AdminPassword2026@" // Use ENV or default
  const hashedPassword = await bcrypt.hash(password, 12)

  console.log('--- Database Seeding (Master Administrator) ---')

  // 1. Create or Find Super Admin
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      name: 'Master Admin',
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
      isTwoFactorEnabled: false,
      isAccountOwner: true,
    },
  })

  console.log(`✅ User [${email}] established (ID: ${user.id}).`)

  // 2. Create or Find Subscription Account for Super Admin
  let account = await (prisma as any).subscriptionAccount.findFirst({
    where: { ownerId: user.id }
  });

  if (!account) {
    account = await (prisma as any).subscriptionAccount.create({
      data: {
        name: 'Master System Organization',
        ownerId: user.id,
        planTier: 'ENTERPRISE',
        activeSeats: 1, // Starts at 1 — reflects actual licensed users
        hasPaymentSetup: true
      }
    });
    console.log(`✅ Subscription Account [${account.name}] created.`);
  } else {
    // If account already exists, update activeSeats to reflect reality
    account = await (prisma as any).subscriptionAccount.update({
      where: { id: account.id },
      data: { activeSeats: 1 }
    });
    console.log(`✅ Subscription Account updated — activeSeats corrected to 1.`);
  }

  // Update User with account ID
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      accountId: account.id,
      isAccountOwner: true 
    }
  });

  // 3. Create Default Workspace if none exists
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id }
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Master Command Workspace',
        ownerId: user.id,
        accountId: account.id,
      }
    });
    console.log(`✅ System Workspace [${workspace.name}] created.`);
  } else {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { accountId: account.id }
    });
  }

  // 4. Connect User to Workspace (Member)
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    update: { role: 'ADMIN' },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'ADMIN'
    }
  })

  // 5. Set Active Workspace
  await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id }
  })

  console.log('--- SEEDING COMPLETE ---')
  console.log('Email:', email)
  console.log('Password (if fresh):', password)
  console.log('Status: Account Owner verified and linked to System Account.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

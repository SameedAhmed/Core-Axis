import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client/client'
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from 'bcryptjs'

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter })

// Dummy Arrays
const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'Chris', 'Sarah', 'David', 'Jessica', 'Matthew', 'Ashley', 'Daniel', 'Amanda', 'James', 'Melissa', 'Robert', 'Jennifer', 'William', 'Nicole', 'Joseph', 'Stephanie'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const orgNames = ['Tech Solutions Inc', 'Global Synergy', 'Apex Innovations', 'Quantum Dynamics', 'Starlight Enterprises', 'Nexus Corp', 'Horizon Data', 'Vertex Systems', 'Pinnacle Technologies', 'Omega Group', 'Elevate Partners', 'Syndicate Global', 'Blue Ocean Tech', 'Red Horizon', 'Hyperion Systems'];

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPhone = () => `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;

async function main() {
  console.log('🚀 Starting DigiXCrm CRM Demo Data Seed...');

  const email = "demo@digixcrm.com";
  const password = "DemoPassword2026@";
  const hashedPassword = await bcrypt.hash(password, 12);

  // 1. Create Demo Admin User
  console.log('👤 Creating Master Demo User...');
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      name: 'Demo Admin',
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
      isTwoFactorEnabled: false,
      isAccountOwner: true,
      hasCompletedOnboarding: true,
    },
  });

  // 2. Setup Subscription Account
  console.log('🏢 Setting up Demo Enterprise Account...');
  let account = await (prisma as any).subscriptionAccount.findFirst({
    where: { ownerId: user.id }
  });

  if (!account) {
    account = await (prisma as any).subscriptionAccount.create({
      data: {
        name: 'Demo Master Enterprise',
        ownerId: user.id,
        planTier: 'ENTERPRISE',
        activeSeats: 150,
        hasPaymentSetup: true
      }
    });
  }

  // 3. Create Demo Workspace
  console.log('💼 Setting up Demo Workspace...');
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id }
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'DigiXCrm Global HQ',
        ownerId: user.id,
        accountId: account.id,
        industry: 'Software',
      }
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id, accountId: account.id }
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'ADMIN' },
    create: { userId: user.id, workspaceId: workspace.id, role: 'ADMIN' }
  });

  // 4. Generate 55 Users in this workspace
  console.log('👥 Generating 55+ Sales Reps and Managers...');
  const activeUsers = [user];
  for (let i = 0; i < 55; i++) {
    const fn = randomItem(firstNames);
    const ln = randomItem(lastNames);
    const uEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@demo.digixcrm.com`;
    
    const u = await prisma.user.upsert({
      where: { email: uEmail },
      update: {},
      create: {
        email: uEmail,
        name: `${fn} ${ln}`,
        password: hashedPassword,
        role: i < 8 ? 'MANAGER' : 'REP',
        isAccountOwner: false,
        accountId: account.id,
        hasCompletedOnboarding: true,
      }
    });

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: u.id } },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: u.id,
        role: u.role as any
      }
    });

    activeUsers.push(u);
  }

  // 5. Generate Organizations (Clients)
  console.log('🏙️ Generating 15+ Organizations and Contacts...');
  const orgs = [];
  for (const orgName of orgNames) {
    const orgOwner = randomItem(activeUsers);
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        website: `www.${orgName.replace(/\s+/g, '').toLowerCase()}.com`,
        ownerId: orgOwner.id,
        workspaceId: workspace.id,
        createdById: orgOwner.id,
      }
    });
    orgs.push(org);

    // Generate 2-5 Contacts per Organization
    const contactCount = randomInt(2, 5);
    for (let c = 0; c < contactCount; c++) {
      const fn = randomItem(firstNames);
      const ln = randomItem(lastNames);
      await prisma.contact.create({
        data: {
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${org.website?.replace('www.', '')}`,
          phone: randomPhone(),
          ownerId: orgOwner.id,
          organizationId: org.id,
          workspaceId: workspace.id,
        }
      });
    }
  }

  // 6. Generate Leads
  console.log('🎯 Generating 120+ Leads (Unread & Read modes)...');
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'];
  for (let i = 0; i < 125; i++) {
    const fn = randomItem(firstNames);
    const ln = randomItem(lastNames);
    const leadOwner = randomItem(activeUsers);
    const status = randomItem(leadStatuses);

    await prisma.lead.create({
      data: {
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@external.com`,
        phone: randomPhone(),
        status: status as any,
        source: randomItem(['Website', 'Referral', 'Cold Call', 'Social Media', 'Trade Show']),
        quotation: randomInt(1500, 25000),
        ownerId: leadOwner.id,
        createdById: leadOwner.id,
        workspaceId: workspace.id,
        isViewed: status === 'NEW' ? (Math.random() > 0.4) : true, // 60% of new leads are unread
      }
    });
  }

  // 7. Generate Deals (Pipeline visualization)
  console.log('💼 Generating 85+ Deals in various Pipeline stages...');
  const dealStages = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
  for (let i = 0; i < 85; i++) {
    const org = randomItem(orgs);
    const dealOwner = randomItem(activeUsers);
    const stage = randomItem(dealStages);

    await prisma.deal.create({
      data: {
        title: `${org.name} - ${randomItem(['Q3 Expansion', 'Annual License', 'Enterprise Rollout', 'Consulting Package', 'Cloud Migration'])}`,
        value: randomInt(6000, 150000),
        stage: stage as any,
        ownerId: dealOwner.id,
        createdById: dealOwner.id,
        organizationId: org.id,
        workspaceId: workspace.id,
      }
    });
  }

  console.log('✅ DEMO SEEDING COMPLETE!');
  console.log('----------------------------------------------------');
  console.log('Email to login: demo@digixcrm.com');
  console.log('Password:       DemoPassword2026@');
  console.log('----------------------------------------------------');
  console.log('You now have 50+ users, 15 orgs, 120+ leads, and 85+ deals ready for the video!');
}

main()
  .catch((e) => {
    console.error('CRITICAL ERROR DURING SEEDING:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });

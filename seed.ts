import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client/client';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({ adapter });

async function main() {
  const workspaces = await prisma.workspace.findMany({ include: { members: true } });
  if (!workspaces.length) {
    console.log("No workspaces found, skipping seed.");
    return;
  }

  console.log(`Discovered ${workspaces.length} workspaces. Syncing sample workflows...`);

  for (const workspace of workspaces) {
    const adminUser = workspace.members.find(m => m.role === "ADMIN") || workspace.members[0];
    if (!adminUser) {
      console.log(`Skipping workspace ${workspace.name} (no admin user found)`);
      continue;
    }

    const rules = [
      {
        name: "VIP PPC Lead Routing",
        trigger: "LEAD_CREATED",
        conditions: { source: "PPC" },
        action: "ASSIGN_OWNER",
        actionValue: adminUser.userId,
        workspaceId: workspace.id,
        isActive: true,
      },
      {
        name: "Send Welcome Email to Fresh Leads",
        trigger: "LEAD_CREATED",
        conditions: {},
        action: "SEND_EMAIL",
        actionValue: JSON.stringify({ subject: "Welcome to Our Platform!", body: "Hi there, we received your inquiry." }),
        workspaceId: workspace.id,
        isActive: true,
      },
      {
        name: "Auto-Tag SEO Organic Profiles",
        trigger: "LEAD_CREATED",
        conditions: { source: "SEO" },
        action: "ADD_TAG",
        actionValue: "Organic Traffic",
        workspaceId: workspace.id,
        isActive: true,
      },
      {
        name: "Urgent SLA Task for High Value Deal",
        trigger: "DEAL_CREATED",
        conditions: {},
        action: "CREATE_TASK",
        actionValue: JSON.stringify({ title: "Call client immediately - 15min SLA" }),
        workspaceId: workspace.id,
        isActive: false, // Paused as an example
      },
      {
        name: "WhatsApp Ping on Deal WON",
        trigger: "DEAL_WON",
        conditions: {},
        action: "SEND_WHATSAPP",
        actionValue: "Deal Won Celebration! 🚀",
        workspaceId: workspace.id,
        isActive: true,
      },
      {
        name: "Mark Initial Deal Stage properly",
        trigger: "DEAL_CREATED",
        conditions: { status: "NEW" }, // Note: conditions might not match deal strictly, just demo
        action: "UPDATE_STATUS",
        actionValue: "PROPOSAL",
        workspaceId: workspace.id,
        isActive: false,
      }
    ];

    for (const r of rules) {
      const existing = await prisma.automationRule.findFirst({
        where: { name: r.name, workspaceId: workspace.id }
      });
      if (!existing) {
        await prisma.automationRule.create({ data: r });
      }
    }
    console.log(`✅ Seeded workflows for: ${workspace.name}`);
  }

  console.log("Seeding complete for all workspaces!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

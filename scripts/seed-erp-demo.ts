import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client/index'
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any) as any;

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

const EXPENSE_TEMPLATES: { title: string; category: string; range: [number, number] }[] = [
  { title: "AWS Cloud Infrastructure", category: "Software", range: [800, 2200] },
  { title: "Slack Enterprise License", category: "Software", range: [150, 400] },
  { title: "WeWork Office Rent", category: "Facilities", range: [3000, 5000] },
  { title: "Office Utilities", category: "Facilities", range: [200, 500] },
  { title: "Google Ads Campaign", category: "Marketing", range: [1500, 6000] },
  { title: "LinkedIn Sponsored Content", category: "Marketing", range: [500, 1800] },
  { title: "Team Flight - Client Visit", category: "Travel", range: [300, 900] },
  { title: "Conference Hotel Booking", category: "Travel", range: [250, 700] },
  { title: "Dell Monitors (x5)", category: "Hardware", range: [900, 1600] },
  { title: "Laptop Replacement", category: "Hardware", range: [1200, 2000] },
];

// Deliberately unusual entries so the anomaly detector (z-score > 2 per category) has something real to flag.
const OUTLIER_TEMPLATES: { title: string; category: string; amount: number }[] = [
  { title: "Emergency Data Recovery - Legal Hold", category: "Software", amount: 9800 },
  { title: "Last-Minute Trade Show Booth Buildout", category: "Marketing", amount: 14200 },
];

const INVOICE_STATUSES = ["PAID", "PAID", "PAID", "PENDING", "OVERDUE"];

const CANDIDATE_PROFILES: { name: string; email: string; appliedRole: string; resumeText: string }[] = [
  {
    name: "Ayesha Raza",
    email: "ayesha.raza@example.com",
    appliedRole: "Senior Backend Engineer (Node.js, PostgreSQL, AWS)",
    resumeText:
      "5 years building backend services in Node.js and TypeScript, deep experience with PostgreSQL schema design, Prisma ORM, REST API design, and deploying on AWS (EC2, RDS, S3). Led migration of a monolith to microservices; comfortable with Docker and CI/CD pipelines.",
  },
  {
    name: "Bilal Sheikh",
    email: "bilal.sheikh@example.com",
    appliedRole: "Senior Backend Engineer (Node.js, PostgreSQL, AWS)",
    resumeText:
      "3 years as a WordPress and PHP developer building marketing sites for small businesses. Some exposure to MySQL. Familiar with basic HTML/CSS/JS and cPanel hosting.",
  },
  {
    name: "Sara Khan",
    email: "sara.khan@example.com",
    appliedRole: "Product Designer (Figma, UX Research)",
    resumeText:
      "4 years as a product designer, expert in Figma component systems, ran user interviews and usability testing for B2B SaaS dashboards, built design systems adopted across 3 product teams.",
  },
  {
    name: "Usman Tariq",
    email: "usman.tariq@example.com",
    appliedRole: "Sales Development Representative",
    resumeText:
      "2 years in outbound sales development, ran cold email and LinkedIn outreach campaigns, consistently hit quota booking qualified demos, used HubSpot and Salesforce CRM daily.",
  },
  {
    name: "Hina Farooq",
    email: "hina.farooq@example.com",
    appliedRole: "HR Generalist (Payroll & Recruitment)",
    resumeText:
      "Managed end-to-end recruitment cycles for a 60-person startup, ran payroll processing, handled onboarding and employee relations, familiar with local labor compliance requirements.",
  },
  {
    name: "Zainab Ali",
    email: "zainab.ali@example.com",
    appliedRole: "Product Designer (Figma, UX Research)",
    resumeText:
      "1 year junior graphic designer, mostly Photoshop and Canva work for social media posts, no formal UX research or Figma prototyping experience yet.",
  },
];

const PRODUCT_TEMPLATES: { name: string; sku: string; category: string; unitPrice: number; startStock: number; reorderLevel: number; demandTrend: "flat" | "rising" | "critical" }[] = [
  { name: "Wireless Mouse", sku: "WM-100", category: "Electronics", unitPrice: 24.99, startStock: 120, reorderLevel: 30, demandTrend: "flat" },
  { name: "USB-C Hub", sku: "UCH-200", category: "Electronics", unitPrice: 39.99, startStock: 80, reorderLevel: 25, demandTrend: "rising" },
  { name: "Office Chair (Ergonomic)", sku: "OCE-300", category: "Furniture", unitPrice: 189.0, startStock: 25, reorderLevel: 10, demandTrend: "flat" },
  { name: "Standing Desk", sku: "SD-400", category: "Furniture", unitPrice: 349.0, startStock: 15, reorderLevel: 8, demandTrend: "rising" },
  { name: "27in Monitor", sku: "MON-500", category: "Electronics", unitPrice: 259.0, startStock: 18, reorderLevel: 12, demandTrend: "critical" },
  { name: "Notebook (Pack of 10)", sku: "NB-600", category: "Office Supplies", unitPrice: 12.5, startStock: 200, reorderLevel: 40, demandTrend: "flat" },
];

async function main() {
  console.log("🚀 Seeding real ERP demo data (Expenses, Invoices, Candidates, Inventory, Attendance)...");

  const workspaces = await prisma.workspace.findMany({
    include: {
      owner: true,
      organizations: { take: 5 },
      // NOTE: select (not include) and omit `role` here — some legacy
      // WorkspaceMember rows have role values ('STAFF', 'PROJECT_MANAGER')
      // that predate the current Role enum and aren't valid in it, which
      // makes Prisma throw P2023 if that field is hydrated.
      members: { select: { userId: true, user: { select: { id: true, name: true, email: true } } }, take: 15 },
    },
  });

  if (workspaces.length === 0) {
    console.log("No workspaces found. Run db:seed:demo first, or create a workspace by signing up.");
    return;
  }

  for (const workspace of workspaces) {
    const creatorId = workspace.ownerId;
    console.log(`\n💼 Workspace: ${workspace.name} (${workspace.id})`);

    // --- Expenses across the last 6 months ---
    const existingExpenseCount = await prisma.expense.count({ where: { workspaceId: workspace.id } });
    if (existingExpenseCount === 0) {
      console.log("  💵 Generating 6 months of expenses (with a couple of real anomalies)...");
      for (let m = 5; m >= 0; m--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - m);

        const count = randomInt(4, 7);
        for (let i = 0; i < count; i++) {
          const template = randomItem(EXPENSE_TEMPLATES);
          const day = randomInt(1, 27);
          const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);

          await prisma.expense.create({
            data: {
              title: template.title,
              amount: randomFloat(template.range[0], template.range[1]),
              category: template.category,
              date,
              workspaceId: workspace.id,
              createdById: creatorId,
            },
          });
        }
      }

      // Inject the outliers into the most recent month so they show up front-and-center.
      const recentMonth = new Date();
      for (const outlier of OUTLIER_TEMPLATES) {
        await prisma.expense.create({
          data: {
            title: outlier.title,
            amount: outlier.amount,
            category: outlier.category,
            date: new Date(recentMonth.getFullYear(), recentMonth.getMonth(), randomInt(1, 27)),
            workspaceId: workspace.id,
            createdById: creatorId,
          },
        });
      }
    } else {
      console.log(`  💵 ${existingExpenseCount} expenses already present, skipping.`);
    }

    // --- Invoices across the last 6 months ---
    const existingInvoiceCount = await prisma.invoice.count({ where: { workspaceId: workspace.id } });
    if (existingInvoiceCount === 0) {
      console.log("  🧾 Generating 6 months of invoices...");
      const orgs = workspace.organizations;
      for (let m = 5; m >= 0; m--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - m);

        const count = randomInt(2, 5);
        for (let i = 0; i < count; i++) {
          const day = randomInt(1, 27);
          const createdAt = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
          const dueDate = new Date(createdAt);
          dueDate.setDate(dueDate.getDate() + 30);

          await prisma.invoice.create({
            data: {
              invoiceNumber: `${1000 + m * 10 + i}`,
              amount: randomFloat(1200, 18000),
              status: randomItem(INVOICE_STATUSES) as any,
              dueDate,
              workspaceId: workspace.id,
              organizationId: orgs.length > 0 ? randomItem(orgs).id : null,
              createdById: creatorId,
              createdAt,
            },
          });
        }
      }
    } else {
      console.log(`  🧾 ${existingInvoiceCount} invoices already present, skipping.`);
    }

    // --- Candidates: a realistic mix of strong and weak matches, left unscored so the AI screening demo has real work to do ---
    const existingCandidateCount = await prisma.candidate.count({ where: { workspaceId: workspace.id } });
    if (existingCandidateCount === 0) {
      console.log("  🧑‍💼 Adding candidates for AI screening (deliberately unscored)...");
      for (const profile of CANDIDATE_PROFILES) {
        await prisma.candidate.create({
          data: {
            name: profile.name,
            email: profile.email,
            appliedRole: profile.appliedRole,
            resumeText: profile.resumeText,
            workspaceId: workspace.id,
            // aiScore intentionally left null - run "Auto-Screening" live during the demo
          },
        });
      }
    } else {
      console.log(`  🧑‍💼 ${existingCandidateCount} candidates already present, skipping.`);
    }

    // --- Products + 6 weeks of stock movement history (some trending up, one already critical) ---
    const existingProductCount = await prisma.product.count({ where: { workspaceId: workspace.id } });
    if (existingProductCount === 0) {
      console.log("  📦 Generating products with 6 weeks of stock movement history...");
      for (const template of PRODUCT_TEMPLATES) {
        const product = await prisma.product.create({
          data: {
            name: template.name,
            sku: template.sku,
            category: template.category,
            currentStock: template.startStock,
            reorderLevel: template.reorderLevel,
            unitPrice: template.unitPrice,
            workspaceId: workspace.id,
          },
        });

        let runningStock = template.startStock;
        for (let w = 5; w >= 0; w--) {
          const weekDate = new Date();
          weekDate.setDate(weekDate.getDate() - w * 7 - randomInt(0, 3));

          let weeklyOut: number;
          if (template.demandTrend === "rising") {
            weeklyOut = randomInt(3, 6) + (5 - w) * 2; // increases each week
          } else if (template.demandTrend === "critical") {
            weeklyOut = randomInt(6, 10) + (5 - w) * 3; // sharp increase, will trigger reorder
          } else {
            weeklyOut = randomInt(2, 6);
          }
          weeklyOut = Math.min(weeklyOut, Math.max(runningStock - 1, 0));

          if (weeklyOut > 0) {
            await prisma.stockMovement.create({
              data: { productId: product.id, type: "OUT", quantity: weeklyOut, date: weekDate, workspaceId: workspace.id },
            });
            runningStock -= weeklyOut;
          }

          // Occasional restock IN movement
          if (w === 3 && template.demandTrend === "flat") {
            const inQty = randomInt(20, 40);
            await prisma.stockMovement.create({
              data: { productId: product.id, type: "IN", quantity: inQty, date: weekDate, workspaceId: workspace.id, note: "Restock" },
            });
            runningStock += inQty;
          }
        }

        await prisma.product.update({ where: { id: product.id }, data: { currentStock: Math.max(runningStock, 0) } });
      }
    } else {
      console.log(`  📦 ${existingProductCount} products already present, skipping.`);
    }

    // --- Attendance: 30 days for each workspace member, with one deliberately unusual absentee ---
    const memberUserIds = workspace.members.map((m: any) => m.userId);
    if (memberUserIds.length > 0) {
      const existingAttendanceCount = await prisma.attendance.count({ where: { userId: { in: memberUserIds } } });
      if (existingAttendanceCount === 0) {
        console.log("  🗓️  Generating 30 days of attendance (with one flagged anomaly)...");
        const anomalyUserId = memberUserIds.length > 1 ? memberUserIds[randomInt(1, memberUserIds.length - 1)] : null;

        for (const userId of memberUserIds) {
          const isAnomaly = userId === anomalyUserId;
          for (let d = 29; d >= 0; d--) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            date.setHours(0, 0, 0, 0);

            // Skip weekends for a slightly more realistic pattern
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const roll = Math.random();
            let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
            if (isAnomaly) {
              status = roll < 0.45 ? "ABSENT" : roll < 0.55 ? "HALF_DAY" : "PRESENT";
            } else {
              status = roll < 0.05 ? "ABSENT" : roll < 0.1 ? "HALF_DAY" : roll < 0.12 ? "ON_LEAVE" : "PRESENT";
            }

            await prisma.attendance.create({ data: { userId, status, date } });
          }
        }
      } else {
        console.log(`  🗓️  ${existingAttendanceCount} attendance records already present, skipping.`);
      }
    }
  }

  console.log("\n✅ ERP DEMO SEEDING COMPLETE!");
  console.log("Finance Hub will show a real 6-month trend, a linear-regression forecast, and 1-2 flagged anomalies.");
  console.log("Recruitment Center has 6 unscored candidates ready for live 'Run Auto-Screening'.");
  console.log("Inventory Hub will show 6 products with real demand forecasts (2 trending toward reorder).");
  console.log("Attendance Tracker will show 30 days of history with 1 flagged absence anomaly per workspace.");
}

main()
  .catch((e) => {
    console.error("CRITICAL ERROR DURING ERP SEEDING:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });

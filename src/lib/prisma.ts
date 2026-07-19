// NOTE: import from "index", not "client" — the generated "client.ts" source
// file is a stale build artifact that predates the ERP (Expense/Invoice/
// EmployeeProfile/Attendance/Candidate) models and TypeScript-aware resolvers
// (tsx, Next.js webpack) prefer it over the up-to-date "client.js". Importing
// "index" avoids that stale file entirely.
import { PrismaClient } from "../generated/prisma/client/index";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma || new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

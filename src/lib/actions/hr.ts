"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "./audit";
import { meanStdDev } from "@/lib/ai/forecast";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

export async function getEmployees() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        // NOTE: select (not include), and never select WorkspaceMember.role —
        // some legacy rows carry role values ('STAFF', 'PROJECT_MANAGER')
        // that predate the current Role enum and aren't valid members of it,
        // which makes Prisma throw P2023 the moment that column is hydrated.
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: {
                userId: true,
                joinedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: true,
                    },
                },
            },
        });

        const employees = members.map((m) => ({
            userId: m.user.id,
            name: m.user.name || m.user.email || "Unknown",
            email: m.user.email,
            department: m.user.employeeProfile?.department || null,
            designation: m.user.employeeProfile?.designation || null,
            salary: m.user.employeeProfile?.salary ?? null,
            joiningDate: m.user.employeeProfile?.joiningDate || m.joinedAt,
            hasProfile: !!m.user.employeeProfile,
        }));

        return { success: true, data: employees };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch employees", data: [] };
    }
}

const employeeProfileSchema = z.object({
    userId: z.string().min(1),
    department: z.string().min(1),
    designation: z.string().min(1),
    salary: z.coerce.number().min(0).optional(),
});

export async function upsertEmployeeProfile(rawData: any) {
    try {
        await requireUser();
        const data = employeeProfileSchema.parse(rawData);

        const profile = await (prisma as any).employeeProfile.upsert({
            where: { userId: data.userId },
            update: { department: data.department, designation: data.designation, salary: data.salary },
            create: { userId: data.userId, department: data.department, designation: data.designation, salary: data.salary },
        });

        await createAuditLog({
            action: "UPSERT",
            entityType: "EMPLOYEE_PROFILE",
            entityId: profile.id,
            details: `Updated employee profile for user ${data.userId}: ${data.designation} (${data.department})`,
        });

        revalidatePath("/dashboard/hr/employees");
        return { success: true, data: profile };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to save employee profile" };
    }
}

/**
 * Loads real Attendance records for the workspace over the trailing 30 days
 * and flags employees whose absence rate is a statistical outlier (z-score >
 * 2) compared to the rest of the team as an AI-based attendance risk.
 */
export async function getAttendanceOverview() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        // NOTE: select (not include), and never select `role` on either
        // WorkspaceMember or User — some legacy rows carry role values that
        // predate the current Role enum, which makes Prisma throw P2023 the
        // moment that column is hydrated.
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: { userId: true, user: { select: { id: true, name: true, email: true } } },
        });
        const memberIds = members.map((m) => m.userId);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const records = await (prisma as any).attendance.findMany({
            where: { userId: { in: memberIds }, date: { gte: thirtyDaysAgo } },
            orderBy: { date: "desc" },
        });

        const recordsByUser = new Map<string, any[]>();
        for (const r of records) {
            const arr = recordsByUser.get(r.userId) || [];
            arr.push(r);
            recordsByUser.set(r.userId, arr);
        }

        const employeeStats = members.map((m) => {
            const userRecords = recordsByUser.get(m.userId) || [];
            const absentCount = userRecords.filter((r) => r.status === "ABSENT").length;
            const totalDays = userRecords.length;
            const absenceRate = totalDays > 0 ? absentCount / totalDays : 0;
            return { userId: m.userId, name: m.user.name || m.user.email || "Unknown", absentCount, totalDays, absenceRate };
        });

        const rates = employeeStats.filter((e) => e.totalDays > 0).map((e) => e.absenceRate);
        const { mean, stdDev } = meanStdDev(rates);

        const anomalies = employeeStats
            .filter((e) => e.totalDays > 0 && stdDev > 0 && (e.absenceRate - mean) / stdDev > 2)
            .map((e) => ({
                userId: e.userId,
                name: e.name,
                absentCount: e.absentCount,
                totalDays: e.totalDays,
                absenceRate: e.absenceRate,
            }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = records.filter((r: any) => {
            const d = new Date(r.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        const recent = records.slice(0, 15).map((r: any) => {
            const member = members.find((m) => m.userId === r.userId);
            return {
                id: r.id,
                name: member?.user.name || member?.user.email || "Unknown",
                status: r.status,
                date: r.date,
            };
        });

        return {
            success: true,
            data: {
                totalMembers: members.length,
                presentToday: todayRecords.filter((r: any) => r.status === "PRESENT").length,
                absentToday: todayRecords.filter((r: any) => r.status === "ABSENT").length,
                anomalies,
                recent,
                hasData: records.length > 0,
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to load attendance overview" };
    }
}

const attendanceSchema = z.object({
    userId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"]),
});

export async function markAttendance(rawData: any) {
    try {
        await requireUser();
        const data = attendanceSchema.parse(rawData);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await (prisma as any).attendance.findFirst({
            where: { userId: data.userId, date: { gte: today } },
        });

        const record = existing
            ? await (prisma as any).attendance.update({ where: { id: existing.id }, data: { status: data.status } })
            : await (prisma as any).attendance.create({ data: { userId: data.userId, status: data.status, date: today } });

        revalidatePath("/dashboard/hr/attendance");
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to mark attendance" };
    }
}

/**
 * Aggregated summary for the HR Hub landing page: real headcount, today's
 * attendance split, the last 5 weekdays' present/absent counts, and
 * recruitment pipeline stats — all from real data, no hardcoded figures.
 */
export async function getHRDashboardSummary() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });

        const memberRows = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: { userId: true },
        });
        const memberIds = memberRows.map((m) => m.userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = await (prisma as any).attendance.findMany({
            where: { userId: { in: memberIds }, date: { gte: today } },
        });
        const presentToday = todayRecords.filter((r: any) => r.status === "PRESENT").length;
        const attendanceRate = memberCount > 0 ? Math.round((presentToday / memberCount) * 100) : 0;

        // Last 5 weekdays' present/absent counts, oldest first.
        const weeklyTrend: { name: string; present: number; absent: number }[] = [];
        const dayCursor = new Date(today);
        const daysCollected: Date[] = [];
        while (daysCollected.length < 5) {
            dayCursor.setDate(dayCursor.getDate() - 1);
            if (dayCursor.getDay() !== 0 && dayCursor.getDay() !== 6) daysCollected.push(new Date(dayCursor));
        }
        daysCollected.reverse();

        if (daysCollected.length > 0) {
            const rangeStart = daysCollected[0];
            const rangeRecords = await (prisma as any).attendance.findMany({
                where: { userId: { in: memberIds }, date: { gte: rangeStart, lte: today } },
            });
            for (const day of daysCollected) {
                const dayEnd = new Date(day);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const dayRecords = rangeRecords.filter((r: any) => new Date(r.date) >= day && new Date(r.date) < dayEnd);
                weeklyTrend.push({
                    name: day.toLocaleDateString("en-US", { weekday: "short" }),
                    present: dayRecords.filter((r: any) => r.status === "PRESENT").length,
                    absent: dayRecords.filter((r: any) => r.status === "ABSENT").length,
                });
            }
        }

        const candidates = await (prisma as any).candidate.findMany({ where: { workspaceId } });
        const topMatches = [...candidates]
            .filter((c: any) => c.aiScore !== null)
            .sort((a: any, b: any) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
            .slice(0, 3)
            .map((c: any) => ({ name: c.name, role: c.appliedRole, score: c.aiScore }));

        return {
            success: true,
            data: {
                headcount: memberCount,
                attendanceRate,
                presentToday,
                absentToday: memberCount - presentToday,
                weeklyTrend,
                totalApplicants: candidates.length,
                interviewsScheduled: candidates.filter((c: any) => c.status === "INTERVIEWING").length,
                openRoles: new Set(candidates.map((c: any) => c.appliedRole)).size,
                topMatches,
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to load HR summary" };
    }
}

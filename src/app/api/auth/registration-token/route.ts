import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const pending = await (prisma as any).pendingRegistration.findUnique({
            where: { token },
            include: { account: true }
        });

        if (!pending || pending.used) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
        }

        if (new Date() > pending.expiresAt) {
            return NextResponse.json({ error: "Token has expired" }, { status: 410 });
        }

        return NextResponse.json({
            success: true,
            email: pending.email,
            planTier: pending.planTier
        });

    } catch (error) {
        console.error("[TOKEN_VALIDATION_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

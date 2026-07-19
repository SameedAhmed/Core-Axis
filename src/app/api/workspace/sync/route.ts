import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { activeWorkspaceId: true }
        });

        if (!user?.activeWorkspaceId) {
            return NextResponse.json({ lastActivityAt: null });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: user.activeWorkspaceId },
            select: { updatedAt: true }
        });

        return NextResponse.json({ 
            workspaceId: user.activeWorkspaceId,
            lastActivityAt: workspace?.updatedAt?.toISOString() || null 
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

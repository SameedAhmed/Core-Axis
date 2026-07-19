import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        const body = await req.json();
        const { workspaceId, name, permissions, roleId } = body;

        // Security: Ensure user is an ADMIN of the workspace
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: user.id } }
        });

        if (!membership || membership.role !== "ADMIN") {
            return new NextResponse("Forbidden: Admins Only", { status: 403 });
        }

        if (roleId) {
            // Update existing custom role
            const updatedRole = await (prisma as any).customRole.update({
                where: { id: roleId, workspaceId },
                data: { name, permissions }
            });
            return NextResponse.json(updatedRole);
        } else {
            // Create new custom role
            const newRole = await (prisma as any).customRole.create({
                data: {
                    name,
                    permissions,
                    workspaceId
                }
            });
            return NextResponse.json(newRole);
        }
    } catch (error: any) {
        console.error("[CUSTOM_ROLE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        const url = new URL(req.url);
        const roleId = url.searchParams.get("roleId");
        const workspaceId = url.searchParams.get("workspaceId");

        if (!roleId || !workspaceId) {
            return new NextResponse("Missing Parameters", { status: 400 });
        }

        // Security
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: user.id } }
        });
        if (!membership || membership.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

        await (prisma as any).customRole.delete({
            where: { id: roleId, workspaceId } // Ensure it scoped to workspace
        });

        return new NextResponse("Deleted Successfully", { status: 200 });
    } catch (error: any) {
        console.error("[CUSTOM_ROLE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

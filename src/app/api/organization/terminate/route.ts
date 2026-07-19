import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { confirmation } = await req.json();

        // 1. Verify User and Organization
        const user = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: { account: true }
        });

        if (!user || !user.isAccountOwner || !user.account) {
            return NextResponse.json({ error: "Access Denied: Only Account Owners can terminate organizations." }, { status: 403 });
        }

        if (confirmation !== user.account.name) {
            return NextResponse.json({ error: "Sequence Aborted: Organization name mismatch." }, { status: 400 });
        }

        // 2. Perform the "Nuclear Delete" 
        // Our new schema cascade ensures all workspaces, members, leads, and the owner themselves are deleted when the account is removed.
        await prisma.subscriptionAccount.delete({
            where: { id: user.account.id }
        });

        return NextResponse.json({ success: true, message: "Organization Eradicated." });

    } catch (error) {
        console.error("Organization Termination Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

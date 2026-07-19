import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";

export async function GET() {
    try {
        const setting = await (prisma as any).globalSettings.findUnique({
            where: { id: "SYSTEM_CONFIG" }
        });

        return NextResponse.json({ isActive: setting ? setting.turnstileEnabled : true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch setting" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // Check if user is Super Admin
        if (!session?.user?.email || session.user.email !== SUPER_ADMIN_EMAIL) {
            return NextResponse.json({ error: "Unauthorized. Global Security restricted to Master Admin." }, { status: 403 });
        }

        const { isActive } = await req.json();

        await (prisma as any).globalSettings.upsert({
            where: { id: "SYSTEM_CONFIG" },
            update: { turnstileEnabled: isActive },
            create: {
                id: "SYSTEM_CONFIG",
                turnstileEnabled: isActive
            }
        });

        return NextResponse.json({ success: true, isActive });
    } catch (error) {
        console.error("Global Settings Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

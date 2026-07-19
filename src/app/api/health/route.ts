import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Simple DB Check: Count users
        const userCount = await prisma.user.count();
        
        return NextResponse.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: "connected",
            userCount
        }, { status: 200 });

    } catch (error: any) {
        console.error("Health Check Error:", error);
        return NextResponse.json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            database: "disconnected",
            error: error.message
        }, { status: 503 });
    }
}

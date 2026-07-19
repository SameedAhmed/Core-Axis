import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notificationEmitter } from "@/lib/event-emitter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new Response("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            // Confirm connection open successfully
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

            // Setup listener
            const sendNotification = (notification: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));
            };

            const eventName = `notification:${user.id}`;
            notificationEmitter.on(eventName, sendNotification);

            // Keep connection alive to prevent strict proxy timeouts (like NGINX)
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(`:\n\n`)); // SSE empty comment
            }, 15000);

            // Cleanup when connection drops or is closed by browser
            req.signal.addEventListener('abort', () => {
                notificationEmitter.off(eventName, sendNotification);
                clearInterval(keepAlive);
                try {
                    controller.close();
                } catch (e) {
                    // ignore if already closed
                }
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" // crucial to bypass buffering mechanisms
        }
    });
}

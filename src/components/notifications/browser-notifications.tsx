"use client";

import { useEffect, useState } from "react";
import { getUnreadNotifications, markAsRead } from "@/lib/actions/notifications";
import { toast } from "sonner";

export function BrowserNotifications() {
    const [permission, setPermission] = useState<NotificationPermission | "default">("default");

    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
            if (Notification.permission === "default") {
                Notification.requestPermission().then(setPermission);
            }
        }
    }, []);

    useEffect(() => {
        const checkNotifications = async () => {
            if (permission !== "granted") return;

            const notifications = await getUnreadNotifications();

            for (const notification of notifications) {
                // Show browser notification
                new Notification(notification.title, {
                    body: notification.message,
                    icon: "/favicon.ico", // Fallback to favicon
                });

                // Show in-app toast for better UX
                toast(notification.title, {
                    description: notification.message,
                });

                // Mark as read immediately or let the user click?
                // For "Desktop Notification" requirement, showing it is enough.
                // We'll mark it as read so it doesn't pop up again next poll.
                await markAsRead(notification.id);
            }
        };

        // Initial check
        checkNotifications();

        // Check every 60 seconds
        const interval = setInterval(checkNotifications, 60000);
        return () => clearInterval(interval);
    }, [permission]);

    return null; // This component doesn't render anything visible
}

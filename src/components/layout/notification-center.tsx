"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, CheckCircle2, AlertCircle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUnreadNotifications, markAsRead } from "@/lib/actions/notifications";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (status !== "authenticated") return;
        const data = await getUnreadNotifications();
        setNotifications(data);
        setLoading(false);
    };

    useEffect(() => {
        if (status !== "authenticated") {
            setLoading(false);
            return;
        }

        // Initialize once we have a session to avoid background auth errors (CLIENT_FETCH_ERROR)
        // especially on non-dashboard or landing routes where NotificationCenter might be visible.
        fetchNotifications();
        
        // Connect to native Server-Sent Event stream for instant UI updates
        const eventSource = new EventSource('/api/notifications/stream');
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') return; // Ignore initial connection handshake

                setNotifications(prev => {
                    // Prevent duplicate renders in edge overlap cases
                    if (prev.find(n => n.id === data.id)) return prev;
                    
                    // Trigger visual cue like toast for new items
                    toast.info(data.title, {
                        description: data.message,
                        action: data.link ? {
                            label: "View",
                            onClick: () => window.location.href = data.link
                        } : undefined
                    });

                    // Instruct Next.js to quietly re-fetch active Server Components in the background
                    // This causes Data Tables (like Leads) to instantly show the newly assigned row
                    // without a hard browser reload.
                    router.refresh();

                    return [data, ...prev];
                });
            } catch (error) {
                console.error("SSE parsing error:", error);
            }
        };

        eventSource.onerror = (error) => {
            // EventSource natively auto-reconnects on drop. 
            // Avoid console.error here to prevent Next.js dev overlay from popping up on standard timeouts.
            if (eventSource.readyState === EventSource.CLOSED) {
                // Connection was closed, it might not reconnect if the server sent a 401 or 403.
                // In a production app, we could implement a manual backoff retry here.
            }
        };

        // Cleanup connection when the application is closed or unmounted
        return () => {
             eventSource.close();
        };
    }, [status]);

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const res = await markAsRead(id);
        if (res.success) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        } else {
            toast.error("Failed to mark notification as read");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "ASSIGNMENT": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "STATUS_CHANGE": return <Info className="w-4 h-4 text-blue-500" />;
            case "DEAL_UPDATE": return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return <Bell className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all active:scale-95">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 mt-2 shadow-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-foreground">Notifications</DropdownMenuLabel>
                    {notifications.length > 0 && (
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {notifications.length} NEW
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator />
                
                <div className="max-h-[350px] overflow-y-auto">
                    {loading ? (
                        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading updates...</div>
                    ) : notifications.length === 0 ? (
                        <div className="py-12 px-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                                <Bell className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-bold text-foreground mb-1">All caught up!</p>
                            <p className="text-[10px] text-muted-foreground italic">No new notifications in your feed.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <Link key={n.id} href={n.link || "#"} className="block">
                                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0 rounded-none first:rounded-t-lg last:rounded-b-lg">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">{getIcon(n.type)}</div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-black text-foreground leading-none">{n.title}</p>
                                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                                {n.message}
                                            </p>
                                            <div className="flex items-center justify-between pt-1">
                                                {n.link && (
                                                    <span className="text-[9px] font-bold text-primary flex items-center gap-1">
                                                        View <ExternalLink className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                                <button 
                                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                                    className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </Link>
                        ))
                    )}
                </div>

                <DropdownMenuSeparator />
                <Link href="/dashboard/activities" passHref>
                    <DropdownMenuItem className="justify-center text-primary font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-primary/5 py-3 transition-all">
                        View Full History ❯
                    </DropdownMenuItem>
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

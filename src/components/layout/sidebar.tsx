"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Users,
    Briefcase,
    Building2,
    LayoutDashboard,
    Activity,
    Settings,
    ChevronDown,
    Building,
    BarChart2,
    ClipboardCheck,
    ArchiveX,
    UserCircle2,
    Puzzle,
    Wallet,
    ReceiptText,
    CircleDollarSign,
    UsersRound,
    Clock,
    UserCheck,
    Boxes,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { switchWorkspace } from "@/lib/actions/workspaces";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";

const salesLinks = [
    { name: "CRM Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", href: "/dashboard/leads", icon: Users },
    { name: "Contacts", href: "/dashboard/contacts", icon: UserCircle2 },
    { name: "Sales Pipeline", href: "/dashboard/deals", icon: Briefcase },
    { name: "Orders", href: "/dashboard/orders", icon: ClipboardCheck },
    { name: "Organizations", href: "/dashboard/organizations", icon: Building2 },
    { name: "Activities", href: "/dashboard/activities", icon: Activity },
];

const financeLinks = [
    { name: "Finance Hub", href: "/dashboard/finance", icon: BarChart2 },
    { name: "Expenses", href: "/dashboard/finance/expenses", icon: Wallet },
    { name: "Invoices", href: "/dashboard/finance/invoices", icon: ReceiptText },
    { name: "AI Analyst", href: "/dashboard/finance/analyst", icon: Sparkles },
];

const hrLinks = [
    { name: "HR Dashboard", href: "/dashboard/hr", icon: LayoutDashboard },
    { name: "Employees", href: "/dashboard/hr/employees", icon: UsersRound },
    { name: "Attendance", href: "/dashboard/hr/attendance", icon: Clock },
    { name: "Recruitment", href: "/dashboard/hr/recruitment", icon: UserCheck },
];

const inventoryLinks = [
    { name: "Inventory Hub", href: "/dashboard/inventory", icon: Boxes },
];

export function Sidebar({
    role,
    workspaces = [],
    activeWorkspaceId,
    isMaster = false,
    planTier = "FREE",
    className,
    onItemClick
}: {
    role?: string,
    workspaces?: any[],
    activeWorkspaceId?: string | null,
    isMaster?: boolean,
    planTier?: string,
    className?: string,
    onItemClick?: () => void
}) {
    const pathname = usePathname();

    const handleWorkspaceChange = async (id: string) => {
        const res = await switchWorkspace(id);
        if (res.success) {
            toast.success("Switched workspace");
            if (onItemClick) onItemClick();
            window.location.reload(); // Hard reload to clear all state
        } else {
            toast.error(res.error || "Failed to switch workspace");
        }
    };

    const renderLinks = (links: any[], activeClassName: string) => (
        <div className="space-y-1">
            {links.map((link) => {
                if (link.name === "Activities" && role === "REP") return null;

                const Icon = link.icon;
                const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard' && !pathname.startsWith('/dashboard/saas') && link.href !== '/dashboard/hr' && link.href !== '/dashboard/finance');

                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        prefetch={true}
                        onClick={onItemClick}
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group text-sm font-medium",
                            isActive
                                ? activeClassName
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{link.name}</span>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <aside
            id="main-sidebar"
            className={cn(
                "flex flex-col bg-card border-r border-border transition-all duration-150",
                "w-[260px] fixed top-0 left-0 h-screen z-50 hidden md:flex", // Desktop Defaults
                className // Mobile overrides from Sheet
            )}
        >
            <div className="h-16 flex items-center px-6 border-b border-border bg-card shrink-0">
                <Link href="/dashboard" onClick={onItemClick} className="flex items-center gap-3 transition-opacity hover:opacity-80 group">
                    <Logo showText />
                </Link>
            </div>

            <div className="flex-1 py-4 overflow-y-auto px-4 space-y-4 scrollbar-none">
                {workspaces.length > 0 && (
                    <div id="workspace-switcher-hub" className="space-y-2 mb-4">
                        <div className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                            Workspace hub
                        </div>
                        <Select value={activeWorkspaceId || ""} onValueChange={handleWorkspaceChange}>
                            <SelectTrigger className="w-full bg-muted/30 border-border hover:bg-muted/50 transition-colors h-11 rounded-xl">
                                <SelectValue placeholder="Select Workspace" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl border-border/40">
                                {workspaces.map((ws: any) => (
                                    <SelectItem key={ws.id} value={ws.id} className="rounded-lg m-1">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium">{ws.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div>
                    <nav className="space-y-1">
                        {/* 1. PLATFORM CONTROL (Super Admin Only) */}
                        {isMaster && workspaces.length > 0 && (
                             <div className="mb-4">
                                <div className="px-3 text-[10px] font-extrabold text-[#0d1b4b] dark:text-blue-400 uppercase tracking-[0.2em] mb-2 mt-2">
                                    Platform Control
                                </div>
                                <div className="space-y-1">
                                    <Link
                                        href="/dashboard/saas"
                                        onClick={onItemClick}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
                                            pathname === "/dashboard/saas"
                                                ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                                        )}
                                    >
                                        <BarChart2 className="w-4 h-4" />
                                        <span>Control Room</span>
                                    </Link>
                                    <Link
                                        href="/dashboard/saas/accounts"
                                        onClick={onItemClick}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm",
                                            pathname === "/dashboard/saas/accounts"
                                                ? "bg-indigo-600/10 text-indigo-600 dark:text-blue-400 font-bold border border-indigo-500/20"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                                        )}
                                    >
                                        <Building className="w-4 h-4" />
                                        <span>Platform Accounts</span>
                                    </Link>
                                </div>
                             </div>
                        )}

                        <div className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2 mt-2">
                            Sales & CRM
                        </div>
                        {renderLinks(salesLinks, 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]')}

                        <div className="px-3 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2 mt-6">
                            Finance Module
                        </div>
                        {renderLinks(financeLinks, 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]')}

                        <div className="px-3 text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-[0.2em] mb-2 mt-6">
                            HR Module
                        </div>
                        {renderLinks(hrLinks, 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 scale-[1.02]')}

                        <div className="px-3 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] mb-2 mt-6">
                            Inventory Module
                        </div>
                        {renderLinks(inventoryLinks, 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 scale-[1.02]')}

                    </nav>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 shrink-0">
                <Link
                    href="/dashboard/settings"
                    prefetch={true}
                    onClick={onItemClick}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
                >
                    <Settings className="w-4.5 h-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>System Settings</span>
                </Link>
            </div>
        </aside>
    );
}

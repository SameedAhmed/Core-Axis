"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Briefcase, UserCircle2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

interface MobileBottomNavProps {
    role?: string;
    workspaces?: any[];
    activeWorkspaceId?: string | null;
    isMaster?: boolean;
    planTier?: string;
}

const navItems = [
    { name: "Home",     href: "/dashboard",          icon: LayoutDashboard, exact: true },
    { name: "Leads",    href: "/dashboard/leads",     icon: Users },
    { name: "Pipeline",    href: "/dashboard/deals",     icon: Briefcase },
    { name: "Contacts", href: "/dashboard/contacts",  icon: UserCircle2 },
];

export function MobileBottomNav({
    role, workspaces = [], activeWorkspaceId, isMaster, planTier = "FREE"
}: MobileBottomNavProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (item: typeof navItems[0]) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href);

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-3xl border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] px-4"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)", paddingTop: "12px" }}
        >
            <div className="flex items-center justify-between h-16 max-w-lg mx-auto relative">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-500 relative py-1 group",
                                active ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
                            )}
                        >
                            {/* Premium Floating Indicator */}
                            <div className={cn(
                                "absolute -top-3 w-10 h-1.5 bg-primary rounded-full transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform shadow-[0_-5px_15px_rgba(99,102,241,0.4)]",
                                active ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 -translate-y-2"
                            )} />
                            
                            <div className={cn(
                                "w-14 h-9 flex items-center justify-center rounded-[18px] transition-all duration-500",
                                active ? "bg-primary/10 shadow-inner scale-110" : "group-hover:bg-muted/40 group-active:scale-90"
                            )}>
                                <Icon className={cn("w-6 h-6 shrink-0 transition-all duration-500", active ? "stroke-[2.5px] scale-110" : "stroke-[1.8px]")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest leading-none transition-all duration-500",
                                active ? "opacity-100 translate-y-0 scale-105" : "opacity-60 translate-y-0.5"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}

                {/* More Menu Trigger */}
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <button className="flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 py-1 group">
                            <div className="w-14 h-9 flex items-center justify-center rounded-[18px] transition-all duration-500 hover:bg-muted/40 active:scale-90">
                                <MoreHorizontal className="w-6 h-6 text-muted-foreground/60 transition-transform group-hover:rotate-90 duration-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-muted-foreground/60 opacity-60 translate-y-0.5">
                                More
                            </span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-none w-[280px] shadow-2xl overflow-hidden">
                        <SheetTitle className="sr-only">Main Menu</SheetTitle>
                        <SheetDescription className="sr-only">Detailed platform navigation and workspace control.</SheetDescription>
                        <div className="h-full w-full bg-card flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                                <Sidebar
                                    role={role}
                                    workspaces={workspaces}
                                    activeWorkspaceId={activeWorkspaceId}
                                    isMaster={isMaster}
                                    planTier={planTier}
                                    className="!flex !static z-0 h-full w-full shadow-none border-none"
                                    onItemClick={() => setMenuOpen(false)}
                                />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}

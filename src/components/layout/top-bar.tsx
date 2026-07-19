"use client";
import React, { useState } from "react";

import { Bell, Search, Menu, LogOut, User as UserIcon, Settings, Shield, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { NotificationCenter } from "./notification-center";
import { Logo } from "@/components/brand/logo";
import { Sidebar } from "./sidebar";

export function TopBar({ 
    user,
    workspace,
    role,
    workspaces = [],
    activeWorkspaceId,
    isMaster = false,
    planTier = "FREE"
}: { 
    user?: { name: string; role: string; email?: string; isMaster?: boolean },
    workspace?: { name: string; logo?: string | null },
    role?: string,
    workspaces?: any[],
    activeWorkspaceId?: string | null,
    isMaster?: boolean,
    planTier?: string
}) {
    const [imageError, setImageError] = useState<boolean>(false);
    const [open, setOpen] = useState(false);

    return (
        <header className="h-14 sm:h-16 border-b border-border/50 bg-background/95 backdrop-blur-3xl sticky top-0 z-40 flex items-center justify-between px-3 sm:px-8 shadow-sm">
            <div className="flex items-center flex-1 gap-1 sm:gap-6">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 -ml-2 hover:bg-muted active:scale-95 transition-all shrink-0">
                            <Menu className="h-6 w-6 text-foreground" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-none w-[280px] shadow-2xl animate-in slide-in-from-left duration-500">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <SheetDescription className="sr-only">Access all platform sections and workspaces.</SheetDescription>
                        <div className="h-full w-full bg-card shadow-2xl border-r border-border/50">
                            <Sidebar 
                                role={role} 
                                workspaces={workspaces} 
                                activeWorkspaceId={activeWorkspaceId} 
                                isMaster={isMaster} 
                                planTier={planTier} 
                                className="!flex !static z-0 h-full w-full shadow-none border-none"
                                onItemClick={() => setOpen(false)}
                            />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Mobile: App Brand Logo */}
                <div className="md:hidden flex items-center shrink-0 ml-1">
                    <Logo showText={false} className="scale-110" />
                </div>

                {/* Desktop: Workspace Branding */}
                <div className="hidden md:flex items-center gap-3 pr-4 border-r border-border/40 group cursor-default">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {workspace?.logo && (workspace.logo.startsWith('http') || workspace.logo.startsWith('data:') || workspace.logo.startsWith('/api/')) && !imageError ? (
                            <img 
                                src={workspace.logo} 
                                alt="Logo" 
                                className="w-full h-full object-contain"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <Building2 className="w-4 h-4 text-primary" />
                        )}
                    </div>
                    <span className="text-sm font-black tracking-tight text-foreground truncate max-w-[180px]">
                        {workspace?.name}
                    </span>
                </div>

                <div className="hidden sm:block flex-1 max-w-md ml-2">
                    <GlobalSearch />
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="sm:hidden">
                      <GlobalSearch />
                </div>

                <ThemeToggle />

                {/* Dynamic Notification Engine */}
                <NotificationCenter />

                <Separator orientation="vertical" className="h-6 opacity-30 mx-1 hidden sm:block" />

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer group hover:bg-muted/50 p-1 lg:pl-3 rounded-full transition-all border border-transparent hover:border-border/50 active:scale-95">
                            <div className="flex flex-col items-end hidden lg:flex">
                                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-none mb-1 flex items-center gap-2">
                                    {user?.isMaster && (
                                         <span className="text-[9px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase tracking-tighter">
                                             <Shield className="w-2 h-2 fill-white" />
                                             Master
                                         </span>
                                    )}
                                    {user?.name?.split(' ')[0] || "User"}
                                </span>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                                    {user?.role || "Member"}
                                </span>
                            </div>
                            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shadow sm transition-transform group-hover:scale-105 ring-2 ring-primary/5">
                                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} alt={user?.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                    {user?.name?.substring(0, 2).toUpperCase() || "US"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-64 p-2 mt-2 shadow-2xl border-border/40">
                        <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg mb-2 truncate">
                            <p className="text-sm font-black text-foreground truncate">{user?.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground truncate">{user?.email}</p>
                        </div>
                        
                        <DropdownMenuSeparator />
                        
                        <Link href="/dashboard/settings?tab=profile" passHref>
                            <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 px-3 text-muted-foreground hover:text-foreground font-medium rounded-lg">
                                <UserIcon className="w-4 h-4" />
                                <span>My Profile</span>
                            </DropdownMenuItem>
                        </Link>
                        {(user?.role === "ADMIN" || user?.isMaster) && (
                            <Link href="/dashboard/settings?tab=general" passHref>
                                <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 px-3 text-muted-foreground hover:text-foreground font-medium rounded-lg">
                                    <Settings className="w-4 h-4" />
                                    <span>Account Settings</span>
                                </DropdownMenuItem>
                            </Link>
                        )}
                        <Link href="/dashboard/settings?tab=security" passHref>
                            <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 px-3 text-muted-foreground hover:text-foreground font-medium rounded-lg">
                                <Shield className="w-4 h-4" />
                                <span>Security Control</span>
                            </DropdownMenuItem>
                        </Link>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                            className="gap-3 cursor-pointer py-2.5 px-3 text-destructive focus:bg-destructive/10 focus:text-destructive font-bold rounded-lg mt-1"
                            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign out Space</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

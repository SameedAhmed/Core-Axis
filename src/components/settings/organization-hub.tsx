"use client";

import React, { useEffect, useState } from "react";
import { 
    Building, 
    Users, 
    Globe, 
    Plus, 
    LayoutDashboard, 
    ShieldCheck, 
    ArrowRight,
    TrendingUp,
    Briefcase
} from "lucide-react";
import { useRouter } from "next/navigation";
import { switchWorkspace } from "@/lib/actions/workspaces";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
    _count: {
        members: number;
        leads: number;
        deals: number;
    }
}

interface OrganizationData {
    id: string;
    name: string;
    planTier: string;
    workspaces: Workspace[];
    totalUsers: number;
    activeSeats: number;
    maxSeats: number;
}

export function OrganizationHub() {
    const [isLoading, setIsLoading] = useState(true);
    const [orgData, setOrgData] = useState<OrganizationData | null>(null);
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [terminateInput, setTerminateInput] = useState("");
    const [isActioning, setIsActioning] = useState(false);
    const router = useRouter();

    const fetchOrgStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/organization/stats");
            const data = await res.json();
            if (res.ok) {
                setOrgData(data);
            }
        } catch (error) {
            toast.error("Failed to load organization data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgStats();
    }, []);

    const handleMonitor = async (workspaceId: string) => {
        try {
            const res = await switchWorkspace(workspaceId);
            if (res.success) {
                window.location.href = "/dashboard"; 
            } else {
                toast.error(res.error || "Failed to switch.");
            }
        } catch (error) {
            toast.error("Failed to jump into partition.");
        }
    };

    const handleProvision = async () => {
        if (!newWorkspaceName.trim()) {
            toast.error("Workspace name is required.");
            return;
        }

        setIsActioning(true);
        try {
            const res = await fetch("/api/organization/provision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceName: newWorkspaceName })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                toast.success(`Successfully provisioned '${newWorkspaceName}' partition.`);
                setIsProvisionModalOpen(false);
                setNewWorkspaceName("");
                fetchOrgStats(); // Refresh
            } else {
                toast.error(data.error || "Provisioning sequence failed.");
            }
        } catch (error) {
            toast.error("Network constraint: Provisioning aborted.");
        } finally {
            setIsActioning(false);
        }
    };

    const handleTerminate = async () => {
        if (terminateInput !== orgData?.name) return;

        setIsActioning(true);
        try {
            const res = await fetch("/api/organization/terminate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: terminateInput })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                toast.success("Organization Eradicated. You will now be signed out.");
                setTimeout(() => {
                    signOut({ callbackUrl: `${window.location.origin}/auth/signin` });
                }, 2000);
            } else {
                toast.error(data.error || "Termination failed.");
            }
        } catch (error) {
            toast.error("Network constraint: Action aborted.");
        } finally {
            setIsActioning(false);
        }
    };

    if (isLoading) {
        return <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
            </div>
        </div>;
    }

    if (!orgData) return null;

    const seatUsagePercent = Math.min((orgData.activeSeats / (orgData.maxSeats || 1)) * 100, 100);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Master Header */}
            <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 p-6 sm:p-8 text-white shadow-2xl border border-white/5 transition-all duration-200">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Building className="w-48 h-48 -mr-12 -mt-12 text-white rotate-12" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                        <Badge className="bg-primary/20 text-primary border-primary/20 backdrop-blur-md px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0">
                            Account Owner Portal
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/60 text-[10px] sm:text-xs shrink-0">
                            {orgData.planTier} Plan
                        </Badge>
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-2 flex items-center gap-2 sm:gap-3">
                        <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0" />
                        <span className="truncate">{orgData.name} Organization</span>
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-sm lg:text-base max-w-lg font-medium leading-relaxed">
                        Welcome back, Commander. You have full visibility and orchestration power over all workspaces and employees linked to this account.
                    </p>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                    className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => router.push('/dashboard/settings?tab=workspaces')}
                >
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Total Workspaces</p>
                            <p className="text-3xl font-black group-hover:text-primary transition-colors">{orgData.workspaces.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                            <LayoutDashboard className="w-6 h-6 text-primary group-hover:text-white" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => router.push('/dashboard/settings?tab=team')}
                >
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Global Employees</p>
                            <p className="text-3xl font-black group-hover:text-primary transition-colors">{orgData.totalUsers}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                            <Users className="w-6 h-6 text-primary group-hover:text-white" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Account Health</p>
                            <p className={`text-3xl font-black ${seatUsagePercent >= 95 ? 'text-red-500' : seatUsagePercent >= 80 ? 'text-amber-500' : 'text-primary'}`}>
                                {seatUsagePercent >= 95 ? 'CRITICAL' : seatUsagePercent >= 80 ? 'AT CAPACITY' : 'OPTIMAL'}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Workspace Orchestration */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-7 border-b border-border/50 bg-muted/5">
                    <div>
                        <CardTitle className="text-xl sm:text-2xl font-black tracking-tight mb-1">Workspace Partitioning</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Manage your company's sub-divisions and isolated CRM instances.</CardDescription>
                    </div>
                    <Button 
                        onClick={() => setIsProvisionModalOpen(true)}
                        className="w-full sm:w-auto rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 px-4 h-11"
                    >
                        <Plus className="w-4 h-4" /> 
                        <span className="inline xs:hidden">New Workspace</span>
                        <span className="hidden xs:inline">Provision New Workspace</span>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                        {orgData.workspaces.map((ws) => (
                            <div key={ws.id} className="group p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-muted/30 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-white/5 font-black text-xl text-zinc-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500">
                                        {ws.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-foreground mb-0.5 group-hover:text-primary transition-colors">{ws.name}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold italic">
                                                <TrendingUp className="w-3 h-3" /> {ws._count.deals} Deals
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold italic">
                                                <Users className="w-3 h-3" /> {ws._count.members} Members
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">ID: {ws.id.slice(0,8)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <Button 
                                        onClick={() => handleMonitor(ws.id)}
                                        variant="outline" 
                                        className="flex-1 md:flex-none font-bold rounded-xl border-border/60 hover:bg-background shadow-sm h-11 px-6 transition-all active:scale-95"
                                    >
                                        Monitor Activity
                                    </Button>
                                    <Button 
                                        onClick={() => handleMonitor(ws.id)}
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-11 w-11 rounded-xl hover:bg-primary hover:text-white transition-all shadow-none"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Strategic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <Card className="border-border/60 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-indigo-500" />
                            License Management
                        </CardTitle>
                        <CardDescription>Aggregate view of your subscription utilization.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Global Seat Limit</span>
                            <span className="font-bold">{orgData.maxSeats === 10000 ? 'UNLIMITED (Enterprise)' : `${orgData.maxSeats} Licenses`}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${seatUsagePercent}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase italic">Using {Math.round(seatUsagePercent)}% of your organizational capacity</p>
                    </CardContent>
                </Card>

                <Card className="border-red-500/10 bg-gradient-to-br from-red-50/20 to-white dark:from-red-950/10 dark:to-zinc-950/20 border-2 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-500">
                            <Building className="w-5 h-5" />
                            CRITICAL DANGER ZONE
                        </CardTitle>
                        <CardDescription>Permanently wipe all organizational data and licenses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button 
                            variant="destructive" 
                            className="w-full font-black py-6 rounded-2xl shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => setIsTerminateModalOpen(true)}
                        >
                            Dissolve Organization Instance
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground font-bold italic uppercase">Warning: All leads, deals, users and your login will be eradicated.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Provisioning Modal */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 w-full max-w-md rounded-[2.5rem] p-8 relative shadow-2xl animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setIsProvisionModalOpen(false)} 
                            className="absolute top-8 right-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <Plus className="w-6 h-6 rotate-45" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-inner">
                                <Building className="w-10 h-10 text-primary" />
                            </div>
                            
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-3">New Workspace</h2>
                            <p className="text-sm text-zinc-500 mb-8 leading-relaxed max-w-[280px]">
                                Provision a fresh CRM partition. This workspace will inherit the <span className="text-primary font-bold">Enterprise</span> security protocols of your organization.
                            </p>

                            <div className="w-full space-y-2 mb-8 text-left">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Workspace Identity</label>
                                <input 
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl py-4 px-6 text-zinc-900 dark:text-zinc-100 focus:border-primary outline-none transition-all font-bold tracking-tight shadow-inner" 
                                    placeholder="e.g. Sales Department - North"
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-4 w-full">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 font-bold rounded-2xl border-zinc-200 h-14" 
                                    onClick={() => setIsProvisionModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    disabled={isActioning || !newWorkspaceName.trim()} 
                                    className="flex-1 font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 h-14" 
                                    onClick={handleProvision}
                                >
                                    {isActioning ? "Provisioning..." : "Execute Setup"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Termination Modal */}
            {isTerminateModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 border-4 border-red-500/20 w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center mb-6 border-2 border-red-500/20 shadow-inner">
                                <Building className="w-12 h-12 text-red-500 animate-pulse" />
                            </div>
                            
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-3">Terminate Organization?</h2>
                             <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
                                This will permanently erase the <strong className="text-zinc-900 dark:text-white font-black">'{orgData.name}'</strong> organization account and all its partitions. <br/><br/>
                                <span className="text-red-500 font-bold uppercase underline">Warning:</span> Your team member data and your login email will be freed immediately.
                            </p>

                            <div className="w-full space-y-2 mb-8 text-left">
                                <label className="text-[10px] font-black uppercase tracking-widest text-red-400 ml-1 italic">Type "{orgData.name}" to Confirm Deletion</label>
                                <input 
                                    className="w-full bg-red-50/50 dark:bg-red-950/20 border-2 border-red-500/20 rounded-2xl py-4 px-6 text-zinc-900 dark:text-zinc-100 focus:border-red-500 outline-none transition-all font-black tracking-tight shadow-inner text-center" 
                                    placeholder={orgData.name}
                                    value={terminateInput}
                                    onChange={(e) => setTerminateInput(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-4 w-full">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 font-bold rounded-2xl border-zinc-200 h-16 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                                    onClick={() => { setIsTerminateModalOpen(false); setTerminateInput(""); }}
                                >
                                    Abort Sequence
                                </Button>
                                <Button 
                                    disabled={isActioning || terminateInput !== orgData.name} 
                                    className="flex-1 font-bold rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/30 h-16 animate-shimmer" 
                                    onClick={handleTerminate}
                                >
                                    {isActioning ? "Eradicating..." : "Execute Wipe"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

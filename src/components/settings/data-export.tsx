"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCrmData } from "@/lib/actions/export";
import { toast } from "sonner";
import { Download, FileSpreadsheet, ShieldAlert, Filter, Lock, Crown, ArrowUpCircle } from "lucide-react";
import Link from "next/link";

export function DataExportSettings({ workspaces, isSuperAdmin }: { workspaces: any[], isSuperAdmin: boolean }) {
    const [loading, setLoading] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
    const [exportType, setExportType] = useState<"LEAD" | "ORGANIZATION" | "DEAL" | "ORDER" | "LOST_DEAL" | "CONTACT">("LEAD");

    // Gating Logic
    const currentWs = workspaces.find(ws => ws.id === selectedWorkspace);
    let planTier = currentWs?.account?.planTier || "FREE";
    
    // If "All" is selected, determine the best plan available
    if (selectedWorkspace === "all") {
        const hasEnterprise = workspaces.some(ws => ws.account?.planTier === "ENTERPRISE");
        const hasPro = workspaces.some(ws => ws.account?.planTier === "PRO");
        planTier = hasEnterprise ? "ENTERPRISE" : hasPro ? "PRO" : "FREE";
    }


    let isLocked = planTier === "FREE" || planTier === "STARTER";
    
    // Super Admins override all locks
    if (isSuperAdmin) isLocked = false;



    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await exportCrmData(exportType, selectedWorkspace);

            if (res.success && res.csv) {
                // Create a blob and download it
                const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `${exportType.toLowerCase()}s_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success(`Exported ${res.count} ${exportType.toLowerCase()}s successfully.`);
            } else if (res.success && res.count === 0) {
                toast.info("No records found for the selected criteria.");
            } else {
                toast.error(res.error || "Failed to export data.");
            }
        } catch (error) {
            toast.error("An error occurred during export.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm border-2 border-primary/10">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                        <CardTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <Download className="w-5 h-5 text-primary" />
                            </div>
                            <span>Data Export</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm max-w-[280px] sm:max-w-none leading-relaxed">
                            Export CRM data to CSV with secure workspace isolation.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-primary/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-primary/20 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Restricted</span>
                        </div>
                        {isLocked && (
                             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl shadow-sm">
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tight leading-none">Pro Feature</span>
                             </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Type Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            Data Type
                        </label>
                        <Select value={exportType} onValueChange={(val: any) => setExportType(val)}>
                            <SelectTrigger className="bg-background/50 border-border/50">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LEAD">Leads</SelectItem>
                                <SelectItem value="ORGANIZATION">Organizations</SelectItem>
                                <SelectItem value="DEAL">Deals (All Pipeline)</SelectItem>
                                <SelectItem value="ORDER">Orders (Won Deals)</SelectItem>
                                <SelectItem value="LOST_DEAL">Lost Deals</SelectItem>
                                <SelectItem value="CONTACT">Contacts</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Workspace Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                            Workspace Isolation
                        </label>
                        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                            <SelectTrigger className="bg-background/50 border-border/50">
                                <SelectValue placeholder="All Workspaces" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Workspaces (Combined)</SelectItem>
                                {workspaces.map((ws) => (
                                    <SelectItem key={ws.id} value={ws.id}>
                                        {ws.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className={`relative p-4 rounded-xl border transition-all duration-300 flex items-start gap-3 ${isLocked ? 'bg-amber-500/5 border-amber-500/20 opacity-80' : 'bg-muted/30 border-border/40'}`}>
                    <div className="mt-0.5">
                        {isLocked ? (
                             <Lock className="w-5 h-5 text-amber-600" />
                        ) : (
                             <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className={`text-sm font-bold ${isLocked ? 'text-amber-600' : 'text-foreground'}`}>
                            {isLocked ? 'Export Restricted' : 'Export Preview'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {isLocked 
                                ? `The ${planTier} plan does not support bulk data extraction. Upgrade to Professional or switch to an active workspace to unlock CSV/Excel exports.`
                                : `Generating a CSV file containing all matching ${exportType.toLowerCase()} records from ${selectedWorkspace === 'all' ? 'across the entire organization' : 'the selected workspace'}.`
                            }
                        </p>

                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                    {isLocked ? (
                        <div className="flex-1 w-full bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-amber-500 rounded-lg">
                                     <Crown className="w-4 h-4 text-white" />
                                 </div>
                                 <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">Unlock Data Portability today.</p>
                             </div>
                             <Link href="/dashboard/settings?tab=billing">
                                <Button variant="outline" size="sm" className="bg-white dark:bg-zinc-800 border-amber-500/30 text-amber-600 hover:bg-amber-500 hover:text-white transition-all gap-2 font-bold">
                                    <ArrowUpCircle className="w-4 h-4" />
                                    Upgrade to PRO
                                </Button>
                             </Link>
                        </div>
                    ) : (
                        <div /> 
                    )}
                    
                    <Button
                        onClick={handleExport}
                        disabled={loading || isLocked}
                        className={`gap-2 px-8 font-black transition-all ${isLocked ? 'opacity-20' : 'shadow-lg shadow-primary/20 hover:scale-105'}`}
                        size="lg"
                    >
                        {loading ? (
                            "Preparing Export..."
                        ) : (
                            <>
                                {isLocked ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                Download CSV
                            </>
                        )}
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}

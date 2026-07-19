"use client";

import React, { useEffect, useState } from "react";
import { Globe, DollarSign, Users, Building, AlertCircle, ShieldEllipsis, Pencil, Trash2, X, AlertOctagon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
    _count: { members: number; deals: number; leads: number };
}

interface Account {
    id: string;
    name: string;
    createdAt: string;
    planTier: string;
    activeSeats: number;
    owner: { name: string; email: string };
    isActive: boolean;
    hasPaymentSetup: boolean;
    trialEndsAt: string | null;
    users: { name: string; email: string }[];
    workspaces: Workspace[];
}

import { provisionDemoAccount } from "@/lib/actions/demo-provision";

export function SuperAdminTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [metrics, setMetrics] = useState({ totalAccounts: 0, totalWorkspaces: 0, totalUsers: 0, totalMRR: 0 });

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'PLAN' | 'DELETE';
        accountId: string;
        accountName: string;
        pendingPlan?: string;
    }>({ isOpen: false, type: 'PLAN', accountId: '', accountName: '' });
    
    const [deleteInput, setDeleteInput] = useState("");
    const [isActioning, setIsActioning] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const [isProvisioningDemo, setIsProvisioningDemo] = useState(false);

    const executeDemoProvision = async () => {
        setIsProvisioningDemo(true);
        toast.info("Provisioning Demo Environment. This may take 5-10 seconds to generate realistic data...", { duration: 5000 });
        try {
            const result = await provisionDemoAccount();
            if (result.success) {
                toast.success(`Demo Provisioned! Login: ${result.email} | Pass: ${result.password}`, { duration: 10000 });
                fetchAdminData();
            } else {
                toast.error(`Provision failed: ${result.error}`);
            }
        } catch (error) {
            toast.error("Network constraint: Demo provision failed.");
        } finally {
            setIsProvisioningDemo(false);
        }
    };

    const fetchAdminData = async () => {
        try {
            const res = await fetch("/api/admin/workspaces");
            const data = await res.json();
            if (res.ok && data.success) {
                setAccounts(data.accounts);
                setMetrics(data.metrics);
            } else {
                toast.error("Access Denied: Super Admin Only.");
            }
        } catch (error) {
            toast.error("Failed to load SaaS Metrics.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    const executePlanChange = async () => {
        setIsActioning(true);
        try {
            const res = await fetch("/api/admin/workspaces", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "CHANGE_PLAN", accountId: modalConfig.accountId, payload: { newPlan: modalConfig.pendingPlan } })
            });
            if (res.ok) {
                toast.success("Organization Plan Upgraded Successfully.");
                fetchAdminData();
            } else {
                toast.error("Failed to upgrade plan.");
            }
        } catch (error) {
            toast.error("Network constraint: Action failed.");
        } finally {
            setIsActioning(false);
            setModalConfig({ ...modalConfig, isOpen: false });
        }
    };

    const executeAccountDelete = async () => {
        if (deleteInput !== modalConfig.accountName) {
            toast.error("Sequence Aborted: Account name mismatch.");
            return;
        }

        setIsActioning(true);
        try {
            const res = await fetch("/api/admin/workspaces", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "DELETE", accountId: modalConfig.accountId })
            });
            if (res.ok) {
                toast.success(`Subscription Account '${modalConfig.accountName}' securely wiped.`);
                fetchAdminData();
            } else {
                toast.error("Failed to execute Account Wipe.");
            }
        } catch (error) {
            toast.error("Network constraint: Action failed.");
        } finally {
            setIsActioning(false);
            setModalConfig({ ...modalConfig, isOpen: false });
            setDeleteInput("");
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading SaaS Management Console...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-red-500/20 shadow-xl shadow-red-500/5 bg-gradient-to-br from-white to-red-50 dark:from-zinc-950 dark:to-zinc-950/50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500 font-black tracking-tight">
                        <ShieldEllipsis className="w-5 h-5" />
                        Platform Account Management
                    </CardTitle>
                    <CardDescription className="font-medium italic">
                        Real-time tenant oversight. Manually override plans or terminate account partitions.
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 overflow-x-auto bg-white dark:bg-zinc-900 shadow-sm">
                        <table className="w-full min-w-[900px] text-sm text-left text-zinc-500 dark:text-zinc-400">
                            <thead className="text-xs text-zinc-900 uppercase bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 font-bold border-b border-zinc-200 dark:border-white/10">
                                <tr>
                                    <th className="px-4 py-4">Client Organization</th>
                                    <th className="px-4 py-4">Account Owner</th>
                                    <th className="px-4 py-4">Active Plan</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4 text-center">Partitions</th>
                                    <th className="px-4 py-4 text-right">Master Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center">No Subscription Accounts Detected.</td></tr>
                                ) : accounts.map((acc) => (
                                    <React.Fragment key={acc.id}>
                                        <tr 
                                            onClick={() => setExpandedRowId(expandedRowId === acc.id ? null : acc.id)}
                                            className="border-b border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-4 py-4 font-bold text-zinc-900 dark:text-white flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                                                <Globe className="w-4 h-4 text-indigo-500" />
                                                <span className="truncate max-w-[120px]">{acc.name}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-zinc-900 dark:text-zinc-300 truncate max-w-[120px]">{acc.owner?.name || acc.users?.[0]?.name || "System"}</p>
                                                <p className="text-xs truncate max-w-[120px]">{acc.owner?.email || acc.users?.[0]?.email || "n/a"}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black ${acc.planTier === 'ENTERPRISE' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : acc.planTier === 'PRO' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                    {acc.planTier}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div 
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setIsLoading(true);
                                                        try {
                                                            const res = await fetch("/api/admin/workspaces", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ action: "TOGGLE_PAYMENT_SETUP", accountId: acc.id })
                                                            });
                                                            if (res.ok) {
                                                                toast.success(acc.hasPaymentSetup ? "Payment Setup Reversed to Manual/Trial." : "Manual Payment Setup Verified & Activated.");
                                                                fetchAdminData();
                                                            }
                                                        } finally {
                                                            setIsLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {acc.hasPaymentSetup ? (
                                                        <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[9px] font-black uppercase rounded-md border border-emerald-100 dark:border-emerald-500/20 w-fit shadow-sm">
                                                            <DollarSign className="w-2.5 h-2.5" /> Paid
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[9px] font-black uppercase rounded-md border border-amber-100 dark:border-amber-500/20 w-fit shadow-sm">
                                                                <AlertCircle className="w-2.5 h-2.5" /> Trial
                                                            </span>
                                                            {acc.trialEndsAt && (
                                                                <p className="text-[8px] text-zinc-400 font-medium whitespace-nowrap">
                                                                    Exp: {new Date(acc.trialEndsAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-white/5 text-[10px] font-bold text-zinc-500">
                                                    <Building className="w-3 h-3" />
                                                    {acc.workspaces.length}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={async () => {
                                                            setIsLoading(true);
                                                            try {
                                                                const res = await fetch("/api/admin/workspaces", {
                                                                    method: "PATCH",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ action: "TOGGLE_STATUS", accountId: acc.id })
                                                                });
                                                                if (res.ok) {
                                                                    toast.success(acc.isActive ? "Organization Suspended." : "Organization Reactivated.");
                                                                    fetchAdminData();
                                                                }
                                                            } finally {
                                                                setIsLoading(false);
                                                            }
                                                        }}
                                                        className={`px-2 py-1 border rounded transition-all shadow-sm font-bold text-[10px] uppercase tracking-tighter ${acc.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white ring-2 ring-amber-500/20'}`}
                                                    >
                                                        {acc.isActive ? "Active" : "Suspended"}
                                                    </button>

                                                    <select 
                                                        onChange={(e) => { 
                                                            if(e.target.value) {
                                                                setModalConfig({ isOpen: true, type: 'PLAN', accountId: acc.id, accountName: acc.name, pendingPlan: e.target.value });
                                                            }
                                                            e.target.value = ''; 
                                                        }}
                                                        className="bg-white dark:bg-zinc-900 text-xs px-2 py-1 rounded border border-zinc-200 dark:border-white/10 outline-none hover:border-blue-500 transition-colors cursor-pointer font-bold"
                                                        value=""
                                                    >
                                                        <option value="" disabled>Plan Override...</option>
                                                        <option value="FREE">FREE</option>
                                                        <option value="STARTER">STARTER</option>
                                                        <option value="PRO">PRO</option>
                                                        <option value="ENTERPRISE">ENTERPRISE</option>
                                                    </select>
                                                    
                                                    <button onClick={() => {
                                                        setDeleteInput("");
                                                        setModalConfig({ isOpen: true, type: 'DELETE', accountId: acc.id, accountName: acc.name });
                                                    }} className="px-2 py-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 border border-red-100 dark:border-red-500/20 text-red-600 rounded transition-all group/btn shadow-sm">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRowId === acc.id && (
                                            <tr className="bg-zinc-100/50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <td colSpan={5} className="p-6">
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Building className="w-3 h-3" />
                                                            Active Partitions for {acc.name}
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {acc.workspaces.map((ws) => (
                                                                <div key={ws.id} className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col gap-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{ws.name}</span>
                                                                        <span className="text-[10px] text-zinc-400 font-mono italic">{ws.id.slice(-6)}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                                                        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-white/5">
                                                                            <p className="text-xs font-black text-blue-500">{ws._count.members}</p>
                                                                            <p className="text-[8px] font-bold text-zinc-500 uppercase">Users</p>
                                                                        </div>
                                                                        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-white/5">
                                                                            <p className="text-xs font-black text-indigo-500">{ws._count.leads}</p>
                                                                            <p className="text-[8px] font-bold text-zinc-500 uppercase">Leads</p>
                                                                        </div>
                                                                        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-white/5">
                                                                            <p className="text-xs font-black text-purple-500">{ws._count.deals}</p>
                                                                            <p className="text-[8px] font-bold text-zinc-500 uppercase">Deals</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Demo Environment Provisioner */}
            <Card className="border-blue-500/20 shadow-xl shadow-blue-500/5 bg-gradient-to-br from-white to-blue-50 dark:from-zinc-950 dark:to-zinc-950/50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-black tracking-tight">
                         <Globe className="w-5 h-5" />
                         Sales Demo Environment
                    </CardTitle>
                    <CardDescription className="font-medium italic">
                        Instantly deploy or reset a dedicated, isolated sandbox populated with rich, realistic dummy data for client walkthroughs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                     <Button 
                        onClick={executeDemoProvision}
                        disabled={isProvisioningDemo}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-blue-500/20 w-fit transition-all hover:scale-[1.02]"
                     >
                        {isProvisioningDemo ? "Synthesizing Dummy Data Engine..." : "Provision / Reset Demo Environment"}
                     </Button>
                     <p className="text-xs text-zinc-500 font-medium mt-3">This action safely overwrites existing demo data and regenerates 50+ Leads, 25 Contacts, 20 Deals, and Activities across 15 automated Organizations.</p>
                </CardContent>
            </Card>

            {/* Custom Interactive Prompts */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        {modalConfig.type === 'PLAN' ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-5 border border-blue-100 dark:border-blue-500/20 shadow-inner">
                                    <ShieldEllipsis className="w-8 h-8 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Tier Override</h2>
                                <p className="text-sm text-zinc-500 mb-8 leading-relaxed px-2">
                                    Apply <span className="font-black text-blue-500 px-1 py-0.5 bg-blue-50 dark:bg-blue-500/10 rounded">{modalConfig.pendingPlan}</span> plan to the entire <span className="font-bold text-zinc-900 dark:text-white">'{modalConfig.accountName}'</span> organization? All workspaces under this account will inherit this tier.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <Button variant="outline" className="flex-1 font-bold rounded-xl border-zinc-200" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>Cancel</Button>
                                    <Button disabled={isActioning} className="flex-1 font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20" onClick={executePlanChange}>
                                        {isActioning ? "Executing..." : "Confirm Upgrade"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-5 border border-red-100 dark:border-red-500/20 shadow-inner">
                                    <AlertOctagon className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-2xl font-black text-red-600 dark:text-red-500 tracking-tight mb-2">Terminate Account</h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed px-2">
                                    Warning: This will permanently eradicate the Subscription Account <span className="font-bold text-zinc-900 dark:text-white">'{modalConfig.accountName}'</span> and all its workspaces. Type account name to confirm:
                                </p>
                                <input 
                                    className="w-full bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-xl py-3 px-4 text-center text-zinc-900 dark:text-zinc-100 focus:border-red-500 outline-none transition-colors font-mono tracking-tight text-sm mb-6 placeholder-red-300 dark:placeholder-red-900 shadow-inner" 
                                    placeholder={modalConfig.accountName}
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value)}
                                />
                                <div className="flex gap-3 w-full">
                                    <Button variant="outline" className="flex-1 font-bold rounded-xl border-zinc-200" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>Abort</Button>
                                    <Button disabled={isActioning || deleteInput !== modalConfig.accountName} className="flex-1 font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 disabled:opacity-50" onClick={executeAccountDelete}>
                                        {isActioning ? "Erasing..." : "Eradicate Account"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

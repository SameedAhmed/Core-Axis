import { getAllAccounts } from "@/lib/actions/platform";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { 
    Users, 
    Building, 
    CreditCard,
    ArrowLeft,
    ShieldCheck,
    Search,
    Filter,
    Briefcase
} from "lucide-react";
import Link from "next/link";
import { PlanOverrideButton } from "@/components/saas/plan-override-button";

export const dynamic = "force-dynamic";

export default async function AccountsManagement() {
    // 🛡️ God-Mode Check
    if (!await isSuperAdmin()) redirect("/dashboard");

    const { accounts, success, error } = await getAllAccounts();
    if (!success || !accounts) return <div className="p-10 text-red-500 font-bold">Error: {error}</div>;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
             {/* Dynamic Header */}
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card border border-border p-8 rounded-3xl shadow-xl shadow-black/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full" />
                <div className="relative z-10">
                    <Link href="/dashboard/saas" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-indigo-500 transition-colors mb-4">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Control Room Overview
                    </Link>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                         Platform <span className="text-[#1e1b4b] dark:text-indigo-500">Account Browser</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium italic">
                        Managing {accounts.length} isolated tenant partitions.
                    </p>
                </div>
                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <input 
                            placeholder="Filter by Organization or Email..." 
                            className="w-full bg-muted/50 border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:border-indigo-500 outline-none transition-all"
                         />
                    </div>
                    <button className="p-2 border border-border bg-card rounded-xl hover:bg-muted transition-colors">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Account Management Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl shadow-black/5">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            <th className="px-8 py-4">Organization & Identity</th>
                            <th className="px-8 py-4">Capacity Overlook</th>
                            <th className="px-8 py-4">Current Subscription</th>
                            <th className="px-8 py-4 text-right">Master Override</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {accounts.map((account: any) => (
                            <tr key={account.id} className="group hover:bg-muted/20 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-indigo-500/10 flex items-center justify-center transition-colors">
                                            <Building className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{account.name}</p>
                                            <p className="text-xs text-muted-foreground">{account.users?.[0]?.email || "Restricted Identity"}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Users</span>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-sm font-bold">{account._count.users}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Workspaces</span>
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-sm font-bold">{account._count.workspaces}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                     <div className="flex flex-col gap-1.5">
                                         <div className="flex items-center gap-2">
                                            <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${account.planTier === 'ENTERPRISE' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600' : 'bg-indigo-500/10 border-indigo-500/20 text-[#1e1b4b]'}`}>
                                                {account.planTier}
                                            </span>
                                         </div>
                                         <p className="text-[10px] text-muted-foreground font-medium italic">
                                            Created: {new Date(account.createdAt).toLocaleDateString()}
                                         </p>
                                     </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <PlanOverrideButton accountId={account.id} currentTier={account.planTier} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bottom Insight */}
             <div className="flex items-center justify-center gap-3 p-8 border border-border border-dashed rounded-3xl text-sm font-bold text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Master Overrides are persistent across Stripe Webhook synchronization.
            </div>
        </div>
    );
}

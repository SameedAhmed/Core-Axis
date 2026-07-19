import { getPlatformStats } from "@/lib/actions/platform";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { 
    Users, 
    Rocket, 
    Activity, 
    CreditCard, 
    Building, 
    Briefcase,
    ArrowUpRight,
    Search,
    ShieldCheck,
    BarChart3
} from "lucide-react";

export const dynamic = "force-dynamic";

import { PlatformAuditLogs } from "@/components/saas/platform-audit-logs";

export default async function SaaSControlRoom() {
    // 🛡️ Critical: Dual Verification for SaaS God Mode
    const isMaster = await isSuperAdmin();
    if (!isMaster) {
        redirect("/dashboard"); // Standard users cannot see this route
    }

    const { stats, success, error } = await getPlatformStats();
    if (!success || !stats) return <div className="p-10 text-red-500 font-bold border rounded-3xl bg-red-50 dark:bg-red-950/20 m-6">Error: {error || "Failed to load platform global stats."}</div>;

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Header Area */}
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[#1e1b4b] dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">
                         <ShieldCheck className="w-3.5 h-3.5" />
                         Platform Integrity: Green
                     </div>
                     <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                         SaaS <span className="text-[#1e1b4b] dark:text-indigo-500">Control Room</span>
                     </h1>
                     <p className="text-muted-foreground mt-1 font-medium italic text-sm">
                         Platform Master Overlook • Root Identity Context
                     </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm border-indigo-500/20">
                        <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <span className="text-sm font-bold">System: Active</span>
                    </div>
                </div>
            </div>

            {/* Global KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Accounts" value={stats.totalAccounts} icon={Building} color="text-blue-500" />
                <KPICard title="Active Leads" value={stats.totalLeads} icon={Users} color="text-indigo-500" />
                <KPICard title="Live Monthly Revenue" value={`$${stats.totalMRR}`} icon={CreditCard} color="text-indigo-600 dark:text-indigo-400" sub="Verified MRR" />
                <KPICard title="Total Workspaces" value={stats.totalWorkspaces} icon={Briefcase} color="text-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Tier Distribution */}
                 <div className="lg:col-span-1 bg-card border border-border rounded-3xl p-8 shadow-xl shadow-black/5">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Tier Distribution
                    </h3>
                    <div className="space-y-6">
                        {stats.tiers.map((tier: any) => (
                            <div key={tier.planTier} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">{tier.planTier}</span>
                                    <span>{tier._count.id}</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full ${tier.planTier === 'ENTERPRISE' ? 'bg-indigo-500' : tier.planTier === 'PRO' ? 'bg-indigo-600' : 'bg-zinc-400'}`} 
                                        style={{ width: `${(tier._count.id / stats.totalAccounts) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Recent Account Instantiations */}
                 <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-xl shadow-black/5 overflow-hidden">
                    <h3 className="text-lg font-black mb-6 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Rocket className="w-5 h-5 text-[#1e1b4b]" />
                            Newly Instantiated Accounts
                         </div>
                         <button className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">See all accounts</button>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-border">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <th className="pb-4">Organization</th>
                                    <th className="pb-4">Master Proxy</th>
                                    <th className="pb-4">Tier</th>
                                    <th className="pb-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {stats.recentAccounts.map((account: any) => (
                                    <tr key={account.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="py-4 font-bold text-sm tracking-tight">{account.name}</td>
                                        <td className="py-4 text-sm text-muted-foreground font-medium">{account.users?.[0]?.email || "System-Wide / N/A"}</td>
                                        <td className="py-4">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border shadow-sm ${account.planTier === 'ENTERPRISE' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'}`}>
                                                {account.planTier}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-xs text-indigo-600 font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                Live-Synced
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>

            {/* Performance Overlook - Functional Audit Log */}
            <section id="audit-logs" className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">System Monitoring</h2>
                        <p className="text-muted-foreground font-medium text-sm">Real-time trace logs from the platform audit core.</p>
                    </div>
                </div>
                <PlatformAuditLogs />
            </section>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color, sub }: any) {
    return (
        <div className="bg-card border border-border p-6 rounded-3xl shadow-xl shadow-black/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-muted group-hover:${color.replace('text', 'bg').replace('-500', '-500/10')} flex items-center justify-center transition-colors`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black tracking-tight">{value}</h2>
                    {sub && <span className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</span>}
                </div>
            </div>
        </div>
    );
}

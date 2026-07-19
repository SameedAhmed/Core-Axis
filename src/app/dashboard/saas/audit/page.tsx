import { getPlatformAuditLogs } from "@/lib/actions/platform";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { 
    Activity, 
    ArrowLeft,
    ShieldCheck,
    Search,
    Filter,
    Terminal,
    User,
    Building
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalAuditLogs() {
    // 🛡️ Super Admin Access Check
    if (!await isSuperAdmin()) redirect("/dashboard");

    const { logs, success, error } = await getPlatformAuditLogs();
    if (!success || !logs) return <div className="p-10 text-red-500 font-bold">Error: {error}</div>;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500 pb-20">
             {/* Header Area */}
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card border border-border p-8 rounded-3xl shadow-xl shadow-black/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full" />
                <div className="relative z-10">
                    <Link href="/dashboard/saas" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-indigo-500 transition-colors mb-4">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Control Room Overview
                    </Link>
                    <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                         Global <span className="text-purple-600 dark:text-purple-400">Audit Blackbox</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium italic">
                        Cross-tenant activity oversight. High Fidelity Logging.
                    </p>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl font-mono text-xs">
                <div className="bg-zinc-900/50 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Terminal className="w-4 h-4 text-purple-400" />
                         </div>
                         <h3 className="font-black uppercase tracking-[0.2em] text-zinc-400">System Logs • Platform Primary</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-zinc-800 bg-zinc-900/30">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Actor (Email)</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Tenant (Workspace)</th>
                                <th className="px-6 py-3 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                             {logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 text-zinc-500">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-bold text-purple-400 flex items-center gap-2">
                                        <User className="w-3 h-3 opacity-50" />
                                        {log.user?.email || "System"}
                                    </td>
                                    <td className="px-6 py-4 uppercase font-black tracking-widest text-[10px]">
                                        <span className={`px-2 py-0.5 rounded-md border ${log.action === 'DELETE' ? 'border-red-500/50 text-red-500 bg-red-500/10' : log.action === 'CREATE' ? 'border-indigo-500/50 text-indigo-500 bg-indigo-500/10' : 'border-zinc-700 text-zinc-300 bg-zinc-800'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-300 flex items-center gap-2">
                                        <Building className="w-3 h-3 opacity-50" />
                                        {log.workspace?.name || "Global / N/A"}
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-500 group-hover:text-zinc-300 transition-colors italic">
                                        {log.details}
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* Footer Logic Integrity Badge */}
             <div className="flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest text-zinc-500">
                 <ShieldCheck className="w-4 h-4 text-indigo-500" />
                 Platform Immutable Audit Context • Verifying 50+ Events Real-time
            </div>
        </div>
    );
}

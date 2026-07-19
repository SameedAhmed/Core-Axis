"use client";

import { useState, useEffect } from "react";
import { getPlatformAuditLogs } from "@/lib/actions/platform";
import { 
    History, 
    User, 
    Building2, 
    ArrowRight, 
    Clock, 
    Search,
    Filter,
    FileText,
    Terminal
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function PlatformAuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(15);
    const [isLoadingPage, setIsLoadingPage] = useState(false);

    useEffect(() => {
        async function loadLogs() {
            setIsLoadingPage(true);
            const res = await getPlatformAuditLogs(pageIndex * pageSize, pageSize);
            if (res.success) {
                setLogs(res.logs || []);
                setTotalLogs(res.total || 0);
            }
            setIsLoading(false);
            setIsLoadingPage(false);
        }
        loadLogs();
    }, [pageIndex, pageSize]);

    const filteredLogs = logs.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.workspace?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pageCount = Math.ceil(totalLogs / pageSize);

    if (isLoading && !isLoadingPage) {
        return (
            <div className="p-12 text-center animate-pulse">
                <Terminal className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Streaming Audit Context...</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <History className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg tracking-tight">Platform Audit Infrastructure</h3>
                        <p className="text-xs text-muted-foreground font-medium">Global activity stream across all partitions.</p>
                    </div>
                </div>

                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Search system actions, users, or orgs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <th className="py-4 px-6 text-center w-12"><Terminal className="w-3.5 h-3.5 mx-auto" /></th>
                            <th className="py-4 px-6 font-bold">Trace / Action</th>
                            <th className="py-4 px-6 font-bold">Actor Identity</th>
                            <th className="py-4 px-6 font-bold">Workspace Context</th>
                            <th className="py-4 px-6 font-bold text-right">Timestamp (UTC)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="group hover:bg-muted/30 transition-colors border-l-4 border-transparent hover:border-indigo-500">
                                <td className="py-4 px-6 text-center">
                                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center mx-auto">
                                        <FileText className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-tighter text-foreground group-hover:text-indigo-600 transition-colors">
                                            {log.action}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground italic font-medium">{log.entityType} • {log.details || "No metadata"}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                            <User className="w-3 h-3 text-indigo-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">{log.user?.name || "Anonymous / API"}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">{log.user?.email || "N/A"}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    {log.workspace ? (
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs font-bold text-muted-foreground">{log.workspace.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Global Admin Root</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground font-mono">
                                        <Clock className="w-3 h-3 opacity-60" />
                                        {format(new Date(log.createdAt), "HH:mm:ss MMMM dd")}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredLogs.length === 0 && (
                <div className="p-20 text-center">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No matching traces found in the global stream.</p>
                </div>
            )}
            
            {/* Pagination Controls */}
            {/* Overhauled Responsive Pagination */}
            {totalLogs > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-border bg-card">
                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                        Showing <span className="text-foreground font-bold">{pageIndex * pageSize + 1}</span> to <span className="text-foreground font-bold">{Math.min((pageIndex + 1) * pageSize, totalLogs)}</span> of <span className="text-foreground font-bold">{totalLogs}</span> traces.
                    </div>
                
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden xs:block">Rows</p>
                            <Select
                                value={`${pageSize}`}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setPageIndex(0);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] bg-muted/50 border-border/50 font-bold text-xs ring-0 focus:ring-0">
                                    <SelectValue placeholder={pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top" className="border-border shadow-xl">
                                    {[15, 30, 50, 100].map((size) => (
                                        <SelectItem key={size} value={`${size}`} className="text-xs font-medium">
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-center text-xs font-bold min-w-[90px] whitespace-nowrap bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                            Page {pageIndex + 1} <span className="text-muted-foreground font-light mx-1.5">of</span> {pageCount || 1}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-none"
                                onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                                disabled={pageIndex === 0 || isLoadingPage}
                            >
                                <span className="sr-only">Previous page</span>
                                <span className="text-lg font-light leading-none mb-0.5">‹</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-none"
                                onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
                                disabled={pageIndex >= pageCount - 1 || isLoadingPage}
                            >
                                <span className="sr-only">Next page</span>
                                <span className="text-lg font-light leading-none mb-0.5">›</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 border-t border-border bg-muted/10 text-center">
                <button className="text-[10px] font-black uppercase tracking-widest text-[#1e1b4b] hover:underline">
                    Download Enterprise Audit Archive (CSV)
                </button>
            </div>
        </div>
    );
}

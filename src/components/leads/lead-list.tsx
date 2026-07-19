"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
} from "@tanstack/react-table";
import { Lead } from "@/generated/prisma/client/client";
import { convertLeadToDeal } from "@/lib/actions/crm";
import { markLeadAsViewed } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Sparkles, TrendingUp, TrendingDown, Minus, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditLeadDialog } from "./edit-lead-dialog";
import { SendMessageDialog } from "./send-message-dialog";
import { AssignLeadDialog } from "./assign-lead-dialog";
import { deleteLead, deleteLeads } from "@/lib/actions/leads";
import { LeadSheet } from "./lead-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ShieldAlert, Search, FilterX, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/navigation";


interface LeadListProps {
    data: (Lead & { 
        organization?: { id: string; name: string } | null;
        owner?: { id: string; name: string | null; email: string | null } | null;
        createdBy?: { id: string; name: string | null; email: string | null } | null;
    })[];
    organizations: { id: string; name: string }[];
    suggestions?: { services: string[]; sources: string[] };
}

export function LeadList({ data, organizations, suggestions }: LeadListProps) {
    const { data: session } = useSession();
    const { confirm } = useConfirm();
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sorting, setSorting] = useState<SortingState>([]);

    const isManagerOrAdmin = session?.user && ["ADMIN", "MANAGER"].includes((session.user as any).role);

    const allSources = suggestions?.sources || [];
    
    // Formatting helper for legacy codes
    const formatSource = (source: string) => {
        const defaultLabels: Record<string, string> = {
            MANUAL: "Manual",
            IMPORT: "Import",
            META_ADS: "Meta Ads",
            PPC: "PPC",
            SEO: "SEO",
            WP_SYNC: "WP Sync",
            TEST: "Test"
        };
        return defaultLabels[source] || source;
    };

    // --- Filter States ---
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [sourceFilter, setSourceFilter] = useState<string>("ALL");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return data.filter((lead) => {
            const matchesSearch =
                (lead.firstName || "").toLowerCase().includes(query) ||
                (lead.lastName || "").toLowerCase().includes(query) ||
                (lead.email || "").toLowerCase().includes(query) ||
                (lead.phone || "").includes(query);

            const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
            const matchesSource = sourceFilter === "ALL" || (lead as any).source === sourceFilter;

            let matchesDate = true;
            if (dateRange?.from) {
                const leadDate = new Date(lead.createdAt);
                if (dateRange.to) {
                    matchesDate = isWithinInterval(leadDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to)
                    });
                } else {
                    matchesDate = isWithinInterval(leadDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.from)
                    });
                }
            }

            return matchesSearch && matchesStatus && matchesSource && matchesDate;
        });
    }, [data, searchQuery, statusFilter, sourceFilter, dateRange]);

    const toggleAll = () => {
        if (selectedIds.size === filteredData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map(lead => lead.id)));
        }
    };

    const toggleLead = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const isConfirmed = await confirm({
            title: "Delete Leads",
            description: `Are you sure you want to delete ${selectedIds.size} leads? This cannot be undone.`,
            variant: "destructive",
            confirmText: "Delete All"
        });
        if (!isConfirmed) return;

        setLoadingId("bulk_delete");
        const res = await deleteLeads(Array.from(selectedIds));
        if (res.success) {
            setSelectedIds(new Set());
            toast.success(`Successfully deleted ${res.count} leads.`);
            router.refresh();
        } else {
            toast.error(res.error || "Failed to delete leads.");
        }
        setLoadingId(null);
    };

    const columns: ColumnDef<Lead>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="translate-y-[2px] border-border"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.has(row.original.id)}
                    onCheckedChange={() => toggleLead(row.original.id)}
                    aria-label="Select row"
                    className="translate-y-[2px] border-border"
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: "createdAt",
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Date
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }) => {
                const date = new Date(row.original.createdAt);
                return (
                    <div className="text-sm text-muted-foreground font-medium">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                );
            },
        },
        {
            id: "name",
            accessorKey: "firstName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }) => {
                const lead = row.original;
                const isViewed = (lead as any).isViewed ?? true;
                return (
                    <div className="flex items-center gap-2">
                        {!isViewed && (
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </div>
                        )}
                        <span className={`text-foreground ${!isViewed ? 'font-bold' : 'font-medium'}`}>
                            {lead.firstName} {lead.lastName}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "service",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Service
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }) => {
                const service = (row.original as any).service;
                return service || <span className="text-muted-foreground italic text-xs">-</span>;
            }
        },
        {
            accessorKey: "source",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Source
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }) => {
                const source = (row.original as any).source || "MANUAL";
                const sourceColors: Record<string, string> = {
                    META_ADS: "bg-blue-50 text-blue-700 border-blue-200",
                    IMPORT: "bg-muted text-foreground border-border",
                    MANUAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    WP_SYNC: "bg-purple-50 text-purple-700 border-purple-200",
                    PPC: "bg-orange-50 text-orange-700 border-orange-200",
                    SEO: "bg-indigo-50 text-indigo-700 border-indigo-200",
                };
                return (
                    <Badge variant="outline" className={`font-semibold text-[10px] tracking-tight ${sourceColors[source] || sourceColors.MANUAL}`}>
                        {source.replace("_", " ")}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "status",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Status
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const colorMap: Record<string, string> = {
                    NEW: "bg-blue-100 text-blue-800",
                    CONTACTED: "bg-yellow-100 text-yellow-800",
                    QUALIFIED: "bg-purple-100 text-purple-800",
                    CONVERTED: "bg-green-100 text-green-800",
                };
                const displayStatus = status === "CONVERTED" ? "IN SALES PIPELINE" : status;
                return (
                    <Badge className={colorMap[status] || "bg-gray-100 text-gray-800"}>
                        {displayStatus}
                    </Badge>
                );
            },
        },
        ...(isManagerOrAdmin ? [{
            id: "assignee",
            accessorKey: "owner.name",
            header: ({ column }: any) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-black uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Assigned To
                        {column.getIsSorted() === "asc" ? (
                            <ChevronUp className="ml-2 h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ChevronDown className="ml-2 h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                        )}
                    </Button>
                );
            },
            cell: ({ row }: any) => {
                const owner = row.original.owner;
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                {owner?.name?.substring(0, 2).toUpperCase() || "UN"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground">{owner?.name || "Unassigned"}</span>
                    </div>
                );
            }
        }] : []),
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const lead = row.original;
                const isConverted = lead.status === "CONVERTED";

                const handleConvert = async () => {
                    const isConfirmed = await confirm({
                        title: "Convert Lead to Opportunity",
                        description: "Are you sure you want to convert this lead to an active deal opportunity? This action cannot be undone.",
                        confirmText: "Convert to Opportunity"
                    });
                    if (!isConfirmed) return;
                    
                    setLoadingId(lead.id);
                    const result = await convertLeadToDeal(lead.id);
                    if (result?.success) {
                        toast.success(`${lead.firstName} successfully converted to an Opportunity!`);
                        router.refresh();
                    } else {
                        toast.error(result?.error || "Conversion failed.");
                    }
                    setLoadingId(null);
                };

                return (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <SendMessageDialog leadId={lead.id} phone={lead.phone} firstName={lead.firstName} compact />
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-2.5 text-[11px] font-bold"
                            onClick={handleConvert}
                            disabled={isConverted || loadingId === `convert_${lead.id}`}
                        >
                            {loadingId === `convert_${lead.id}` ? "..." : "Opportunity"}
                        </Button>
                        {isManagerOrAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <EditLeadDialog lead={lead} organizations={organizations} suggestions={suggestions} />
                                    {isManagerOrAdmin && <AssignLeadDialog lead={lead} />}
                                    {session?.user && (session.user as any).role === "ADMIN" && (
                                        <DropdownMenuItem
                                            className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                            onClick={async () => {
                                                const isConfirmed = await confirm({
                                                    title: "Delete Lead",
                                                    description: "Are you sure you want to delete this lead? This cannot be undone.",
                                                    variant: "destructive",
                                                    confirmText: "Delete"
                                                });
                                                if (isConfirmed) {
                                                    setLoadingId(`delete_${lead.id}`);
                                                    const res = await deleteLead(lead.id);
                                                    if (res.success) {
                                                        toast.success("Lead deleted successfully.");
                                                        router.refresh();
                                                    } else {
                                                        toast.error(res.error || "Failed to delete lead.");
                                                    }
                                                    setLoadingId(null);
                                                }
                                            }}
                                            disabled={loadingId === `delete_${lead.id}`}
                                        >
                                            {loadingId === `delete_${lead.id}` ? "Deleting..." : "Delete"}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                );
            },
        },
    ];

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
        initialState: {
            pagination: {
                pageSize: 15, // Set to 15 per user's request
            },
            sorting: [
                { id: "createdAt", desc: true }
            ]
        },
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto flex-1">
                    <div className="relative w-full md:w-[300px] lg:w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted/50 border-border focus:bg-background transition-all h-10 rounded-xl text-sm"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[140px] bg-muted/50 border-border h-10 rounded-xl font-medium text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="NEW">New</SelectItem>
                                <SelectItem value="CONVERTED">In Sales Pipeline</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="w-full sm:w-[140px] bg-muted/50 border-border h-10 rounded-xl font-medium text-xs">
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Sources</SelectItem>
                                {allSources.map((s) => (
                                    <SelectItem key={s} value={s}>{formatSource(s)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {(searchQuery || statusFilter !== "ALL" || sourceFilter !== "ALL" || dateRange) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("ALL");
                                setSourceFilter("ALL");
                                setDateRange(undefined);
                            }}
                            className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 hidden sm:flex"
                            title="Clear all filters"
                        >
                            <FilterX className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="mb-4 p-3 bg-primary text-primary-foreground rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-xl border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-md">
                            <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium">
                            <span className="font-bold text-indigo-400">{selectedIds.size}</span> leads selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Deselect all
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 shadow-sm"
                            onClick={handleBulkDelete}
                            disabled={loadingId === "bulk_delete"}
                        >
                            {loadingId === "bulk_delete" ? "Deleting..." : (
                                <>
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete Selection
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden pb-4">
                {filteredData.length > 0 ? (
                    filteredData.map((lead) => {
                        const isConverted = lead.status === "CONVERTED";
                        const isViewed = (lead as any).isViewed ?? true;
                        const date = new Date(lead.createdAt);
                        const source = (lead as any).source || "MANUAL";
                        const sourceColors: Record<string, string> = {
                            META_ADS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
                            IMPORT: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
                            MANUAL: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
                        };

                        return (
                            <div
                                key={lead.id}
                                className={`relative group p-4 rounded-2xl border bg-card shadow-sm active:scale-[0.98] transition-all duration-200 ${
                                    !isViewed 
                                    ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/5" 
                                    : "border-border/60"
                                }`}
                                onClick={async () => {
                                    setSelectedLead(lead as any);
                                    if (!isViewed) {
                                        await markLeadAsViewed(lead.id);
                                        router.refresh();
                                    }
                                }}
                            >
                                {!isViewed && (
                                    <div className="absolute top-4 right-4 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedIds.has(lead.id)}
                                            onCheckedChange={() => toggleLead(lead.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-5 w-5 rounded-md border-border/60"
                                        />
                                        <div>
                                            <h3 className={`text-base tracking-tight leading-none ${!isViewed ? 'font-black' : 'font-bold'}`}>
                                                {lead.firstName} {lead.lastName}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {lead.email || "No email"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-5">
                                    <Badge variant="outline" className={`font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full ${sourceColors[source] || sourceColors.MANUAL}`}>
                                        {source.replace("_", " ")}
                                    </Badge>
                                    <Badge className={`font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                        lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50' :
                                        lead.status === 'CONTACTED' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/50' : 
                                        'bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/50'
                                    }`}>
                                        {lead.status === "CONVERTED" ? "IN SALES PIPELINE" : lead.status}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                    <div className="flex items-center gap-2">
                                        {lead.owner && (
                                            <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-lg">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[8px] font-black uppercase bg-primary/10 text-primary">
                                                        {lead.owner.name?.substring(0, 2).toUpperCase() || "UN"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] font-bold text-muted-foreground">{lead.owner.name?.split(' ')[0]}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <SendMessageDialog leadId={lead.id} phone={lead.phone} firstName={lead.firstName} compact />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl bg-muted/30">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl">
                                                <EditLeadDialog lead={lead as any} organizations={organizations} suggestions={suggestions} />
                                                {isManagerOrAdmin && <AssignLeadDialog lead={lead as any} />}
                                                <DropdownMenuItem
                                                    className="gap-2 py-2.5 font-bold text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/20"
                                                    disabled={isConverted}
                                                    onClick={async () => {
                                                        const isConfirmed = await confirm({
                                                            title: "Convert to Opportunity",
                                                            description: "Send this lead to the Sales Pipeline?",
                                                            confirmText: "Convert Now"
                                                        });
                                                        if (isConfirmed) {
                                                            setLoadingId(lead.id);
                                                            const res = await convertLeadToDeal(lead.id);
                                                            if (res.success) toast.success("Converted!");
                                                            else toast.error("Failed");
                                                            setLoadingId(null);
                                                            router.refresh();
                                                        }
                                                    }}
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                    Send to Deals
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center text-muted-foreground font-medium bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
                        No leads found matching your filters.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="h-12 px-5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={`cursor-pointer transition-colors border-border/40 group relative ${
                                        !(row.original as any).isViewed 
                                        ? "bg-red-50/40 hover:bg-red-100/50 dark:bg-red-900/10 dark:hover:bg-red-900/20" 
                                        : "hover:bg-muted/30"
                                    }`}
                                    onClick={async () => {
                                        setSelectedLead(row.original as any);
                                        if (!(row.original as any).isViewed) {
                                            await markLeadAsViewed(row.original.id);
                                            router.refresh();
                                        }
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-5 py-3.5 text-[13px] whitespace-nowrap align-middle">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground font-medium">
                                    No records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {/* Overhauled Responsive Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                    Showing <span className="text-foreground font-bold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-bold">{filteredData.length}</span> leads.
                </div>
                
                <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden xs:block">Rows</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => table.setPageSize(Number(value))}
                        >
                            <SelectTrigger className="h-8 w-[70px] bg-muted/50 border-border/50 font-bold text-xs ring-0 focus:ring-0">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top" className="border-border shadow-xl">
                                {[15, 30, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs font-medium">
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-center text-xs font-bold min-w-[90px] whitespace-nowrap bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                        Page {table.getState().pagination.pageIndex + 1} <span className="text-muted-foreground font-light mx-1.5">of</span> {table.getPageCount() || 1}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-none"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Previous page</span>
                            <span className="text-lg font-light leading-none mb-0.5">‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-none"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Next page</span>
                            <span className="text-lg font-light leading-none mb-0.5">›</span>
                        </Button>
                    </div>
                </div>
            </div>

            <LeadSheet
                lead={selectedLead}
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
            />
        </div>
    );
}

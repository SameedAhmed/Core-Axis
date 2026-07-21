"use client";

import { useState, useMemo } from "react";
// @ts-ignore
import { AuditLog } from "@/generated/prisma/client/client";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    FilterX,
    PlusCircle,
    Edit,
    Trash2,
    Upload,
    LogIn,
    Activity,
    ShieldAlert,
    Calendar,
    User as UserIcon,
    ArrowUpDown,
    ChevronUp,
    ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface AuditLogTableProps {
    data: any[];
}

export function AuditLogTable({ data }: AuditLogTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();
    const [sorting, setSorting] = useState<SortingState>([]);

    const getActionIcon = (action: string) => {
        switch (action) {
            case "CREATE": return <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />;
            case "UPDATE": return <Edit className="w-3.5 h-3.5 text-amber-500" />;
            case "DELETE":
            case "BULK_DELETE": return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
            case "BULK_IMPORT": return <Upload className="w-3.5 h-3.5 text-navy dark:text-blue-300" />;
            case "LOGIN": return <LogIn className="w-3.5 h-3.5 text-indigo-500" />;
            default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
        }
    };

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return data.filter((log) => {
            const matchesSearch =
                (log.details || "").toLowerCase().includes(query) ||
                (log.user?.name || "").toLowerCase().includes(query) ||
                (log.user?.email || "").toLowerCase().includes(query) ||
                (log.entityId || "").toLowerCase().includes(query);

            const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
            const matchesType = typeFilter === "ALL" || log.entityType === typeFilter;

            let matchesDate = true;
            if (dateRange?.from) {
                const logDate = new Date(log.createdAt);
                if (dateRange.to) {
                    matchesDate = isWithinInterval(logDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to)
                    });
                } else {
                    matchesDate = isWithinInterval(logDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.from)
                    });
                }
            }

            return matchesSearch && matchesAction && matchesType && matchesDate;
        });
    }, [data, searchQuery, actionFilter, typeFilter, dateRange]);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-bold uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Timestamp
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
            cell: ({ row }) => (
                <div className="flex flex-col min-w-[120px]">
                    <span className="text-foreground font-medium text-sm">
                        {format(new Date(row.original.createdAt), "MMM d, yyyy")}
                    </span>
                    <span className="text-muted-foreground text-[10px] font-mono">
                        {format(new Date(row.original.createdAt), "HH:mm:ss")}
                    </span>
                </div>
            )
        },
        {
            accessorKey: "user",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-bold uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        User
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
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border">
                        {row.original.user.name?.charAt(0) || row.original.user.email?.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                            {row.original.user.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {row.original.user.email}
                        </span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: "action",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-bold uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Action
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
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    {getActionIcon(row.original.action)}
                    <Badge variant="outline" className="text-[10px] font-bold tracking-tight py-0 px-1.5 h-5 uppercase">
                        {row.original.action.replace("_", " ")}
                    </Badge>
                </div>
            )
        },
        {
            accessorKey: "entityType",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-[11px] font-bold uppercase tracking-wider p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Module
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
            cell: ({ row }) => (
                <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-bold h-5">
                    {row.original.entityType}
                </Badge>
            )
        },
        {
            accessorKey: "details",
            header: "Record / Details",
            cell: ({ row }) => (
                <div className="max-w-[300px]">
                    <p className="text-sm text-foreground line-clamp-1 italic">
                        {row.original.details}
                    </p>
                    {row.original.entityId && (
                        <span className="text-[9px] font-mono text-muted-foreground/50">
                            ID: {row.original.entityId.substring(0, 12)}...
                        </span>
                    )}
                </div>
            )
        }
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
                pageSize: 15,
            },
            sorting: [
                { id: "createdAt", desc: true }
            ]
        },
    });

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto flex-1">
                    <div className="relative w-full md:w-[300px] lg:w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs by user, detail, or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted/50 border-border focus:bg-background h-10 rounded-xl text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-left">
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-full sm:w-[130px] bg-muted/50 border-border h-10 rounded-xl text-[10px] sm:text-xs font-semibold uppercase">
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                <SelectItem value="CREATE">Create</SelectItem>
                                <SelectItem value="UPDATE">Update</SelectItem>
                                <SelectItem value="DELETE">Delete</SelectItem>
                                <SelectItem value="BULK_IMPORT">Import</SelectItem>
                                <SelectItem value="BULK_DELETE">Bulk Delete</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[130px] bg-muted/50 border-border h-10 rounded-xl text-[10px] sm:text-xs font-semibold uppercase">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Modules</SelectItem>
                                <SelectItem value="LEAD">Lead</SelectItem>
                                <SelectItem value="ORGANIZATION">Organization</SelectItem>
                                <SelectItem value="DEAL">Deal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {(searchQuery || actionFilter !== "ALL" || typeFilter !== "ALL" || dateRange) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchQuery("");
                                setActionFilter("ALL");
                                setTypeFilter("ALL");
                                setDateRange(undefined);
                            }}
                            className="bg-muted hover:bg-muted/80 h-10 w-10 border border-border shrink-0 hidden sm:flex"
                        >
                            <FilterX className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto no-scrollbar">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider h-10 py-0 min-w-[100px]">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors border-border/50">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ShieldAlert className="w-8 h-8 opacity-20" />
                                        <p className="text-sm font-medium">No audit logs match your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Overhauled Responsive Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                    Showing <span className="text-foreground font-bold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-bold">{filteredData.length}</span> audit logs.
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
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Previous page</span>
                            <span className="text-lg font-light leading-none mb-0.5">‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Next page</span>
                            <span className="text-lg font-light leading-none mb-0.5">›</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

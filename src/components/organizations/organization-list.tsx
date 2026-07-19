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
import { Organization, Lead } from "@/generated/prisma/client/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, ShieldAlert, ExternalLink, Globe, Calendar, Search, FilterX, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { deleteOrganization, deleteOrganizations } from "@/lib/actions/organizations";
import { EditOrgDialog } from "./edit-org-dialog";
import { OrganizationSheet } from "./organization-sheet";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

export type OrganizationWithLeads = Organization & { leads: Lead[] };

interface OrganizationListProps {
    data: OrganizationWithLeads[];
}

export function OrganizationList({ data }: OrganizationListProps) {
    const { data: session } = useSession();
    const { confirm } = useConfirm();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetOrg, setSheetOrg] = useState<OrganizationWithLeads | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);

    // --- Filter States ---
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return data.filter((org) => {
            const matchesSearch =
                (org.name || "").toLowerCase().includes(query) ||
                (org.website || "").toLowerCase().includes(query);

            let matchesDate = true;
            if (dateRange?.from) {
                const orgDate = new Date(org.createdAt);
                if (dateRange.to) {
                    matchesDate = isWithinInterval(orgDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to)
                    });
                } else {
                    matchesDate = isWithinInterval(orgDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.from)
                    });
                }
            }

            return matchesSearch && matchesDate;
        });
    }, [data, searchQuery, dateRange]);

    const toggleAll = () => {
        if (selectedIds.size === filteredData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map(org => org.id)));
        }
    };

    const toggleOrg = (id: string) => {
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
            title: "Delete Organizations",
            description: `Are you sure you want to delete ${selectedIds.size} organizations? This cannot be undone.`,
            variant: "destructive",
            confirmText: "Delete All"
        });
        if (!isConfirmed) return;

        setLoadingId("bulk_delete");
        const res = await deleteOrganizations(Array.from(selectedIds));
        if (res.success) {
            setSelectedIds(new Set());
            toast.success("Organizations deleted successfully.");
        } else {
            toast.error(res.error || "Failed to delete organizations.");
        }
        setLoadingId(null);
    };

    const columns: ColumnDef<OrganizationWithLeads>[] = [
        {
            id: "select",
            header: () => (
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
                    onCheckedChange={() => toggleOrg(row.original.id)}
                    aria-label="Select row"
                    className="translate-y-[2px] border-border"
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-foreground font-semibold p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Organization Name
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
                <div className="font-semibold text-foreground">{row.original.name}</div>
            )
        },
        {
            accessorKey: "website",
            header: "Website",
            cell: ({ row }) => {
                const website = row.original.website;
                if (!website) return <span className="text-muted-foreground text-xs italic">Not set</span>;
                return (
                    <a
                        href={website.startsWith("http") ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1.5 text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        {website}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="text-foreground font-semibold p-0 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Added On
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
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const org = row.original;
                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <EditOrgDialog organization={org} />
                                {session?.user && (session.user as any).role === "ADMIN" && (
                                    <DropdownMenuItem
                                        className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                        onClick={async () => {
                                            const isConfirmed = await confirm({
                                                title: "Delete Organization",
                                                description: "Are you sure you want to delete this organization? This cannot be undone.",
                                                variant: "destructive",
                                                confirmText: "Delete"
                                            });
                                            if (isConfirmed) {
                                                setLoadingId(`delete_${org.id}`);
                                                const res = await deleteOrganization(org.id);
                                                if (res.success) {
                                                    toast.success("Organization deleted successfully.");
                                                } else {
                                                    toast.error(res.error || "Failed to delete organization.");
                                                }
                                                setLoadingId(null);
                                            }
                                        }}
                                        disabled={loadingId === `delete_${org.id}`}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {loadingId === `delete_${org.id}` ? "Deleting..." : "Delete"}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
        <div className="flex flex-col gap-4 text-left">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div className="relative flex-1 w-full md:max-w-md text-left">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search companies by name or website..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted/50 border-border focus:bg-background transition-all h-10 rounded-xl text-left text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {(searchQuery || dateRange) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchQuery("");
                                setDateRange(undefined);
                            }}
                            className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 hidden sm:flex border border-border"
                            title="Clear filters"
                        >
                            <FilterX className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="p-3 bg-primary text-primary-foreground rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-xl border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-md">
                            <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium">
                            <span className="font-bold text-indigo-400">{selectedIds.size}</span> organizations selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Deselect
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

            <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border bg-card shadow-sm overflow-x-auto no-scrollbar mb-2">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="font-semibold text-foreground border-b border-border/50 h-11">
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
                                    className="hover:bg-muted/50 group transition-colors border-border/50 cursor-pointer"
                                    onClick={() => {
                                        setSheetOrg(row.original);
                                        setSheetOpen(true);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No organizations found.
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
                    Showing <span className="text-foreground font-bold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-bold">{filteredData.length}</span> organizations.
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

            {/* View Details Sheet */}
            <OrganizationSheet 
                organization={sheetOrg} 
                open={sheetOpen} 
                onOpenChange={setSheetOpen} 
            />
        </div>
    );
}

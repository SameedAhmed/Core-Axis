"use client";

import { useState } from "react";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { DealStage } from "@/generated/prisma/client/client";
import { formatDistanceToNow } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DealSheet } from "./deal-sheet";
import { EditDealDialog } from "./edit-deal-dialog";
import { deleteDeal } from "@/lib/actions/deals";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

type EnhancedDeal = {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    customStage?: string | null;
    organization?: { name: string } | null;
    updatedAt: Date;
    createdAt: Date;
};

interface DealListProps {
    data: EnhancedDeal[];
    effectiveRole: string;
    organizations: { id: string; name: string }[];
    dealStages: any;
}

export function DealList({ data, effectiveRole, organizations, dealStages }: DealListProps) {
    const { confirm } = useConfirm();
    const router = useRouter();
    const [selectedDeal, setSelectedDeal] = useState<EnhancedDeal | null>(null);
    const [editingDeal, setEditingDeal] = useState<EnhancedDeal | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleDelete = async (id: string, title: string) => {
        const isConfirmed = await confirm({
            title: "Delete Deal",
            description: `Are you sure you want to permanently delete "${title}"?`,
            variant: "destructive",
            confirmText: "Delete" // Using standard red since this is destructive
        });
        if (!isConfirmed) return;
        setIsDeleting(id);
        const res = await deleteDeal(id);
        if (res.success) {
            toast.success("Deal deleted.");
            router.refresh();
        }
        else toast.error("Failed to delete deal.");
        setIsDeleting(null);
    };

    const columns: ColumnDef<EnhancedDeal>[] = [
        {
            accessorKey: "title",
            header: "Deal Name",
            cell: ({ row }) => (
                <div className="font-medium text-foreground">{row.getValue("title")}</div>
            ),
        },
        {
            accessorKey: "organization",
            header: "Organization",
            cell: ({ row }) => {
                const org = row.original.organization;
                if (!org) return <span className="text-muted-foreground text-sm">--</span>;
                return (
                    <div className="flex items-center gap-1.5 text-foreground text-sm">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {org.name}
                    </div>
                );
            },
        },
        {
            accessorKey: "value",
            header: "Value",
            cell: ({ row }) => {
                const value = row.getValue("value") as number;
                return <div className="font-semibold text-foreground">${value.toLocaleString()}</div>;
            },
        },
        {
            accessorKey: "stage",
            header: "Stage",
            cell: ({ row }) => {
                const deal = row.original;
                const stageValue = deal.customStage || deal.stage;
                
                const stagesConfig = dealStages || [
                    { id: "s1", value: "QUALIFICATION", label: "New Lead", color: "slate" },
                    { id: "s2", value: "PROPOSAL", label: "Contacted", color: "blue" },
                    { id: "s3", value: "NEGOTIATION", label: "Negotiation", color: "amber" },
                    { id: "s4", value: "WON", label: "Closed Won", color: "indigo" },
                    { id: "s5", value: "LOST", label: "Closed Lost", color: "red" }
                ];

                const currentStage = stagesConfig.find((s: any) => s.value === stageValue);
                const label = currentStage?.label || stageValue;
                const color = currentStage?.color || "slate";

                const getColorClass = (c: string) => {
                    switch (c) {
                        case "blue": return "bg-blue-500/10 text-blue-600";
                        case "amber": return "bg-amber-500/10 text-amber-600";
                        case "indigo": return "bg-indigo-500/10 text-indigo-600";
                        case "red": return "bg-red-500/10 text-red-600";
                        case "purple": return "bg-purple-500/10 text-purple-600";
                        case "pink": return "bg-pink-500/10 text-pink-600";
                        default: return "bg-slate-500/10 text-slate-600";
                    }
                };

                return (
                    <Badge variant="outline" className={`${getColorClass(color)} border-0 shadow-none font-bold text-[10px] uppercase tracking-wider`}>
                        {label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "updatedAt",
            header: "Last Updated",
            cell: ({ row }) => {
                const date = row.getValue("updatedAt") as Date;
                return <div className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(date), { addSuffix: true })}</div>;
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const deal = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {effectiveRole === "ADMIN" ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}>
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingDeal(deal); }}>
                                        <Pencil className="w-4 h-4 mr-2" /> Edit Deal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(deal.id, deal.title); }}
                                        disabled={isDeleting === deal.id}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Deal
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}
                                className="text-primary hover:text-primary/80 hover:bg-primary/5"
                            >
                                <Eye className="w-4 h-4 mr-1.5" />
                                View
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    const activeData = data.filter((d) => !d.customStage);

    const table = useReactTable({
        data: activeData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 15,
            },
        },
    });

    return (
        <>
            <div className="flex flex-col space-y-4">
                <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto no-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/80">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
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
                                        className="group hover:bg-muted/50 cursor-pointer"
                                        onClick={() => setSelectedDeal(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                        No deals found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Overhauled Responsive Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border/50">
                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                        Showing <span className="text-foreground font-bold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-bold">{activeData.length}</span> active deals.
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
            </div>

            <DealSheet
                deal={selectedDeal}
                isOpen={!!selectedDeal}
                onClose={() => setSelectedDeal(null)}
                effectiveRole={effectiveRole}
                dealStages={dealStages}
            />

            {editingDeal && (
                <EditDealDialog
                    deal={editingDeal}
                    organizations={organizations}
                    dealStages={dealStages}
                    open={!!editingDeal}
                    onOpenChange={(open) => !open && setEditingDeal(null)}
                />
            )}
        </>
    );
}

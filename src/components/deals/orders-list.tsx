"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Search, FilterX, ArrowUpAz, ArrowDownAz, CalendarDays, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DealSheet } from "./deal-sheet";

interface OrdersListProps {
    onboardedDeals: any[];
    effectiveRole: string;
    dealStages: any;
}

export function OrdersList({ onboardedDeals, effectiveRole, dealStages }: OrdersListProps) {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(15);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedDeal, setSelectedDeal] = useState<any | null>(null);

    const filteredAndSorted = onboardedDeals
        .filter(deal => 
            deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            deal.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === "value_high") return Number(b.value) - Number(a.value);
            if (sortBy === "value_low") return Number(a.value) - Number(b.value);
            if (sortBy === "title") return a.title.localeCompare(b.title);
            return 0;
        });

    const pageCount = Math.ceil(filteredAndSorted.length / pageSize);
    const paginatedDeals = filteredAndSorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search onboarded deals by title or company..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPageIndex(0);
                        }}
                        className="pl-10 bg-muted border-border focus:bg-background transition-all h-10 rounded-lg"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={sortBy} onValueChange={(val) => {
                        setSortBy(val);
                        setPageIndex(0);
                    }}>
                        <SelectTrigger className="w-full md:w-[160px] bg-muted border-border h-10 rounded-lg font-medium">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="value_high">Highest Value</SelectItem>
                            <SelectItem value="value_low">Lowest Value</SelectItem>
                            <SelectItem value="title">Alphabetical</SelectItem>
                        </SelectContent>
                    </Select>

                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchQuery("");
                                setPageIndex(0);
                            }}
                            className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0"
                        >
                            <FilterX className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
                {onboardedDeals.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="w-16 h-16 mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-bold text-foreground mb-2">No Active Orders</h3>
                        <p className="text-sm max-w-xs">When you confirm an order on a closed-win deal, it will securely move here so you can keep track of fulfillment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {paginatedDeals.map((deal) => (
                            <div 
                                key={deal.id} 
                                onClick={() => setSelectedDeal(deal)}
                                className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-foreground">{deal.title}</h3>
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-xs font-bold tracking-wider uppercase">
                                            Order Confirmed
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        {deal.organization && (
                                            <span className="font-medium text-foreground">{deal.organization.name}</span>
                                        )}
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded bg-indigo-500/5">
                                            ${Number(deal.value).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border shadow-sm">
                                        <Avatar className="w-7 h-7 border-2 border-background shadow-sm">
                                            <AvatarFallback className="bg-navy/10 text-navy text-xs font-bold">
                                                {deal.owner?.name?.substring(0,2).toUpperCase() || "UN"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground leading-tight">{deal.owner?.name || "Unassigned"}</span>
                                            <span className="text-[10px] text-muted-foreground leading-tight uppercase font-medium">Sales Rep</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {/* Overhauled Responsive Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                    Showing <span className="text-foreground font-bold">{paginatedDeals.length}</span> of <span className="text-foreground font-bold">{filteredAndSorted.length}</span> onboarded deals.
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
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                            disabled={pageIndex === 0}
                        >
                            <span className="sr-only">Previous page</span>
                            <span className="text-lg font-light leading-none mb-0.5">‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
                            disabled={pageIndex >= pageCount - 1}
                        >
                            <span className="sr-only">Next page</span>
                            <span className="text-lg font-light leading-none mb-0.5">›</span>
                        </Button>
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
        </div>
    );
}

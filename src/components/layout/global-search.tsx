"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { Search, Users, Briefcase, Building2, Terminal } from "lucide-react";
import { globalSearch } from "@/lib/actions/search";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        leads: any[];
        deals: any[];
        organizations: any[];
    }>({ leads: [], deals: [], organizations: [] });
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults({ leads: [], deals: [], organizations: [] });
            return;
        }
        setLoading(true);
        const timer = setTimeout(async () => {
            const data = await globalSearch(query);
            setResults(data);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="w-full max-w-md relative group">
            {/* Desktop Trigger */}
            <div
                onClick={() => setOpen(true)}
                className="hidden sm:flex cursor-pointer w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all items-center justify-between group shadow-sm active:scale-[0.98]"
            >
                <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-muted-foreground font-medium">Search anything...</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border/60 text-[10px] font-black text-muted-foreground shadow-sm uppercase tracking-wider">
                    <span className="opacity-50">Ctrl</span> K
                </div>
            </div>

            {/* Mobile Trigger (Icon Only) */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="sm:hidden h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5"
            >
                <Search className="h-5 w-5" />
            </Button>

            {/* Render CMDK inside our own styled dialog overlay using Portal so it escapes TopBar clipping */}
            {open && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[100] bg-[#0d1b4b]/40 backdrop-blur-md transition-all duration-300 animate-in fade-in" onClick={() => setOpen(false)}>
                    <div
                        className="fixed left-[50%] top-[10vh] sm:top-[12vh] z-[101] max-w-[90vw] sm:max-w-[640px] w-full translate-x-[-50%] overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_64px_-12px_rgba(13,27,75,0.4)] animate-in zoom-in-95 slide-in-from-top-4 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Command
                            className="flex h-full w-full flex-col bg-card/95 backdrop-blur-xl"
                            shouldFilter={false} // Since we do server filtering
                            label="Global Command Menu"
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setOpen(false);
                            }}
                        >
                            <div className="flex items-center border-b border-border/50 px-4">
                                <Search className="mr-3 h-4 w-4 shrink-0 opacity-50 text-foreground" />
                                <Command.Input
                                    autoFocus
                                    placeholder="Search everything..."
                                    value={query}
                                    onValueChange={setQuery}
                                    className="flex h-12 sm:h-14 w-full rounded-md bg-transparent py-3 text-[15px] sm:text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                />
                                {loading && (
                                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin ml-2"></div>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="sm:hidden ml-2 px-2 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                            </div>

                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                                {!loading && results.leads.length === 0 && results.deals.length === 0 && results.organizations.length === 0 && query.length >= 2 && (
                                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                                        No results found for "{query}".
                                    </Command.Empty>
                                )}

                                {results.leads.length > 0 && (
                                    <Command.Group heading={<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Leads</span>} className="mt-2 mb-3">
                                        {results.leads.map((lead) => (
                                            <Command.Item
                                                key={`lead-${lead.id}`}
                                                value={`lead-${lead.id}`}
                                                onSelect={() => {
                                                    setOpen(false);
                                                    router.push("/dashboard/leads");
                                                }}
                                                className={cn(
                                                    "relative flex cursor-default select-none items-center rounded-xl px-3 py-3 text-xs sm:text-sm outline-none m-1",
                                                    "aria-selected:bg-primary/10 aria-selected:text-primary hover:bg-muted transition-all duration-200"
                                                )}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 group-aria-selected:bg-primary/20 flex items-center justify-center mr-3 shrink-0">
                                                    <Users className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{lead.firstName} {lead.lastName}</span>
                                                    {lead.email && <span className="text-[10px] text-muted-foreground font-medium">{lead.email}</span>}
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {results.deals.length > 0 && (
                                    <Command.Group heading={<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Deals</span>} className="mb-3">
                                        {results.deals.map((deal) => (
                                            <Command.Item
                                                key={`deal-${deal.id}`}
                                                value={`deal-${deal.id}`}
                                                onSelect={() => {
                                                    setOpen(false);
                                                    router.push("/dashboard/deals");
                                                }}
                                                className={cn(
                                                    "relative flex cursor-default select-none items-center rounded-xl px-3 py-3 text-xs sm:text-sm outline-none m-1",
                                                    "aria-selected:bg-primary/10 aria-selected:text-primary hover:bg-muted transition-all duration-200"
                                                )}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3 shrink-0">
                                                    <Briefcase className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{deal.title}</span>
                                                    <span className="text-[10px] text-primary/70 font-black uppercase tracking-widest">${deal.value}</span>
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {results.organizations.length > 0 && (
                                    <Command.Group heading={<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Organizations</span>}>
                                        {results.organizations.map((org) => (
                                            <Command.Item
                                                key={`org-${org.id}`}
                                                value={`org-${org.id}`}
                                                onSelect={() => {
                                                    setOpen(false);
                                                    router.push("/dashboard/organizations");
                                                }}
                                                className={cn(
                                                    "relative flex cursor-default select-none items-center rounded-xl px-3 py-3 text-xs sm:text-sm outline-none",
                                                    "aria-selected:bg-muted aria-selected:text-foreground hover:bg-muted transition-colors"
                                                )}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mr-3 shrink-0">
                                                    <Building2 className="h-4 w-4 text-purple-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{org.name}</span>
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}
                            </Command.List>
                            <div className="flex items-center justify-between gap-1 p-2.5 border-t border-border/50 bg-muted/20">
                                <div className="flex items-center gap-1">
                                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-bold uppercase shrink-0">
                                        <kbd className="px-1.5 py-0.5 bg-muted border border-border shadow-sm rounded-sm font-sans">↑</kbd>
                                        <kbd className="px-1.5 py-0.5 bg-muted border border-border shadow-sm rounded-sm font-sans mr-1">↓</kbd>
                                        Navigate
                                    </span>
                                </div>
                                <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase">
                                    <kbd className="px-1.5 py-0.5 bg-muted border border-border shadow-sm rounded-sm font-sans">ESC</kbd>
                                    Close
                                </span>
                            </div>
                        </Command>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

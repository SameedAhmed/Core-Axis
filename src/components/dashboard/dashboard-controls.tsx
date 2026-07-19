"use client";

import { ChevronDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PERIOD_OPTIONS = [
    { label: "3 Months", value: "3m" },
    { label: "6 Months", value: "6m" },
    { label: "Annual",   value: "12m" },
];

export function DashboardControls() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = searchParams.get("period") || "6m";
    const selected = PERIOD_OPTIONS.find(o => o.value === current) || PERIOD_OPTIONS[2];

    function setPeriod(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", value);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex items-center gap-3">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-card/90 backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-border/50 font-semibold h-9 px-4 text-foreground hover:bg-muted hover:border-border transition-all rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98]">
                        <CalendarDays className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        {selected.label}
                        <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-2xl border-border/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-[14px] p-1.5 animate-in zoom-in-95 duration-200">
                    {PERIOD_OPTIONS.map((option) => {
                        const isSelected = option.value === current;
                        return (
                            <DropdownMenuItem
                                key={option.value}
                                onClick={() => setPeriod(option.value)}
                                className={`rounded-[10px] cursor-pointer px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out mb-0.5 last:mb-0 ${isSelected
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <span className="flex-1">{option.label}</span>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

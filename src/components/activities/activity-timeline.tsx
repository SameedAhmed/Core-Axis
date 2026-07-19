"use client";

import { useState, useMemo } from "react";
import { Activity, Lead, Deal } from "@/generated/prisma/client/client";
import { Mail, Phone, Calendar, PenLine, FilterX } from "lucide-react";

import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type EnhancedActivity = Activity & {
    lead?: Lead | null;
    deal?: Deal | null;
    user: { name: string | null };
};

interface ActivityTimelineProps {
    activities: EnhancedActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(15);

    const filteredActivities = useMemo(() => {
        return activities.filter((activity) => {
            const matchesType = typeFilter === "ALL" || activity.type === typeFilter;

            let matchesDate = true;
            if (dateRange?.from) {
                const activityDate = new Date(activity.createdAt);
                if (dateRange.to) {
                    matchesDate = isWithinInterval(activityDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to)
                    });
                } else {
                    matchesDate = isWithinInterval(activityDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.from)
                    });
                }
            }

            return matchesType && matchesDate;
        });
    }, [activities, typeFilter, dateRange]);

    const pageCount = Math.ceil(filteredActivities.length / pageSize);
    const paginatedActivities = filteredActivities.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-border border-dashed">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-medium">No Activity Yet</h3>
                <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
                    Keep track of calls, meetings, notes, and emails here to build a detailed history.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 mt-6">
            <div className="flex flex-col gap-3 items-center bg-card p-3 sm:p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
                <div className="flex flex-wrap items-center gap-2 w-full">
                    <div className="flex-1 sm:w-[180px]">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full bg-muted border-border h-10 rounded-lg font-medium text-foreground text-xs sm:text-sm">
                                <SelectValue placeholder="Activity Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Activities</SelectItem>
                                <SelectItem value="CALL">Calls</SelectItem>
                                <SelectItem value="EMAIL">Emails</SelectItem>
                                <SelectItem value="MEETING">Meetings</SelectItem>
                                <SelectItem value="NOTE">Notes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:flex-none">
                        <div className="flex-1 sm:w-auto">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>

                        {(typeFilter !== "ALL" || dateRange) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setTypeFilter("ALL");
                                    setDateRange(undefined);
                                    setPageIndex(0);
                                }}
                                className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 border border-border bg-muted rounded-lg"
                                title="Clear filters"
                            >
                                <FilterX className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/10 rounded-xl border border-border border-dashed text-center">
                    <p className="text-muted-foreground text-sm">No activities match your filters.</p>
                </div>
            ) : (
                <div className="pl-4 border-l border-border ml-4 space-y-8 pr-4 pb-10">
                    {paginatedActivities.map((activity) => {
                        let Icon = PenLine;
                        let bgClass = "bg-muted text-muted-foreground";

                        if (activity.type === "CALL") {
                            Icon = Phone;
                            bgClass = "bg-green-100 text-green-600";
                        } else if (activity.type === "EMAIL") {
                            Icon = Mail;
                            bgClass = "bg-blue-100 text-blue-600";
                        } else if (activity.type === "MEETING") {
                            Icon = Calendar;
                            bgClass = "bg-purple-100 text-purple-600";
                        }

                        return (
                            <div key={activity.id} className="relative">
                                <span className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-background ring-1 ring-border ${bgClass}`}>
                                    <Icon className="w-4 h-4" />
                                </span>

                                <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-semibold text-foreground capitalize text-sm">
                                                {activity.type.toLowerCase()}
                                            </span>
                                            <span className="text-muted-foreground text-sm ml-2">by {activity.user.name || 'Unknown'}</span>
                                        </div>
                                        <time className="text-xs text-muted-foreground font-medium">
                                            {new Date(activity.createdAt).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </time>
                                    </div>

                                    <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                                        {activity.notes}
                                    </p>

                                    {(activity.lead || activity.deal) && (
                                        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                                            {activity.lead && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground">
                                                    Lead: {activity.lead.firstName} {activity.lead.lastName}
                                                </span>
                                            )}
                                            {activity.deal && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground">
                                                    Deal: {activity.deal.title}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {/* Overhauled Responsive Pagination */}
            {filteredActivities.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 bg-card rounded-b-xl border border-border border-t-0 -mt-6">
                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                        Showing <span className="text-foreground font-bold">{paginatedActivities.length}</span> of <span className="text-foreground font-bold">{filteredActivities.length}</span> activities.
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
                                disabled={pageIndex === 0}
                            >
                                <span className="sr-only">Previous page</span>
                                <span className="text-lg font-light leading-none mb-0.5">‹</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-none"
                                onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
                                disabled={pageIndex >= pageCount - 1}
                            >
                                <span className="sr-only">Next page</span>
                                <span className="text-lg font-light leading-none mb-0.5">›</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

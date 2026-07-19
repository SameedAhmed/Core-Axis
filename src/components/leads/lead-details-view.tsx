"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Clock, CheckCircle2, Phone, Mail, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getLeadActivities, createActivity } from "@/lib/actions/activities";
import { formatDistanceToNow } from "date-fns";
import { Lead } from "@/generated/prisma/client/client";

export function LeadDetailsView({
    lead
}: {
    lead: (Lead & { 
        organization?: any;
        owner?: { name: string | null; email: string | null; } | null;
        createdBy?: { name: string | null; email: string | null; } | null;
    });
}) {
    const [activities, setActivities] = useState<any[]>([]);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    useEffect(() => {
        if (lead) {
            fetchActivities();
        }
    }, [lead]);

    const fetchActivities = async () => {
        setActivitiesLoading(true);
        const res = await getLeadActivities(lead.id);
        if (res.success && res.data) {
            setActivities(res.data);
        }
        setActivitiesLoading(false);
    };

    const handleSaveNote = async () => {
        if (!note.trim()) return;
        setLoading(true);
        const res = await createActivity({
            type: "NOTE",
            notes: note,
            leadId: lead.id
        });
        if (res.success) {
            setNote("");
            fetchActivities();
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col md:flex-row bg-muted/30 h-full w-full">
            <div className="flex-1 bg-card p-6 shadow-sm z-10 overflow-y-auto">
                <div className="pb-6 border-b border-border/50">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{lead.firstName} {lead.lastName}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20">
                            {lead.status === "CONVERTED" ? "IN SALES PIPELINE" : lead.status.replace("_", " ")}
                        </span>
                        {(lead as any).organization && (
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> {(lead as any).organization.name}
                            </span>
                        )}
                    </div>
                </div>
                <div className="py-6 space-y-6">
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h4>
                        <div className="flex flex-col gap-3">
                            {lead.email && (
                                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                                    <div className="bg-primary/10 p-2 rounded-md">
                                        <Mail className="w-4 h-4 text-primary" />
                                    </div>
                                    {lead.email}
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                                    <div className="bg-primary/10 p-2 rounded-md">
                                        <Phone className="w-4 h-4 text-primary" />
                                    </div>
                                    {lead.phone}
                                </div>
                            )}
                            {lead.location && (
                                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                                    <div className="bg-primary/10 p-2 rounded-md">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    {lead.location}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Service</p>
                                <p className="text-sm font-semibold text-foreground">{(lead as any).service || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Quotation</p>
                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    ${Number((lead as any).quotation || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Remarks</p>
                                <p className="text-sm text-foreground italic border-l-2 border-primary/20 pl-3 py-1 bg-muted/20 rounded-r-md">
                                    {(lead as any).remarks || "No specific remarks."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment Details</h4>
                    <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border border-border mt-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Assigned To (Owner)</span>
                            <div className="flex items-center gap-3 mt-1">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs ring-1 ring-primary/20">
                                        {lead.owner?.name?.substring(0, 2).toUpperCase() || "UN"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground">{lead.owner?.name || "Unassigned"}</span>
                                    <span className="text-[10px] text-muted-foreground">{lead.owner?.email || "-"}</span>
                                </div>
                            </div>
                        </div>
                        
                        {lead.createdBy ? (
                            <div className="flex flex-col gap-1 pt-3 border-t border-border/50">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Created By</span>
                                <div className="flex items-center gap-3 mt-1">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="bg-muted text-muted-foreground font-bold text-[9px] ring-1 ring-border">
                                            {lead.createdBy.name?.substring(0, 2).toUpperCase() || "UN"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-semibold text-foreground">{lead.createdBy.name || lead.createdBy.email}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 pt-3 border-t border-border/50">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Created By</span>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center ring-1 ring-blue-200">
                                        <span className="text-[10px] font-bold text-blue-600">SYS</span>
                                    </div>
                                    <span className="text-xs font-bold text-blue-600">System Integration</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Right Side - Activities Feed */}
            <div className="w-full md:w-[360px] flex flex-col bg-muted/20 border-l border-border h-full">
                {/* Quick Input Box */}
                <div className="p-4 border-b border-border bg-card shadow-sm z-10 sticky top-0">
                    <div className="flex items-center gap-2 mb-3">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex-1 bg-background text-foreground text-[10px] uppercase font-bold"><Phone className="w-3 h-3 mr-1" /> Log Call</Button>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex-1 bg-background text-foreground text-[10px] uppercase font-bold"><Mail className="w-3 h-3 mr-1" /> Log Email</Button>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex-1 bg-background text-foreground text-[10px] uppercase font-bold"><CheckCircle2 className="w-3 h-3 mr-1" /> Task</Button>
                    </div>
                    <Textarea
                        placeholder="Take a note..."
                        className="min-h-[80px] text-sm resize-none focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm border-border bg-background"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <FileText className="w-3 h-3" /> Note taking
                        </span>
                        <Button size="sm" onClick={handleSaveNote} disabled={loading || !note.trim()}>
                            {loading ? "Saving..." : "Save Note"}
                        </Button>
                    </div>
                </div>

                {/* Infinite Scroll Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {activitiesLoading ? (
                        <div className="text-center text-sm text-muted-foreground mt-10">Loading activities...</div>
                    ) : activities.length > 0 ? (
                        activities.map((activity) => (
                            <div key={activity.id} className="relative pl-6 pb-2">
                                <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-border last-of-type:hidden" />
                                <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-blue-500/10 border-2 border-background flex items-center justify-center shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                </div>
                                <div className="bg-card p-3 rounded-lg border border-border shadow-sm ml-2 relative">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                            {activity.user?.name || "User"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mb-1">
                                        {activity.type === "NOTE" ? "left a note" : `logged a ${activity.type.toLowerCase()}`}
                                    </div>
                                    {activity.notes && (
                                        <div className="mt-2 text-sm text-foreground bg-muted border border-border p-2.5 rounded-md leading-relaxed whitespace-pre-wrap">
                                            {activity.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground mt-10 flex flex-col items-center">
                            <div className="bg-card p-3 rounded-full shadow-sm border border-border mb-3">
                                <FileText className="w-5 h-5 text-muted-foreground/50" />
                            </div>
                            No activities yet. <br /> Log a note to get started!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

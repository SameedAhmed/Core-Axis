"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, UserCircle2, Clock, CheckCircle2, Phone, Mail, FileText, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDealActivities, createActivity } from "@/lib/actions/activities";
import { updateDealValue } from "@/lib/actions/deals";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { DealStage } from "@/generated/prisma/client/client";

type EnhancedDeal = {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    customStage?: string | null;
    organization?: { name: string } | null;
    updatedAt: Date;
};

export function DealDetailsView({
    deal,
    dealStages,
    onValueUpdate
}: {
    deal: EnhancedDeal;
    dealStages?: any;
    onValueUpdate?: (newValue: number) => void;
}) {
    const [activities, setActivities] = useState<any[]>([]);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [isEditingValue, setIsEditingValue] = useState(false);
    const [editValue, setEditValue] = useState("");
    const [isSavingValue, setIsSavingValue] = useState(false);

    useEffect(() => {
        if (deal) {
            fetchActivities();
        }
    }, [deal]);

    const fetchActivities = async () => {
        setActivitiesLoading(true);
        const res = await getDealActivities(deal.id);
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
            dealId: deal.id
        });
        if (res.success) {
            setNote("");
            fetchActivities();
        }
        setLoading(false);
    };

    const handleSaveValue = async () => {
        const numVal = parseFloat(editValue);
        if (isNaN(numVal) || numVal < 0) {
            toast.error("Please enter a valid positive number");
            return;
        }

        setIsSavingValue(true);
        const res = await updateDealValue(deal.id, numVal);
        if (res.success) {
            toast.success("Pipeline value updated!");
            setIsEditingValue(false);
            if (onValueUpdate) onValueUpdate(numVal);
        } else {
            toast.error(res.error || "Failed to update value");
        }
        setIsSavingValue(false);
    };

    return (
        <div className="flex flex-col md:flex-row bg-muted/30 h-full w-full">
            <div className="flex-1 bg-card p-6 shadow-sm z-10 overflow-y-auto">
                <div className="pb-6 border-b border-border/50">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{deal.title}</h2>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20 uppercase tracking-wider">
                            {(() => {
                                const stageValue = deal.customStage || deal.stage;
                                const stagesConfig = dealStages || [
                                    { value: "QUALIFICATION", label: "New Lead" },
                                    { value: "PROPOSAL", label: "Contacted" },
                                    { value: "NEGOTIATION", label: "Negotiation" },
                                    { value: "WON", label: "Closed Won" },
                                    { value: "LOST", label: "Closed Lost" }
                                ];
                                const currentStage = stagesConfig.find((s: any) => s.value === stageValue);
                                return currentStage?.label || stageValue.replace("_", " ");
                            })()}
                        </span>
                        
                        {isEditingValue ? (
                            <div className="flex items-center gap-1">
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                    <Input 
                                        type="number" 
                                        className="h-7 w-24 pl-5 text-xs focus-visible:ring-1 focus-visible:ring-primary/50 bg-background" 
                                        value={editValue} 
                                        onChange={(e) => setEditValue(e.target.value)} 
                                        autoFocus 
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveValue()}
                                    />
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10" onClick={handleSaveValue} disabled={isSavingValue}>
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => setIsEditingValue(false)} disabled={isSavingValue}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <span 
                                className="text-muted-foreground font-semibold flex items-center gap-1.5 transition-colors group px-1 py-0.5 rounded-sm text-sm cursor-pointer hover:text-foreground hover:bg-muted/50"
                                onClick={() => {
                                    setEditValue(deal.value.toString());
                                    setIsEditingValue(true);
                                }}
                            >
                                ${deal.value.toLocaleString()}
                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </span>
                        )}
                    </div>
                </div>
                <div className="py-6 space-y-6">
                    {deal.organization && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</h4>
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-md">
                                    <Building2 className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{deal.organization.name}</span>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Contact</h4>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted text-muted-foreground">
                                    <UserCircle2 className="w-4 h-4" />
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">Pending Assignment</span>
                        </div>
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

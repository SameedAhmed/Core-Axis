"use client";

import { useState } from "react";
import {
    Plus,
    ArrowRight,
    Zap,
    MessageCircle,
    Mail,
    MoreVertical,
    Clock,
    Play,
    Lock,
    Trash,
    UserPlus,
    Briefcase,
    Activity,
    Trophy,
    User as UserIcon,
    CheckSquare,
    ArrowRightCircle,
    Tag,
    Workflow,
    Search
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getEntitlements, PlanTier } from "@/lib/entitlements";
import { createAutomation, deleteAutomation, toggleAutomation } from "@/lib/actions/automations";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TRIGGERS = [
    { id: "LEAD_CREATED", label: "New Lead Created", icon: UserPlus },
    { id: "DEAL_CREATED", label: "New Deal Created", icon: Briefcase },
    { id: "LEAD_STATUS_CHANGED", label: "Lead Status Changed", icon: Activity },
    { id: "DEAL_WON", label: "Deal is Won", icon: Trophy },
];

const ACTIONS = [
    { id: "ASSIGN_OWNER", label: "Assign to Team Member", icon: UserIcon },
    { id: "SEND_EMAIL", label: "Send Automated Email", icon: Mail },
    { id: "SEND_WHATSAPP", label: "Send WhatsApp Notification", icon: MessageCircle },
    { id: "CREATE_TASK", label: "Create Action Task", icon: CheckSquare },
    { id: "UPDATE_STATUS", label: "Auto-Update Status", icon: ArrowRightCircle },
    { id: "ADD_TAG", label: "Add System Tag", icon: Tag },
];

import { useConfirm } from "@/components/providers/confirm-dialog-provider";

export function WorkflowBuilder({ 
    activeWorkspace, 
    automations = [], 
    planTier = "FREE" 
}: { 
    activeWorkspace?: any, 
    automations?: any[], 
    planTier?: PlanTier 
}) {
    const { confirm } = useConfirm();
    const entitlements = getEntitlements(planTier);

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [form, setForm] = useState({
        name: "",
        triggerType: "LEAD_CREATED",
        conditionField: "source", // simple key
        conditionValue: "", // simple val
        actionType: "ASSIGN_OWNER",
        
        // generic payload variables
        assigneeId: "",
        emailSubject: "",
        emailBody: "",
        taskTitle: "",
        targetStatus: "NEW",
        tagValue: ""
    });

    const members = activeWorkspace?.members || [];

    const handleCreate = async () => {
        if (!form.name || !form.triggerType || !form.actionType) {
            toast.error("Please fill in core details.");
            return;
        }

        let finalActionValue = "";
        if (form.actionType === "ASSIGN_OWNER") {
            if (!form.assigneeId) return toast.error("Select user to assign");
            finalActionValue = form.assigneeId; // Required for backwards compatibility with getDefaultLeadOwner
        } else if (form.actionType === "SEND_EMAIL") {
            if (!form.emailSubject) return toast.error("Set email subject");
            finalActionValue = JSON.stringify({ subject: form.emailSubject, body: form.emailBody });
        } else if (form.actionType === "CREATE_TASK") {
            if (!form.taskTitle) return toast.error("Set task details");
            finalActionValue = JSON.stringify({ title: form.taskTitle });
        } else if (form.actionType === "UPDATE_STATUS") {
            finalActionValue = form.targetStatus;
        } else if (form.actionType === "ADD_TAG" || form.actionType === "SEND_WHATSAPP") {
            finalActionValue = form.tagValue || form.emailBody || "Ping";
        }

        setLoading(true);
        const res = await createAutomation({
            name: form.name,
            trigger: form.triggerType,
            conditions: form.conditionField && form.conditionValue ? { [form.conditionField]: form.conditionValue } : {},
            action: form.actionType,
            actionValue: finalActionValue,
            workspaceId: activeWorkspace.id
        });
        setLoading(false);

        if (res.success) {
            toast.success("Enterprise Workflow Activated!");
            setOpen(false);
            setForm({
                ...form, name: "", conditionValue: "", emailBody: "", emailSubject: "", taskTitle: "", assigneeId: ""
            });
        } else {
            toast.error(res.error || "Failed to create workflow");
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Delete Workflow",
            description: "Are you sure you want to terminate this automation? It will immediately stop processing events.",
            variant: "destructive",
            confirmText: "Delete Workflow"
        });
        if (!isConfirmed) return;

        const res = await deleteAutomation(id);
        if (res.success) toast.success("Workflow deleted");
        else toast.error("Failed to delete workflow");
    };

    const handleToggle = async (id: string, currentlyActive: boolean) => {
        const res = await toggleAutomation(id, !currentlyActive);
        if (!res.success) toast.error("Failed to update status");
    };

    const filteredAutomations = automations.filter(wf => 
        wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wf.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wf.action.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`space-y-6 ${!entitlements.canUseWorkflowAutomations ? 'relative overflow-hidden min-h-[500px]' : ''}`}>
            {!entitlements.canUseWorkflowAutomations && (
                <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-[4px] flex items-center justify-center rounded-xl p-4">
                    <Card className="max-w-md w-full border-primary/30 shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] bg-background/95">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tight">Enterprise Workflows</CardTitle>
                            <CardDescription className="text-base pt-3 leading-relaxed">
                                Your <strong className="text-foreground">{planTier}</strong> plan restricts advanced CRM automation. Upgrade to orchestrate triggers, intelligent routing, and zero-touch follow-ups.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-6 flex justify-center pb-8">
                            <Button 
                                size="lg"
                                className="font-bold px-10 shadow-lg" 
                                onClick={() => document.querySelector<HTMLButtonElement>('[value="billing"]')?.click()}
                            >
                                Unlock Automations
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
                <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <Workflow className="w-6 h-6 text-primary" />
                        </div>
                        Workflow Engine
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        Design powerful "If This, Then That" automations to run your sales floor effortlessly. Auto-assign reps, text clients on won deals, and never drop a lead.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full sm:w-[200px] h-9 text-sm bg-background border-border"
                        />
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="bg-foreground hover:bg-foreground/90 text-background font-bold shadow-md transition-all">
                                <Plus className="w-5 h-5 mr-2" />
                                Build Workflow
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-card border-border/60 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Configure Workflow</DialogTitle>
                            <DialogDescription>Setup your trigger, logic conditions, and the resulting action.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            {/* Workflow Details */}
                            <div className="space-y-2">
                                <Label className="font-bold text-foreground">1. Workflow Name</Label>
                                <Input 
                                    className="bg-muted/50 focus-visible:ring-primary"
                                    placeholder="e.g. VIP PPC Lead Routing" 
                                    value={form.name} 
                                    onChange={e => setForm({...form, name: e.target.value})}
                                />
                            </div>

                            <Separator />

                            {/* Trigger Definition */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500"/> 2. Choose Trigger</Label>
                                    <Select onValueChange={val => setForm({...form, triggerType: val})} value={form.triggerType}>
                                        <SelectTrigger className="bg-muted/50">
                                            <SelectValue placeholder="Select Event" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRIGGERS.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    <div className="flex items-center gap-2"><t.icon className="w-4 h-4 text-muted-foreground"/> {t.label}</div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-foreground flex items-center gap-2">Wait, Only if...</Label>
                                    <div className="flex gap-2">
                                        <Select disabled value={form.conditionField}>
                                            <SelectTrigger className="w-[120px] bg-muted/50"><SelectValue/></SelectTrigger>
                                            <SelectContent><SelectItem value="source">Source</SelectItem><SelectItem value="status">Status</SelectItem></SelectContent>
                                        </Select>
                                        <strong className="text-muted-foreground self-center">=</strong>
                                        <Input 
                                            placeholder="e.g. PPC, SEO..." 
                                            className="flex-1 bg-muted/50"
                                            value={form.conditionValue} 
                                            onChange={e => setForm({...form, conditionValue: e.target.value})}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Leave blank to always trigger.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center p-2 opacity-50">
                                <ArrowRightCircle className="w-6 h-6 text-primary rotate-90 md:rotate-0" />
                            </div>

                            {/* Action Definition */}
                            <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <div className="space-y-2">
                                    <Label className="font-bold text-primary flex items-center gap-2">3. Execute Action</Label>
                                    <Select onValueChange={val => setForm({...form, actionType: val})} value={form.actionType}>
                                        <SelectTrigger className="bg-background border-primary/20 font-medium">
                                            <SelectValue placeholder="Select Action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACTIONS.map(a => (
                                                <SelectItem key={a.id} value={a.id} className="font-medium">
                                                    <div className="flex items-center gap-2"><a.icon className="w-4 h-4 text-primary/70"/> {a.label}</div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Dynamic Action Forms */}
                                {form.actionType === "ASSIGN_OWNER" && (
                                    <div className="space-y-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Assign To User</Label>
                                        <Select onValueChange={val => setForm({...form, assigneeId: val})} value={form.assigneeId}>
                                            <SelectTrigger className="bg-background"><SelectValue placeholder="Select Team Member" /></SelectTrigger>
                                            <SelectContent>
                                                {members.map((m: any) => (
                                                    <SelectItem key={m.userId} value={m.userId}>{m.user?.name || m.user?.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {form.actionType === "SEND_EMAIL" && (
                                    <div className="space-y-3 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Email Subject</Label>
                                            <Input className="bg-background" value={form.emailSubject} onChange={e => setForm({...form, emailSubject: e.target.value})} placeholder="Welcome to our services!"/>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Email Body template</Label>
                                            <Textarea className="bg-background min-h-[80px]" value={form.emailBody} onChange={e => setForm({...form, emailBody: e.target.value})} placeholder="Hello {{lead.name}}, ..."/>
                                        </div>
                                    </div>
                                )}

                                {form.actionType === "CREATE_TASK" && (
                                    <div className="space-y-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Task Instruction</Label>
                                        <Input className="bg-background" value={form.taskTitle} onChange={e => setForm({...form, taskTitle: e.target.value})} placeholder="Call the lead immediately (5 min SLA)"/>
                                    </div>
                                )}

                                {form.actionType === "UPDATE_STATUS" && (
                                    <div className="space-y-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Target Status</Label>
                                        <Select onValueChange={val => setForm({...form, targetStatus: val})} value={form.targetStatus}>
                                            <SelectTrigger className="bg-background"><SelectValue placeholder="Select Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="QUALIFIED">Qualified</SelectItem>
                                                <SelectItem value="CONVERTED">Opportunity</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                        </div>
                        <DialogFooter className="border-t pt-4">
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={loading} className="font-bold px-8 shadow-sm">{loading ? "Provisioning..." : "Launch Workflow"}</Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredAutomations.map((wf) => {
                    const TriggerIcon = TRIGGERS.find(t => t.id === wf.trigger)?.icon || Zap;
                    const ActionIcon = ACTIONS.find(a => a.id === wf.action)?.icon || Play;
                    const triggerLabel = TRIGGERS.find(t => t.id === wf.trigger)?.label || wf.trigger;
                    const actionLabel = ACTIONS.find(a => a.id === wf.action)?.label || wf.action;
                    
                    let resolvedActionText = "";
                    if (wf.action === "ASSIGN_OWNER") resolvedActionText = members.find((m: any) => m.userId === wf.actionValue)?.user?.name || "User";
                    else if (wf.action === "CREATE_TASK") resolvedActionText = "New Task created";
                    else if (wf.action === "UPDATE_STATUS") resolvedActionText = `State -> ${wf.actionValue}`;
                    else resolvedActionText = "Automation sequence";

                    return (
                        <Card key={wf.id} className={`shadow-sm border-border/60 overflow-hidden transition-all hover:shadow-md ${!wf.isActive ? 'opacity-60 bg-muted/40 grayscale-[0.2]' : 'bg-card'}`}>
                            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <h4 className="text-lg font-bold text-foreground tracking-tight">{wf.name}</h4>
                                        <Badge variant={wf.isActive ? "default" : "outline"} className={wf.isActive ? "bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold" : "text-muted-foreground font-semibold"}>
                                            {wf.isActive ? "Running" : "Paused"}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm bg-muted/50 w-full md:w-max px-4 py-2.5 border border-border/50 rounded-lg">
                                        <div className="flex items-center gap-2.5 font-semibold text-foreground">
                                            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shadow-sm">
                                                <TriggerIcon className="w-4 h-4 text-background" />
                                            </div>
                                            {triggerLabel}
                                            <span className="text-muted-foreground font-normal">
                                                {(wf.conditions as any)?.source ? `(If Source = ${(wf.conditions as any)?.source})` : "(Always)"}
                                            </span>
                                        </div>
                                        
                                        <div className="hidden sm:block text-muted-foreground/30"><ArrowRight className="w-4 h-4"/></div>
                                        <div className="sm:hidden pl-3 border-l-2 border-border ml-3 my-1"></div>

                                        <div className="flex items-center gap-2.5 font-semibold text-primary">
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/10">
                                                <ActionIcon className="w-4 h-4 text-primary" />
                                            </div>
                                            {actionLabel} <span className="opacity-70 font-normal">: {resolvedActionText.substring(0, 30)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 md:pl-6 md:border-l border-border/50 mt-2 md:mt-0 pt-4 md:pt-0">
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5">Engine State</div>
                                            <Switch className="data-[state=checked]:bg-primary" checked={wf.isActive} onCheckedChange={() => handleToggle(wf.id, wf.isActive)} />
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => handleDelete(wf.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                
                {filteredAutomations.length === 0 && (
                    <div className="text-center p-16 border-dashed border-2 border-border/60 bg-muted/10 rounded-2xl flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Workflow className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-1">No Active Workflows</h4>
                        <p className="text-muted-foreground max-w-sm">Use the engine builder to automate your team's routine follow-ups and lead distribution.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Separate little component for clean UI
function Separator() {
    return <div className="w-full h-px bg-border/50"></div>;
}

"use client";

import { useEffect, useState } from "react";
import { getWorkspaceCustomFields, renameCustomField, deleteCustomField } from "@/lib/actions/custom-fields";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Pencil, Tag, FolderGit2, AlertTriangle, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface FieldItem {
    value: string;
    count: number;
}

export function CustomFieldsManager({ workspaceId }: { workspaceId: string }) {
    const { confirm } = useConfirm();
    const [services, setServices] = useState<FieldItem[]>([]);
    const [sources, setSources] = useState<FieldItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Edit states
    const [editingType, setEditingType] = useState<"service" | "source" | null>(null);
    const [editingOriginalValue, setEditingOriginalValue] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    // Add states
    const [addingType, setAddingType] = useState<"service" | "source" | null>(null);
    const [newValue, setNewValue] = useState("");

    const fetchFields = async () => {
        setLoading(true);
        const res = await getWorkspaceCustomFields(workspaceId);
        if (res.success && res.data) {
            setServices(res.data.services);
            setSources(res.data.sources);
        } else {
            toast.error("Failed to load custom fields.");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (workspaceId) {
            fetchFields();
        }
    }, [workspaceId]);

    const handleAdd = async () => {
        if (!addingType || !newValue.trim()) return;

        setActionLoading(`add_${addingType}`);
        const { addCustomField } = await import("@/lib/actions/custom-fields");
        const res = await addCustomField(workspaceId, addingType, newValue.trim());
        
        if (res.success) {
            toast.success("Added successfully.");
            await fetchFields();
            setAddingType(null);
            setNewValue("");
        } else {
            toast.error(res.error || "Failed to add field.");
        }
        setActionLoading(null);
    };

    const handleSaveEdit = async () => {
        if (!editingType || !editingOriginalValue || !editValue.trim()) return;
        if (editValue.trim() === editingOriginalValue) {
            cancelEdit();
            return;
        }

        setActionLoading(`edit_${editingType}_${editingOriginalValue}`);
        const res = await renameCustomField(workspaceId, editingType, editingOriginalValue, editValue.trim());
        
        if (res.success) {
            toast.success(`Renamed successfully. Updated ${res.count} leads.`);
            await fetchFields();
            cancelEdit();
        } else {
            toast.error(res.error || "Failed to rename field.");
        }
        setActionLoading(null);
    };

    const handleDelete = async (type: "service" | "source", value: string, count: number) => {
        const fallbackText = type === "service" ? "cleared (empty)" : "reset to 'MANUAL'";
        
        const isConfirmed = await confirm({
            title: `Delete Custom ${type === "service" ? "Service" : "Source"}`,
            description: `You are about to delete "${value}". This will affect ${count} lead(s). Their ${type} field will be ${fallbackText}. This cannot be undone.`,
            variant: "destructive",
            confirmText: "Delete Globally"
        });

        if (!isConfirmed) return;

        setActionLoading(`delete_${type}_${value}`);
        const res = await deleteCustomField(workspaceId, type, value);
        
        if (res.success) {
            toast.success(`Deleted successfully. ${res.count} leads affected.`);
            await fetchFields();
        } else {
            toast.error(res.error || "Failed to delete field.");
        }
        setActionLoading(null);
    };

    const startEdit = (type: "service" | "source", value: string) => {
        setEditingType(type);
        setEditingOriginalValue(value);
        setEditValue(value);
        setAddingType(null);
    };

    const cancelEdit = () => {
        setEditingType(null);
        setEditingOriginalValue(null);
        setEditValue("");
    };

    if (loading) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse bg-card border border-border rounded-lg shadow-sm">Loading custom fields...</div>;
    }

    const renderList = (type: "service" | "source", items: FieldItem[], icon: React.ReactNode, title: string, emptyMessage: string) => (
        <div className="flex-1 bg-background rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="bg-muted/30 p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-primary hover:bg-primary/10" 
                    onClick={() => {
                        setAddingType(type);
                        setNewValue("");
                        cancelEdit();
                    }}
                    disabled={!!addingType || !!editingType}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="divide-y divide-border/50 max-h-[350px] overflow-y-auto flex-1">
                {addingType === type && (
                    <div className="p-3 bg-primary/5 border-b border-primary/20 space-y-2 animate-in slide-in-from-top-2 duration-200">
                         <Label className="text-[10px] font-bold uppercase text-primary/70">Add New Suggestion</Label>
                         <div className="flex items-center gap-2">
                            <Input 
                                value={newValue} 
                                onChange={e => setNewValue(e.target.value)}
                                placeholder={`Enter ${type} name...`}
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleAdd();
                                    if(e.key === 'Escape') setAddingType(null);
                                }}
                            />
                            <Button size="sm" className="h-8 px-3 text-[10px]" onClick={handleAdd} disabled={actionLoading === `add_${type}` || !newValue.trim()}>
                                Add
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px]" onClick={() => setAddingType(null)} disabled={actionLoading === `add_${type}`}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                         </div>
                    </div>
                )}

                {items.length === 0 ? (
                    <div className="p-10 text-center text-xs text-muted-foreground italic">
                        {emptyMessage}
                    </div>
                ) : (
                    items.map((item) => {
                        const isEditingThis = editingType === type && editingOriginalValue === item.value;
                        const isSomethingLoading = actionLoading === `edit_${type}_${item.value}` || actionLoading === `delete_${type}_${item.value}`;

                        return (
                            <div key={item.value} className="flex items-center justify-between p-3 hover:bg-muted/10 transition-colors group">
                                {isEditingThis ? (
                                    <div className="flex items-center gap-2 flex-1 animate-in zoom-in-95 duration-150">
                                        <Input 
                                            value={editValue} 
                                            onChange={e => setEditValue(e.target.value)}
                                            className="h-8 text-sm"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleSaveEdit();
                                                if(e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                        <Button size="sm" className="h-8 px-3 text-[10px]" onClick={handleSaveEdit} disabled={isSomethingLoading || !editValue.trim()}>
                                            Save
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px]" onClick={cancelEdit} disabled={isSomethingLoading}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="text-sm font-medium text-foreground truncate" title={item.value}>
                                                {item.value}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground tracking-tight flex items-center gap-1.5">
                                                {item.count === 0 ? (
                                                     <Badge variant="outline" className="text-[8px] px-1 h-3.5 border-amber-200 text-amber-600 font-bold bg-amber-50">UNASSIGNED</Badge>
                                                ) : (
                                                    `Used by ${item.count} leads`
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                                                onClick={() => startEdit(type, item.value)}
                                                disabled={!!editingType || !!actionLoading || !!addingType}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(type, item.value, item.count)}
                                                disabled={!!editingType || !!actionLoading || !!addingType}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-muted/10 p-5 rounded-lg border border-border/50 shadow-inner mt-6 space-y-4">
            <div className="flex flex-col space-y-1">
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                    <FolderGit2 className="w-4 h-4 text-primary" />
                    Custom Inputs Manager
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                    Globally rename or delete custom inputs created by your team. These bulk actions will instantly alter every historical record assigned to the selected value.
                </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
                {renderList("service", services, <Tag className="w-4 h-4 text-indigo-500" />, "Managed Services", "No custom services found.")}
                {renderList("source", sources, <AlertTriangle className="w-4 h-4 text-orange-500" />, "Managed Sources", "No custom sources found.")}
            </div>
        </div>
    );
}

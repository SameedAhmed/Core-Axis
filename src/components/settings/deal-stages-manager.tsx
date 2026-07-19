"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWorkspaceDealStages, renameDealStage, deleteDealStage } from "@/lib/actions/deals";
import { Plus, GripVertical, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { useRouter } from "next/navigation";

export interface DealStageConfig {
    id: string;
    value: string;
    label: string;
    color: string;
}

const DEFAULT_STAGES: DealStageConfig[] = [
    { id: "s1", value: "QUALIFICATION", label: "New Lead", color: "slate" },
    { id: "s2", value: "PROPOSAL", label: "Contacted", color: "blue" },
    { id: "s3", value: "NEGOTIATION", label: "Negotiation", color: "amber" },
    { id: "s4", value: "WON", label: "Sales Confirmed", color: "indigo" },
    { id: "s5", value: "LOST", label: "Closed Lost", color: "red" }
];

interface DealStagesManagerProps {
    workspaceId: string;
    initialStages: DealStageConfig[] | null;
}

export function DealStagesManager({ workspaceId, initialStages }: DealStagesManagerProps) {
    const [stages, setStages] = useState<DealStageConfig[]>(
        initialStages || DEFAULT_STAGES
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [loading, setLoading] = useState(false);
    const { confirm } = useConfirm();
    const router = useRouter();

    // In a real app we'd use dnd-kit or react-beautiful-dnd. For simplicity we use standard arrays.
    
    const handleSaveList = async (newList: DealStageConfig[]) => {
        setLoading(true);
        const result = await updateWorkspaceDealStages(newList);
        if (result.success) {
            setStages(newList);
            toast.success("Pipeline stages updated successfully.");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to save stages");
        }
        setLoading(false);
    };

    const handleRename = async (id: string, newLabel: string) => {
        if (!newLabel.trim()) return;
        
        const stage = stages.find(s => s.id === id);
        if (!stage) return;
        
        const oldLabel = stage.label;
        if (oldLabel === newLabel) {
            setEditingId(null);
            return;
        }

        setLoading(true);
        
        // For default stages (s1..s5), we only change the UI label. 
        // The value stays as the DB Enum (WON, LOST, etc.) to keep features intact.
        const isDefault = id.startsWith('s');
        
        if (!isDefault) {
            // Only rename in DB for custom stages where the value IS the label
            const renameResult = await renameDealStage(stage.value, newLabel);
            if (!renameResult.success) {
                toast.error(renameResult.error);
                setLoading(false);
                setEditingId(null);
                return;
            }
        }
        
        const newList = stages.map(s => 
            s.id === id ? { ...s, label: newLabel, value: isDefault ? s.value : newLabel } : s
        );
        await handleSaveList(newList);
        
        setEditingId(null);
        setLoading(false);
    };

    const handleDelete = async (stage: DealStageConfig) => {
        if (stages.length <= 1) {
            toast.error("You must have at least one stage in the pipeline.");
            return;
        }

        const isConfirmed = await confirm({
            title: "Delete Deal Stage",
            description: `Are you sure you want to delete "${stage.label}"? All deals currently in this stage will be moved to the first available stage.`,
            confirmText: "Delete Stage",
            variant: "destructive"
        });

        if (!isConfirmed) return;

        setLoading(true);
        const fallback = stages.find(s => s.id !== stage.id);
        if (!fallback) return;

        const delResult = await deleteDealStage(stage.value, fallback.value);
        if (delResult.success) {
            const newList = stages.filter(s => s.id !== stage.id);
            await handleSaveList(newList);
        } else {
            toast.error(delResult.error);
        }
        setLoading(false);
    };

    const handleAdd = () => {
        const newStage: DealStageConfig = {
            id: `custom_${Date.now()}`,
            value: "New Stage",
            label: "New Stage",
            color: "slate"
        };
        handleSaveList([...stages, newStage]);
    };

    const moveStage = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === stages.length - 1) return;
        
        const newList = [...stages];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newList[index];
        newList[index] = newList[targetIndex];
        newList[targetIndex] = temp;
        
        handleSaveList(newList);
    };

    const cycleColor = (id: string) => {
        const colors = ["slate", "blue", "amber", "indigo", "red", "purple", "pink"];
        const stageIndex = stages.findIndex(s => s.id === id);
        if (stageIndex === -1) return;
        
        // Find next color
        const currentIdx = colors.indexOf(stages[stageIndex].color);
        const nextColor = colors[(currentIdx + 1) % colors.length];
        
        const newList = [...stages];
        newList[stageIndex].color = nextColor;
        handleSaveList(newList);
    };

    const getColorClass = (color: string) => {
        switch (color) {
            case "blue": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            case "amber": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "indigo": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
            case "red": return "bg-red-500/10 text-red-600 border-red-500/20";
            case "purple": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
            case "pink": return "bg-pink-500/10 text-pink-600 border-pink-500/20";
            default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Pipeline Stages</h3>
                    <p className="text-sm text-muted-foreground">Manage the Kanban columns and deal lifecycle for this workspace.</p>
                </div>
                <Button onClick={handleAdd} disabled={loading} size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Stage
                </Button>
            </div>

            <div className="space-y-2 border rounded-xl bg-muted/10 p-4">
                {stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-3 bg-background border p-3 rounded-lg shadow-sm">
                        
                        {/* Ordering controls */}
                        <div className="flex flex-col gap-0.5">
                            <button 
                                onClick={() => moveStage(index, 'up')}
                                disabled={index === 0 || loading}
                                className="p-0.5 text-muted-foreground hover:bg-muted rounded disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.18179 8.81819C4.00605 8.99392 3.72113 8.99392 3.54539 8.81819C3.36965 8.64245 3.36965 8.35753 3.54539 8.18179L7.18179 4.54539C7.26618 4.461 7.38064 4.41355 7.50009 4.41355C7.61954 4.41355 7.734 4.461 7.81839 4.54539L11.4548 8.18179C11.6305 8.35753 11.6305 8.64245 11.4548 8.81819C11.279 8.99392 10.9941 8.99392 10.8184 8.81819L7.50009 5.49988L4.18179 8.81819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </button>
                            <button 
                                onClick={() => moveStage(index, 'down')}
                                disabled={index === stages.length - 1 || loading}
                                className="p-0.5 text-muted-foreground hover:bg-muted rounded disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.18179 6.18181C4.00605 6.00608 3.72113 6.00608 3.54539 6.18181C3.36965 6.35755 3.36965 6.64247 3.54539 6.81821L7.18179 10.4546C7.26618 10.539 7.38064 10.5865 7.50009 10.5865C7.61954 10.5865 7.734 10.539 7.81839 10.4546L11.4548 6.81821C11.6305 6.64247 11.6305 6.35755 11.4548 6.18181C11.279 6.00608 10.9941 6.00608 10.8184 6.18181L7.50009 9.50012L4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1">
                            {editingId === stage.id ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        value={editValue} 
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="h-8 text-sm max-w-[200px]"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(stage.id, editValue);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => handleRename(stage.id, editValue)} disabled={loading}>
                                        <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)} disabled={loading}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button 
                                        title="Click to cycle color"
                                        onClick={() => cycleColor(stage.id)} 
                                        className={`px-3 py-1 rounded border text-xs font-bold transition-all hover:brightness-95 ${getColorClass(stage.color)}`}
                                    >
                                        {stage.label}
                                    </button>
                                </div>
                            )}
                        </div>

                        {editingId !== stage.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}> {/* Always show for touch UX */}
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-muted-foreground hover:text-primary" 
                                    onClick={() => {
                                        setEditValue(stage.label);
                                        setEditingId(stage.id);
                                    }}
                                    disabled={loading}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500" 
                                    onClick={() => handleDelete(stage)}
                                    disabled={loading || stages.length <= 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">Click on a stage's badge to cycle its color. Changing a stage's name automatically updates all deals inside it.</p>
        </div>
    );
}

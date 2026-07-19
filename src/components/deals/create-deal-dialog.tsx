"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createDeal } from "@/lib/actions/deals";
import { Plus, CheckSquare, Coins, Briefcase, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters."),
    value: z.number().min(0, "Value cannot be negative."),
    stage: z.string().min(1, "Stage is required"),
    organizationId: z.string().optional().or(z.literal("none")),
    notes: z.string().optional(),
});

interface CreateDealDialogProps {
    organizations: { id: string; name: string }[];
    dealStages: any;
}

export function CreateDealDialog({ organizations, dealStages }: CreateDealDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            value: 0,
            stage: "QUALIFICATION",
            organizationId: "none",
            notes: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const result = await createDeal({
            ...values,
            organizationId: values.organizationId === "none" ? null : values.organizationId,
        });

        if (result.success) {
            setOpen(false);
            form.reset();
            router.refresh();
        } else {
            console.error(result.error);
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full xs:w-auto bg-primary hover:bg-primary/90 text-white shadow-sm transition-all shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> New <span className="hidden xs:inline ml-1">Opportunity</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-zinc-200">
                <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200/60">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        New Opportunity
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-zinc-500">
                        Drop a new opportunity into your sales pipeline.
                    </DialogDescription>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4">
                        <div className="space-y-5">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold">Opportunity Title</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white" placeholder="Q4 Enterprise License Upgrade" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" /> Pipeline Value ($)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="bg-white font-medium"
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="stage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" /> Pipeline Stage</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select stage" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(dealStages || [
                                                        { id: "s1", value: "QUALIFICATION", label: "New Lead" },
                                                        { id: "s2", value: "PROPOSAL", label: "Contacted" },
                                                        { id: "s3", value: "NEGOTIATION", label: "Negotiation" },
                                                        { id: "s4", value: "WON", label: "Sales Confirmed" },
                                                        { id: "s5", value: "LOST", label: "Closed Lost" }
                                                    ]).map((s: any) => (
                                                        <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="organizationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold">Associated Organization</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select organization" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-zinc-500 italic">Standalone Deal</SelectItem>
                                                {organizations?.map((org) => (
                                                    <SelectItem key={org.id} value={org.id}>
                                                        {org.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Implementation Notes</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="bg-white min-h-[80px] resize-none"
                                                placeholder="Needs to integrate with existing legacy infrastructure..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-[11px] text-zinc-500 mt-1">These notes will be pinned to this opportunity's activity timeline.</p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="mt-8 pt-4 border-t border-zinc-100 flex items-center sm:justify-between">
                            <span className="text-xs text-zinc-400 hidden sm:inline-block">Est. closing probability assigned by AI.</span>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Discard
                                </Button>
                                <Button type="submit" disabled={loading} className="min-w-[120px]">
                                    {loading ? "Saving..." : "Save Opportunity"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

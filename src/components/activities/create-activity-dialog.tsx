"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createActivity } from "@/lib/actions/activities";
import { Plus, Mail, Phone, Calendar, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Lead, Deal } from "@/generated/prisma/client/client";

const formSchema = z.object({
    type: z.string().min(1, "Activity type is required."),
    notes: z.string().min(2, "Notes must be at least 2 characters."),
    leadId: z.string().optional().or(z.literal("none")),
    dealId: z.string().optional().or(z.literal("none")),
});

interface CreateActivityDialogProps {
    leads: Lead[];
    deals: Deal[];
}

export function CreateActivityDialog({ leads, deals }: CreateActivityDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "NOTE",
            notes: "",
            leadId: "none",
            dealId: "none",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const result = await createActivity({
            ...values,
            leadId: values.leadId === "none" ? null : values.leadId,
            dealId: values.dealId === "none" ? null : values.dealId,
        });

        if (result.success) {
            setOpen(false);
            form.reset();
        } else {
            console.error(result.error);
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" /> Log Activity
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log New Activity</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Activity Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NOTE">
                                                <div className="flex items-center"><PenLine className="w-4 h-4 mr-2" /> Note</div>
                                            </SelectItem>
                                            <SelectItem value="CALL">
                                                <div className="flex items-center"><Phone className="w-4 h-4 mr-2" /> Call</div>
                                            </SelectItem>
                                            <SelectItem value="EMAIL">
                                                <div className="flex items-center"><Mail className="w-4 h-4 mr-2" /> Email</div>
                                            </SelectItem>
                                            <SelectItem value="MEETING">
                                                <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Meeting</div>
                                            </SelectItem>
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
                                    <FormLabel>Details / Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Discussed next quarter goals..." className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="leadId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Associated Lead (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {leads.map(lead => (
                                                <SelectItem key={lead.id} value={lead.id}>
                                                    {lead.firstName} {lead.lastName}
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
                            name="dealId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Associated Deal (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {deals.map(deal => (
                                                <SelectItem key={deal.id} value={deal.id}>
                                                    {deal.title} (${deal.value})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : "Log Activity"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

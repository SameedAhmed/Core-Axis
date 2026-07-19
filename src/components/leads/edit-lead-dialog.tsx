"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateLead } from "@/lib/actions/leads";
import { Lead } from "@/generated/prisma/client/client";
import { CalendarDays, Edit2, User, PhoneCall, Mail, Building, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
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
import { useRouter } from "next/navigation";

const formSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Invalid email address.").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    service: z.string().optional().or(z.literal("")),
    quotation: z.string().optional(),
    remarks: z.string().optional().or(z.literal("")),
    organizationId: z.string().optional().or(z.literal("none")),
    source: z.string().optional().or(z.literal("")),
    createdAt: z.string().optional(),
});

interface EditLeadDialogProps {
    lead: Lead;
    organizations: { id: string; name: string }[];
    suggestions?: { services: string[]; sources: string[] };
}

export function EditLeadDialog({ lead, organizations, suggestions }: EditLeadDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const serviceOptions = suggestions?.services?.map(s => ({ label: s, value: s })) || [];

    const sourceOptions = (suggestions?.sources || []).map(s => ({ label: s, value: s }));

    const orgOptions = [
        { label: "No Company (Individual)", value: "none" },
        ...organizations.map(org => ({ label: org.name, value: org.id }))
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email || "",
            phone: lead.phone || "",
            service: (lead as any).service || "",
            quotation: String((lead as any).quotation || "0"),
            remarks: (lead as any).remarks || "",
            organizationId: (lead as any).organizationId || "none",
            source: (lead as any).source || "MANUAL",
            createdAt: lead.createdAt
                ? new Date(lead.createdAt).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const result = await updateLead(lead.id, {
            ...values,
            source: values.source || "MANUAL",
            organizationId: values.organizationId === "none" ? null : values.organizationId,
            quotation: parseFloat(values.quotation || "0"),
        });

        if (result.success) {
            setOpen(false);
            form.reset(values);
            router.refresh();
        } else {
            console.error(result.error);
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setOpen(true)} className="cursor-pointer">
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span>Edit Lead</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-zinc-200">
                <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200/60">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Edit Lead
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-zinc-500">
                        Update contact information and pipeline details.
                    </DialogDescription>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="col-span-1 md:col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-2 mb-1">
                                Personal Information
                            </div>

                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs">First Name</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" placeholder="John" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs">Last Name</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" placeholder="Doe" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" type="email" placeholder="john@company.com" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> Phone Number</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" placeholder="+1 (555) 000-0000" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="col-span-1 md:col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-2 mt-4 mb-1">
                                Service & Value
                            </div>

                            <FormField
                                control={form.control}
                                name="service"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs">Service / Product</FormLabel>
                                        <FormControl>
                                            <CreatableCombobox
                                                options={serviceOptions}
                                                value={field.value ?? ""}
                                                onValueChange={field.onChange}
                                                placeholder="Select or type service..."
                                                createLabel="Add"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quotation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs">Quotation (Value)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                                                <Input className="bg-white h-10 rounded-lg shadow-sm pl-7" type="number" placeholder="0.00" {...field} value={field.value ?? ""} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="col-span-1 md:col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-2 mt-4 mb-1">
                                Pipeline Details
                            </div>

                            <FormField
                                control={form.control}
                                name="organizationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Company / Organization</FormLabel>
                                        <FormControl>
                                            <CreatableCombobox
                                                options={orgOptions}
                                                value={field.value ?? "none"}
                                                onValueChange={field.onChange}
                                                placeholder="Select or create company..."
                                                createLabel="Create Company"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs">Source</FormLabel>
                                        <FormControl>
                                            <CreatableCombobox
                                                options={sourceOptions}
                                                value={field.value ?? "MANUAL"}
                                                onValueChange={field.onChange}
                                                placeholder="Select or create source..."
                                                createLabel="Add Source"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="createdAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Creation Date</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" type="date" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="remarks"
                                render={({ field }) => (
                                    <FormItem className="col-span-1 md:col-span-2 mt-2">
                                        <FormLabel className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Internal Remarks</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white h-10 rounded-lg shadow-sm" placeholder="Quick summary or status update..." {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter className="mt-8 pt-4 border-t border-zinc-100 flex items-center sm:justify-between">
                            <span className="text-xs text-zinc-400 hidden sm:inline-block">All fields are securely encrypted.</span>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="min-w-[120px]">
                                    {loading ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateContact } from "@/lib/actions/contacts";
import { toast } from "sonner";

interface EditContactDialogProps {
    contact: any;
    organizations: { id: string; name: string }[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditContactDialog({ contact, organizations, open, onOpenChange }: EditContactDialogProps) {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            organizationId: formData.get("organizationId") === "none" ? null : formData.get("organizationId") as string,
        };

        const result = await updateContact(contact.id, data);
        setLoading(false);

        if (result.success) {
            toast.success("Contact updated successfully");
            onOpenChange(false);
        } else {
            toast.error(result.error || "Failed to update contact");
        }
    }

    if (!contact) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Contact</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-firstName">First Name</Label>
                                <Input id="edit-firstName" name="firstName" defaultValue={contact.firstName || ""} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-lastName">Last Name</Label>
                                <Input id="edit-lastName" name="lastName" defaultValue={contact.lastName || ""} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input id="edit-email" name="email" type="email" defaultValue={contact.email || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input id="edit-phone" name="phone" defaultValue={contact.phone || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-organizationId">Organization</Label>
                            <Select name="organizationId" defaultValue={contact.organizationId || "none"}>
                                <SelectTrigger autoFocus={false}>
                                    <SelectValue placeholder="Select Organization (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {organizations.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

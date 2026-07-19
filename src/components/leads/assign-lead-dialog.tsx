"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { assignLead } from "@/lib/actions/leads";
import { getUsers } from "@/lib/actions/users";
import { toast } from "sonner";
import { Lead } from "@/generated/prisma/client/client";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function AssignLeadDialog({ lead }: { lead: Lead }) {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [assignedUserId, setAssignedUserId] = useState<string>(lead.ownerId);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isOpen && users.length === 0) {
            getUsers().then((res) => setUsers(res));
        }
    }, [isOpen, users.length]);

    const handleAssign = async () => {
        if (!assignedUserId) return toast.error("Select a representative first.");
        setIsLoading(true);
        const res = await assignLead(lead.id, assignedUserId);
        if (res.success) {
            toast.success("Lead reassigned successfully");
            setIsOpen(false);
            router.refresh();
        } else {
            toast.error(res.error || "Failed to assign lead");
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setIsOpen(true);
                    }}
                    className="cursor-pointer font-medium"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Lead
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Lead to Representative</DialogTitle>
                    <DialogDescription className="sr-only">Select a representative from the system dropdown to reassign this lead</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Select Workspace Member</label>
                        <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an owner" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name || user.email} ({user.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={isLoading || assignedUserId === lead.ownerId}>
                        {isLoading ? "Assigning..." : "Confirm Assignment"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

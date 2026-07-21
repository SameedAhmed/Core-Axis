"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteContact } from "@/lib/actions/contacts";
import { toast } from "sonner";

import { EditContactDialog } from "./edit-contact-dialog";
import { Edit, FilterX, Users } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface ContactListProps {
    data: any[];
    organizations?: { id: string; name: string }[];
}

export function ContactList({ data, organizations = [] }: ContactListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(15);
    const [organizationFilter, setOrganizationFilter] = useState("ALL");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();
    
    // Edit Contact State
    const [activeContact, setActiveContact] = useState<any>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const filteredData = data.filter(contact => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
            contact.firstName.toLowerCase().includes(query) ||
            contact.lastName.toLowerCase().includes(query) ||
            contact.email?.toLowerCase().includes(query) ||
            contact.phone?.toLowerCase().includes(query);
            
        const matchesOrg = organizationFilter === "ALL" || contact.organizationId === organizationFilter;
        
        let matchesDate = true;
        if (dateRange?.from) {
            const contactDate = new Date(contact.createdAt);
            if (dateRange.to) {
                matchesDate = isWithinInterval(contactDate, {
                    start: startOfDay(dateRange.from),
                    end: endOfDay(dateRange.to)
                });
            } else {
                matchesDate = isWithinInterval(contactDate, {
                    start: startOfDay(dateRange.from),
                    end: endOfDay(dateRange.from)
                });
            }
        }
        
        return matchesSearch && matchesOrg && matchesDate;
    });

    const pageCount = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contact?")) return;
        const result = await deleteContact(id);
        if (result.success) {
            toast.success("Contact deleted");
        } else {
            toast.error(result.error || "Failed to delete contact");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto flex-1">
                    <div className="relative w-full md:w-[300px] lg:w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search contacts..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPageIndex(0);
                            }}
                            className="pl-10 h-10 bg-muted/50 border-border focus:bg-background transition-all rounded-xl text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-border h-10 rounded-xl font-medium text-xs">
                                <SelectValue placeholder="All Organizations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Organizations</SelectItem>
                                {organizations.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {(searchTerm || organizationFilter !== "ALL" || dateRange) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchTerm("");
                                setOrganizationFilter("ALL");
                                setDateRange(undefined);
                                setPageIndex(0);
                            }}
                            className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 hidden sm:flex"
                            title="Clear all filters"
                        >
                            <FilterX className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Contact Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden pb-4">
                {paginatedData.length > 0 ? (
                    paginatedData.map((contact) => (
                        <div 
                            key={contact.id} 
                            className="p-5 rounded-2xl border border-border/60 bg-card shadow-sm active:scale-[0.98] transition-all duration-200"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold tracking-tight text-foreground">
                                        {contact.firstName} {contact.lastName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-medium">
                                        <Building2 className="w-3.5 h-3.5 text-navy/60 dark:text-blue-300/60" />
                                        {contact.organization?.name || "Independent"}
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl bg-muted/30">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl">
                                        <DropdownMenuItem 
                                            className="gap-2 py-2.5 font-bold"
                                            onClick={() => {
                                                setActiveContact(contact);
                                                setEditDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Contact
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            className="gap-2 py-2.5 font-bold text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/20"
                                            onClick={() => handleDelete(contact.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Contact
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-2.5 bg-muted/30 p-3 rounded-xl border border-border/40">
                                <div className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                    <div className="bg-background p-1.5 rounded-lg border border-border/40">
                                        <Mail className="w-3.5 h-3.5 text-navy dark:text-blue-300" />
                                    </div>
                                    <span className="truncate">{contact.email || "No email available"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                    <div className="bg-background p-1.5 rounded-lg border border-border/40">
                                        <Phone className="w-3.5 h-3.5 text-navy dark:text-blue-300" />
                                    </div>
                                    <span>{contact.phone || "No phone number"}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center text-muted-foreground font-medium bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
                        No contacts found.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden text-zinc-900 dark:text-zinc-100">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="border-border/50">
                            <TableHead className="font-black uppercase tracking-wider text-[11px] h-12 px-5">Contact Name</TableHead>
                            <TableHead className="font-black uppercase tracking-wider text-[11px] h-12 px-5">Email</TableHead>
                            <TableHead className="font-black uppercase tracking-wider text-[11px] h-12 px-5">Phone</TableHead>
                            <TableHead className="font-black uppercase tracking-wider text-[11px] h-12 px-5">Organization</TableHead>
                            <TableHead className="w-[60px] h-12 px-5"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-medium">
                                    No records found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((contact) => (
                                <TableRow key={contact.id} className="hover:bg-muted/30 transition-colors border-border/40">
                                    <TableCell className="font-bold px-5 py-3.5">
                                        {contact.firstName} {contact.lastName}
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                                            <Mail className="w-3.5 h-3.5 text-navy/60 dark:text-blue-300/60" />
                                            {contact.email || <span className="italic opacity-50">N/A</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                                            <Phone className="w-3.5 h-3.5 text-navy/60 dark:text-blue-300/60" />
                                            {contact.phone || <span className="italic opacity-50">N/A</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                                            <Building2 className="w-3.5 h-3.5 text-navy/60 dark:text-blue-300/60" />
                                            {contact.organization?.name || <span className="italic opacity-50">None</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-border/60 shadow-xl">
                                                <DropdownMenuItem 
                                                    className="gap-2 py-2 font-bold cursor-pointer"
                                                    onClick={() => {
                                                        setActiveContact(contact);
                                                        setEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit Contact
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="gap-2 py-2 font-bold text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
                                                    onClick={() => handleDelete(contact.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Contact
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        ))}
                    </TableBody>
                </Table>
            </div>

            <EditContactDialog 
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                contact={activeContact}
                organizations={organizations}
            />

            {/* Pagination Controls */}
            {/* Overhauled Responsive Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                    Showing <span className="text-foreground font-bold">{paginatedData.length}</span> of <span className="text-foreground font-bold">{filteredData.length}</span> contacts.
                </div>
                
                <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden xs:block">Rows</p>
                        <Select
                            value={`${pageSize}`}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPageIndex(0);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] bg-muted/50 border-border/50 font-bold text-xs ring-0 focus:ring-0">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top" className="border-border shadow-xl">
                                {[15, 30, 50, 100].map((size) => (
                                    <SelectItem key={size} value={`${size}`} className="text-xs font-medium">
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-center text-xs font-bold min-w-[90px] whitespace-nowrap bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                        Page {pageIndex + 1} <span className="text-muted-foreground font-light mx-1.5">of</span> {pageCount || 1}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                            disabled={pageIndex === 0}
                        >
                            <span className="sr-only">Previous page</span>
                            <span className="text-lg font-light leading-none mb-0.5">‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-background hover:bg-navy/5 hover:text-navy hover:border-navy/30 transition-all shadow-none"
                            onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
                            disabled={pageIndex >= pageCount - 1}
                        >
                            <span className="sr-only">Next page</span>
                            <span className="text-lg font-light leading-none mb-0.5">›</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

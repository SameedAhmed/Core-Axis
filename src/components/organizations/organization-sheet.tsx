"use client";

import { Organization, Lead } from "@/generated/prisma/client/client";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { Building2, Calendar, Globe, User2, Mail, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type OrganizationWithLeads = Organization & { leads: Lead[] };

interface OrganizationSheetProps {
    organization: OrganizationWithLeads | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrganizationSheet({ organization, open, onOpenChange }: OrganizationSheetProps) {
    if (!organization) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "NEW": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            case "CONTACTED": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "QUALIFIED": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
            case "CONVERTED": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
            default: return "bg-primary/10 text-primary border-primary/20";
        }
    };

    const getInitials = (first: string, last: string) => {
        return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}`;
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md border-r-0 sm:border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden p-0 bg-background/95 backdrop-blur-xl">
                {/* Premium Gradient Header */}
                <div className="relative border-b border-border/40 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl opacity-50" />
                    
                    <SheetHeader className="p-6 pr-14 relative">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner border border-primary/20 shrink-0 transform transition-transform duration-500 hover:scale-105 hover:-rotate-3">
                                <Building2 className="w-7 h-7 text-primary" />
                            </div>
                            <div className="space-y-1 mt-1">
                                <SheetTitle className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                    {organization.name}
                                </SheetTitle>
                                <SheetDescription className="text-sm font-medium flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                    Active Organization Profile
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 scrollbar-hide">
                    {/* Glassmorphic Contact Card */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Contact Details</h4>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 shadow-sm space-y-4 backdrop-blur-sm transition-all hover:bg-muted/40">
                            <div className="flex items-center gap-3 text-sm group">
                                <div className="p-2 rounded-lg bg-background shadow-xs border border-border/50 group-hover:border-primary/30 transition-colors">
                                    <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                {organization.website ? (
                                    <a
                                        href={organization.website.startsWith("http") ? organization.website : `https://${organization.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-medium hover:underline decoration-primary/50 underline-offset-4 transition-all"
                                    >
                                        {organization.website.replace(/^https?:\/\//, '')}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground italic">No website provided</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-sm group">
                                <div className="p-2 rounded-lg bg-background shadow-xs border border-border/50 group-hover:border-primary/30 transition-colors">
                                    <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-foreground font-medium">
                                    Added on {format(new Date(organization.createdAt), 'MMMM do, yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Linked Leads Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end pl-1">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4" /> 
                                Linked Contacts
                            </h4>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full px-2.5 h-6 font-bold shadow-sm">
                                {organization.leads.length}
                            </Badge>
                        </div>
                        
                        {organization.leads.length > 0 ? (
                            <div className="space-y-3">
                                {organization.leads.map((lead, index) => (
                                    <div 
                                        key={lead.id} 
                                        className="group relative p-4 bg-card border border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in fill-mode-both"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                        
                                        <div className="relative flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                                                    <span className="text-sm font-bold text-primary tracking-wider">
                                                        {getInitials(lead.firstName, lead.lastName)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                                        {lead.firstName} {lead.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 shadow-sm transition-colors ${getStatusColor(lead.status)}`}>
                                                {lead.status}
                                            </Badge>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2 pl-[3.25rem]">
                                            {lead.email && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                                    <Mail className="w-3.5 h-3.5 opacity-70" />
                                                    {lead.email}
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                                    <Phone className="w-3.5 h-3.5 opacity-70" />
                                                    {lead.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center bg-muted/20 border border-dashed border-border/60 rounded-2xl backdrop-blur-sm">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                    <User2 className="w-6 h-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">No leads attached yet.</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Connections will appear here automatically.</p>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

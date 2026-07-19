"use client";

import { Check, Minus, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingTableProps {
    onOpenModal?: (plan: string) => void;
}

interface FeatureItem {
    name: string;
    description: string;
    free: string | boolean;
    starter: string | boolean;
    pro: string | boolean;
    enterprise: string | boolean;
}

interface FeatureCategory {
    title: string;
    features: FeatureItem[];
}

const FEATURE_DATA: FeatureCategory[] = [
    {
        title: "Core Sales Features",
        features: [
            { name: "Action Stream", description: "Automated next-best-action logic", free: true, starter: true, pro: true, enterprise: true },
            { name: "Visual Deal Pipeline", description: "Drag-and-drop sales stages", free: true, starter: true, pro: true, enterprise: true },
            { name: "Activity Tracking", description: "Log calls, notes, and tasks", free: "7 Days", starter: "30 Days", pro: "90 Days", enterprise: "Eternal" },
            { name: "Bulk Actions", description: "Email, update, or reassign en masse", free: false, starter: true, pro: true, enterprise: true },
            { name: "Custom Fields", description: "Extend data models with your own fields", free: "3 Fields", starter: "10 Fields", pro: "Unlimited", enterprise: "Unlimited" },
            { name: "Workflow Engine", description: "Visual automation for repeat tasks", free: false, starter: false, pro: "Visual", enterprise: "Advanced" },
        ]
    },
    {
        title: "Database & Scale",
        features: [
            { name: "Lead Database", description: "Total non-archived leads", free: "500", starter: "10,000", pro: "Unlimited", enterprise: "Unlimited" },
            { name: "Workspaces", description: "Isolated CRM environments", free: "1", starter: "3", pro: "10", enterprise: "Unlimited" },
            { name: "Organizations", description: "B2B account grouping", free: true, starter: true, pro: true, enterprise: true },
            { name: "Multi-Merchant Support", description: "Connect multiple payment gateways", free: false, starter: false, pro: true, enterprise: true },
            { name: "API Rate Limits", description: "Hourly request capacity", free: false, starter: false, pro: "Standard", enterprise: "Enterprise" },
        ]
    },
    {
        title: "Enterprise Security",
        features: [
            { name: "Multi-tenant Isolation", description: "Hard separation of org data", free: true, starter: true, pro: true, enterprise: true },
            { name: "Custom Sales Roles", description: "Define granular access for reps", free: false, starter: false, pro: true, enterprise: true },
            { name: "PBAC Security", description: "Permission-Based Access Control", free: false, starter: false, pro: false, enterprise: true },
            { name: "SSO / SAML", description: "Centralized identity management", free: false, starter: false, pro: false, enterprise: true },
            { name: "Audit Trail", description: "Complete history of system changes", free: false, starter: false, pro: "90 Days", enterprise: "Eternal" },
        ]
    },
    {
        title: "Developer & Support",
        features: [
            { name: "Webhook Triggers", description: "Automate downstream external apps", free: false, starter: false, pro: true, enterprise: true },
            { name: "Email Support", description: "Average response < 24h", free: true, starter: true, pro: true, enterprise: true },
            { name: "Priority Support", description: "Under 1 hour response time", free: false, starter: false, pro: true, enterprise: true },
            { name: "Dedicated Success Manager", description: "A person to help you grow", free: false, starter: false, pro: false, enterprise: true },
            { name: "White-labeling", description: "Custom branding for your platform", free: false, starter: false, pro: false, enterprise: "Options" },
        ]
    }
];

function FeatureValue({ value }: { value: string | boolean }) {
    if (typeof value === "boolean") {
        return value ? (
            <Check className="w-4 h-4 text-primary" />
        ) : (
            <Minus className="w-4 h-4 text-muted-foreground/30" />
        );
    }
    return <span className="text-[13px] font-medium text-foreground">{value}</span>;
}

export function PricingTable({ onOpenModal }: PricingTableProps) {
    const plans = [
        { id: "FREE", name: "Free", color: "from-zinc-400 to-zinc-500", shadow: "shadow-zinc-500/10" },
        { id: "STARTER", name: "Starter", color: "from-blue-400 to-blue-600", shadow: "shadow-blue-500/10" },
        { id: "PRO", name: "Professional", color: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", popular: true },
        { id: "ENTERPRISE", name: "Enterprise", color: "from-slate-700 to-slate-900", shadow: "shadow-slate-500/10" }
    ];

    return (
        <section className="py-24 bg-background overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl lg:text-5xl font-black mb-6 tracking-tight">Full Capability Matrix</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        A detailed breakdown of every technical feature, designed for scaling revenue teams.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((pl) => (
                        <div 
                            key={pl.id} 
                            className={cn(
                                "relative flex flex-col rounded-3xl border transition-all duration-500 bg-card/50 backdrop-blur-sm",
                                pl.popular 
                                    ? "border-primary/50 shadow-2xl scale-[1.03] z-10 bg-gradient-to-b from-primary/5 to-transparent shadow-primary/20 ring-1 ring-primary/20" 
                                    : "border-border shadow-sm hover:shadow-xl hover:-translate-y-1"
                            )}
                        >
                            {pl.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-primary/30">
                                    <Sparkles className="w-3 h-3" /> Recommended Choice
                                </div>
                            )}

                            {/* Column Header */}
                            <div className="p-8 pb-6 border-b border-border/50">
                                <h3 className={cn("text-2xl font-black mb-1", pl.popular ? "text-primary" : "text-foreground")}>
                                    {pl.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-6">Complete value breakdown</p>
                                {pl.id === "ENTERPRISE" ? (
                                    <a 
                                        href="mailto:Core Axis.sales@gmail.com?subject=Enterprise Inquiry: Core Axis"
                                        className={cn(
                                            "w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                                        )}
                                    >
                                        Contact Sales
                                    </a>
                                ) : (
                                    <button 
                                        onClick={() => onOpenModal?.(pl.id)}
                                        className={cn(
                                            "w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] shadow-lg",
                                            pl.popular 
                                                ? "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40" 
                                                : "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                                        )}
                                    >
                                        Start Now
                                    </button>
                                )}
                            </div>

                            {/* Features Scrollable Area */}
                            <div className="flex-1 p-6 space-y-10 group/list">
                                {FEATURE_DATA.map((cat, ci) => (
                                    <div key={ci} className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                            {cat.title}
                                        </h4>
                                        <div className="space-y-1">
                                            {cat.features.map((f, fi) => {
                                                const featureValue = pl.id === "FREE" ? f.free :
                                                                   pl.id === "STARTER" ? f.starter :
                                                                   pl.id === "PRO" ? f.pro : f.enterprise;
                                                return (
                                                    <div 
                                                        key={fi} 
                                                        className={cn(
                                                            "flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors group/item",
                                                            featureValue === false ? "opacity-40 grayscale" : "hover:bg-primary/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-medium text-foreground/90 group-hover/item:text-foreground transition-colors">
                                                                {f.name}
                                                            </span>
                                                            <div className="group/tip relative flex items-center">
                                                                <Info className="w-3 h-3 text-muted-foreground/30 cursor-help" />
                                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-48 p-3 bg-popover text-[11px] rounded-xl border border-border shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all pointer-events-none z-50 text-foreground leading-relaxed">
                                                                    {f.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <FeatureValue value={featureValue} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Column Footer */}
                            <div className="p-6 pt-0 opacity-40 hover:opacity-100 transition-opacity">
                                <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                                    * {pl.name} tier configurations subject to Core Axis PBAC security standards.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <p className="mt-16 text-center text-sm text-muted-foreground border-t border-border pt-10">
                    Need a custom solution for your enterprise team? <button onClick={() => onOpenModal?.("ENTERPRISE")} className="text-primary font-bold hover:underline">Get in touch →</button>
                 </p>
            </div>
        </section>
    );
}

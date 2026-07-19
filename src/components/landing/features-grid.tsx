"use client";

import { Zap, Building2, ShieldCheck, CreditCard, Workflow, Globe } from "lucide-react";

const features = [
    { icon: Zap,         color: "#6366f1", title: "Action Stream",           desc: "Stop hunting for leads. Focus on what closes. Our AI-driven stream surfaces your next best action automatically." },
    { icon: Building2,   color: "#3b82f6", title: "Multi-Tenant Workspaces", desc: "Isolate branch data completely. Perfect for franchises, multi-regional teams, or digital agencies." },
    { icon: ShieldCheck, color: "#10b981", title: "Granular Security (PBAC)",  desc: "Total control. Define exactly who can view, edit, or export every single record in your business." },
    { icon: CreditCard,  color: "#f97316", title: "Direct Payouts",          desc: "Connect Stripe or Square. Collect revenue and settle transactions directly within your CRM workflow." },
    { icon: Workflow,    color: "#8b5cf6", title: "Workflow Automations",    desc: "Build powerful If/Then logic. Trigger webhooks, emails, and lead assignments without writing code." },
    { icon: Globe,       color: "#06b6d4", title: "Global Infrastructure",   desc: "Built on an API-first architecture, ready to integrate with any existing tech stack or custom app." },
];

export function FeaturesGrid() {
    return (
        <section id="features" className="py-16 md:py-24 bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10 md:mb-16">
                    <p className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-widest mb-3">Enterprise Capabilities</p>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4 leading-[1.2]">A Global Operating System for Sales.</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                        Core Axis is a robust infrastructure designed for high-velocity teams demanding security and speed.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {features.map((f, i) => (
                        <div key={i}
                            className="group p-5 md:p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm"
                                style={{ background: `${f.color}12` }}>
                                <f.icon className="w-5 h-5 md:w-5.5 md:h-5.5" style={{ color: f.color }} />
                            </div>
                            <h3 className="text-[15px] font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                            <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

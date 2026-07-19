"use client";

import { CheckCircle2 } from "lucide-react";

interface PricingPlanProps {
    onOpenModal: (plan: string) => void;
}

export function PricingPlans({ onOpenModal }: PricingPlanProps) {
    const plans = [
        {
            name: "Starter", price: "$49", period: "/mo", tag: "14-Day Free Trial",
            desc: "Essential tools for small sales teams.",
            features: ["5 Team Seats", "10,000 Lead Database", "3 Dedicated Workspaces", "Standard Support"],
            cta: "Try Free", action: () => onOpenModal("STARTER"), featured: false,
        },
        {
            name: "Professional", price: "$99", period: "/mo", tag: "30-Day Free Trial",
            desc: "Advanced scaling for growth teams.",
            features: ["20 Team Seats", "Unlimited Lead Database", "10 Dedicated Workspaces", "Visual Workflow Engine", "Multi-Merchant Gateways", "Priority Support"],
            cta: "Try Free", action: () => onOpenModal("PRO"), featured: true,
        },
        {
            name: "Enterprise", price: "$249", period: "/mo", tag: "Custom Setup",
            desc: "Maximum security & total control.",
            features: ["Everything in Pro", "Granular Security (PBAC)", "Unlimited Workspaces", "SSO/SAML Authentication", "Advanced ACL Controls", "Dedicated Success Manager"],
            cta: "Contact Sales", action: () => { window.location.href = "mailto:digicarehouse.sales@gmail.com?subject=Enterprise Plan Inquiry"; }, featured: false,
        },
    ];

    return (
        <section id="pricing" className="py-16 md:py-20 bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10 md:mb-14">
                    <p className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-widest mb-3">Pricing</p>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4">Plans for Every Stage.</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">From boutique agencies to 1,000-rep enterprise operations, we have an infrastructure built for your scale.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-stretch">
                    {plans.map((plan) => (
                        <div key={plan.name}
                            className={`relative flex flex-col p-6 sm:p-8 rounded-2xl border transition-all duration-300
                                ${plan.featured
                                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/20 scale-[1.02] md:scale-105 z-10"
                                    : "border-border bg-card hover:shadow-md"
                                }`}>
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6 pt-2">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border
                                        ${plan.featured
                                            ? "text-primary border-primary/30 bg-primary/10"
                                            : "text-muted-foreground border-border bg-muted"}`}>
                                        {plan.tag}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-4">{plan.desc}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl sm:text-4xl font-black text-foreground">{plan.price}</span>
                                    <span className="text-xs sm:text-sm text-muted-foreground">{plan.period}</span>
                                </div>
                            </div>

                            <ul className="space-y-3 flex-1 mb-8">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.featured ? "text-primary" : "text-primary/70"}`} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button onClick={plan.action}
                                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]
                                    ${plan.featured
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                        : "bg-secondary text-secondary-foreground hover:bg-muted border border-border"
                                    }`}>
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

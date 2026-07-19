"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
    {
        q: "What makes Core Axis different from traditional CRMs?",
        a: "Most CRMs are just fancy list managers. Core Axis is an 'Action-Oriented' platform that surfaces your next best action automatically, so your team spends more time closing and less time organizing data."
    },
    {
        q: "Does Core Axis support multi-tenant isolation?",
        a: "Yes. Our architecture is built for scale. You can create completely isolated workspaces for different branches, regions, or clients, each with its own dedicated database partition and security rules."
    },
    {
        q: "How secure is my data in Core Axis?",
        a: "We use PBAC (Policy Based Access Control) and enterprise-grade encryption. Every record is protected by granular permissions, and our infrastructure is built to be SOC2-ready and compliant with global sovereignty laws."
    },
    {
        q: "Can I collect payments directly through my CRM?",
        a: "Absolutely. Core Axis integrates directly with Stripe and Square. You can connect your merchant account to any workspace and settle transactions, manage payouts, and track revenue right where you manage your leads."
    },
    {
        q: "Is there a trial for the Professional and Starter plans?",
        a: "Yes! The Starter plan comes with a 14-day free trial, and the Professional plan offers a full 30-day trial so you can experience the power of the Workflow Engine before committing."
    }
];

export function FAQSection() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    return (
        <section id="faq" className="py-20 bg-background">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-14">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">FAQ</p>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4">Common Questions</h2>
                    <p className="text-muted-foreground">Everything you need to know about the future of sales infrastructure.</p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200">
                            <button 
                                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors"
                            >
                                <span className="font-bold text-foreground text-sm sm:text-base">{faq.q}</span>
                                {openIdx === i ? <Minus className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-muted-foreground shrink-0" />}
                            </button>
                            {openIdx === i && (
                                <div className="px-6 pb-6 pt-0">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {faq.a}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

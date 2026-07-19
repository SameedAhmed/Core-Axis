"use client";

import Link from "next/link";
import { Rocket, Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function LandingFooter() {
    return (
        <footer className="py-14 border-t border-border bg-background">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                    <div className="md:col-span-2">
                        <Link href="/" className="inline-block mb-3">
                            <Logo showText />
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            The action-oriented CRM for high-velocity revenue teams. Multi-tenant, PBAC-secured, and built to scale your business.
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Platform</p>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            {[
                                ["Features", "/features"],
                                ["Pricing", "/pricing"],
                                ["Mobile App", "/download"],
                                ["Workflow Engine", "/features/workflow"],
                                ["API Docs", "/docs"]
                            ].map(([l,h]) => (
                                <li key={l}><Link href={h} className="hover:text-foreground transition-colors">{l}</Link></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Company</p>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            {[
                                ["Sales Inquiries", "/contact"],
                                ["Terms of Service", "/terms"],
                                ["Privacy Policy", "/privacy"],
                                ["Login", "/auth/signin"]
                            ].map(([l,h]) => (
                                <li key={l}><Link href={h} className="hover:text-foreground transition-colors">{l}</Link></li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Core Axis. A DigiCare House Product.</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" /> SSL Secured · PBAC Enforced · SOC2-Ready Infrastructure
                    </div>
                </div>
            </div>
        </footer>
    );
}

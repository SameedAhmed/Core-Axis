"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";

interface ComingSoonProps {
    title: string;
    description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center relative overflow-hidden">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#be123c]/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-6 py-16">
                <div className="max-w-xl w-full text-center relative z-10 space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="flex justify-center mb-12">
                        <Link href="/">
                            <Logo size="xl" showText />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
                            <Clock className="w-3 h-3 text-primary animate-pulse" />
                            <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.2em]">In Progress: Q2 2026</span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight leading-tight">
                            {title}
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {description}
                        </p>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="p-8 rounded-[32px] bg-card/40 backdrop-blur-xl border border-border/50 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between text-sm font-bold px-1">
                            <span className="text-foreground">Construction Phase</span>
                            <span className="text-primary font-black">78%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                            <div className="h-full bg-gradient-to-r from-primary via-[#be123c] to-primary w-[78%] rounded-full shadow-[0_0_15px_rgba(190,18,60,0.4)] animate-pulse" />
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-left transition-colors hover:bg-white/[0.08]">
                            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                            <p className="text-[13px] text-zinc-400 font-medium leading-relaxed italic">
                                Building a high-performance system requires deep precision. Our legal and developer teams are finalizing the logic for this section.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Link 
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-bold rounded-2xl hover:bg-foreground/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-black/10"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to DigiXCrm
                        </Link>
                    </div>
                </div>
            </div>

            {/* Robust Natural Footer */}
            <div className="w-full text-center pb-8 pt-4 px-6 relative z-10 shrink-0">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                    Professional Infrastructure by DigiCare House
                </div>
            </div>
        </div>
    );
}

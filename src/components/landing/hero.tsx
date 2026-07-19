"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Star } from "lucide-react";
import { ActionStreamPreview } from "./action-stream";
import { generateQR } from "@/lib/qr-generator";

interface HeroProps {
    onOpenModal: (plan: string) => void;
}

export function Hero({ onOpenModal }: HeroProps) {
    const [qrUrl, setQrUrl] = useState<string>("");

    useEffect(() => {
        generateQR("https://Core Axis.com/mobile_app/Core Axis.apk").then(setQrUrl);
    }, []);

    return (
        <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[400px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full mb-6 text-[10px] md:text-[11px] font-semibold text-primary uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Enterprise 2026 — Now Live
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.2] lg:leading-[1.1] tracking-tight text-foreground mb-4 md:mb-5 text-balance">
                            The CRM That{" "}
                            <span className="text-primary">Closes Deals.</span>
                        </h1>

                        <p className="text-sm md:text-lg text-muted-foreground leading-relaxed mb-8 md:mb-10 max-w-md mx-auto lg:mx-0 text-balance">
                            Stop losing leads in messy spreadsheets. Core Axis surfaces your{" "}
                            <strong className="text-foreground font-semibold">Next Best Action</strong>, keeping your sales team focused on closing, not organizing data.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-8 md:mb-10">
                            <button onClick={() => onOpenModal("FREE")}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl transition-all hover:bg-primary/90 hover:-translate-y-0.5 shadow-lg shadow-primary/20 group">
                                Try Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <a href="#contact"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl border border-border transition-all hover:bg-muted hover:-translate-y-0.5">
                                Request a Demo
                            </a>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 border-t border-border/60 pt-8">
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <div className="flex -space-x-2">
                                    {["SJ","MT","LA","RK","AP"].map((initials, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-black text-white"
                                            style={{ background: ["#6366f1","#3b82f6","#10b981","#f97316","#8b5cf6"][i] }}>
                                            {initials}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center sm:text-left">
                                    <div className="flex justify-center sm:justify-start gap-0.5 mb-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                                    </div>
                                    <span className="text-[11px] md:text-xs text-muted-foreground">Trusted by <strong className="text-foreground">5,000+</strong> revenue teams</span>
                                </div>
                            </div>

                            {/* Direct Scan-to-Install Bridge */}
                            <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-border/60 group">
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-border/50 p-1.5 transition-transform group-hover:scale-110 shadow-sm cursor-help overflow-hidden">
                                    {qrUrl ? (
                                        <img src={qrUrl} alt="Download App QR" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full bg-muted animate-pulse" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap mb-0.5">Live & Scannable</p>
                                    <p className="text-[8px] font-bold text-primary uppercase">v1.2.0 Native App</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center w-full max-w-[100vw] overflow-hidden px-2">
                        <div className="w-full max-w-[500px] lg:max-w-none transform scale-90 sm:scale-100 transition-transform">
                            <ActionStreamPreview />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

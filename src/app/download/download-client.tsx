"use client";

import { motion } from "framer-motion";
import { Download, ShieldCheck, Smartphone, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { useState, useEffect } from "react";
import { ServiceModal } from "@/components/landing/service-modal";
import { generateQR } from "@/lib/qr-generator";

export function DownloadClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("FREE");
    const [qrUrl, setQrUrl] = useState<string>("");

    useEffect(() => {
        generateQR("https://digixcrm.com/mobile_app/digixcrm.apk").then(setQrUrl);
    }, []);

    const onOpenModal = (plan: string) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    return (
        <>
            <LandingNav onOpenModal={onOpenModal} />
            
            <main className="pt-24 pb-20">
                {/* Hero Section */}
                <section className="relative px-6 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
                                <Smartphone className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mobile Power Unleashed</span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-6xl font-black leading-[1.1] tracking-tight mb-6">
                                DigiXCrm for <span className="text-primary">Android.</span>
                            </h1>
                            
                            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
                                Take the full power of your enterprise CRM anywhere. Real-time sync, lightning-fast dashboarding, and total workspace sovereignty—now in your pocket.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
                                <Link href="/mobile_app/digixcrm.apk" className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-primary text-white font-black text-lg gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                                        <Download className="w-6 h-6" />
                                        Download APK
                                    </Button>
                                </Link>
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Direct Install (v1.2.0)</p>
                                    <p className="text-xs text-muted-foreground italic">Verified Secure by DigiCare House</p>
                                </div>
                            </div>

                            {/* Desktop QR Code Bridge - Fixed Scannability & Position */}
                            <div className="hidden lg:flex items-center gap-5 p-5 bg-card border border-border rounded-3xl shadow-xl mb-12 w-fit hover:scale-[1.02] transition-transform cursor-help">
                                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-border/50 p-1.5 overflow-hidden">
                                    {qrUrl ? (
                                        <img src={qrUrl} alt="Download App QR" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full bg-muted animate-pulse" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Desktop Bridge</h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[140px]">Scan this code with your phone to instantly download the APK.</p>
                                    <div className="mt-2 text-[9px] font-bold text-primary py-0.5 px-2 bg-primary/10 rounded-full w-fit">v1.2.0 SCANNABLE</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 border-t border-border pt-10">
                                <div className="flex flex-col gap-2">
                                    <Zap className="w-6 h-6 text-primary" />
                                    <h3 className="font-bold">Instant Sync</h3>
                                    <p className="text-xs text-muted-foreground">Real-time updates across all your partitions.</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                    <h3 className="font-bold">PBAC Security</h3>
                                    <p className="text-xs text-muted-foreground">Enterprise-grade isolation on mobile.</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative flex justify-center lg:justify-end"
                        >
                            <div className="relative group">
                                {/* Second Background Mockup - For Depth */}
                                <div className="absolute -bottom-6 -right-12 w-[240px] h-[500px] bg-zinc-900/40 rounded-[2.5rem] border-[6px] border-zinc-800/50 -z-10 blur-[1px] transform rotate-3" />

                                {/* Dashboard Mockup Container */}
                                <div className="relative z-10 w-[280px] h-[580px] bg-zinc-900 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
                                     <div className="absolute top-0 inset-x-0 h-6 bg-zinc-800 flex justify-center p-1">
                                         <div className="w-12 h-1 bg-zinc-700 rounded-full" />
                                     </div>
                                     <div className="w-full h-full pt-6">
                                         <img 
                                            src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=400" 
                                            alt="Executive Dashboard Mobile" 
                                            className="w-full h-full object-cover opacity-80"
                                         />
                                         <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-zinc-950/90 flex flex-col justify-end p-8">
                                             <div className="h-1 bg-primary w-12 mb-4" />
                                             <h4 className="text-white font-black text-xl mb-2">Omni-Channel Sync</h4>
                                             <p className="text-white/60 text-xs">Managing 5,291 Active Leads</p>
                                         </div>
                                     </div>
                                </div>

                                {/* Floating Success Card - Fills Whitespace */}
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="absolute top-20 -left-24 z-20 p-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-primary/20 flex items-center gap-3 w-44 hover:scale-105 transition-transform"
                                >
                                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Real-time</p>
                                        <p className="text-xs font-bold text-foreground">Lead Assigned</p>
                                        <p className="text-[10px] text-primary font-bold">+$2,400</p>
                                    </div>
                                </motion.div>

                                {/* Floating Analytics Badge - Fills Whitespace */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                    className="absolute bottom-32 -right-16 z-20 p-4 bg-background border border-border rounded-2xl shadow-2xl flex flex-col gap-1 w-32 hover:scale-105 transition-transform"
                                >
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "70%" }}
                                            transition={{ delay: 1.5, duration: 1 }}
                                            className="h-full bg-primary" 
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-bold">
                                        <span>Target</span>
                                        <span className="text-primary">70%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Daily Quota</p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Installation Guide */}
                <section className="bg-muted/30 py-20 mt-20">
                    <div className="max-w-4xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black tracking-tight mb-4">Installation Guide</h2>
                            <p className="text-muted-foreground">Since this is a direct APK bundle, please follow these steps to securely install DigiXCrm on your Android device.</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { t: "Download the APK", d: "Click the primary download button above to save 'digixcrm.apk' to your device downloads." },
                                { t: "Enable Unknown Sources", d: "Open Settings > Security/Privacy and toggle 'Allow installation from unknown sources' for your browser." },
                                { t: "Open and Install", d: "Locate the file in your notifications or File Manager and tap to begin the secure installation process." },
                                { t: "Launch & Login", d: "Open the DigiXCrm icon on your home screen and sign in with your enterprise credentials." }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-6 p-6 bg-card border border-border rounded-2xl group hover:border-primary/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary shrink-0">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">{step.t}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{step.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <ServiceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                selectedPlan={selectedPlan} 
            />
        </>
    );
}

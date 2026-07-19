"use client";

import { useState, useEffect } from "react";
import { Activity, Users, BarChart2, Bell, Shield, Lock } from "lucide-react";

export function ActionStreamPreview() {
    const [active, setActive] = useState(0);
    const leads = [
        { name: "Sarah Mitchell", co: "Nexatech Corp",  tag: "Hot",  val: "$48,000", cta: "Follow Up",      dot: "#ef4444" },
        { name: "James Thornton", co: "CloudForge Inc", tag: "Warm", val: "$22,500", cta: "Send Proposal",  dot: "#f97316" },
        { name: "Priya Sharma",   co: "FinScale HQ",   tag: "New",  val: "$91,000", cta: "Discovery Call", dot: "#6366f1" },
        { name: "Marcus Wu",      co: "Launchpad AI",  tag: "Hot",  val: "$15,800", cta: "Close Deal",     dot: "#ef4444" },
    ];

    useEffect(() => {
        const t = setInterval(() => setActive(p => (p + 1) % leads.length), 2400);
        return () => clearInterval(t);
    }, [leads.length]);

    return (
        <div className="relative w-full max-w-lg mx-auto lg:mx-0" style={{ perspective: "1400px" }}>
            <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-3xl scale-110 -z-10" />

            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
                style={{ transform: "rotateX(3deg) rotateY(-4deg)", transformStyle: "preserve-3d" }}>
                <div className="h-9 bg-muted border-b border-border flex items-center px-3 gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                    <div className="ml-3 flex-1 bg-background/60 border border-border rounded px-2 py-0.5 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[9px] font-mono text-muted-foreground">app.Core Axis.com/action-stream</span>
                    </div>
                </div>

                <div className="flex" style={{ height: 300 }}>
                    <div className="w-12 bg-muted/60 border-r border-border flex flex-col items-center py-3 gap-3">
                        {[Activity, Users, BarChart2, Bell, Shield].map((Icon, i) => (
                            <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                                ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-2 bg-background">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-foreground">Action Stream</p>
                            <span className="text-[9px] font-black text-green-600 dark:text-green-400 bg-green-500/10 rounded-full px-2 py-0.5">● LIVE</span>
                        </div>

                        {leads.map((l, i) => (
                            <div key={i}
                                className="rounded-xl border px-3 py-2 flex items-center gap-2.5 transition-all duration-500"
                                style={{
                                    borderColor: i === active ? `${l.dot}50` : "var(--border)",
                                    background:  i === active ? `${l.dot}08` : "transparent",
                                    transform:   i === active ? "translateX(3px)" : "none",
                                }}>
                                <span className="w-6 h-6 rounded-full text-[9px] font-black text-white flex items-center justify-center shrink-0"
                                    style={{ background: l.dot }}>
                                    {l.name.split(" ").map(n => n[0]).join("")}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground truncate">{l.name}</p>
                                    <p className="text-[9px] text-muted-foreground truncate">{l.co}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-foreground">{l.val}</p>
                                    <p className="text-[9px] font-bold" style={{ color: l.dot }}>{l.cta} →</p>
                                </div>
                            </div>
                        ))}

                        <div className="mt-auto grid grid-cols-3 gap-2">
                            {[["12","Active Deals"],["$177K","Pipeline"],["94%","Close Rate"]].map(([v, lbl]) => (
                                <div key={lbl} className="bg-muted rounded-lg p-2 text-center">
                                    <p className="text-[11px] font-black text-foreground">{v}</p>
                                    <p className="text-[8px] text-muted-foreground">{lbl}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg animate-bounce">
                ● LIVE SYNC
            </div>
            <div className="absolute -bottom-3 -left-3 bg-card border border-border text-foreground text-[9px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg">
                🔐 PBAC Active
            </div>
        </div>
    );
}

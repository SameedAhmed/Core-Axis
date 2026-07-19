"use client";

import { Star } from "lucide-react";

const testimonials = [
    { name: "Sarah Jenkins",  role: "VP of Sales · NexaGrowth",     avatar: "SJ", color: "#6366f1",
      quote: "The Action Stream is the productivity killer-fix. My team is 40% more efficient and our close rate is at an all-time high." },
    { name: "Marcus Thorne",  role: "CEO · CloudForge",              avatar: "MT", color: "#3b82f6", featured: true,
      quote: "Managing 12 branches is seamless. The isolation and PBAC security are truly enterprise-grade. Indispenable for our growth." },
    { name: "Lena Adams",     role: "Ops Director · FinScale HQ", avatar: "LA", color: "#10b981",
      quote: "Integrated payments and CRM combined saved us 15 hours of manual work every week. It’s the platform we waited for." },
];

export function TestimonialsGrid() {
    return (
        <section id="testimonials" className="py-20 bg-muted/30 border-y border-border">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-14">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Customer Stories</p>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4">Built for Revenue Leaders.</h2>
                    <p className="text-muted-foreground">5,000+ teams switched to a more focused way of selling.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {testimonials.map((t, i) => (
                        <div key={i}
                            className={`p-7 rounded-2xl border flex flex-col transition-all duration-200
                                ${t.featured
                                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                                    : "border-border bg-card hover:shadow-md"
                                }`}>
                            {t.featured && (
                                <div className="mb-4">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">
                                        ★ Enterprise Choice
                                    </span>
                                </div>
                            )}
                            <div className="flex gap-0.5 mb-5">
                                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                                &ldquo;{t.quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-3 pt-5 border-t border-border">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                                    style={{ background: t.color }}>
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                    <p className="text-xs text-muted-foreground">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

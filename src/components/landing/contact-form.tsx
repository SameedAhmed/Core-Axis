"use client";

import { useState } from "react";
import { Send, Mail, Globe, Shield, CheckCircle2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";

export function ContactForm() {
    const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
    const [contactCaptcha, setContactCaptcha] = useState("");
    const [formSending, setFormSending] = useState(false);
    const [formSent, setFormSent] = useState(false);

    const handleContact = async (e: React.FormEvent) => {
        e.preventDefault(); setFormSending(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, captchaToken: contactCaptcha }),
            });
            if (res.ok) { setFormSent(true); setForm({ name: "", email: "", phone: "", message: "" }); }
            else { const d = await res.json(); toast.error(d.error || "Failed to send."); }
        } catch { toast.error("Server error."); }
        finally { setFormSending(false); }
    };

    return (
        <section id="contact" className="py-16 md:py-20 bg-muted/30 border-t border-border">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    <div className="pt-2 text-center lg:text-left">
                        <p className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-widest mb-3">Get In Touch</p>
                        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4 leading-[1.2]">
                            Ready to Scale Your<br className="hidden md:block" />Revenue Operation?
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">
                            Our team will walk you through a personalized demo, custom pricing, and a migration plan tailored to your business needs and industry.
                        </p>

                        <div className="space-y-3 max-w-md mx-auto lg:mx-0">
                            {[
                                { icon: Mail,   label: "Sales Email",  value: "digicarehouse.sales@gmail.com" },
                                { icon: Globe,  label: "Website",      value: "Core Axis.com" },
                                { icon: Shield, label: "Security",     value: "SOC2-Ready Infrastructure" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card text-left">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <item.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                        <p className="text-xs sm:text-sm text-foreground font-bold">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
                        {formSent ? (
                            <div className="text-center py-10">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">Message Sent!</h3>
                                <p className="text-sm text-muted-foreground mb-6">Our sales team will reach out within 24 hours.</p>
                                <button onClick={() => setFormSent(false)} className="text-sm text-primary font-bold hover:underline">
                                    Send Another Message →
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleContact} className="space-y-5">
                                <h3 className="text-lg font-extrabold text-foreground mb-5 text-center lg:text-left">Talk to a CRM Expert</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name *</label>
                                        <input required type="text" placeholder="John Smith"
                                            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Email *</label>
                                        <input required type="email" placeholder="john@company.com"
                                            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</label>
                                    <input type="tel" placeholder="+1 (555) 000-0000"
                                        value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Message / Query *</label>
                                    <textarea required rows={4} placeholder="Tell us about your team size, industry, and what you want to achieve..."
                                        value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" />
                                </div>

                                <div className="flex justify-center overflow-hidden h-[74px]">
                                    <div className="scale-[0.8] sm:scale-[0.9] origin-center -my-2 flex items-center justify-center">
                                        <Turnstile 
                                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACudyfUa5v4R9t3M"} 
                                            onSuccess={setContactCaptcha}
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={formSending || !contactCaptcha}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale disabled:scale-100">
                                    {formSending
                                        ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Sending...</>
                                        : <><Send className="w-4 h-4" /> Send Message</>}
                                </button>
                                <p className="text-center text-[10px] text-muted-foreground font-medium">Replying within 24 hours. No spam, ever.</p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

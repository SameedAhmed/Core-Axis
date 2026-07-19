"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Rocket, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: string;
}

export function ServiceModal({ isOpen, onClose, selectedPlan }: ServiceModalProps) {
    const router = useRouter();
    const [regEmail, setRegEmail] = useState("");
    const [regCaptcha, setRegCaptcha] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sentStatus, setSentStatus] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSending(true);
        try {
            const res = await fetch("/api/onboarding/send-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: regEmail, plan: selectedPlan, captchaToken: regCaptcha }),
            });
            const data = await res.json();
            if (res.status === 409) { toast.error("Account exists. Redirecting..."); setTimeout(() => router.push("/auth/signin"), 2000); return; }
            if (res.ok) { setSentStatus(true); }
            else { toast.error(data.error || "Failed to send link."); }
        } catch { toast.error("Server error."); }
        finally { setIsSending(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/10 backdrop-blur-md">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl p-8 relative shadow-2xl">
                <button onClick={onClose}
                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                </button>

                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                    <Rocket className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-black text-foreground tracking-tight mb-1">Claim Your Workspace</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter your business email to receive a secure onboarding link for your{" "}
                    <span className="text-primary font-semibold">
                        {selectedPlan === "PRO" ? "30-Day Trial" : selectedPlan === "STARTER" ? "14-Day Trial" : "Free Workspace"}.
                    </span>
                </p>

                {sentStatus ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center">
                        <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-foreground">Secure link sent!</p>
                        <p className="text-xs text-muted-foreground mt-1">Check <strong>{regEmail}</strong> to complete setup.</p>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="email" required placeholder="business@company.com"
                                value={regEmail} onChange={e => setRegEmail(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors" />
                        </div>
                        <div className="flex justify-center mb-2 scale-[0.85]">
                            <Turnstile 
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACudyfUa5v4R9t3M"} 
                                onSuccess={setRegCaptcha}
                            />
                        </div>
                        <button type="submit" disabled={isSending || !regCaptcha}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60">
                            {isSending
                                ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                : <><ArrowRight className="w-4 h-4" /> Request Secure Access</>}
                        </button>
                        <p className="text-[11px] text-muted-foreground text-center">By continuing you agree to our Terms of Service.</p>
                    </form>
                )}
            </div>
        </div>
    );
}

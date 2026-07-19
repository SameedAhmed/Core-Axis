"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck, Activity, BarChart3, Users, Power, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ServiceModal } from "@/components/landing/service-modal";

export default function SignInPage() {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [show2FA, setShow2FA] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // Handle Mobile Environment and Exit Capability
    useEffect(() => {
        if (typeof window !== "undefined") {
            const userAgent = window.navigator.userAgent;
            if (userAgent.includes("DigiXCrm-Capacitor-Mobile")) {
                setIsMobile(true);
            }
        }
    }, []);

    const handleExitApp = async () => {
        try {
            const { App } = await import('@capacitor/app');
            await App.exitApp();
        } catch (error) {
            console.error("Failed to exit app:", error);
        }
    };

    // Modal State for New Organization Onboarding
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [regPlan, setRegPlan] = useState("PRO");

    const onOpenRegisterModal = (planTier: string) => {
        setRegPlan(planTier);
        setIsModalOpen(true);
    };

    // Handle URL errors (like AccessDenied from the signIn callback)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const errorParam = urlParams.get("error");
            if (errorParam === "AccessDenied") {
                setMessage({ type: "error", text: "Access Denied: You must be invited by an Administrator to log in." });
            } else if (errorParam === "PaymentRequired") {
                setMessage({ type: "error", text: "Subscription Required: Please complete your Enterprise payment setup to activate your workspace." });
            }
        }
    }, []);

    const handleCredentialsSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        const res = await signIn("credentials", {
            email,
            password,
            code: show2FA ? totpCode : undefined,
            redirect: false,
        });

        if (res?.error) {
            if (res.error === "2FA_REQUIRED") {
                setShow2FA(true);
                setMessage({ type: "success", text: "Please enter your 2FA code from your authenticator app." });
            } else if (res.error === "2FA_INVALID") {
                setMessage({ type: "error", text: "Invalid 2FA code. Please try again." });
            } else if (res.error === "USER_SUSPENDED") {
                setMessage({ type: "error", text: "Access Blocked: Your individual account has been suspended by your administrator." });
            } else if (res.error === "ORGANIZATION_SUSPENDED") {
                setMessage({ type: "error", text: "Organization Access Denied: This company's account is currently suspended for system review." });
            } else if (res.error === "PAYMENT_REQUIRED") {
                setMessage({ type: "error", text: "Subscription Required: Please complete your Enterprise payment setup to activate your workspace." });
            } else {
                setMessage({ type: "error", text: "Invalid credentials. Please try again." });
            }
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-background flex w-full relative overflow-hidden transition-colors duration-300">
            {/* Theme Toggle in top left */}
            <div className="absolute top-6 left-6 z-50">
                <ThemeToggle />
            </div>

            {/* Exit App button in top right (Mobile Only) */}
            {isMobile && (
                <div className="absolute top-6 right-6 z-50 animate-in fade-in zoom-in duration-500">
                    <button
                        onClick={handleExitApp}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/10 dark:border-black/10 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-300 shadow-sm"
                    >
                        <span className="text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Exit App</span>
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Secure Onboarding Modal (Magic Link Flow) */}
            <ServiceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                selectedPlan={regPlan} 
            />

            {/* left column: FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative z-10">
                
                {/* Responsive Background Effects for the Form Side */}
                <div className="absolute z-[-1] top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] bg-primary/10 animate-[pulse_10s_ease-in-out_infinite_alternate]" />
                <div className="absolute z-[-1] bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-[#0d1b4b]/10 animate-[pulse_12s_ease-in-out_infinite_alternate-reverse]" />

                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="mb-8 text-left">
                        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 shadow-xl bg-gradient-to-br from-[#0d1b4b] to-[#1a3a8f] overflow-hidden group">
                            <div className="absolute inset-0 bg-white/10 opacity-20 mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-white relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-500">
                                <rect width="32" height="32" rx="7" fill="transparent"/>
                                <rect x="5" y="20" width="5" height="7" rx="1.5" fill="white" opacity="0.5"/>
                                <rect x="13" y="15" width="5" height="12" rx="1.5" fill="white" opacity="0.75"/>
                                <rect x="21" y="9" width="5" height="18" rx="1.5" fill="white"/>
                                <polyline points="23.5,4 26,8.5 21,8.5" fill="white"/>
                            </svg>
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-2 leading-tight">
                            Welcome Back
                        </h1>
                        <p className="text-muted-foreground text-[13px] sm:text-sm font-medium leading-relaxed">
                            Log in to <span className="text-primary font-bold">DigiXCrm</span> to manage your leads and sales.
                        </p>
                    </div>

                    <div className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(13,27,75,0.15)] hover:shadow-[0_30px_70px_-15px_rgba(13,27,75,0.15)] transition-shadow duration-500">
                        <form onSubmit={handleCredentialsSignIn} className="space-y-6">
                            {message.text && (
                                <div className={`p-4 rounded-xl border text-[13px] text-center font-bold animate-in fade-in zoom-in-95 duration-300 ${message.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-5">
                                {!show2FA ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="block w-full pl-11 pr-4 py-3.5 bg-background border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold shadow-sm hover:border-primary/50"
                                                    placeholder="you@company.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-sm font-semibold tracking-tight text-foreground">Password</label>
                                                <a href="/auth/forgot-password" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                                                    Forgot password?
                                                </a>
                                            </div>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="block w-full pl-11 pr-4 py-3.5 bg-background border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary transition-all sm:text-sm font-medium shadow-sm hover:border-primary/50"
                                                    placeholder="••••••••"
                                                    autoComplete="current-password"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 py-2">
                                        <div className="text-center space-y-2 mb-8">
                                            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-4 shadow-[0_0_40px_-10px_rgba(13,27,75,0.3)]">
                                                <ShieldCheck className="w-8 h-8 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground tracking-tight">Two-Factor Authorization</h3>
                                            <p className="text-sm text-muted-foreground px-4">
                                                Enter the 6-digit code from your authenticator device to verify your identity.
                                            </p>
                                        </div>
                                        
                                        <div className="relative group/input max-w-[280px] mx-auto">
                                            <input
                                                type="text"
                                                required
                                                value={totpCode}
                                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                                maxLength={6}
                                                className="block w-full px-4 py-4 bg-background/50 border-2 border-primary/20 rounded-2xl text-foreground placeholder:text-muted-foreground/30 placeholder:font-light focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono tracking-[0.5em] text-center text-4xl font-black shadow-inner"
                                                placeholder="000000"
                                                autoComplete="one-time-code"
                                                autoFocus
                                            />
                                            <div className="flex justify-center space-x-2 mt-4">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${i < totpCode.length ? 'bg-primary scale-100 shadow-[0_0_10px_rgba(13,27,75,0.5)]' : 'bg-muted/50 scale-95'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div
                                            className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 mt-8 cursor-pointer w-fit mx-auto"
                                            onClick={() => setShow2FA(false)}
                                        >
                                            <ArrowRight className="w-4 h-4 rotate-180" />
                                            Back to login
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={loading || !email || !password}
                                className="w-full flex justify-center items-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-allowed shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-[#0d1b4b] hover:to-primary hover:shadow-primary/40 active:scale-[0.98] group"
                            >
                                <span className="mr-2 text-base">{show2FA ? "Verify Code & Sign In" : "Sign In to Workspace"}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    </div>

                    <p className="mt-10 text-center text-[13px] text-muted-foreground font-semibold tracking-tight">
                        Need a workspace for your team? <button onClick={() => onOpenRegisterModal("PRO")} className="text-primary hover:text-primary/80 transition-colors decoration-primary/30 underline-offset-4 hover:underline">Create an organization →</button>
                    </p>
                </div>
            </div>

            {/* Right column: ANIMATED VISUAL (Hidden on small screens) */}
            <div className="hidden lg:flex w-1/2 bg-zinc-950 dark:bg-zinc-50 relative overflow-hidden items-center justify-center border-l border-border/10">
                {/* Animated gradient meshes */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] bg-primary/20 animate-[pulse_10s_ease-in-out_infinite_alternate]" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[160px] bg-[#0d1b4b]/20 animate-[pulse_14s_ease-in-out_infinite_alternate-reverse]" />
                <div className="absolute top-[30%] left-[30%] w-[50%] h-[50%] rounded-full blur-[140px] bg-[#0d1b4b]/40 animate-[pulse_8s_ease-in-out_infinite_alternate]" />
                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 dark:from-zinc-50 via-transparent to-transparent z-[1]" />

                {/* Powered By Header */}
                <div className="absolute top-12 left-0 right-0 z-20 flex justify-center animate-in fade-in slide-in-from-top-8 duration-1000">
                    <a
                        href="https://digixcrm.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/10 dark:border-black/10 hover:bg-white/10 dark:hover:bg-black/10 hover:shadow-[0_8px_32px_rgba(13,27,75,0.2)] transition-all duration-300 group hover:-translate-y-0.5"
                    >
                        <span className="text-sm font-semibold text-white/80 dark:text-zinc-600 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors tracking-wide">
                            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 dark:from-primary dark:to-blue-700 font-black ml-1">DigiXCrm Automation</span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-cyan-400 dark:text-cyan-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                </div>

                {/* Floating Glassmorphism Elements (Mock UI) */}
                <div className="relative z-10 w-full max-w-lg perspective-1000 rotate-y-[-10deg] rotate-x-[5deg] animate-[float_6s_ease-in-out_infinite]">

                    {/* Main Mock Card */}
                    <div className="bg-white/5 dark:bg-white/60 backdrop-blur-xl border border-white/10 dark:border-black/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 dark:from-white/40 to-transparent"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 dark:bg-primary/10 flex items-center justify-center border border-primary/30 dark:border-primary/20">
                                    <Activity className="w-5 h-5 text-primary dark:text-primary" />
                                </div>
                                <div className="px-3 py-1 bg-white/5 dark:bg-black/5 rounded-full border border-white/10 dark:border-black/10 text-[10px] font-medium text-white/70 dark:text-zinc-600 uppercase tracking-wider">
                                    Live Pipeline
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-white/60 dark:text-zinc-500 text-sm font-medium">Total Monthly Revenue</p>
                                <p className="text-4xl font-extrabold text-white dark:text-zinc-900 tracking-tight">$124,500<span className="text-white/40 dark:text-zinc-400 text-2xl">.00</span></p>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-black/40 dark:bg-white/40 rounded-2xl p-4 border border-white/5 dark:border-black/5 hover:border-primary/30 transition-colors">
                                    <BarChart3 className="w-5 h-5 text-primary dark:text-primary mb-2" />
                                    <p className="text-xs text-white/50 dark:text-zinc-500 font-medium mb-0.5">Conversion Rate</p>
                                    <p className="text-lg text-white dark:text-zinc-900 font-bold">24.8%</p>
                                </div>
                                <div className="bg-black/40 dark:bg-white/40 rounded-2xl p-4 border border-white/5 dark:border-black/5 hover:border-blue-500/30 transition-colors">
                                    <Users className="w-5 h-5 text-blue-400 dark:text-blue-600 mb-2" />
                                    <p className="text-xs text-white/50 dark:text-zinc-500 font-medium mb-0.5">Active Leads</p>
                                    <p className="text-lg text-white dark:text-zinc-900 font-bold">1,492</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating notification mock */}
                    <div className="absolute -right-8 top-10 bg-black/40 dark:bg-white/60 backdrop-blur-xl border border-white/10 dark:border-black/5 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transform translate-z-10 animate-[float_5s_ease-in-out_infinite_0.5s]">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/20 dark:bg-primary/10 flex items-center justify-center border border-primary/30 dark:border-primary/20">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-white dark:text-zinc-900 text-sm font-bold">System Secured</p>
                                <p className="text-primary/80 dark:text-primary text-xs font-medium">Webhooks active</p>
                            </div>
                        </div>
                    </div>

                    {/* Floating stat mock */}
                    <div className="absolute -left-12 -bottom-6 bg-black/40 dark:bg-white/60 backdrop-blur-xl border border-white/10 dark:border-black/5 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transform translate-z-20 animate-[float_7s_ease-in-out_infinite_1s]">
                        <p className="text-xs text-white/60 dark:text-zinc-500 font-semibold uppercase tracking-wider mb-1">Q3 Growth</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#0d1b4b] dark:from-primary dark:to-[#0d1b4b]">+84%</span>
                            <span className="text-white/40 dark:text-zinc-400 text-sm font-medium">vs last</span>
                        </div>
                    </div>
                </div>

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CgkJPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIi8+CgkJPHBhdGggZD0iTTAgNDBoNDBNNDAgMHY0MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz4KCTwvc3ZnPg==')] z-0 pointer-events-none opacity-40 mix-blend-screen dark:opacity-20 dark:invert dark:mix-blend-multiply" />
            </div>

            {/* Injected custom animations */}
            <style jsx global>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotateX(5deg) rotateY(-10deg); }
                    50% { transform: translateY(-20px) rotateX(10deg) rotateY(-5deg); }
                    100% { transform: translateY(0px) rotateX(5deg) rotateY(-10deg); }
                }
                @keyframes scaleIn {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}

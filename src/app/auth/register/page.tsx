"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Briefcase, Mail, Lock, Building, Zap } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [plan, setPlan] = useState(searchParams.get('plan') || 'FREE');
    const [isTokenValid, setIsTokenValid] = useState(false);

    const [form, setForm] = useState({
        name: "",
        companyName: "",
        email: "",
        password: ""
    });
    const [isLoading, setIsLoading] = useState(false);

    // Effect to validate token or block direct access
    useEffect(() => {
        if (!token) {
            router.push("/");
            return;
        }

        setIsLoading(true);
        fetch(`/api/auth/registration-token?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setForm(prev => ({ ...prev, email: data.email }));
                    setPlan(data.planTier);
                    setIsTokenValid(true);
                    toast.success("Magic Link Validated: Please complete your setup!");
                } else {
                    toast.error(data.error || "Invalid or expired registration link.");
                    setTimeout(() => router.push("/"), 2000);
                }
            })
            .catch(() => toast.error("Connection error while validating link."))
            .finally(() => setIsLoading(false));
    }, [token, router]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Register via API
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, plan, token })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Registration failed.");
                return;
            }

            toast.success("Workspace created successfully! Securely logging you in...");

            // Instantly grab their token from Credentials
            const loginRes = await signIn("credentials", {
                email: form.email,
                password: form.password,
                redirect: false
            });

            if (loginRes?.error) {
                toast.error("Failed to automatically sign in. Please try manually.");
                router.push("/auth/signin");
            } else {
                router.push("/dashboard");
            }
        } catch (error) {
            toast.error("An unexpected error occurred during signup.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Nav Header */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 w-full max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center group-hover:bg-indigo-600 transition-colors shadow-lg">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">DigiXCrm</span>
                </Link>
                <div className="mr-6"><ThemeToggle /></div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-[-10%] sm:top-[-20%] left-[-10%] sm:left-[-20%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[100px] sm:blur-[120px] bg-indigo-500/10 dark:bg-indigo-500/20 mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-[pulse_10s_ease-in-out_infinite_alternate]" />
            <div className="absolute bottom-[-10%] sm:bottom-[-20%] right-[-10%] sm:right-[-20%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[100px] sm:blur-[120px] bg-cyan-500/10 dark:bg-cyan-500/20 mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-[pulse_10s_ease-in-out_infinite_alternate-reverse]" />

            <div className="w-full max-w-md mt-12 sm:mt-0 relative z-10 perspective-1000">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight drop-shadow-sm">Start Your 14-Day Free Trial</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2 drop-shadow-sm">Experience the full power of DigiXCrm Enterprise.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl dark:shadow-none transition-all duration-300">
                    <div className="space-y-4">
                        {/* Plan Indicator Badge */}
                        <div className="flex justify-center mb-2">
                             <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">
                                 {plan} Tier Trial Active
                             </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Briefcase className="w-4 h-4" /></span>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Company / Organization</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Building className="w-4 h-4" /></span>
                                <input
                                    name="companyName"
                                    type="text"
                                    required
                                    placeholder="Acme Corp"
                                    value={form.companyName}
                                    onChange={handleChange}
                                    className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                                Work Email {isTokenValid && <span className="text-green-500 lowercase font-normal italic">(verified via magic link)</span>}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Mail className="w-4 h-4" /></span>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    readOnly={isTokenValid}
                                    placeholder="john@acmecorp.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    className={`w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors ${isTokenValid ? "opacity-70 cursor-not-allowed bg-green-500/5" : ""}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Master Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Lock className="w-4 h-4" /></span>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="Create a strong password..."
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 drop-shadow flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Start {plan} Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-white/5 space-y-4">
                        <div className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Already have an account?{" "}
                            <Link href="/auth/signin" className="text-indigo-500 hover:text-indigo-600 font-bold transition-colors">
                                Sign In
                            </Link>
                        </div>
                        
                        <div className="text-center p-3 bg-zinc-50 dark:bg-black/20 rounded-xl border border-zinc-100 dark:border-white/5">
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">High-Touch Enterprise</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Larger organization? <a href="mailto:sameed@bitaccounting.com?subject=Enterprise%20Demo%20Request" className="text-indigo-500 hover:underline font-bold transition-colors">Request an Enterprise Demo →</a>
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { Suspense } from "react";

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading registration portal...</div>}>
            <RegisterContent />
        </Suspense>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, ArrowLeft, KeySquare } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requestPasswordReset } from "@/lib/actions/users";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [success, setSuccess] = useState(false);

    const handleReq = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        const res = await requestPasswordReset(email);

        if (!res.success) {
            setMessage({ type: "error", text: res.error || "Failed to send reset link." });
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(0, 101, 82, 0.15)' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(0, 101, 82, 0.1)' }} />

            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <div className="relative w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-xl bg-gradient-to-br from-[#1e1b4b] to-indigo-400 overflow-hidden" style={{ boxShadow: '0 20px 25px -5px rgba(0, 101, 82, 0.3)' }}>
                        <div className="absolute inset-0 bg-white/10 opacity-20 mix-blend-overlay"></div>
                        <KeySquare className="w-8 h-8 text-white relative z-10 drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Forgot Password</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Enter your email address to receive a secure password reset link.
                    </p>
                </div>

                <div className="backdrop-blur-xl bg-card/60 border border-border/50 rounded-3xl p-8 shadow-2xl">
                    {!success ? (
                        <form onSubmit={handleReq} className="space-y-6">
                            {message.text && (
                                <div className={`p-3 rounded-lg border text-sm text-center ${message.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                        placeholder="Enter your email address"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white transition-all disabled:opacity-50 shadow-md bg-primary hover:bg-primary/90"
                            >
                                {loading ? "Sending link..." : "Send Reset Link"}
                                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 font-medium">
                                Check your email! If an account exists, a reset link will be sent to your inbox.
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <a href="/auth/signin" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

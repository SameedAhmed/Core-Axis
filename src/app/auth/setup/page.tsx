"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Lock, ArrowRight, User, Eye, EyeOff, Briefcase, Phone } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { completeUserSetup } from "@/lib/actions/users";
import { validateToken } from "@/lib/actions/verification";

function SetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        const e = searchParams.get("email");
        const t = searchParams.get("token");
        if (e && t) {
            setEmail(e);
            setToken(t);
            // Pre-validate token on load
            validateToken(e, t).then(res => {
                if (!res.success) {
                    setMessage({ type: "error", text: res.error || "This invitation link is no longer valid." });
                }
            });
        } else {
            setMessage({ type: "error", text: "Invalid setup link. Missing email or token." });
        }
    }, [searchParams]);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firstName || !lastName || !password || !confirmPassword) {
            setMessage({ type: "error", text: "Please fill out all fields." });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters." });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }

        setLoading(true);
        setMessage({ type: "", text: "" });

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        const res = await completeUserSetup({
            email,
            token,
            name: fullName,
            jobTitle,
            phoneNumber,
            password
        });

        if (!res.success) {
            setMessage({ type: "error", text: res.error || "Failed to complete setup." });
            setLoading(false);
        } else {
            setMessage({ type: "success", text: "Setup complete! Redirecting to login..." });
            setTimeout(() => {
                router.push("/auth/signin");
            }, 2000);
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
                        <UserPlus className="w-8 h-8 text-white relative z-10 drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Complete Setup</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Welcome to DigiXCrm! Please set your name and secure password to continue.
                    </p>
                </div>

                <div className="backdrop-blur-xl bg-card/60 border border-border/50 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSetup} className="space-y-6">
                        {message.text && (
                            <div className={`p-3 rounded-lg border text-sm text-center ${message.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    disabled={!token}
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="First Name"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    disabled={!token}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="Last Name"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    disabled={!token}
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="Professional Title (e.g. Sales Manager)"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="tel"
                                    disabled={!token}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="Phone Number (Optional)"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    disabled={!token}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="Set a secure password"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    disabled={!token}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                                    placeholder="Confirm password"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token || !password || !confirmPassword || !firstName || !lastName || (message.type === 'error' && message.text.includes("link"))}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white transition-all disabled:opacity-50 shadow-md bg-primary hover:bg-primary/90"
                        >
                            {loading ? "Setting up..." : "Complete Setup"}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SetupContent />
        </Suspense>
    );
}

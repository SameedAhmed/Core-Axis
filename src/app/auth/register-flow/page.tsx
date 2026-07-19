"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Briefcase, Lock, Building, Zap, User, Users, Megaphone, CheckCircle2, Eye, EyeOff, Phone } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function RegistrationFlowContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // Screening Questionnaire Data
    const [personalOrOrg, setPersonalOrOrg] = useState("");
    const [employeeSize, setEmployeeSize] = useState("");
    const [foundUsVia, setFoundUsVia] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        name: "",
        companyName: "",
        phoneNumber: "",
        password: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState({
        name: "",
        companyName: "",
        phoneNumber: "",
        password: "",
        confirmPassword: ""
    });

    const validate = (name: string, value: string) => {
        let error = "";
        if (name === "name") {
            if (value.length < 2) error = "Full name must be at least 2 characters.";
        } else if (name === "companyName") {
            if (value.length < 2) error = "Company name must be at least 2 characters.";
        } else if (name === "phoneNumber") {
            const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic E.164-ish regex
            if (!phoneRegex.test(value.replace(/[\s-()]/g, ""))) error = "Please enter a valid phone number (e.g., +1234567890).";
        } else if (name === "password") {
            if (value.length < 8) error = "Password must be at least 8 characters.";
        } else if (name === "confirmPassword") {
            if (value !== form.password) error = "Passwords do not match.";
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error === "";
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        validate(name, value);
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            toast.error("Security token missing. Please request a new link.");
            return;
        }

        // Final validation check
        const isNameValid = validate("name", form.name);
        const isCompanyValid = validate("companyName", form.companyName);
        const isPhoneValid = validate("phoneNumber", form.phoneNumber);
        const isPasswordValid = validate("password", form.password);
        const isConfirmMatch = form.password === form.confirmPassword;

        if (!isNameValid || !isCompanyValid || !isPhoneValid || !isPasswordValid || !isConfirmMatch) {
            toast.error("Please correct the errors in the form before proceeding.");
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                token,
                personalOrOrg,
                employeeSize,
                foundUsVia,
                name: form.name,
                companyName: form.companyName,
                phoneNumber: form.phoneNumber,
                password: form.password
            };

            const res = await fetch("/api/onboarding/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Onboarding failed. Your link may have expired.");
                return;
            }

            if (data.checkoutUrl) {
                toast.success("Redirecting to Premium Plan Checkout...");
                window.location.href = data.checkoutUrl;
                return;
            }

            toast.success("Workspace securely established! Logging you in...");
            router.push("/auth/signin?registered=true");

        } catch (error) {
            toast.error("An unexpected error occurred during onboarding.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold dark:text-white mb-2">Invalid or Expired Link</h1>
                <p className="text-zinc-500 max-w-sm mb-6">Your secure onboarding session token is missing or has expired. For your security, please regenerate a new link from the home page.</p>
                <Link href="/" className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-full">Return Home</Link>
            </div>
        );
    }

    // Step 1: Personal or Organization
    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">How will you use DigiXCrm?</h2>
            <p className="text-zinc-500 font-medium mb-8">We'll tailor your workspace interface strictly based on your operational scale.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => { setPersonalOrOrg("Organization"); nextStep(); }}
                    className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-zinc-200 dark:border-white/10 rounded-2xl bg-white dark:bg-zinc-900 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-300 group"
                >
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                        <Building className="w-8 h-8 text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div>
                        <p className="font-bold text-lg dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Organization Setup</p>
                        <p className="text-sm text-zinc-500 mt-1">For scaling teams and agencies</p>
                    </div>
                </button>

                <button 
                    onClick={() => { setPersonalOrOrg("Personal"); nextStep(); }}
                    className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-zinc-200 dark:border-white/10 rounded-2xl bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-300 group"
                >
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                        <User className="w-8 h-8 text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div>
                        <p className="font-bold text-lg dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Personal / Solo</p>
                        <p className="text-sm text-zinc-500 mt-1">For independent freelancers</p>
                    </div>
                </button>
            </div>
        </div>
    );

    // Step 2: Employee Size
    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">What is your Employee Size?</h2>
            <p className="text-zinc-500 font-medium mb-8">This determines your default PBAC architecture configurations.</p>
            
            <div className="grid grid-cols-2 gap-4">
                {["1 - 5", "6 - 20", "21 - 50", "51+"].map((size) => (
                    <button 
                        key={size}
                        onClick={() => { setEmployeeSize(size); nextStep(); }}
                        className="py-6 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg dark:hover:shadow-indigo-500/10 transition-all font-bold dark:text-white text-lg flex flex-col items-center justify-center gap-2 group"
                    >
                        <Users className="w-6 h-6 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                        {size} Seats
                    </button>
                ))}
            </div>
        </div>
    );

    // Step 3: Where did you hear about us
    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">How did you discover DigiXCrm?</h2>
            <p className="text-zinc-500 font-medium mb-8">We are actively expanding and love to know what Marketing Channels work best.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Google Search", "Facebook / Meta Ads", "LinkedIn", "Word of Mouth", "YouTube", "Other"].map((channel) => (
                    <button 
                        key={channel}
                        onClick={() => { setFoundUsVia(channel); nextStep(); }}
                        className="p-4 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-lg dark:hover:shadow-cyan-500/10 transition-all font-bold dark:text-white text-left flex items-center justify-between group"
                    >
                        <span>{channel}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>
        </div>
    );

    // Step 4: Final Database Identity Setup
    const renderStep4 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Complete Your Administrator Profile</h2>
            <p className="text-zinc-500 font-medium mb-8">Your email was successfully securely verified. Claim your workspace identity below to compile your private partition.</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Your Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><User className="w-4 h-4" /></span>
                        <input name="name" type="text" required placeholder="Jane Doe" value={form.name} onChange={handleChange} className={`w-full bg-zinc-100 dark:bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-colors font-medium ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-white/10 focus:border-indigo-500'}`} />
                    </div>
                    {errors.name && <p className="text-[10px] text-red-500 ml-1 font-bold">{errors.name}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{personalOrOrg === "Personal" ? "Workspace Alias" : "Company / Organization Name"} <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Briefcase className="w-4 h-4" /></span>
                        <input name="companyName" type="text" required placeholder={personalOrOrg === "Personal" ? "Jane's Workspace" : "Acme Corporation"} value={form.companyName} onChange={handleChange} className={`w-full bg-zinc-100 dark:bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-colors font-medium ${errors.companyName ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-white/10 focus:border-indigo-500'}`} />
                    </div>
                    {errors.companyName && <p className="text-[10px] text-red-500 ml-1 font-bold">{errors.companyName}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Phone Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Phone className="w-4 h-4" /></span>
                        <input name="phoneNumber" type="tel" required placeholder="+1 (555) 000-0000" value={form.phoneNumber} onChange={handleChange} className={`w-full bg-zinc-100 dark:bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-colors font-medium ${errors.phoneNumber ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-white/10 focus:border-indigo-500'}`} />
                    </div>
                    {errors.phoneNumber && <p className="text-[10px] text-red-500 ml-1 font-bold">{errors.phoneNumber}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Master Password <span className="text-red-500">*</span></label>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"><Lock className="w-4 h-4" /></span>
                        <input 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            required 
                            placeholder="Create a highly secure password..." 
                            value={form.password} 
                            onChange={handleChange} 
                            className={`w-full bg-zinc-100 dark:bg-black/50 border rounded-xl py-4 pl-12 pr-12 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-colors font-medium ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-white/10 focus:border-indigo-500'}`} 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-500 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-[10px] text-red-500 ml-1 font-bold">{errors.password}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Confirm Master Password <span className="text-red-500">*</span></label>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></span>
                        <input 
                            name="confirmPassword" 
                            type={showPassword ? "text" : "password"} 
                            required 
                            placeholder="Verify your password..." 
                            value={form.confirmPassword} 
                            onChange={handleChange} 
                            className={`w-full bg-zinc-100 dark:bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-colors font-medium ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-white/10 focus:border-indigo-500'}`} 
                        />
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 ml-1 font-bold">{errors.confirmPassword}</p>}
                </div>


                {/* Turnstile Captcha Removed by global request */}

                <button
                    type="submit" disabled={isLoading}
                    className="w-full mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-lg py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Compile Workspace Engine <CheckCircle2 className="w-5 h-5" /></>}
                </button>
            </form>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Nav Header */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 w-full max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">DigiXCrm</span>
                </Link>
                <div className="mr-6"><ThemeToggle /></div>
            </div>

            {/* Background Decorations */}
            <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 mix-blend-multiply z-0 pointer-events-none" />

            {/* Stepper Wizard Container */}
            <div className="w-full max-w-2xl relative z-10 mt-12 md:mt-0">
                {/* Progress Indicators */}
                <div className="flex items-center gap-2 mb-12 max-w-[200px]">
                    {[1, 2, 3, 4].map((idx) => (
                        <div key={idx} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= idx ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                    ))}
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-zinc-200/50 dark:border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl dark:shadow-none transition-all duration-300">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </div>
            </div>
        </div>
    );
}

import { Suspense } from "react";

export default function RegistrationFlowPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Initializing secure onboarding...</div>}>
            <RegistrationFlowContent />
        </Suspense>
    );
}

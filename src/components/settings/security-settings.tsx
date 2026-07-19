"use client";

import { useState } from "react";
import { generate2FA, verifyAndEnable2FA, disable2FA } from "@/lib/actions/2fa";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Smartphone, CheckCircle2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { Lock, Globe } from "lucide-react";

export function SecuritySettings({ user }: { user: any }) {
    const [is2FAEnabled, setIs2FAEnabled] = useState(user.isTwoFactorEnabled || false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [totpInput, setTotpInput] = useState("");
    const [isSetupState, setIsSetupState] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const SUPER_ADMIN = "admin@crm.com"; 
    const isSuperAdmin = user.email === SUPER_ADMIN;



    const startSetup = async () => {
        setIsLoading(true);
        const res = await generate2FA();
        if (res.success) {
            setQrCode(res.qrCodeUrl!);
            setIsSetupState(true);
        } else {
            toast.error(res.error || "Failed to start 2FA setup");
        }
        setIsLoading(false);
    };

    const verifySetup = async () => {
        if (totpInput.length < 6) return toast.error("Please enter a valid 6-digit code");
        setIsLoading(true);
        const res = await verifyAndEnable2FA(totpInput);
        if (res.success) {
            toast.success("2FA successfully enabled!");
            setIs2FAEnabled(true);
            setIsSetupState(false);
            setQrCode(null);
            setTotpInput("");
        } else {
            toast.error(res.error || "Invalid code. Please try again.");
        }
        setIsLoading(false);
    };

    const handleDisable = async () => {
        setIsLoading(true);
        const res = await disable2FA();
        if (res.success) {
            toast.success("2FA successfully disabled.");
            setIs2FAEnabled(false);
            setIsSetupState(false);
        } else {
            toast.error(res.error || "Failed to disable 2FA.");
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" /> Two-Factor Authentication (2FA)
                    </CardTitle>
                    <CardDescription>
                        Protect your account by requiring an authenticator code when you log in.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {is2FAEnabled ? (
                        <div className="flex flex-col items-center justify-center p-6 border border-indigo-500/20 bg-indigo-500/5 rounded-xl">
                            <CheckCircle2 className="w-12 h-12 text-indigo-500 mb-4" />
                            <h3 className="text-lg font-bold text-foreground">2FA is Currently Enabled</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1 mb-6">
                                Your account is secured. You will be prompted to enter a code from your authenticator app every time you log in.
                            </p>
                            <Button variant="destructive" onClick={handleDisable} disabled={isLoading}>
                                Disable 2FA
                            </Button>
                        </div>
                    ) : isSetupState && qrCode ? (
                        <div className="flex flex-col md:flex-row gap-10 items-center justify-center p-8 border border-border/50 rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 shadow-inner relative overflow-hidden">
                            {/* Decorative Background Blob */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                            {/* Left Side: QR Code */}
                            <div className="flex flex-col items-center shrink-0">
                                <div className="bg-white p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-muted/50 relative w-56 h-56 group transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,101,82,0.2)] hover:-translate-y-1">
                                    <Image src={qrCode} alt="2FA QR Code" fill className="object-cover p-2 rounded-xl" unoptimized />
                                    <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl scale-105 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                                </div>
                            </div>

                            {/* Right Side: Instructions & Input */}
                            <div className="w-full max-w-sm space-y-6 flex flex-col justify-center relative z-10">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
                                        Scan & Verify
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Open your authenticator app (e.g., Google Authenticator, Authy) and scan the QR code. Then, verify the generated code below to activate.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Secure Verification Code</label>
                                    <Input 
                                        placeholder="000000" 
                                        className="text-center tracking-[0.5em] text-3xl font-mono font-black bg-background/50 shadow-inner h-16 rounded-xl border-primary/20 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 placeholder:font-light"
                                        value={totpInput}
                                        onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                                        maxLength={6}
                                        autoComplete="off"
                                    />
                                    <div className="h-1 flex justify-center space-x-2 mt-2">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className={`h-1 w-8 rounded-full transition-colors duration-300 ${i < totpInput.length ? 'bg-primary' : 'bg-muted'}`} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button 
                                        className="flex-1 h-12 font-bold shadow-md hover:shadow-lg transition-all" 
                                        onClick={verifySetup} 
                                        disabled={isLoading || totpInput.length < 6}
                                    >
                                        Activate Protection
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="h-12 px-6 font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors" 
                                        onClick={() => setIsSetupState(false)} 
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 border border-border border-dashed rounded-xl bg-muted/20">
                            <Smartphone className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-foreground">Add Extra Security</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1 mb-6">
                                Two-factor authentication (2FA) adds an extra layer of security to your account.
                            </p>
                            <Button onClick={startSetup} disabled={isLoading} className="font-bold">
                                Setup Authenticator App
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Global Cloudflare Protection control removed by global request */}

            <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-muted-foreground flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Active Sessions
                    </CardTitle>
                    <CardDescription>
                        Coming soon: View and revoke access to active sessions on other devices.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}

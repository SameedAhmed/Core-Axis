"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Puzzle, MessageSquare, Fingerprint, Loader2, CheckCircle2, AlertTriangle, Mail, Send, Search } from "lucide-react";
import { saveIntegrationSettings, testMetaConnection, testSmtpConnection } from "@/lib/actions/integrations";
import { useRouter } from "next/navigation";

export function IntegrationsTab({ initialIntegrations }: { initialIntegrations: any[] }) {
    const defaultMeta = initialIntegrations.find(i => i.provider === "META") || { isActive: false, webhookSecret: "", apiKey: "" };
    const defaultWa = initialIntegrations.find(i => i.provider === "WHATSAPP") || { isActive: false, webhookSecret: "", apiKey: "" };
    const defaultWp = initialIntegrations.find(i => i.provider === "WPFORMS") || { isActive: false, webhookSecret: "", apiKey: "" };
    const router = useRouter();
    const defaultSmtp = initialIntegrations.find(i => i.provider === "SMTP") || { 
        isActive: false, 
        smtpHost: "", 
        smtpPort: 587, 
        smtpUser: "", 
        smtpPass: "", 
        smtpFrom: "" 
    };

    // Meta Config State
    const [metaActive, setMetaActive] = useState(defaultMeta.isActive);
    const [metaSecret, setMetaSecret] = useState(defaultMeta.webhookSecret || "");
    const [metaToken, setMetaToken] = useState(defaultMeta.apiKey || "");

    // WhatsApp Config State (apiKey = Access Token, webhookSecret = Phone ID)
    const [waActive, setWaActive] = useState(defaultWa.isActive);
    const [waPhoneId, setWaPhoneId] = useState(defaultWa.webhookSecret || "");
    const [waToken, setWaToken] = useState(defaultWa.apiKey || "");

    // WPForms Config State (webhookSecret = X-WP-Webhook-Secret)
    const [wpActive, setWpActive] = useState(defaultWp.isActive);
    const [wpSecret, setWpSecret] = useState(defaultWp.webhookSecret || "");
    const [wpDomain, setWpDomain] = useState<string | null>(null);
    const [wpLastSync, setWpLastSync] = useState<string | null>(null);

    // SMTP Config State
    const [smtpActive, setSmtpActive] = useState(defaultSmtp.isActive);
    const [smtpHost, setSmtpHost] = useState(defaultSmtp.smtpHost || "");
    const [smtpPort, setSmtpPort] = useState(defaultSmtp.smtpPort || 587);
    const [smtpUser, setSmtpUser] = useState(defaultSmtp.smtpUser || "");
    const [smtpPass, setSmtpPass] = useState(defaultSmtp.smtpPass || "");
    const [smtpFrom, setSmtpFrom] = useState(defaultSmtp.smtpFrom || "");
    const [smtpIsTesting, setSmtpIsTesting] = useState(false);
    const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; error?: string } | null>(null);

    useEffect(() => {
        if (defaultWp.apiKey) {
            try {
                const data = JSON.parse(defaultWp.apiKey);
                if (data.domain) setWpDomain(data.domain);
                if (data.lastSync) setWpLastSync(new Date(data.lastSync).toLocaleString());
            } catch (e) { }
        }
    }, [defaultWp.apiKey]);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const matchSearch = (keywords: string[]) => {
        if (!searchQuery) return true;
        const lowerQ = searchQuery.toLowerCase();
        return keywords.some(k => k.toLowerCase().includes(lowerQ));
    };

    const [metaConnectionName, setMetaConnectionName] = useState<string | null>(null);
    const [metaConnectionError, setMetaConnectionError] = useState<string | null>(null);
    const [metaIsTesting, setMetaIsTesting] = useState(false);

    useEffect(() => {
        if (defaultMeta.isActive && defaultMeta.apiKey) {
            setMetaIsTesting(true);
            testMetaConnection(defaultMeta.apiKey).then((res) => {
                if (res.success && res.name) setMetaConnectionName(res.name);
                else setMetaConnectionError(res.error || "Integration verification failed");
                setMetaIsTesting(false);
            });
        }
    }, [defaultMeta.isActive, defaultMeta.apiKey]);

    const handleSaveMeta = async () => {
        setLoading(true); setSuccess(null); setMetaConnectionError(null); setMetaConnectionName(null);

        if (metaActive && metaToken) {
            setMetaIsTesting(true);
            const test = await testMetaConnection(metaToken);
            if (test.success && test.name) {
                setMetaConnectionName(test.name);
            } else {
                setMetaConnectionError(test.error || "Integration verification failed");
            }
            setMetaIsTesting(false);
        }

        const res = await saveIntegrationSettings("META", { isActive: metaActive, webhookSecret: metaSecret, apiKey: metaToken });
        if (res.success) { 
            setSuccess("META"); 
            router.refresh();
            setTimeout(() => setSuccess(null), 3000); 
        }
        else alert(res.error || "Failed");
        setLoading(false);
    };

    const handleSaveWa = async () => {
        setLoading(true); setSuccess(null);
        const res = await saveIntegrationSettings("WHATSAPP", { isActive: waActive, webhookSecret: waPhoneId, apiKey: waToken });
        if (res.success) { 
            setSuccess("WHATSAPP"); 
            router.refresh();
            setTimeout(() => setSuccess(null), 3000); 
        }
        else alert(res.error || "Failed");
        setLoading(false);
    };

    const handleSaveWp = async () => {
        setLoading(true); setSuccess(null);
        const res = await saveIntegrationSettings("WPFORMS", { isActive: wpActive, webhookSecret: wpSecret });
        if (res.success) { 
            setSuccess("WPFORMS"); 
            router.refresh();
            setTimeout(() => setSuccess(null), 3000); 
        }
        else alert(res.error || "Failed");
        setLoading(false);
    };

    const handleTestSmtp = async () => {
        setSmtpIsTesting(true);
        setSmtpTestResult(null);
        const res = await testSmtpConnection({
            host: smtpHost,
            port: Number(smtpPort),
            user: smtpUser,
            pass: smtpPass,
            from: smtpFrom
        });
        setSmtpTestResult(res);
        setSmtpIsTesting(false);
    };

    const handleSaveSmtp = async () => {
        setLoading(true); setSuccess(null);
        const res = await saveIntegrationSettings("SMTP", { 
            isActive: smtpActive, 
            smtpHost, 
            smtpPort: Number(smtpPort), 
            smtpUser, 
            smtpPass, 
            smtpFrom 
        });
        if (res.success) { 
            setSuccess("SMTP"); 
            router.refresh();
            setTimeout(() => setSuccess(null), 3000); 
        }
        else alert(res.error || "Failed");
        setLoading(false);
    };

    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://digixcrm.com';

    return (
        <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 space-y-0">
                <div className="space-y-1">
                    <CardTitle>Connected Omnichannel Integrations</CardTitle>
                    <CardDescription>Manage keys and ingestion points for external data.</CardDescription>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search integrations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-[200px] h-9 text-sm bg-background border-border"
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {matchSearch(["meta", "facebook", "graph api", "lead ads", "social"]) && (
                    <div className="space-y-4 p-5 border border-border rounded-xl bg-muted/30 hover:bg-card transition-all shadow-sm group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                                    <Puzzle className="w-5 h-5 fill-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">Facebook Meta Graph API</h4>
                                    <p className="text-xs text-muted-foreground">Ingest real-time leads from Meta Lead Ads.</p>
                                </div>
                            </div>
                            <Switch checked={metaActive} onCheckedChange={setMetaActive} />
                        </div>
                        {metaActive && (
                            <div className="pt-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Webhook Ingestion URL</Label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={`${originUrl}/api/webhooks/meta`} className="bg-card font-mono text-xs border-border h-9" />
                                        <Button size="sm" variant="secondary" className="h-9" onClick={() => navigator.clipboard.writeText(`${originUrl}/api/webhooks/meta`)}>Copy</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Webhook Verify Token</Label>
                                        <Input
                                            type="password"
                                            placeholder="Enter your verification secure challenge token..."
                                            value={metaSecret}
                                            onChange={(e) => setMetaSecret(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Used by Facebook during webhook setup</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">System Access Token</Label>
                                        <Input
                                            type="password"
                                            placeholder="EAAGm7ZCaBA..."
                                            value={metaToken}
                                            onChange={(e) => setMetaToken(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Used by the CRM to pull lead info</p>
                                    </div>
                                </div>

                                {metaIsTesting && (
                                    <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-500 rounded-lg text-xs font-semibold animate-pulse">
                                        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                                        <span>Verifying connection...</span>
                                    </div>
                                )}

                                {!metaIsTesting && metaConnectionName && (
                                    <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span>Successfully verified & connected to: <span className="font-extrabold">{metaConnectionName}</span></span>
                                    </div>
                                )}

                                {!metaIsTesting && metaConnectionError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Connection testing failed: {metaConnectionError}</span>
                                    </div>
                                )}

                                {!metaIsTesting && !metaConnectionName && !metaConnectionError && metaActive && (
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Not connected: Please enter a valid System Access Token and save.</span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={handleSaveMeta} disabled={loading} className="w-full sm:w-auto transition-all">
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (success === "META" ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null)}
                                        {success === "META" ? "Saved successfully" : "Save Meta Settings"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {matchSearch(["whatsapp", "cloud api", "message", "chat"]) && (
                    <div className="space-y-4 p-5 border border-border rounded-xl bg-muted/30 hover:bg-card transition-all shadow-sm group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
                                    <MessageSquare className="w-5 h-5 fill-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">WhatsApp Cloud API</h4>
                                    <p className="text-xs text-muted-foreground">Enable click-to-message directly from Lead cards.</p>
                                </div>
                            </div>
                            <Switch checked={waActive} onCheckedChange={setWaActive} />
                        </div>
                        {waActive && (
                            <div className="pt-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Access Token</Label>
                                        <Input
                                            type="password"
                                            placeholder="EAAGm7ZCaBA..."
                                            value={waToken}
                                            onChange={(e) => setWaToken(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Generated from Meta App Dashboard</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Phone Number ID</Label>
                                        <Input
                                            type="password"
                                            placeholder="10583920583..."
                                            value={waPhoneId}
                                            onChange={(e) => setWaPhoneId(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Sending Phone Number ID</p>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={handleSaveWa} disabled={loading} className="w-full sm:w-auto transition-all">
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (success === "WHATSAPP" ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null)}
                                        {success === "WHATSAPP" ? "Saved successfully" : "Save WhatsApp Settings"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {matchSearch(["smtp", "mail", "custom mailing", "email"]) && (
                    <div className="space-y-4 p-5 border border-border rounded-xl bg-muted/30 hover:bg-card transition-all shadow-sm group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-md">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">SMTP / Custom Mailing</h4>
                                    <p className="text-xs text-muted-foreground">Send automated client emails from your own professional domain.</p>
                                </div>
                            </div>
                            <Switch checked={smtpActive} onCheckedChange={setSmtpActive} />
                        </div>
                        {smtpActive && (
                            <div className="pt-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">SMTP Host</Label>
                                        <Input
                                            placeholder="e.g. smtp.gmail.com or mail.hosting.com"
                                            value={smtpHost}
                                            onChange={(e) => setSmtpHost(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Port</Label>
                                        <Input
                                            type="number"
                                            placeholder="587, 465, or 25"
                                            value={smtpPort}
                                            onChange={(e) => setSmtpPort(Number(e.target.value))}
                                            className="h-8 text-xs font-mono w-24"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Username (User Email)</Label>
                                        <Input
                                            placeholder="e.g. sales@company.com"
                                            value={smtpUser}
                                            onChange={(e) => setSmtpUser(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Password / App Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="Secure password or SMTP credentials..."
                                            value={smtpPass}
                                            onChange={(e) => setSmtpPass(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground">Sender "From" Email</Label>
                                        <Input
                                            placeholder="e.g. Sales Team <noreply@company.com>"
                                            value={smtpFrom}
                                            onChange={(e) => setSmtpFrom(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">This is what clients will see in their 'From' field.</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleTestSmtp} 
                                        disabled={smtpIsTesting || !smtpHost || !smtpUser || !smtpPass}
                                        className="flex-1 font-bold gap-2"
                                    >
                                        {smtpIsTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Test Connection
                                    </Button>
                                    <Button size="sm" onClick={handleSaveSmtp} disabled={loading} className="flex-1 font-bold">
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (success === "SMTP" ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null)}
                                        {success === "SMTP" ? "Saved successfully" : "Save SMTP Settings"}
                                    </Button>
                                </div>

                                {smtpTestResult && (
                                    <div className={`flex items-center gap-2 p-3 border rounded-xl animate-in fade-in slide-in-from-top-1 ${
                                        smtpTestResult.success 
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400" 
                                        : "bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                                    }`}>
                                        {smtpTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                        <div className="text-xs">
                                            <p className="font-black underline mb-0.5">{smtpTestResult.success ? "CONNECTION VERIFIED!" : "CONNECTION FAILED"}</p>
                                            <p className="font-medium opacity-80">{smtpTestResult.success ? "A test email was successfully sent to your username email." : smtpTestResult.error}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {matchSearch(["wordpress", "core", "forms", "wpforms", "zapier", "fingerprint"]) && (
                    <div className="space-y-4 p-5 border border-border rounded-xl bg-muted/30 hover:bg-card transition-all shadow-sm group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-md">
                                    <Fingerprint className="w-5 h-5 fill-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">WordPress Core & Forms</h4>
                                    <p className="text-xs text-muted-foreground">Connect custom WPForms or zapier automations securely.</p>
                                </div>
                            </div>
                            <Switch checked={wpActive} onCheckedChange={setWpActive} />
                        </div>
                        {wpActive && (
                            <div className="pt-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Webhook URL Setup (POST)</Label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={`${originUrl}/api/webhooks/wordpress`} className="bg-card font-mono text-xs border-border h-9" />
                                        <Button size="sm" variant="secondary" className="h-9" onClick={() => navigator.clipboard.writeText(`${originUrl}/api/webhooks/wordpress`)}>Copy</Button>
                                    </div>
                                </div>
                                <div className="space-y-1.5 max-w-sm">
                                    <Label className="text-[10px] font-bold text-muted-foreground">X-WP-Webhook-Secret Header</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter secure signature password..."
                                        value={wpSecret}
                                        onChange={(e) => setWpSecret(e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <p className="text-[10px] text-muted-foreground">You must append this secret token in your WordPress plugin headers.</p>
                                </div>

                                {wpDomain && (
                                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-semibold hover:cursor-default">
                                                Successfully connected receiving from: <span className="font-extrabold">{wpDomain}</span>
                                            </span>
                                        </div>
                                        <div className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700/50">
                                            Last sync: {wpLastSync || "Just now"}
                                        </div>
                                    </div>
                                )}

                                {!wpDomain && wpActive && (
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Waiting for first webhook request from WordPress...</span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={handleSaveWp} disabled={loading} className="w-full sm:w-auto transition-all">
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (success === "WPFORMS" ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null)}
                                        {success === "WPFORMS" ? "Saved successfully" : "Save WordPress Settings"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="border-t border-border/50 px-6 py-4 flex items-center gap-4">
                <p className="text-[10px] text-muted-foreground italic font-medium tracking-tight">Active connections sync locally for max performance.</p>
            </CardFooter>
        </Card>
    );
}

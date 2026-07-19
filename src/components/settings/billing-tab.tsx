"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, Zap, Shield, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updatePaymentProvider } from "@/lib/actions/workspace-settings";
import { upgradeToTrialSafe } from "@/lib/actions/subscription";
import { useRouter } from "next/navigation";

export function BillingTab({ 
    workspaces, 
    isAccountOwner = false, 
    isSuperAdmin = false 
}: { 
    workspaces: any[], 
    isAccountOwner?: boolean, 
    isSuperAdmin?: boolean 
}) {
    const defaultWorkspace = workspaces[0];
    const [selectedWorkspace, setSelectedWorkspace] = useState(defaultWorkspace?.id || "");
    const [isYearly, setIsYearly] = useState(true);
    const [savingKeys, setSavingKeys] = useState(false);
    const router = useRouter();

    // Derive initial payment provider from account before any state
    const initialProvider = defaultWorkspace?.account?.paymentProvider || "STRIPE";

    // ... rest of the states ... (omitting for chunk sanity)
    const [gateways, setGateways] = useState({
        stripe: initialProvider === "STRIPE",
        paypal: initialProvider === "PAYPAL",
        authorizeNet: initialProvider === "AUTHORIZE_NET",
        wise: initialProvider === "WISE"
    });

    const toggleGateway = (key: keyof typeof gateways) => {
        setGateways(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const activeWorkspace = workspaces.find(w => w.id === selectedWorkspace) || defaultWorkspace;
    const account = activeWorkspace?.account;
    const currentPlan = account?.planTier || "FREE";
    const paymentProvider = account?.paymentProvider || "STRIPE";
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isUpdatingProvider, setIsUpdatingProvider] = useState(false);
    const activeSeats = account?.activeSeats || 0;

    const canManageBilling = isAccountOwner || isSuperAdmin;

    const PLAN_LIMITS: Record<string, number> = {
        FREE: 2,
        STARTER: 5,
        PRO: 20,
        ENTERPRISE: 10000
    };
    const seatLimit = PLAN_LIMITS[currentPlan] || 2;

    const handleUpgrade = async (plan: string) => {
        if (!canManageBilling) {
            toast.error("Unauthorized: Only the Account Owner can manage subscriptions.");
            return;
        }

        // Enterprise is always manual meeting setup
        if (plan === "ENTERPRISE") {
            window.location.href = `mailto:digicarehouse.sales@gmail.com?subject=Enterprise Plan Upgrade Request`;
            return;
        }

        // If current plan is FREE, allow Starter/Pro trial upgrade securely.
        if (currentPlan === "FREE" && (plan === "STARTER" || plan === "PRO")) {
            setIsLoading(plan);
            const res = await upgradeToTrialSafe(activeWorkspace.id, plan as any);
            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.error(res.error);
            }
            setIsLoading(null);
            return;
        }

        // Anything else (Downgrades or paid-to-paid changes) is manual.
        window.location.href = `mailto:digicarehouse.sales@gmail.com?subject=Subscription Change Request for ${plan}`;
    };

    const handleProviderChange = async (provider: string) => {
        setIsUpdatingProvider(true);
        const res = await updatePaymentProvider(activeWorkspace.id, provider);
        if (res.success) {
            toast.success(`Default gateway set to ${provider}`);
            router.refresh();
        } else {
            toast.error(res.error || "Failed to update payment provider");
        }
        setIsUpdatingProvider(false);
    };

    if (!activeWorkspace) {
        return (
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-10 text-center">
                    <p className="text-muted-foreground">You must create a workspace first.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Overview & Workspace Selector */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-background shadow-md">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <CreditCard className="w-6 h-6 text-primary" />
                                Billing & Subscriptions
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Manage plan quotas, licenses, and enterprise security features for your organizations.
                            </CardDescription>
                        </div>
                        <div className="w-full md:w-64 space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Target Workspace</Label>
                            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                                <SelectTrigger className="w-full bg-background font-semibold shadow-sm border-border/80">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        <span className="truncate">{activeWorkspace.name}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {workspaces.map(ws => (
                                        <SelectItem key={ws.id} value={ws.id} className="font-medium">{ws.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <Separator className="bg-border/40" />
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-black tracking-tight uppercase text-foreground">
                                {currentPlan}
                            </p>
                            {currentPlan === "ENTERPRISE" && <Sparkles className="w-5 h-5 text-yellow-500" />}
                        </div>
                    </div>
                    <div className="space-y-1 border-l border-border/50 pl-6">
                        <p className="text-sm font-medium text-muted-foreground">Active Licensed Seats</p>
                        <p className="text-3xl font-black tracking-tight">
                            {activeSeats} 
                            <span className="text-base font-medium text-muted-foreground ml-1">
                                / {seatLimit === 10000 ? '∞' : seatLimit} User(s)
                            </span>
                        </p>

                    </div>

                    <div className="space-y-1 border-l border-border/50 pl-6">
                        <p className="text-sm font-medium text-muted-foreground">Payment Processor</p>
                        <Select 
                            defaultValue={paymentProvider} 
                            disabled={!canManageBilling || isUpdatingProvider}
                            onValueChange={handleProviderChange}
                        >
                            <SelectTrigger className="mt-1 font-semibold">
                                <SelectValue placeholder="Select Gateway" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STRIPE">Stripe (Cards)</SelectItem>
                                <SelectItem value="PAYPAL">PayPal</SelectItem>
                                <SelectItem value="SQUARE">Square (Cards)</SelectItem>
                                <SelectItem value="AUTHORIZE_NET">Authorize.Net</SelectItem>
                                <SelectItem value="MANUAL">Invoice (Annual Only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="plans" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 bg-muted/60 p-1">
                    <TabsTrigger value="plans" className="font-bold tracking-wide text-sm">Subscription Plans</TabsTrigger>
                    <TabsTrigger value="gateways" className="font-bold tracking-wide text-sm">Merchant Integrations</TabsTrigger>
                </TabsList>

                {/* Pricing Tiers */}
                <TabsContent value="plans" className="mt-0 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold">{canManageBilling ? 'Upgrade Your Workspace' : 'Organization Plan View'}</h3>
                        <p className="text-sm text-muted-foreground">
                            {canManageBilling 
                                ? 'Unlock advanced automation and specific granular roles.' 
                                : 'Contact your Account Owner to change plan subscription or capacity.'}
                        </p>
                    </div>
                    {canManageBilling && (
                        <div className="flex items-center gap-3 bg-muted p-1 rounded-full border border-border/50 shadow-inner hidden md:flex">
                            <button 
                                onClick={() => setIsYearly(false)}
                                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${!isYearly ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Monthly
                            </button>
                            <button 
                                onClick={() => setIsYearly(true)}
                                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all flex items-center gap-1 ${isYearly ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Yearly <Badge className={`ml-1 text-[10px] h-4 px-1.5 font-black leading-none border-0 ${isYearly ? 'bg-white/25 text-white hover:bg-white/30' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>Save 20%</Badge>
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Starter Tier */}
                    <Card className={`relative flex flex-col border-border/50 backdrop-blur-sm transition-all duration-300 ${currentPlan === 'STARTER' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card font-medium hover:border-primary/50'}`}>
                        {currentPlan === 'STARTER' && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg rounded-tr-lg">Current</div>}
                        <CardHeader>
                            <CardTitle className="text-xl">Starter</CardTitle>
                            <CardDescription>Perfect for small agile teams.</CardDescription>
                            <div className="mt-4 flex items-baseline text-4xl font-extrabold pb-2">
                                ${isYearly ? "39" : "49"}
                                <span className="ml-1 text-sm font-medium text-muted-foreground">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3 font-bold text-primary"><CheckCircle2 className="w-4 h-4" /> Up to 5 User Seats</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Up to 10,000 Leads</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> 3 Isolated Workspaces</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> 1 Sales Pipeline</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Data Export Enabled</li>
                            </ul>

                        </CardContent>
                        <CardFooter>
                            <Button className="w-full font-bold" variant={currentPlan === 'STARTER' ? 'outline' : 'default'} onClick={() => handleUpgrade('STARTER')} disabled={currentPlan === 'STARTER' || isLoading !== null || !canManageBilling}>
                                {isLoading === 'STARTER' ? 'Connecting...' : currentPlan === 'STARTER' ? 'Active Plan' : !canManageBilling ? 'Restricted Access' : currentPlan === 'FREE' ? 'Start 14-Day Trial' : 'Contact for Plan Change'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Pro Tier (Highlighted) */}
                    <Card className={`relative flex flex-col shadow-xl border-primary/50 transition-all duration-300 ${currentPlan === 'PRO' ? 'ring-2 ring-primary bg-primary/5 scale-105 z-10' : 'bg-card/90 lg:scale-105 z-10'}`}>
                        {currentPlan !== 'PRO' && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>}
                        {currentPlan === 'PRO' && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">Current</div>}
                        
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">Professional <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" /></CardTitle>
                            <CardDescription>Advanced tools for scaling revenue.</CardDescription>
                            <div className="mt-4 flex items-baseline text-4xl font-extrabold pb-2 text-primary">
                                ${isYearly ? "79" : "99"}
                                <span className="ml-1 text-sm font-medium text-muted-foreground">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-3 font-bold text-primary"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> Up to 20 Licensed Seats</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="font-semibold text-foreground">Unlimited</span> Leads & Contacts</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 10 Organizational Workspaces</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 5 Sales Pipelines</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Visual Workflow Engine</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Automated Email Sequences</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="font-semibold text-foreground">Add-Ons Marketplace</span> Access</li>
                            </ul>

                        </CardContent>
                        <CardFooter>
                            <Button className="w-full font-bold shadow-lg shadow-primary/20" variant={currentPlan === 'PRO' ? 'outline' : 'default'} onClick={() => handleUpgrade('PRO')} disabled={currentPlan === 'PRO' || isLoading !== null || !canManageBilling}>
                                {isLoading === 'PRO' ? 'Connecting...' : currentPlan === 'PRO' ? 'Active Plan' : !canManageBilling ? 'Restricted Access' : currentPlan === 'FREE' ? 'Start 30-Day Trial' : 'Contact for Plan Change'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Enterprise Tier */}
                    <Card className={`relative flex flex-col border-border/50 backdrop-blur-sm transition-all duration-300 ${currentPlan === 'ENTERPRISE' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card hover:border-primary/50'}`}>
                        {currentPlan === 'ENTERPRISE' && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg rounded-tr-lg">Current</div>}
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">Enterprise <Shield className="w-4 h-4 text-green-500" /></CardTitle>
                            <CardDescription>Maximum security & compliance.</CardDescription>
                            <div className="mt-4 flex items-baseline text-4xl font-extrabold pb-2">
                                ${isYearly ? "199" : "249"}
                                <span className="ml-1 text-sm font-medium text-muted-foreground">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Everything in Professional</li>
                                <li className="flex items-start gap-3 font-bold text-primary"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> 1,000+ Licensed Seats</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <strong className="text-foreground">Custom Roles (PBAC Matrix)</strong></li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Record-Level Audit Logs</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> SAML / SSO Integration</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Dedicated Success Manager</li>
                                <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="font-semibold text-foreground">Full Add-Ons Marketplace</span> Access</li>
                            </ul>

                        </CardContent>
                        <CardFooter>
                            <Button className="w-full font-bold bg-background text-foreground border hover:bg-muted" variant={currentPlan === 'ENTERPRISE' ? 'outline' : 'default'} onClick={() => handleUpgrade('ENTERPRISE')} disabled={currentPlan === 'ENTERPRISE' || !!isLoading || !canManageBilling}>
                                {isLoading === 'ENTERPRISE' ? 'Connecting...' : currentPlan === 'ENTERPRISE' ? 'Active Plan' : canManageBilling ? 'Contact for Enterprise' : 'Restricted Access'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                </TabsContent>

                {/* Config Payment Gateways (Admin Only) */}
                <TabsContent value="gateways" className="mt-0 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight">Integrated Payment Gateways</h3>
                            <p className="text-sm text-muted-foreground mt-1">Configure your own merchant APIs to collect payments directly from your CRM invoices and clients.</p>
                        </div>
                    </div>

                    <div className="mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-800 dark:text-orange-400 font-medium text-sm flex items-center gap-3">
                        <Shield className="w-5 h-5 shrink-0" />
                        Automated payment gateways are currently suspended per organization policy. All subscription and processing payments are completed safely via verified manual invoicing workflows.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 pointer-events-none grayscale">
                    {/* Stripe API */}
                    <Card className={`border-2 transition-all duration-300 shadow-sm ${gateways.stripe ? 'border-primary/50 bg-card shadow-primary/5' : 'border-border/60 bg-muted/20'}`}>
                        <CardHeader className="pb-4 border-b bg-background/50 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${gateways.stripe ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <span className={`font-bold font-serif italic text-xl leading-none ${gateways.stripe ? 'text-primary' : 'text-muted-foreground'}`}>S</span>
                                </div>
                                <div>
                                    <CardTitle className="text-base text-foreground">Stripe Direct</CardTitle>
                                    <Badge variant={gateways.stripe ? "default" : "secondary"} className={`mt-1 text-[10px] ${gateways.stripe ? 'bg-primary hover:bg-primary/90' : ''}`}>
                                        {gateways.stripe ? "Active" : "Disconnected"}
                                    </Badge>
                                </div>
                            </div>
                            <Switch checked={gateways.stripe} onCheckedChange={() => toggleGateway('stripe')} />
                        </CardHeader>
                        <CardContent className={`space-y-5 pt-5 transition-opacity duration-300 ${!gateways.stripe && 'opacity-50 grayscale select-none'}`}>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Publishable Key</Label>
                                <Input type="text" placeholder="pk_live_..." className="font-mono text-sm bg-background" disabled={!gateways.stripe} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Secret Key</Label>
                                <Input type="password" placeholder="sk_live_..." defaultValue="•••••••••••••••••••••••••" className="font-mono text-sm bg-background" disabled={!gateways.stripe} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* PayPal API */}
                    <Card className={`border-2 transition-all duration-300 shadow-sm ${gateways.paypal ? 'border-primary/50 bg-card shadow-primary/5' : 'border-border/60 bg-muted/20'}`}>
                        <CardHeader className="pb-4 border-b bg-background/50 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${gateways.paypal ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <span className={`font-bold font-serif italic text-xl leading-none ${gateways.paypal ? 'text-primary' : 'text-muted-foreground'}`}>P</span>
                                </div>
                                <div>
                                    <CardTitle className="text-base text-foreground">PayPal App</CardTitle>
                                    <Badge variant={gateways.paypal ? "default" : "secondary"} className={`mt-1 text-[10px] ${gateways.paypal ? 'bg-primary hover:bg-primary/90' : ''}`}>
                                        {gateways.paypal ? "Active" : "Disconnected"}
                                    </Badge>
                                </div>
                            </div>
                            <Switch checked={gateways.paypal} onCheckedChange={() => toggleGateway('paypal')} />
                        </CardHeader>
                        <CardContent className={`space-y-5 pt-5 transition-opacity duration-300 ${!gateways.paypal && 'opacity-50 grayscale select-none pointer-events-none'}`}>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Client ID</Label>
                                <Input type="text" placeholder="Enter PayPal Client ID" className="font-mono text-sm bg-background" disabled={!gateways.paypal} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Client Secret</Label>
                                <Input type="password" placeholder="Enter PayPal Secret" className="font-mono text-sm bg-background" disabled={!gateways.paypal} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Authorize.Net API */}
                    <Card className={`border-2 transition-all duration-300 shadow-sm ${gateways.authorizeNet ? 'border-amber-500/50 bg-card shadow-amber-500/5' : 'border-border/60 bg-muted/20'}`}>
                        <CardHeader className="pb-4 border-b bg-background/50 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${gateways.authorizeNet ? 'bg-amber-500/10' : 'bg-muted'}`}>
                                    <span className={`font-bold font-serif italic text-xl leading-none ${gateways.authorizeNet ? 'text-amber-600' : 'text-muted-foreground'}`}>A</span>
                                </div>
                                <div>
                                    <CardTitle className="text-base text-foreground">Authorize.Net</CardTitle>
                                    <Badge variant={gateways.authorizeNet ? "default" : "secondary"} className={`mt-1 text-[10px] ${gateways.authorizeNet ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                                        {gateways.authorizeNet ? "Active" : "Disconnected"}
                                    </Badge>
                                </div>
                            </div>
                            <Switch checked={gateways.authorizeNet} onCheckedChange={() => toggleGateway('authorizeNet')} />
                        </CardHeader>
                        <CardContent className={`space-y-5 pt-5 transition-opacity duration-300 ${!gateways.authorizeNet && 'opacity-50 grayscale select-none pointer-events-none'}`}>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">API Login ID</Label>
                                <Input type="password" placeholder="Enter API Login ID" className="font-mono text-sm bg-background" disabled={!gateways.authorizeNet} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Transaction Key</Label>
                                <Input type="password" placeholder="Enter Transaction Key" className="font-mono text-sm bg-background" disabled={!gateways.authorizeNet} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Wise API */}
                    <Card className={`border-2 transition-all duration-300 shadow-sm ${gateways.wise ? 'border-green-500/50 bg-card shadow-green-500/5' : 'border-border/60 bg-muted/20'}`}>
                        <CardHeader className="pb-4 border-b bg-background/50 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${gateways.wise ? 'bg-green-500/10' : 'bg-muted'}`}>
                                    <span className={`font-bold font-serif italic text-xl leading-none ${gateways.wise ? 'text-green-600' : 'text-muted-foreground'}`}>W</span>
                                </div>
                                <div>
                                    <CardTitle className="text-base text-foreground">Wise B2B</CardTitle>
                                    <Badge variant={gateways.wise ? "default" : "secondary"} className={`mt-1 text-[10px] ${gateways.wise ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                                        {gateways.wise ? "Active" : "Disconnected"}
                                    </Badge>
                                </div>
                            </div>
                            <Switch checked={gateways.wise} onCheckedChange={() => toggleGateway('wise')} />
                        </CardHeader>
                        <CardContent className={`space-y-5 pt-5 transition-opacity duration-300 ${!gateways.wise && 'opacity-50 grayscale select-none pointer-events-none'}`}>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">API Token</Label>
                                <Input type="password" placeholder="Enter Wise API Token" className="font-mono text-sm bg-background" disabled={!gateways.wise} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Business Profile ID</Label>
                                <Input type="text" placeholder="Enter Business Profile ID" className="font-mono text-sm bg-background" disabled={!gateways.wise} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            </Tabs>
        </div>
    );
}

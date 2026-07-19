"use client";

import { Check, UploadCloud, Building2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateWorkspaceSettings } from "@/lib/actions/workspace-settings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * A dynamic form to manage workspace organizational identity.
 */
export function CompanyGeneralSettings({ workspace }: { workspace: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(workspace?.logo || "");
    const [imageError, setImageError] = useState(false);
    const router = useRouter();

    const getComputedLogo = (val: string) => {
        if (!val) return "";
        if (val.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) || val.includes('unsplash.com') || val.startsWith('data:image') || val.startsWith('/api/')) {
            return val;
        }
        try {
            const domain = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
            if (domain && domain.includes('.')) {
                return `/api/logo?domain=${domain}`;
            }
        } catch {
            // ignore
        }
        return val;
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            id: workspace.id,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            website: formData.get("website") as string,
            industry: formData.get("industry") as string,
            timezone: formData.get("timezone") as string,
            currency: formData.get("currency") as string,
            logo: getComputedLogo(formData.get("logo") as string), 
        };

        const result = await updateWorkspaceSettings(data);
        setIsLoading(false);

        if (result.success) {
            toast.success("Identity Updated", {
                description: "Your organization branding has been synchronized successfully."
            });
            router.refresh();
        } else {
            toast.error("Update Failed", {
                description: result.error || "An unexpected error occurred."
            });
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit}>
                <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             Company Details
                        </CardTitle>
                        <CardDescription>Update your organization's legal name, primary mission, and visual branding.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Branding Row */}
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="space-y-2">
                                <Label>Organization Logo</Label>
                                <div className="relative group w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors overflow-hidden ring-offset-background focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                                    {logoPreview && !imageError ? (
                                        <img 
                                            src={getComputedLogo(logoPreview)} 
                                            alt="Logo" 
                                            className="w-full h-full object-contain p-2" 
                                            onError={() => setImageError(true)}
                                            onLoad={(e) => {
                                                e.currentTarget.style.display = 'block';
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <Building2 className="w-5 h-5" />
                                            <span className="text-[10px] font-bold tracking-widest">BRAND</span>
                                        </div>
                                    )}
                                </div>
                                <Input 
                                    name="logo" 
                                    placeholder="Company website or Image URL..." 
                                    value={logoPreview}
                                    onChange={(e) => {
                                        setLogoPreview(e.target.value);
                                        setImageError(false);
                                    }}
                                    className="h-8 text-[11px] font-mono bg-muted/30"
                                />
                            </div>

                            <div className="flex-1 w-full space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ws-name">Legal Entity Name</Label>
                                        <Input id="ws-name" name="name" defaultValue={workspace?.name || ""} placeholder="e.g. Acme Corp" className="font-semibold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ws-industry">Primary Industry</Label>
                                        <Select name="industry" defaultValue={workspace?.industry || "technology"}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select industry" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="technology">Technology / SaaS</SelectItem>
                                                <SelectItem value="marketing">Marketing Agency</SelectItem>
                                                <SelectItem value="real-estate">Real Estate</SelectItem>
                                                <SelectItem value="healthcare">Healthcare</SelectItem>
                                                <SelectItem value="finance">Finance / Fintech</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ws-website">Corporate Website</Label>
                                    <Input id="ws-website" name="website" defaultValue={workspace?.website || ""} placeholder="https://yourcompany.com" type="url" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/40" />

                        <div className="space-y-2">
                            <Label htmlFor="ws-description">Organization Overview</Label>
                            <Textarea 
                                id="ws-description" 
                                name="description" 
                                defaultValue={workspace?.description || ""} 
                                placeholder="Describe your company's core focus and values..."
                                className="min-h-[100px] bg-muted/20 focus:bg-background transition-colors"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/50 px-6 py-4 flex justify-end bg-muted/20">
                        <Button type="submit" disabled={isLoading} className="font-bold shadow-lg shadow-primary/10">
                            {isLoading ? "Synchronizing..." : "Save Identity Changes"}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Localization Card */}
                <Card className="mt-6 shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Regional & Localization</CardTitle>
                        <CardDescription>Configure the legal currency and timezone used for automated billing and lead timestamps.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ws-timezone">Organization Timezone</Label>
                                <Select name="timezone" defaultValue={workspace?.timezone || "UTC"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PKT">Pakistan Standard Time (PKT)</SelectItem>
                                        <SelectItem value="EST">US Eastern Time (EST)</SelectItem>
                                        <SelectItem value="PST">US Pacific Time (PST)</SelectItem>
                                        <SelectItem value="GMT">Greenwich Mean Time (GMT)</SelectItem>
                                        <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ws-currency">Reporting Currency</Label>
                                <Select name="currency" defaultValue={workspace?.currency || "USD"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($) - United States Dollar</SelectItem>
                                        <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                                        <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                                        <SelectItem value="PKR">PKR (₨) - Pakistani Rupee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/50 px-6 py-4 bg-muted/20">
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            These settings affect all users in this workspace.
                        </p>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

"use client";

import { useState } from "react";
import { updateUserSettings } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    User, 
    Briefcase, 
    Phone, 
    Mail, 
    Globe, 
    Clock, 
    Camera, 
    Loader2, 
    Smile,
    ShieldCheck
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const timezones = [
    { label: "UTC (Coordinated Universal Time)", value: "UTC" },
    { label: "EST (Eastern Standard Time)", value: "America/New_York" },
    { label: "PST (Pacific Standard Time)", value: "America/Los_Angeles" },
    { label: "GMT (Greenwich Mean Time)", value: "Europe/London" },
    { label: "CET (Central European Time)", value: "Europe/Paris" },
    { label: "IST (India Standard Time)", value: "Asia/Kolkata" },
    { label: "PKT (Pakistan Standard Time)", value: "Asia/Karachi" },
    { label: "JST (Japan Standard Time)", value: "Asia/Tokyo" },
    { label: "AEST (Australian Eastern Standard Time)", value: "Australia/Sydney" },
];

const languages = [
    { label: "English (United States)", value: "en-US" },
    { label: "English (United Kingdom)", value: "en-GB" },
    { label: "Español", value: "es" },
    { label: "Français", value: "fr" },
    { label: "Deutsch", value: "de" },
    { label: "Italiano", value: "it" },
    { label: "日本語", value: "ja" },
    { label: "Tiếng Việt", value: "vi" },
];

export function ProfileSettings({ initialUser }: { initialUser: any }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialUser?.name || "",
        jobTitle: initialUser?.jobTitle || "",
        phoneNumber: initialUser?.phoneNumber || "",
        bio: initialUser?.bio || "",
        timezone: initialUser?.timezone || "UTC",
        language: initialUser?.language || "en-US"
    });


    const router = useRouter();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await updateUserSettings(formData);
            if (result.success) {
                toast.success("Profile updated successfully");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update profile");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border/60 bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
                <form onSubmit={handleSave}>
                    <CardHeader className="bg-muted/30 pb-8 sm:pb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <User className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-background shadow-2xl ring-2 ring-primary/10">
                                    <AvatarImage src={`https://avatar.vercel.sh/${initialUser?.email}`} />
                                    <AvatarFallback className="text-xl md:text-2xl font-black bg-primary/10 text-primary">
                                        {formData.name.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>

                            </div>
                            <div className="text-center md:text-left space-y-1">
                                <CardTitle className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                    {formData.name || "Set your name"}
                                </CardTitle>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <CardDescription className="flex items-center gap-1.5 font-bold text-primary/80 uppercase tracking-widest text-[10px]">
                                        <ShieldCheck className="w-3 h-3" /> {initialUser?.role || "Member"} Authority
                                    </CardDescription>
                                    <Separator orientation="vertical" className="h-3 bg-primary/20" />
                                    <CardDescription className="font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" /> {initialUser?.email}
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="grid gap-8 p-6 md:p-8 -mt-6 relative z-20">
                        {/* Essential Identity */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Full Name
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="John Doe"
                                    className="h-11 rounded-xl bg-background border-border/60 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jobTitle" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Briefcase className="w-3 h-3" /> Professional Designation
                                </Label>
                                <Input
                                    id="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                                    placeholder="Senior Systems Analyst"
                                    className="h-11 rounded-xl bg-background border-border/60 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Professional Context */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Digital Contact
                                </Label>
                                <Input
                                    id="phone"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    placeholder="+1 (555) 000-0000"
                                    className="h-11 rounded-xl bg-background border-border/60 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timezone" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Temporal Synchronicity
                                </Label>
                                <Select 
                                    value={formData.timezone} 
                                    onValueChange={(v) => setFormData({...formData, timezone: v})}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-background border-border/60 font-medium">
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/40">
                                        {timezones.map(tz => (
                                            <SelectItem key={tz.value} value={tz.value} className="rounded-lg">{tz.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                <Smile className="w-3 h-3" /> Personal Narrative
                            </Label>
                            <Textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                placeholder="A brief description of your focus within the workspace..."
                                className="min-h-[100px] rounded-xl bg-background border-border/60 focus:ring-primary/20 transition-all font-medium resize-none shadow-inner"
                            />
                        </div>

                        <Separator className="bg-border/40" />

                        {/* Elite Preferences */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="language" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Interface Semantics
                                </Label>
                                <Select 
                                    value={formData.language} 
                                    onValueChange={(v) => setFormData({...formData, language: v})}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-background border-border/60 font-medium">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/40">
                                        {languages.map(lang => (
                                            <SelectItem key={lang.value} value={lang.value} className="rounded-lg">{lang.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-center p-4 rounded-2xl bg-primary/5 border border-dashed border-primary/20">
                                <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest text-center">
                                    Advanced localization prevents scheduling conflicts across global mission timelines.
                                </p>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-muted/30 border-t border-border/40 px-6 md:px-8 py-6 flex justify-between items-center">
                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                            Profile Authority Synced
                        </div>
                        <Button type="submit" disabled={loading} className="px-10 h-11 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[11px] bg-primary hover:bg-primary/90">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Commit Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

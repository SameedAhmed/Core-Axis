import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Puzzle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ADD_ONS = [
    {
        name: "Digiflow",
        description: "Project Management System",
        url: "https://digicareproducts.com/digiflow/",
        image: "/addons/digiflow.png",
        accent: "from-blue-500/20 to-purple-500/20",
        border: "group-hover:border-blue-500/50"
    },
    {
        name: "Scheduler",
        description: "Meeting and Call Scheduling",
        url: "https://digicareproducts.com/scheduler/",
        image: "/addons/scheduler.png",
        accent: "from-emerald-500/20 to-teal-500/20",
        border: "group-hover:border-emerald-500/50"
    },
    {
        name: "PeopleOS",
        description: "Human Resource Management System (HRMS)",
        url: "#",
        image: "/addons/peopleos.png",
        accent: "from-indigo-500/20 to-cyan-500/20",
        border: "group-hover:border-indigo-500/50"
    },
    {
        name: "Digitalk",
        description: "Intelligent Chatbot Integration",
        url: "#",
        image: "/addons/digitalk.png",
        accent: "from-pink-500/20 to-orange-500/20",
        border: "group-hover:border-pink-500/50"
    },
    {
        name: "Password Vault",
        description: "Secure Encrypted Password Management Portal",
        url: "#",
        image: "/addons/passwordvault.png",
        accent: "from-green-500/20 to-yellow-500/20",
        border: "group-hover:border-green-500/50"
    },
    {
        name: "Digitools",
        description: "Advanced Platform Utilities",
        url: "https://digicareproducts.com/digitools/",
        image: "/addons/digitools.png",
        accent: "from-yellow-500/20 to-amber-500/20",
        border: "group-hover:border-yellow-500/50"
    }
];

export default async function AddOnsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/auth/signin");
    }

    // Use the same pattern as settings/page.tsx
    const user = await (prisma as any).user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        redirect("/auth/signin");
    }

    const isMaster = await isSuperAdmin(user);

    // Fetch plan tier from their active workspace's account
    const activeWorkspace = await (prisma as any).workspace.findUnique({
        where: { id: user.activeWorkspaceId || "" },
        include: { account: true }
    });
    const planTier: string = activeWorkspace?.account?.planTier || "FREE";
    const hasAccess = isMaster || planTier === "PRO" || planTier === "ENTERPRISE";

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <ShieldAlert className="w-16 h-16 text-amber-500/50" />
                <h1 className="text-2xl font-bold tracking-tight">Upgrade Required</h1>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                    The Add-Ons Marketplace is available on <strong>Pro</strong> and <strong>Enterprise</strong> plans. Contact your organization admin to upgrade.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Puzzle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Add-Ons Marketplace</h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            Discover premium integrations tailored to extend your workspace capabilities.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ADD_ONS.map((addon) => {
                    const isPlaceholderUrl = addon.url === "#";

                    const CardInner = (
                        <>
                            <div className="relative w-full aspect-square border-b border-border/50 overflow-hidden bg-black flex items-center justify-center group-hover:opacity-90 transition-opacity">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={addon.image}
                                    alt={addon.name}
                                    className="object-cover w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                                <div className={`absolute inset-0 bg-gradient-to-b ${addon.accent} mix-blend-overlay`} />
                            </div>

                            <div className="p-6 relative">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-extrabold text-xl tracking-tight">
                                            {addon.name}
                                        </h3>
                                        <p className="text-sm font-medium text-muted-foreground leading-snug">
                                            {addon.description}
                                        </p>
                                    </div>

                                    {!isPlaceholderUrl && (
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                                            <ExternalLink className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>

                                {isPlaceholderUrl && (
                                    <div className="mt-4 flex items-center">
                                        <Badge variant="outline" className="bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-border/50">
                                            Coming Soon
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </>
                    );

                    const cardClassName = `group block relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${addon.border}`;

                    if (isPlaceholderUrl) {
                        return <div key={addon.name} className={cardClassName}>{CardInner}</div>;
                    }

                    return (
                        <Link key={addon.name} href={addon.url} target="_blank" rel="noopener noreferrer" className={cardClassName}>
                            {CardInner}
                        </Link>
                    );
                })}
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-muted/50 to-muted border border-border/50 text-center">
                <h4 className="font-black tracking-tight text-lg mb-2">Need a tailored solution?</h4>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                    Our enterprise architecture supports custom endpoints, white-labeled add-ons, and bespoke software routing exclusively for high-volume tenants.
                </p>
                <a
                    href="mailto:digicarehouse.sales@gmail.com?subject=Enterprise Add-On Integration Request"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-background border border-border shadow-sm text-sm font-bold cursor-pointer hover:bg-muted transition-colors"
                >
                    Contact Solutions Engineer
                </a>
            </div>
        </div>
    );
}

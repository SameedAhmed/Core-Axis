import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    Settings2,
    Globe,
    Palette,
    Users,
    Puzzle,
    ShieldCheck,
    Database,
    Zap,
    Briefcase,
    User as UserIcon,
    Building2,
    Download,
    CreditCard
} from "lucide-react";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { TeamManagement } from "@/components/settings/team-management";
import { WorkflowBuilder } from "@/components/settings/workflow-builder";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { WorkspaceManagement } from "@/components/settings/workspace-management";
import { DataExportSettings } from "@/components/settings/data-export";
import { SecuritySettings } from "@/components/settings/security-settings";
import { BillingTab } from "@/components/settings/billing-tab";
import { CustomRolesMatrix } from "@/components/settings/custom-roles-matrix";
import { SuperAdminTab } from "@/components/settings/superadmin-tab";
import { CompanyGeneralSettings } from "@/components/settings/company-general-settings";
import { OrganizationHub } from "@/components/settings/organization-hub";

import { getUsers } from "@/lib/actions/users";
import { getIntegrations } from "@/lib/actions/integrations";
import { getWorkspaces } from "@/lib/actions/workspaces";
import { getEffectiveRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { SettingsTabsEngine } from "@/components/settings/settings-tabs-engine";
import { Suspense } from "react";

export default async function SettingsPage(props: { 
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/auth/signin");
    }

    // Fetch user with expanded account details for organizational context
    const user = await (prisma as any).user.findUnique({
        where: { email: session.user.email },
        include: { 
            account: {
                include: {
                    _count: {
                        select: { users: true }
                    }
                }
            },
            workspaceMemberships: {
                include: { workspace: { include: { account: true, automationRules: true } } }
            }
        }
    });

    if (!user) {
        return <div>User not found</div>;
    }

    const isSuperAdmin = user?.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
    const isAccountOwner = (user as any).isAccountOwner;
    const accountUserCount = (user as any).account?._count?.users || 0;

    const effectiveRole = await getEffectiveRole(user);
    const isWorkspaceAdmin = effectiveRole === "ADMIN";

    // 1. Get workspaces first to determine active context
    const allWorkspaces = await getWorkspaces() as any[];
    const adminWorkspaces = allWorkspaces.filter(ws => ws.userRole === "ADMIN" || ws.userRole === "MANAGER");
    
    const activeWorkspaceId = (searchParams.workspaceId as string) || (allWorkspaces.length > 0 ? allWorkspaces[0].id : null);
    const activeWorkspace = allWorkspaces.find(ws => ws.id === activeWorkspaceId) || allWorkspaces[0];

    // 2. Fetch context-specific data
    const [teamUsers, allSystemUsers, intRes] = await Promise.all([
        getUsers(activeWorkspaceId),
        getUsers(), // Fetch global users for workspace assignment
        getIntegrations()
    ]);
    const initialIntegrations = (intRes as any).success ? ((intRes as any).integrations || []) : [];

    const customRoles = activeWorkspaceId 
        ? await (prisma as any).customRole.findMany({ where: { workspaceId: activeWorkspaceId } }) 
        : [];

    // Determine the relevant plan tier: favor the user's account, 
    // but fallback to the current workspace's account for Super Admins.
    const effectivePlanTier = (user as any).account?.planTier || (activeWorkspace as any)?.account?.planTier || "FREE";

    return (
        <div className="flex-1 space-y-6 max-w-[1200px] mx-auto pb-10 animate-in fade-in duration-500">
            <div className="flex flex-col space-y-2 pb-4 border-b border-border/50">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Settings2 className="w-8 h-8 text-primary" />
                    System Settings
                </h2>
                <p className="text-muted-foreground">
                    Master control panel for your CRM. Manage company localization, user roles, profile settings, and system-wide integrations.
                </p>
            </div>

            <Suspense fallback={<div className="h-32 w-full animate-pulse bg-muted rounded-2xl border border-border/50" />}>
                <SettingsTabsEngine>
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                        <div className="relative w-full lg:w-72">
                            {/* Mobile Scroll Gradient Overlay */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 lg:hidden pointer-events-none" />
                            <TabsList className="flex flex-row lg:flex-col h-auto bg-transparent p-0 w-full items-start justify-start border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-6 overflow-x-auto overflow-y-hidden lg:overflow-visible no-scrollbar mb-6 lg:mb-0 snap-x snap-mandatory scroll-smooth">
                            {isAccountOwner && (
                                <TabsTrigger
                                    value="organization"
                                    className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg mb-0 lg:mb-3"
                                >
                                    <Globe className="w-4 h-4" /> Organization Hub
                                </TabsTrigger>
                            )}

                            {isWorkspaceAdmin && (
                                <>
                                    <TabsTrigger
                                        value="general"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Briefcase className="w-4 h-4" /> Company
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="billing"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <CreditCard className="w-4 h-4" /> Billing
                                    </TabsTrigger>
                                </>
                            )}
                            
                            {isSuperAdmin && (
                                <TabsTrigger
                                    value="superadmin"
                                    className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all rounded-xl text-red-500 hover:text-red-400 font-bold border border-red-500/20 bg-red-500/5 mt-0 lg:mt-4"
                                >
                                    <Globe className="w-4 h-4" /> SaaS Control
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="profile"
                                className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                            >
                                <UserIcon className="w-4 h-4" /> Profile
                            </TabsTrigger>
                            <TabsTrigger
                                value="appearance"
                                className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                            >
                                <Palette className="w-4 h-4" /> Theme
                            </TabsTrigger>
                            {isWorkspaceAdmin && (
                                <>
                                    <TabsTrigger
                                        value="team"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Users className="w-4 h-4" /> Team
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="workspaces"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Building2 className="w-4 h-4" /> Workspaces
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="integrations"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Puzzle className="w-4 h-4" /> Integrations
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="workflows"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Zap className="w-4 h-4" /> Automations
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="export"
                                        className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                                    >
                                        <Download className="w-4 h-4" /> Export
                                    </TabsTrigger>
                                </>
                            )}
                            <TabsTrigger
                                value="security"
                                className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all rounded-xl text-muted-foreground hover:text-foreground font-bold border border-transparent data-[state=active]:shadow-lg"
                            >
                                <ShieldCheck className="w-4 h-4" /> Security
                            </TabsTrigger>
                            {isWorkspaceAdmin && (
                                <TabsTrigger
                                    value="database"
                                    className="whitespace-nowrap shrink-0 snap-start w-auto lg:w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all rounded-xl font-bold text-red-500 hover:text-red-600 shadow-none border border-transparent"
                                >
                                    <Database className="w-4 h-4" /> Danger Zone
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                        <div className="flex-1 min-w-0">
                            {/* ORGANIZATION HUB TAB */}
                            {isAccountOwner && (
                                <TabsContent value="organization" className="mt-0">
                                    <OrganizationHub />
                                </TabsContent>
                            )}

                            {/* GENERAL TAB */}
                            {isWorkspaceAdmin && (
                                <TabsContent value="general" className="mt-0">
                                    <CompanyGeneralSettings workspace={activeWorkspace} />
                                </TabsContent>
                            )}

                            {/* BILLING TAB */}
                            {isWorkspaceAdmin && (
                                <TabsContent value="billing" className="mt-0">
                                    <BillingTab workspaces={adminWorkspaces} isAccountOwner={isAccountOwner} isSuperAdmin={isSuperAdmin} />
                                </TabsContent>
                            )}

                            {/* PROFILE TAB */}
                            <TabsContent value="profile" className="mt-0">
                                <ProfileSettings initialUser={user} />
                            </TabsContent>

                            {/* APPEARANCE TAB */}
                            <TabsContent value="appearance" className="mt-0 space-y-6">
                                <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle>Theme & Visuals</CardTitle>
                                        <CardDescription>Personalize your workspace appearance.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <Label>Select Theme</Label>
                                            <ThemeSwitcher />
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Condensed View</Label>
                                                <p className="text-sm text-muted-foreground">Show more data in tables with less padding.</p>
                                            </div>
                                            <Switch />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t border-border/50 px-6 py-4">
                                        <Button size="sm">Apply Layout Changes</Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>

                            {/* TEAM & PERMISSIONS TAB */}
                            <TabsContent value="team" className="mt-0 space-y-6">
                                <TeamManagement 
                                    users={isAccountOwner || isSuperAdmin ? allSystemUsers : teamUsers} 
                                    workspaces={adminWorkspaces} 
                                    customRoles={customRoles} 
                                    accountTotalUsers={accountUserCount}
                                />

                                {isWorkspaceAdmin && (
                                    <CustomRolesMatrix activeWorkspace={activeWorkspace} initialRoles={customRoles} />
                                )}
                            </TabsContent>

                            {/* WORKSPACES TAB */}
                            <TabsContent value="workspaces" className="mt-0 space-y-6">
                                <WorkspaceManagement 
                                    workspaces={adminWorkspaces} 
                                    allUsers={isSuperAdmin ? allSystemUsers : teamUsers} 
                                    isAccountOwner={isAccountOwner || isSuperAdmin}
                                    planTier={effectivePlanTier}
                                />
                            </TabsContent>

                            {/* INTEGRATIONS TAB */}
                            <TabsContent value="integrations" className="mt-0">
                                <IntegrationsTab initialIntegrations={initialIntegrations} />
                            </TabsContent>

                            {/* WORKFLOWS TAB */}
                            <TabsContent value="workflows" className="mt-0">
                                <WorkflowBuilder activeWorkspace={activeWorkspace} automations={activeWorkspace?.automationRules || []} planTier={effectivePlanTier} />
                            </TabsContent>



                            {/* EXPORT TAB */}
                            <TabsContent value="export" className="mt-0">
                                <DataExportSettings workspaces={adminWorkspaces} isSuperAdmin={isSuperAdmin} />
                            </TabsContent>

                            {/* SECURITY TAB */}
                            <TabsContent value="security" className="mt-0 space-y-6">
                                <SecuritySettings user={user} />
                            </TabsContent>

                            {/* DANGER ZONE TAB */}
                            {isWorkspaceAdmin && (
                                <TabsContent value="database" className="mt-0 space-y-6">
                                    <Card className="border-red-900/50 bg-red-950/10 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-red-500 font-black tracking-tight flex items-center gap-2 italic">
                                                CRITICAL SYSTEM DANGER ZONE
                                            </CardTitle>
                                            <CardDescription className="text-red-400 font-medium tracking-tight overflow-hidden">
                                                These actions are final. No backups can restore this data once purged.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-5 border border-red-900/50 bg-card rounded-xl shadow-sm">
                                                <div>
                                                    <h4 className="font-bold text-foreground">Erase all Lead & Activity Data</h4>
                                                    <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">Permanently wipe all records from the PostgreSQL database while keeping user accounts.</p>
                                                </div>
                                                <Button variant="destructive" className="font-bold shadow-md shadow-red-900/20 px-8">Purge Data</Button>
                                            </div>
                                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-5 border border-red-900/50 bg-card rounded-xl shadow-sm">
                                                <div>
                                                    <h4 className="font-bold text-red-500">Decommission Entire Workspace</h4>
                                                    <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">Terminate all licenses, users, and cloud storage associated with this workspace.</p>
                                                </div>
                                                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-bold px-8">Explode Instance</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )}

                            {isSuperAdmin && (
                                <TabsContent value="superadmin" className="m-0 max-w-5xl">
                                    <SuperAdminTab />
                                </TabsContent>
                            )}
                        </div>
                    </div>
                </SettingsTabsEngine>
            </Suspense>
        </div>
    );
}

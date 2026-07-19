import { Sidebar } from "@/components/layout/sidebar";

import { TopBar } from "@/components/layout/top-bar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaces } from "@/lib/actions/workspaces";
import { enforceSubscriptionStatus, checkWorkspaceCapacity, getTrialStatus } from "@/lib/billing";
import { CapacityAlert } from "@/components/billing/capacity-alert";
import { TrialBanner } from "@/components/billing/trial-banner";
import { BrowserNotifications } from "@/components/notifications/browser-notifications";
import { SyncProvider } from "@/components/layout/sync-provider";
import { Separator } from "@/components/ui/separator";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

import { Role } from "@/generated/prisma/client/client";
import { isSuperAdmin } from "@/lib/permissions";


export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        // workspaceMemberships include is no longer needed as we will derive membership from the fetched workspaces
    });

    if (!user) {
        redirect("/auth/signin");
    }

    const workspaces = await getWorkspaces();
    const activeWorkspaceId = (user as any).activeWorkspaceId;

    // Use the optimized helper to determine permissions (Handles Super Admin overrides)
    const { getEffectiveRole } = await import("@/lib/permissions");
    const effectiveRole = await getEffectiveRole(user);
    const currentWorkspace = workspaces.find((ws: any) => ws.id === activeWorkspaceId);
    const isMaster = await isSuperAdmin(user);
    const planTier: string = (currentWorkspace as any)?.account?.planTier || "FREE";

    // --- BILLING / SUBSCRIPTION SYSTEM ENFORCEMENT ---
    // This helper now handles both Healing (creating missing accounts) and Trial Enforcement.
    // It reverts expired trials to FREE instead of returning null - preventing login lockouts.
    await enforceSubscriptionStatus(activeWorkspaceId);

    // 🔒 SUSPENSION ENFORCEMENT: Block access instantly if the org account has been suspended
    if (!isMaster && activeWorkspaceId) {
        const suspensionCheck = await (prisma as any).workspace.findUnique({
            where: { id: activeWorkspaceId },
            include: { account: { select: { isActive: true } } }
        });
        if (suspensionCheck?.account && suspensionCheck.account.isActive === false) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground">Account Suspended</h1>
                            <p className="text-muted-foreground mt-3 leading-relaxed">
                                Your organization's access to DigiXCrm has been suspended by the platform administrator. 
                                Please contact support to resolve this.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground">
                            📧 <a href="mailto:digicarehouse.sales@gmail.com" className="underline hover:text-foreground transition-colors">digicarehouse.sales@gmail.com</a>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // 🔒 USER SUSPENSION ENFORCEMENT: Block individual suspended users mid-session
    if (!isMaster && (user as any).isActive === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Access Revoked</h1>
                        <p className="text-muted-foreground mt-3 leading-relaxed">
                            Your individual user account has been suspended by your organization administrator. 
                            Please contact your admin to restore access.
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground">
                        📧 <a href="mailto:digicarehouse.sales@gmail.com" className="underline hover:text-foreground transition-colors">digicarehouse.sales@gmail.com</a>
                    </div>
                </div>
            </div>
        );
    }



    // 2. Check if the newly verified plan can actually handle the current data
    const capacity = await checkWorkspaceCapacity(activeWorkspaceId);

    // 🛡️ ONBOARDING GUARD: Ensure fresh accounts complete setup
    if (!isMaster && !(user as any).onboarded) {
        // Only redirect if they actually HAVE an active workspace but haven't set it up
        if (activeWorkspaceId) {
             // redirect("/dashboard/onboarding"); // Uncomment when ready
        }
    }

    // 3. Get Trial Status for UI Banner
    const trialStatus = await getTrialStatus(activeWorkspaceId);

    return (
        <div className="flex bg-background min-h-screen text-foreground selection:bg-primary/20 overflow-x-hidden w-full max-w-[100vw]">
            <BrowserNotifications />
            <SyncProvider />
            <Sidebar role={effectiveRole} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} isMaster={isMaster} planTier={planTier} />
            <main className="flex-1 md:ml-[260px] flex flex-col h-dvh overflow-hidden w-full">
                {trialStatus && trialStatus.isActive && (
                    <div className="shrink-0">
                        <TrialBanner 
                            daysRemaining={trialStatus.daysRemaining} 
                            planTier={trialStatus.planTier} 
                            role={effectiveRole}
                        />
                    </div>
                )}
                <TopBar 
                    user={{ name: user.name || "User", role: effectiveRole, email: user.email as string, isMaster }} 
                    workspace={{ name: currentWorkspace?.name || "DigiXCrm", logo: currentWorkspace?.logo || null }}
                    role={effectiveRole}
                    workspaces={workspaces}
                    activeWorkspaceId={activeWorkspaceId}
                    isMaster={isMaster}
                    planTier={planTier}
                />


                <div id="dashboard-main-content" className="flex-1 p-3 sm:p-4 md:p-6 lg:p-10 pb-20 md:pb-6 overflow-y-auto overscroll-contain flex flex-col w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="max-w-[1600px] w-full mx-auto flex-1">
                        <CapacityAlert 
                            isOverCapacity={capacity.isOverCapacity} 
                            reason={capacity.reason || null}
                            userCount={capacity.userCount ?? 0}
                            maxUsers={capacity.maxUsers ?? 0}
                            planTier={capacity.planTier || "FREE"}
                        />
                        {children}
                    </div>
                </div>

            </main>
            <MobileBottomNav
                role={effectiveRole}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                isMaster={isMaster}
                planTier={planTier}
            />
        </div>
    );
}

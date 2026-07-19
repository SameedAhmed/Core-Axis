import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    // If the user is already authenticated, redirect them to the dashboard 
    // so they cannot access signin, setup, or forgot-password forms again.
    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {children}
        </div>
    );
}

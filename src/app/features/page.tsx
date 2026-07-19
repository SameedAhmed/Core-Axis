import { Metadata } from "next";
import { FeaturesPageClient } from "./features-page-client";

export const metadata: Metadata = {
    title: "Core Features | Sales Automation & PBAC Security",
    description: "Experience the power of the Action Stream, multi-tenant workspaces, and granular PBAC security. The ultimate sales infrastructure for enterprise teams.",
    keywords: ["CRM Features", "Sales Automation Tool", "PBAC Security CRM", "Multi-Tenant Workspaces", "Workflow Automation"],
};

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            <FeaturesPageClient />
        </div>
    );
}

import { Metadata } from "next";
import { LandingPageClient } from "../landing-page-client";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ServiceModal } from "@/components/landing/service-modal";
import { FAQSection } from "@/components/landing/faq-section";

export const metadata: Metadata = {
    title: "Pricing Plans | Affordable Enterprise CRM Solutions",
    description: "Transparent CRM pricing for scaling revenue teams. Choose from our Starter, Professional, or Enterprise tiers. 14 to 30-day free trials available.",
    keywords: ["CRM Pricing", "Enterprise CRM Cost", "SaaS CRM Plans", "Sales Software Pricing"],
};

// We wrap it in a client component just for the modal/nav state
import { PricingPageClient } from "./pricing-page-client";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            <PricingPageClient />
        </div>
    );
}

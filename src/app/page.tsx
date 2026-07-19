import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { TestimonialsGrid } from "@/components/landing/testimonials-grid";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { ContactForm } from "@/components/landing/contact-form";
import { FAQSection } from "@/components/landing/faq-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ServiceModal } from "@/components/landing/service-modal";
import { Metadata } from "next";

// Simplified Home that handles the state for the modal in a clean way
// We use a small Client Component wrapper for the interactive parts
import { LandingPageClient } from "./landing-page-client";

export const metadata: Metadata = {
    title: "The Action-Oriented AI CRM for High-Velocity Teams",
    description: "Multi-tenant, PBAC-secured AI CRM built to close deals. Enterprise-grade sales automation for scaling revenue teams. Experience the future of sales infrastructure today.",
    keywords: ["AI CRM", "Sales Automation", "Enterprise Sales Software", "High-Velocity CRM", "Predictive Analytics Sales"],
};

export default function Home() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            <LandingPageClient />
        </div>
    );
}

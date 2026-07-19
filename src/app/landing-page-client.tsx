"use client";

import { useState } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { TestimonialsGrid } from "@/components/landing/testimonials-grid";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { ContactForm } from "@/components/landing/contact-form";
import { FAQSection } from "@/components/landing/faq-section";
import { ServiceModal } from "@/components/landing/service-modal";

export function LandingPageClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("FREE");

    const openModal = (plan: string) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    return (
        <>
            <LandingNav onOpenModal={openModal} />
            <main>
                <Hero onOpenModal={openModal} />
                <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border bg-muted/30">
                    <StatItem v={5000} s="+" l="Active Revenue Teams" />
                    <StatItem v={99} s="% SLA" l="Guaranteed Uptime" />
                    <StatItem v={42} s="%" l="Avg Close Rate Boost" />
                    <StatItem v={3} s=" min" l="Frictionless Onboarding" />
                </div>
                <FeaturesGrid />
                <TestimonialsGrid />
                <PricingPlans onOpenModal={openModal} />
                <FAQSection />
                <ContactForm />
            </main>
            <LandingFooter />
            <ServiceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                selectedPlan={selectedPlan} 
            />
        </>
    );
}

function StatItem({ v, s, l }: { v: number, s: string, l: string }) {
    return (
        <div className="py-4 md:py-0 text-center">
            <p className="text-2xl font-black text-foreground">{v.toLocaleString()}{s}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">{l}</p>
        </div>
    );
}

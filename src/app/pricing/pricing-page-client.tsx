"use client";

import { useState } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { PricingTable } from "@/components/landing/pricing-table";
import { FAQSection } from "@/components/landing/faq-section";
import { ServiceModal } from "@/components/landing/service-modal";

export function PricingPageClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("FREE");

    const openModal = (plan: string) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    return (
        <>
            <LandingNav onOpenModal={openModal} />
            <main className="pt-24 min-h-[70vh]">
                <PricingPlans onOpenModal={openModal} />
                <PricingTable onOpenModal={openModal} />
                <FAQSection />
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

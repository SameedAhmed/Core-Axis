"use client";

import { useState } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ContactForm } from "@/components/landing/contact-form";
import { ServiceModal } from "@/components/landing/service-modal";

export function ContactPageClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("FREE");

    const openModal = (plan: string) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    return (
        <>
            <LandingNav onOpenModal={openModal} />
            <main className="pt-24 min-h-[70vh] bg-muted/20">
                <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
                        Let's Build Your Revenue Infrastructure.
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Our solution architects are ready to help you migrate from legacy systems or build a custom sales flow from scratch. We're not just selling a CRM, we're building your future.
                    </p>
                </div>
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

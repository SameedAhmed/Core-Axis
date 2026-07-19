"use client";

import { useState } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { ActionStreamPreview } from "@/components/landing/action-stream";
import { ServiceModal } from "@/components/landing/service-modal";

export function FeaturesPageClient() {
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
                <section className="max-w-6xl mx-auto px-6 py-12">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
                         <div>
                             <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-[1.1] text-foreground">
                                 The Core of <span className="text-primary">DigiXCrm.</span>
                             </h1>
                             <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                                 Stop losing leads in messy spreadsheets. DigiXCrm surfaces your <strong className="text-foreground font-semibold">Next Best Action</strong>, keeping your sales team focused on closing, not organizing data.
                             </p>
                             <button onClick={() => openModal("PRO")}
                                className="px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all">
                                 Try Free →
                             </button>
                         </div>
                         <div className="flex justify-center">
                             <ActionStreamPreview />
                         </div>
                     </div>
                </section>
                <FeaturesGrid />
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

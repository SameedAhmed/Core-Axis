"use client";

import { useState } from "react";
import { LandingNav } from "./landing-nav";
import { LandingFooter } from "./landing-footer";
import { ServiceModal } from "./service-modal";

export function LandingContainer({ children }: { children: React.ReactNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("FREE");

    const openModal = (plan: string) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            <LandingNav onOpenModal={openModal} />
            
            <main>
                {/* We pass the openModal function to children via a pattern or just use prop drilling/context if needed. 
                    Actually, we can just use the components directly inside this container if we want, 
                    OR better: use a Context if we want true deep children to open the modal.
                */}
                {children}
            </main>

            <LandingFooter />

            <ServiceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                selectedPlan={selectedPlan} 
            />
        </div>
    );
}

import { Metadata } from "next";
import { ContactPageClient } from "./contact-page-client";

export const metadata: Metadata = {
    title: "Talk to a CRM Expert | Request a Personalized Demo",
    description: "Get in touch with our sales and solution architecture team. From solo startups to 1,000-rep enterprise operations, we're here to help you scale.",
    keywords: ["CRM Support", "Request Demo", "Sales Architecture Consultation", "Contact Sales"],
};

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            <ContactPageClient />
        </div>
    );
}

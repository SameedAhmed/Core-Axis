import { Metadata } from "next";
import { DownloadClient } from "./download-client";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
    title: "Download DigiXCrm Mobile App | Enterprise Sales Power",
    description: "Install the DigiXCrm mobile app for Android. Experience real-time sync, PBAC-secured workspace partitioning, and the high-velocity Executive Dashboard on your phone. Direct APK download available.",
    keywords: ["DigiXCrm Download", "Android CRM App", "Sales App APK", "Enterprise CRM Mobile", "DigiCare House"],
    openGraph: {
        title: "Download DigiXCrm Mobile App | High-Velocity CRM",
        description: "Experience the fastest enterprise CRM on your Android device. Direct Install verified by DigiCare House.",
        images: ["/og-image.png"], // Placeholder for brand consistency
    }
};

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
            {/* Nav integration will be handled by providing a simple no-op onOpenModal for now or integrating with the real one */}
            <DownloadClient />
            <LandingFooter />
        </div>
    );
}

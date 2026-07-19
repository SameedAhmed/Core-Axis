import { ComingSoon } from "@/components/brand/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "DigiXCrm privacy standards are being mapped for SOC2 and GDPR compliance. Data sovereignty documentation arriving soon.",
};

export default function PrivacyPage() {
    return (
        <ComingSoon 
            title="Privacy Standards in Audit" 
            description="We are currently auditing our data sovereignty protocols for total SOC2 compliance. Privacy documentation arriving soon."
        />
    );
}

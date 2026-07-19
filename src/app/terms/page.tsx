import { ComingSoon } from "@/components/brand/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "DigiXCrm legal frameworks are being finalized for Enterprise compliance. Professional Terms of Service arriving soon.",
};

export default function TermsPage() {
    return (
        <ComingSoon 
            title="Legal Terms in Review" 
            description="Our legal team is finalizing the Enterprise SaaS agreement. Professional compliance documents arriving soon."
        />
    );
}

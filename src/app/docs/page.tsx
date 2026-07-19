import { ComingSoon } from "@/components/brand/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Project Documentation",
    description: "DigiXCrm documentation is in the final stages of completion. High-velocity API specs and workflow guides arriving soon.",
};

export default function DocsPage() {
    return (
        <ComingSoon 
            title="Documentation in Progress" 
            description="Our technical writers are currently mapping every endpoint and logic flow for the DigiXCrm ecosystem. Enterprise API specs arriving soon."
        />
    );
}

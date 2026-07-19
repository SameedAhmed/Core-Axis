import { ComingSoon } from "@/components/brand/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Visual Workflow Engine",
    description: "DigiXCrm's visual automation engine is currently being finalized. Next-generation sales scaling is arriving soon.",
};

export default function WorkflowPage() {
    return (
        <ComingSoon 
            title="Workflow Engine in Production" 
            description="Our engineers are currently refining the visual drag-and-drop logic for our sales automation engine. High-velocity scaling arriving soon."
        />
    );
}

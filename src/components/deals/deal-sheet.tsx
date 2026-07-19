"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { DealStage } from "@/generated/prisma/client/client";
import { DealDetailsView } from "./deal-details-view";

type EnhancedDeal = {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    customStage?: string | null;
    organization?: { name: string } | null;
    updatedAt: Date;
};

interface DealSheetProps {
    deal: EnhancedDeal | null;
    isOpen: boolean;
    onClose: () => void;
    effectiveRole: string;
    dealStages?: any;
}

export function DealSheet({
    deal,
    isOpen,
    onClose,
    dealStages
}: DealSheetProps) {
    if (!deal) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent 
                side="right" 
                className="w-full sm:max-w-4xl overflow-y-auto p-0 flex border-l border-border bg-background"
                showCloseButton={false} 
            >
                {/* Mobile Header - Sticky */}
                <div className="sticky top-0 z-[100] w-full bg-background/95 backdrop-blur-md border-b border-border sm:hidden flex items-center justify-between px-6 py-4 h-16">
                    <h3 className="font-black text-lg tracking-tight">Deal Information</h3>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <SheetHeader className="sr-only">
                    <SheetTitle>Deal Details</SheetTitle>
                    <SheetDescription>View extended configuration and activity history for this deal.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 w-full relative">
                    {/* Desktop Close - Shadcn default is top-right absolute */}
                    <button 
                        onClick={onClose}
                        className="hidden sm:flex absolute right-4 top-4 z-50 p-2 opacity-70 hover:opacity-100 transition-opacity bg-accent rounded-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    
                    <DealDetailsView 
                        deal={deal} 
                        dealStages={dealStages} 
                        onValueUpdate={(newVal) => {
                            if (deal) deal.value = newVal;
                        }}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showText?: boolean;
}

export function Logo({ className, size = "md", showText = false }: LogoProps) {
    const [imgError, setImgError] = useState(false);
    
    const sizeMap = {
        sm: "w-8 h-8",
        md: "w-10 h-10 md:w-11 md:h-11",
        lg: "w-14 h-14",
        xl: "w-16 h-16",
    };

    return (
        <div className={cn("inline-flex items-center gap-2 group", className)}>
            {/* The exact emblem image */}
            <div className={cn("relative flex items-center justify-center shrink-0 overflow-hidden", sizeMap[size])}>
                {!imgError ? (
                    <>
                        <img 
                            src="/logo.png" 
                            alt="Emblem Light" 
                            className="w-full h-full object-contain drop-shadow-sm dark:hidden block"
                            onError={() => setImgError(true)}
                        />
                        <img 
                            src="/logo-dark.png" 
                            alt="Emblem Dark" 
                            className="w-full h-full object-contain drop-shadow-sm hidden dark:block"
                            onError={(e) => {
                                // If they haven't uploaded the dark logo yet, silently fall back to the light one rather than breaking
                                (e.target as HTMLImageElement).style.display = 'none';
                                const lightImg = (e.target as HTMLImageElement).previousElementSibling as HTMLImageElement;
                                if (lightImg) lightImg.classList.remove('dark:hidden');
                            }}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900 rounded-full animate-pulse" />
                )}
            </div>
            
            {/* Horizontal Core Axis Text */}
            {showText && (
                <div className="flex items-center">
                    <span className="text-xl md:text-2xl font-extrabold tracking-widest text-[#0d2a5a] dark:text-blue-100 uppercase whitespace-nowrap">
                        Core Axis
                    </span>
                </div>
            )}
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AppPreloader() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Detect if we are running inside the Capacitor Mobile App
        const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "";
        const isMobileApp = userAgent.includes("DigiXCrm-Capacitor-Mobile");

        if (isMobileApp) {
            setIsVisible(true);
            
            // Allow the animation to play for a premium feel
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 1200); // 1.2 seconds total (High-Velocity Tuning)

            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ 
                        opacity: 0, 
                        scale: 1.05,
                        filter: "blur(10px)",
                        transition: { duration: 0.3, ease: "easeOut" } 
                    }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d1b4b] overflow-hidden"
                >
                    {/* Premium Cyber Background Glow */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px]" />
                    </div>

                    <div className="relative flex flex-col items-center">
                        {/* Animated Logo Assembly */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="relative mb-8"
                        >
                            <svg width="120" height="120" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="32" height="32" rx="7" fill="transparent"/>
                                {/* Pulse Ring */}
                                <motion.circle
                                    cx="16" cy="16" r="14"
                                    stroke="white" strokeWidth="0.5" strokeOpacity="0.2"
                                    animate={{ 
                                        scale: [1, 1.5],
                                        opacity: [0.5, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                />
                                
                                {/* Bars Pulse */}
                                <motion.rect 
                                    x="5" y="20" width="5" height="7" rx="1.5" fill="white" 
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                />
                                <motion.rect 
                                    x="13" y="15" width="5" height="12" rx="1.5" fill="white"
                                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                />
                                <motion.rect 
                                    x="21" y="9" width="5" height="18" rx="1.5" fill="white"
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                />
                                
                                {/* Blood Red Brand Arrow */}
                                <motion.polyline 
                                    points="23.5,4 26,8.5 21,8.5" 
                                    fill="#be123c"
                                    animate={{ y: [0, -1.5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </svg>
                        </motion.div>

                        <div className="flex flex-col items-center gap-2">
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl font-black text-white tracking-widest uppercase italic"
                            >
                                Digi<span className="text-rose-600">X</span>Crm
                            </motion.h1>
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.4 }}
                                transition={{ delay: 1 }}
                                className="flex items-center gap-3"
                            >
                                <span className="h-[1px] w-8 bg-white/50" />
                                <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em] whitespace-nowrap">
                                    Enterprise 2026 Engine
                                </p>
                                <span className="h-[1px] w-8 bg-white/50" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Bottom Status Bar */}
                    <div className="absolute bottom-12 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                                    animate={{ 
                                        opacity: [0.2, 1, 0.2],
                                        scale: [0.8, 1.2, 0.8]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                            Initializing Secure Instance...
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

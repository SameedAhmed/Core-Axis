"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";

export function DeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        // Only run if we are in a Capacitor environment
        const setupDeepLinks = async () => {
            const platform = (window as any).Capacitor?.getPlatform();
            if (platform !== 'android' && platform !== 'ios') return;

            App.addListener('appUrlOpen', (data: any) => {
                const url = new URL(data.url);
                const path = url.pathname;
                const searchParams = url.searchParams;

                // Handle Magic Link (Registration Wizard)
                if (path.includes('/auth/register-flow')) {
                    const token = searchParams.get('token');
                    if (token) {
                        router.push(`/auth/register-flow?token=${token}`);
                    }
                }
                
                // Handle Login Redirects or other features here
            });
        };

        setupDeepLinks();

        return () => {
            App.removeAllListeners();
        };
    }, [router]);

    return null; // This component doesn't render anything
}

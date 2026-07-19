"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

import { ConfirmDialogProvider } from "@/components/providers/confirm-dialog-provider";
import { AppPreloader } from "./app-preloader";
import { DeepLinkHandler } from "./deep-link-handler";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider>
                <ConfirmDialogProvider>
                    <AppPreloader />
                    <DeepLinkHandler />
                    {children}
                    <Toaster position="top-center" richColors closeButton />
                </ConfirmDialogProvider>
            </SessionProvider>
        </NextThemesProvider>
    );
}



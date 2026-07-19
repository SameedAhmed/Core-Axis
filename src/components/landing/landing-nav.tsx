"use client";

import Link from "next/link";
import { ArrowRight, X, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LandingNavProps {
    onOpenModal: (plan: string) => void;
}

export function LandingNav({ onOpenModal }: LandingNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Prevent body scroll when menu open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    const links = [
        ["Features", "/features"],
        ["Pricing", "/pricing"],
        ["App", "/download"],
        ["Reviews", "/#testimonials"],
        ["Contact", "/#contact"],
    ];

    return (
        <>
            <nav className={cn(
                "fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl transition-shadow duration-300",
                scrolled && "shadow-sm"
            )}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 shrink-0">
                        <Logo showText />
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        {links.map(([l, h]) => (
                            <Link key={l} href={h} className="hover:text-foreground transition-colors">
                                {l}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTAs */}
                    <div className="hidden md:flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Sign In
                        </Link>
                        <button onClick={() => onOpenModal("FREE")}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all hover:scale-[1.02] shadow-sm">
                            Try Free <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Mobile Right: Theme + Hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted transition-colors active:scale-95"
                            aria-label="Toggle menu"
                        >
                            {menuOpen
                                ? <X className="w-5 h-5 text-foreground" />
                                : <Menu className="w-5 h-5 text-foreground" />
                            }
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Full-Screen Overlay Menu */}
            <div className={cn(
                "fixed inset-0 z-40 md:hidden flex flex-col bg-background/98 backdrop-blur-2xl transition-all duration-300 ease-in-out",
                menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}>
                <div className="flex-1 flex flex-col justify-center px-8 space-y-2 mt-16">
                    {links.map(([label, href], i) => (
                        <Link
                            key={label}
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                                "flex items-center justify-between py-4 border-b border-border/40 text-2xl font-black text-foreground tracking-tight transition-all duration-200 hover:text-primary group",
                                menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                            )}
                            style={{ transitionDelay: menuOpen ? `${i * 60}ms` : "0ms" }}
                        >
                            {label}
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}

                    <div className="pt-8 flex flex-col gap-3">
                        <Link
                            href="/download"
                            onClick={() => setMenuOpen(false)}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-muted border border-border text-foreground font-bold text-base rounded-2xl shadow-sm hover:bg-muted/80 active:scale-95 transition-all"
                        >
                            Get the App <ArrowRight className="w-5 h-5 ml-1" />
                        </Link>
                        <button
                            onClick={() => { setMenuOpen(false); onOpenModal("FREE"); }}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold text-base rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                        >
                            Try Free <ArrowRight className="w-5 h-5" />
                        </button>
                        <Link
                            href="/auth/signin"
                            onClick={() => setMenuOpen(false)}
                            className="w-full flex items-center justify-center py-4 border border-border text-foreground font-semibold text-base rounded-2xl hover:bg-muted transition-all active:scale-95"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

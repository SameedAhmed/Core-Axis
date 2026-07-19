"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <div className="flex gap-2 bg-muted p-1 rounded-lg w-fit">
            <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("light")}
                className="gap-2 px-3 h-8 shadow-none text-foreground"
            >
                <Sun className="w-4 h-4" />
                Light
            </Button>
            <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="gap-2 px-3 h-8 shadow-none text-foreground"
            >
                <Moon className="w-4 h-4" />
                Dark
            </Button>
            <Button
                variant={theme === "system" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("system")}
                className="gap-2 px-3 h-8 shadow-none text-foreground"
            >
                <Monitor className="w-4 h-4" />
                System
            </Button>
        </div>
    );
}

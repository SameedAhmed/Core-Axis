"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ModuleTheme = "primary" | "emerald" | "violet" | "amber" | "indigo" | "blue" | "red" | "navy";

const THEME_CLASSES: Record<ModuleTheme, { iconBox: string; gradientText: string; badge: string; dot: string }> = {
  primary: {
    iconBox: "bg-primary/10 text-primary border-primary/20",
    gradientText: "from-primary to-blue-500",
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  navy: {
    // CoreAxis brand navy (from the emblem gradient) — Sales & CRM module only.
    iconBox: "bg-navy/10 text-navy dark:text-blue-300 border-navy/20",
    gradientText: "from-navy to-navy-deep",
    badge: "bg-navy/10 text-navy dark:text-blue-300 border-navy/20",
    dot: "bg-navy",
  },
  emerald: {
    iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradientText: "from-emerald-600 to-teal-500",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  violet: {
    iconBox: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    gradientText: "from-violet-600 to-fuchsia-500",
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    dot: "bg-violet-500",
  },
  amber: {
    iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    gradientText: "from-amber-600 to-orange-500",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dot: "bg-amber-500",
  },
  indigo: {
    iconBox: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    gradientText: "from-indigo-600 to-violet-500",
    badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  blue: {
    iconBox: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    gradientText: "from-blue-600 to-cyan-500",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    dot: "bg-blue-500",
  },
  red: {
    iconBox: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    gradientText: "from-red-600 to-rose-500",
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    dot: "bg-red-500",
  },
};

export { THEME_CLASSES };

interface PageHeaderProps {
  /** Pass a rendered icon element, e.g. `icon={<Boxes />}` — NOT a bare
   * component reference. Required because Server Component pages pass this
   * prop across the RSC boundary, where raw functions aren't serializable. */
  icon: React.ReactNode;
  theme: ModuleTheme;
  title: string;
  subtitle: string;
  badgeText?: string;
  actions?: React.ReactNode;
}

/**
 * Shared page header used across every dashboard module for a consistent
 * premium look: icon box, gradient title, subtitle, optional live/status
 * badge, and a right-aligned actions slot.
 */
export function PageHeader({ icon, theme, title, subtitle, badgeText, actions }: PageHeaderProps) {
  const t = THEME_CLASSES[theme];
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-2xl border shadow-sm [&>svg]:w-6 [&>svg]:h-6", t.iconBox)}>
          {icon}
        </div>
        <div>
          <h1 className={cn("text-3xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent", t.gradientText)}>
            {title}
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">{subtitle}</p>
        </div>
        {badgeText && (
          <span className={cn("hidden md:inline-flex items-center rounded-full border text-[11px] uppercase tracking-widest font-black py-1 px-3 shadow-sm ml-2", t.badge)}>
            <span className={cn("w-2 h-2 rounded-full animate-pulse mr-2", t.dot)} />
            {badgeText}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { THEME_CLASSES, type ModuleTheme } from "./page-header";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Pass a rendered icon element, e.g. `icon={<Target />}` — NOT a bare
   * component reference. Required because Server Component pages pass this
   * prop across the RSC boundary, where raw functions aren't serializable. */
  icon: React.ReactNode;
  theme: ModuleTheme;
  trend?: { icon?: React.ReactNode; text: string };
  pulse?: boolean;
  href?: string;
}

/**
 * Shared stat card used across every dashboard module — same rounded-3xl
 * shape, glow-blur accent orb, group-hover icon rotation, and pill trend
 * badge everywhere, so every module's "at a glance" numbers feel identical.
 */
export function StatCard({ label, value, icon, theme, trend, pulse, href }: StatCardProps) {
  const t = THEME_CLASSES[theme];

  const card = (
    <Card className="relative overflow-hidden shadow-sm hover:shadow-2xl border-border/60 bg-card transition-all duration-500 rounded-3xl transform hover:-translate-y-1.5 h-full">
      <div className={cn("absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full blur-3xl transition-all duration-700 opacity-60", t.iconBox.split(" ")[0])} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5 sm:p-6 sm:pb-2 relative z-10">
        <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</CardTitle>
        <div className={cn("p-2.5 rounded-2xl border shadow-sm transition-all duration-500 group-hover:rotate-12 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5", t.iconBox)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-5 sm:px-6 pb-6 sm:pb-6">
        <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
        {trend && (
          <div className={cn("mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold w-fit px-3 py-1 rounded-full border shadow-sm [&>svg]:h-3 [&>svg]:w-3", t.badge)}>
            {pulse ? <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", t.dot)} /> : trend.icon || null}
            {trend.text}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {card}
      </Link>
    );
  }
  return <div className="group">{card}</div>;
}

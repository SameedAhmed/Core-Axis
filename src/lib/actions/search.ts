"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";

export async function globalSearch(query: string) {
    if (!query || query.length < 2) return { leads: [], deals: [], organizations: [] };

    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });

    if (!user) return { leads: [], deals: [], organizations: [] };

    const effectiveRole = await getEffectiveRole(user);
    const scopeWhere = getScopeWhere(effectiveRole, user.id, (user as any).activeWorkspaceId);

    // Search Leads
    const leads = await prisma.lead.findMany({
        where: {
            ...scopeWhere,
            OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
            ]
        },
        take: 5
    });

    // Search Deals
    const deals = await prisma.deal.findMany({
        where: {
            ...scopeWhere,
            title: { contains: query, mode: "insensitive" }
        },
        take: 5
    });

    // Search Organizations
    const organizations = await prisma.organization.findMany({
        where: {
            ...scopeWhere,
            name: { contains: query, mode: "insensitive" }
        },
        take: 5
    });

    return { leads, deals, organizations };
}

import { Brain, Flame, TrendingUp } from "lucide-react";
import type { LeadScoreResult } from "@/lib/actions/lead-intelligence";

interface Props {
    result: LeadScoreResult;
    leads: { id: string; firstName: string; lastName: string; source: string | null }[];
}

/**
 * Server-rendered AI panel above the leads table. Shows whether the score is
 * coming from a model trained on the workspace's own history or a heuristic
 * fallback, a compact band distribution, and a ranked shortlist of hot leads.
 */
export function LeadIntelligencePanel({ result, leads }: Props) {
    const { model, scores } = result;

    const ranked = leads
        .map((l) => ({ lead: l, s: scores[l.id] }))
        .filter((x) => x.s)
        .sort((a, b) => b.s.score - a.s.score)
        .slice(0, 4);

    const total = Math.max(1, model.hotLeads + model.warmLeads + model.coldLeads);
    const pct = (n: number) => `${(n / total) * 100}%`;

    return (
        <div className="rounded-2xl border border-navy/20 bg-gradient-to-br from-navy/[0.04] to-transparent">
            <div className="grid lg:grid-cols-[1.4fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-navy/10">
                {/* Left: model status + distribution */}
                <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-navy/10 text-navy dark:text-blue-300">
                                <Brain className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">AI Lead Scoring</h3>
                                <p className="text-xs text-muted-foreground">
                                    {model.method === "model"
                                        ? "Naive Bayes, trained on this workspace's own history"
                                        : "Heuristic fallback — not enough history to train yet"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {model.method === "model" ? "Held-out Acc." : "Method"}
                                </p>
                                <p className={`text-lg font-bold leading-tight ${model.method === "model" ? "text-emerald-600" : "text-amber-600"}`}>
                                    {model.method === "model" && model.accuracy !== null ? `${model.accuracy.toFixed(0)}%` : "Heuristic"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Scored</p>
                                <p className="text-lg font-bold text-foreground leading-tight">{model.scoredCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Distribution bar */}
                    <div className="mt-4">
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="bg-emerald-500" style={{ width: pct(model.hotLeads) }} />
                            <div className="bg-amber-400" style={{ width: pct(model.warmLeads) }} />
                            <div className="bg-muted-foreground/30" style={{ width: pct(model.coldLeads) }} />
                        </div>
                        <div className="mt-2.5 flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {model.hotLeads} Hot
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <span className="w-2 h-2 rounded-full bg-amber-400" /> {model.warmLeads} Warm
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> {model.coldLeads} Cold
                            </span>
                        </div>
                    </div>

                    <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
                        {model.method === "model" ? (
                            <>
                                Learned from <strong className="text-foreground">{model.trainSize}</strong> resolved leads
                                ({model.hotCount} converted/qualified vs {model.coldCount} stalled) — scoring conversion
                                probability from source, quotation, engagement and contact completeness.
                            </>
                        ) : (
                            <>
                                Needs ~12+ resolved leads (both converted and stalled) to train a real model. Until then,
                                scores use a transparent point-based heuristic.
                            </>
                        )}
                    </p>
                </div>

                {/* Right: top prospects */}
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-foreground">Top Conversion Prospects</h3>
                    </div>
                    {ranked.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No leads scored yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {ranked.map(({ lead, s }) => (
                                <div key={lead.id} className="flex items-center justify-between gap-2 bg-background border border-border/60 rounded-lg px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {lead.firstName} {lead.lastName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">{s.reasons[0] || lead.source || "—"}</p>
                                    </div>
                                    <div
                                        className={`flex items-center gap-1 text-sm font-bold flex-shrink-0 ${
                                            s.band === "HOT" ? "text-emerald-600" : s.band === "WARM" ? "text-amber-600" : "text-muted-foreground"
                                        }`}
                                    >
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        {s.score}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

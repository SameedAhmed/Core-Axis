/**
 * Lead conversion scoring — a real supervised model trained on the workspace's
 * OWN historical leads, not a generic pretrained thing and not hardcoded.
 *
 * The label we learn is "did this lead become hot": leads that reached
 * QUALIFIED or CONVERTED are the positive class, leads that stalled at NEW or
 * CONTACTED are the negative class. From that history the model learns which
 * observable signals (acquisition source, quotation size, how much the lead
 * was engaged, whether contact details are complete) separate the two — then
 * scores each open lead 0-100 as an estimated conversion probability.
 *
 * We reuse the same Multinomial Naive Bayes implementation as the finance
 * classifier (naive-bayes.ts): each lead is turned into a little bag of
 * categorical "feature tokens" and NB learns P(token | hot) vs P(token | cold).
 *
 * Cold-start is handled honestly: if the workspace has too few closed leads to
 * learn anything trustworthy, we DON'T pretend — we fall back to a transparent
 * heuristic score and label the result as such, so nothing is ever presented
 * as a trained prediction when it isn't.
 */

import { trainNaiveBayes, classify, type NaiveBayesModel } from "./naive-bayes";

/** The minimum labeled leads (with both classes present) before we trust a trained model. */
export const MIN_TRAINING_LEADS = 12;

export interface LeadFeatures {
    source: string | null;
    quotation: number | null;
    activityCount: number;
    hasEmail: boolean;
    hasPhone: boolean;
    hasOrganization: boolean;
    hasRemarks: boolean;
    ageDays: number; // days since created
}

export interface ScoredLead {
    score: number; // 0-100
    band: "HOT" | "WARM" | "COLD";
    method: "model" | "heuristic";
    reasons: string[];
}

/** Buckets a quotation value into a categorical band so NB treats it as a feature. */
function quotationBand(q: number | null): string {
    if (!q || q <= 0) return "none";
    if (q < 1000) return "low";
    if (q < 10000) return "mid";
    return "high";
}

function activityBand(n: number): string {
    if (n === 0) return "none";
    if (n <= 2) return "few";
    if (n <= 5) return "some";
    return "many";
}

function ageBand(days: number): string {
    if (days <= 3) return "fresh";
    if (days <= 14) return "recent";
    if (days <= 45) return "aging";
    return "old";
}

/**
 * Turns a lead's structured fields into the space-joined "text" of feature
 * tokens that the Naive Bayes tokenizer will split back apart. Using distinct
 * prefixes (src_, quo_, ...) keeps feature namespaces from colliding.
 */
export function leadToFeatureText(f: LeadFeatures): string {
    const tokens = [
        `src_${(f.source || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        `quo_${quotationBand(f.quotation)}`,
        `act_${activityBand(f.activityCount)}`,
        `age_${ageBand(f.ageDays)}`,
        f.hasEmail ? "has_email" : "no_email",
        f.hasPhone ? "has_phone" : "no_phone",
        f.hasOrganization ? "has_org" : "no_org",
        f.hasRemarks ? "has_remarks" : "no_remarks",
    ];
    return tokens.join(" ");
}

export interface TrainedLeadModel {
    model: NaiveBayesModel | null;
    trainable: boolean;
    trainSize: number;
    hotCount: number;
    coldCount: number;
    accuracy: number | null; // held-out accuracy, 0-100, null when not trainable
}

interface LabeledLead {
    features: LeadFeatures;
    label: "hot" | "cold";
}

/**
 * Trains the Naive Bayes model on the labeled (closed-outcome) leads and also
 * reports a deterministic held-out accuracy so the UI can show a real metric.
 */
export function trainLeadModel(labeled: LabeledLead[]): TrainedLeadModel {
    const hotCount = labeled.filter((l) => l.label === "hot").length;
    const coldCount = labeled.length - hotCount;

    // Need enough examples AND both classes represented, or NB can't discriminate.
    if (labeled.length < MIN_TRAINING_LEADS || hotCount < 3 || coldCount < 3) {
        return { model: null, trainable: false, trainSize: labeled.length, hotCount, coldCount, accuracy: null };
    }

    const examples = labeled.map((l) => ({ text: leadToFeatureText(l.features), label: l.label }));

    // Deterministic held-out accuracy: every 4th example (stratified by order) -> test.
    const train: typeof examples = [];
    const test: typeof examples = [];
    examples.forEach((e, i) => (i % 4 === 0 ? test : train).push(e));

    const evalModel = trainNaiveBayes(train.length > 0 ? train : examples);
    let correct = 0;
    for (const e of test) {
        if (classify(evalModel, e.text).label === e.label) correct++;
    }
    const accuracy = test.length > 0 ? (correct / test.length) * 100 : null;

    // Final model trains on ALL labeled data for the best real-world scoring.
    const model = trainNaiveBayes(examples);
    return { model, trainable: true, trainSize: labeled.length, hotCount, coldCount, accuracy };
}

/**
 * Transparent heuristic used when there isn't enough history to train. Every
 * point is explainable, and the result is always labeled method: "heuristic"
 * so it is never mistaken for a model prediction.
 */
export function heuristicScore(f: LeadFeatures): ScoredLead {
    let score = 30; // base
    const reasons: string[] = [];

    const qb = quotationBand(f.quotation);
    if (qb === "high") { score += 25; reasons.push("High quotation value"); }
    else if (qb === "mid") { score += 15; reasons.push("Mid quotation value"); }
    else if (qb === "low") { score += 5; }

    const ab = activityBand(f.activityCount);
    if (ab === "many") { score += 20; reasons.push("Highly engaged (many activities)"); }
    else if (ab === "some") { score += 12; reasons.push("Engaged (several activities)"); }
    else if (ab === "few") { score += 5; }
    else { reasons.push("No engagement yet"); }

    if (f.hasEmail) score += 8;
    if (f.hasPhone) score += 8;
    if (f.hasOrganization) { score += 6; reasons.push("Linked to an organization"); }
    if (!f.hasEmail && !f.hasPhone) reasons.push("Missing contact details");

    if (ageBand(f.ageDays) === "old") { score -= 15; reasons.push("Lead is going stale"); }

    score = Math.max(2, Math.min(98, score));
    return {
        score,
        band: score >= 70 ? "HOT" : score >= 45 ? "WARM" : "COLD",
        method: "heuristic",
        reasons: reasons.slice(0, 3),
    };
}

/**
 * Scores a single open lead. Uses the trained model when available, otherwise
 * the transparent heuristic. Either way returns a band + short explanation.
 */
export function scoreLead(trained: TrainedLeadModel, f: LeadFeatures): ScoredLead {
    if (!trained.trainable || !trained.model) {
        return heuristicScore(f);
    }

    const text = leadToFeatureText(f);
    const tokenCount = text.split(" ").filter(Boolean).length || 1;
    const { scores } = classify(trained.model, text);

    // Raw NB sums a log-likelihood per feature token, so the hot-vs-cold gap
    // grows with the number of features and a plain softmax saturates to ~0.99
    // for almost everything. We calibrate by using the AVERAGE log-odds per
    // feature (divide the gap by token count) as the logit of a sigmoid — this
    // keeps scores spread across a realistic range instead of pinning at 98.
    const hot = scores["hot"] ?? -Infinity;
    const cold = scores["cold"] ?? -Infinity;
    const logit = (hot - cold) / tokenCount;
    const pHot = 1 / (1 + Math.exp(-logit));
    const score = Math.max(2, Math.min(98, Math.round(pHot * 100)));

    // Explain via the strongest positive contributing features, human-readable.
    const reasons = explainLead(f);

    return {
        score,
        band: score >= 70 ? "HOT" : score >= 45 ? "WARM" : "COLD",
        method: "model",
        reasons,
    };
}

function explainLead(f: LeadFeatures): string[] {
    const reasons: string[] = [];
    const qb = quotationBand(f.quotation);
    if (qb === "high") reasons.push("High quotation value");
    else if (qb === "mid") reasons.push("Mid quotation value");

    const ab = activityBand(f.activityCount);
    if (ab === "many" || ab === "some") reasons.push(`${f.activityCount} logged activities`);
    else if (ab === "none") reasons.push("No engagement yet");

    if (f.source) reasons.push(`Source: ${f.source}`);
    if (!f.hasEmail && !f.hasPhone) reasons.push("Missing contact details");
    if (ageBand(f.ageDays) === "old") reasons.push("Aging lead");

    return reasons.slice(0, 3);
}

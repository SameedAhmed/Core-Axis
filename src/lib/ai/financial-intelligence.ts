import Papa from "papaparse";
import * as XLSX from "xlsx";
import { askGemini } from "./gemini";
import { trainNaiveBayes, classify as classifyWithNaiveBayes } from "./naive-bayes";
import { FINANCIAL_TRAINING_DATA } from "./financial-training-data";

// Trained once, in-process, on module load — see naive-bayes.ts for why this
// doesn't need a separate offline training step or a persisted weights file.
const REVENUE_EXPENSE_MODEL = trainNaiveBayes(FINANCIAL_TRAINING_DATA);

export interface FinancialLineItem {
    description: string;
    department: string;
    amount: number;
    type: "REVENUE" | "EXPENSE";
    category?: string;
}

export interface DepartmentMetric {
    department: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    roi: number; // netProfit / expenses (or / revenue if no expenses), as a %
    margin: number; // netProfit / revenue, as a %
    directive: "INVEST" | "HOLD" | "RESTRUCTURE" | "CLOSE";
    riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface FinancialAnalysisResult {
    status: "PROFIT" | "LOSS" | "BREAKEVEN";
    revenue: number;
    expenses: number;
    netProfit: number;
    departments: DepartmentMetric[];
    metrics: {
        netProfitMargin: number;
        expenseRatio: number;
        revenueConcentrationHHI: number;
        breakEvenRevenue: number;
        monthlyBurnRate: number | null;
        healthScore: number;
        confidence: number;
    };
    chartData: { name: string; revenue: number; expenses: number }[];
}

const DEPARTMENT_KEYWORDS = [
    "sales", "marketing", "engineering", "product", "hr", "human resources",
    "operations", "ops", "finance", "accounting", "support", "customer success",
    "legal", "it", "information technology", "r&d", "research", "admin",
    "administration", "logistics", "procurement", "manufacturing",
];

const ACRONYM_DEPARTMENTS: Record<string, string> = {
    "hr": "HR",
    "human resources": "HR",
    "it": "IT",
    "information technology": "IT",
    "r&d": "R&D",
    "research": "R&D",
};

function titleCase(s: string): string {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeDepartment(raw: string | undefined | null): string {
    if (!raw || !raw.trim()) return "General";
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    const matched = DEPARTMENT_KEYWORDS.find((k) => lower.includes(k));
    if (matched) {
        return ACRONYM_DEPARTMENTS[matched] || titleCase(matched);
    }
    return titleCase(trimmed);
}

/** Maps arbitrary CSV/Excel rows (varying column names) onto FinancialLineItem[]. */
function mapRowsToLineItems(rows: Record<string, any>[]): FinancialLineItem[] {
    const findKey = (row: Record<string, any>, candidates: string[]) => {
        const keys = Object.keys(row);
        for (const c of candidates) {
            const found = keys.find((k) => k.toLowerCase().trim() === c);
            if (found) return found;
        }
        // fall back to partial match
        for (const c of candidates) {
            const found = keys.find((k) => k.toLowerCase().includes(c));
            if (found) return found;
        }
        return null;
    };

    return rows
        .map((row): FinancialLineItem | null => {
            const amountKey = findKey(row, ["amount", "value", "total"]);
            const deptKey = findKey(row, ["department", "dept", "team"]);
            const typeKey = findKey(row, ["type"]);
            const categoryKey = findKey(row, ["category"]);
            const descKey = findKey(row, ["description", "title", "name", "item"]);

            if (!amountKey) return null;
            const rawAmount = row[amountKey];
            const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ""));
            if (isNaN(amount) || amount === 0) return null;

            let type: "REVENUE" | "EXPENSE";
            const typeVal = typeKey ? String(row[typeKey]).toLowerCase() : "";
            if (typeVal.includes("rev") || typeVal.includes("income")) type = "REVENUE";
            else if (typeVal.includes("exp") || typeVal.includes("cost")) type = "EXPENSE";
            else type = amount >= 0 ? "REVENUE" : "EXPENSE";

            return {
                description: descKey ? String(row[descKey]) : `${type === "REVENUE" ? "Revenue" : "Expense"} item`,
                department: normalizeDepartment(deptKey ? row[deptKey] : undefined),
                amount: Math.abs(amount),
                type,
                category: categoryKey ? String(row[categoryKey]) : undefined,
            };
        })
        .filter((x): x is FinancialLineItem => x !== null);
}

export function parseCsvLineItems(csvText: string): FinancialLineItem[] {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    return mapRowsToLineItems(parsed.data as Record<string, any>[]);
}

export function parseExcelLineItems(buffer: Buffer): FinancialLineItem[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as Record<string, any>[];
    return mapRowsToLineItems(rows);
}

const AMOUNT_PATTERN = /\$\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?(?:dollars|usd)\b/i;

function detectDepartmentInText(text: string): string {
    const lower = text.toLowerCase();
    const matched = DEPARTMENT_KEYWORDS.find((k) => lower.includes(k));
    return matched ? normalizeDepartment(matched) : "General";
}

/**
 * Classifies a single sentence/line as Revenue or Expense using our own
 * from-scratch-trained Naive Bayes model (see naive-bayes.ts +
 * financial-training-data.ts) — no external API call.
 */
export function classifyFinancialLine(text: string): { type: "REVENUE" | "EXPENSE"; confidence: number } {
    const result = classifyWithNaiveBayes(REVENUE_EXPENSE_MODEL, text);
    return { type: result.label as "REVENUE" | "EXPENSE", confidence: result.confidence };
}

/**
 * Fully local extraction path for unstructured input (pasted P&L text,
 * PDF-extracted text): splits into lines/sentences, regex-extracts a dollar
 * amount from each, and classifies Revenue vs Expense with our own trained
 * Naive Bayes model. No external API — this is the default extraction path.
 */
export function extractLineItemsLocally(text: string): FinancialLineItem[] {
    const segments = text
        .split(/\r?\n/)
        .flatMap((line) => line.split(/(?<=[.!?])\s+/))
        .map((s) => s.trim())
        .filter((s) => s.length > 3);

    const items: FinancialLineItem[] = [];
    for (const segment of segments) {
        const match = segment.match(AMOUNT_PATTERN);
        if (!match) continue;
        const rawAmount = (match[1] || match[2] || "").replace(/,/g, "");
        const amount = parseFloat(rawAmount);
        if (isNaN(amount) || amount === 0) continue;

        const { type } = classifyFinancialLine(segment);
        items.push({
            description: segment.slice(0, 150),
            department: detectDepartmentInText(segment),
            amount: Math.abs(amount),
            type,
        });
    }
    return items;
}

/**
 * Optional AI-enhanced extraction path (Gemini) — used only when explicitly
 * requested, e.g. for messier text where the local classifier under-extracts.
 * The default flow (extractLineItemsLocally) never calls this.
 */
export async function extractLineItemsWithAI(text: string): Promise<FinancialLineItem[]> {
    const prompt = `Extract every distinct revenue or expense line item from the financial text below. Respond with ONLY a JSON array (no markdown, no commentary), where each item is:
{"description": string, "department": string, "amount": number (positive), "type": "REVENUE" or "EXPENSE", "category": string or null}

If no department is mentioned for an item, use "General". Text:
---
${text.slice(0, 8000)}
---`;

    const result = await askGemini(
        "You are a financial data extraction engine. You only output valid JSON arrays, nothing else.",
        prompt
    );

    if (result.type !== "text") {
        throw new Error("Unexpected response type from extraction model.");
    }

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error("Could not find structured data in the extracted text — try a clearer input.");
    }

    const raw = JSON.parse(jsonMatch[0]);
    return raw
        .filter((r: any) => r && typeof r.amount === "number" && r.amount !== 0)
        .map((r: any) => ({
            description: String(r.description || "Line item"),
            department: normalizeDepartment(r.department),
            amount: Math.abs(r.amount),
            type: r.type === "EXPENSE" ? "EXPENSE" : "REVENUE",
            category: r.category || undefined,
        }));
}

function computeHHI(departmentRevenues: number[], totalRevenue: number): number {
    if (totalRevenue <= 0) return 0;
    const shares = departmentRevenues.map((r) => (r / totalRevenue) * 100);
    return shares.reduce((sum, s) => sum + s * s, 0) / 100; // normalized to 0-100 scale
}

/**
 * Deterministic financial math + rule-based department triage. Never guesses
 * numbers — every figure here is computed directly from the parsed line
 * items. The only AI-generated content (executive summary, strategic advice)
 * is layered on top of these numbers separately, in finance-analyst.ts.
 */
export function analyzeLineItems(items: FinancialLineItem[]): FinancialAnalysisResult {
    const byDept = new Map<string, { revenue: number; expenses: number }>();
    for (const item of items) {
        const bucket = byDept.get(item.department) || { revenue: 0, expenses: 0 };
        if (item.type === "REVENUE") bucket.revenue += item.amount;
        else bucket.expenses += item.amount;
        byDept.set(item.department, bucket);
    }

    const totalRevenue = items.filter((i) => i.type === "REVENUE").reduce((s, i) => s + i.amount, 0);
    const totalExpenses = items.filter((i) => i.type === "EXPENSE").reduce((s, i) => s + i.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const departments: DepartmentMetric[] = Array.from(byDept.entries()).map(([department, { revenue, expenses }]) => {
        const deptNetProfit = revenue - expenses;
        const margin = revenue > 0 ? (deptNetProfit / revenue) * 100 : deptNetProfit < 0 ? -100 : 0;
        const roi = expenses > 0 ? (deptNetProfit / expenses) * 100 : revenue > 0 ? 100 : 0;

        // Rule-based triage: thresholds chosen to be explainable, not arbitrary.
        let directive: DepartmentMetric["directive"];
        let riskLevel: DepartmentMetric["riskLevel"];

        if (revenue === 0) {
            // Pure cost center (Engineering, HR, IT, Legal, Admin, ...) — having
            // zero *directly attributed* revenue is normal and expected for
            // these functions, not a failure signal. A profit/ROI-based rubric
            // doesn't apply; judge by expense share of total spend instead, and
            // never recommend closing a core support function just because it
            // doesn't itself generate revenue.
            const expenseShareOfTotal = totalExpenses > 0 ? expenses / totalExpenses : 0;
            directive = expenseShareOfTotal > 0.35 ? "RESTRUCTURE" : "HOLD";
            riskLevel = expenseShareOfTotal > 0.35 ? "MODERATE" : "LOW";
        } else {
            // Revenue-generating (or revenue-attributed) department — profit/ROI
            // rubric applies. CLOSE is reserved for departments that DO have
            // real revenue but are deeply unprofitable, i.e. a failing business
            // line, not merely a support function.
            if (deptNetProfit < 0 && margin < -50) {
                directive = "CLOSE";
                riskLevel = "CRITICAL";
            } else if (deptNetProfit < 0) {
                directive = "RESTRUCTURE";
                riskLevel = "HIGH";
            } else if (margin < 15) {
                directive = "HOLD";
                riskLevel = "MODERATE";
            } else {
                directive = "INVEST";
                riskLevel = "LOW";
            }
        }

        return { department, revenue, expenses, netProfit: deptNetProfit, roi, margin, directive, riskLevel };
    }).sort((a, b) => b.revenue - a.revenue);

    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : totalExpenses > 0 ? Infinity : 0;
    const revenueConcentrationHHI = computeHHI(departments.map((d) => d.revenue), totalRevenue);

    // Health score: weighted composite of profitability, diversification, and
    // department mix — each component normalized to 0-100, documented so it's
    // explainable rather than a black box.
    const marginScore = Math.max(0, Math.min(100, netProfitMargin + 50));
    const concentrationScore = Math.max(0, 100 - revenueConcentrationHHI);
    // Only revenue-generating departments count toward this ratio — pure cost
    // centers (revenue === 0) always show a "loss" by construction and would
    // unfairly drag the score down for simply existing.
    const revenueGeneratingDepts = departments.filter((d) => d.revenue > 0);
    const profitableDeptRatio = revenueGeneratingDepts.length > 0
        ? (revenueGeneratingDepts.filter((d) => d.netProfit >= 0).length / revenueGeneratingDepts.length) * 100
        : 50;
    const healthScore = Math.round(0.5 * marginScore + 0.25 * concentrationScore + 0.25 * profitableDeptRatio);

    // Confidence: more line items and more departments = a more reliable read.
    const confidence = Math.round(Math.min(95, 40 + Math.min(items.length, 30) * 1.5 + Math.min(departments.length, 8) * 2));

    const status: FinancialAnalysisResult["status"] =
        Math.abs(netProfitMargin) < 2 ? "BREAKEVEN" : netProfit > 0 ? "PROFIT" : "LOSS";

    const chartData = departments.slice(0, 8).map((d) => ({ name: d.department, revenue: Math.round(d.revenue), expenses: Math.round(d.expenses) }));

    return {
        status,
        revenue: totalRevenue,
        expenses: totalExpenses,
        netProfit,
        departments,
        metrics: {
            netProfitMargin,
            expenseRatio,
            revenueConcentrationHHI,
            breakEvenRevenue: totalExpenses,
            monthlyBurnRate: netProfit < 0 ? Math.abs(netProfit) : null,
            healthScore,
            confidence,
        },
        chartData,
    };
}

export interface FinancialNarrative {
    executiveSummary: string;
    riskFactors: string[];
    strategicAdvice: string[];
    departmentActions: Record<string, string>;
}

/**
 * Default narrative generator — 100% local, zero external dependency. Every
 * sentence is assembled from real computed numbers via a rule-based phrase
 * selector (tiered on health score / margin / concentration), not an LLM.
 * This is what runs unless enhanceNarrativeWithAI() is explicitly called.
 */
export function generateLocalNarrative(result: FinancialAnalysisResult): FinancialNarrative {
    const { metrics, departments } = result;

    const healthPhrase =
        metrics.healthScore >= 75 ? "a strong, healthy position"
            : metrics.healthScore >= 50 ? "a stable but improvable position"
                : metrics.healthScore >= 25 ? "a concerning position that needs attention"
                    : "a critical position requiring immediate action";

    const marginPhrase =
        metrics.netProfitMargin >= 15 ? "well above typical SME benchmarks"
            : metrics.netProfitMargin >= 0 ? "positive but with room to improve"
                : "negative, meaning expenses currently exceed revenue";

    const executiveSummary = `The business is in ${result.status.toLowerCase()} status, sitting in ${healthPhrase} with a computed health score of ${metrics.healthScore}/100. Net profit stands at $${result.netProfit.toFixed(0)} on $${result.revenue.toFixed(0)} revenue, a ${metrics.netProfitMargin.toFixed(1)}% margin that is ${marginPhrase}. Across ${departments.length} department(s) analyzed, ${departments.filter((d) => d.directive === "INVEST").length} are flagged for further investment, ${departments.filter((d) => d.directive === "CLOSE" || d.directive === "RESTRUCTURE").length} need restructuring or closure review, and revenue concentration (HHI ${metrics.revenueConcentrationHHI.toFixed(1)}) is ${metrics.revenueConcentrationHHI > 40 ? "notably concentrated in a few departments" : "reasonably diversified"}.`;

    const riskFactors: string[] = [];
    if (metrics.revenueConcentrationHHI > 40) riskFactors.push(`High revenue concentration (HHI ${metrics.revenueConcentrationHHI.toFixed(1)}) — over-reliance on a small number of departments`);
    if (metrics.netProfitMargin < 0) riskFactors.push(`Negative net margin (${metrics.netProfitMargin.toFixed(1)}%) — current expense structure is not covered by revenue`);
    if (metrics.monthlyBurnRate !== null) riskFactors.push(`Active cash burn of $${metrics.monthlyBurnRate.toFixed(0)} for the analyzed period`);
    const closeDepts = departments.filter((d) => d.directive === "CLOSE");
    if (closeDepts.length > 0) riskFactors.push(`${closeDepts.length} department(s) generating negligible or negative return: ${closeDepts.map((d) => d.department).join(", ")}`);

    const strategicAdvice: string[] = [];
    const investDepts = departments.filter((d) => d.directive === "INVEST");
    if (investDepts.length > 0) strategicAdvice.push(`Prioritize further investment in ${investDepts.map((d) => d.department).join(", ")} — ${investDepts.length > 1 ? "these are" : "this is"} the strongest ROI performer${investDepts.length > 1 ? "s" : ""}.`);
    const restructureDepts = departments.filter((d) => d.directive === "RESTRUCTURE");
    if (restructureDepts.length > 0) strategicAdvice.push(`Restructure ${restructureDepts.map((d) => d.department).join(", ")} — losing money but revenue-generating enough to be worth fixing rather than closing.`);
    if (closeDepts.length > 0) strategicAdvice.push(`Seriously evaluate closing or divesting ${closeDepts.map((d) => d.department).join(", ")} — capital tied up here is producing negligible or negative return.`);
    if (metrics.revenueConcentrationHHI > 40) strategicAdvice.push(`Diversify revenue sources — current concentration creates single-point-of-failure risk if a top department underperforms.`);
    if (metrics.netProfitMargin < 10) strategicAdvice.push(`Review the overall expense ratio (${isFinite(metrics.expenseRatio) ? metrics.expenseRatio.toFixed(1) : "N/A"}%) for cost-reduction opportunities before the next period.`);

    const departmentActions: Record<string, string> = {};
    for (const d of departments) {
        const isCostCenter = d.revenue === 0;
        if (isCostCenter && d.directive === "RESTRUCTURE") {
            departmentActions[d.department] = `Cost center with no directly attributed revenue, spending $${d.expenses.toFixed(0)} (${((d.expenses / result.expenses) * 100).toFixed(0)}% of total expenses) — review budget efficiency, not ROI.`;
        } else if (isCostCenter) {
            departmentActions[d.department] = `Cost center — $${d.expenses.toFixed(0)} spend is a normal, proportionate share of total expenses. No action needed.`;
        } else if (d.directive === "INVEST") {
            departmentActions[d.department] = `Strong performer at ${d.margin.toFixed(1)}% margin — increase allocation and protect this revenue stream.`;
        } else if (d.directive === "HOLD") {
            departmentActions[d.department] = `Breakeven-ish at ${d.margin.toFixed(1)}% margin — maintain current investment, monitor for improvement.`;
        } else if (d.directive === "RESTRUCTURE") {
            departmentActions[d.department] = `Losing $${Math.abs(d.netProfit).toFixed(0)} against $${d.revenue.toFixed(0)} revenue — needs a cost or pricing restructure, not closure.`;
        } else {
            departmentActions[d.department] = `Generating negligible or negative return ($${d.netProfit.toFixed(0)} net) despite real revenue — recommend closure or divestment review.`;
        }
    }

    return { executiveSummary, riskFactors, strategicAdvice, departmentActions };
}

/**
 * Optional AI-enhanced narrative (Gemini) — produces more natural prose than
 * the local templates, but is never required: the local version above always
 * runs first and this is only invoked if the user explicitly asks to
 * "Enhance with AI." Still never allowed to alter the underlying numbers —
 * it's shown the already-computed figures and instructed only to explain them.
 */
export async function enhanceNarrativeWithAI(result: FinancialAnalysisResult): Promise<FinancialNarrative> {
    const deptLines = result.departments
        .map((d) => `- ${d.department}: revenue $${d.revenue.toFixed(0)}, expenses $${d.expenses.toFixed(0)}, net $${d.netProfit.toFixed(0)}, margin ${d.margin.toFixed(1)}%, directive ${d.directive}`)
        .join("\n");

    const prompt = `Given this computed financial analysis, write:
1. A 3-4 sentence executive summary of overall business health.
2. 2-4 risk factors (short phrases).
3. 3-5 numbered strategic advice items for leadership.
4. One short action sentence per department.

Respond as ONLY valid JSON (no markdown): {"executiveSummary": string, "riskFactors": string[], "strategicAdvice": string[], "departmentActions": {"<department>": string}}

Computed data (do not invent or alter any numbers — only explain them):
Status: ${result.status}
Total revenue: $${result.revenue.toFixed(0)}
Total expenses: $${result.expenses.toFixed(0)}
Net profit: $${result.netProfit.toFixed(0)}
Net profit margin: ${result.metrics.netProfitMargin.toFixed(1)}%
Revenue concentration (HHI, 0=diversified, 100=single department): ${result.metrics.revenueConcentrationHHI.toFixed(1)}
Business health score (0-100): ${result.metrics.healthScore}

Departments:
${deptLines}`;

    const res = await askGemini("You are a CFO-level financial analyst. You only output valid JSON, nothing else.", prompt);
    if (res.type !== "text") throw new Error("Unexpected model response");
    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in narrative response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
        executiveSummary: parsed.executiveSummary || "",
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        strategicAdvice: Array.isArray(parsed.strategicAdvice) ? parsed.strategicAdvice : [],
        departmentActions: parsed.departmentActions || {},
    };
}

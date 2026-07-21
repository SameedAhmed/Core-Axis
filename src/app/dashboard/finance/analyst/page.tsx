"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Save,
  History,
  Trash2,
  Gauge,
  Cpu,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  analyzeFinancialData,
  saveFinancialReport,
  getFinancialReports,
  deleteFinancialReport,
  enhanceReportWithAI,
  getModelPerformance,
} from "@/lib/actions/finance-analyst";
import { Brain, Database, Target, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

interface ModelPerformance {
  evaluation: {
    totalExamples: number;
    trainSize: number;
    testSize: number;
    classDistribution: Record<string, number>;
    accuracy: number;
    confusionMatrix: Record<string, Record<string, number>>;
    perClass: Record<string, { precision: number; recall: number; f1: number }>;
  };
  sample: { text: string; label: string }[];
}

interface DepartmentMetric {
  department: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  roi: number;
  margin: number;
  directive: "INVEST" | "HOLD" | "RESTRUCTURE" | "CLOSE";
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

interface AnalysisResult {
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
  executiveSummary: string;
  riskFactors: string[];
  strategicAdvice: string[];
  departmentActions: Record<string, string>;
  itemCount: number;
  aiEnhanced: boolean;
}

const DIRECTIVE_STYLE: Record<string, string> = {
  INVEST: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  HOLD: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  RESTRUCTURE: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  CLOSE: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  PROFIT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  LOSS: "bg-red-500/10 text-red-600 border-red-500/20",
  BREAKEVEN: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export default function AIFinancialAnalystPage() {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [pasteText, setPasteText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reportName, setReportName] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [lastPasteText, setLastPasteText] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [modelPerf, setModelPerf] = useState<ModelPerformance | null>(null);
  const [modelExpanded, setModelExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshHistory() {
    setLoadingHistory(true);
    const res = await getFinancialReports();
    setHistory(res.success ? res.data : []);
    setLoadingHistory(false);
  }

  useEffect(() => {
    refreshHistory();
    getModelPerformance().then((res) => {
      if (res.success) setModelPerf(res.data);
    });
  }, []);

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAnalyzeFile(file: File) {
    setAnalyzing(true);
    setResult(null);
    setLastPasteText(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let res;
      if (ext === "csv") {
        const text = await readFileAsText(file);
        res = await analyzeFinancialData({ inputType: "csv", text });
      } else if (ext === "xlsx" || ext === "xls") {
        const fileBase64 = await readFileAsBase64(file);
        res = await analyzeFinancialData({ inputType: "excel", fileBase64 });
      } else if (ext === "pdf") {
        const fileBase64 = await readFileAsBase64(file);
        res = await analyzeFinancialData({ inputType: "pdf", fileBase64 });
      } else {
        toast.error("Unsupported file type. Use .csv, .xlsx, .xls, or .pdf.");
        setAnalyzing(false);
        return;
      }

      if (res.success) {
        setResult(res.data);
        setReportName(file.name.replace(/\.[^.]+$/, ""));
        toast.success(`Analyzed ${res.data.itemCount} line items.`);
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to read file");
    }
    setAnalyzing(false);
  }

  async function handleAnalyzeText() {
    if (!pasteText.trim()) {
      toast.error("Paste some financial text first.");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    const res = await analyzeFinancialData({ inputType: "text", text: pasteText });
    if (res.success) {
      setResult(res.data);
      setLastPasteText(pasteText);
      setReportName(`Analysis ${new Date().toLocaleDateString()}`);
      toast.success(`Analyzed ${res.data.itemCount} line items.`);
    } else {
      toast.error(res.error);
    }
    setAnalyzing(false);
  }

  async function handleEnhance() {
    if (!result) return;
    setEnhancing(true);
    const res = await enhanceReportWithAI(lastPasteText, result);
    if (res.success) {
      setResult(res.data);
      toast.success("Enhanced with AI.");
    } else {
      toast.error(res.error);
    }
    setEnhancing(false);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    const res = await saveFinancialReport(reportName, result);
    if (res.success) {
      toast.success("Report saved to history.");
      refreshHistory();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await deleteFinancialReport(id);
    if (res.success) {
      toast.success("Report deleted.");
      refreshHistory();
    } else {
      toast.error(res.error);
    }
  }

  function loadFromHistory(report: any) {
    const rec = report.recommendations || {};
    setResult({
      status: report.status,
      revenue: report.revenue,
      expenses: report.expenses,
      netProfit: report.netProfit,
      departments: report.departments || [],
      metrics: rec.metrics,
      chartData: rec.chartData || [],
      executiveSummary: rec.executiveSummary || "",
      riskFactors: rec.riskFactors || [],
      strategicAdvice: rec.strategicAdvice || [],
      departmentActions: rec.departmentActions || {},
      itemCount: (report.departments || []).length,
    });
    setReportName(report.name);
    toast.info(`Loaded "${report.name}"`);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <PageHeader
        icon={<Brain />}
        theme="indigo"
        title="AI Financial Analyst"
        subtitle="Upload a ledger (CSV/Excel/PDF) or paste P&L notes — runs on our own trained classifier, 100% locally, no external API required."
        badgeText="100% Local"
      />

      {/* Model & Dataset Panel — proof the classifier is really trained */}
      {modelPerf && (
        <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/[0.04] bg-gradient-to-br from-background to-indigo-50/10">
          <CardHeader className="pb-3">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setModelExpanded((v) => !v)}
            >
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" /> Model &amp; Training Dataset
                <Badge variant="outline" className="ml-2 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-normal">
                  Naive Bayes · trained in-house
                </Badge>
              </CardTitle>
              {modelExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Headline metrics — always visible */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  <Target className="w-3 h-3" /> Test Accuracy
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{modelPerf.evaluation.accuracy.toFixed(1)}%</div>
                <div className="text-[10px] text-muted-foreground">on held-out data</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  <Database className="w-3 h-3" /> Dataset Size
                </div>
                <div className="text-2xl font-black text-foreground mt-1">{modelPerf.evaluation.totalExamples}</div>
                <div className="text-[10px] text-muted-foreground">labeled examples</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Train / Test Split</div>
                <div className="text-2xl font-black text-foreground mt-1">{modelPerf.evaluation.trainSize} / {modelPerf.evaluation.testSize}</div>
                <div className="text-[10px] text-muted-foreground">80% train, 20% test</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Classes</div>
                <div className="text-sm font-bold text-foreground mt-1">
                  {Object.entries(modelPerf.evaluation.classDistribution).map(([cls, n]) => (
                    <div key={cls}>{cls}: {n}</div>
                  ))}
                </div>
              </div>
            </div>

            {modelExpanded && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                {/* Confusion matrix */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Confusion Matrix (held-out test set)</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-muted-foreground font-medium">actual ↓ / predicted →</th>
                          {Object.keys(modelPerf.evaluation.confusionMatrix).map((p) => (
                            <th key={p} className="p-2 text-center font-bold">{p}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(modelPerf.evaluation.confusionMatrix).map(([actual, preds]) => (
                          <tr key={actual}>
                            <td className="p-2 font-bold">{actual}</td>
                            {Object.entries(preds).map(([pred, count]) => (
                              <td key={pred} className={`p-2 text-center font-mono ${actual === pred ? "bg-emerald-500/10 text-emerald-600 font-bold rounded" : "text-muted-foreground"}`}>
                                {count}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Diagonal = correct predictions. Precision/Recall/F1 per class: {Object.entries(modelPerf.evaluation.perClass).map(([cls, m]) => `${cls} ${m.precision.toFixed(0)}%/${m.recall.toFixed(0)}%/${m.f1.toFixed(0)}%`).join("  ·  ")}</p>
                </div>

                {/* Training data sample */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Training Data Sample</p>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-2">
                    {modelPerf.sample.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-background/60 rounded px-2 py-1.5 border border-border/40">
                        <Badge variant="outline" className={row.label === "REVENUE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] shrink-0" : "bg-red-500/10 text-red-600 border-red-500/20 text-[9px] shrink-0"}>
                          {row.label}
                        </Badge>
                        <span className="text-muted-foreground truncate">{row.text}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    A representative sample of the {modelPerf.evaluation.totalExamples} hand-labeled examples the classifier learns word-likelihoods from. Full dataset: <span className="font-mono">src/lib/ai/financial-training-data.ts</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
            </Button>
            <Button size="sm" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}>
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Paste Text
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "file" ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAnalyzeFile(e.target.files[0])}
              />
              {analyzing ? (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                  <p>Analyzing financial data...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Upload className="w-8 h-8 mb-2 opacity-50" />
                  <p className="font-medium">Click to upload a .csv, .xlsx, .xls, or .pdf ledger</p>
                  <p className="text-xs mt-1">Columns like Department, Amount, Type work best for CSV/Excel</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste P&L notes, ledger lines, or meeting notes... e.g. 'Sales department brought in $50,000 revenue with $30,000 in expenses. Marketing spent $12,000 with no direct revenue attributed.'"
              />
              <Button onClick={handleAnalyzeText} disabled={analyzing}>
                {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Analyze Financials
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  result.status === "PROFIT"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1.5 px-3"
                    : result.status === "LOSS"
                    ? "bg-red-500/10 text-red-600 border-red-500/20 py-1.5 px-3"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20 py-1.5 px-3"
                }
              >
                {result.status === "PROFIT" ? <TrendingUp className="w-4 h-4 mr-2" /> : result.status === "LOSS" ? <TrendingDown className="w-4 h-4 mr-2" /> : <Minus className="w-4 h-4 mr-2" />}
                {result.status}
              </Badge>
              <Badge
                variant="outline"
                className={result.aiEnhanced ? "bg-violet-500/10 text-violet-600 border-violet-500/20 py-1.5 px-3" : "bg-sky-500/10 text-sky-600 border-sky-500/20 py-1.5 px-3"}
                title={result.aiEnhanced ? "Narrative written by Gemini" : "Runs 100% locally — our own trained classifier + rule-based math, no external API"}
              >
                {result.aiEnhanced ? <Wand2 className="w-3.5 h-3.5 mr-1.5" /> : <Cpu className="w-3.5 h-3.5 mr-1.5" />}
                {result.aiEnhanced ? "AI-Enhanced" : "100% Local — No API"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!result.aiEnhanced && (
                <Button size="sm" variant="outline" onClick={handleEnhance} disabled={enhancing}>
                  {enhancing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                  Enhance with AI
                </Button>
              )}
              <Input value={reportName} onChange={(e) => setReportName(e.target.value)} className="h-9 w-56 text-sm" placeholder="Report name" />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="departments">Department Performance</TabsTrigger>
              <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              <TabsTrigger value="metrics">Advanced Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Revenue" value={`$${result.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} icon={<TrendingUp />} theme="emerald" />
                <StatCard label="Expenses" value={`$${result.expenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} icon={<TrendingDown />} theme="red" />
                <StatCard
                  label="Net Cash Flow"
                  value={`$${result.netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  icon={<Gauge />}
                  theme={result.netProfit >= 0 ? "emerald" : "red"}
                />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">Revenue vs Expenses by Department</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                        <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> AI Executive Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{result.executiveSummary}</p>
                  {result.riskFactors.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      {result.riskFactors.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments" className="pt-4">
              <Card className="p-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Net Profit</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Directive</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.departments.map((d) => (
                      <TableRow key={d.department}>
                        <TableCell className="font-medium">{d.department}</TableCell>
                        <TableCell>${d.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>${d.expenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className={d.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}>
                          ${d.netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>{d.margin.toFixed(1)}%</TableCell>
                        <TableCell>{d.roi.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={DIRECTIVE_STYLE[d.directive]}>{d.directive}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6 pt-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Department Action Plans</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.departments.map((d) => (
                    <div key={d.department} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{d.department}</span>
                          <Badge variant="outline" className={`${DIRECTIVE_STYLE[d.directive]} text-[10px]`}>{d.directive}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{result.departmentActions[d.department] || "No specific action generated."}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">CFO Strategic Advice</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2 list-decimal list-inside text-sm">
                    {result.strategicAdvice.map((s, i) => (
                      <li key={i} className="text-foreground">{s}</li>
                    ))}
                    {result.strategicAdvice.length === 0 && <p className="text-muted-foreground text-sm">No specific advice generated for this dataset.</p>}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-violet-500" /> Business Health Score</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-foreground">{result.metrics.healthScore}<span className="text-lg text-muted-foreground">/100</span></div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full ${result.metrics.healthScore >= 70 ? "bg-emerald-500" : result.metrics.healthScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${result.metrics.healthScore}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Analysis Confidence</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-foreground">{result.metrics.confidence}<span className="text-lg text-muted-foreground">%</span></div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${result.metrics.confidence}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Net Profit Margin", value: `${result.metrics.netProfitMargin.toFixed(1)}%` },
                  { label: "Expense Ratio", value: isFinite(result.metrics.expenseRatio) ? `${result.metrics.expenseRatio.toFixed(1)}%` : "N/A" },
                  { label: "Revenue Concentration (HHI)", value: result.metrics.revenueConcentrationHHI.toFixed(1) },
                  { label: "Break-Even Revenue", value: `$${result.metrics.breakEvenRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` },
                  { label: "Est. Burn Rate", value: result.metrics.monthlyBurnRate !== null ? `$${result.metrics.monthlyBurnRate.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "N/A (profitable)" },
                  { label: "Departments Analyzed", value: String(result.departments.length) },
                  { label: "Line Items Processed", value: String(result.itemCount) },
                  { label: "Status", value: result.status },
                ].map((m) => (
                  <Card key={m.label} className="bg-muted/20">
                    <CardContent className="pt-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{m.label}</p>
                      <p className="text-lg font-bold mt-1">{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Saved History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><History className="w-4 h-4" /> Saved Run History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingHistory && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loadingHistory && history.length === 0 && <p className="text-sm text-muted-foreground">No saved analyses yet.</p>}
          {history.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <button className="text-left flex-1" onClick={() => loadFromHistory(r)}>
                <span className="font-medium text-sm">{r.name}</span>
                <span className="text-xs text-muted-foreground ml-3">{new Date(r.createdAt).toLocaleString()}</span>
              </button>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLE[r.status] || ""}>{r.status}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

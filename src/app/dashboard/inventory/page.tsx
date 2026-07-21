"use client";

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Plus,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Minus,
  AlertTriangle,
  Loader2,
  Sparkles,
  PackagePlus,
  PackageMinus,
  TrendingUpDown,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { getInventoryOverview, createProduct, recordStockMovement } from "@/lib/actions/inventory";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

interface ProductInsight {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
  weeklyDemand: number[];
  forecastedWeeklyDemand: number;
  trend: "up" | "down" | "flat";
  safetyStock: number;
  suggestedReorderQty: number;
  needsReorder: boolean;
  recommendation: string | null;
}

interface InventoryOverview {
  products: ProductInsight[];
  totalProducts: number;
  lowStockCount: number;
  totalStockValue: number;
  totalReorderValue: number;
  trendingUpCount: number;
  trendingDownCount: number;
  demandChart: { name: string; demand: number; forecast?: number }[];
  insights: { summary: string; riskFactors: string[] };
  hasData: boolean;
}

const TREND_ICON = { up: ArrowUp, down: ArrowDown, flat: Minus };
const TREND_COLOR = { up: "#ef4444", down: "#10b981", flat: "#94a3b8" };

function StockGauge({ product }: { product: ProductInsight }) {
  const referenceMax = Math.max(product.currentStock, product.reorderLevel * 2, product.suggestedReorderQty + product.currentStock, 1);
  const fillPercent = Math.min(100, (product.currentStock / referenceMax) * 100);
  const reorderMarkerPercent = Math.min(100, (product.reorderLevel / referenceMax) * 100);
  const color = product.needsReorder ? "bg-red-500" : product.currentStock < product.reorderLevel * 1.5 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border/40">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${fillPercent}%` }} />
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-foreground/40"
        style={{ left: `${reorderMarkerPercent}%` }}
        title={`Reorder level: ${product.reorderLevel}`}
      />
    </div>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState<ProductInsight | null>(null);

  const [productForm, setProductForm] = useState({ name: "", sku: "", category: "", currentStock: "0", reorderLevel: "10", unitPrice: "0" });
  const [movementForm, setMovementForm] = useState({ type: "OUT" as "IN" | "OUT", quantity: "", note: "" });

  async function refresh() {
    setLoading(true);
    const res = await getInventoryOverview();
    if (res.success) setData(res.data);
    else toast.error(res.error);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateProduct() {
    if (!productForm.name || !productForm.sku) {
      toast.error("Name and SKU are required.");
      return;
    }
    const res = await createProduct(productForm);
    if (res.success) {
      toast.success(`Added product: ${productForm.name}`);
      setProductDialogOpen(false);
      setProductForm({ name: "", sku: "", category: "", currentStock: "0", reorderLevel: "10", unitPrice: "0" });
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleRecordMovement() {
    if (!movementDialogOpen) return;
    const qty = parseInt(movementForm.quantity, 10);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const res = await recordStockMovement(movementDialogOpen.id, movementForm.type, qty, movementForm.note);
    if (res.success) {
      toast.success(`${movementForm.type === "IN" ? "Received" : "Shipped"} ${qty} x ${movementDialogOpen.name}`);
      setMovementDialogOpen(null);
      setMovementForm({ type: "OUT", quantity: "", note: "" });
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <PageHeader
        icon={<Boxes />}
        theme="amber"
        title="Inventory Hub"
        subtitle="Stock levels and AI demand forecasting (exponential smoothing + safety-stock reorder recommendations), computed from real stock movement history."
        actions={
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>Products need a few weeks of stock movement history before the AI forecast has enough data.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Wireless Mouse" />
                </div>
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="WM-001" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Electronics" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Current Stock</Label>
                  <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reorder Level</Label>
                  <Input type="number" value={productForm.reorderLevel} onChange={(e) => setProductForm({ ...productForm, reorderLevel: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Price ($)</Label>
                  <Input type="number" value={productForm.unitPrice} onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
          <p>Loading inventory...</p>
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-muted-foreground">Failed to load inventory data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Total Products" value={data.totalProducts} icon={<Boxes />} theme="amber" />
            <StatCard
              label="Needs Reorder"
              value={data.lowStockCount}
              icon={<AlertTriangle />}
              theme="red"
              trend={{ text: "AI-flagged, based on forecasted demand" }}
            />
            <StatCard
              label="Demand Trend"
              value={`${data.trendingUpCount} up / ${data.trendingDownCount} down`}
              icon={<TrendingUpDown />}
              theme="indigo"
              trend={{ text: "vs. last 6 weeks" }}
            />
            <StatCard
              label="Recommended Reorder Value"
              value={`$${data.totalReorderValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              icon={<DollarSign />}
              theme="emerald"
            />
          </div>

          {!data.hasData && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-400">
                No products yet — add one above to start tracking stock and get AI demand forecasts.
              </CardContent>
            </Card>
          )}

          {data.hasData && (
            <>
              {/* AI Insights */}
              <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/[0.04] bg-gradient-to-br from-background to-indigo-50/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.07]">
                  <Sparkles className="w-28 h-28 text-indigo-500 rotate-12" />
                </div>
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-sm flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" /> AI Inventory Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-3">
                  <p className="text-sm leading-relaxed text-foreground">{data.insights.summary}</p>
                  {data.insights.riskFactors.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      {data.insights.riskFactors.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Demand Forecast Chart */}
              <Card className="border-border/50 shadow-xl shadow-black/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUpDown className="w-4 h-4 text-amber-500" /> Portfolio Demand Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.demandChart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar dataKey="demand" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual Demand" />
                        <Line type="monotone" dataKey="forecast" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3, fill: "#6366f1" }} name="AI Forecast" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Bars: real historical demand across all products. Dashed line: next week&apos;s forecast (Holt&apos;s exponential smoothing), summed per-product.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Product Cards */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-500" /> Products &amp; AI Recommendations
            </h2>
            {data.products.length === 0 ? (
              <Card className="border-border/50">
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Boxes className="w-12 h-12 mb-4 opacity-20" />
                  <p>No products yet.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.products.map((p) => {
                  const TrendIcon = TREND_ICON[p.trend];
                  return (
                    <Card
                      key={p.id}
                      className={cn(
                        "border-border/60 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden",
                        p.needsReorder && "border-red-500/30 shadow-red-500/5"
                      )}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-foreground leading-tight">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.sku} {p.category ? `· ${p.category}` : ""}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[10px] font-bold gap-1",
                              p.trend === "up" ? "bg-red-500/10 text-red-600 border-red-500/20" : p.trend === "down" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            <TrendIcon className="w-3 h-3" /> {p.forecastedWeeklyDemand}/wk
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <StockGauge product={p} />
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-medium">
                              <span className={p.currentStock <= p.reorderLevel ? "text-red-600 font-bold" : ""}>{p.currentStock} in stock</span>
                              <span>reorder @ {p.reorderLevel}</span>
                            </div>
                          </div>
                          <Sparkline data={p.weeklyDemand} colorClass={TREND_COLOR[p.trend]} width={80} height={30} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-muted/40 rounded-lg py-1.5 border border-border/40">
                            <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                              <ShieldCheck className="w-3 h-3" /> Safety Stock
                            </div>
                            <div className="text-sm font-black text-foreground">{p.safetyStock}</div>
                          </div>
                          <div className="bg-muted/40 rounded-lg py-1.5 border border-border/40">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Suggested Reorder</div>
                            <div className="text-sm font-black text-foreground">{p.suggestedReorderQty || "—"}</div>
                          </div>
                        </div>

                        {p.recommendation ? (
                          <div className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 rounded-lg px-3 py-2 leading-relaxed">
                            {p.recommendation}
                          </div>
                        ) : (
                          <div className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-lg px-3 py-2">
                            Healthy stock level — no action needed.
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              setMovementForm({ type: "IN", quantity: "", note: "" });
                              setMovementDialogOpen(p);
                            }}
                          >
                            <PackagePlus className="w-3.5 h-3.5 mr-1" /> Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              setMovementForm({ type: "OUT", quantity: "", note: "" });
                              setMovementDialogOpen(p);
                            }}
                          >
                            <PackageMinus className="w-3.5 h-3.5 mr-1" /> Ship
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!movementDialogOpen} onOpenChange={(open) => !open && setMovementDialogOpen(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {movementForm.type === "IN" ? "Receive Stock" : "Ship Stock"} &mdash; {movementDialogOpen?.name}
            </DialogTitle>
            <DialogDescription>Real movements feed the AI demand forecast above.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} placeholder="PO #1234" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRecordMovement}>Confirm {movementForm.type === "IN" ? "Receipt" : "Shipment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

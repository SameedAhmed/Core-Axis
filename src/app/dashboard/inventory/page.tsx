"use client";

import React, { useEffect, useState } from "react";
import { Boxes, Plus, ArrowUpRight, ArrowDown, ArrowUp, AlertTriangle, Loader2, Sparkles, PackagePlus, PackageMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { toast } from "sonner";
import { getInventoryOverview, createProduct, recordStockMovement } from "@/lib/actions/inventory";

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
  hasData: boolean;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <Boxes className="text-amber-600 dark:text-amber-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              Inventory Hub
            </h1>
            <p className="text-muted-foreground text-sm">
              Stock levels and AI demand forecasting (exponential smoothing + safety-stock reorder recommendations), computed from real stock movement history.
            </p>
          </div>
        </div>

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
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
          <p>Loading inventory...</p>
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-muted-foreground">Failed to load inventory data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-amber-500/10 shadow-lg shadow-amber-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
                <Boxes className="text-amber-500 w-4 h-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">{data.totalProducts}</div>
              </CardContent>
            </Card>

            <Card className="border-red-500/10 shadow-lg shadow-red-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Needs Reorder</CardTitle>
                <AlertTriangle className="text-red-500 w-4 h-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-red-600">{data.lowStockCount}</div>
                <p className="text-xs text-muted-foreground mt-1">AI-flagged, based on forecasted demand</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/10 shadow-lg shadow-emerald-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
                <ArrowUpRight className="text-emerald-500 w-4 h-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">
                  ${data.totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {!data.hasData && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-400">
                No products yet — add one above to start tracking stock and get AI demand forecasts.
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Demand Forecast &amp; Stock Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Forecasted Demand (weekly)</TableHead>
                    <TableHead>AI Recommendation</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p) => (
                    <TableRow key={p.id} className="group hover:bg-muted/30">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.sku} {p.category ? `· ${p.category}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${p.currentStock <= p.reorderLevel ? "text-red-600" : "text-foreground"}`}>
                          {p.currentStock}
                        </span>
                        <span className="text-xs text-muted-foreground"> / reorder at {p.reorderLevel}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{p.forecastedWeeklyDemand}/wk</span>
                          {p.trend === "up" && <ArrowUp className="w-3 h-3 text-red-500" />}
                          {p.trend === "down" && <ArrowDown className="w-3 h-3 text-emerald-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.recommendation ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-normal text-xs max-w-[280px] whitespace-normal">
                            {p.recommendation}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-normal text-xs">
                            Healthy stock level
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setMovementForm({ type: "IN", quantity: "", note: "" });
                            setMovementDialogOpen(p);
                          }}
                        >
                          <PackagePlus className="w-3 h-3 mr-1" /> In
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setMovementForm({ type: "OUT", quantity: "", note: "" });
                            setMovementDialogOpen(p);
                          }}
                        >
                          <PackageMinus className="w-3 h-3 mr-1" /> Out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.products.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Boxes className="w-12 h-12 mb-4 opacity-20" />
                  <p>No products yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
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

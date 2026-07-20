"use client";

import React, { useEffect, useState } from "react";
import { ReceiptText, Plus, Search, AlertCircle, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getInvoices, createInvoice, getOrganizationOptions, updateInvoiceStatus } from "@/lib/actions/finance";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  createdAt: string;
  organization: { name: string } | null;
}

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ invoiceNumber: "", amount: "", dueDate: "", organizationId: "none", notes: "" });

  async function refresh() {
    setLoading(true);
    const [invRes, orgRes] = await Promise.all([getInvoices(), getOrganizationOptions()]);
    setInvoices(invRes.success ? invRes.data : []);
    setOrganizations(orgRes.success ? orgRes.data : []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.organization?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = invoices.filter((i) => i.status === "PENDING").reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "OVERDUE").reduce((sum, inv) => sum + inv.amount, 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "PAID" && new Date(i.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, inv) => sum + inv.amount, 0);

  async function handleCreate() {
    if (!form.invoiceNumber || !form.amount || !form.dueDate) {
      toast.error("Invoice number, amount, and due date are required.");
      return;
    }
    const res = await createInvoice({ ...form, organizationId: form.organizationId === "none" ? null : form.organizationId });
    if (res.success) {
      toast.success(`Created invoice #${form.invoiceNumber}`);
      setDialogOpen(false);
      setForm({ invoiceNumber: "", amount: "", dueDate: "", organizationId: "none", notes: "" });
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleStatusChange(id: string, status: Invoice["status"]) {
    const res = await updateInvoiceStatus(id, status);
    if (res.success) {
      toast.success("Invoice updated.");
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <ReceiptText className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
              Invoices
            </h1>
            <p className="text-muted-foreground text-sm">Issue and track client payments and accounts receivable.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Real invoices feed the Finance Hub&apos;s revenue totals and forecast.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Invoice Number</Label>
                    <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-1001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount ($)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="12500.00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Client (optional)</Label>
                  <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                    <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Create Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm grow bg-gradient-to-br from-background to-emerald-50/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider italic">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.filter((i) => i.status === "PENDING").length} invoice(s) awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 shadow-sm bg-red-500/5 grow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-red-600 uppercase tracking-wider italic">Total Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-red-600/80 mt-1">{invoices.filter((i) => i.status === "OVERDUE").length} invoice(s) need attention</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm grow bg-gradient-to-br from-background to-blue-50/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider italic">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">${paidThisMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Table Area */}
      <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-5 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-bold">Billing Records</CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by invoice ID or client..."
              className="pl-10 bg-background h-10 ring-offset-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
              <p>Loading invoices...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold">Invoice ID</TableHead>
                  <TableHead className="font-bold">Client</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold hidden lg:table-cell">Due Date</TableHead>
                  <TableHead className="text-right font-bold pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="group hover:bg-emerald-500/[0.02] transition-all">
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground">#{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground">{inv.organization?.name || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Select value={inv.status} onValueChange={(v) => handleStatusChange(inv.id, v as Invoice["status"])}>
                        <SelectTrigger className="h-7 w-[130px] text-[10px] font-bold uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="OVERDUE">Overdue</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm italic text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-black text-foreground pr-6 text-base">
                      ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredInvoices.length === 0 && (
            <div className="p-20 text-center text-muted-foreground bg-muted/5 flex flex-col items-center">
              <ReceiptText className="w-16 h-16 mb-4 opacity-5" />
              <p className="text-lg font-medium opacity-40">No billing history found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

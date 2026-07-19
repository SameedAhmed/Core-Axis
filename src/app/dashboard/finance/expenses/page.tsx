"use client";

import React, { useEffect, useState } from "react";
import { Wallet, Plus, Search, ArrowUpRight, Loader2 } from "lucide-react";
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
import { createExpense, getExpenses } from "@/lib/actions/finance";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "", date: "" });

  async function refresh() {
    setLoading(true);
    const res = await getExpenses();
    setExpenses(res.success ? res.data : []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  async function handleCreate() {
    if (!form.title || !form.amount || !form.category) {
      toast.error("Title, amount, and category are required.");
      return;
    }
    const res = await createExpense(form);
    if (res.success) {
      toast.success(`Logged expense: ${form.title}`);
      setDialogOpen(false);
      setForm({ title: "", amount: "", category: "", date: "" });
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <Wallet className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Expense Ledger
            </h1>
            <p className="text-muted-foreground text-sm">Track, approve, and manage corporate spending.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Log Expense</DialogTitle>
                <DialogDescription>Real transactions feed the Finance Hub&apos;s forecast and anomaly detection.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AWS Cloud Infrastructure" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Amount ($)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1450.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Software" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Save Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Total Spend (Loaded)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" /> {expenses.length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search expenses..."
              className="pl-9 bg-background focus-visible:ring-emerald-500 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
              <p>Loading expenses...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <span className="font-semibold text-foreground">{exp.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal text-xs bg-muted border border-border text-muted-foreground">
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-foreground">
                      {new Date(exp.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">${exp.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredExpenses.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Wallet className="w-12 h-12 mb-4 opacity-20" />
              <p>No transactions found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { ReceiptText, Plus, Search, FileDown, MoreHorizontal, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_INVOICES = [
  { id: "INV-2024-001", client: "Acme Corp", email: "billing@acme.com", status: "Paid", date: "2024-03-01", dueDate: "2024-03-15", amount: 12500.00 },
  { id: "INV-2024-002", client: "Global Tech", email: "finance@globaltech.io", status: "Pending", date: "2024-03-10", dueDate: "2024-03-24", amount: 8400.00 },
  { id: "INV-2024-003", client: "Nova Solutions", email: "accounts@nova.com", status: "Overdue", date: "2024-02-15", dueDate: "2024-03-01", amount: 3200.00 },
  { id: "INV-2024-004", client: "Peak Industries", email: "billing@peak.ind", status: "Paid", date: "2024-03-18", dueDate: "2024-04-01", amount: 21500.50 },
  { id: "INV-2024-005", client: "Vertex Systems", email: "ops@vertex.sys", status: "Pending", date: "2024-03-25", dueDate: "2024-04-08", amount: 5600.00 },
  { id: "INV-2024-006", client: "Echo Design", email: "hello@echodesign.co", status: "Cancelled", date: "2024-03-05", dueDate: "2024-03-19", amount: 1500.00 },
  { id: "INV-2024-007", client: "Titan Group", email: "finance@titan.group", status: "Paid", date: "2024-02-28", dueDate: "2024-03-14", amount: 48000.00 },
];

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = DEMO_INVOICES.filter(inv => 
    inv.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = DEMO_INVOICES.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = DEMO_INVOICES.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);

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
          <Button variant="outline" className="hidden sm:flex dark:border-border/50">
            <FileDown className="w-4 h-4 mr-2" /> Bulk Download
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm grow bg-gradient-to-br from-background to-emerald-50/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider italic">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment from 2 clients</p>
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
            <div className="text-3xl font-bold text-red-600">${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-red-600/80 mt-1">1 invoice needs immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm grow bg-gradient-to-br from-background to-blue-50/10">
           <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider italic">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold text-emerald-600">$82,000.50</div>
             <p className="text-xs text-emerald-600 mt-1 flex items-center">
                ↑ 14% from last month
             </p>
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
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold">Invoice ID</TableHead>
                <TableHead className="font-bold">Client</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold hidden md:table-cell">Issue Date</TableHead>
                <TableHead className="font-bold hidden lg:table-cell">Due Date</TableHead>
                <TableHead className="text-right font-bold pr-6">Amount</TableHead>
                <TableHead className="text-right font-bold w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="group cursor-pointer hover:bg-emerald-500/[0.02] transition-all">
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                    {inv.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{inv.client}</span>
                      <span className="text-xs text-muted-foreground italic">{inv.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      px-3 py-1 font-bold text-[10px] uppercase tracking-widest
                      ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''}
                      ${inv.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : ''}
                      ${inv.status === 'Overdue' ? 'bg-red-500/10 text-red-600 border-red-500/30' : ''}
                      ${inv.status === 'Cancelled' ? 'bg-muted text-muted-foreground border-border' : ''}
                    `}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-foreground/80">
                    {inv.date}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm italic text-muted-foreground">
                    {inv.dueDate}
                  </TableCell>
                  <TableCell className="text-right font-black text-foreground pr-6 text-base">
                    ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredInvoices.length === 0 && (
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

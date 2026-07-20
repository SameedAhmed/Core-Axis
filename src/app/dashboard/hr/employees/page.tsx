"use client";

import React, { useEffect, useState } from "react";
import { UsersRound, Search, FileDown, Loader2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getEmployees, upsertEmployeeProfile } from "@/lib/actions/hr";

interface Employee {
  userId: string;
  name: string;
  email: string | null;
  department: string | null;
  designation: string | null;
  salary: number | null;
  joiningDate: string;
  hasProfile: boolean;
}

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ department: "", designation: "", salary: "" });

  async function refresh() {
    setLoading(true);
    const res = await getEmployees();
    setEmployees(res.success ? res.data : []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ department: emp.department || "", designation: emp.designation || "", salary: emp.salary?.toString() || "" });
  }

  async function handleSave() {
    if (!editing) return;
    if (!form.department || !form.designation) {
      toast.error("Department and designation are required.");
      return;
    }
    const res = await upsertEmployeeProfile({ userId: editing.userId, ...form });
    if (res.success) {
      toast.success(`Updated profile for ${editing.name}`);
      setEditing(null);
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/10 p-3 rounded-xl border border-violet-500/20">
            <UsersRound className="text-violet-600 dark:text-violet-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Employee Directory
            </h1>
            <p className="text-muted-foreground text-sm">Manage organizational structure and personnel records.</p>
          </div>
        </div>
        <Button variant="outline" className="hidden sm:flex dark:border-border/50">
          <FileDown className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg">Personnel Database ({employees.length})</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search employees..."
              className="pl-9 bg-background focus-visible:ring-violet-500 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
              <p>Loading employees...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Employee Details</TableHead>
                  <TableHead>Role &amp; Department</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.userId} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xs uppercase">
                            {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-violet-600 transition-colors">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{emp.designation || "—"}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          {emp.department || "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(emp.joiningDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={emp.hasProfile ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/50"}>
                        {emp.hasProfile ? "Profile Complete" : "Needs Profile"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <UsersRound className="w-12 h-12 mb-4 opacity-20" />
              <p>No employees found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Profile &mdash; {editing?.name}</DialogTitle>
            <DialogDescription>Department and designation are used across HR reporting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Senior Developer" />
            </div>
            <div className="space-y-1.5">
              <Label>Salary ($, optional)</Label>
              <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="65000" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

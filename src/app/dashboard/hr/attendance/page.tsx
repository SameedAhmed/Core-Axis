"use client";

import React, { useEffect, useState } from "react";
import { Clock, Search, CheckCircle2, XCircle, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAttendanceOverview, getEmployees, markAttendance } from "@/lib/actions/hr";

interface AttendanceOverview {
  totalMembers: number;
  presentToday: number;
  absentToday: number;
  anomalies: { userId: string; name: string; absentCount: number; totalDays: number; absenceRate: number }[];
  recent: { id: string; name: string; status: string; date: string }[];
  hasData: boolean;
}

export default function AttendancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<AttendanceOverview | null>(null);
  const [employees, setEmployees] = useState<{ userId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [attRes, empRes] = await Promise.all([getAttendanceOverview(), getEmployees()]);
    if (attRes.success) setData(attRes.data);
    if (empRes.success) setEmployees(empRes.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleMark(userId: string, status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE") {
    setMarkingId(userId);
    const res = await markAttendance({ userId, status });
    if (res.success) {
      toast.success(`Marked ${status.replace("_", " ").toLowerCase()} for today`);
      refresh();
    } else {
      toast.error(res.error);
    }
    setMarkingId(null);
  }

  const filteredEmployees = employees.filter((e) => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/10 p-3 rounded-xl border border-violet-500/20">
            <Clock className="text-violet-600 dark:text-violet-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Attendance Tracker
            </h1>
            <p className="text-muted-foreground text-sm">Real attendance records with AI-based absence anomaly detection.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
          <p>Loading attendance data...</p>
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-muted-foreground">Failed to load attendance data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Team Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.totalMembers}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Present Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.presentToday}</div>
              </CardContent>
            </Card>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-red-700 dark:text-red-400">Absent Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.absentToday}</div>
              </CardContent>
            </Card>
          </div>

          {data.anomalies.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" /> AI Attendance Risk &mdash; {data.anomalies.length} flagged
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.anomalies.map((a) => (
                  <div key={a.userId} className="flex justify-between items-center text-sm bg-background/60 p-2.5 rounded-lg border border-red-500/10">
                    <span className="font-medium">{a.name}</span>
                    <span className="font-bold text-red-600">
                      {a.absentCount}/{a.totalDays} days absent ({(a.absenceRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Flagged automatically: absence rate is more than 2 standard deviations above the team average over the last 30 days.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg">Mark Today&apos;s Attendance</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search team..."
                  className="pl-9 bg-background h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.userId} className="hover:bg-muted/30">
                      <TableCell className="w-[280px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xs uppercase">
                              {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {markingId === emp.userId ? (
                          <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" />
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-500/30" onClick={() => handleMark(emp.userId, "PRESENT")}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Present
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-500/30" onClick={() => handleMark(emp.userId, "ABSENT")}>
                              <XCircle className="w-3 h-3 mr-1" /> Absent
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEmployees.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No team members found.</div>}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-md flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" /> Recent Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.hasData && <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>}
              <div className="space-y-2">
                {data.recent.map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-sm bg-muted/30 p-2.5 rounded-lg border border-border/50">
                    <span>{r.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : r.status === "ABSENT"
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

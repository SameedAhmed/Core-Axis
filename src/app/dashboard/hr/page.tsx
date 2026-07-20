"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersRound, ArrowUpRight, Clock, UserCheck, Briefcase, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getHRDashboardSummary } from "@/lib/actions/hr";

interface HRSummary {
  headcount: number;
  attendanceRate: number;
  presentToday: number;
  absentToday: number;
  weeklyTrend: { name: string; present: number; absent: number }[];
  totalApplicants: number;
  interviewsScheduled: number;
  openRoles: number;
  topMatches: { name: string; role: string; score: number }[];
}

export default function HRDashboard() {
  const [data, setData] = useState<HRSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHRDashboardSummary().then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
        <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
        <p>Loading workforce analytics...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 max-w-7xl mx-auto text-center text-muted-foreground">Failed to load HR summary.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
            HR Hub
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Workforce analytics, recruitment, and attendance — from live data.</p>
        </div>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 py-1.5 px-3">
          <UsersRound className="w-4 h-4 mr-2" /> Live Data
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-violet-500/10 shadow-lg shadow-violet-500/5 hover:border-violet-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Headcount</CardTitle>
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <UsersRound className="text-violet-500 w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{data.headcount}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">Active workspace members</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/10 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Attendance</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Clock className="text-emerald-500 w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{data.attendanceRate}%</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              {data.presentToday} Present, {data.absentToday} Not marked/Absent
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/10 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all md:col-span-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Recruitment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mt-2">
              <div>
                <div className="text-2xl font-bold">{data.openRoles}</div>
                <div className="text-xs text-muted-foreground">Open Roles</div>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div>
                <div className="text-2xl font-bold">{data.totalApplicants}</div>
                <div className="text-xs text-muted-foreground">Total Applicants</div>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div>
                <div className="text-2xl font-bold text-amber-500">{data.interviewsScheduled}</div>
                <div className="text-xs text-muted-foreground">Interviewing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-xl shadow-black/5 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Attendance Trend (Last 5 Working Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="present" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm grow flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-md flex items-center gap-2"><Briefcase className="w-4 h-4" /> AI Candidate Screening</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.topMatches.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No candidates scored yet — run screening in the Recruitment page.</p>
              )}
              {data.topMatches.map((c, i) => (
                <div key={i} className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {c.score}% Match
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

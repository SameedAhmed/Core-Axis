"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersRound, ArrowUpRight, Clock, UserCheck, Briefcase, MapPin, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockAttendance = [
  { name: 'Mon', present: 45, absent: 5 },
  { name: 'Tue', present: 48, absent: 2 },
  { name: 'Wed', present: 46, absent: 4 },
  { name: 'Thu', present: 47, absent: 3 },
  { name: 'Fri', present: 44, absent: 6 },
];

export default function HRDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
            HR Hub
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Workforce analytics, recruitment, and attendance.</p>
        </div>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 py-1.5 px-3">
          <UsersRound className="w-4 h-4 mr-2" /> Live Demo mode
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
            <div className="text-3xl font-extrabold text-foreground">50</div>
            <p className="text-xs text-violet-500 flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +2 this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/10 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Attendance</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Clock className="text-emerald-500 w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-extrabold text-foreground">94%</div>
             <p className="text-xs text-emerald-500 flex items-center mt-1">
                47 Present, 3 Absent
             </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/10 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all md:col-span-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mt-2">
               <div>
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-xs text-muted-foreground">Active Jobs</div>
               </div>
               <div className="w-px h-10 bg-border/50" />
               <div>
                  <div className="text-2xl font-bold">128</div>
                  <div className="text-xs text-muted-foreground">Total Applicants</div>
               </div>
               <div className="w-px h-10 bg-border/50" />
               <div>
                  <div className="text-2xl font-bold text-amber-500">12</div>
                  <div className="text-xs text-muted-foreground">Interviews Scheduled</div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-xl shadow-black/5 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex justify-between items-center">
               Weekly Attendance Trend
               <select className="text-xs font-normal bg-muted/50 border-border rounded-md px-2 py-1 outline-none">
                  <option>This Week</option>
                  <option>Last Week</option>
               </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
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
                 {[
                   { name: 'Sarah Jenkins', role: 'Senior Developer', score: 95 },
                   { name: 'Michael Chen', role: 'Marketing Lead', score: 88 },
                   { name: 'Emma Watson', role: 'Product Manager', score: 82 },
                 ].map((c, i) => (
                   <div key={i} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                            {c.name.split(' ').map(n=>n[0]).join('')}
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
                 <button className="w-full mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400 py-2 hover:bg-violet-500/10 rounded-md transition-colors">
                    View All Candidates →
                 </button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

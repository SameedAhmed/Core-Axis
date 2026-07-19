"use client";

import React, { useState } from "react";
import { Clock, Search, Filter, ArrowUpRight, CheckCircle2, XCircle, Timer, LogIn, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DEMO_ATTENDANCE = [
  { id: "ATT-001", name: "Sarah Jenkins", status: "Present", clockIn: "08:52 AM", clockOut: "05:30 PM", totalHours: "8h 38m", date: "2024-04-07" },
  { id: "ATT-002", name: "Michael Chen", status: "Present", clockIn: "09:05 AM", clockOut: "06:15 PM", totalHours: "9h 10m", date: "2024-04-07" },
  { id: "ATT-003", name: "Emma Watson", status: "On Leave", clockIn: "-", clockOut: "-", totalHours: "-", date: "2024-04-07" },
  { id: "ATT-004", name: "David Miller", status: "Late", clockIn: "10:15 AM", clockOut: "07:05 PM", totalHours: "8h 50m", date: "2024-04-07" },
  { id: "ATT-005", name: "Sophia Patel", status: "Present", clockIn: "08:45 AM", clockOut: "05:15 PM", totalHours: "8h 30m", date: "2024-04-07" },
  { id: "ATT-006", name: "James Anderson", status: "Absent", clockIn: "-", clockOut: "-", totalHours: "-", date: "2024-04-07" },
  { id: "ATT-007", name: "Isabella Rossi", status: "Present", clockIn: "08:58 AM", clockOut: "05:45 PM", totalHours: "8h 47m", date: "2024-04-07" },
];

export default function AttendancePage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAttendance = DEMO_ATTENDANCE.filter(att => 
    att.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPresent = DEMO_ATTENDANCE.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = DEMO_ATTENDANCE.filter(a => a.status === 'Late').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/10 p-3 rounded-xl border border-violet-500/20">
            <Clock className="text-violet-600 dark:text-violet-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Attendance Logs
            </h1>
            <p className="text-muted-foreground text-sm">Monitor workforce punctuality and daily presence.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="hidden sm:flex dark:border-border/50">
             <Filter className="w-4 h-4 mr-2" /> Today's Log
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto shadow-lg shadow-violet-500/20">
             <LogIn className="w-4 h-4 mr-2" /> Manual Entry
          </Button>
        </div>
      </div>

      {/* Real-time Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-background to-violet-50/10">
           <CardHeader className="pb-2">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-violet-600 uppercase tracking-widest italic">Total Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{totalPresent} <span className="text-sm font-normal text-muted-foreground">/ {DEMO_ATTENDANCE.length}</span></div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 flex items-center">
               <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Active on platform
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 shadow-sm bg-amber-500/5">
           <CardHeader className="pb-2">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-widest italic">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-amber-600">{lateCount}</div>
            <p className="text-[10px] sm:text-xs text-amber-600/80 mt-2 flex items-center">
               <Timer className="w-3 h-3 mr-1" /> After 09:00 AM
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 shadow-sm bg-red-500/5 col-span-1 md:col-span-2">
           <CardHeader className="pb-2">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-widest italic">Today's Absences</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-end">
            <div>
               <div className="text-4xl font-black text-red-600">2</div>
               <p className="text-[10px] sm:text-xs text-red-600/80 mt-2 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" /> 1 Absent, 1 On Leave
               </p>
            </div>
            <div className="text-right pb-1">
               <Button variant="link" size="sm" className="text-red-600 p-0 h-auto font-bold uppercase tracking-widest text-[9px]">Notify Managers →</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table Area */}
      <Card className="border-border/50 shadow-2xl shadow-black/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-5 border-b border-border/50 bg-muted/[0.15]">
          <CardTitle className="text-lg font-bold">Attendance Matrix</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Filter by name..." 
              className="pl-9 bg-background h-10 ring-offset-violet-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground pl-6">Employee</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground hidden sm:table-cell">Clock In</TableHead>
                <TableHead className="font-bold text-foreground hidden sm:table-cell">Clock Out</TableHead>
                <TableHead className="font-bold text-foreground pr-6 text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((att) => (
                <TableRow key={att.id} className="group hover:bg-violet-500/[0.03] transition-colors">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-background ring-offset-2 ring-offset-muted/20">
                        <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-[10px] uppercase">
                          {att.name.split(' ').map(n=>n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-foreground group-hover:text-violet-600 transition-colors text-sm">{att.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      px-3 py-1 font-black text-[9px] uppercase tracking-tighter
                      ${att.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 ring-inset ring-1 ring-emerald-500/20' : ''}
                      ${att.status === 'Late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : ''}
                      ${att.status === 'Absent' ? 'bg-red-500/10 text-red-600 border-red-500/30' : ''}
                      ${att.status === 'On Leave' ? 'bg-muted text-muted-foreground border-border' : ''}
                    `}>
                      {att.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground italic">
                       {att.clockIn !== '-' && <LogIn className="w-3 h-3 text-emerald-500" />}
                       {att.clockIn}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground italic">
                       {att.clockOut !== '-' && <LogOut className="w-3 h-3 text-red-500" />}
                       {att.clockOut}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <span className="font-black text-foreground text-sm tracking-widest">{att.totalHours}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAttendance.length === 0 && (
            <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
              <Clock className="w-16 h-16 mb-4 opacity-5" />
              <p className="text-base font-bold opacity-30 tracking-widest uppercase">No attendance data matched.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center italic text-xs text-muted-foreground opacity-50 font-medium tracking-tighter">
         * System automatically calculates hours based on detected biometric or virtual clock-in nodes.
      </div>
    </div>
  );
}

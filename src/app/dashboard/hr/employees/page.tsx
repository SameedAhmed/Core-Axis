"use client";

import React, { useState } from "react";
import { UsersRound, Plus, Search, MoreHorizontal, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DEMO_EMPLOYEES = [
  { id: "EMP-101", name: "Sarah Jenkins", email: "sarah.j@coreaxis.com", department: "Engineering", designation: "Senior Next.js Developer", status: "Active", joinDate: "2023-01-15", performance: "Exceptional" },
  { id: "EMP-102", name: "Michael Chen", email: "michael.c@coreaxis.com", department: "Sales", designation: "Regional Manager", status: "Active", joinDate: "2023-03-22", performance: "Good" },
  { id: "EMP-103", name: "Emma Watson", email: "emma.w@coreaxis.com", department: "Product", designation: "Product Manager", status: "On Leave", joinDate: "2023-06-10", performance: "Outstanding" },
  { id: "EMP-104", name: "David Miller", email: "david.m@coreaxis.com", department: "Engineering", designation: "Backend Engineer", status: "Active", joinDate: "2023-08-05", performance: "Needs Review" },
  { id: "EMP-105", name: "Sophia Patel", email: "sophia.p@coreaxis.com", department: "HR", designation: "HR Specialist", status: "Active", joinDate: "2023-11-12", performance: "Good" },
  { id: "EMP-106", name: "James Anderson", email: "james.a@coreaxis.com", department: "Marketing", designation: "Growth Hacker", status: "Terminated", joinDate: "2022-09-01", performance: "Poor" },
  { id: "EMP-107", name: "Isabella Rossi", email: "isabella.r@coreaxis.com", department: "Support", designation: "Customer Success", status: "Active", joinDate: "2024-01-20", performance: "Good" },
];

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = DEMO_EMPLOYEES.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="hidden sm:flex dark:border-border/50">
            <FileDown className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg">Personnel Database</CardTitle>
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Employee Details</TableHead>
                <TableHead>Role & Department</TableHead>
                <TableHead className="hidden md:table-cell">Join Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xs uppercase">
                          {emp.name.split(' ').map(n=>n[0]).join('')}
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
                      <span className="font-medium text-sm">{emp.designation}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                        {emp.department}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {emp.joinDate}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      ${emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                      ${emp.status === 'On Leave' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}
                      ${emp.status === 'Terminated' ? 'bg-red-500/10 text-red-600 border-red-500/20' : ''}
                    `}>
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <UsersRound className="w-12 h-12 mb-4 opacity-20" />
              <p>No employees found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useTransition } from "react";
import { UserCheck, Plus, Search, Sparkles, BrainCircuit, Users, CalendarCheck, ArrowUpRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getCandidates, createCandidate, scoreCandidate } from "@/lib/actions/candidates";

interface Candidate {
  id: string;
  name: string;
  email: string;
  appliedRole: string;
  resumeText: string | null;
  aiScore: number | null;
  aiScoreReason: string | null;
  status: string;
  createdAt: string;
}

export default function RecruitmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({ name: "", email: "", appliedRole: "", resumeText: "" });

  async function refresh() {
    const res = await getCandidates();
    if (res.success) setCandidates(res.data);
    else toast.error(res.error);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredCandidates = candidates.filter(
    (can) =>
      can.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      can.appliedRole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleCreate() {
    if (!form.name || !form.email || !form.appliedRole) {
      toast.error("Name, email, and applied role are required.");
      return;
    }
    const res = await createCandidate(form);
    if (res.success) {
      toast.success(`${form.name} added to the pipeline.`);
      setDialogOpen(false);
      setForm({ name: "", email: "", appliedRole: "", resumeText: "" });
      refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleScore(candidate: Candidate) {
    if (!candidate.resumeText) {
      toast.error("Add resume/skills text for this candidate before screening.");
      return;
    }
    setScoringId(candidate.id);
    const res = await scoreCandidate(candidate.id);
    if (res.success) {
      toast.success(`AI screening complete: ${res.data.aiScore}%`);
      refresh();
    } else {
      toast.error(res.error);
    }
    setScoringId(null);
  }

  async function handleScoreAll() {
    const unscored = candidates.filter((c) => c.aiScore === null && c.resumeText);
    if (unscored.length === 0) {
      toast.info("No unscored candidates with resume text found.");
      return;
    }
    startTransition(async () => {
      for (const c of unscored) {
        setScoringId(c.id);
        await scoreCandidate(c.id);
      }
      setScoringId(null);
      toast.success(`Screened ${unscored.length} candidate(s).`);
      refresh();
    });
  }

  const shortlisted = candidates.filter((c) => (c.aiScore ?? 0) >= 85).length;
  const topMatches = [...candidates]
    .filter((c) => c.aiScore !== null)
    .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
    .slice(0, 3);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600/10 p-3 rounded-2xl border border-violet-500/20 shadow-inner">
            <UserCheck className="text-violet-600 dark:text-violet-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-br from-violet-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent tracking-tight">
              Recruitment Center
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              AI-powered candidate screening, using a local pretrained model &mdash; real scores, computed on your data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="ghost"
            className="hidden sm:flex text-violet-600 hover:bg-violet-500/10 font-bold uppercase tracking-widest text-[10px]"
            onClick={handleScoreAll}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
            Run Auto-Screening
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto shadow-lg shadow-violet-500/30 px-6 font-bold uppercase tracking-widest text-[10px]">
                <Plus className="w-3 h-3 mr-2" /> Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Candidate</DialogTitle>
                <DialogDescription>
                  Paste their resume or skills summary so the AI screening model has real text to compare against the role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Applied Role</Label>
                  <Input
                    value={form.appliedRole}
                    onChange={(e) => setForm({ ...form, appliedRole: e.target.value })}
                    placeholder="Senior Backend Engineer (Node.js, PostgreSQL, AWS)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Resume / Skills Summary</Label>
                  <Textarea
                    rows={6}
                    value={form.resumeText}
                    onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
                    placeholder="Paste their resume text or a summary of skills and experience..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Add Candidate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recruitment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-violet-500/20 shadow-lg shadow-violet-500/[0.03] bg-gradient-to-br from-background via-background to-violet-50/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-24 h-24 text-violet-500 -rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-[0.2em] italic">Total Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground tracking-tighter">{candidates.length}</div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center font-bold">
              <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-500" /> Live from your workspace
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 shadow-lg shadow-emerald-500/[0.03] bg-gradient-to-br from-background to-emerald-50/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-24 h-24 text-emerald-500 rotate-6" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] italic">AI Shortlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground tracking-tighter text-emerald-600">{shortlisted}</div>
            <p className="text-[10px] text-emerald-600/80 mt-2 flex items-center font-bold italic uppercase tracking-widest">
              Score &ge; 85%
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/[0.03] bg-gradient-to-br from-background to-indigo-50/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CalendarCheck className="w-24 h-24 text-indigo-500 -rotate-6" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] italic">Awaiting Screening</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground tracking-tighter text-indigo-600">
              {candidates.filter((c) => c.aiScore === null).length}
            </div>
            <p className="text-[10px] text-indigo-600/80 mt-2 flex items-center font-bold italic uppercase tracking-widest">
              Not yet AI-scored
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Candidates Table (2/3 width) */}
        <Card className="lg:col-span-2 border-border/40 shadow-2xl shadow-black/[0.02] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-6 border-b border-border/40 bg-muted/[0.1]">
            <CardTitle className="text-xl font-black italic tracking-widest uppercase text-foreground">Talent Pipeline</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
              <Input
                type="text"
                placeholder="Find candidates..."
                className="pl-9 bg-background h-10 ring-offset-violet-500 text-xs font-bold uppercase tracking-widest"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
                <p>Loading candidates...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/5 font-bold uppercase tracking-widest text-[9px] text-muted-foreground/80">
                  <TableRow className="hover:bg-transparent border-b border-border/20">
                    <TableHead className="pl-6 h-10">Candidate</TableHead>
                    <TableHead className="h-10">Applied Role</TableHead>
                    <TableHead className="h-10">Status</TableHead>
                    <TableHead className="h-10 text-right pr-6">AI Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((can) => (
                    <TableRow key={can.id} className="group hover:bg-violet-600/[0.02] transition-all border-b border-border/20">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 ring-2 ring-violet-500/10 ring-offset-2 ring-offset-background grayscale group-hover:grayscale-0 transition-all">
                            <AvatarFallback className="bg-violet-600/10 text-violet-700 font-black text-xs uppercase italic tracking-tighter">
                              {can.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-foreground group-hover:text-violet-600 transition-colors text-sm uppercase tracking-tight">
                              {can.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium italic tracking-tight">{can.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs font-bold text-foreground italic">{can.appliedRole}</span>
                        <p className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.1em] mt-1">
                          {new Date(can.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`
                            px-3 py-1 font-black text-[9px] uppercase tracking-tighter border-2
                            ${can.status === "SCREENED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}
                            ${can.status === "INTERVIEWING" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : ""}
                            ${can.status === "REJECTED" ? "bg-red-500/10 text-red-600 border-red-500/20" : ""}
                            ${can.status === "OFFERED" ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-muted text-muted-foreground border-border/50"}
                          `}
                        >
                          {can.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        {can.aiScore !== null ? (
                          <div className="flex flex-col items-end gap-1" title={can.aiScoreReason || undefined}>
                            <span
                              className={`font-black text-sm tracking-widest ${
                                can.aiScore >= 85 ? "text-emerald-600" : can.aiScore >= 70 ? "text-amber-500" : "text-red-600"
                              }`}
                            >
                              {can.aiScore}%
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border border-border/20">
                              <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                  can.aiScore >= 85 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : can.aiScore >= 70 ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                }`}
                                style={{ width: `${can.aiScore}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[9px] font-black uppercase tracking-widest h-7"
                            onClick={() => handleScore(can)}
                            disabled={scoringId === can.id}
                          >
                            {scoringId === can.id ? (
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            ) : (
                              <BrainCircuit className="w-3 h-3 mr-1.5" />
                            )}
                            Screen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && filteredCandidates.length === 0 && (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <UserCheck className="w-12 h-12 mb-4 opacity-20" />
                <p>No candidates yet. Add one to run real AI screening.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Screening Widget (1/3 width) */}
        <div className="space-y-6">
          <Card className="border-violet-500/30 shadow-2xl shadow-violet-500/[0.05] relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 text-white group">
            <div className="absolute top-0 right-0 p-4 opacity-20 animate-pulse">
              <BrainCircuit className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] italic opacity-80">Top AI Matches</CardTitle>
              <CardDescription className="text-white/80 font-medium text-[10px] uppercase tracking-widest leading-relaxed">
                Ranked by local sentence-embedding similarity between resume text and role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {topMatches.length === 0 && (
                <p className="text-[10px] text-white/70 italic">No candidates scored yet.</p>
              )}
              {topMatches.map((top) => (
                <div
                  key={top.id}
                  className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm group-hover:translate-x-1 transition-transform"
                >
                  <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tight uppercase italic">{top.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 italic">{top.appliedRole}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center font-black text-xs shadow-inner">
                    {top.aiScore}%
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-2 bg-white/5 border-white/20 hover:bg-white text-white hover:text-violet-600 font-black uppercase italic tracking-[0.2em] text-[10px] py-6 shadow-xl shadow-black/20"
                onClick={handleScoreAll}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Run Auto-Screening
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-muted/5 relative group">
            <CardHeader className="pb-3 italic">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-violet-500" /> How scoring works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-bold text-foreground leading-relaxed italic pr-4">
                Each score is computed by a local pretrained transformer (MiniLM) that embeds the candidate&apos;s resume text and the
                role description, then measures their semantic similarity &mdash; no external API calls, runs fully offline.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

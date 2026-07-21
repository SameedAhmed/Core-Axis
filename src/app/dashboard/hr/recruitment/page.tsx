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
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { BulkCvUploadDialog } from "@/components/hr/bulk-cv-upload-dialog";

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
      toast.info("Every candidate with resume text is already screened — upload or add more CVs to run it again.");
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
      <PageHeader
        icon={<UserCheck />}
        theme="violet"
        title="Recruitment Center"
        subtitle="AI-powered candidate screening, using a local pretrained model — real scores, computed on your data."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="bg-background shadow-sm border-border text-foreground hover:bg-muted font-medium h-9"
              onClick={handleScoreAll}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-violet-600" />}
              Run Auto-Screening
            </Button>

            <BulkCvUploadDialog onDone={refresh} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-medium h-9">
                  <Plus className="w-4 h-4 mr-2" /> Add Candidate
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
        }
      />

      {/* Recruitment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Applicants"
          value={candidates.length}
          icon={<Users />}
          theme="violet"
          trend={{ icon: <ArrowUpRight />, text: "Live from your workspace" }}
        />
        <StatCard
          label="AI Shortlisted"
          value={shortlisted}
          icon={<Sparkles />}
          theme="emerald"
          trend={{ text: "Score ≥ 85%" }}
        />
        <StatCard
          label="Awaiting Screening"
          value={candidates.filter((c) => c.aiScore === null).length}
          icon={<CalendarCheck />}
          theme="indigo"
          trend={{ text: "Not yet AI-scored" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Candidates Table (2/3 width) */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/40 bg-muted/20 gap-4">
            <CardTitle className="text-base font-semibold text-foreground">Talent Pipeline</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-60" />
              <Input
                type="text"
                placeholder="Find candidates..."
                className="pl-9 bg-background h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Loader2 className="w-6 h-6 mb-3 animate-spin opacity-40" />
                <p className="text-sm">Loading candidates...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b border-border/30">
                    <TableHead className="pl-6 h-10 text-xs font-medium text-muted-foreground">Candidate</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Applied Role</TableHead>
                    <TableHead className="h-10 text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-10 text-right pr-6 text-xs font-medium text-muted-foreground">AI Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((can) => (
                    <TableRow key={can.id} className="group hover:bg-violet-600/[0.03] transition-colors border-b border-border/20">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-violet-500/15">
                            <AvatarFallback className="bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold text-xs">
                              {can.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm">{can.name}</span>
                            <span className="text-xs text-muted-foreground">{can.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-sm text-foreground">{can.appliedRole}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(can.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`
                            px-2.5 py-0.5 text-xs font-medium
                            ${can.status === "SCREENED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}
                            ${can.status === "INTERVIEWING" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : ""}
                            ${can.status === "REJECTED" ? "bg-red-500/10 text-red-600 border-red-500/20" : ""}
                            ${can.status === "OFFERED" ? "bg-emerald-600 text-white border-emerald-600" : "bg-muted text-muted-foreground border-border/50"}
                          `}
                        >
                          {can.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-3.5">
                        {can.aiScore !== null ? (
                          <div className="flex flex-col items-end gap-1" title={can.aiScoreReason || undefined}>
                            <span
                              className={`font-semibold text-sm ${
                                can.aiScore >= 85 ? "text-emerald-600" : can.aiScore >= 70 ? "text-amber-500" : "text-red-600"
                              }`}
                            >
                              {can.aiScore}%
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border border-border/20">
                              <div
                                className={`h-full transition-all duration-700 ease-out rounded-full ${
                                  can.aiScore >= 85 ? "bg-emerald-500" : can.aiScore >= 70 ? "bg-amber-400" : "bg-red-500"
                                }`}
                                style={{ width: `${can.aiScore}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-medium h-7"
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
                <UserCheck className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No candidates yet. Add one or bulk-upload CVs to run real AI screening.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Screening Widget (1/3 width) */}
        <div className="space-y-6">
          <Card className="border-violet-500/20 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-violet-500/[0.04] border-b border-violet-500/10">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-violet-600" /> Top AI Matches
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ranked by local sentence-embedding similarity between resume text and role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {topMatches.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No candidates scored yet.</p>
              )}
              {topMatches.map((top) => (
                <div
                  key={top.id}
                  className="flex justify-between items-center bg-violet-500/[0.04] p-3 rounded-lg border border-violet-500/10"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm text-foreground truncate">{top.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{top.appliedRole}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full border border-violet-500/30 bg-background flex items-center justify-center font-semibold text-xs text-violet-700 dark:text-violet-300 flex-shrink-0 ml-2">
                    {top.aiScore}%
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-1 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 font-medium text-sm"
                onClick={handleScoreAll}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Run Auto-Screening
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" /> How scoring works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-foreground leading-relaxed">
                Each score is computed by a local pretrained transformer (MiniLM) that embeds the candidate&apos;s resume text and the
                role description, then measures their semantic similarity — no external API calls, runs fully offline.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

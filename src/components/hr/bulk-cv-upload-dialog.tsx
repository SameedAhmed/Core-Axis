"use client";

import { useState } from "react";
import { UploadCloud, FileText, X, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
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
import { bulkCreateCandidates, extractResumeText, scoreCandidate } from "@/lib/actions/candidates";

interface ParsedResume {
    fileName: string;
    name: string;
    email: string;
    resumeText: string;
    error?: string;
}

function guessNameFromFileName(fileName: string): string {
    const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return base
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ") || "Unnamed Candidate";
}

function guessEmailFromText(text: string, fallbackName: string): string {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) return match[0];
    const slug = fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    return `${slug || "candidate"}@resume.local`;
}

function readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function BulkCvUploadDialog({ onDone }: { onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [appliedRole, setAppliedRole] = useState("");
    const [parsing, setParsing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [resumes, setResumes] = useState<ParsedResume[]>([]);

    function reset() {
        setAppliedRole("");
        setResumes([]);
        setProgress(null);
    }

    async function handleFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        setParsing(true);
        const files = Array.from(fileList);
        const parsed: ParsedResume[] = [];

        for (const file of files) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            try {
                let text = "";
                if (ext === "pdf") {
                    const base64 = await readFileAsBase64(file);
                    const res: any = await extractResumeText(base64);
                    if (!res.success) throw new Error(res.error);
                    text = res.text;
                } else if (ext === "txt") {
                    text = await readTextFile(file);
                } else {
                    parsed.push({ fileName: file.name, name: "", email: "", resumeText: "", error: "Unsupported file type — use .pdf or .txt" });
                    continue;
                }

                text = text.trim();
                if (!text) {
                    parsed.push({ fileName: file.name, name: "", email: "", resumeText: "", error: "No readable text found in this file" });
                    continue;
                }

                const name = guessNameFromFileName(file.name);
                parsed.push({ fileName: file.name, name, email: guessEmailFromText(text, name), resumeText: text });
            } catch (e: any) {
                parsed.push({ fileName: file.name, name: "", email: "", resumeText: "", error: e.message || "Failed to read file" });
            }
        }

        setResumes((prev) => [...prev, ...parsed]);
        setParsing(false);
    }

    function removeResume(fileName: string) {
        setResumes((prev) => prev.filter((r) => r.fileName !== fileName));
    }

    function updateField(fileName: string, field: "name" | "email", value: string) {
        setResumes((prev) => prev.map((r) => (r.fileName === fileName ? { ...r, [field]: value } : r)));
    }

    async function handleSubmit() {
        const valid = resumes.filter((r) => !r.error && r.resumeText);
        if (!appliedRole.trim()) {
            toast.error("Enter the role these CVs are being screened against.");
            return;
        }
        if (valid.length === 0) {
            toast.error("No valid resumes to import.");
            return;
        }

        setSubmitting(true);
        const created: any = await bulkCreateCandidates(
            valid.map((r) => ({ name: r.name, email: r.email, appliedRole, resumeText: r.resumeText }))
        );

        if (!created.success) {
            toast.error(created.error);
            setSubmitting(false);
            return;
        }

        const createdCandidates: { id: string }[] = created.data;
        setProgress({ done: 0, total: createdCandidates.length });
        for (let i = 0; i < createdCandidates.length; i++) {
            await scoreCandidate(createdCandidates[i].id, appliedRole);
            setProgress({ done: i + 1, total: createdCandidates.length });
        }

        toast.success(`Imported and screened ${createdCandidates.length} candidate(s).`);
        setSubmitting(false);
        setOpen(false);
        reset();
        onDone();
    }

    const validCount = resumes.filter((r) => !r.error).length;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !submitting) reset();
                setOpen(next);
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="bg-background shadow-sm border-border text-foreground hover:bg-muted font-medium h-9"
                >
                    <UploadCloud className="mr-2 w-4 h-4 text-muted-foreground" />
                    Bulk Upload CVs
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-violet-600" />
                        Bulk Upload CVs
                    </DialogTitle>
                    <DialogDescription>
                        Upload multiple resumes (.pdf or .txt) for one open role. Each becomes a candidate and is
                        screened automatically against the role text below.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Applied Role</Label>
                        <Input
                            value={appliedRole}
                            onChange={(e) => setAppliedRole(e.target.value)}
                            placeholder="Senior Backend Engineer (Node.js, PostgreSQL, AWS)"
                            disabled={submitting}
                        />
                    </div>

                    <label
                        htmlFor="cv-upload"
                        className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-border bg-muted/30 hover:bg-muted/50 hover:border-violet-500/40"
                    >
                        <UploadCloud className="w-6 h-6 mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Click to select CV files</p>
                        <p className="text-xs text-muted-foreground mt-0.5">.pdf or .txt — multiple files supported</p>
                        <input
                            id="cv-upload"
                            type="file"
                            accept=".pdf,.txt"
                            multiple
                            className="hidden"
                            disabled={submitting || parsing}
                            onChange={(e) => {
                                handleFiles(e.target.files);
                                e.target.value = "";
                            }}
                        />
                    </label>

                    {parsing && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Reading files...
                        </div>
                    )}

                    {resumes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                {validCount} of {resumes.length} file(s) ready
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {resumes.map((r) => (
                                    <div
                                        key={r.fileName}
                                        className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                                            r.error ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40" : "border-border bg-muted/20"
                                        }`}
                                    >
                                        {r.error ? (
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <p className="text-xs text-muted-foreground truncate">{r.fileName}</p>
                                            {r.error ? (
                                                <p className="text-xs text-red-600">{r.error}</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input
                                                        value={r.name}
                                                        onChange={(e) => updateField(r.fileName, "name", e.target.value)}
                                                        className="h-7 text-xs"
                                                        disabled={submitting}
                                                    />
                                                    <Input
                                                        value={r.email}
                                                        onChange={(e) => updateField(r.fileName, "email", e.target.value)}
                                                        className="h-7 text-xs"
                                                        disabled={submitting}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeResume(r.fileName)}
                                            disabled={submitting}
                                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {progress && (
                        <div className="flex items-center gap-2 text-sm text-violet-600 font-medium">
                            {progress.done < progress.total ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Screening {progress.done}/{progress.total}...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" /> Screened {progress.total}/{progress.total}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || parsing || validCount === 0}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Import &amp; Screen {validCount > 0 ? `(${validCount})` : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

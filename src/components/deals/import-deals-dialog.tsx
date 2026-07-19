"use client";

import { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { importBulkDeals } from "@/lib/actions/deals";
import Papa from "papaparse";

export function ImportDealsDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== "text/csv") {
            setError("Please upload a valid CSV file.");
            setFile(null);
            setPreviewCount(null);
            return;
        }

        setError(null);
        setSuccessMsg(null);
        setFile(selectedFile);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError("Error parsing the CSV file. Please check the format.");
                    setPreviewCount(null);
                    return;
                }
                setPreviewCount(results.data.length);
            }
        });
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const deals = results.data;
                const response = await importBulkDeals(deals);

                if (response.success) {
                    setSuccessMsg(`Successfully imported ${response.count} opportunities.`);
                    setTimeout(() => {
                        setOpen(false);
                        resetState();
                    }, 2000);
                } else {
                    setError("Failed to import deals. " + response.error);
                }
                setLoading(false);
            },
            error: (error) => {
                setError("Failed to read file: " + error.message);
                setLoading(false);
            }
        });
    };

    const resetState = () => {
        setFile(null);
        setPreviewCount(null);
        setError(null);
        setSuccessMsg(null);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) resetState();
            setOpen(newOpen);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full xs:w-auto bg-background shadow-sm border-border text-foreground hover:bg-muted transition-all font-medium h-9">
                    <UploadCloud className="mr-2 w-4 h-4 text-muted-foreground" />
                    Import <span className="hidden xs:inline ml-1">Pipeline</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-zinc-200">
                <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200/60">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-primary" />
                        Import Pipeline
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-zinc-500">
                        Upload a CSV file to bulk add opportunities into your pipeline.
                    </DialogDescription>
                </div>

                <div className="p-6">
                    {!successMsg ? (
                        <div className="space-y-4">
                            <label
                                htmlFor="file-upload-deals"
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400'}`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <FileText className={`w-8 h-8 mb-2 ${file ? 'text-primary' : 'text-zinc-400'}`} />
                                    {file ? (
                                        <p className="text-sm font-semibold text-zinc-700">{file.name}</p>
                                    ) : (
                                        <>
                                            <p className="mb-1 text-sm text-zinc-600 font-medium">Click to upload CSV file</p>
                                            <p className="text-xs text-zinc-400">or drag and drop here</p>
                                        </>
                                    )}
                                </div>
                                <input id="file-upload-deals" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                            </label>

                             <div className="flex justify-between items-center text-sm">
                                <a href="/Deal_Import_Template.csv" download className="text-primary hover:underline font-medium">
                                    Download CSV Template
                                </a>
                                {previewCount !== null && !error && (
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        {previewCount} Records Found
                                    </span>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900">Import Successful!</h3>
                            <p className="text-sm text-zinc-500">{successMsg}</p>
                        </div>
                    )}
                </div>

                {!successMsg && (
                    <DialogFooter className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={!file || loading || !!error} className="min-w-[120px]">
                            {loading ? "Importing..." : "Start Import"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

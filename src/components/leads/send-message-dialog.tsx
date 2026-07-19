"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface SendMessageDialogProps {
    leadId: string;
    phone: string | null;
    firstName: string;
    compact?: boolean;
}

export function SendMessageDialog({ leadId, phone, firstName, compact = false }: SendMessageDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const router = useRouter();

    async function handleSend() {
        if (!message.trim() || !phone) return;
        setLoading(true);
        setStatus("idle");

        try {
            const res = await fetch("/api/messaging/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId, phone, message }),
            });

            if (res.ok) {
                setStatus("success");
                setMessage("");
                setTimeout(() => setOpen(false), 2000);

                // For a real app, you'd invalidate cache or call router.refresh() 
                // to see the new activity/status immediately in the UI.
                router.refresh();
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            console.error(error);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={compact ? "h-8 w-8 p-0" : "gap-2"}
                    disabled={!phone}
                    title={compact ? "Send WhatsApp Message" : undefined}
                >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    {!compact && "WhatsApp"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Message {firstName}</DialogTitle>
                    <DialogDescription className="sr-only">Compose a message to send to the lead via WhatsApp.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {!phone ? (
                        <div className="text-red-500 text-sm">This lead does not have a phone number on file.</div>
                    ) : (
                        <>
                            <div className="text-sm text-zinc-500 bg-zinc-50 p-2 rounded border border-zinc-200">
                                To: {phone}
                            </div>
                            <Textarea
                                placeholder="Hi, I saw you requested a quote..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                className="resize-none"
                            />

                            {status === "success" && (
                                <div className="text-sm text-green-600 font-medium tracking-tight">
                                    Message sent successfully!
                                </div>
                            )}
                            {status === "error" && (
                                <div className="text-sm text-red-600 font-medium tracking-tight">
                                    Failed to send message. Please try again.
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleSend}
                                    disabled={!message.trim() || loading || status === "success"}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {loading ? "Sending..." : "Send via WhatsApp"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

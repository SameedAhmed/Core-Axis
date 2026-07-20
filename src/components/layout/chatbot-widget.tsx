"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Zap, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant, confirmAssistantAction } from "@/lib/actions/chatbot";
import { cn } from "@/lib/utils";

interface PendingAction {
  name: string;
  args: Record<string, any>;
  label: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text?: string;
  pendingAction?: PendingAction;
  actionState?: "pending" | "confirmed" | "cancelled";
}

const SUGGESTED_QUESTIONS = [
  "What's our sales pipeline look like?",
  "Any inventory items that need reordering?",
  "How's this month's finance forecast?",
  "Log a $200 travel expense for today",
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! I'm your BAS assistant. Ask me about sales, finance, inventory, HR, or recruitment — or ask me to log an expense or receive stock, and I'll confirm before doing anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    const res = await askAssistant(text);
    if (res.success && res.kind === "text") {
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } else if (res.success && res.kind === "confirm") {
      const pendingAction: PendingAction = { ...res.action, label: res.label };
      setMessages((prev) => [...prev, { role: "assistant", pendingAction, actionState: "pending" }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${(res as any).error}` }]);
    }
    setLoading(false);
  }

  async function handleConfirm(index: number, action: PendingAction) {
    setConfirming(index);
    const res = await confirmAssistantAction(action.name, action.args);
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], actionState: "confirmed" };
      return [...next, { role: "assistant", text: res.success ? `✅ ${res.message}` : `⚠️ ${res.error}` }];
    });
    setConfirming(null);
  }

  function handleCancel(index: number) {
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], actionState: "cancelled" };
      return [...next, { role: "assistant", text: "Cancelled — no changes made." }];
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-2xl shadow-primary/30 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 p-0"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="font-bold text-sm text-white">BAS Assistant</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.pendingAction ? (
                  <div className="max-w-[90%] rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      <Zap className="w-3.5 h-3.5" /> Confirm action
                    </div>
                    <p className="text-sm text-foreground">{m.pendingAction.label}</p>
                    {m.actionState === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                          disabled={confirming === i}
                          onClick={() => handleConfirm(i, m.pendingAction!)}
                        >
                          {confirming === i ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={confirming === i} onClick={() => handleCancel(i)}>
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                    {m.actionState === "confirmed" && <p className="text-[11px] text-emerald-600 font-semibold">Confirmed ✓</p>}
                    {m.actionState === "cancelled" && <p className="text-[11px] text-muted-foreground font-semibold">Cancelled</p>}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground border border-border/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-border flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask, or tell me to log an expense..."
              className="h-9 text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

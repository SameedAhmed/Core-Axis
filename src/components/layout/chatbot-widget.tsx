"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Zap,
  Check,
  XCircle,
  Copy,
  CheckCheck,
  RotateCcw,
  Bot,
  User,
  DollarSign,
  Boxes,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  time: string;
}

const SUGGESTED_QUESTIONS = [
  { text: "How's our sales pipeline?", icon: TrendingUp },
  { text: "What needs reordering?", icon: Boxes },
  { text: "This month's finance forecast?", icon: DollarSign },
  { text: "How's team attendance today?", icon: Users },
];

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const initialMessage: ChatMessage = {
  role: "assistant",
  text: "Hi! I'm your BAS assistant, powered by a real LLM with live access to your workspace data. Ask me about sales, finance, inventory, HR, or recruitment — or ask me to **log an expense** or **receive stock**, and I'll confirm before doing anything.",
  time: now(),
};

/** Lightweight markdown-lite renderer: **bold**, bullet lines, and line breaks — no dependency. */
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const isBullet = /^\s*[-*]\s+/.test(line);
        const content = line.replace(/^\s*[-*]\s+/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>
          ) : (
            <React.Fragment key={j}>{part}</React.Fragment>
          )
        );
        return (
          <div key={i} className={cn(isBullet && "flex gap-1.5 pl-0.5")}>
            {isBullet && <span className="text-current opacity-50 mt-0.5">•</span>}
            <span>{parts}</span>
          </div>
        );
      })}
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      title="Copy"
    >
      {copied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text, time: now() }]);
    setInput("");
    setLoading(true);

    const res = await askAssistant(text);
    if (res.success && res.kind === "text") {
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply, time: now() }]);
    } else if (res.success && res.kind === "confirm") {
      const pendingAction: PendingAction = { ...res.action, label: res.label };
      setMessages((prev) => [...prev, { role: "assistant", pendingAction, actionState: "pending", time: now() }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${(res as any).error}`, time: now() }]);
    }
    setLoading(false);
  }

  async function handleConfirm(index: number, action: PendingAction) {
    setConfirming(index);
    const res = await confirmAssistantAction(action.name, action.args);
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], actionState: "confirmed" };
      return [...next, { role: "assistant", text: res.success ? `✅ ${res.message}` : `⚠️ ${res.error}`, time: now() }];
    });
    setConfirming(null);
  }

  function handleCancel(index: number) {
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], actionState: "cancelled" };
      return [...next, { role: "assistant", text: "Cancelled — no changes made.", time: now() }];
    });
  }

  function handleClear() {
    setMessages([{ ...initialMessage, time: now() }]);
  }

  return (
    <>
      <Button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-2xl premium-shadow shadow-indigo-500/30 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 p-0 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Open AI assistant"
      >
        {!open && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />}
        {open ? <X className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[400px] max-w-[calc(100vw-3rem)] h-[580px] max-h-[75vh] bg-card border border-indigo-500/10 rounded-3xl premium-shadow flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-4 border-b border-border bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center gap-2.5 relative overflow-hidden shrink-0">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 left-10 w-20 h-20 bg-white/5 rounded-full blur-2xl" />
            <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl relative z-10 ring-1 ring-white/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="relative z-10 flex-1">
              <div className="font-bold text-sm text-white leading-tight">BAS Assistant</div>
              <div className="text-[10px] text-white/70 font-medium">Live data · Gemini-powered</div>
            </div>
            <button
              onClick={handleClear}
              className="relative z-10 text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
              title="New conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="relative z-10 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2 group", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  <AvatarFallback
                    className={cn(
                      m.role === "user"
                        ? "bg-gradient-to-br from-primary to-blue-500 text-white"
                        : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"
                    )}
                  >
                    {m.role === "user" ? <User className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>

                <div className={cn("flex flex-col max-w-[78%]", m.role === "user" ? "items-end" : "items-start")}>
                  {m.pendingAction ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-3.5 space-y-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        <Zap className="w-3.5 h-3.5" /> Confirm action
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{m.pendingAction.label}</p>
                      {m.actionState === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
                      {m.actionState === "confirmed" && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Confirmed</p>
                      )}
                      {m.actionState === "cancelled" && <p className="text-[11px] text-muted-foreground font-semibold">Cancelled</p>}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                        m.role === "user"
                          ? "bg-gradient-to-br from-primary to-blue-600 text-primary-foreground rounded-2xl rounded-tr-md"
                          : "bg-muted/80 border border-border/60 text-foreground rounded-2xl rounded-tl-md"
                      )}
                    >
                      {m.text && <FormattedText text={m.text} />}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[9px] text-muted-foreground/60 font-medium">{m.time}</span>
                    {m.role === "assistant" && m.text && <CopyButton text={m.text} />}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                    <Sparkles className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/80 border border-border/60 rounded-2xl rounded-tl-md px-3 py-2.5">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-2 shrink-0">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q.text}
                  onClick={() => send(q.text)}
                  className="flex items-center gap-1.5 text-left text-[11px] font-medium px-2.5 py-2 rounded-xl bg-muted/60 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 text-muted-foreground border border-border/50 hover:border-indigo-500/30 transition-all duration-200"
                >
                  <q.icon className="w-3 h-3 shrink-0 opacity-70" />
                  <span className="truncate">{q.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-border flex gap-2 shrink-0 bg-background/50"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask, or tell me to log an expense..."
              className="h-10 text-sm rounded-full px-4 focus-visible:ring-indigo-500/50"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20"
              disabled={loading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

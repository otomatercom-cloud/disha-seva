"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";
import type { TicketView } from "@/lib/validation/support-ticket";

const STATUS_TONE: Record<string, string> = {
  new: "bg-navy-50 text-navy-900", in_progress: "bg-amber-100 text-amber-900",
  waiting_user: "bg-orange-100 text-orange-900", resolved: "bg-seva-50 text-seva-700", closed: "bg-slate-100 text-slate-700",
};
const fmt = (s: string) => new Date(s.replace(" ", "T") + "Z").toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function TrackForm() {
  const [token, setToken] = useState("");
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => null) };
  }

  async function find(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { ok, data } = await post("/api/support-ticket/lookup", { token });
      if (ok && data?.ticket) setTicket(data.ticket);
      else { setTicket(null); setError(data?.message ?? "Could not look that up. Please try again."); }
    } catch { setError("We could not reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !reply.trim()) return;
    setBusy(true); setReplyError(null);
    try {
      const { ok, data } = await post("/api/support-ticket/reply", { token, message: reply });
      if (ok && data?.ticket) { setTicket(data.ticket); setReply(""); }
      else setReplyError(data?.message ?? "Your message was not sent. Please try again.");
    } catch { setReplyError("We could not reach the server. Your message was not sent."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={find} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Find my request">
        <TextField label="Your tracking token" required placeholder="ABCD-EFGH-JKMN" autoComplete="off" spellCheck={false}
          value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} className="font-mono tracking-wider" error={error ?? undefined} />
        <Button type="submit" disabled={busy} className="mt-5">
          {busy && !ticket ? (<><Loader2 className="size-4 animate-spin" aria-hidden /> Searching…</>) : "Find my request"}
        </Button>
      </form>

      {ticket && (
        <Card className="space-y-6 p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{ticket.reference} · {ticket.category}</p>
              <h2 className="mt-1 text-2xl">{ticket.subject}</h2>
            </div>
            <span data-testid="status" className={cn("rounded-full px-4 py-1.5 text-sm font-bold", STATUS_TONE[ticket.status_code] ?? STATUS_TONE.new)}>{ticket.status}</span>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div>
            <div><dt className="text-slate-500">Submitted</dt><dd className="font-semibold">{fmt(ticket.created)}</dd></div>
            <div><dt className="text-slate-500">Last update</dt><dd className="font-semibold">{fmt(ticket.updated)}</dd></div>
          </dl>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm"><p className="mb-1 font-semibold text-navy-900">Your request</p><p className="whitespace-pre-wrap">{ticket.description}</p></div>

          <div>
            <h3 className="text-lg">Conversation</h3>
            {ticket.messages.length === 0 && <p className="mt-2 text-sm text-slate-500">No replies yet. We will respond as soon as possible.</p>}
            <ul className="mt-3 space-y-3">
              {ticket.messages.map((m, i) => (
                <li key={i} className={cn("rounded-2xl p-4 text-sm", m.author === "You" ? "ml-8 bg-navy-50" : "mr-8 bg-seva-50")}>
                  <p className="flex justify-between text-xs text-slate-500"><b className="text-navy-900">{m.author}</b><span>{fmt(m.date)}</span></p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {ticket.can_reply ? (
            <form onSubmit={send} aria-label="Send a message">
              <TextAreaField label="Add a message" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} error={replyError ?? undefined} />
              <Button type="submit" disabled={busy || !reply.trim()} className="mt-3">Send message</Button>
            </form>
          ) : (
            <Alert tone="info">This request is closed. If you still need help, please submit a new request.</Alert>
          )}
        </Card>
      )}
    </div>
  );
}

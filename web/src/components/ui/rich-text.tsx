import type { ReactNode } from "react";

/** Tiny safe formatter for staff-written legal text: "## " headings, "- " bullets, blank-line paragraphs, {email}. No HTML is ever injected. */
export function RichText({ source, email }: { source: string; email: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split("{email}").flatMap((part, i, arr) => [
      part,
      ...(i < arr.length - 1 ? [<a key={i} className="underline" href={`mailto:${email}`}>{email}</a>] : []),
    ]);
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) { out.push(<ul key={`u${out.length}`}>{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>); bullets = []; }
  };
  for (const line of source.replace(/\r/g, "").split("\n")) {
    const l = line.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith("- ")) { bullets.push(l.slice(2)); continue; }
    flush();
    out.push(l.startsWith("## ") ? <h2 key={out.length}>{l.slice(3)}</h2> : <p key={out.length}>{inline(l)}</p>);
  }
  flush();
  return <>{out}</>;
}

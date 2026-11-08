"use client";

import { useState } from "react";
import { ApplicationsEditor } from "./applications-editor";
import { EventsEditor } from "./events-editor";
import { ItemsEditor } from "./items-editor";
import { TextsEditor } from "./texts-editor";

const TABS = [
  ["content", "Page texts & images"],
  ["lists", "Lists & cards"],
  ["gallery", "Gallery"],
  ["events", "Events"],
  ["menu", "Menu, logo & footer"],
  ["theme", "Colours"],
  ["applications", "Membership applications"],
] as const;
type Tab = (typeof TABS)[number][0];

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("content");
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <div>
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <b className="font-display text-xl text-navy-900">DISHA Admin</b>
          <span className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" rel="noreferrer" className="text-navy-700 underline">View site</a>
            <button onClick={logout} className="rounded-full border border-slate-300 px-4 py-1.5 font-semibold">Sign out</button>
          </span>
        </div>
        <nav aria-label="Admin sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
              className={`whitespace-nowrap border-b-4 px-4 py-2.5 text-sm font-semibold ${tab === k ? "border-saffron-500 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-900"}`}>{label}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "content" && <TextsEditor mode="content" />}
        {tab === "lists" && <ItemsEditor mode="lists" />}
        {tab === "gallery" && <ItemsEditor mode="gallery" />}
        {tab === "events" && <EventsEditor />}
        {tab === "menu" && <TextsEditor mode="menu" />}
        {tab === "theme" && <TextsEditor mode="theme" />}
        {tab === "applications" && <ApplicationsEditor />}
      </main>
    </div>
  );
}

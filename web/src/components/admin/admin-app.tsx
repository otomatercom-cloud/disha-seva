"use client";

import { useState } from "react";
import { ApplicationsEditor } from "./applications-editor";
import { EventsEditor } from "./events-editor";
import { RegistrationsEditor } from "./registrations-editor";
import { ItemsEditor } from "./items-editor";
import { MembershipDashboard } from "./membership-dashboard";
import { MembersEditor } from "./members-editor";
import { PageEditor } from "./page-editor";
import { TextsEditor } from "./texts-editor";

const GROUPS = [
  { title: "Overview", tabs: [["dashboard", "Dashboard"]] },
  { title: "Membership", tabs: [["members", "Members"], ["applications", "Applications"]] },
  { title: "Events", tabs: [["events", "Events"], ["registrations", "Event registrations"]] },
  { title: "Website", tabs: [["pages", "Page editor"], ["content", "All texts (search)"], ["lists", "Lists & cards"], ["gallery", "Gallery & home slideshow"], ["menu", "Menu, logo & footer"], ["theme", "Colours"]] },
] as const;
type Tab = (typeof GROUPS)[number]["tabs"][number][0];
const TITLES = Object.fromEntries(GROUPS.flatMap((g) => g.tabs.map(([k, l]) => [k, l]))) as Record<Tab, string>;

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [open, setOpen] = useState(false);
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  const nav = (
    <nav aria-label="Admin sections" className="space-y-6 p-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>
          <ul className="space-y-0.5">
            {g.tabs.map(([k, label]) => (
              <li key={k}>
                <button onClick={() => { setTab(k); setOpen(false); }} aria-current={tab === k ? "page" : undefined}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${tab === k ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"}`}>{label}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 flex-none border-r bg-white lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">
          <p className="border-b px-6 py-4 font-display text-xl font-bold text-navy-900">DISHA Admin</p>
          {nav}
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="relative h-full w-64 overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="border-b px-6 py-4 font-display text-xl font-bold text-navy-900">DISHA Admin</p>{nav}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
          <span className="flex items-center gap-3">
            <button className="rounded-lg border px-3 py-1.5 text-sm font-semibold lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>Menu</button>
            <h1 className="text-lg font-bold text-navy-900">{TITLES[tab]}</h1>
          </span>
          <span className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" rel="noreferrer" className="text-navy-700 underline">View site</a>
            <button onClick={logout} className="rounded-full border border-slate-300 px-4 py-1.5 font-semibold">Sign out</button>
          </span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">
          {tab === "dashboard" && <MembershipDashboard />}
          {tab === "members" && <MembersEditor />}
          {tab === "applications" && <ApplicationsEditor />}
          {tab === "events" && <EventsEditor />}
          {tab === "registrations" && <RegistrationsEditor />}
          {tab === "pages" && <PageEditor />}
          {tab === "content" && <TextsEditor mode="content" />}
          {tab === "lists" && <ItemsEditor mode="lists" />}
          {tab === "gallery" && <ItemsEditor mode="gallery" />}
          {tab === "menu" && <TextsEditor mode="menu" />}
          {tab === "theme" && <TextsEditor mode="theme" />}
        </main>
      </div>
    </div>
  );
}

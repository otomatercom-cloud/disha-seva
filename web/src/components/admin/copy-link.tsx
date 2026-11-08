"use client";

import { useState } from "react";
import { btnGhost } from "./api";

/** Copies a site path as a full URL (uses the current origin). */
export function CopyLink({ path, label }: { path: string; label: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    const url = window.location.origin + path;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy this link", url); }
    setOk(true); setTimeout(() => setOk(false), 2000);
  }
  return <button type="button" className={btnGhost} onClick={copy}>{ok ? "Copied ✓" : label}</button>;
}

export type ApiResult<T = Record<string, unknown>> = { ok: boolean; status: number; data: T & { error?: string; message?: string } };

export async function api<T = Record<string, unknown>>(
  res: string, opts: { body?: unknown; query?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const qs = opts.query ? `?${new URLSearchParams(opts.query)}` : "";
  try {
    const r = await fetch(`/api/admin/${res}${qs}`, {
      method: opts.body === undefined ? "GET" : "POST",
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && data.error === "session_expired") window.location.href = "/admin/login";
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "network" } as ApiResult<T>["data"] };
  }
}

export const errText = (r: ApiResult) =>
  r.data.message || (r.data.error === "network" ? "Cannot reach the server." : "Could not save. Try again.");

const readB64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });

/** Photos over 1.5 MB are scaled to max 2000 px JPEG in the browser (keeps uploads fast and under the 8 MB limit). */
export async function fileToB64(file: File, maxDim = 2000): Promise<string> {
  if (!file.type.startsWith("image/") || file.size <= 1.5 * 1024 * 1024) return readB64(file);
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86));
  return readB64(blob);
}

export const btn = "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ";
export const btnPrimary = btn + "bg-saffron-700 text-white hover:bg-saffron-600";
export const btnGhost = btn + "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
export const btnDanger = btn + "border border-red-300 bg-white text-red-700 hover:bg-red-50";
export const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/20";

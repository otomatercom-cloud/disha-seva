"use client";

import { Camera, X } from "lucide-react";
import { useId, useState } from "react";

const MAX_SIDE = 480;

/** Resize to a small JPEG data URL in the browser (card photo, ~30-80 KB). */
async function toJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotoField({ value, onChange, error }: { value?: string; onChange: (v: string) => void; error?: string }) {
  const id = useId();
  const [msg, setMsg] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setMsg("Choose a JPG, PNG or WebP image under 10 MB.");
      return;
    }
    try {
      setMsg(null);
      onChange(await toJpeg(file));
    } catch {
      setMsg("Could not read that image. Try another photo.");
    }
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy-900">
        Passport-size photo <span className="font-normal text-slate-500">(optional, used on your membership ID card)</span>
      </label>
      <div className="flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Your selected photo" className="h-24 w-[72px] rounded-lg border border-slate-200 object-cover" />
        ) : (
          <div className="grid h-24 w-[72px] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400"><Camera className="size-6" aria-hidden /></div>
        )}
        <div className="flex flex-col gap-2">
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick}
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-navy-50 file:px-4 file:py-2 file:font-medium file:text-navy-900" />
          {value && (
            <button type="button" onClick={() => onChange("")} className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700">
              <X className="size-3" aria-hidden /> Remove photo
            </button>
          )}
        </div>
      </div>
      {(msg || error) && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{msg || error}</p>}
    </div>
  );
}

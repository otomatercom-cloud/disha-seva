import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export function FeatureCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-navy-50 text-navy-900">{icon}</div>
      <h3 className="text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </Card>
  );
}

export function ImageCard({ src, alt, title, children }: { src: string; alt: string; title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[4/3]">
        <Image src={src} alt={alt} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="p-6">
        <h3 className="text-lg">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </Card>
  );
}

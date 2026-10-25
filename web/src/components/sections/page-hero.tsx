import type { ReactNode } from "react";

export function PageHero({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="bg-gradient-to-b from-navy-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {intro && <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{intro}</p>}
      </div>
    </section>
  );
}

export function Section({ title, intro, children, tone = "white", id }: {
  title?: string; intro?: string; children: ReactNode; tone?: "white" | "tint"; id?: string;
}) {
  return (
    <section id={id} className={tone === "tint" ? "bg-navy-50/60" : "bg-white"}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {title && (
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl">{title}</h2>
            {intro && <p className="mt-3 text-slate-600">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {children}
    </div>
  );
}

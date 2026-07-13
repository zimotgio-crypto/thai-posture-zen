import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.32em] text-gold-deep", className)}>
      <span className="h-px w-8 bg-gold" />
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-7xl px-6 py-20 lg:px-10 lg:py-28", className)}>
      {children}
    </section>
  );
}
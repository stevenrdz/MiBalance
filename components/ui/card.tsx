import * as React from "react";
import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow",
        className
      )}
      {...props}
    />
  );
}


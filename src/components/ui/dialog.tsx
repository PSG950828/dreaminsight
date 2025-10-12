"use client";
import * as React from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange?.(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-10 w-[min(680px,90vw)] max-h-[85vh] overflow-auto rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 elev-3 glass-strong">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex items-center justify-end gap-2">{children}</div>;
}

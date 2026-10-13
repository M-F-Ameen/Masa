'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

export const posTokens = {
  cobalt: '#D83B0D',
  cobaltHover: '#B93009',
  navy: '#131417',
  border: '#DDE1E7',
  surface: '#EEF0F3',
  pale: '#EEF0F3',
};

const posControl = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-signal)]/30';
export const posButton = posControl + ' border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_3px_12px_rgba(19,20,23,0.04)] hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]';
export const posPrimary = posControl + ' pos-primary-action border-[var(--pos-primary)] bg-[var(--pos-primary)] text-white shadow-[0_7px_16px_rgba(19,20,23,0.2)] hover:border-[var(--pos-primary-hover)] hover:bg-[var(--pos-primary-hover)]';
export const posInput = 'min-h-11 w-full rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] px-3 py-2 text-base text-[var(--pos-foreground)] outline-none placeholder:text-[var(--pos-muted)] focus:border-[var(--pos-signal)] focus:bg-white focus:ring-2 focus:ring-[var(--pos-signal)]/15';

export function PosModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--pos-foreground)]/30 p-3 backdrop-blur-[2px]">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[16px] border border-[var(--pos-border)] bg-white p-5 text-[var(--pos-foreground)] shadow-[0_20px_60px_rgba(19,20,23,0.16)]">
      <header className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2>
        <button aria-label="إغلاق" onClick={onClose} className={posButton}><X size={18}/></button></header>
      {children}
    </section>
  </div>;
}

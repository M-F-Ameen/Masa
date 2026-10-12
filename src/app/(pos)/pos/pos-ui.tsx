'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

export const posTokens = {
  cobalt: '#2D61C9',
  cobaltHover: '#2756B8',
  navy: '#142644',
  border: '#DCE3EF',
  surface: '#F7F8FC',
  pale: '#E9EEFC',
};

const posControl = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D61C9]/30';
export const posButton = posControl + ' border-[#DCE3EF] bg-white text-[#142644] shadow-[0_3px_12px_rgba(20,38,68,0.04)] hover:border-[#C6D2E5] hover:bg-[#F7F9FD]';
export const posPrimary = posControl + ' border-[#2D61C9] bg-[#2D61C9] text-white shadow-[0_7px_16px_rgba(45,97,201,0.2)] hover:border-[#2756B8] hover:bg-[#2756B8]';
export const posInput = 'min-h-11 w-full rounded-[14px] border border-[#DCE3EF] bg-[#F7F9FD] px-3 py-2 text-base text-[#142644] outline-none placeholder:text-[#8D9AB2] focus:border-[#2D61C9] focus:bg-white focus:ring-2 focus:ring-[#2D61C9]/15';

export function PosModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#142644]/30 p-3 backdrop-blur-[2px]">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[16px] border border-[#DCE3EF] bg-white p-5 text-[#142644] shadow-[0_20px_60px_rgba(20,38,68,0.16)]">
      <header className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2>
        <button aria-label="إغلاق" onClick={onClose} className={posButton}><X size={18}/></button></header>
      {children}
    </section>
  </div>;
}

'use client';

import { Banknote, CreditCard, Split } from 'lucide-react';
import { Money } from '../../../domain/shared/value-objects/money';
import { PosPaymentMode } from '../../../domain/pos/enums';
import { PosSettings, PosTotals } from '../../../domain/pos/contracts/pos.repository';

const paymentOptions = [
  { mode: PosPaymentMode.CASH, name: 'نقدي', icon: Banknote },
  { mode: PosPaymentMode.CARD, name: 'بطاقة', icon: CreditCard },
  { mode: PosPaymentMode.MIXED, name: 'مختلط', icon: Split },
];

export function PaymentPanel({
  mode,
  setMode,
  cash,
  setCash,
  settings,
  totals,
  locked,
}: {
  mode: PosPaymentMode;
  setMode: (mode: PosPaymentMode) => void;
  cash: string;
  setCash: (value: string) => void;
  settings: PosSettings;
  totals: PosTotals | null;
  locked: boolean;
}) {
  let entered = Money.zero(settings.currency);
  try {
    entered = Money.fromDecimal(cash || '0', settings.currency);
  } catch {
    /* Invalid input handled on submit */
  }
  const total = Money.fromMinor(totals?.totalMinor ?? 0, settings.currency);

  return (
    <fieldset disabled={locked} className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {paymentOptions.map(({ mode: value, name, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === mode}
            onClick={() => setMode(value)}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-semibold transition ${
              value === mode
                ? 'border-[#2D61C9] bg-[#2D61C9] text-white shadow-[0_5px_12px_rgba(45,97,201,0.2)]'
                : 'border-[#DCE3EF] bg-white text-[#526B90] hover:bg-[#F7F9FD]'
            }`}
          >
            <Icon size={14} strokeWidth={1.75} />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {mode !== PosPaymentMode.CARD && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[#DCE3EF] bg-white px-2.5 py-1 text-xs">
            <span className="shrink-0 text-[11px] text-[#72819A]">
              {mode === PosPaymentMode.MIXED ? 'الجزء النقدي' : 'المبلغ المستلم'}
            </span>
            <input
              inputMode="decimal"
              value={cash}
              onChange={(event) => setCash(event.target.value)}
              placeholder={total.toMajor().toFixed(2)}
              className="h-7 w-24 rounded-lg border border-[#DCE3EF] bg-[#F7F9FD] px-2 text-left font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#2D61C9]"
            />
          </div>

          {mode === PosPaymentMode.CASH && total.amount > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setCash(total.toMajor().toString())}
                className="shrink-0 rounded-md bg-[#E9EEFC] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#2D61C9] transition hover:bg-[#DDE7FA]"
              >
                التمام ({total.toMajor()})
              </button>
              {[50, 100, 200, 500]
                .filter((val) => val >= total.toMajor())
                .slice(0, 3)
                .map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCash(amt.toString())}
                    className="shrink-0 rounded-md bg-[#F7F9FD] px-2 py-0.5 text-[10px] font-mono font-medium text-[#72819A] transition hover:bg-[#E9EEFC]"
                  >
                    {amt}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {mode === PosPaymentMode.CASH && entered.amount >= total.amount && (
        <div className="flex justify-between text-xs text-emerald-700 font-semibold px-1">
          <span>الباقي للعميل:</span>
          <span>{entered.subtract(total).format(settings.locale)}</span>
        </div>
      )}

      {mode === PosPaymentMode.MIXED && entered.amount < total.amount && (
        <div className="flex justify-between px-1 text-xs font-semibold text-[#2D61C9]">
          <span>على البطاقة:</span>
          <span>{total.subtract(entered).format(settings.locale)}</span>
        </div>
      )}
    </fieldset>
  );
}

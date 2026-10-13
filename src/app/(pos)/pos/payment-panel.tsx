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
                ? 'pos-selected'
                : 'border-[var(--pos-border)] bg-white text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
            }`}
          >
            <Icon size={14} strokeWidth={1.75} />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {mode !== PosPaymentMode.CARD && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[var(--pos-border)] bg-white px-2.5 py-1 text-xs">
            <span className="shrink-0 text-[11px] text-[var(--pos-muted)]">
              {mode === PosPaymentMode.MIXED ? 'الجزء النقدي' : 'المبلغ المستلم'}
            </span>
            <input
              inputMode="decimal"
              value={cash}
              onChange={(event) => setCash(event.target.value)}
              placeholder={total.toMajor().toFixed(2)}
              className="h-7 w-24 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] px-2 text-left font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[var(--pos-signal)]"
            />
          </div>

          {mode === PosPaymentMode.CASH && total.amount > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setCash(total.toMajor().toString())}
                className="shrink-0 rounded-md bg-[var(--pos-soft)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--pos-primary)] transition hover:bg-[var(--pos-soft-hover)]"
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
                    className="shrink-0 rounded-md bg-[var(--pos-soft)] px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)]"
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
        <div className="flex justify-between px-1 text-xs font-semibold text-[var(--pos-primary)]">
          <span>على البطاقة:</span>
          <span>{total.subtract(entered).format(settings.locale)}</span>
        </div>
      )}
    </fieldset>
  );
}

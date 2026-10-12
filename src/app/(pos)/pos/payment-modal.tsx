'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  Split,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
} from 'lucide-react';
import { Money } from '../../../domain/shared/value-objects/money';
import { PosPaymentMode } from '../../../domain/pos/enums';
import { PosSettings, PosTotals } from '../../../domain/pos/contracts/pos.repository';
import { OrderType } from '../../../domain/ordering/enums';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: PosTotals | null;
  settings: PosSettings;
  mode: PosPaymentMode;
  setMode: (mode: PosPaymentMode) => void;
  cash: string;
  setCash: (value: string) => void;
  onCheckout: () => void;
  isPending: boolean;
  isUncertain: boolean;
  error?: string;
  orderType: OrderType;
  tableNumber?: string | null;
}

const paymentOptions = [
  { mode: PosPaymentMode.CASH, name: 'نقدي', icon: Banknote },
  { mode: PosPaymentMode.CARD, name: 'بطاقة', icon: CreditCard },
  { mode: PosPaymentMode.MIXED, name: 'مختلط', icon: Split },
];

export function PaymentModal({
  isOpen,
  onClose,
  totals,
  settings,
  mode,
  setMode,
  cash,
  setCash,
  onCheckout,
  isPending,
  isUncertain,
  error,
  orderType,
  tableNumber,
}: PaymentModalProps) {
  const cashInputRef = useRef<HTMLInputElement>(null);

  const total = Money.fromMinor(totals?.totalMinor ?? 0, settings.currency);
  let entered = Money.zero(settings.currency);
  try {
    entered = Money.fromDecimal(cash || '0', settings.currency);
  } catch {
    /* Invalid input handled on submit */
  }

  // Auto-focus cash input when modal opens in cash mode
  useEffect(() => {
    if (isOpen && mode === PosPaymentMode.CASH) {
      setTimeout(() => {
        cashInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  // If cash is empty, default it to total when opening
  useEffect(() => {
    if (isOpen && !cash && total.amount > 0) {
      setCash(total.toMajor().toString());
    }
  }, [isOpen, cash, total, setCash]);

  if (!isOpen) return null;

  const isCashMode = mode === PosPaymentMode.CASH;
  const isCardMode = mode === PosPaymentMode.CARD;
  const isMixedMode = mode === PosPaymentMode.MIXED;

  const isCashSufficient = entered.amount >= total.amount;
  const changeDue = isCashSufficient ? entered.subtract(total) : Money.zero(settings.currency);
  const remainingCardDue = entered.amount < total.amount ? total.subtract(entered) : Money.zero(settings.currency);

  const quickAmounts = [50, 100, 200, 500, 1000].filter(
    (val) => val >= total.toMajor()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10204a]/35 p-3 backdrop-blur-[2px] sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[16px] border border-[#DCE3EF] bg-white text-[#142644] shadow-[0_20px_60px_rgba(20,38,68,0.16)] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCE3EF] bg-[#F7F9FD] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-[12px] bg-[#2D61C9] text-white shadow-[0_6px_14px_rgba(45,97,201,0.2)]">
              <Calculator size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#142644]">
                تحصيل الحساب وإتمام البيع
              </h3>
              <p className="text-xs text-[#72819A]">
                {orderType === OrderType.DINE_IN && tableNumber
                  ? `صالة — طاولة ${tableNumber}`
                  : 'طلب سفري / كاونتر'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-[10px] p-1 text-[#72819A] transition hover:bg-[#E9EEFC] hover:text-[#142644]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Total Summary Banner */}
        <div className="space-y-1 bg-[#2D61C9] p-5 text-center text-white">
          <span className="text-xs font-medium text-white/70">المبلغ الإجمالي المستحق</span>
          <div className="text-3xl font-extrabold tracking-tight font-mono text-white">
            {total.format(settings.locale)}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium border border-rose-200">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#344a78]">طريقة السداد:</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map(({ mode: value, name, icon: Icon }) => {
                const isSelected = value === mode;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    onClick={() => setMode(value)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                      isSelected
                         ? 'border-[#2D61C9] bg-[#2D61C9] text-white shadow-[0_6px_14px_rgba(45,97,201,0.2)]'
                         : 'border-[#DCE3EF] bg-white text-[#526B90] hover:bg-[#F7F9FD]'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CASH MODE CONTROLS */}
          {isCashMode && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="flex items-center justify-between font-bold text-[#142644]">
                  <span>المبلغ المستلم نقداً من العميل:</span>
                  <span className="font-mono text-[11px] font-normal text-[#8D9AB2]">
                    ({settings.currency})
                  </span>
                </label>
                <input
                  ref={cashInputRef}
                  disabled={isPending}
                  inputMode="decimal"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder={total.toMajor().toFixed(2)}
                  className="h-11 w-full rounded-[14px] border border-[#DCE3EF] bg-[#F7F9FD] text-center font-mono text-lg font-bold transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D61C9]/25"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-[#72819A]">مبالغ سريعة:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setCash(total.toMajor().toString())}
                    className="flex-1 rounded-lg border border-[#DCE3EF] bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-[#142644] shadow-2xs transition hover:bg-[#F7F9FD]"
                  >
                    التمام ({total.toMajor()})
                  </button>
                  {quickAmounts.slice(0, 4).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={isPending}
                      onClick={() => setCash(amt.toString())}
                      className="rounded-lg border border-[#DCE3EF] bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#526B90] shadow-2xs transition hover:bg-[#F7F9FD]"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change calculation box */}
              {entered.amount > 0 && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isCashSufficient
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <span className="font-bold">
                    {isCashSufficient ? 'الباقي للعميل:' : 'المتبقي تحصيله:'}
                  </span>
                  <span className="text-base font-extrabold font-mono">
                    {isCashSufficient
                      ? changeDue.format(settings.locale)
                      : total.subtract(entered).format(settings.locale)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* CARD MODE NOTICE */}
          {isCardMode && (
            <div className="space-y-1.5 rounded-[14px] border border-[#DCE3EF] bg-[#F7F9FD] p-4 text-center">
              <CreditCard size={28} className="mx-auto text-[#142644]" strokeWidth={1.5} />
              <p className="font-bold text-[#142644]">جاهز للدفع عبر نقطة البيع الإلكترونية</p>
              <p className="text-[11px] text-[#72819A]">
                مرر بطاقة العميل على جهاز الـ POS لتحصيل كامل المبلغ: {total.format(settings.locale)}
              </p>
            </div>
          )}

          {/* MIXED MODE CONTROLS */}
          {isMixedMode && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block font-bold text-[#142644]">الجزء النقدي المستلم:</label>
                <input
                  disabled={isPending}
                  inputMode="decimal"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full rounded-[12px] border border-[#DCE3EF] bg-[#F7F9FD] text-center font-mono text-base font-bold transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D61C9]/25"
                />
              </div>

            <div className="p-3 rounded-[14px] border border-[#C6D5F1] bg-[#EDF3FF] text-[#142644] flex items-center justify-between">
                <div>
                  <span className="font-bold block">المتبقي على البطاقة:</span>
                  <span className="text-[10px] text-[#2D61C9]">يُسحب من بطاقة الدفع</span>
                </div>
                <span className="text-base font-extrabold font-mono">
                  {remainingCardDue.format(settings.locale)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center gap-3 border-t border-[#DCE3EF] bg-[#F7F9FD] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-[12px] border border-[#DCE3EF] bg-white py-2.5 text-xs font-semibold text-[#526B90] transition hover:bg-[#E9EEFC]"
          >
            تراجع
          </button>
          <button
            type="button"
            disabled={isPending || (isCashMode && !isCashSufficient && entered.amount > 0)}
            onClick={onCheckout}
            className="flex-2 flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-[#2D61C9] py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(45,97,201,0.2)] transition hover:bg-[#2756B8] active:scale-98 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جارٍ التحصيل...</span>
              </>
            ) : isUncertain ? (
              <span>تأكيد العملية السابقة</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>تأكيد الدفع وإصدار الفاتورة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

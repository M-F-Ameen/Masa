'use client';

import { useState, useTransition } from 'react';
import {
  X,
  Clock,
  Plus,
  ArrowRightLeft,
  Scissors,
  CheckCircle2,
  Banknote,
  CreditCard,
  ShoppingBag,
  Printer,
  ChefHat,
  AlertCircle,
} from 'lucide-react';
import { TableStatus } from '../../../domain/tables/enums';
import { PaymentMethod } from '../../../domain/ordering/enums';
import { TableItemView } from '../../../application/tables/use-cases/list-tables.use-case';
import { Money } from '../../../domain/shared/value-objects/money';
import { SplitBillService } from '../../../domain/tables/services/split-bill.service';
import { TableBillData } from './pos-receipt';

interface TableTabModalProps {
  table: TableItemView;
  currency: string;
  currencySymbol: string;
  availableTables: TableItemView[];
  onClose: () => void;
  onStartAddItems: (table: TableItemView) => void;
  onTransferTable: (fromTableId: string, toTableId: string) => Promise<boolean>;
  onPrintBill: (tableId: string) => Promise<TableBillData | null>;
  onPrintKitchenTicket?: (table: TableItemView) => void;
  onCloseTab: (
    tableId: string,
    orderId: string,
    paymentMethod: 'CASH' | 'CARD' | 'MIXED',
    payments?: Array<{ method: 'CASH' | 'CARD'; amountMinor: number }>
  ) => Promise<boolean>;
}

type ModalView = 'DETAILS' | 'TRANSFER' | 'SPLIT' | 'SETTLE';

export function TableTabModal({
  table,
  currency,
  currencySymbol,
  availableTables,
  onClose,
  onStartAddItems,
  onTransferTable,
  onPrintBill,
  onPrintKitchenTicket,
  onCloseTab,
}: TableTabModalProps) {
  const [currentView, setCurrentView] = useState<ModalView>('DETAILS');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transfer State
  const [targetTableId, setTargetTableId] = useState<string>('');

  // Split State
  const [splitCount, setSplitCount] = useState<number>(2);

  // Settle State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [tenderedInput, setTenderedInput] = useState<string>('');

  const order = table.activeOrder;
  const totalMinor = order?.totalMinor ?? 0;
  const totalMoney = Money.fromMinor(totalMinor, currency);

  // Split Calculation
  const splitParts = SplitBillService.splitEqually(totalMoney, splitCount);

  // Change Calculation
  let tenderedMoney = totalMoney;
  try {
    tenderedMoney = tenderedInput ? Money.fromDecimal(tenderedInput, currency) : totalMoney;
  } catch {
    tenderedMoney = totalMoney;
  }
  const changeDue = tenderedMoney.isGreaterThan(totalMoney)
    ? tenderedMoney.subtract(totalMoney)
    : Money.zero(currency);

  // Handle Transfer Submit
  const handleTransferSubmit = () => {
    if (!targetTableId) {
      setErrorMsg('يرجى تحديد الطاولة الجديدة لنقل الطلب إليها');
      return;
    }
    startTransition(async () => {
      setErrorMsg(null);
      const success = await onTransferTable(table.id, targetTableId);
      if (success) {
        onClose();
      } else {
        setErrorMsg('فشل نقل الطاولة، يرجى المحاولة مرة أخرى');
      }
    });
  };

  // Handle Print Bill
  const handlePrintBill = () => {
    if (!order) return;
    startTransition(async () => {
      setErrorMsg(null);
      await onPrintBill(table.id);
    });
  };

  // Handle Settle Submit
  const handleSettleSubmit = () => {
    if (!order) return;
    startTransition(async () => {
      setErrorMsg(null);
      const settleMethod: 'CASH' | 'CARD' = paymentMethod === PaymentMethod.CARD ? 'CARD' : 'CASH';
      const payments = [
        {
          method: settleMethod,
          amountMinor: totalMinor,
        },
      ];
      const success = await onCloseTab(table.id, order.id, settleMethod, payments);
      if (success) {
        onClose();
      } else {
        setErrorMsg('فشل تحصيل الطلب، تأكد من فتح الوردية وتطابق المبالغ');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--pos-foreground)]/35 p-3 backdrop-blur-[2px] sm:p-4 animate-in fade-in"
      dir="rtl"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[16px] border border-[var(--pos-border)] bg-white p-4 text-[var(--pos-foreground)] shadow-[0_20px_60px_rgba(19,20,23,0.16)] sm:p-5 animate-in zoom-in-95">
        {/* Modal Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--pos-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--pos-primary)] font-bold text-white shadow-[0_6px_14px_rgba(19,20,23,0.2)]">
              {table.tableNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--pos-foreground)]">
                  جلسة طاولة {table.tableNumber}
                </h3>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    table.status === TableStatus.BILL_PRINTED
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[var(--pos-info)] text-white'
                  }`}
                >
                  {table.status === TableStatus.BILL_PRINTED ? 'مطبوع الشيك' : 'مشغولة'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--pos-muted)]">
                {table.sectionNameAr || 'صالة عامة'} · {order?.guestCount || 2} ضيوف · منذ{' '}
                {order?.minutesSeated || 0} دقيقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-1 text-[var(--pos-muted)] hover:bg-[var(--pos-soft)] hover:text-[var(--pos-foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium shrink-0">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Main View: Tab Order Items & Totals */}
        {currentView === 'DETAILS' && (
          <div className="flex-1 min-h-0 flex flex-col py-3 space-y-3 overflow-hidden">
            {/* Order info ribbon */}
            <div className="flex shrink-0 items-center justify-between rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-2.5 text-xs">
              <span className="font-mono font-bold text-[var(--pos-muted)]">
                #{order?.orderNumber || 'DINE-TAB'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--pos-muted)]">
                <Clock className="size-3 text-[var(--pos-muted)]" />
                <span>جلسة منذ {order?.minutesSeated || 0} دقيقة</span>
              </span>
            </div>

            {/* Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
              {!order || !order.items || order.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--pos-muted)]">
                  <ShoppingBag className="mx-auto mb-1 size-6 text-[var(--pos-metal)]" />
                  <p>لا توجد أصناف في الطلب المفتوح بعد</p>
                </div>
              ) : (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-[12px] border border-[var(--pos-border)] bg-white p-2.5 text-xs shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--pos-foreground)]">{item.productNameAr}</span>
                        {item.sizeNameAr && (
                          <span className="text-[10px] text-[var(--pos-muted)]">({item.sizeNameAr})</span>
                        )}
                      </div>

                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="truncate text-[10px] text-[var(--pos-muted)]">
                          + {item.modifiers.map((m) => m.nameAr).join('، ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-left" dir="ltr">
                      <span className="text-xs font-mono text-[var(--pos-muted)]">x{item.quantity}</span>
                      <span className="text-xs font-mono font-bold text-[var(--pos-foreground)]">
                        {(item.totalPriceMinor / 100).toFixed(2)} {currencySymbol}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals Summary */}
            <div className="flex shrink-0 flex-col space-y-1.5 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-3 text-xs">
              <div className="flex justify-between text-[var(--pos-muted)]">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">
                  {((order?.subtotalMinor ?? 0) / 100).toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="flex justify-between text-[var(--pos-muted)]">
                <span>الضريبة (14%):</span>
                <span className="font-mono">
                  {((order?.taxMinor ?? 0) / 100).toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--pos-border)] pt-1.5 text-sm font-bold text-[var(--pos-foreground)]">
                <span>الإجمالي المستحق:</span>
                <span className="font-mono text-base">
                  {(totalMinor / 100).toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 pt-1 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => {
                  onStartAddItems(table);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--pos-border)] bg-white py-2 font-semibold text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] active:scale-95"
              >
                <Plus className="size-3.5 text-[var(--pos-primary)]" />
                <span>إضافة أصناف</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('TRANSFER')}
                className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--pos-border)] bg-white py-2 font-semibold text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] active:scale-95"
              >
                <ArrowRightLeft className="size-3.5 text-[var(--pos-primary)]" />
                <span>نقل الطاولة</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBill}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--pos-border)] bg-white py-2 font-semibold text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] active:scale-95"
              >
                <Printer className="size-3.5 text-[var(--pos-primary)]" />
                <span>طباعة الشيك</span>
              </button>

              {onPrintKitchenTicket && (
                <button
                  type="button"
                  onClick={() => onPrintKitchenTicket(table)}
                  disabled={isPending || !order || !order.items || order.items.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--pos-border)] bg-white py-2 font-semibold text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] active:scale-95"
                  title="طباعة بون المطبخ (KOT)"
                >
                  <ChefHat className="size-3.5 text-[var(--pos-primary)]" />
                  <span>بون المطبخ</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentView('SPLIT')}
                className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--pos-border)] bg-white py-2 font-semibold text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] active:scale-95"
              >
                <Scissors className="size-3.5 text-[var(--pos-primary)]" />
                <span>تقسيم الشيك</span>
              </button>
            </div>

            {/* Primary Settle Button */}
            <div className="pt-1 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentView('SETTLE')}
              className="pos-primary-action flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--pos-primary)] py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(19,20,23,0.2)] hover:bg-[var(--pos-primary-hover)] active:scale-95 transition"
              >
                <CheckCircle2 className="size-4" />
                <span>تحصيل وإغلاق الطاولة ({(totalMinor / 100).toFixed(2)} {currencySymbol})</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Sub-View: Transfer Table */}
        {currentView === 'TRANSFER' && (
          <div className="py-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--pos-border)] pb-2">
              <span className="text-sm font-bold text-[var(--pos-foreground)]">نقل الطلب إلى طاولة أخرى</span>
              <button
                type="button"
                onClick={() => setCurrentView('DETAILS')}
                className="text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]"
              >
                رجوع للحساب
              </button>
            </div>

            <p className="text-[var(--pos-muted)]">
              اختر الطاولة الفارغة لنقل الطلب المفتوح الحالي من طاولة{' '}
              <strong className="text-[var(--pos-foreground)]">{table.tableNumber}</strong>:
            </p>

            {availableTables.filter((t) => t.id !== table.id).length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-[var(--pos-border)] py-6 text-center text-[var(--pos-muted)]">
                لا توجد طاولات فارغة متاحة حالياً لنقل الطلب إليها.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-56 overflow-y-auto p-1">
                {availableTables
                  .filter((t) => t.id !== table.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetTableId(t.id)}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-right transition ${
                        targetTableId === t.id
                        ? 'pos-selected'
                        : 'border-[var(--pos-border)] bg-[var(--pos-soft)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
                      }`}
                    >
                      <span className="font-bold text-sm">طاولة {t.tableNumber}</span>
                      <span className="text-[10px] opacity-75">{t.sectionNameAr || 'صالة'}</span>
                    </button>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-[var(--pos-border)] pt-3">
              <button
                type="button"
                onClick={() => setCurrentView('DETAILS')}
                className="rounded-[12px] border border-[var(--pos-border)] px-4 py-2 font-medium text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleTransferSubmit}
                disabled={!targetTableId || isPending}
              className="pos-primary-action rounded-xl bg-[var(--pos-primary)] px-4 py-2 font-semibold text-white hover:bg-[var(--pos-primary-hover)] disabled:opacity-50"
              >
                {isPending ? 'جاري النقل...' : 'تأكيد نقل الطلب'}
              </button>
            </div>
          </div>
        )}

        {/* 3. Sub-View: Split Bill */}
        {currentView === 'SPLIT' && (
          <div className="py-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--pos-border)] pb-2">
              <span className="text-sm font-bold text-[var(--pos-foreground)]">تقسيم الشيك بالتساوي</span>
              <button
                type="button"
                onClick={() => setCurrentView('DETAILS')}
                className="text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]"
              >
                رجوع للحساب
              </button>
            </div>

            <div className="flex items-center justify-between rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-3">
              <span className="font-semibold text-[var(--pos-muted)]">عدد الأفراد للتقسيم:</span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSplitCount(count)}
                    className={`size-8 rounded-lg font-bold transition ${
                      splitCount === count
                      ? 'pos-selected'
                        : 'border border-[var(--pos-border)] bg-white text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {splitParts.map((part, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-[12px] border border-[var(--pos-border)] bg-white p-2.5 text-xs shadow-2xs"
                >
                  <span className="font-medium text-[var(--pos-muted)]">الضيف رقم {index + 1}:</span>
                  <span className="text-sm font-mono font-bold text-[var(--pos-foreground)]">
                    {(part.amount / 100).toFixed(2)} {currencySymbol}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--pos-border)] pt-2 text-xs text-[var(--pos-muted)]">
              <span>الإجمالي: {(totalMinor / 100).toFixed(2)} {currencySymbol}</span>
              <button
                type="button"
                onClick={() => setCurrentView('SETTLE')}
              className="pos-primary-action rounded-xl bg-[var(--pos-primary)] px-4 py-2 font-semibold text-white hover:bg-[var(--pos-primary-hover)]"
              >
                المتابعة للدفع
              </button>
            </div>
          </div>
        )}

        {/* 4. Sub-View: Settle (Pay & Close) */}
        {currentView === 'SETTLE' && (
          <div className="py-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--pos-border)] pb-2">
              <span className="text-sm font-bold text-[var(--pos-foreground)]">تحصيل الحساب وإغلاق الطاولة</span>
              <button
                type="button"
                onClick={() => setCurrentView('DETAILS')}
                className="text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]"
              >
                رجوع
              </button>
            </div>

            {/* Total due display */}
            <div className="rounded-2xl bg-[var(--pos-primary)] p-4 text-center text-white">
              <p className="text-[11px] text-white">إجمالي المبلغ المطلوب تحصيله</p>
              <h2 className="mt-1 text-2xl font-black font-mono">
                {(totalMinor / 100).toFixed(2)} {currencySymbol}
              </h2>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[var(--pos-muted)]">طريقة الدفع:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                    paymentMethod === PaymentMethod.CASH
                      ? 'pos-selected'
                      : 'border-[var(--pos-border)] bg-white text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
                  }`}
                >
                  <Banknote className="size-4" />
                  <span>نقدي (Cash)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                    paymentMethod === PaymentMethod.CARD
                      ? 'pos-selected'
                      : 'border-[var(--pos-border)] bg-white text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>بطاقة (Card / POS)</span>
                </button>
              </div>
            </div>

            {/* Cash Tender & Change (if cash) */}
            {paymentMethod === PaymentMethod.CASH && (
              <div className="space-y-2 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--pos-muted)]">المبلغ المستلم:</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder={(totalMinor / 100).toFixed(2)}
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
              className="w-32 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] px-2.5 py-1 text-left font-mono font-bold text-[var(--pos-foreground)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pos-signal)]/25"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[var(--pos-border)] pt-1 font-semibold text-emerald-800">
                  <span>الباقي للعميل:</span>
                  <span className="font-mono font-bold">
                    {(changeDue.amount / 100).toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Settle */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--pos-border)] pt-3">
              <button
                type="button"
                onClick={() => setCurrentView('DETAILS')}
                className="rounded-[12px] border border-[var(--pos-border)] px-4 py-2 font-medium text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                disabled={isPending}
              className="pos-primary-action rounded-xl bg-[var(--pos-primary)] px-5 py-2.5 font-bold text-white shadow-[0_8px_18px_rgba(19,20,23,0.2)] hover:bg-[var(--pos-primary-hover)] disabled:opacity-50"
              >
                {isPending ? 'جاري إتمام التحصيل...' : 'تأكيد استلام المبلغ وإغلاق الطاولة'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

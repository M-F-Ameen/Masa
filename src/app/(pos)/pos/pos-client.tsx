'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bell,
  Printer,
  Store,
  ShoppingCart,
  ChevronLeft,
  Utensils,
  X,
  Armchair,
  Plus,
  ChefHat,
  CheckCircle2,
  WifiOff,
  RefreshCw,
  Search,
  Menu,
} from 'lucide-react';
import { PosReceipt, PosShift } from '../../../domain/pos/contracts/pos.repository';
import { Money } from '../../../domain/shared/value-objects/money';
import { TableStatus } from '../../../domain/tables/enums';
import { OrderType } from '../../../domain/ordering/enums';
import { PosCatalog } from './pos-catalog';
import { ProductPicker } from './product-picker';
import { CartLines, CartTypeSelector, CartOptions, CartTotals } from './pos-cart';
import { PaymentModal } from './payment-modal';
import { ShiftPanel } from './shift-panel';
import {
  PosReceiptPrint,
  TableBillPrint,
  TableBillData,
  CombinedPosSlipPrint,
} from './pos-receipt';
import { KitchenOrderTicketPrint, KitchenTicketData } from '../../../components/printing/kitchen-order-ticket';
import { TableItemView } from '../../../application/tables/use-cases/list-tables.use-case';
import { PosFloorPlan } from './pos-floor-plan';
import { TablePickerModal } from './table-picker-modal';
import { TableTabModal } from './table-tab-modal';
import { PosModal, posButton, posPrimary } from './pos-ui';
import { PosClientProps } from './pos.types';
import { PosWorkspace, usePosWorkspace } from './use-pos-workspace';

function RecentReceipts({
  receipts,
  onPrint,
  onPrintKot,
  onClose,
}: {
  receipts: PosReceipt[];
  onPrint: (receipt: PosReceipt) => void;
  onPrintKot?: (receipt: PosReceipt) => void;
  onClose: () => void;
}) {
  return (
    <PosModal title="آخر فواتير الكاشير في الفرع" onClose={onClose}>
      {!receipts.length && <p className="text-sm text-[var(--pos-muted)]">لا توجد مبيعات بعد.</p>}
      {receipts.map((receipt) => (
        <div
          key={receipt.id}
          className="mb-3 flex items-center justify-between gap-2 rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-3"
        >
          <div>
            <p className="break-all text-xs" dir="ltr">
              {receipt.orderNumber}
            </p>
            <p className="mt-1 text-sm font-bold">
              {Money.fromMinor(receipt.totalMinor, receipt.currency).format(receipt.locale)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPrint(receipt)}
              className={posButton}
              title={'طباعة الفاتورة ' + receipt.orderNumber}
            >
              <Printer size={16} />
            </button>
            {onPrintKot && (
              <button
                onClick={() => onPrintKot(receipt)}
                className={posButton}
                title={'طباعة بون المطبخ ' + receipt.orderNumber}
              >
                <ChefHat size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </PosModal>
  );
}

function PostSaleModal({
  receipt,
  currency,
  autoPrintKot,
  onToggleAutoPrintKot,
  onPrintReceipt,
  onPrintKot,
  onPrintBoth,
  onClose,
}: {
  receipt: PosReceipt;
  currency: string;
  autoPrintKot: boolean;
  onToggleAutoPrintKot: (val: boolean) => void;
  onPrintReceipt: (receipt: PosReceipt) => void;
  onPrintKot: (receipt: PosReceipt) => void;
  onPrintBoth: (receipt: PosReceipt) => void;
  onClose: () => void;
}) {
  return (
    <PosModal title="تم تسجيل العملية بنجاح" onClose={onClose}>
      <div className="space-y-4 py-2">
        {/* Order Success Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[var(--pos-foreground)]" dir="ltr">
                #{receipt.orderNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--pos-foreground)] text-white">
                {receipt.type === OrderType.DINE_IN ? 'صالة' : 'سفري'}
              </span>
              {receipt.orderNumber.startsWith('OFFLINE-') && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  أوفلاين (محلي)
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--pos-muted)] font-bold mt-0.5">
              الإجمالي:{' '}
              {Money.fromMinor(receipt.totalMinor, currency).format(receipt.locale)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onPrintReceipt(receipt)}
            className="flex items-center justify-center gap-2 min-h-12 p-3 rounded-[14px] border border-[var(--pos-border)] bg-white hover:bg-[var(--pos-soft)] text-[var(--pos-foreground)] text-xs font-bold transition shadow-[0_3px_10px_rgba(19,20,23,0.04)]"
          >
            <Printer className="w-4 h-4 text-[var(--pos-muted)]" />
            <span>طباعة فاتورة العميل</span>
          </button>

          <button
            type="button"
            onClick={() => onPrintKot(receipt)}
            className="flex items-center justify-center gap-2 min-h-12 p-3 rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] hover:bg-[var(--pos-soft-hover)] text-[var(--pos-primary)] text-xs font-bold transition shadow-[0_3px_10px_rgba(19,20,23,0.08)]"
          >
            <ChefHat className="w-4 h-4 text-[var(--pos-primary)]" />
            <span>طباعة بون المطبخ (KOT)</span>
          </button>

          <button
            type="button"
            onClick={() => onPrintBoth(receipt)}
            className="pos-primary-action sm:col-span-2 flex items-center justify-center gap-2 min-h-14 p-3 rounded-[14px] bg-[var(--pos-primary)] hover:bg-[var(--pos-primary-hover)] text-white text-xs font-bold transition shadow-[0_7px_16px_rgba(19,20,23,0.18)]"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة وبون المطبخ معاً</span>
          </button>
        </div>

        {/* Auto-print KOT toggle */}
        <div className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--pos-soft)] border border-[var(--pos-border)] text-xs">
          <label htmlFor="auto-print-kot-toggle" className="cursor-pointer font-medium text-[var(--pos-muted)] select-none">
            طباعة بون المطبخ تلقائياً مع الفاتورة عند كل بيع
          </label>
          <input
            id="auto-print-kot-toggle"
            type="checkbox"
            checked={autoPrintKot}
            onChange={(e) => onToggleAutoPrintKot(e.target.checked)}
            className="size-4 rounded border-[var(--pos-metal)] text-[var(--pos-primary)] focus:ring-[var(--pos-signal)] cursor-pointer"
          />
        </div>

        {/* Dismiss / New Order */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-12 py-2.5 rounded-[14px] border border-[var(--pos-border)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)] text-xs font-semibold transition"
        >
          طلب جديد (متابعة)
        </button>
      </div>
    </PosModal>
  );
}

function PosHeader({
  state,
  cartItemCount,
  onOpenMobileCart,
  search,
  onSearchChange,
}: {
  state: PosWorkspace;
  cartItemCount: number;
  onOpenMobileCart: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [headerDateTime, setHeaderDateTime] = useState({ date: '', time: '' });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).formatToParts(now);
      const timeParts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(now);
      const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? '';
      setHeaderDateTime({
        date: [part(dateParts, 'weekday'), part(dateParts, 'day'), part(dateParts, 'month'), part(dateParts, 'year')].join(' '),
        time: `${part(timeParts, 'hour')}:${part(timeParts, 'minute')} ${part(timeParts, 'dayPeriod')}`.trim(),
      });
    };
    updateDateTime();
    const timer = window.setInterval(updateDateTime, 30_000);
    return () => window.clearInterval(timer);
  }, [state.settings.locale]);

  const occupiedTablesCount = state.tables.filter(
    (t) => t.status === TableStatus.OCCUPIED || t.status === TableStatus.BILL_PRINTED
  ).length;

return (
<header className="relative z-20 flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--pos-canvas)] px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-4 lg:px-8">
      <div dir="rtl" className="flex min-w-0 basis-full items-center gap-3 lg:flex-1 lg:basis-auto">
        {/* Cashier menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="القائمة"
            title="القائمة"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="grid size-14 shrink-0 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          {userMenuOpen && (
            <div dir="rtl" role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-[16px] border border-[var(--pos-border)] bg-white p-2 text-sm text-[var(--pos-foreground)] shadow-[0_18px_45px_rgba(19,20,23,0.14)]">
              {!state.offlineSync.isOnline ? (
                <div className="mb-1 flex items-center gap-2 rounded-[12px] bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  <WifiOff size={15} />
                  <span>أوفلاين{state.offlineSync.pendingCount ? ` (${state.offlineSync.pendingCount})` : ''}</span>
                </div>
              ) : state.offlineSync.pendingCount > 0 ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => state.offlineSync.syncNow()}
                  disabled={state.offlineSync.isSyncing}
                  className="mb-1 flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={state.offlineSync.isSyncing ? 'animate-spin' : ''} />
                  {state.offlineSync.isSyncing ? 'جاري المزامنة...' : `مزامنة (${state.offlineSync.pendingCount})`}
                </button>
              ) : (
                <div className="mb-1 flex items-center gap-2 rounded-[12px] bg-[var(--pos-soft)] px-3 py-2 text-xs text-[var(--pos-muted)]">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  متصل
                </div>
              )}


        {state.shift && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    state.setViewMode(state.viewMode === 'FLOOR_PLAN' ? 'SALE' : 'FLOOR_PLAN');
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]"
                >
                  <span className="flex items-center gap-2"><Armchair size={15} />{state.viewMode === 'FLOOR_PLAN' ? 'الطلب السريع' : 'خريطة الصالة'}</span>
                  {occupiedTablesCount > 0 && <span className="rounded-full bg-[var(--pos-soft)] px-1.5 text-[10px] text-[var(--pos-primary)]">{occupiedTablesCount}</span>}
                </button>
              )}

              <Link
                href="/pos/phone-orders"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]"
              >
                <ShoppingCart size={15} />
                طلبات الهاتف
              </Link>

              <button
                type="button"
                role="menuitem"
                disabled={state.sale.locked || state.items.length > 0}
                onClick={() => {
                  state.setShowShift(true);
                  setUserMenuOpen(false);
                }}
                className="flex w-full items-center rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state.shift ? 'إغلاق الوردية' : 'فتح وردية'}
              </button>

              <Link href="/admin" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]">
                <ArrowRight size={15} />
                الإدارة
              </Link>
            </div>
          )}
        </div>
        {state.settings.logoUrl ? (
          <Image
            src={state.settings.logoUrl}
            alt={state.settings.nameAr}
            width={180}
            height={64}
            unoptimized
            className="h-14 w-32 shrink-0 object-contain sm:w-40"
          />
        ) : (
          <span className="pos-brand-mark grid size-14 shrink-0 place-items-center rounded-[16px] shadow-[0_7px_15px_rgba(19,20,23,0.14)]">
            <Utensils size={24} strokeWidth={1.7} />
          </span>
        )}
        <label className="flex h-14 min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-[var(--pos-border)] bg-white px-3.5 text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition focus-within:border-[var(--pos-signal)] focus-within:ring-2 focus-within:ring-[var(--pos-signal)]/10">
          <Search size={20} strokeWidth={1.8} className="shrink-0 text-[var(--pos-muted)]" />
          <input
            aria-label="البحث عن صنف"
            placeholder="ابحث عن صنف بالاسم..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--pos-foreground)] outline-none placeholder:text-[var(--pos-muted)] focus:ring-0"
          />
        </label>
      </div>

      <div dir="ltr" className="flex shrink-0 items-center gap-2.5 lg:gap-3">
<div className="hidden h-14 w-[190px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border border-[var(--pos-border)] bg-white px-2 text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] lg:flex">
          <span dir="ltr" className="text-2xl font-extrabold leading-none tabular-nums">
            {headerDateTime.time || '—'}
          </span>
          <div dir="rtl" className="w-full whitespace-nowrap text-center text-xs font-semibold leading-none text-[var(--pos-muted)]">
            {headerDateTime.date || '—'}
          </div>
        </div>

        <button
          type="button"
          aria-label="آخر الفواتير"
          title="آخر الفواتير"
          onClick={() => state.setShowHistory(true)}
className="relative grid size-14 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]"
        >
          <Bell size={20} strokeWidth={1.7} />
          {state.receipts.length > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-[var(--pos-signal)]" />}
        </button>

        <button
          type="button"
          aria-label="طباعة"
          title="طباعة"
          onClick={() => window.print()}
className="hidden size-14 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)] sm:grid"
        >
          <Printer size={20} strokeWidth={1.7} />
        </button>

        {state.shift && (
          <button
            type="button"
            onClick={onOpenMobileCart}
            aria-label="سلة الطلب الحالية"
className="relative grid size-14 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-muted)] transition hover:bg-[var(--pos-soft)] lg:hidden"
          >
            <ShoppingCart size={18} strokeWidth={1.75} />
            {cartItemCount > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[var(--pos-primary)] text-[9px] font-bold text-white">{cartItemCount}</span>}
          </button>
        )}
      </div>
    </header>
  );
}

function PosSalePanel({
  state,
  isMobile,
  onClose,
}: {
  state: PosWorkspace;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const { sale, totals, pricingError } = state;

  return (
    <aside className="flex h-full flex-col justify-between overflow-hidden rounded-[16px] border border-[var(--pos-border)] bg-white shadow-[0_5px_16px_rgba(19,20,23,0.05)]">
      {/* 1. Header: Order Title & Order Type (سفري / صالة) */}
      <div className="shrink-0 border-b border-[var(--pos-border)] bg-white p-4 sm:p-5">
        <div className="relative flex items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق السلة"
                className="absolute left-0 grid size-8 place-items-center rounded-[10px] border border-[var(--pos-border)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
              >
                <X size={16} />
              </button>
            )}
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--pos-foreground)] sm:text-base">
              <ShoppingCart size={19} strokeWidth={1.75} className="text-[var(--pos-foreground)]" />
              الطلب الحالي
            </h2>
          </div>
        </div>

        <div className="mt-2.5">
          <CartTypeSelector
            type={state.type}
            setType={state.setType}
            locked={sale.locked}
            selectedTable={state.selectedTable}
            guestCount={state.guestCount}
            activeTabOrderId={state.activeTabOrderId}
            onOpenTablePicker={() => state.setIsTablePickerOpen(true)}
            onClearTable={() => {
              state.setSelectedTable(null);
              state.setActiveTabOrderId(null);
            }}
            onGuestCountChange={state.setGuestCount}
          />
        </div>
      </div>

      {/* 2. Middle: Cart Lines (THE ONLY SCROLLABLE PART) */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--pos-surface)] p-3 sm:p-4">
        <CartLines
          items={state.items}
          products={state.products}
          settings={state.settings}
          locked={sale.locked}
          changeQuantity={state.changeQuantity}
        />
      </div>

      {/* 3. Bottom: Pinned Summary, Compact Options, Payment Trigger */}
      <div className="shrink-0 space-y-3 border-t border-[var(--pos-border)] bg-white p-4 sm:p-5">
        <CartTotals totals={totals} settings={state.settings} />
        <CartOptions
          canDiscount={state.canDiscount}
          discount={state.discount}
          setDiscount={state.setDiscount}
          notes={state.notes}
          setNotes={state.setNotes}
          settings={state.settings}
          locked={sale.locked}
        />

        {(pricingError || sale.error) && (
          <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 font-medium">
            {sale.error || pricingError}
          </p>
        )}

        {/* Context-aware Checkout Buttons */}
        {state.activeTabOrderId ? (
          <button
            disabled={!state.items.length}
            onClick={() => state.addItemsToTab(state.activeTabOrderId!)}
            className="pos-primary-action flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-[var(--pos-primary)] hover:bg-[var(--pos-primary-hover)] w-full py-2.5 text-sm font-bold text-white shadow-[0_7px_16px_rgba(19,20,23,0.18)] active:scale-95 transition disabled:opacity-50"
          >
            <Plus size={16} />
            <span>إرسال الأصناف لطاولة {state.selectedTable?.tableNumber}</span>
          </button>
        ) : state.type === OrderType.DINE_IN && state.selectedTable ? (
          <div className="space-y-1.5">
            <button
              disabled={!state.items.length}
              onClick={() => state.openTableTab(state.selectedTable!.id, state.guestCount)}
              className="pos-primary-action flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-[var(--pos-foreground)] hover:bg-[var(--pos-primary-hover)] w-full py-2.5 text-xs font-bold text-white shadow-[0_6px_14px_rgba(19,20,23,0.14)] active:scale-95 transition disabled:opacity-50"
            >
              <Armchair size={15} />
              <span>حفظ كطلب مفتوح لطاولة {state.selectedTable.tableNumber}</span>
            </button>
            <button
              disabled={sale.pending || (!sale.uncertain && !totals) || !state.items.length}
              onClick={() => state.setIsPaymentModalOpen(true)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] hover:bg-[var(--pos-soft)] w-full py-2 text-xs font-semibold text-[var(--pos-muted)] active:scale-95 transition disabled:opacity-50"
            >
              <span>دفع وتحصيل فوري بالكاونتر</span>
            </button>
          </div>
        ) : (
          <button
            disabled={sale.pending || (!sale.uncertain && !totals) || !state.items.length}
            onClick={() => {
              if (sale.uncertain) {
                state.checkout();
              } else {
                state.setIsPaymentModalOpen(true);
              }
            }}
            className={posPrimary + ' pos-checkout min-h-[76px] w-full py-2.5 rounded-[14px] text-sm font-bold shadow-[0_8px_18px_rgba(19,20,23,0.18)]'}
          >
            {sale.pending
              ? 'جارٍ تسجيل البيع...'
              : sale.uncertain
              ? 'تأكيد نتيجة العملية السابقة'
              : totals
              ? `دفع وتحصيل (${Money.fromMinor(totals.totalMinor, state.settings.currency).format(state.settings.locale)})`
              : 'دفع وتحصيل'}
          </button>
        )}

        <p className="text-center text-[10px] text-[var(--pos-muted)]">
          المبلغ شامل الضريبة؛ تُراجع الأسعار والتوفر عند الحفظ.
        </p>
      </div>
    </aside>
  );
}

function PosDialogs({
  state,
  onPrintReceipt,
  onPrintBill,
  onPrintKotFromTable,
  onPrintKotFromReceipt,
}: {
  state: PosWorkspace;
  onPrintReceipt: (receipt: PosReceipt) => void;
  onPrintBill: (tableId: string) => Promise<TableBillData | null>;
  onPrintKotFromTable: (table: TableItemView) => void;
  onPrintKotFromReceipt: (receipt: PosReceipt) => void;
}) {
  return (
    <>
      {state.product && (
        <ProductPicker
          product={state.product}
          currency={state.settings.currency}
          locale={state.settings.locale}
          onAdd={state.add}
          onClose={() => state.setProduct(null)}
        />
      )}
      {state.showShift && (
        <ShiftPanel
          branchId={state.branch.id}
          currency={state.settings.currency}
          locale={state.settings.locale}
          shift={state.shift}
          onClose={() => state.setShowShift(false)}
          onDone={(value: PosShift | null, message: string) => {
            state.setShift(value);
            state.setShowShift(false);
            state.setNotice(message);
          }}
        />
      )}
      {state.showHistory && (
        <RecentReceipts
          receipts={state.receipts}
          onPrint={onPrintReceipt}
          onPrintKot={onPrintKotFromReceipt}
          onClose={() => state.setShowHistory(false)}
        />
      )}

      {/* Table Picker Popup */}
      {state.isTablePickerOpen && (
        <TablePickerModal
          tables={state.tables}
          sections={state.sections}
          selectedTableId={state.selectedTable?.id ?? null}
          onSelectTable={(table) => {
            state.setSelectedTable(table);
            state.setType(OrderType.DINE_IN);
          }}
          onSelectOccupiedTable={(table) => {
            state.setActiveTabModalTable(table);
          }}
          onClose={() => state.setIsTablePickerOpen(false)}
        />
      )}

      {/* Active Table Tab Drawer / Modal */}
      {state.activeTabModalTable && (
        <TableTabModal
          table={state.activeTabModalTable}
          currency={state.settings.currency}
          currencySymbol={state.settings.currency === 'EGP' ? 'ج.م' : state.settings.currency}
          availableTables={state.tables.filter((t) => t.status === TableStatus.AVAILABLE)}
          onClose={() => state.setActiveTabModalTable(null)}
          onStartAddItems={(table) => {
            state.setSelectedTable(table);
            state.setActiveTabOrderId(table.activeOrderId);
            state.setType(OrderType.DINE_IN);
            state.setViewMode('SALE');
            state.setActiveTabModalTable(null);
          }}
          onTransferTable={state.transferTable}
          onPrintBill={onPrintBill}
          onPrintKitchenTicket={onPrintKotFromTable}
          onCloseTab={state.closeTableTab}
        />
      )}

      {/* Central Checkout Payment Modal */}
      {state.isPaymentModalOpen && state.items.length > 0 && (
        <PaymentModal
          isOpen={true}
          onClose={() => state.setIsPaymentModalOpen(false)}
          totals={state.totals}
          settings={state.settings}
          mode={state.mode}
          setMode={state.setMode}
          cash={state.cash}
          setCash={state.setCash}
          onCheckout={state.checkout}
          isPending={state.sale.pending}
          isUncertain={state.sale.uncertain}
          error={state.sale.error || state.pricingError}
          orderType={state.type}
          tableNumber={state.selectedTable?.tableNumber}
        />
      )}
    </>
  );
}

function PosContent({
  state,
  showMobileCart,
  setShowMobileCart,
  search,
}: {
  state: PosWorkspace;
  showMobileCart: boolean;
  setShowMobileCart: (show: boolean) => void;
  search: string;
}) {
  const cartItemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  if (!state.shift) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
        <Store size={40} strokeWidth={1.5} className="text-[var(--pos-muted)]" />
        <h2 className="font-semibold text-[var(--pos-foreground)]">افتح وردية الكاشير لبدء البيع</h2>
        <button className={posPrimary} onClick={() => state.setShowShift(true)}>
          فتح وردية
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[var(--pos-canvas)] p-2.5 sm:p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,25%)] lg:gap-3.5 lg:p-2">
      {/* 1. Catalog / Floor Plan Area */}
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[var(--pos-border)] bg-white pb-24 shadow-[0_5px_16px_rgba(19,20,23,0.04)] lg:pb-0">
        {state.viewMode === 'FLOOR_PLAN' ? (
          <PosFloorPlan
            tables={state.tables}
            sections={state.sections}
            currencySymbol={state.settings.currency === 'EGP' ? 'ج.م' : state.settings.currency}
            isRefreshing={state.isRefreshingTables}
            onRefresh={state.refreshTables}
            onSelectAvailableTable={(table, guests) => {
              state.setSelectedTable(table);
              state.setGuestCount(guests);
              state.setType(OrderType.DINE_IN);
              state.setActiveTabOrderId(null);
              state.setViewMode('SALE');
            }}
            onSelectOccupiedTable={(table) => {
              state.setActiveTabModalTable(table);
            }}
            onSwitchToCatalog={() => state.setViewMode('SALE')}
          />
        ) : (
          <div className="flex-1 h-full overflow-y-auto">
            <PosCatalog
              categories={state.categories}
              currency={state.settings.currency}
              locale={state.settings.locale}
              disabled={state.sale.locked}
              search={search}
              onSelect={state.setProduct}
            />
          </div>
        )}
      </div>

      {/* 2. Desktop Permanent Sale Panel (Hidden on mobile, pristine on lg+) */}
      <div className="hidden h-full overflow-hidden lg:block">
        <PosSalePanel state={state} />
      </div>

      {/* 3. Mobile Floating Sticky Cart Bar (Shown on < lg when cart has items) */}
      {cartItemCount > 0 && !showMobileCart && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-30 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="pos-primary-action flex w-full items-center justify-between rounded-[16px] border border-[var(--pos-primary-hover)] bg-[var(--pos-primary)] p-3 text-white shadow-[0_12px_26px_rgba(19,20,23,0.24)] transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
               <span className="relative grid size-9 place-items-center rounded-xl bg-white/15 text-white">
                <ShoppingCart size={18} strokeWidth={1.8} />
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-white text-[10px] font-black text-[var(--pos-primary)] shadow-xs">
                  {cartItemCount}
                </span>
              </span>
              <div className="text-right">
                 <p className="text-[10px] text-white">إجمالي الطلب</p>
                <p className="text-xs sm:text-sm font-extrabold text-white">
                  {Money.fromMinor(
                    state.totals?.totalMinor ?? 0,
                    state.settings.currency
                  ).format(state.settings.locale)}
                </p>
              </div>
            </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-[var(--pos-primary-hover)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--pos-primary-hover)]">
              <span>عرض السلة والدفع</span>
              <ChevronLeft size={15} />
            </div>
          </button>
        </div>
      )}

      {/* 4. Mobile Bottom Sheet / Drawer for Cart & Checkout */}
      {showMobileCart && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop blur overlay */}
          <div
            onClick={() => setShowMobileCart(false)}
            className="fixed inset-0 bg-[var(--pos-foreground)]/45 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Slide-up Container */}
          <div className="relative z-10 w-full max-h-[92vh] bg-white rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Grab handle */}
            <div className="w-12 h-1 rounded-full bg-[var(--pos-border)] mx-auto my-2 shrink-0" />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <PosSalePanel
                state={state}
                isMobile
                onClose={() => setShowMobileCart(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ActivePrintDoc =
  | { type: 'RECEIPT'; receipt: PosReceipt }
  | { type: 'KOT'; ticket: KitchenTicketData }
  | { type: 'COMBINED'; receipt: PosReceipt; ticket: KitchenTicketData }
  | { type: 'BILL'; bill: TableBillData }
  | null;

export function PosClient(props: PosClientProps) {
  const state = usePosWorkspace(props);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [search, setSearch] = useState('');
  const [activePrintDoc, setActivePrintDoc] = useState<ActivePrintDoc>(null);

  // Auto-print KOT preference (saved in localStorage)
  const [autoPrintKot, setAutoPrintKot] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resto_pos_auto_print_kot') === 'true';
    }
    return false;
  });

  const handleToggleAutoPrintKot = (enabled: boolean) => {
    setAutoPrintKot(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('resto_pos_auto_print_kot', String(enabled));
    }
  };

  // Safely trigger print dialog whenever an active print document is queued
  useEffect(() => {
    if (!activePrintDoc) return;
    const timer = setTimeout(() => {
      window.print();
    }, 120);
    return () => clearTimeout(timer);
  }, [activePrintDoc]);

  const handlePrintReceipt = (receipt: PosReceipt) => {
    setActivePrintDoc({ type: 'RECEIPT', receipt });
  };

  const handlePrintBill = async (tableId: string) => {
    const billData = await state.printTableBill(tableId);
    if (billData) {
      setActivePrintDoc({ type: 'BILL', bill: billData });
    }
    return billData;
  };

  const handlePrintKotFromTable = (table: TableItemView) => {
    if (!table.activeOrder || !table.activeOrder.items) return;
    const order = table.activeOrder;
    const orderItems = order.items ?? [];
    if (orderItems.length === 0) return;
    setActivePrintDoc({
      type: 'KOT',
      ticket: {
        orderNumber: order.orderNumber,
        type: 'DINE_IN',
        tableName: table.tableNumber,
        sectionName: table.sectionNameAr ?? null,
        guestCount: order.guestCount,
        customerName: null,
        customerNotes: null,
        kitchenNotes: null,
        createdAt: order.openedAt,
        branchName: state.branch.nameAr,
        cashierName: null,
        items: orderItems.map((i) => ({
          id: i.id,
          productNameAr: i.productNameAr,
          sizeNameAr: i.sizeNameAr,
          quantity: i.quantity,
          modifiers: i.modifiers.map((m) => ({ nameAr: m.nameAr })),
        })),
      },
    });
  };

  const handlePrintKotFromReceipt = (receipt: PosReceipt) => {
    setActivePrintDoc({
      type: 'KOT',
      ticket: {
        orderNumber: receipt.orderNumber,
        type: receipt.type,
        tableName: null,
        sectionName: null,
        guestCount: null,
        customerName: receipt.customerName,
        customerNotes: receipt.customerNotes,
        kitchenNotes: null,
        createdAt: receipt.createdAt,
        branchName: receipt.branchName,
        cashierName: null,
        items: receipt.items.map((i) => ({
          productNameAr: i.productNameAr,
          productNameEn: i.productNameEn,
          sizeNameAr: i.sizeNameAr,
          quantity: i.quantity,
          modifiers: i.modifiers.map((m) => ({ nameAr: m.nameAr })),
        })),
      },
    });
  };

  const handlePrintBoth = (receipt: PosReceipt) => {
    const kotTicket: KitchenTicketData = {
      orderNumber: receipt.orderNumber,
      type: receipt.type,
      tableName: null,
      sectionName: null,
      guestCount: null,
      customerName: receipt.customerName,
      customerNotes: receipt.customerNotes,
      kitchenNotes: null,
      createdAt: receipt.createdAt,
      branchName: receipt.branchName,
      cashierName: null,
      items: receipt.items.map((i) => ({
        productNameAr: i.productNameAr,
        productNameEn: i.productNameEn,
        sizeNameAr: i.sizeNameAr,
        quantity: i.quantity,
        modifiers: i.modifiers.map((m) => ({ nameAr: m.nameAr })),
      })),
    };
    setActivePrintDoc({ type: 'COMBINED', receipt, ticket: kotTicket });
  };

  // When sale completes, execute auto-print or default receipt print
  useEffect(() => {
    if (!state.lastCompletedReceipt) return;
    const receipt = state.lastCompletedReceipt;
    const timer = setTimeout(() => {
      if (autoPrintKot) {
        handlePrintBoth(receipt);
      } else {
        handlePrintReceipt(receipt);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [state.lastCompletedReceipt, autoPrintKot]);

  const cartItemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const isMobileCartOpen = showMobileCart && cartItemCount > 0;

  return (
    <div
      dir="rtl"
      className="pos-app h-screen max-h-screen overflow-hidden flex flex-col bg-[var(--pos-canvas)] text-[var(--pos-foreground)] font-sans"
    >
      <div className="flex flex-col flex-1 min-h-0 print:hidden overflow-hidden">
        <PosHeader
          state={state}
          cartItemCount={cartItemCount}
          onOpenMobileCart={() => setShowMobileCart(true)}
          search={search}
          onSearchChange={setSearch}
        />
        {state.notice && (
          <p
            role="status"
            className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-6 py-2 text-xs text-emerald-800 font-medium"
          >
            {state.notice}
          </p>
        )}
        <PosContent
          state={state}
          showMobileCart={isMobileCartOpen}
          setShowMobileCart={setShowMobileCart}
          search={search}
        />
        <PosDialogs
          state={state}
          onPrintReceipt={handlePrintReceipt}
          onPrintBill={handlePrintBill}
          onPrintKotFromTable={handlePrintKotFromTable}
          onPrintKotFromReceipt={handlePrintKotFromReceipt}
        />
      </div>

      {/* Post-Sale Modal (Options: Print Receipt, Print KOT, Print Both, Auto-Print toggle) */}
      {state.lastCompletedReceipt && (
        <PostSaleModal
          receipt={state.lastCompletedReceipt}
          currency={state.settings.currency}
          autoPrintKot={autoPrintKot}
          onToggleAutoPrintKot={handleToggleAutoPrintKot}
          onPrintReceipt={handlePrintReceipt}
          onPrintKot={handlePrintKotFromReceipt}
          onPrintBoth={handlePrintBoth}
          onClose={() => state.setLastCompletedReceipt(null)}
        />
      )}

      {/* Printable Thermal Receipt & Guest Check (Only ONE active document rendered at a time to prevent duplicate / interleaved prints) */}
      {activePrintDoc?.type === 'RECEIPT' && (
        <PosReceiptPrint receipt={activePrintDoc.receipt} restaurantName={state.settings.nameAr} />
      )}
      {activePrintDoc?.type === 'BILL' && (
        <TableBillPrint bill={activePrintDoc.bill} restaurantName={state.settings.nameAr} />
      )}
      {activePrintDoc?.type === 'KOT' && (
        <KitchenOrderTicketPrint ticket={activePrintDoc.ticket} restaurantName={state.settings.nameAr} />
      )}
      {activePrintDoc?.type === 'COMBINED' && (
        <CombinedPosSlipPrint
          receipt={activePrintDoc.receipt}
          ticket={activePrintDoc.ticket}
          restaurantName={state.settings.nameAr}
        />
      )}
    </div>
  );
}

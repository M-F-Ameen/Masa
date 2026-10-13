'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Armchair, Users, X } from 'lucide-react';
import { PosProduct, PosSelection, PosSettings, PosTotals } from '../../../domain/pos/contracts/pos.repository';
import { Money } from '../../../domain/shared/value-objects/money';
import { OrderType } from '../../../domain/ordering/enums';
import { TableItemView } from '../../../application/tables/use-cases/list-tables.use-case';

export interface PosCartProps {
  items: PosSelection[];
  products: PosProduct[];
  settings: PosSettings;
  totals: PosTotals | null;
  locked: boolean;
  canDiscount: boolean;
  discount: string;
  type: OrderType.DINE_IN | OrderType.TAKEAWAY;
  notes: string;
  setNotes: (value: string) => void;
  setDiscount: (value: string) => void;
  setType: (value: OrderType.DINE_IN | OrderType.TAKEAWAY) => void;
  changeQuantity: (index: number, delta: number) => void;
  selectedTable?: TableItemView | null;
  guestCount?: number;
  activeTabOrderId?: string | null;
  onOpenTablePicker?: () => void;
  onClearTable?: () => void;
  onGuestCountChange?: (count: number) => void;
}

export function CartTypeSelector({
  type,
  setType,
  locked,
  selectedTable,
  guestCount = 2,
  activeTabOrderId,
  onOpenTablePicker,
  onClearTable,
  onGuestCountChange,
}: {
  type: OrderType.DINE_IN | OrderType.TAKEAWAY;
  setType: (type: OrderType.DINE_IN | OrderType.TAKEAWAY) => void;
  locked: boolean;
  selectedTable?: TableItemView | null;
  guestCount?: number;
  activeTabOrderId?: string | null;
  onOpenTablePicker?: () => void;
  onClearTable?: () => void;
  onGuestCountChange?: (count: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-[56px] gap-1 rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-1">
        {([OrderType.TAKEAWAY, OrderType.DINE_IN] as const).map((t) => (
          <button
            key={t}
            disabled={locked}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-[11px] text-xs font-semibold transition ${
              type === t
                ? 'pos-order-type-selected font-bold'
                : 'text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]'
            }`}
          >
            {t === OrderType.TAKEAWAY ? 'سفري' : 'صالة'}
          </button>
        ))}
      </div>

      {/* Dine-In Table Picker Section */}
      {type === OrderType.DINE_IN && (
        <div className="animate-in fade-in">
          {activeTabOrderId ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="grid size-6 place-items-center rounded-lg bg-[var(--pos-primary)] text-white font-bold text-[11px]">
                  {selectedTable?.tableNumber || '#'}
                </div>
                <div>
                <p className="font-bold text-[var(--pos-foreground)]">إضافة طلبات لطاولة {selectedTable?.tableNumber}</p>
                <p className="text-[10px] text-[var(--pos-muted)]">طلب مفتوح جاري</p>
                </div>
              </div>
            </div>
          ) : selectedTable ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pos-foreground)] text-white font-bold text-xs">
                  {selectedTable.tableNumber}
                </div>
                <div className="truncate">
                  <p className="font-bold text-[var(--pos-foreground)] truncate">طاولة {selectedTable.tableNumber}</p>
                  <p className="truncate text-[10px] text-[var(--pos-muted)]">
                    {selectedTable.sectionNameAr || 'صالة عامة'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Guest Count Stepper */}
                <div className="flex items-center gap-1 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] px-1.5 py-0.5">
        <button
                    type="button"
                    onClick={() => onGuestCountChange?.(Math.max(1, guestCount - 1))}
                    className="size-4 text-[var(--pos-muted)] hover:text-[var(--pos-primary)] font-bold text-[11px]"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-bold text-[var(--pos-foreground)] min-w-4 text-center">
                    {guestCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => onGuestCountChange?.(Math.min(20, guestCount + 1))}
                    className="size-4 text-[var(--pos-muted)] hover:text-[var(--pos-primary)] font-bold text-[11px]"
                  >
                    +
                  </button>
                  <Users className="size-3 text-[var(--pos-muted)]" />
                </div>

                <button
                  type="button"
                  onClick={onOpenTablePicker}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
                >
                  تغيير
                </button>

                <button
                  type="button"
                  onClick={onClearTable}
                  className="grid size-5 place-items-center rounded-md text-[var(--pos-muted)] hover:text-rose-600"
                  title="إلغاء تحديد الطاولة"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={onOpenTablePicker}
              className="flex w-full items-center justify-between rounded-[14px] border border-dashed border-[var(--pos-metal)] bg-[var(--pos-soft)] px-2.5 py-2 text-xs font-semibold text-[var(--pos-muted)] hover:border-[var(--pos-metal)] hover:bg-white active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2">
                <Armchair className="size-4 text-[var(--pos-muted)]" strokeWidth={1.8} />
                <span>اختر الطاولة من الصالة...</span>
              </div>
              <span className="text-[10px] text-[var(--pos-muted)] font-mono">تحديد ▾</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CartLines({
  items,
  products,
  settings,
  locked,
  changeQuantity,
}: Pick<PosCartProps, 'items' | 'products' | 'settings' | 'locked' | 'changeQuantity'>) {
  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-10 text-center text-[var(--pos-metal)]">
        <ShoppingCart size={42} strokeWidth={1.35} className="mb-3 text-[var(--pos-metal)]" />
        <p className="text-sm font-bold text-[var(--pos-foreground)]">سلة الطلب فارغة</p>
        <span className="mt-1 text-xs text-[var(--pos-muted)]">اضغط على أي صنف لإضافته للطلب</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-0.5">
      {items.map((item, index) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const size = product.sizes.find((candidate) => candidate.id === item.sizeId)!;
        const modifiers = product.modifierGroups
          .flatMap((group) => group.modifiers)
          .filter((modifier) => item.modifierIds.includes(modifier.id));
        const price = modifiers.reduce(
          (sum, modifier) => sum.add(Money.fromMinor(modifier.priceDelta, settings.currency)),
          Money.fromMinor(size.price, settings.currency)
        );

        return (
          <div
            key={index}
            className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--pos-border)] bg-white p-2.5 shadow-[0_3px_10px_rgba(19,20,23,0.04)] transition-colors hover:border-[var(--pos-metal)]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
              <p className="truncate text-xs font-bold text-[var(--pos-foreground)]">{product.nameAr}</p>
                <p className="font-mono text-xs font-bold text-[var(--pos-foreground)] shrink-0">
                  {price.multiply(item.quantity).format(settings.locale)}
                </p>
              </div>
              {(size.nameAr || modifiers.length > 0) && (
                <p className="mt-0.5 truncate text-[10px] text-[var(--pos-muted)]">
                  {size.nameAr}
                  {modifiers.map((m) => ` + ${m.nameAr}`)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 border-s border-[var(--pos-border)] ps-1.5">
              <button
                type="button"
                disabled={locked}
                aria-label={'تقليل ' + product.nameAr}
                onClick={() => changeQuantity(index, -1)}
                className="grid size-7 place-items-center rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)] active:scale-95 disabled:opacity-40 transition"
              >
                <Minus size={12} />
              </button>
              <span className="w-4 text-center font-mono text-xs font-bold text-[var(--pos-foreground)]">
                {item.quantity}
              </span>
              <button
                type="button"
                disabled={locked || item.quantity >= 99}
                aria-label={'زيادة ' + product.nameAr}
                onClick={() => changeQuantity(index, 1)}
                className="grid size-7 place-items-center rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)] active:scale-95 disabled:opacity-40 transition"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CartOptions({
  canDiscount,
  discount,
  setDiscount,
  notes,
  setNotes,
  settings,
  locked,
}: Pick<
  PosCartProps,
  'canDiscount' | 'discount' | 'setDiscount' | 'notes' | 'setNotes' | 'settings' | 'locked'
>) {
  const [showNotes, setShowNotes] = useState(Boolean(notes));
  const [showDiscount, setShowDiscount] = useState(Boolean(discount && discount !== '0'));

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        {!showNotes ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => setShowNotes(true)}
            className="text-[11px] font-semibold text-[var(--pos-muted)] hover:text-[var(--pos-foreground)] transition py-0.5 px-1.5 rounded hover:bg-[var(--pos-soft)]"
          >
            + ملاحظة
          </button>
        ) : (
          <div className="relative flex-1">
            <input
              disabled={locked}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="ملاحظات الطلب..."
              className="w-full h-7 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--pos-signal)]"
            />
            {notes === '' && (
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[var(--pos-muted)] hover:text-[var(--pos-muted)] text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {canDiscount && (
          !showDiscount ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => setShowDiscount(true)}
              className="text-[11px] font-semibold text-[var(--pos-muted)] hover:text-[var(--pos-foreground)] transition py-0.5 px-1.5 rounded hover:bg-[var(--pos-soft)] mr-auto"
            >
              % خصم
            </button>
          ) : (
            <div className="relative w-28">
              <input
                disabled={locked}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                placeholder={`خصم (${settings.currency})`}
                className="w-full h-7 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] px-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--pos-signal)]"
              />
              {(discount === '' || discount === '0') && (
                <button
                  type="button"
                  onClick={() => setShowDiscount(false)}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[var(--pos-muted)] hover:text-[var(--pos-muted)] text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function CartTotals({
  totals,
  settings,
}: Pick<PosCartProps, 'totals' | 'settings'>) {
  const money = (value: number) =>
    Money.fromMinor(value, settings.currency).format(settings.locale);

  return (
    <div className="space-y-1 border-t border-[var(--pos-border)] bg-[var(--pos-soft)] pt-3 text-xs">
      <div className="flex justify-between text-[11px] text-[var(--pos-muted)]">
        <span>
          المجموع: {money(totals?.subtotalMinor ?? 0)} · الضريبة ({settings.taxRatePercent}%): {money(totals?.taxMinor ?? 0)}
        </span>
        {(totals?.discountMinor ?? 0) > 0 && (
          <span className="font-semibold text-emerald-700">
            خصم: -{money(totals?.discountMinor ?? 0)}
          </span>
        )}
      </div>
      <div className="flex justify-between items-baseline pt-0.5">
        <span className="text-xs font-bold text-[var(--pos-foreground)]">المستحق للدفع:</span>
        <span className="text-lg font-black font-mono text-[var(--pos-foreground)]">
          {money(totals?.totalMinor ?? 0)}
        </span>
      </div>
    </div>
  );
}

export function PosCart(props: PosCartProps) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-2 shrink-0">
        <h2 className="flex items-center gap-2 font-bold text-sm text-[var(--pos-foreground)]">
          <ShoppingCart size={17} strokeWidth={1.75} />
          الطلب الحالي
        </h2>
        <CartTypeSelector
          type={props.type}
          setType={props.setType}
          locked={props.locked}
          selectedTable={props.selectedTable}
          guestCount={props.guestCount}
          activeTabOrderId={props.activeTabOrderId}
          onOpenTablePicker={props.onOpenTablePicker}
          onClearTable={props.onClearTable}
          onGuestCountChange={props.onGuestCountChange}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto my-2">
        <CartLines {...props} />
      </div>
      <div className="space-y-2 shrink-0 border-t border-[var(--pos-border)] pt-2">
        <CartOptions {...props} />
        <CartTotals totals={props.totals} settings={props.settings} />
      </div>
    </div>
  );
}

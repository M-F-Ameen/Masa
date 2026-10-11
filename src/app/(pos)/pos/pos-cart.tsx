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
      <div className="flex h-[56px] gap-1 rounded-[14px] border border-[#DCE3EF] bg-[#E9EEFC] p-1">
        {([OrderType.TAKEAWAY, OrderType.DINE_IN] as const).map((t) => (
          <button
            key={t}
            disabled={locked}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-[11px] text-xs font-semibold transition ${
              type === t
                ? 'bg-[#2D61C9] text-white shadow-[0_5px_12px_rgba(45,97,201,0.2)] font-bold'
                : 'text-[#6A7894] hover:text-[#142644]'
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
            <div className="flex items-center justify-between rounded-[14px] border border-[#C6D5F1] bg-[#EDF3FF] p-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="grid size-6 place-items-center rounded-lg bg-[#2D61C9] text-white font-bold text-[11px]">
                  {selectedTable?.tableNumber || '#'}
                </div>
                <div>
                <p className="font-bold text-[#253765]">إضافة طلبات لطاولة {selectedTable?.tableNumber}</p>
                <p className="text-[10px] text-[#6574a0]">طلب مفتوح جاري</p>
                </div>
              </div>
            </div>
          ) : selectedTable ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[#DCE3EF] bg-[#F7F9FD] p-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#142644] text-white font-bold text-xs">
                  {selectedTable.tableNumber}
                </div>
                <div className="truncate">
                  <p className="font-bold text-[#243663] truncate">طاولة {selectedTable.tableNumber}</p>
                  <p className="truncate text-[10px] text-[#72819A]">
                    {selectedTable.sectionNameAr || 'صالة عامة'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Guest Count Stepper */}
                <div className="flex items-center gap-1 rounded-lg border border-[#DCE3EF] bg-[#F7F9FD] px-1.5 py-0.5">
        <button
                    type="button"
                    onClick={() => onGuestCountChange?.(Math.max(1, guestCount - 1))}
                    className="size-4 text-[#526B90] hover:text-[#2D61C9] font-bold text-[11px]"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-bold text-[#142644] min-w-4 text-center">
                    {guestCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => onGuestCountChange?.(Math.min(20, guestCount + 1))}
                    className="size-4 text-[#526B90] hover:text-[#2D61C9] font-bold text-[11px]"
                  >
                    +
                  </button>
                  <Users className="size-3 text-[#8D9AB2]" />
                </div>

                <button
                  type="button"
                  onClick={onOpenTablePicker}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#526B90] hover:bg-[#E9EEFC]"
                >
                  تغيير
                </button>

                <button
                  type="button"
                  onClick={onClearTable}
                  className="grid size-5 place-items-center rounded-md text-[#8D9AB2] hover:text-rose-600"
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
              className="flex w-full items-center justify-between rounded-[14px] border border-dashed border-[#C6D2E5] bg-[#F7F9FD] px-2.5 py-2 text-xs font-semibold text-[#405675] hover:border-[#8EAAD8] hover:bg-white active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2">
                <Armchair className="size-4 text-[#526B90]" strokeWidth={1.8} />
                <span>اختر الطاولة من الصالة...</span>
              </div>
              <span className="text-[10px] text-[#8D9AB2] font-mono">تحديد ▾</span>
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
      <div className="flex h-full flex-col items-center justify-center py-10 text-center text-[#a4b1ce]">
        <ShoppingCart size={42} strokeWidth={1.35} className="mb-3 text-[#a8b5d8]" />
        <p className="text-sm font-bold text-[#142644]">سلة الطلب فارغة</p>
        <span className="mt-1 text-xs text-[#97A6BF]">اضغط على أي صنف لإضافته للطلب</span>
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
            className="flex items-center justify-between gap-2 rounded-[14px] border border-[#DCE3EF] bg-white p-2.5 shadow-[0_3px_10px_rgba(20,38,68,0.04)] transition-colors hover:border-[#B9C9E2]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
              <p className="truncate text-xs font-bold text-[#142644]">{product.nameAr}</p>
                <p className="font-mono text-xs font-bold text-[#142644] shrink-0">
                  {price.multiply(item.quantity).format(settings.locale)}
                </p>
              </div>
              {(size.nameAr || modifiers.length > 0) && (
                <p className="mt-0.5 truncate text-[10px] text-[#72819A]">
                  {size.nameAr}
                  {modifiers.map((m) => ` + ${m.nameAr}`)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 border-s border-[#E7ECF4] ps-1.5">
              <button
                type="button"
                disabled={locked}
                aria-label={'تقليل ' + product.nameAr}
                onClick={() => changeQuantity(index, -1)}
                className="grid size-7 place-items-center rounded-lg border border-[#DCE3EF] bg-[#F4F7FC] text-[#526B90] hover:bg-[#E9EEFC] active:scale-95 disabled:opacity-40 transition"
              >
                <Minus size={12} />
              </button>
              <span className="w-4 text-center font-mono text-xs font-bold text-[#142644]">
                {item.quantity}
              </span>
              <button
                type="button"
                disabled={locked || item.quantity >= 99}
                aria-label={'زيادة ' + product.nameAr}
                onClick={() => changeQuantity(index, 1)}
                className="grid size-7 place-items-center rounded-lg border border-[#DCE3EF] bg-[#F4F7FC] text-[#526B90] hover:bg-[#E9EEFC] active:scale-95 disabled:opacity-40 transition"
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
            className="text-[11px] font-semibold text-[#526B90] hover:text-[#142644] transition py-0.5 px-1.5 rounded hover:bg-[#E9EEFC]"
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
              className="w-full h-7 rounded-lg border border-[#DCE3EF] bg-[#F7F9FD] px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#2D61C9]"
            />
            {notes === '' && (
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#8D9AB2] hover:text-[#526B90] text-[10px]"
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
              className="text-[11px] font-semibold text-[#526B90] hover:text-[#142644] transition py-0.5 px-1.5 rounded hover:bg-[#E9EEFC] mr-auto"
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
                className="w-full h-7 rounded-lg border border-[#DCE3EF] bg-[#F7F9FD] px-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#2D61C9]"
              />
              {(discount === '' || discount === '0') && (
                <button
                  type="button"
                  onClick={() => setShowDiscount(false)}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#8D9AB2] hover:text-[#526B90] text-[10px]"
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
    <div className="space-y-1 border-t border-[#e8ecf5] pt-3 text-xs">
      <div className="flex justify-between text-[11px] text-[#72819A]">
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
        <span className="text-xs font-bold text-[#344a78]">المستحق للدفع:</span>
        <span className="text-lg font-black font-mono text-[#2D61C9]">
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
        <h2 className="flex items-center gap-2 font-bold text-sm text-[#142644]">
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
      <div className="space-y-2 shrink-0 border-t border-[#DCE3EF] pt-2">
        <CartOptions {...props} />
        <CartTotals totals={props.totals} settings={props.settings} />
      </div>
    </div>
  );
}

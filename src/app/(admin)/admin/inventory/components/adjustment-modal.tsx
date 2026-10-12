'use client';

import React, { useState } from 'react';
import { X, Check, Loader2, ArrowUpDown } from 'lucide-react';
import { InventoryMovementType, MOVEMENT_TYPE_LABELS } from '../../../../../domain/inventory/enums';
import { adjustStockAction } from '../../../../actions/inventory.actions';
import { BranchStockItemDto } from '../../../../../domain/inventory/contracts/inventory.repository';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
  selectedItem?: BranchStockItemDto | null;
  allItems: BranchStockItemDto[];
  defaultType?: InventoryMovementType;
}

export function AdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  branchId,
  selectedItem,
  allItems,
  defaultType = InventoryMovementType.OPERATIONAL_CONSUMPTION,
}: AdjustmentModalProps) {
  const [itemId, setItemId] = useState(selectedItem?.id ?? allItems[0]?.id ?? '');
  const [type, setType] = useState<InventoryMovementType>(defaultType);
  const [quantity, setQuantity] = useState<number>(0);
  const [isNegativeChange, setIsNegativeChange] = useState<boolean>(
    defaultType === InventoryMovementType.OPERATIONAL_CONSUMPTION || defaultType === InventoryMovementType.WASTE
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentItem = allItems.find((i) => i.id === itemId) ?? selectedItem ?? allItems[0];

  const handleTypeChange = (newType: InventoryMovementType) => {
    setType(newType);
    if (newType === InventoryMovementType.OPERATIONAL_CONSUMPTION || newType === InventoryMovementType.WASTE) {
      setIsNegativeChange(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      setError('يرجى اختيار المكون');
      return;
    }
    if (quantity <= 0) {
      setError('يرجى إدخال كمية صالحة أكبر من الصفر');
      return;
    }

    setLoading(true);
    setError(null);

    const signedQuantity = isNegativeChange ? -Math.abs(quantity) : Math.abs(quantity);

    const res = await adjustStockAction({
      branchId,
      inventoryItemId: itemId,
      type: type as (
        | InventoryMovementType.OPERATIONAL_CONSUMPTION
        | InventoryMovementType.WASTE
        | InventoryMovementType.ADJUSTMENT
      ),
      quantityDelta: signedQuantity,
      notes: notes.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'حدث خطأ أثناء تسجيل حركة المخزون');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-md rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <h3 className="font-semibold text-[var(--admin-foreground)] text-base">
              {type === InventoryMovementType.OPERATIONAL_CONSUMPTION
                ? 'صرف تشغيل مباشر للمطبخ'
                : 'تسوية حركة مخزون'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--admin-muted)] hover:text-[var(--admin-foreground)] hover:bg-[var(--admin-background)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-xs border admin-status-danger rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">نوع الحركة المخزنية *</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as InventoryMovementType)}
              className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] bg-[var(--admin-surface)]"
            >
              <option value={InventoryMovementType.OPERATIONAL_CONSUMPTION}>
                {MOVEMENT_TYPE_LABELS[InventoryMovementType.OPERATIONAL_CONSUMPTION].ar} (خصم للمطبخ)
              </option>
              <option value={InventoryMovementType.WASTE}>
                {MOVEMENT_TYPE_LABELS[InventoryMovementType.WASTE].ar} (خصم تالف/هدر)
              </option>
              <option value={InventoryMovementType.ADJUSTMENT}>
                {MOVEMENT_TYPE_LABELS[InventoryMovementType.ADJUSTMENT].ar} (تسوية جرد دوري)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">المكون الخام *</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] bg-[var(--admin-surface)]"
            >
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameAr} — الرصيد الحالي: {item.quantity} {item.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">
                الكمية ({currentItem?.unit ?? ''}) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="0.000"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">اتجاه التأثير</label>
              {type === InventoryMovementType.ADJUSTMENT ? (
                <select
                  value={isNegativeChange ? 'sub' : 'add'}
                  onChange={(e) => setIsNegativeChange(e.target.value === 'sub')}
                  className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] bg-[var(--admin-surface)]"
                >
                  <option value="sub">عجز / إنقاص من الرصيد (-)</option>
                  <option value="add">زيادة / فائض في الرصيد (+)</option>
                </select>
              ) : (
                <div className="w-full text-xs border admin-status-danger rounded-lg px-3 py-2.5">
                  خصم مباشر من المخزن (-)
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">ملاحظات / سبب الحركة</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: صرف صباحي لشيف المطبخ، أو توالف تلف حراري"
              className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--admin-border)]">
            <button
              type="button"
              onClick={onClose}
              className="admin-control px-4 py-2 text-xs font-medium rounded-lg border"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium admin-primary-action rounded-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>تأكيد وتسجيل الحركة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

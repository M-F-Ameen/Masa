'use client';

import React, { useState } from 'react';
import { X, Check, Loader2, PackagePlus } from 'lucide-react';
import { UnitOfMeasure, UNIT_OF_MEASURE_LABELS } from '../../../../../domain/inventory/enums';
import { saveInventoryItemAction } from '../../../../actions/inventory.actions';
import { InventoryItemDto } from '../../../../../domain/inventory/contracts/inventory.repository';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: InventoryItemDto | null;
}

export function ItemModal({ isOpen, onClose, onSuccess, itemToEdit }: ItemModalProps) {
  const [sku, setSku] = useState(itemToEdit?.sku ?? '');
  const [nameAr, setNameAr] = useState(itemToEdit?.nameAr ?? '');
  const [nameEn, setNameEn] = useState(itemToEdit?.nameEn ?? '');
  const [unit, setUnit] = useState<UnitOfMeasure>(itemToEdit?.unit ?? UnitOfMeasure.KG);
  const [defaultCostDecimal, setDefaultCostDecimal] = useState<number>(
    itemToEdit ? itemToEdit.defaultCostMinor / 100 : 0
  );
  const [isActive, setIsActive] = useState(itemToEdit?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await saveInventoryItemAction({
      id: itemToEdit?.id,
      sku: sku.trim() || null,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      unit,
      defaultCostDecimal: Number(defaultCostDecimal),
      isActive,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'حدث خطأ أثناء حفظ المكون');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <h3 className="font-semibold text-[var(--admin-foreground)] text-base">
              {itemToEdit ? 'تعديل بيانات المكون الخام' : 'إضافة مكون خام جديد'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">الاسم بالعربية *</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: جبن موتزاريلا"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">الاسم بالإنجليزية *</label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Mozzarella Cheese"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">كود الصنف (SKU)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="RAW-001"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">وحدة القياس *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] bg-[var(--admin-surface)]"
              >
                {Object.values(UnitOfMeasure).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_OF_MEASURE_LABELS[u].ar} ({u})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">تكلفة الشراء التقديرية</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultCostDecimal}
                onChange={(e) => setDefaultCostDecimal(Number(e.target.value))}
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveItem"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded-sm border-[var(--admin-border)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
            />
            <label htmlFor="isActiveItem" className="text-xs font-medium text-[var(--admin-foreground)]">
              المكون نشط وقابل للاستخدام في الوصفات والتوريد
            </label>
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
              <span>{itemToEdit ? 'حفظ التعديلات' : 'إضافة المكون'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

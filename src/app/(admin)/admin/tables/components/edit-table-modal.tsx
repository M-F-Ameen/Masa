'use client';

import React from 'react';
import { X, Square, Circle, RectangleHorizontal } from 'lucide-react';
import { TableStatus, TableShape } from '../../../../../domain/tables/enums';
import { TableItemView } from '../../../../../application/tables/use-cases/list-tables.use-case';

export interface SectionItem {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

interface EditTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTable: TableItemView | null;
  sections: SectionItem[];
  isPending: boolean;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  tableSectionId: string;
  setTableSectionId: (val: string) => void;
  tableCapacity: number;
  setTableCapacity: (val: number) => void;
  tableShape: TableShape;
  setTableShape: (val: TableShape) => void;
  tableSortOrder: number;
  setTableSortOrder: (val: number) => void;
  tableStatus: TableStatus;
  setTableStatus: (val: TableStatus) => void;
  onSave: (e: React.FormEvent) => void;
}

export function EditTableModal({
  isOpen,
  onClose,
  editingTable,
  sections,
  isPending,
  tableNumber,
  setTableNumber,
  tableSectionId,
  setTableSectionId,
  tableCapacity,
  setTableCapacity,
  tableShape,
  setTableShape,
  tableSortOrder,
  setTableSortOrder,
  tableStatus,
  setTableStatus,
  onSave,
}: EditTableModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(20,32,51,0.5)] backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[var(--admin-surface)] p-5 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
          <h3 className="text-base font-bold text-[var(--admin-foreground)]">
            {editingTable ? `تعديل طاولة ${editingTable.tableNumber}` : 'إضافة طاولة جديدة'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 admin-muted hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[var(--admin-foreground)] mb-1">
              رقم أو اسم الطاولة <span className="text-[var(--admin-danger)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: 1 أو T-01 أو طاولة VIP"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--admin-foreground)] mb-1">قسم الصالة / القاعة</label>
            <select
              value={tableSectionId}
              onChange={(e) => setTableSectionId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            >
              <option value="">بدون قسم (صالة عامة)</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.nameAr} ({sec.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--admin-foreground)] mb-1">
                سعة المقاعد (أفراد) <span className="text-[var(--admin-danger)]">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border px-3 py-2 admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--admin-foreground)] mb-1">ترتيب العرض</label>
              <input
                type="number"
                min="0"
                value={tableSortOrder}
                onChange={(e) => setTableSortOrder(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border px-3 py-2 admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--admin-foreground)] mb-1.5">شكل الطاولة</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTableShape(TableShape.SQUARE)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium transition ${
                  tableShape === TableShape.SQUARE
                    ? 'admin-primary-action shadow-2xs'
                    : 'admin-control'
                }`}
              >
                <Square className="size-3.5" />
                <span>مربعة</span>
              </button>

              <button
                type="button"
                onClick={() => setTableShape(TableShape.ROUND)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium transition ${
                  tableShape === TableShape.ROUND
                    ? 'admin-primary-action shadow-2xs'
                    : 'admin-control'
                }`}
              >
                <Circle className="size-3.5" />
                <span>دائرية</span>
              </button>

              <button
                type="button"
                onClick={() => setTableShape(TableShape.RECTANGLE)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium transition ${
                  tableShape === TableShape.RECTANGLE
                    ? 'admin-primary-action shadow-2xs'
                    : 'admin-control'
                }`}
              >
                <RectangleHorizontal className="size-3.5" />
                <span>مستطيلة</span>
              </button>
            </div>
          </div>

          {/* Status Selector (when editing, only allowed non-occupied transitions) */}
          {editingTable && (
            <div>
              <label className="block font-semibold text-[var(--admin-foreground)] mb-1">حالة الطاولة</label>
              <select
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value as TableStatus)}
                className="w-full rounded-xl border px-3 py-2 admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              >
                <option value={TableStatus.AVAILABLE}>متاحة (AVAILABLE)</option>
                <option value={TableStatus.RESERVED}>محجوزة (RESERVED)</option>
                <option value={TableStatus.CLEANING}>قيد التنظيف (CLEANING)</option>
                {editingTable.status === TableStatus.OCCUPIED && (
                  <option value={TableStatus.OCCUPIED} disabled>
                    مشغولة بطلب جاري
                  </option>
                )}
                {editingTable.status === TableStatus.BILL_PRINTED && (
                  <option value={TableStatus.BILL_PRINTED} disabled>
                    مطبوع الشيك (بانتظار الدفع)
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 font-semibold admin-control"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl px-4 py-2 font-semibold shadow-xs admin-primary-action disabled:opacity-50"
            >
              {isPending ? 'جاري الحفظ...' : editingTable ? 'تحديث الطاولة' : 'إنشاء الطاولة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

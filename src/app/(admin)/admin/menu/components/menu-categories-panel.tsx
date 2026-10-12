'use client';

import React, { useState } from 'react';
import { FolderOpen, Pencil, Archive, Trash2, Layers3, CirclePlus, X, Check } from 'lucide-react';
import { CatalogResource } from '../../../../../domain/catalog/enums/catalog-resource.enum';
import { Category, Group, DeleteTarget, DraftModifier } from './menu-types';

const inputClass =
  'min-h-12 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 text-base text-[var(--admin-foreground)] outline-none placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-primary-soft)]';
const labelClass = 'block space-y-1.5 text-sm font-medium text-[var(--admin-foreground)]';

function toMajor(value: number) {
  return (value / 100).toFixed(2);
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  type = 'text',
  required = true,
  ...props
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string;
  inputMode?: 'decimal' | 'numeric';
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required={required}
        {...props}
      />
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-12 text-center">
      <Archive className="mx-auto text-[var(--admin-muted)]" size={24} />
      <h2 className="mt-3 font-semibold text-[var(--admin-foreground)]">{title}</h2>
      <p className="mt-1 text-sm admin-muted">{description}</p>
    </div>
  );
}

// -------------------------------------------------------------
// Category View Grid
// -------------------------------------------------------------
interface CategoriesGridProps {
  categories: Category[];
  onEdit: (id: string) => void;
  onToggleStatus: (resource: CatalogResource, id: string, nextStatus: boolean) => void;
  onDelete: (target: DeleteTarget) => void;
}

export function CategoriesGrid({
  categories,
  onEdit,
  onToggleStatus,
  onDelete,
}: CategoriesGridProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="ابدأ بالتصنيفات"
        description="أنشئ تصنيفات مثل الوجبات والمشروبات لتنظيم الأصناف."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <article
          key={category.id}
          className="admin-card flex items-center gap-3 p-4"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--admin-background)] text-[var(--admin-muted)]">
            <FolderOpen size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`truncate font-semibold ${category.isActive ? 'text-[var(--admin-foreground)]' : 'text-[var(--admin-muted)]'}`}>
              {category.nameAr}
            </h2>
            <p className="truncate text-xs admin-muted">
              {category.nameEn}
              {!category.isActive && ' · مؤرشف'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(category.id)}
            aria-label={`تعديل ${category.nameAr}`}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(CatalogResource.CATEGORY, category.id, !category.isActive)}
            aria-label={category.isActive ? 'أرشفة التصنيف' : 'إعادة تفعيل التصنيف'}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
          >
            <Archive size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete({ type: 'category', id: category.id, name: category.nameAr })}
            aria-label={`حذف ${category.nameAr}`}
            title="حذف التصنيف"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)] hover:border-[var(--admin-danger)] transition"
          >
            <Trash2 size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Modifier Groups Grid
// -------------------------------------------------------------
interface ModifierGroupsGridProps {
  groups: Group[];
  currency: string | null;
  money: (value: number, currency: string | null) => string;
  onEdit: (id: string) => void;
  onToggleStatus: (resource: CatalogResource, id: string, nextStatus: boolean) => void;
  onDelete: (target: DeleteTarget) => void;
}

export function ModifierGroupsGrid({
  groups,
  currency,
  money,
  onEdit,
  onToggleStatus,
  onDelete,
}: ModifierGroupsGridProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="لا توجد إضافات بعد"
        description="أنشئ مجموعات للإضافات، مثل اختيار الصوصات أو حجم المشروب."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <article
          key={group.id}
          className="admin-card p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[var(--admin-foreground)]">{group.nameAr}</h2>
              <p className="mt-1 text-xs admin-muted">
                اختيار {group.minSelect} إلى {group.maxSelect}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onEdit(group.id)}
                aria-label={`تعديل ${group.nameAr}`}
                className="grid size-10 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus(CatalogResource.MODIFIER_GROUP, group.id, false)}
                aria-label={`أرشفة ${group.nameAr}`}
                className="grid size-10 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
              >
                <Archive size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete({ type: 'modifier', id: group.id, name: group.nameAr })}
                aria-label={`حذف ${group.nameAr}`}
                title="حذف المجموعة"
                className="grid size-10 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)] hover:border-[var(--admin-danger)] transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {group.modifiers.map((modifier) => (
              <div
                key={modifier.id}
                className="flex items-center justify-between rounded-lg bg-[var(--admin-background)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--admin-foreground)]">{modifier.nameAr}</span>
                <span className="text-xs font-medium admin-muted">
                  {modifier.priceDelta ? `+ ${money(modifier.priceDelta, currency)}` : 'بدون زيادة'}
                </span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Category Editor Form
// -------------------------------------------------------------
export function CategoryEditor({
  category,
  onSave,
  onCancel,
  pending,
}: {
  category?: Category;
  onSave: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSave} className="space-y-4">
      <Field label="الاسم بالعربية" name="nameAr" defaultValue={category?.nameAr} />
      <Field label="الاسم بالإنجليزية" name="nameEn" defaultValue={category?.nameEn} />
      <label className={labelClass}>
        وصف مختصر
        <textarea
          name="description"
          defaultValue={category?.description ?? ''}
          rows={3}
          className={`${inputClass} py-3`}
        />
      </label>
      <div className="flex items-center gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="admin-control min-h-12 rounded-xl border px-5 text-sm font-semibold transition disabled:opacity-50"
          >
            إلغاء
          </button>
        )}
        <button
          disabled={pending}
          type="submit"
          className="admin-primary-action flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 transition"
        >
          {pending ? 'جارٍ الحفظ...' : <><Check size={17} />حفظ التغييرات</>}
        </button>
      </div>
    </form>
  );
}

// -------------------------------------------------------------
// Group Editor Form
// -------------------------------------------------------------
export function GroupEditor({
  group,
  onSave,
  onCancel,
  pending,
}: {
  group?: Group;
  onSave: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  pending: boolean;
}) {
  const defaultModifiers = group?.modifiers.map((item) => ({
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    price: toMajor(item.priceDelta),
  })) ?? [{ nameAr: '', nameEn: '', price: '0' }];
  const [modifiers, setModifiers] = useState<DraftModifier[]>(defaultModifiers);

  return (
    <form action={onSave} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="اسم المجموعة بالعربية" name="nameAr" defaultValue={group?.nameAr} />
        <Field label="اسم المجموعة بالإنجليزية" name="nameEn" defaultValue={group?.nameEn} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="أقل عدد اختيارات"
          name="minSelect"
          type="number"
          min="0"
          defaultValue={group?.minSelect ?? 0}
        />
        <Field
          label="أقصى عدد اختيارات"
          name="maxSelect"
          type="number"
          min="1"
          defaultValue={group?.maxSelect ?? 1}
        />
      </div>
      <div className="space-y-3 rounded-2xl bg-[var(--admin-background)] p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">الخيارات</h3>
          <button
            type="button"
            onClick={() => setModifiers((items) => [...items, { nameAr: '', nameEn: '', price: '0' }])}
            className="admin-control inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
          >
            <CirclePlus size={15} />
            إضافة خيار
          </button>
        </div>
        {modifiers.map((modifier, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end"
          >
            <Field
              label="اسم الخيار بالعربية"
              name="modifierNameAr"
              value={modifier.nameAr}
              onChange={(value) =>
                setModifiers((items) =>
                  items.map((item, itemIndex) => (itemIndex === index ? { ...item, nameAr: value } : item))
                )
              }
            />
            <Field
              label="بالإنجليزية"
              name="modifierNameEn"
              value={modifier.nameEn}
              onChange={(value) =>
                setModifiers((items) =>
                  items.map((item, itemIndex) => (itemIndex === index ? { ...item, nameEn: value } : item))
                )
              }
            />
            <Field
              label="زيادة السعر"
              name="modifierPrice"
              type="number"
              min="0"
              step="0.01"
              value={modifier.price}
              onChange={(value) =>
                setModifiers((items) =>
                  items.map((item, itemIndex) => (itemIndex === index ? { ...item, price: value } : item))
                )
              }
            />
            {modifiers.length > 1 && (
              <button
                type="button"
                aria-label="حذف الخيار"
                onClick={() => setModifiers((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                className="grid size-11 place-items-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="admin-control min-h-12 rounded-xl border px-5 text-sm font-semibold transition disabled:opacity-50"
          >
            إلغاء
          </button>
        )}
        <button
          disabled={pending}
          type="submit"
          className="admin-primary-action flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 transition"
        >
          {pending ? 'جارٍ الحفظ...' : <><Check size={17} />حفظ التغييرات</>}
        </button>
      </div>
    </form>
  );
}

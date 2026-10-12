'use client';

import React, { useState } from 'react';
import { CirclePlus, X, Check } from 'lucide-react';
import { ProductImagePicker } from '../product-image-picker';
import { Category, Group, Product, DraftSize } from './menu-types';

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

function changeSize(
  index: number,
  key: keyof DraftSize,
  value: string,
  setter: React.Dispatch<React.SetStateAction<DraftSize[]>>
) {
  setter((items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
  );
}

interface MenuProductModalProps {
  product?: Product;
  categories: Category[];
  groups: Group[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}

export function MenuProductModal({
  product,
  categories,
  groups,
  onSave,
  onCancel,
  pending,
}: MenuProductModalProps) {
  const defaultSizes = product?.sizes.map((size) => ({
    nameAr: size.nameAr,
    nameEn: size.nameEn,
    price: toMajor(size.price),
  })) ?? [{ nameAr: 'عادي', nameEn: 'Regular', price: '' }];

  const [sizes, setSizes] = useState<DraftSize[]>(defaultSizes);

  return (
    <form action={onSave} className="space-y-4">
      <label className={labelClass}>
        التصنيف
        <select
          name="categoryId"
          defaultValue={product?.categoryId ?? categories[0]?.id ?? ''}
          required
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameAr}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="اسم الصنف بالعربية" name="nameAr" defaultValue={product?.nameAr} />
        <Field label="اسم الصنف بالإنجليزية" name="nameEn" defaultValue={product?.nameEn} />
      </div>

      <ProductImagePicker initialUrl={product?.imageUrl} name="imageUrl" />

      <label className="flex items-center gap-3 rounded-xl border admin-status-warning p-3.5 cursor-pointer">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={product?.isFeatured ?? false}
          className="size-4 accent-[var(--admin-warning)] rounded"
        />
        <div>
          <span className="text-sm font-semibold text-[var(--admin-foreground)] block">
            عرض في السلايدر الرئيسي للموقع (طبق مميز / عروض)
          </span>
          <span className="text-xs admin-muted block">
            سيتم عرض هذا الصنف في السلايدر المتحرك في أعلى الصفحة الرئيسية
          </span>
        </div>
      </label>

      <label className={labelClass}>
        الوصف
        <textarea
          name="description"
          defaultValue={product?.description ?? ''}
          rows={2}
          className={`${inputClass} py-3`}
        />
      </label>

      <div className="space-y-3 rounded-2xl bg-[var(--admin-background)] p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">المقاسات والأسعار</h3>
          <button
            type="button"
            onClick={() => setSizes((items) => [...items, { nameAr: '', nameEn: '', price: '' }])}
            className="admin-control inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
          >
            <CirclePlus size={15} />
            إضافة مقاس
          </button>
        </div>
        {sizes.map((size, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end"
          >
            <Field
              label="الاسم العربي"
              name="sizeNameAr"
              value={size.nameAr}
              onChange={(value) => changeSize(index, 'nameAr', value, setSizes)}
            />
            <Field
              label="الاسم الإنجليزي"
              name="sizeNameEn"
              value={size.nameEn}
              onChange={(value) => changeSize(index, 'nameEn', value, setSizes)}
            />
            <Field
              label="السعر"
              name="sizePrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={size.price}
              onChange={(value) => changeSize(index, 'price', value, setSizes)}
            />
            {sizes.length > 1 && (
              <button
                type="button"
                aria-label="حذف المقاس"
                onClick={() => setSizes((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                className="grid size-11 place-items-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-background)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-[var(--admin-foreground)]">مجموعات الإضافات</legend>
          {groups.map((group) => (
            <label
              key={group.id}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--admin-border)] px-3 cursor-pointer hover:bg-[var(--admin-background)]"
            >
              <input
                type="checkbox"
                name="modifierGroupIds"
                value={group.id}
                defaultChecked={product?.modifierGroups.some((item) => item.group.id === group.id)}
                className="size-4 accent-[var(--admin-primary)]"
              />
              <span className="text-sm text-[var(--admin-foreground)]">{group.nameAr}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="admin-control min-h-12 rounded-xl border px-5 text-sm font-semibold transition disabled:opacity-50"
        >
          إلغاء
        </button>
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

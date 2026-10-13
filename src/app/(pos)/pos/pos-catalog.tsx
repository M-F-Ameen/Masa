'use client';

import { useState } from 'react';
import { Coffee, Cookie, GlassWater, IceCreamBowl, Plus, ShoppingBag } from 'lucide-react';
import { PosCategory, PosProduct } from '../../../domain/pos/contracts/pos.repository';
import { Money } from '../../../domain/shared/value-objects/money';
import { posButton } from './pos-ui';

export function PosCatalog({
  categories,
  currency,
  locale,
  disabled,
  search,
  onSelect,
}: {
  categories: PosCategory[];
  currency: string;
  locale: string;
  disabled: boolean;
  search: string;
  onSelect: (product: PosProduct) => void;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const products = categories
    .filter((category) => !categoryId || category.id === categoryId)
    .flatMap((category) => category.products)
    .filter((product) => (product.nameAr + product.nameEn).toLowerCase().includes(search.trim().toLowerCase()));
  const categoryIcons = [Coffee, GlassWater, IceCreamBowl, Cookie, ShoppingBag];

  return (
    <section className="min-w-0 p-3 sm:p-4 lg:p-4">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <button
          type="button"
          aria-pressed={!categoryId}
          onClick={() => setCategoryId(null)}
          className={
            posButton +
            ' h-[60px] min-h-[60px] min-w-[88px] shrink-0 flex-row items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-xs' +
            (!categoryId
              ? ' pos-category-selected'
              : ' pos-category')
          }
        >
          <ShoppingBag size={20} strokeWidth={1.7} className={!categoryId ? 'text-white' : 'text-[var(--pos-metal)]'} />
          الكل
        </button>
        {categories.map((category, index) => {
          const CategoryIcon = categoryIcons[index % categoryIcons.length];
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={
                posButton +
                ' h-[60px] min-h-[60px] min-w-[132px] shrink-0 justify-between rounded-[14px] px-4 py-2 text-xs' +
                (categoryId === category.id
                  ? ' pos-category-selected'
                  : ' pos-category')
              }
            >
              {category.nameAr}
              <CategoryIcon size={20} strokeWidth={1.7} className={categoryId === category.id ? 'text-white' : 'text-[var(--pos-metal)]'} />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(product)}
            className="pos-product group flex h-[256px] min-h-0 flex-col justify-between rounded-[14px] border border-[var(--pos-border)] bg-white p-3 text-start shadow-[0_4px_12px_rgba(19,20,23,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--pos-metal)] hover:shadow-[0_10px_20px_rgba(19,20,23,0.1)] active:scale-[0.98] disabled:opacity-50"
          >
            <div
              aria-hidden="true"
              className="relative mb-1.5 flex h-[138px] w-full items-center justify-center overflow-hidden rounded-[12px] bg-[radial-gradient(circle_at_50%_48%,var(--pos-surface)_0%,var(--pos-canvas)_70%,var(--pos-soft-hover)_100%)] bg-contain bg-center bg-no-repeat"
              style={product.imageUrl ? { backgroundImage: `url(\"${product.imageUrl}\")` } : undefined}
            >
              {!product.imageUrl && <Coffee size={38} strokeWidth={1.35} className="text-[var(--pos-metal)]" />}
            </div>
            <strong className="line-clamp-2 min-h-8 text-xs font-bold leading-snug text-[var(--pos-foreground)] sm:text-sm">
              {product.nameAr}
            </strong>
            <div dir="ltr" className="mt-auto flex w-full flex-row items-center justify-between gap-1 pt-1.5">
              <span dir="rtl" className="whitespace-nowrap text-end font-sans text-[16px] font-bold leading-none tracking-tight text-[var(--pos-foreground)]">
                من {Money.fromMinor(Math.min(...product.sizes.map((size) => size.price)), currency).format(locale)}
              </span>
              <span className="pos-add-product grid size-[42px] place-items-center rounded-full transition">
                <Plus size={17} strokeWidth={2.2} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {!products.length && (
        <p className="py-20 text-center text-sm text-[var(--pos-muted)]">لا توجد أصناف متاحة مطابقة للبحث.</p>
      )}
    </section>
  );
}

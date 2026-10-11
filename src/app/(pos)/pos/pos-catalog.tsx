'use client';

import { useState } from 'react';
import { Coffee, Cookie, GlassWater, IceCreamBowl, Plus, Search, ShoppingBag } from 'lucide-react';
import { PosCategory, PosProduct } from '../../../domain/pos/contracts/pos.repository';
import { Money } from '../../../domain/shared/value-objects/money';
import { posButton, posInput } from './pos-ui';

export function PosCatalog({ categories, currency, locale, disabled, onSelect }: {
  categories: PosCategory[]; currency: string; locale: string; disabled: boolean; onSelect: (product: PosProduct) => void;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const products = categories
    .filter((category) => !categoryId || category.id === categoryId)
    .flatMap((category) => category.products)
    .filter((product) => (product.nameAr + product.nameEn).toLowerCase().includes(search.trim().toLowerCase()));
  const categoryIcons = [Coffee, GlassWater, IceCreamBowl, Cookie, ShoppingBag];

  return (
    <section className="min-w-0 p-3 sm:p-4 lg:p-4">
      <label className="flex h-[54px] items-center gap-2 rounded-[14px] border border-[#DCE3EF] bg-[#F7F9FD] px-4 shadow-[0_3px_12px_rgba(20,38,68,0.03)] transition focus-within:border-[#2D61C9] focus-within:bg-white">
        <Search size={21} strokeWidth={1.8} className="shrink-0 text-[#627594]" />
        <input
          aria-label="البحث عن صنف"
          placeholder="ابحث عن صنف بالاسم..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={posInput + ' h-10 min-h-0 border-0 bg-transparent text-sm shadow-none focus:ring-0'}
        />
      </label>

      <div className="my-4 flex gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <button
          type="button"
          aria-pressed={!categoryId}
          onClick={() => setCategoryId(null)}
          className={
            posButton +
            ' min-h-[74px] min-w-[88px] shrink-0 flex-col gap-1.5 rounded-[14px] px-4 py-2 text-xs' +
            (!categoryId
              ? ' border-[#2D61C9] bg-[#2D61C9] text-white hover:border-[#2756B8] hover:bg-[#2756B8]'
              : ' bg-[#E9EEFC] text-[#142644]')
          }
        >
          <ShoppingBag size={20} strokeWidth={1.7} />
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
                ' min-h-[74px] min-w-[132px] shrink-0 justify-between rounded-[14px] px-4 py-2 text-xs' +
                (categoryId === category.id
                  ? ' border-[#2D61C9] bg-[#2D61C9] text-white hover:border-[#2756B8] hover:bg-[#2756B8]'
                  : ' bg-[#E9EEFC] text-[#142644]')
              }
            >
              {category.nameAr}
              <CategoryIcon size={20} strokeWidth={1.7} />
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
            className="group flex min-h-[256px] flex-col justify-between rounded-[14px] border border-[#DCE3EF] bg-white p-3.5 text-start shadow-[0_4px_12px_rgba(20,38,68,0.05)] transition hover:-translate-y-0.5 hover:border-[#B9C9E2] hover:shadow-[0_10px_20px_rgba(20,38,68,0.1)] active:scale-[0.98] disabled:opacity-50"
          >
            <div
              aria-hidden="true"
              className="relative mb-2 flex h-[154px] w-full items-center justify-center overflow-hidden rounded-[12px] bg-[radial-gradient(circle_at_50%_48%,#fff_0%,#f7f8fc_70%,#eef2f9_100%)] bg-contain bg-center bg-no-repeat"
              style={product.imageUrl ? { backgroundImage: `url(\"${product.imageUrl}\")` } : undefined}
            >
              {!product.imageUrl && <Coffee size={38} strokeWidth={1.35} className="text-[#AAB8D0]" />}
            </div>
            <strong className="line-clamp-2 min-h-9 text-xs font-bold leading-snug text-[#142644] sm:text-sm">
              {product.nameAr}
            </strong>
            <div className="mt-auto flex w-full items-center justify-between gap-1 pt-2">
              <span className="font-mono text-[11px] font-bold text-[#1D6C6B]">
                من {Money.fromMinor(Math.min(...product.sizes.map((size) => size.price)), currency).format(locale)}
              </span>
              <span className="grid size-[42px] place-items-center rounded-full bg-[#2D61C9] text-white shadow-[0_5px_10px_rgba(45,97,201,0.22)] transition group-hover:bg-[#2756B8]">
                <Plus size={17} strokeWidth={2.2} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {!products.length && (
        <p className="py-20 text-center text-sm text-[#7180a4]">لا توجد أصناف متاحة مطابقة للبحث.</p>
      )}
    </section>
  );
}

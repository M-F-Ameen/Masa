'use client';

import { useState } from 'react';
import { PosProduct, PosSelection } from '../../../domain/pos/contracts/pos.repository';
import { Money } from '../../../domain/shared/value-objects/money';
import { PosModal, posButton, posPrimary } from './pos-ui';

function toggleModifiers(product: PosProduct, ids: string[], groupId: string, id: string): string[] {
  const group = product.modifierGroups.find((candidate) => candidate.id === groupId)!;
  const others = ids.filter((selected) => !group.modifiers.some((modifier) => modifier.id === selected));
  const chosen = ids.filter((selected) => group.modifiers.some((modifier) => modifier.id === selected));
  if (chosen.includes(id)) return ids.filter((selected) => selected !== id);
  if (group.maxSelect === 1) return [...others, id];
  return chosen.length < group.maxSelect ? [...ids, id] : ids;
}

export function ProductPicker({ product, currency, locale, onAdd, onClose }: {
  product: PosProduct; currency: string; locale: string; onAdd: (selection: PosSelection) => void; onClose: () => void;
}) {
  const [sizeId, setSizeId] = useState(product.sizes[0]?.id ?? '');
  const [modifierIds, setModifierIds] = useState<string[]>([]);
  const valid = !!sizeId && product.modifierGroups.every((group) => {
    const count = group.modifiers.filter((modifier) => modifierIds.includes(modifier.id)).length;
    return count >= group.minSelect && count <= group.maxSelect;
  });
  return <PosModal title={product.nameAr} onClose={onClose}>
    <fieldset><legend className="mb-2 text-sm font-semibold">المقاس</legend><div className="flex flex-wrap gap-2">
      {product.sizes.map((size) => <button key={size.id} aria-pressed={sizeId === size.id} onClick={() => setSizeId(size.id)}
        className={posButton + (sizeId === size.id ? ' border-[#2D61C9] bg-[#E9EEFC] text-[#2756B8]' : '')}>
        {size.nameAr} — {Money.fromMinor(size.price, currency).format(locale)}</button>)}
    </div></fieldset>
    {product.modifierGroups.map((group) => <fieldset className="mt-5" key={group.id}>
      <legend className="mb-2 text-sm font-semibold">{group.nameAr} <span className="font-normal text-zinc-500">({group.minSelect}–{group.maxSelect})</span></legend>
      <div className="flex flex-wrap gap-2">{group.modifiers.map((modifier) => <button key={modifier.id}
        aria-pressed={modifierIds.includes(modifier.id)} onClick={() => setModifierIds(toggleModifiers(product, modifierIds, group.id, modifier.id))}
        className={posButton + (modifierIds.includes(modifier.id) ? ' border-[#2D61C9] bg-[#E9EEFC] text-[#2756B8]' : '')}>
        {modifier.nameAr} {modifier.priceDelta > 0 && '+ ' + Money.fromMinor(modifier.priceDelta, currency).format(locale)}</button>)}</div>
    </fieldset>)}
    <button disabled={!valid} className={posPrimary + ' mt-6 w-full'} onClick={() => { onAdd({ productId: product.id, sizeId, modifierIds, quantity: 1 }); onClose(); }}>إضافة للسلة</button>
  </PosModal>;
}

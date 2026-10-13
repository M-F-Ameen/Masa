'use client';

import { useState, useTransition } from 'react';
import { Wallet } from 'lucide-react';
import { closeCashShiftAction, openCashShiftAction } from '../../actions/pos.actions';
import { Money } from '../../../domain/shared/value-objects/money';
import { PosShift } from '../../../domain/pos/contracts/pos.repository';
import { PosModal, posInput, posPrimary } from './pos-ui';

async function saveShift(branchId: string, currency: string, locale: string, shift: PosShift | null, amount: string) {
  currency = shift?.currency ?? currency;
  const minor = Money.fromDecimal(amount || '0', currency).amount;
  if (!shift) {
    const result = await openCashShiftAction({ branchId, openingCashMinor: minor });
    if (!result.success) throw new Error(result.error);
    return { shift: result.data, message: 'تم فتح الوردية بنجاح' };
  }
  const result = await closeCashShiftAction({ branchId, cashShiftId: shift.id, closingCashMinor: minor });
  if (!result.success) throw new Error(result.error);
  const expected = Money.fromMinor(result.data.expectedCashMinor, currency).format(locale);
  const variance = Money.fromMinor(result.data.varianceMinor, currency).format(locale);
  return { shift: null, message: 'أُغلقت الوردية. الرصيد المتوقع: ' + expected + ' — الفرق: ' + variance };
}

export function ShiftPanel({ branchId, currency, locale, shift, onDone, onClose }: {
  branchId: string; currency: string; locale: string; shift: PosShift | null;
  onDone: (shift: PosShift | null, message: string) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      try {
        const result = await saveShift(branchId, currency, locale, shift, amount);
        onDone(result.shift, result.message);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'تحقق من المبلغ'); }
    });
  }
  return <PosModal title={shift ? 'إغلاق وردية الكاشير' : 'فتح وردية الكاشير'} onClose={() => { if (!pending) onClose(); }}>
    <div className="mb-4 grid size-12 place-items-center rounded-[14px] bg-[var(--pos-soft)] text-[var(--pos-primary)]"><Wallet size={26} strokeWidth={1.5}/></div>
    <p className="mb-5 text-sm leading-6 text-[var(--pos-muted)]">{shift ? 'عدّ النقدية الفعلية في الدرج. يشمل الرصيد المتوقع مبلغ البداية ومبيعات النقد فقط.' : 'أدخل رصيد درج النقدية قبل بدء البيع.'}</p>
    <label className="text-sm font-semibold">{shift ? 'النقدية الفعلية عند الإغلاق (' + shift.currency + ')' : 'رصيد البداية (' + currency + ')'}
      <input autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" dir="ltr" className={posInput + ' mt-2'} placeholder="0.00"/></label>
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
    <button onClick={submit} disabled={pending} className={posPrimary + ' mt-5 w-full'}>{pending ? 'جارٍ الحفظ...' : shift ? 'تأكيد الإغلاق' : 'فتح الوردية'}</button>
  </PosModal>;
}

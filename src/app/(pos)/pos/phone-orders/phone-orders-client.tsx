'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  Clock3,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { PosCategory, PosProduct, PosSelection, PosSettings } from '../../../../domain/pos/contracts/pos.repository';
import { OrderType } from '../../../../domain/ordering/enums';
import { Money } from '../../../../domain/shared/value-objects/money';
import { findPhoneCustomerAction, createPhoneOrderAction } from '../../../actions/phone-order.actions';
import { PosCatalog } from '../pos-catalog';
import { ProductPicker } from '../product-picker';
import { CartLines, CartTotals } from '../pos-cart';
import { posInput, posPrimary } from '../pos-ui';

type SavedAddress = {
  id: string;
  title: string;
  city: string;
  area: string;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  deliveryNotes: string | null;
  isDefault: boolean;
};

type Caller = { id: string; fullName: string; phone: string };
type PhoneCustomerLookup = {
  success: true;
  data: { customer: Caller | null; addresses: SavedAddress[] };
} | { success: false; error: string; code: string };
type PhoneOrderResult =
  | { success: true; data: { id: string; orderNumber: string; totalMinor: number; currency: string; locale: string } }
  | { success: false; error: string; code: string };

type AddressForm = {
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  deliveryNotes: string;
};

const emptyAddress: AddressForm = {
  area: '', street: '', building: '', floor: '', apartment: '', landmark: '', deliveryNotes: '',
};

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function PhoneOrdersClient({
  branch,
  settings,
  categories,
  deliveryFeeMinor,
}: {
  branch: { id: string; nameAr: string };
  settings: PosSettings;
  categories: PosCategory[];
  deliveryFeeMinor: number;
}) {
  const [orderType, setOrderType] = useState<OrderType.DELIVERY | OrderType.TAKEAWAY>(OrderType.DELIVERY);
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lookupDone, setLookupDone] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [customerNotes, setCustomerNotes] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PosSelection[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [feedback, setFeedback] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{ orderNumber: string; totalMinor: number } | null>(null);
  const [isLookingUp, startLookup] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const products = useMemo(() => categories.flatMap((category) => category.products), [categories]);
  const productsInCart = useMemo(() => {
    const ids = new Set(items.map((item) => item.productId));
    return products.filter((product) => ids.has(product.id));
  }, [items, products]);
  const totals = useMemo(() => {
    let subtotalMinor = 0;
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      const size = product?.sizes.find((candidate) => candidate.id === item.sizeId);
      if (!size) continue;
      const modifiers = product?.modifierGroups.flatMap((group) => group.modifiers)
        .filter((modifier) => item.modifierIds.includes(modifier.id)) ?? [];
      subtotalMinor += (size.price + modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0)) * item.quantity;
    }
    const taxMinor = Money.fromMinor(subtotalMinor, settings.currency).percentage(settings.taxRatePercent).amount;
    const delivery = orderType === OrderType.DELIVERY ? deliveryFeeMinor : 0;
    return { subtotalMinor, taxMinor, discountMinor: 0, totalMinor: subtotalMinor + delivery + taxMinor };
  }, [items, products, orderType, deliveryFeeMinor, settings.taxRatePercent]);

  const hasDeliveryAddress = orderType !== OrderType.DELIVERY || Boolean(
    selectedAddressId || (address.area.trim() && address.street.trim()),
  );
  const canSubmit = lookupDone && phone.trim() && customerName.trim() && items.length > 0 && hasDeliveryAddress;

  function lookupCaller() {
    if (!phone.trim()) {
      setFeedback('أدخل رقم هاتف العميل أولاً.');
      return;
    }
    setFeedback('');
    setLookupDone(false);
    startLookup(async () => {
      const result = await findPhoneCustomerAction(phone) as PhoneCustomerLookup;
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      const found = result.data.customer;
      setCustomerId(found?.id);
      setCustomerName(found?.fullName ?? '');
      setAddresses(result.data.addresses);
      const defaultAddress = result.data.addresses.find((entry) => entry.isDefault) ?? result.data.addresses[0];
      setSelectedAddressId(defaultAddress?.id ?? '');
      if (defaultAddress) {
        setAddress({
          area: defaultAddress.area,
          street: defaultAddress.street,
          building: defaultAddress.building ?? '',
          floor: defaultAddress.floor ?? '',
          apartment: defaultAddress.apartment ?? '',
          landmark: defaultAddress.landmark ?? '',
          deliveryNotes: defaultAddress.deliveryNotes ?? '',
        });
      } else {
        setAddress(emptyAddress);
      }
      setLookupDone(true);
      setFeedback(found ? 'تم العثور على العميل وعناوينه المحفوظة.' : 'عميل جديد — أدخل الاسم للمتابعة.');
    });
  }

  function addItem(selection: PosSelection) {
    setItems((current) => {
      const modifierKey = selection.modifierIds.slice().sort().join(',');
      const existingIndex = current.findIndex((item) =>
        item.productId === selection.productId &&
        item.sizeId === selection.sizeId &&
        item.modifierIds.slice().sort().join(',') === modifierKey,
      );
      if (existingIndex < 0) return [...current, selection];
      return current.map((item, index) => index === existingIndex
        ? { ...item, quantity: Math.min(99, item.quantity + selection.quantity) }
        : item,
      );
    });
  }

  function changeQuantity(index: number, delta: number) {
    setItems((current) => current.flatMap((item, itemIndex) => {
      if (index !== itemIndex) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }

  function submitOrder() {
    if (!canSubmit) return;
    setFeedback('');
    startSubmit(async () => {
      const result = await createPhoneOrderAction({
        branchId: branch.id,
        type: orderType,
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        ...(orderType === OrderType.DELIVERY
          ? selectedAddressId
            ? { addressId: selectedAddressId }
            : {
                area: address.area.trim(),
                street: address.street.trim(),
                building: address.building.trim() || undefined,
                floor: address.floor.trim() || undefined,
                apartment: address.apartment.trim() || undefined,
                landmark: address.landmark.trim() || undefined,
                deliveryNotes: address.deliveryNotes.trim() || undefined,
              }
          : {}),
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey: makeIdempotencyKey(),
        items,
      }) as PhoneOrderResult;
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      setCompletedOrder({ orderNumber: result.data.orderNumber, totalMinor: result.data.totalMinor });
      setItems([]);
      setFeedback('');
    });
  }

  function resetOrder() {
    setPhone('');
    setCustomerName('');
    setLookupDone(false);
    setCustomerId(undefined);
    setAddresses([]);
    setSelectedAddressId('');
    setAddress(emptyAddress);
    setCustomerNotes('');
    setItems([]);
    setCompletedOrder(null);
    setFeedback('');
  }

  const addressValue = (field: keyof AddressForm, value: string) => setAddress((current) => ({ ...current, [field]: value }));

  return (
    <main className="pos-app min-h-dvh bg-[var(--pos-canvas)] text-[var(--pos-foreground)]" dir="rtl">
      <header className="sticky top-0 z-20 flex min-h-[78px] items-center justify-between gap-3 border-b border-[var(--pos-border)] bg-white/95 px-4 shadow-[0_3px_12px_rgba(19,20,23,0.04)] backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/pos" aria-label="العودة إلى نقطة البيع" className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-[var(--pos-border)] bg-white transition hover:bg-[var(--pos-soft)]">
            <ArrowRight size={19} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-base font-black sm:text-lg">طلبات الهاتف</p>
            <p className="truncate text-xs text-[var(--pos-muted)]">{branch.nameAr} · إدخال طلب جديد</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-[13px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3 py-2 text-xs font-semibold text-[var(--pos-muted)]">
          <Clock3 size={15} />
          <span>تحضير فوري</span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-4">
          <section className="rounded-[18px] border border-[var(--pos-border)] bg-white p-4 shadow-[0_5px_16px_rgba(19,20,23,0.04)] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-black"><Phone size={19} className="text-[var(--pos-primary)]" /> بيانات المتصل</h1>
                <p className="mt-1 text-xs text-[var(--pos-muted)]">ابحث بالهاتف أولاً لاسترجاع بيانات العميل وعناوينه.</p>
              </div>
              {customerId && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><Check size={13} /> عميل مسجل</span>}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,1fr)_auto] md:items-end">
              <label className="block text-xs font-bold text-[var(--pos-foreground)]">
                رقم الهاتف <span className="text-[var(--pos-primary)]">*</span>
                <div className="relative mt-1.5">
                  <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                  <input dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setLookupDone(false); setCustomerId(undefined); }} placeholder="01xxxxxxxxx" className={`${posInput} pe-10 text-left`} />
                </div>
              </label>
              <label className="block text-xs font-bold text-[var(--pos-foreground)]">
                اسم العميل <span className="text-[var(--pos-primary)]">*</span>
                <div className="relative mt-1.5">
                  <UserRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} disabled={!lookupDone} autoComplete="name" placeholder="اسم العميل" className={`${posInput} pe-10 disabled:opacity-70`} />
                </div>
              </label>
              <button type="button" onClick={lookupCaller} disabled={isLookingUp} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-4 text-sm font-bold transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft-hover)] disabled:opacity-60">
                <Search size={16} /> {isLookingUp ? 'جارٍ البحث...' : 'بحث عن العميل'}
              </button>
            </div>
            {feedback && !completedOrder && <p role="status" className="mt-3 rounded-[12px] bg-[var(--pos-signal-soft)] px-3 py-2 text-xs font-semibold text-[var(--pos-foreground)]">{feedback}</p>}
          </section>

          <section className="rounded-[18px] border border-[var(--pos-border)] bg-white p-4 shadow-[0_5px_16px_rgba(19,20,23,0.04)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">طريقة الاستلام والعنوان</h2>
                <p className="mt-1 text-xs text-[var(--pos-muted)]">يُسجل الطلب غير مدفوع حتى التحصيل عند الاستلام.</p>
              </div>
              <div className="flex h-11 rounded-[13px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] p-1">
                {([
                  [OrderType.DELIVERY, 'توصيل'],
                  [OrderType.TAKEAWAY, 'استلام من المطعم'],
                ] as const).map(([type, label]) => (
                  <button type="button" key={type} onClick={() => setOrderType(type)} aria-pressed={orderType === type} className={`rounded-[10px] px-3 text-xs font-bold transition ${orderType === type ? 'pos-category-selected' : 'text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {orderType === OrderType.DELIVERY ? (
              <div className="space-y-3">
                {addresses.length > 0 && (
                  <label className="block text-xs font-bold">
                    عنوان محفوظ
                    <div className="relative mt-1.5">
                      <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                      <select value={selectedAddressId} onChange={(event) => {
                        const id = event.target.value;
                        const saved = addresses.find((entry) => entry.id === id);
                        setSelectedAddressId(id);
                        if (saved) setAddress({ area: saved.area, street: saved.street, building: saved.building ?? '', floor: saved.floor ?? '', apartment: saved.apartment ?? '', landmark: saved.landmark ?? '', deliveryNotes: saved.deliveryNotes ?? '' });
                      }} className={`${posInput} appearance-none pe-10`}>
                        <option value="">إدخال عنوان جديد</option>
                        {addresses.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.area} · {entry.street}{entry.isDefault ? ' (الافتراضي)' : ''}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                    </div>
                  </label>
                )}
                {!selectedAddressId && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <AddressInput label="المنطقة" required value={address.area} onChange={(value) => addressValue('area', value)} placeholder="مثال: مدينة نصر" />
                    <AddressInput label="الشارع" required value={address.street} onChange={(value) => addressValue('street', value)} placeholder="اسم الشارع" />
                    <AddressInput label="رقم المبنى" value={address.building} onChange={(value) => addressValue('building', value)} />
                    <AddressInput label="الدور" value={address.floor} onChange={(value) => addressValue('floor', value)} />
                    <AddressInput label="الشقة" value={address.apartment} onChange={(value) => addressValue('apartment', value)} />
                    <AddressInput label="علامة مميزة" value={address.landmark} onChange={(value) => addressValue('landmark', value)} placeholder="بجوار..." />
                    <label className="block text-xs font-bold sm:col-span-2 lg:col-span-3">تعليمات الوصول
                      <input value={address.deliveryNotes} onChange={(event) => addressValue('deliveryNotes', event.target.value)} maxLength={300} placeholder="تفاصيل تساعد المندوب في الوصول" className={`${posInput} mt-1.5`} />
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--pos-canvas)] px-3 py-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[var(--pos-muted)]"><MapPin size={15} /> رسوم التوصيل</span>
                  <strong className="font-mono">{Money.fromMinor(deliveryFeeMinor, settings.currency).format(settings.locale)}</strong>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-[13px] bg-[var(--pos-canvas)] p-3 text-xs text-[var(--pos-muted)]">
                <ShoppingBag size={17} className="mt-0.5 shrink-0 text-[var(--pos-metal)]" />
                <p>سيكون الطلب جاهزاً للاستلام من المطعم. لا تُحتسب رسوم توصيل.</p>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[var(--pos-border)] bg-white shadow-[0_5px_16px_rgba(19,20,23,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pos-border)] px-4 py-4 sm:px-5">
              <div><h2 className="text-base font-black">أصناف الطلب</h2><p className="mt-1 text-xs text-[var(--pos-muted)]">{lookupDone ? 'اختر الأصناف والمقاسات والإضافات المطلوبة.' : 'ابحث عن العميل أولاً لبدء تسجيل الطلب.'}</p></div>
              <label className="flex h-10 min-w-[210px] flex-1 items-center gap-2 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3 sm:max-w-[300px]">
                <Search size={16} className="shrink-0 text-[var(--pos-muted)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!lookupDone} aria-label="البحث عن صنف" placeholder="ابحث عن صنف..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--pos-muted)] disabled:opacity-50" />
              </label>
            </div>
            {lookupDone ? (
              <PosCatalog categories={categories} currency={settings.currency} locale={settings.locale} disabled={isSubmitting} search={search} onSelect={setSelectedProduct} />
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
                <div className="mb-3 grid size-12 place-items-center rounded-[15px] bg-[var(--pos-signal-soft)] text-[var(--pos-primary)]"><Phone size={21} /></div>
                <p className="text-sm font-bold">ابدأ برقم العميل</p>
                <p className="mt-1 max-w-sm text-xs leading-6 text-[var(--pos-muted)]">بعد البحث يمكنك اختيار الأصناف وإرسال طلب مباشر إلى المطبخ.</p>
              </div>
            )}
          </section>
        </section>

        <aside className="xl:sticky xl:top-[94px] xl:h-[calc(100dvh-110px)]">
          <section className="flex max-h-[calc(100dvh-110px)] min-h-[440px] flex-col overflow-hidden rounded-[18px] border border-[var(--pos-border)] bg-white shadow-[0_7px_20px_rgba(19,20,23,0.06)]">
            <div className="shrink-0 border-b border-[var(--pos-border)] px-4 py-4">
              <h2 className="flex items-center gap-2 text-base font-black"><ShoppingBag size={18} /> ملخص الطلب</h2>
              <p className="mt-1 text-xs text-[var(--pos-muted)]">{items.reduce((sum, item) => sum + item.quantity, 0)} صنف · {orderType === OrderType.DELIVERY ? 'توصيل' : 'استلام'}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <CartLines items={items} products={productsInCart} settings={settings} locked={isSubmitting} changeQuantity={changeQuantity} />
            </div>
            <div className="shrink-0 space-y-3 border-t border-[var(--pos-border)] p-4">
              <label className="block text-xs font-bold">ملاحظة للمطبخ أو الطلب
                <textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} rows={2} maxLength={500} placeholder="مثال: بدون سكر، الاتصال عند الوصول" className="mt-1.5 min-h-20 w-full resize-y rounded-[13px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[var(--pos-muted)] focus:border-[var(--pos-signal)] focus:bg-white focus:ring-2 focus:ring-[var(--pos-signal)]/15" />
              </label>
              {orderType === OrderType.DELIVERY && <div className="flex justify-between text-xs text-[var(--pos-muted)]"><span>التوصيل</span><span className="font-mono">{Money.fromMinor(deliveryFeeMinor, settings.currency).format(settings.locale)}</span></div>}
              <CartTotals totals={totals} settings={settings} />
              <div className="rounded-[12px] bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">الدفع عند الاستلام — لا تُسجل بيانات البطاقة عبر الهاتف.</div>
              <button type="button" onClick={submitOrder} disabled={!canSubmit || isSubmitting} className={`${posPrimary} min-h-14 w-full text-sm`}>
                <ChefHat size={18} /> {isSubmitting ? 'جارٍ إرسال الطلب...' : 'تأكيد وإرسال للمطبخ'}
              </button>
              {!lookupDone && <p className="text-center text-[11px] text-[var(--pos-muted)]">ابحث عن رقم الهاتف لتفعيل الطلب.</p>}
            </div>
          </section>
        </aside>
      </div>

      {selectedProduct && <ProductPicker product={selectedProduct} currency={settings.currency} locale={settings.locale} onAdd={addItem} onClose={() => setSelectedProduct(null)} />}

      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--pos-foreground)]/35 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-label="تم إرسال الطلب" className="w-full max-w-md rounded-[20px] border border-[var(--pos-border)] bg-white p-6 text-center shadow-[0_24px_70px_rgba(19,20,23,0.2)]">
            <div className="mx-auto grid size-14 place-items-center rounded-[18px] bg-emerald-50 text-emerald-700"><PackageCheck size={28} /></div>
            <h2 className="mt-4 text-xl font-black">تم إرسال الطلب للمطبخ</h2>
            <p className="mt-2 text-sm text-[var(--pos-muted)]">رقم الطلب <strong dir="ltr" className="font-mono text-[var(--pos-foreground)]">#{completedOrder.orderNumber}</strong></p>
            <p className="mt-2 text-lg font-black">{Money.fromMinor(completedOrder.totalMinor, settings.currency).format(settings.locale)}</p>
            <p className="mt-1 text-xs text-[var(--pos-muted)]">التحصيل عند {orderType === OrderType.DELIVERY ? 'التوصيل' : 'الاستلام من المطعم'}.</p>
            <button type="button" onClick={resetOrder} className={`${posPrimary} mt-5 w-full`}>تسجيل طلب جديد</button>
          </section>
        </div>
      )}
    </main>
  );
}

function AddressInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-bold">{label}{required && <span className="text-[var(--pos-primary)]"> *</span>}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={100} placeholder={placeholder} className={`${posInput} mt-1.5`} />
    </label>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChefHat,
  ChevronDown,
  MapPin,
  Menu,
  PackageCheck,
  Phone,
  Printer,
  Search,
  ShoppingBag,
  Utensils,
  UserRound,
} from 'lucide-react';
import { PosCategory, PosProduct, PosSelection, PosSettings } from '../../../../domain/pos/contracts/pos.repository';
import { OrderType } from '../../../../domain/ordering/enums';
import { Money } from '../../../../domain/shared/value-objects/money';
import { findPhoneCustomerAction, createPhoneOrderAction } from '../../../actions/phone-order.actions';
import { PosCatalog } from '../pos-catalog';
import { ProductPicker } from '../product-picker';
import { CartLines } from '../pos-cart';
import { posInput, posPrimary } from '../pos-ui';

type SavedAddress = {
  id: string;
  title: string;
  city: string;
  area: string;
  street: string;
  addressText: string | null;
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
  addressText: string;
  deliveryNotes: string;
};

const emptyAddress: AddressForm = {
  addressText: '', deliveryNotes: '',
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
  const [matchedCustomer, setMatchedCustomer] = useState<Caller | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [customerNotes, setCustomerNotes] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PosSelection[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [feedback, setFeedback] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{ orderNumber: string; totalMinor: number } | null>(null);
  const [headerDateTime, setHeaderDateTime] = useState({ date: '', time: '' });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'SUMMARY' | 'CUSTOMER'>('SUMMARY');
  const [isLookingUp, startLookup] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const draftKeyRef = useRef(makeIdempotencyKey());
  const summaryRef = useRef<HTMLElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const addressSelectRef = useRef<HTMLSelectElement>(null);
  const addressTextRef = useRef<HTMLTextAreaElement>(null);
  const catalogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).formatToParts(now);
      const timeParts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(now);
      const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? '';
      setHeaderDateTime({
        date: [part(dateParts, 'weekday'), part(dateParts, 'day'), part(dateParts, 'month'), part(dateParts, 'year')].join(' '),
        time: `${part(timeParts, 'hour')}:${part(timeParts, 'minute')} ${part(timeParts, 'dayPeriod')}`.trim(),
      });
    };
    updateDateTime();
    const timer = window.setInterval(updateDateTime, 30_000);
    return () => window.clearInterval(timer);
  }, [settings.locale]);

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
  }, [items, products, orderType, deliveryFeeMinor, settings.taxRatePercent, settings.currency]);

  const hasDeliveryAddress = orderType !== OrderType.DELIVERY || Boolean(
    matchedCustomer && !useNewAddress
      ? selectedAddressId
      : address.addressText.trim(),
  );
  const canSubmit = Boolean(lookupDone && phone.trim() && (matchedCustomer || customerName.trim().length >= 2) && items.length > 0 && hasDeliveryAddress);

  function refreshDraftKey() {
    draftKeyRef.current = makeIdempotencyKey();
  }

  function missingRequirement() {
    if (!items.length) return 'أضف صنفاً واحداً على الأقل.';
    if (!phone.trim()) return 'أدخل رقم هاتف العميل وابحث عنه.';
    if (!lookupDone) return 'ابحث عن رقم الهاتف للتحقق من العميل.';
    if (!matchedCustomer && customerName.trim().length < 2) return 'أدخل اسم العميل الجديد (حرفان على الأقل).';
    if (orderType === OrderType.DELIVERY && matchedCustomer && !useNewAddress && !selectedAddressId) return 'اختر عنواناً محفوظاً أو أضف عنواناً جديداً.';
    if (orderType === OrderType.DELIVERY && (!matchedCustomer || useNewAddress) && !address.addressText.trim()) return 'أدخل العنوان بالتفصيل.';
    return '';
  }

  function focusMissingRequirement() {
    const missing = missingRequirement();
    if (!missing.startsWith('أضف')) setActivePanelTab('CUSTOMER');
    const target = missing.startsWith('أضف') ? catalogRef.current
      : missing.includes('هاتف') || missing.includes('ابحث') ? phoneInputRef.current
        : missing.includes('اسم العميل') ? customerNameRef.current
          : missing.includes('عنواناً محفوظاً') ? addressSelectRef.current
            : missing.includes('العنوان بالتفصيل') ? addressTextRef.current
                : phoneInputRef.current;
    window.setTimeout(() => {
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target instanceof HTMLElement) target.focus();
    }, missing.startsWith('أضف') ? 0 : 100);
  }

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
      setMatchedCustomer(found);
      setCustomerName(found?.fullName ?? '');
      setAddresses(result.data.addresses);
      const defaultAddress = result.data.addresses.find((entry) => entry.isDefault) ?? result.data.addresses[0];
      setSelectedAddressId(defaultAddress?.id ?? '');
      setUseNewAddress(false);
      if (defaultAddress) {
        setAddress({
          addressText: defaultAddress.addressText ?? [defaultAddress.area, defaultAddress.street].filter(Boolean).join('، '),
          deliveryNotes: defaultAddress.deliveryNotes ?? '',
        });
      } else {
        setAddress(emptyAddress);
      }
      setLookupDone(true);
      refreshDraftKey();
      setFeedback(found ? 'تم العثور على العميل وعناوينه المحفوظة.' : 'عميل جديد — أدخل الاسم للمتابعة.');
    });
  }

  function addItem(selection: PosSelection) {
    refreshDraftKey();
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
    refreshDraftKey();
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
                addressText: address.addressText.trim(),
                deliveryNotes: address.deliveryNotes.trim() || undefined,
              }
          : {}),
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey: draftKeyRef.current,
        items,
      }) as PhoneOrderResult;
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      setCompletedOrder({ orderNumber: result.data.orderNumber, totalMinor: result.data.totalMinor });
      setItems([]);
      refreshDraftKey();
      setFeedback('');
    });
  }

  function resetOrder() {
    refreshDraftKey();
    setPhone('');
    setCustomerName('');
    setLookupDone(false);
    setMatchedCustomer(null);
    setAddresses([]);
    setSelectedAddressId('');
    setUseNewAddress(false);
    setAddress(emptyAddress);
    setCustomerNotes('');
    setItems([]);
    setOrderType(OrderType.DELIVERY);
    setSearch('');
    setCompletedOrder(null);
    setFeedback('');
  }

  const addressValue = (field: keyof AddressForm, value: string) => {
    refreshDraftKey();
    setAddress((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="pos-app min-h-dvh bg-[var(--pos-canvas)] text-[var(--pos-foreground)]" dir="rtl">
      <header className="relative z-20 flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--pos-canvas)] px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-4 lg:px-8">
        <div dir="rtl" className="flex min-w-0 basis-full items-center gap-3 lg:flex-1 lg:basis-auto">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={settings.nameAr}
              width={180}
              height={64}
              unoptimized
              className="h-14 w-32 shrink-0 object-contain sm:w-40"
            />
          ) : (
            <span className="pos-brand-mark grid size-14 shrink-0 place-items-center rounded-[16px] shadow-[0_7px_15px_rgba(19,20,23,0.14)]">
              <Utensils size={24} strokeWidth={1.7} />
            </span>
          )}
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="القائمة"
              title="القائمة"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="grid size-14 shrink-0 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]"
            >
              <Menu size={22} strokeWidth={1.8} />
            </button>
            {userMenuOpen && (
              <div dir="rtl" role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-[16px] border border-[var(--pos-border)] bg-white p-2 text-sm text-[var(--pos-foreground)] shadow-[0_18px_45px_rgba(19,20,23,0.14)]">
                <Link href="/pos" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]">
                  <ArrowRight size={15} />
                  نقطة البيع
                </Link>
                <Link href="/admin/orders" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]">
                  <ShoppingBag size={15} />
                  إدارة الطلبات
                </Link>
                <Link href="/admin" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--pos-soft)]">
                  <ArrowRight size={15} />
                  الإدارة
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/pos"
            aria-label="العودة إلى نقطة البيع"
            title="نقطة البيع"
            className="grid size-14 shrink-0 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]"
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
          </Link>
          <label className="flex h-14 min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-[var(--pos-border)] bg-white px-3.5 text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition focus-within:border-[var(--pos-signal)] focus-within:ring-2 focus-within:ring-[var(--pos-signal)]/10">
            <Search size={20} strokeWidth={1.8} className="shrink-0 text-[var(--pos-muted)]" />
            <input
              aria-label="البحث عن صنف"
              placeholder="ابحث عن صنف بالاسم..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--pos-foreground)] outline-none placeholder:text-[var(--pos-muted)] focus:ring-0"
            />
          </label>
        </div>

        <div dir="ltr" className="flex shrink-0 items-center gap-2.5 lg:gap-3">
          <div className="hidden h-14 w-[190px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border border-[var(--pos-border)] bg-white px-2 text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] lg:flex">
            <span dir="ltr" className="text-2xl font-extrabold leading-none tabular-nums">
              {headerDateTime.time || '—'}
            </span>
            <div dir="rtl" className="w-full whitespace-nowrap text-center text-xs font-semibold leading-none text-[var(--pos-muted)]">
              {headerDateTime.date || '—'}
            </div>
          </div>
          <Link
            href="/admin/orders"
            aria-label="إدارة الطلبات"
            title="إدارة الطلبات"
            className="relative grid size-14 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)]"
          >
            <Bell size={20} strokeWidth={1.7} />
          </Link>
          <button
            type="button"
            aria-label="طباعة"
            title="طباعة"
            onClick={() => window.print()}
            className="hidden size-14 place-items-center rounded-[16px] border border-[var(--pos-border)] bg-white text-[var(--pos-foreground)] shadow-[0_4px_14px_rgba(19,20,23,0.06)] transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft)] sm:grid"
          >
            <Printer size={20} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <div className="relative grid w-full grid-cols-1 gap-3 bg-[var(--pos-canvas)] p-2.5 pb-28 sm:p-3 sm:pb-28 lg:h-[calc(100dvh-96px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,25%)] lg:items-stretch lg:gap-3.5 lg:overflow-hidden lg:p-2 lg:pb-2">
        <section className="min-w-0 lg:h-full lg:min-h-0">
          <section ref={catalogRef} className="overflow-hidden rounded-[16px] border border-[var(--pos-border)] bg-white shadow-[0_5px_16px_rgba(19,20,23,0.04)] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <h1 className="sr-only">أصناف الطلب</h1>
            <div className="flex-1 h-full overflow-y-auto">
              <PosCatalog categories={categories} currency={settings.currency} locale={settings.locale} disabled={isSubmitting} search={search} onSelect={setSelectedProduct} />
            </div>
          </section>
        </section>

        <aside ref={summaryRef} className="min-h-[520px] lg:h-full lg:min-h-0">
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-[var(--pos-border)] bg-white shadow-[0_5px_16px_rgba(19,20,23,0.05)]">
            <div role="tablist" aria-label="تفاصيل الطلب" className="grid shrink-0 grid-cols-2 gap-1 border-b border-[var(--pos-border)] bg-[var(--pos-canvas)] p-2">
              <button type="button" role="tab" aria-selected={activePanelTab === 'SUMMARY'} onClick={() => setActivePanelTab('SUMMARY')} className={`flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-2 text-xs font-bold transition ${activePanelTab === 'SUMMARY' ? 'bg-white text-[var(--pos-foreground)] shadow-sm' : 'text-[var(--pos-muted)] hover:bg-white/70'}`}><ShoppingBag size={16} />ملخص الطلب</button>
              <button type="button" role="tab" aria-selected={activePanelTab === 'CUSTOMER'} onClick={() => setActivePanelTab('CUSTOMER')} className={`flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-2 text-xs font-bold transition ${activePanelTab === 'CUSTOMER' ? 'bg-white text-[var(--pos-foreground)] shadow-sm' : 'text-[var(--pos-muted)] hover:bg-white/70'}`}><UserRound size={16} />بيانات العميل</button>
            </div>
            <div role="tabpanel" className={`${activePanelTab === 'SUMMARY' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col`}>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h2 className="text-sm font-black">الطلب الحالي</h2><p className="mt-1 text-[11px] text-[var(--pos-muted)]">{items.reduce((sum, item) => sum + item.quantity, 0)} صنف · {orderType === OrderType.DELIVERY ? 'توصيل' : 'استلام'}</p></div>
                  <span aria-label={`${items.reduce((sum, item) => sum + item.quantity, 0)} صنف`} className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--pos-foreground)] text-sm font-extrabold tabular-nums text-white shadow-sm">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <CartLines items={items} products={productsInCart} settings={settings} locked={isSubmitting} changeQuantity={changeQuantity} />
              </div>
              <div className="shrink-0 space-y-2 border-t border-[var(--pos-border)] p-3 sm:p-4">
                <label className="block text-xs font-bold">ملاحظة للمطبخ أو الطلب
                  <textarea value={customerNotes} onChange={(event) => { refreshDraftKey(); setCustomerNotes(event.target.value); }} rows={2} maxLength={500} placeholder="مثال: بدون سكر، الاتصال عند الوصول" className="mt-1.5 min-h-16 w-full resize-y rounded-[13px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3 py-2 text-sm font-normal outline-none placeholder:text-[var(--pos-muted)] focus:border-[var(--pos-signal)] focus:bg-white focus:ring-2 focus:ring-[var(--pos-signal)]/15" />
                </label>
                <div className="space-y-2 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3.5 py-3 text-sm text-[var(--pos-foreground)]">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <span className="text-right font-medium">المجموع الفرعي</span>
                    <span dir="ltr" className="text-left font-mono font-semibold tabular-nums">{Money.fromMinor(totals.subtotalMinor, settings.currency).format(settings.locale)}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <span className="text-right font-medium">الضريبة</span>
                    <span dir="ltr" className="text-left font-mono font-semibold tabular-nums">{Money.fromMinor(totals.taxMinor, settings.currency).format(settings.locale)}</span>
                  </div>
                  {orderType === OrderType.DELIVERY && <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <span className="text-right font-medium">رسوم التوصيل</span>
                    <span dir="ltr" className="text-left font-mono font-semibold tabular-nums">{Money.fromMinor(deliveryFeeMinor, settings.currency).format(settings.locale)}</span>
                  </div>}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[var(--pos-border)] pt-2.5 text-base font-black">
                    <span className="text-right">الإجمالي</span>
                    <span dir="ltr" className="text-left text-xl tabular-nums">{Money.fromMinor(totals.totalMinor, settings.currency).format(settings.locale)}</span>
                  </div>
                </div>
                <div className="rounded-[12px] bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">الدفع عند الاستلام — لا تُسجل بيانات البطاقة عبر الهاتف.</div>
                <div className={`rounded-[12px] px-3 py-2 text-[11px] leading-5 ${canSubmit ? 'bg-emerald-50 text-emerald-800' : 'bg-[var(--pos-signal-soft)] text-[var(--pos-foreground)]'}`}>
                  {canSubmit ? 'الطلب جاهز للإرسال.' : missingRequirement()}
                  {!canSubmit && <button type="button" onClick={focusMissingRequirement} className="ms-2 font-bold text-[var(--pos-primary)] underline underline-offset-2">الانتقال للحقل</button>}
                </div>
                <button type="button" onClick={submitOrder} disabled={!canSubmit || isSubmitting} className={`${posPrimary} min-h-12 w-full text-sm`}><ChefHat size={17} />{isSubmitting ? 'جارٍ إرسال الطلب...' : 'تأكيد وإرسال للمطبخ'}</button>
              </div>
            </div>
            <div role="tabpanel" className={`${activePanelTab === 'CUSTOMER' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col`}>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5 sm:p-3">
                <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div><h2 className="flex items-center gap-2 text-sm font-black"><Phone size={16} className="text-[var(--pos-primary)]" /> بيانات المتصل</h2><p className="mt-0.5 text-[11px] text-[var(--pos-muted)]">ابحث برقم الهاتف لتحديد العميل.</p></div>
              {matchedCustomer && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><Check size={12} /> مسجل</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-xs font-bold text-[var(--pos-foreground)]">رقم الهاتف <span className="text-[var(--pos-primary)]">*</span>
                <div className="relative mt-1"><Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                  <input ref={phoneInputRef} dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => {
                    refreshDraftKey(); setPhone(event.target.value); setLookupDone(false); setMatchedCustomer(null); setCustomerName(''); setAddresses([]); setSelectedAddressId(''); setUseNewAddress(false); setAddress(emptyAddress); setFeedback('');
                  }} placeholder="01xxxxxxxxx" className={`${posInput} pe-10 text-left`} />
                </div>
              </label>
              <button type="button" onClick={lookupCaller} disabled={isLookingUp || !phone.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] px-3 text-xs font-bold transition hover:border-[var(--pos-metal)] hover:bg-[var(--pos-soft-hover)] disabled:opacity-60">
                <Search size={15} /> {isLookingUp ? 'جارٍ البحث...' : 'بحث عن العميل'}
              </button>
            </div>
            {lookupDone && matchedCustomer && <div className="flex items-center justify-between gap-2 rounded-[12px] bg-emerald-50/70 px-3 py-2"><div><p className="text-sm font-bold">{matchedCustomer.fullName}</p><p dir="ltr" className="mt-0.5 text-left text-xs text-[var(--pos-muted)]">{matchedCustomer.phone}</p></div><span className="text-[10px] font-semibold text-emerald-800">تم التعرف على العميل</span></div>}
            {lookupDone && !matchedCustomer && <div className="border-t border-[var(--pos-border)] pt-3">
              <p className="mb-2 text-[11px] font-medium text-[var(--pos-muted)]">عميل جديد — أدخل اسمه للمتابعة.</p>
              <label className="block text-xs font-bold">اسم العميل <span className="text-[var(--pos-primary)]">*</span>
                <div className="relative mt-1"><UserRound size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" /><input ref={customerNameRef} value={customerName} onChange={(event) => { refreshDraftKey(); setCustomerName(event.target.value); }} autoComplete="name" placeholder="اسم العميل" className={`${posInput} pe-10`} /></div>
              </label>
            </div>}
            {feedback && !completedOrder && <p role="status" className="rounded-[10px] bg-[var(--pos-signal-soft)] px-3 py-2 text-[11px] font-semibold leading-5 text-[var(--pos-foreground)]">{feedback}</p>}
          </section>

          {lookupDone && <section className="space-y-3 border-t border-[var(--pos-border)] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black">الاستلام والعنوان</h2>
              </div>
              <div className="flex h-10 w-full rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-canvas)] p-1 sm:w-auto">
                {([
                  [OrderType.DELIVERY, 'توصيل'],
                  [OrderType.TAKEAWAY, 'استلام من المطعم'],
                ] as const).map(([type, label]) => (
                  <button type="button" key={type} onClick={() => { refreshDraftKey(); setOrderType(type); }} aria-pressed={orderType === type} className={`flex-1 rounded-[9px] px-3 text-xs font-bold transition sm:flex-none ${orderType === type ? 'pos-category-selected' : 'text-[var(--pos-muted)] hover:text-[var(--pos-foreground)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {orderType === OrderType.DELIVERY ? (
              <div className="space-y-2.5">
                {matchedCustomer && !useNewAddress && addresses.length > 0 && (
                  <label className="block text-xs font-bold">
                    عنوان محفوظ
                    <div className="relative mt-1">
                      <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                      <select ref={addressSelectRef} value={selectedAddressId} onChange={(event) => {
                        const id = event.target.value;
                        refreshDraftKey();
                        setSelectedAddressId(id);
                      }} className={`${posInput} appearance-none pe-10`}>
                        <option value="">اختر عنوان العميل</option>
                        {addresses.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.addressText || [entry.area, entry.street].filter(Boolean).join('، ')}{entry.isDefault ? ' (الافتراضي)' : ''}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
                    </div>
                  </label>
                )}
                {matchedCustomer && !useNewAddress && <button type="button" onClick={() => { refreshDraftKey(); setSelectedAddressId(''); setAddress(emptyAddress); setUseNewAddress(true); }} className="text-xs font-bold text-[var(--pos-primary)] underline underline-offset-2">إضافة عنوان جديد</button>}
                {matchedCustomer && useNewAddress && addresses.length > 0 && <button type="button" onClick={() => { refreshDraftKey(); setUseNewAddress(false); setAddress(emptyAddress); setSelectedAddressId(addresses.find((entry) => entry.isDefault)?.id ?? addresses[0].id); }} className="text-xs font-bold text-[var(--pos-primary)] underline underline-offset-2">اختيار عنوان محفوظ</button>}
                {matchedCustomer && useNewAddress && <p className="text-[11px] text-[var(--pos-muted)]">سيُحفظ العنوان الجديد مع ملف العميل.</p>}
                {!matchedCustomer || useNewAddress ? (
                  <div className="grid gap-2.5">
                    <label className="block text-xs font-bold">العنوان بالتفصيل <span className="text-[var(--pos-primary)]">*</span>
                      <textarea ref={addressTextRef} value={address.addressText} onChange={(event) => addressValue('addressText', event.target.value)} required maxLength={1000} rows={3} placeholder="المنطقة، الشارع، رقم المبنى، الدور، الشقة، وأي تفاصيل تساعد في الوصول" className={`${posInput} mt-1 min-h-24 resize-y py-3`} />
                    </label>
                    <label className="block text-xs font-bold">تعليمات التوصيل
                      <input value={address.deliveryNotes} onChange={(event) => addressValue('deliveryNotes', event.target.value)} maxLength={500} placeholder="مثال: الاتصال عند الوصول" className={`${posInput} mt-1`} />
                    </label>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--pos-canvas)] px-3 py-2 text-xs">
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
          </section>}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--pos-border)] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(19,20,23,0.08)] backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--pos-muted)]">{items.reduce((sum, item) => sum + item.quantity, 0)} صنف في الطلب</p>
            <p className="truncate text-base font-black">{Money.fromMinor(totals.totalMinor, settings.currency).format(settings.locale)}</p>
          </div>
          <button type="button" onClick={() => { setActivePanelTab('SUMMARY'); window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className={`${posPrimary} min-h-11 shrink-0 px-5`}>
            <ShoppingBag size={17} /> ملخص الطلب
          </button>
        </div>
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


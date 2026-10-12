'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Save, CheckCircle2, Coins, Percent, Building, ImageIcon, UploadCloud, Loader2 } from 'lucide-react';
import { updateSettingsAction, uploadRestaurantLogoAction } from '../../../actions/settings.actions';

interface SettingData {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string | null;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxRatePercent: number;
  deliveryFee: number;
  phone?: string | null;
  address?: string | null;
}

export function SettingsClient({ initialSettings }: { initialSettings: SettingData }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nameAr: initialSettings.nameAr,
    nameEn: initialSettings.nameEn,
    logoUrl: initialSettings.logoUrl ?? '',
    currency: initialSettings.currency,
    currencySymbol: initialSettings.currencySymbol,
    locale: initialSettings.locale,
    taxRatePercent: Number(initialSettings.taxRatePercent),
    deliveryFee: initialSettings.deliveryFee,
    phone: initialSettings.phone ?? '',
    address: initialSettings.address ?? '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoUpload = async (file: File) => {
    setIsLogoUploading(true);
    setMessage(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await uploadRestaurantLogoAction(uploadData);

      if (!res.success) {
        setMessage({ type: 'error', text: res.error });
        return;
      }

      setFormData((current) => ({ ...current, logoUrl: res.data.url }));
      setMessage({ type: 'success', text: 'ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø´Ø¹Ø§Ø± ÙˆØ­ÙØ¸Ù‡ Ø¨Ù†Ø¬Ø§Ø­.' });
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø±ÙØ¹ Ø§Ù„Ø´Ø¹Ø§Ø±',
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleLogoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleLogoUpload(file);
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await updateSettingsAction({
        ...formData,
        currency: formData.currency.toUpperCase(),
        taxRatePercent: Number(formData.taxRatePercent),
        deliveryFee: Number(formData.deliveryFee),
      });
      if (!res.success) {
        setMessage({ type: 'error', text: res.error });
        return;
      }
      router.refresh();
      setMessage({ type: 'success', text: 'تم حفظ وتحديث إعدادات المطعم والعملة بنجاح!' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء حفظ الإعدادات',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--admin-foreground)]">إعدادات المنظومة وهوية المطعم</h2>
        <p className="text-xs admin-muted mt-1">
          تخصيص هوية المطعم، العملة الأساسية، الضرائب، ورسوم التوصيل مباشرة وفق رغبة العميل
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'admin-status-success'
              : 'admin-status-danger'
          }`}
        >
          {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--admin-accent-hover)]" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Identity Card */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-3">
            <Building className="w-4 h-4 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <h3 className="font-semibold text-sm text-[var(--admin-foreground)]">هوية وبيانات المطعم</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">الاسم التجاري (بالعربية)</label>
              <input
                type="text"
                required
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg focus:outline-none focus:border-[var(--admin-primary)]"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">الاسم التجاري (بالإنجليزية)</label>
              <input
                type="text"
                required
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg focus:outline-none focus:border-[var(--admin-primary)]"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">رقم الهاتف الرسمي</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg font-mono focus:outline-none focus:border-[var(--admin-primary)]"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">عنوان الإدارة الرئيسي</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg focus:outline-none focus:border-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div className="border-t border-[var(--admin-border)] pt-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[var(--admin-primary)]" strokeWidth={1.8} />
              <div>
                <h4 className="text-sm font-semibold text-[var(--admin-foreground)]">شعار المطعم</h4>
                <p className="mt-0.5 text-[10px] admin-muted">سيظهر الشعار في أعلى القائمة الجانبية للإدارة.</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="admin-soft-primary flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--admin-border)] p-3">
                {formData.logoUrl ? (
                  <Image
                    src={formData.logoUrl}
                    alt={formData.nameAr}
                    width={160}
                    height={96}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-[var(--admin-primary)]/45" strokeWidth={1.5} />
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <label className="admin-primary-action inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs transition hover:opacity-90">
                  {isLogoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  <span>{isLogoUploading ? 'جارٍ رفع الشعار...' : 'اختيار صورة الشعار'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    onChange={handleLogoInputChange}
                    disabled={isLogoUploading}
                  />
                </label>
                <p className="text-[10px] admin-muted">JPEG, PNG, WEBP أو AVIF — الحد الأقصى 5 ميجابايت.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Financial Configuration Card */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-3">
            <Coins className="w-4 h-4 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <h3 className="font-semibold text-sm text-[var(--admin-foreground)]">إعدادات العملة والضرائب</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">
                العملة الأساسية (ISO Code)
              </label>
              <input
                type="text"
                required
                maxLength={3}
                placeholder="EGP"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg font-mono uppercase focus:outline-none focus:border-[var(--admin-primary)]"
              />
              <span className="text-[10px] admin-muted mt-1 block">مثال: EGP, SAR, USD, AED</span>
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">رمز العملة للعرض</label>
              <input
                type="text"
                required
                placeholder="ج.م"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg focus:outline-none focus:border-[var(--admin-primary)]"
              />
              <span className="text-[10px] admin-muted mt-1 block">يظهر في الفواتير وقائمة الطعام</span>
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">لغة وتنسيق الأرقام (Locale)</label>
              <input
                type="text"
                required
                placeholder="ar-EG"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg font-mono focus:outline-none focus:border-[var(--admin-primary)]"
              />
              <span className="text-[10px] admin-muted mt-1 block">مثال: ar-EG, ar-SA, en-US</span>
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">
                نسبة ضريبة القيمة المضافة (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={formData.taxRatePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg font-mono focus:outline-none focus:border-[var(--admin-primary)]"
                />
                <Percent className="w-3.5 h-3.5 admin-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[var(--admin-foreground)] mb-1">
                رسوم التوصيل الأساسية (بالقروش/سنت)
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.deliveryFee}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryFee: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg font-mono focus:outline-none focus:border-[var(--admin-primary)]"
              />
              <span className="text-[10px] admin-muted mt-1 block">
                القيمة بالوحدات الصغرى (1500 = 15.00 {formData.currencySymbol})
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg admin-primary-action text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { QrCode, Printer, Download, Copy, Check, X, Sparkles, Utensils, Phone, Globe } from 'lucide-react';
import { encodeQrSvg } from '../../../../infrastructure/qr/qr-code';

interface MenuQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantNameAr: string;
  restaurantNameEn: string;
  branches: { id: string; nameAr: string; phone: string }[];
}

type TemplateType = 'stand' | 'card';

export function MenuQrModal({
  isOpen,
  onClose,
  restaurantNameAr,
  restaurantNameEn,
  branches,
}: MenuQrModalProps) {
  const [selectedBranchId] = useState(branches[0]?.id ?? '');
  const [template, setTemplate] = useState<TemplateType>('stand');
  const [copied, setCopied] = useState(false);
  const [customUrl, setCustomUrl] = useState<string>('');

  // Compute live full URL on client
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultMenuUrl = useMemo(() => {
    return origin ? `${origin}/menu` : '/menu';
  }, [origin]);

  const menuUrl = customUrl.trim() || defaultMenuUrl;
  const isLocalhost = menuUrl.includes('localhost') || menuUrl.includes('127.0.0.1');
  const displayUrl = menuUrl.replace(/^https?:\/\//, '');

  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const qrSvg = useMemo(() => {
    return encodeQrSvg(menuUrl, 320);
  }, [menuUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeBrand = (restaurantNameEn || restaurantNameAr || 'Menu').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
    link.download = `${safeBrand}_Menu_QR_${activeBranch?.nameAr || 'General'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--admin-surface)] shadow-2xl border border-[var(--admin-border)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header (Hidden in Print) */}
        <header className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="admin-primary-action flex size-10 items-center justify-center rounded-xl shadow-xs">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--admin-foreground)]">رمز QR للمنيو الرقمي والدعاية</h2>
              <p className="text-xs admin-muted">طباعة ستاندات الطاولات وكروت الدعاية للمطعم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-9 place-items-center rounded-xl text-[var(--admin-muted)] hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)] transition"
          >
            <X size={18} />
          </button>
        </header>

        {/* Controls Toolbar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-background)] px-5 py-3 text-xs print:hidden">
          {/* Template Switch */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1">
            <button
              onClick={() => setTemplate('stand')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                template === 'stand'
                  ? 'admin-primary-action font-semibold shadow-xs'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-foreground)]'
              }`}
            >
              حامل طاولة أكريليك
            </button>
            <button
              onClick={() => setTemplate('card')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                template === 'card'
                  ? 'admin-primary-action font-semibold shadow-xs'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-foreground)]'
              }`}
            >
              كارت دعاية وترويج
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="admin-control inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium"
              title="نسخ الرابط"
            >
              {copied ? <Check size={14} className="text-[var(--admin-accent-hover)]" /> : <Copy size={14} />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>
            <button
              onClick={handleDownloadSvg}
              className="admin-control inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium"
              title="تحميل SVG عالي الدقة"
            >
              <Download size={14} />
              <span>تحميل SVG</span>
            </button>
            <button
              onClick={handlePrint}
              className="admin-primary-action inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs"
            >
              <Printer size={14} />
              <span>طباعة فورية</span>
            </button>
          </div>
        </div>

        {/* URL Configuration Input Bar */}
        <div className="border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-2.5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-xs font-semibold text-[var(--admin-foreground)] shrink-0 flex items-center gap-1.5">
              <Globe size={14} className="text-[var(--admin-muted)]" />
              <span>رابط المنيو المستهدف:</span>
            </label>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="url"
                value={menuUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-domain.com/menu"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] font-mono focus:border-[var(--admin-primary)] focus:bg-[var(--admin-surface)] focus:outline-hidden transition"
                dir="ltr"
              />
              {customUrl && (
                <button
                  type="button"
                  onClick={() => setCustomUrl('')}
                  className="shrink-0 text-2xs text-[var(--admin-muted)] hover:text-[var(--admin-foreground)] underline"
                >
                  استعادة الافتراضي
                </button>
              )}
            </div>
          </div>
          {isLocalhost && (
            <div className="mt-2 rounded-lg border admin-status-warning p-2 text-2xs flex items-start gap-1.5">
              <span className="shrink-0 text-[var(--admin-warning)] font-bold">⚠️</span>
              <span>
                <strong>تنبيه للمعاينة من الهاتف:</strong> الرابط الحالي محلي ({menuUrl}). كاميرا الجوال لن تفتح روابط <code>localhost</code> إلا إذا كان الهاتف على نفس شبكة الواي فاي واستخدمت IP جهازك (مثال: <code>http://192.168.1.15:3000/menu</code>) أو رابط موقعك الحقيقي أونلاين.
              </span>
            </div>
          )}
        </div>

        {/* Live Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-[var(--admin-background)] print:bg-[var(--admin-surface)] print:p-0">
          {/* Printable Container */}
          <div id="printable-qr-area" className="w-full flex justify-center">
            {template === 'stand' ? (
              /* Stand Display (Vertical Acrylic Table Tent Layout) */
              <div className="w-[320px] rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-lg text-center flex flex-col items-center print:shadow-none print:border-2 print:border-black print:w-[360px]">
                {/* Brand */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-primary)] to-[var(--admin-accent)] text-white shadow-xs">
                    <Utensils size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-lg font-black tracking-wide text-[var(--admin-foreground)]">
                    {restaurantNameAr}
                  </span>
                </div>
                <p className="text-3xs font-bold tracking-widest text-[var(--admin-muted)] uppercase font-mono mb-4">
                  {restaurantNameEn} · FINE DINING & GRILL
                </p>

                {/* Subtitle */}
                <div className="mb-4 rounded-full border admin-status-warning px-3 py-1 text-2xs font-semibold flex items-center gap-1">
                  <Sparkles size={11} className="text-[var(--admin-warning)]" />
                  <span>تصفح المنيو الرقمي واطلب وجبتك</span>
                </div>

                {/* QR Code Container */}
                <div className="p-3.5 rounded-2xl border-2 border-[var(--admin-foreground)] bg-[var(--admin-surface)] shadow-xs mb-4 text-[var(--admin-foreground)] flex items-center justify-center">
                  <div
                    className="w-48 h-48 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                </div>

                {/* Scan Instruction */}
                <p className="text-xs font-bold text-[var(--admin-foreground)] mb-1">
                  وجّه كاميرا هاتفك لمسح الرمز
                </p>
                <p className="text-3xs admin-muted mb-4 max-w-[240px]">
                  بدون أي تطبيقات إضافية · متاح الدفع الإلكتروني والاستلام الفوري
                </p>

                {/* Footer details */}
                <div className="w-full border-t border-[var(--admin-border)] pt-3 flex items-center justify-between text-3xs admin-muted font-mono gap-2">
                  <span className="flex items-center gap-1 min-w-0" dir="ltr">
                    <Globe size={11} className="shrink-0" />
                    <span className="truncate max-w-[170px]" title={menuUrl}>{displayUrl}</span>
                  </span>
                  {activeBranch?.phone && (
                    <span className="flex items-center gap-1 shrink-0" dir="ltr">
                      <Phone size={11} />
                      <span>{activeBranch.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Marketing Card (Pocket / Delivery Box Flyer Layout) */
              <div className="w-[360px] sm:w-[420px] rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-lg flex items-center gap-5 text-right print:shadow-none print:border-2 print:border-black">
                {/* QR Box */}
                <div className="shrink-0 p-2.5 rounded-xl border border-[var(--admin-foreground)] bg-[var(--admin-surface)] text-[var(--admin-foreground)]">
                  <div
                    className="w-28 h-28 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                </div>

                {/* Text details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-extrabold text-[var(--admin-foreground)]">{restaurantNameAr}</span>
                    <span className="rounded-md bg-[var(--admin-background)] px-1.5 py-0.5 text-3xs admin-muted font-mono">
                      DELIVERY
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[var(--admin-foreground)] mb-1">
                    اطلب وجبتك المفضلة أونلاين
                  </p>
                  <p className="text-3xs admin-muted leading-relaxed mb-3">
                    امسح الرمز بكاميرا الجوال للوصول السريع إلى قائمة طعامنا وتتبع طلبك مباشرة.
                  </p>
                  <div className="flex items-center justify-between text-3xs text-[var(--admin-muted)] font-mono border-t border-[var(--admin-border)] pt-2 gap-2">
                    <span dir="ltr" className="shrink-0">{activeBranch?.phone || '01012345678'}</span>
                    <span dir="ltr" className="truncate text-left max-w-[170px]" title={menuUrl}>
                      {displayUrl}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info note */}
        <footer className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-3 text-center text-3xs text-[var(--admin-muted)] print:hidden">
          يمكنك طباعة هذا التصميم مباشرة على ورق A4 أو كرتون مقوى واستخدامه فورياً على الطاولات أو في كروت الترويج
        </footer>
      </div>
    </div>
  );
}

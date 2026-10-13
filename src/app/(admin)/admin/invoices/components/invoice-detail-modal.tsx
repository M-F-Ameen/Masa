'use client';

import React from 'react';
import {
  Receipt,
  Printer,
  ChefHat,
  X,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { InvoiceOrderRecord } from '../invoices-client';

interface InvoiceDetailModalProps {
  selectedInvoice: InvoiceOrderRecord | null;
  onClose: () => void;
  onPrintThermal: (order: InvoiceOrderRecord) => void;
  onPrintKot: (order: InvoiceOrderRecord) => void;
  formatMoney: (minor: number) => string;
}

export function InvoiceDetailModal({
  selectedInvoice,
  onClose,
  onPrintThermal,
  onPrintKot,
  formatMoney,
}: InvoiceDetailModalProps) {
  if (!selectedInvoice) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[var(--admin-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--admin-border)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)] bg-[var(--admin-background)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--admin-primary)] text-white shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--admin-foreground)]">
                  فاتورة #{selectedInvoice.orderNumber}
                </h3>
                {selectedInvoice.paymentStatus === 'PAID' ? (
                  <span className="admin-badge admin-badge-success">
                    مسددة بالكامل
                  </span>
                ) : (
                  <span className="admin-badge admin-badge-danger">
                    شيك مفتوح / معلق
                  </span>
                )}
              </div>
              <span className="text-xs admin-muted font-mono">
                {new Date(selectedInvoice.createdAt).toLocaleString('ar-EG', {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })}
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintThermal(selectedInvoice)}
              className="admin-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
              title="طباعة إيصال الفاتورة الحراري"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة فاتورة</span>
            </button>
            <button
              type="button"
              onClick={() => onPrintKot(selectedInvoice)}
              className="admin-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
              title="طباعة بون المطبخ"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>بون المطبخ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg admin-muted hover:text-[var(--admin-foreground)] hover:bg-[var(--admin-background)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Audit Details */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--admin-background)] border border-[var(--admin-border)] text-xs">
            <div>
              <span className="admin-muted block text-[11px]">الفرع</span>
              <span className="font-bold text-[var(--admin-foreground)] mt-0.5 block">
                {selectedInvoice.branch?.nameAr || 'الفرع الرئيسي'}
              </span>
            </div>
            <div>
              <span className="admin-muted block text-[11px]">الكاشير المسؤول</span>
              <span className="font-bold text-[var(--admin-foreground)] mt-0.5 block">
                {selectedInvoice.cashier?.fullName || 'الموقع العام'}
              </span>
            </div>
            <div>
              <span className="admin-muted block text-[11px]">نوع الطلب والقناة</span>
              <span className="font-bold text-[var(--admin-foreground)] mt-0.5 block">
                {selectedInvoice.type === 'DINE_IN'
                  ? `صالة (${selectedInvoice.tableName || 'طاولة'})`
                  : selectedInvoice.type === 'TAKEAWAY'
                  ? 'سفري'
                  : 'توصيل'}
                {' • '}
              {selectedInvoice.source === 'POS' ? 'كاشير' : selectedInvoice.source === 'PHONE' ? 'الهاتف' : 'الموقع'}
              </span>
            </div>
            <div>
              <span className="admin-muted block text-[11px]">طريقة السداد</span>
              <span className="font-bold text-[var(--admin-foreground)] mt-0.5 block">
                {selectedInvoice.paymentMethod === 'CASH'
                  ? 'نقدي'
                  : selectedInvoice.paymentMethod === 'CARD'
                  ? 'بطاقة دفع'
                  : selectedInvoice.paymentMethod === 'MIXED'
                  ? 'دفع مختلط'
                  : selectedInvoice.paymentMethod}
              </span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold text-[var(--admin-foreground)] mb-2.5">تفاصيل الأصناف والكميات</h4>
            <div className="border border-[var(--admin-border)] rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--admin-background)] admin-muted font-bold border-b border-[var(--admin-border)]">
                  <tr>
                    <th className="py-2.5 px-3">الصنف والمقاس</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-left">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="admin-row-hover">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[var(--admin-foreground)]">{item.productNameAr}</span>
                        {item.sizeNameAr && (
                          <span className="admin-muted mr-1.5">({item.sizeNameAr})</span>
                        )}
                        {item.modifiers.length > 0 && (
                          <div className="text-[11px] admin-muted mt-0.5 space-y-0.5">
                            {item.modifiers.map((m) => (
                              <div key={m.id}>
                                + {m.nameAr}{' '}
                                {m.priceDeltaMinor > 0 && `(${formatMoney(m.priceDeltaMinor)})`}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-[var(--admin-foreground)]">
                        {item.quantity}×
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono admin-muted">
                        {formatMoney(item.unitPriceMinor)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-bold font-mono text-[var(--admin-foreground)]">
                        {formatMoney(item.totalPriceMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Financial Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payments Log */}
            <div className="p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)]/50 space-y-2">
              <span className="text-xs font-bold text-[var(--admin-foreground)] block">سجل الدفعات المحصلة</span>
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--admin-surface)] border border-[var(--admin-border)]"
                    >
                      <div className="flex items-center gap-1.5">
                        {p.method === 'CASH' ? (
                          <Banknote className="w-3.5 h-3.5 text-[var(--admin-success)]" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-[var(--admin-info)]" />
                        )}
                        <span className="font-medium text-[var(--admin-foreground)]">
                          {p.method === 'CASH' ? 'نقدي' : 'بطاقة'}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-[var(--admin-foreground)]">
                        {formatMoney(p.amountMinor)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs admin-muted italic">
                  {selectedInvoice.paymentStatus === 'PAID'
                    ? 'تم التحصيل بالكامل عند إغلاق الفاتورة'
                    : 'لم يتم تسجيل دفعات بعد (شيك مفتوح)'}
                </p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] space-y-1.5 text-xs">
              <div className="flex justify-between admin-muted">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{formatMoney(selectedInvoice.subtotalMinor)}</span>
              </div>
              {selectedInvoice.deliveryFeeMinor > 0 && (
                <div className="flex justify-between admin-muted">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono">{formatMoney(selectedInvoice.deliveryFeeMinor)}</span>
                </div>
              )}
              {selectedInvoice.taxMinor > 0 && (
                <div className="flex justify-between admin-muted">
                  <span>ضريبة القيمة المضافة:</span>
                  <span className="font-mono">{formatMoney(selectedInvoice.taxMinor)}</span>
                </div>
              )}
              {selectedInvoice.discountMinor > 0 && (
                <div className="flex justify-between text-[var(--admin-success)] font-bold">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono">-{formatMoney(selectedInvoice.discountMinor)}</span>
                </div>
              )}
              <div className="border-t border-[var(--admin-border)] pt-2 mt-2 flex justify-between font-black text-sm text-[var(--admin-foreground)]">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-base text-[var(--admin-success)]">
                  {formatMoney(selectedInvoice.totalMinor)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[var(--admin-background)] border-t border-[var(--admin-border)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="admin-control px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

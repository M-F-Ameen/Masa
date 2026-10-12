'use client';

import React, { useEffect } from 'react';

export interface DriverSettlementPrintData {
  settlement: {
    id: string;
    settlementNumber: string;
    settledAt: Date | string;
    totalOrdersCount: number;
    totalCollectedMinor: number;
    notes?: string | null;
  };
  driver: {
    id: string;
    fullName: string;
    phone: string;
  };
  cashier: {
    id: string;
    fullName: string;
  };
  branch: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  financials: {
    currency: string;
    currencySymbol: string;
    codOrdersCount: number;
    prepaidOrdersCount: number;
    totalCollectedMinor: number;
    linkedCashShiftId?: string | null;
  };
  orders: Array<{
    orderNumber: string;
    customerName?: string | null;
    totalMinor: number;
    paymentMethod: string;
  }>;
}

export function DriverSettlementReceipt({
  data,
  restaurantName = 'المطعم',
  currencySymbol = 'ج.م',
  onAfterPrint,
}: {
  data: DriverSettlementPrintData | null;
  restaurantName?: string;
  currencySymbol?: string;
  onAfterPrint?: () => void;
}) {
  useEffect(() => {
    if (data && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.print();
        if (onAfterPrint) onAfterPrint();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [data, onAfterPrint]);

  if (!data) return null;

  const { settlement, driver, cashier, branch, financials, orders } = data;
  const curr = currencySymbol || financials.currencySymbol || 'ج.م';

  return (
    <section
      id="printable-settlement-receipt"
      className="printable-document hidden bg-[var(--admin-surface)] text-black print:block print:w-[76mm] print:p-2 font-sans"
      dir="rtl"
    >

      {/* Header */}
      <header className="border-b border-dashed border-black pb-3 text-center">
        <h1 className="text-base font-bold">{restaurantName}</h1>
        <p className="text-xs">{branch.nameAr} — إيصال توريد عهدة طيار</p>
        <p className="mt-1 text-sm font-black font-mono" dir="ltr">
          {settlement.settlementNumber}
        </p>
      </header>

      {/* Meta Info */}
      <div className="my-2 space-y-1 text-xs border-b border-dashed border-black pb-2">
        <div className="flex justify-between">
          <span className="admin-muted">التاريخ والوقت:</span>
          <span>{new Date(settlement.settledAt).toLocaleString('ar-EG')}</span>
        </div>
        <div className="flex justify-between">
          <span className="admin-muted">كابتن التوصيل:</span>
          <span className="font-bold">{driver.fullName}</span>
        </div>
        <div className="flex justify-between">
          <span className="admin-muted">رقم الهاتف:</span>
          <span className="font-mono" dir="ltr">{driver.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="admin-muted">الكاشير المستلم:</span>
          <span>{cashier.fullName}</span>
        </div>
        {financials.linkedCashShiftId && (
          <div className="flex justify-between text-[10px] admin-muted">
            <span>تم التوريد لوردية رقم:</span>
            <span className="font-mono">{financials.linkedCashShiftId.slice(0, 8)}...</span>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="my-2 space-y-1 text-xs">
        <p className="font-bold border-b border-[var(--admin-border)] pb-1">الطلبات المسلّمة ({orders.length}):</p>
        {orders.map((o, idx) => (
          <div key={idx} className="flex justify-between border-b border-dashed border-[var(--admin-border)] py-1 text-[11px]">
            <div>
              <span className="font-mono font-semibold" dir="ltr">{o.orderNumber}</span>
              {o.customerName && <p className="text-[10px] admin-muted">{o.customerName}</p>}
            </div>
            <div className="text-left font-mono">
              <span>{(o.totalMinor / 100).toFixed(2)} {curr}</span>
              <p className="text-[9px] admin-muted">
                {o.paymentMethod === 'CASH' ? 'دفع عند الاستلام' : 'بطاقة / مدفوع'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <dl className="my-3 space-y-1 text-xs border-t-2 border-black pt-2">
        <div className="flex justify-between">
          <dt>إجمالي الطلبات المسلّمة:</dt>
          <dd className="font-bold">{settlement.totalOrdersCount} طلبات</dd>
        </div>
        <div className="flex justify-between">
          <dt>طلبات الدفع عند الاستلام (COD):</dt>
          <dd>{financials.codOrdersCount} طلبات</dd>
        </div>
        {financials.prepaidOrdersCount > 0 && (
          <div className="flex justify-between admin-muted">
            <dt>طلبات مدفوعة مسبقاً:</dt>
            <dd>{financials.prepaidOrdersCount} طلبات</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed border-black pt-1.5 font-black text-sm">
          <dt>المبلغ النقدي المورّد للدرج:</dt>
          <dd className="font-mono text-base">
            {(settlement.totalCollectedMinor / 100).toFixed(2)} {curr}
          </dd>
        </div>
      </dl>

      {settlement.notes && (
        <p className="my-2 text-[10px] admin-muted border border-[var(--admin-border)] p-1.5 rounded">
          ملاحظات: {settlement.notes}
        </p>
      )}

      {/* Signatures */}
      <div className="mt-6 pt-3 border-t border-dashed border-black grid grid-cols-2 gap-4 text-center text-xs">
        <div>
          <p className="admin-muted mb-6">توقيع الكابتن</p>
          <div className="border-b border-black w-24 mx-auto" />
        </div>
        <div>
          <p className="admin-muted mb-6">توقيع الكاشير</p>
          <div className="border-b border-black w-24 mx-auto" />
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] admin-muted">
        هذا الإيصال سند مالي رسمي لتسوية عهدة طيار التوصيل
      </p>
    </section>
  );
}

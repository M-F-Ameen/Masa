'use client';

import React from 'react';

export interface ThermalReceiptProps {
  order: {
    id: string;
    orderNumber: string;
    source: string;
    type: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string | null;
    deliveryNotes?: string | null;
    customerNotes?: string | null;
    subtotalMinor: number;
    deliveryFeeMinor: number;
    taxMinor: number;
    discountMinor: number;
    totalMinor: number;
    createdAt: Date | string;
    branch?: {
      nameAr: string;
      nameEn: string;
      code: string;
      phone?: string | null;
      address?: string | null;
    } | null;
    items: Array<{
      id: string;
      productNameAr: string;
      productNameEn: string;
      sizeNameAr?: string | null;
      quantity: number;
      unitPriceMinor: number;
      totalPriceMinor: number;
      modifiers: Array<{
        id: string;
        nameAr: string;
        priceDeltaMinor: number;
      }>;
    }>;
  };
  restaurantNameAr?: string;
  restaurantNameEn?: string;
  currencySymbol?: string;
}

export function ThermalReceipt({
  order,
  restaurantNameAr = 'المطعم',
  restaurantNameEn = 'Restaurant',
  currencySymbol = 'ج.م',
}: ThermalReceiptProps) {
  const formatMoney = (minor: number) => (minor / 100).toFixed(2);
  const formattedDate = new Date(order.createdAt).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      id="printable-thermal-receipt"
      className="printable-document hidden print:block print:w-[76mm] print:mx-auto print:p-2 print:text-black print:font-mono text-xs leading-tight"
      dir="rtl"
    >
      {/* Receipt Header */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 className="text-base font-bold tracking-wide">{restaurantNameAr}</h1>
        <p className="text-[10px] admin-muted font-sans">{restaurantNameEn}</p>
        {order.branch && (
          <p className="text-xs font-semibold mt-1">فرع: {order.branch.nameAr}</p>
        )}
        <p className="text-[11px] mt-1 font-bold">إيصال طلب توصيل (Delivery)</p>
      </div>

      {/* Order & Customer Metadata */}
      <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1 text-[11px]">
        <div className="flex justify-between items-center py-1 border-b border-dashed border-[var(--admin-border)]">
          <span className="font-bold text-sm">رقم الطلب:</span>
          <span className="font-extrabold text-xl font-mono" dir="ltr">#{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>التاريخ:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>العميل:</span>
          <span className="font-bold">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>الهاتف:</span>
          <span dir="ltr" className="font-semibold">{order.customerPhone}</span>
        </div>
        {order.deliveryAddress && (
          <div className="mt-1">
            <span className="font-semibold">العنوان: </span>
            <span>{order.deliveryAddress}</span>
          </div>
        )}
        {order.deliveryNotes && (
          <div className="text-[10px] bg-[var(--admin-background)] p-1 rounded mt-1">
            <span className="font-bold">ملاحظات التوصيل: </span>
            {order.deliveryNotes}
          </div>
        )}
        {order.customerNotes && (
          <div className="text-[10px] bg-[var(--admin-background)] p-1 rounded mt-0.5">
            <span className="font-bold">ملاحظات العميل: </span>
            {order.customerNotes}
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold text-[11px] border-b border-black pb-1 mb-1">
          <span>الصنف</span>
          <span>الإجمالي</span>
        </div>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="text-[11px]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-bold">{item.productNameAr}</span>
                  {item.sizeNameAr && (
                    <span className="text-[10px] admin-muted"> ({item.sizeNameAr})</span>
                  )}
                  <div className="text-[10px] admin-muted">
                    {item.quantity} × {formatMoney(item.unitPriceMinor)} {currencySymbol}
                  </div>
                </div>
                <span className="font-bold shrink-0">
                  {formatMoney(item.totalPriceMinor)} {currencySymbol}
                </span>
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="mr-3 text-[10px] admin-muted space-y-0.5 mt-0.5">
                  {item.modifiers.map((m) => (
                    <div key={m.id} className="flex justify-between">
                      <span>+ {m.nameAr}</span>
                      {m.priceDeltaMinor > 0 && (
                        <span>+{formatMoney(m.priceDeltaMinor)} {currencySymbol}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Financials Breakdown */}
      <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span>{formatMoney(order.subtotalMinor)} {currencySymbol}</span>
        </div>
        <div className="flex justify-between">
          <span>خدمة التوصيل:</span>
          <span>{formatMoney(order.deliveryFeeMinor)} {currencySymbol}</span>
        </div>
        {order.taxMinor > 0 && (
          <div className="flex justify-between">
            <span>الضريبة:</span>
            <span>{formatMoney(order.taxMinor)} {currencySymbol}</span>
          </div>
        )}
        {order.discountMinor > 0 && (
          <div className="flex justify-between text-[var(--admin-danger)]">
            <span>الخصم:</span>
            <span>-{formatMoney(order.discountMinor)} {currencySymbol}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs border-t border-black pt-1 mt-1">
          <span>الإجمالي النهائي:</span>
          <span>{formatMoney(order.totalMinor)} {currencySymbol}</span>
        </div>
        <div className="flex justify-between text-[10px] admin-muted pt-0.5">
          <span>طريقة الدفع:</span>
          <span className="font-bold">
            {order.paymentMethod === 'CASH' ? 'الدفع نقداً عند الاستلام' : order.paymentMethod}
          </span>
        </div>
      </div>

      {/* Receipt Footer */}
      <div className="text-center pt-1 text-[10px] space-y-0.5">
        <p className="font-semibold">شكراً لاختياركم {restaurantNameAr}!</p>
        <p className="text-[9px] admin-muted font-sans">Printed via {restaurantNameEn} Platform</p>
      </div>
    </div>
  );
}

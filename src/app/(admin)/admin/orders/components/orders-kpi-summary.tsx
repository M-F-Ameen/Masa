'use client';

import React from 'react';
import { ChefHat, Truck, CheckCheck, DollarSign } from 'lucide-react';
import { OrderStatus } from '../../../../../domain/ordering/enums';

export interface OrderMetrics {
  pendingCount: number;
  preparingCount: number;
  inDeliveryCount: number;
  deliveredTodayCount: number;
  todaySalesMinor: number;
}

interface OrdersKpiSummaryProps {
  metrics: OrderMetrics;
  selectedStatus: string;
  onFilterChange: (status: OrderStatus) => void;
  currencySymbol: string;
  formatMoney: (minor: number) => string;
}

export function OrdersKpiSummary({
  metrics,
  selectedStatus,
  onFilterChange,
  currencySymbol,
  formatMoney,
}: OrdersKpiSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Pending Orders */}
      <div
        onClick={() => onFilterChange(OrderStatus.PENDING)}
        className={`cursor-pointer p-4 rounded-xl border transition shadow-2xs ${
          selectedStatus === OrderStatus.PENDING
            ? 'border-[var(--admin-info)] bg-[var(--admin-info-soft)] ring-2 ring-[var(--admin-info-soft)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)]'
        }`}
      >
        <div className="flex items-center justify-between text-xs admin-muted mb-1">
          <span>طلبات معلقة جديدة</span>
          <div
            className={`w-2 h-2 rounded-full ${
              metrics.pendingCount > 0 ? 'admin-status-dot-info animate-pulse' : 'bg-[var(--admin-border)]'
            }`}
          />
        </div>
        <div className="text-2xl font-bold text-[var(--admin-foreground)]">{metrics.pendingCount}</div>
        <span className="text-[11px] admin-muted">تحتاج مراجعة وإسناد</span>
      </div>

      {/* Preparing */}
      <div
        onClick={() => onFilterChange(OrderStatus.PREPARING)}
        className={`cursor-pointer p-4 rounded-xl border transition shadow-2xs ${
          selectedStatus === OrderStatus.PREPARING
            ? 'border-[var(--admin-warning)] bg-[var(--admin-warning-soft)] ring-2 ring-[var(--admin-warning-soft)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)]'
        }`}
      >
        <div className="flex items-center justify-between text-xs admin-muted mb-1">
          <span>قيد التجهيز بالمطبخ</span>
          <ChefHat className="w-3.5 h-3.5 text-[var(--admin-warning)]" />
        </div>
        <div className="text-2xl font-bold text-[var(--admin-foreground)]">{metrics.preparingCount}</div>
        <span className="text-[11px] admin-muted">في المطابخ حالياً</span>
      </div>

      {/* In Delivery */}
      <div
        onClick={() => onFilterChange(OrderStatus.OUT_FOR_DELIVERY)}
        className={`cursor-pointer p-4 rounded-xl border transition shadow-2xs ${
          selectedStatus === OrderStatus.OUT_FOR_DELIVERY
            ? 'border-[var(--admin-info)] bg-[var(--admin-info-soft)] ring-2 ring-[var(--admin-info-soft)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)]'
        }`}
      >
        <div className="flex items-center justify-between text-xs admin-muted mb-1">
          <span>مع المندوب</span>
          <Truck className="w-3.5 h-3.5 text-[var(--admin-info)]" />
        </div>
        <div className="text-2xl font-bold text-[var(--admin-foreground)]">{metrics.inDeliveryCount}</div>
        <span className="text-[11px] admin-muted">في طريقها للزبائن</span>
      </div>

      {/* Delivered Today */}
      <div
        onClick={() => onFilterChange(OrderStatus.DELIVERED)}
        className={`cursor-pointer p-4 rounded-xl border transition shadow-2xs ${
          selectedStatus === OrderStatus.DELIVERED
            ? 'border-[var(--admin-success)] bg-[var(--admin-success-soft)] ring-2 ring-[var(--admin-success-soft)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)]'
        }`}
      >
        <div className="flex items-center justify-between text-xs admin-muted mb-1">
          <span>تم تسليمها اليوم</span>
          <CheckCheck className="w-3.5 h-3.5 text-[var(--admin-accent-hover)]" />
        </div>
        <div className="text-2xl font-bold text-[var(--admin-foreground)]">{metrics.deliveredTodayCount}</div>
        <span className="text-[11px] admin-muted">طلبات مكتملة بنجاح</span>
      </div>

      {/* Sales Today */}
      <div className="admin-card col-span-2 sm:col-span-1 p-4">
        <div className="flex items-center justify-between text-xs admin-muted mb-1">
          <span>مبيعات اليوم المحققة</span>
          <DollarSign className="w-3.5 h-3.5 text-[var(--admin-foreground)]" />
        </div>
        <div className="text-2xl font-bold text-[var(--admin-foreground)]">
          {formatMoney(metrics.todaySalesMinor)}
          <span className="text-xs font-normal admin-muted mr-1">{currencySymbol}</span>
        </div>
        <span className="text-[11px] admin-muted">للطلبات المسلمة</span>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Calendar, Search, Building2 } from 'lucide-react';
import { OrderStatus } from '../../../../../domain/ordering/enums';
import { OrderSource } from '../../../../../domain/ordering/enums';
import { OrderMetrics } from './orders-kpi-summary';
import { BranchOption } from '../order-detail-modal';

interface OrdersFilterToolbarProps {
  datePreset: 'today' | 'week' | 'month' | 'custom';
  onPresetChange: (preset: 'today' | 'week' | 'month') => void;
  startDateStr: string;
  endDateStr: string;
  onCustomDateChange: (start: string, end: string) => void;
  ordersCount: number;
  ordersTotalMinor: number;
  formatMoney: (minor: number) => string;
  currencySymbol: string;
  selectedStatus: string;
  selectedSource: OrderSource;
  onSourceSelect: (source: OrderSource) => void;
  onStatusSelect: (status: string) => void;
  metrics: OrderMetrics;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isBranchRestricted: boolean;
  userBranchId: string | null;
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  branches: BranchOption[];
}

export function OrdersFilterToolbar({
  datePreset,
  onPresetChange,
  startDateStr,
  endDateStr,
  onCustomDateChange,
  ordersCount,
  ordersTotalMinor,
  formatMoney,
  currencySymbol,
  selectedStatus,
  selectedSource,
  onSourceSelect,
  onStatusSelect,
  metrics,
  searchQuery,
  onSearchChange,
  isBranchRestricted,
  userBranchId,
  selectedBranchId,
  onBranchChange,
  branches,
}: OrdersFilterToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Date Filter Bar */}
      <div className="admin-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold admin-muted flex items-center gap-1.5 ml-1">
              <Calendar className="h-4 w-4 text-[var(--admin-muted)]" />
              <span>الفترة:</span>
            </span>
            <button
              type="button"
              onClick={() => onPresetChange('today')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                datePreset === 'today'
                  ? 'admin-primary-action shadow-xs'
                  : 'bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)]'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => onPresetChange('week')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                datePreset === 'week'
                  ? 'admin-primary-action shadow-xs'
                  : 'bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)]'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => onPresetChange('month')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                datePreset === 'month'
                  ? 'admin-primary-action shadow-xs'
                  : 'bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)]'
              }`}
            >
              هذا الشهر
            </button>
          </div>

          {/* Date inputs (من / إلى) & Active Filter Summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="orders-start-date" className="text-xs admin-muted font-medium">
                من:
              </label>
              <input
                id="orders-start-date"
                type="date"
                value={startDateStr}
                onChange={(e) => onCustomDateChange(e.target.value, endDateStr)}
                className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs text-[var(--admin-foreground)] bg-[var(--admin-surface)] focus:border-[var(--admin-primary)] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="orders-end-date" className="text-xs admin-muted font-medium">
                إلى:
              </label>
              <input
                id="orders-end-date"
                type="date"
                value={endDateStr}
                onChange={(e) => onCustomDateChange(startDateStr, e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs text-[var(--admin-foreground)] bg-[var(--admin-surface)] focus:border-[var(--admin-primary)] focus:outline-hidden"
              />
            </div>

            {/* Volume summary badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--admin-background)] border border-[var(--admin-border)] text-xs">
              <span className="admin-muted">الطلبات:</span>
              <span className="font-bold text-[var(--admin-foreground)]">{ordersCount}</span>
              <span className="text-[var(--admin-muted)]">|</span>
              <span className="admin-muted">القيمة:</span>
              <span className="font-bold text-[var(--admin-foreground)] font-mono">
                {formatMoney(ordersTotalMinor)} {currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs" aria-label="قناة الطلبات">
        <span className="shrink-0 px-1 font-semibold admin-muted">القناة:</span>
        {[
          { id: OrderSource.ONLINE, label: 'طلبات الموقع' },
          { id: OrderSource.PHONE, label: 'طلبات الهاتف' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selectedSource === tab.id}
            onClick={() => onSourceSelect(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition ${selectedSource === tab.id ? 'admin-primary-action' : 'admin-muted hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--admin-border)] text-xs">
        {[
          { id: 'ALL', label: 'جميع الطلبات' },
          { id: OrderStatus.PENDING, label: 'جديدة قيد المراجعة', badge: metrics.pendingCount },
          { id: OrderStatus.CONFIRMED, label: 'مؤكدة' },
          { id: OrderStatus.PREPARING, label: 'جاري التجهيز' },
          { id: OrderStatus.READY_FOR_PICKUP, label: 'جاهزة للتوصيل' },
          { id: OrderStatus.OUT_FOR_DELIVERY, label: 'مع المندوب' },
          { id: OrderStatus.DELIVERED, label: 'تم التسليم' },
          { id: OrderStatus.CANCELLED, label: 'ملغاة / مرفوضة' },
        ].map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusSelect(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 font-semibold rounded-lg transition ${
                isActive
                  ? 'admin-primary-action'
                  : 'admin-muted hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)]'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[var(--admin-surface)] text-[var(--admin-foreground)]' : 'bg-[var(--admin-info-soft)] text-[var(--admin-info)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Branch Select row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="البحث برقم الطلب، هاتف العميل، أو الاسم..."
            className="w-full text-xs pr-9 pl-3 py-2 rounded-lg border border-[var(--admin-border)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)] bg-[var(--admin-surface)]"
          />
        </div>

        {/* Branch Filter */}
        {isBranchRestricted ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)] text-xs text-[var(--admin-foreground)] w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-[var(--admin-muted)] shrink-0" />
            <span className="admin-muted">نطاق فرعك:</span>
            <span className="font-semibold text-[var(--admin-foreground)]">
              {branches.find((b) => b.id === userBranchId)?.nameAr ?? 'الفرع المحدد'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-[var(--admin-muted)] shrink-0 hidden sm:block" />
            <select
              value={selectedBranchId}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full sm:w-48 text-xs border border-[var(--admin-border)] rounded-lg px-2.5 py-2 bg-[var(--admin-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
            >
              <option value="ALL">جميع الفروع</option>
              <option value="UNASSIGNED">طلبات غير مسندة لفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  فرع {b.nameAr}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

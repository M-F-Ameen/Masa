'use client';

import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { BranchOption, CashierOption, DatePreset, InvoiceFilterValues } from '../invoices-client';

interface InvoiceFilterToolbarProps {
  filters: InvoiceFilterValues;
  searchQuery: string;
  branches: BranchOption[];
  cashiers: CashierOption[];
  isBranchRestricted: boolean;
  onSearchChange: (query: string) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onUpdateFilter: (partial: Partial<InvoiceFilterValues>) => void;
}

export function InvoiceFilterToolbar({
  filters,
  searchQuery,
  branches,
  cashiers,
  isBranchRestricted,
  onSearchChange,
  onDatePresetChange,
  onUpdateFilter,
}: InvoiceFilterToolbarProps) {
  return (
    <div className="admin-card p-4 space-y-3.5">
      {/* Tier 1: Search + Quick Date Range Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-3 admin-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث برقم الفاتورة، اسم الزبون، أو الطاولة..."
            className="w-full pr-10 pl-8 py-2 text-xs border border-[var(--admin-border)] rounded-xl focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium placeholder:admin-muted bg-[var(--admin-background)]/50 focus:bg-[var(--admin-surface)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute left-2.5 top-2.5 admin-muted hover:text-[var(--admin-foreground)] cursor-pointer"
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Date Range - Desktop View (Hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'TODAY', label: 'اليوم' },
            { id: 'YESTERDAY', label: 'أمس' },
            { id: 'WEEK', label: 'آخر 7 أيام' },
            { id: 'MONTH', label: 'هذا الشهر' },
            { id: 'CUSTOM', label: 'مخصص' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onDatePresetChange(preset.id as DatePreset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filters.datePreset === preset.id
                  ? 'admin-primary-action shadow-2xs'
                  : 'admin-control hover:bg-[var(--admin-background)]/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Date Range - Mobile View (Grid 3x2: Full width, zero clipping, touch-optimized) */}
      <div className="grid sm:hidden grid-cols-3 gap-1 bg-[var(--admin-background)]/80 p-1 rounded-xl text-xs w-full border border-[var(--admin-border)]">
        {[
          { id: 'ALL', label: 'الكل' },
          { id: 'TODAY', label: 'اليوم' },
          { id: 'YESTERDAY', label: 'أمس' },
          { id: 'WEEK', label: 'آخر 7 أيام' },
          { id: 'MONTH', label: 'هذا الشهر' },
          { id: 'CUSTOM', label: 'مخصص' },
        ].map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onDatePresetChange(preset.id as DatePreset)}
            className={`w-full py-2 px-1 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
              filters.datePreset === preset.id
                ? 'admin-primary-action shadow-2xs'
                : 'admin-control hover:bg-[var(--admin-background)]/60'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Pickers (Shown only if 'CUSTOM' selected) */}
      {filters.datePreset === 'CUSTOM' && (
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs animate-in fade-in duration-150 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-zinc-700">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>تحديد الفترة الزمنية المخصصة:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-zinc-200 rounded-lg">
              <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">من:</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onUpdateFilter({ dateFrom: e.target.value })}
                className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-hidden"
                title="من تاريخ"
              />
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-zinc-200 rounded-lg">
              <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">إلى:</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onUpdateFilter({ dateTo: e.target.value })}
                className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-hidden"
                title="إلى تاريخ"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Channels, Order Type & Secondary Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-zinc-100">
        {/* Quick Filter Pill Groups */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-200/70">
            <span className="text-[10px] text-zinc-400 font-bold px-1">السداد:</span>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PAID', label: 'مدفوعة' },
              { id: 'PENDING', label: 'شيك مفتوح' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onUpdateFilter({ paymentStatus: tab.id })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filters.paymentStatus === tab.id
                    ? tab.id === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : tab.id === 'PENDING'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Order Type Pills */}
          <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-200/70">
            <span className="text-[10px] text-zinc-400 font-bold px-1">النوع:</span>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'DINE_IN', label: 'صالة' },
              { id: 'TAKEAWAY', label: 'سفري' },
              { id: 'DELIVERY', label: 'توصيل' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onUpdateFilter({ type: tab.id })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filters.type === tab.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Channel Pills */}
          <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-200/70">
            <span className="text-[10px] text-zinc-400 font-bold px-1">القناة:</span>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'POS', label: 'كاشير' },
              { id: 'ONLINE', label: 'أونلاين' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onUpdateFilter({ source: tab.id })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filters.source === tab.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Dropdowns - Responsive Grid on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-2 w-full lg:w-auto">
          {/* Branch Select */}
          <select
            value={filters.branchId}
            disabled={isBranchRestricted}
            onChange={(e) => onUpdateFilter({ branchId: e.target.value })}
            className="w-full lg:w-auto px-2.5 py-1.5 text-xs border border-zinc-200 rounded-xl bg-white font-medium text-zinc-800 focus:ring-1 focus:ring-zinc-800 outline-hidden cursor-pointer"
          >
            <option value="ALL">جميع الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr}
              </option>
            ))}
          </select>

          {/* Cashier Select */}
          <select
            value={filters.cashierId}
            onChange={(e) => onUpdateFilter({ cashierId: e.target.value })}
            className="w-full lg:w-auto px-2.5 py-1.5 text-xs border border-zinc-200 rounded-xl bg-white font-medium text-zinc-800 focus:ring-1 focus:ring-zinc-800 outline-hidden cursor-pointer"
          >
            <option value="ALL">جميع الكاشير</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>

          {/* Payment Method Select */}
          <select
            value={filters.paymentMethod}
            onChange={(e) => onUpdateFilter({ paymentMethod: e.target.value })}
            className="w-full lg:w-auto px-2.5 py-1.5 text-xs border border-zinc-200 rounded-xl bg-white font-medium text-zinc-800 focus:ring-1 focus:ring-zinc-800 outline-hidden cursor-pointer"
          >
            <option value="ALL">طرق الدفع</option>
            <option value="CASH">نقدي</option>
            <option value="CARD">بطاقة</option>
            <option value="MIXED">مختلط</option>
          </select>
        </div>
      </div>
    </div>
  );
}

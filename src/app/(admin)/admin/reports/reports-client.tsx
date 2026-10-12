'use client';

import React, { useState, useTransition } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Receipt,
  UtensilsCrossed,
  Building2,
  Package,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  PieChart,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { SalesAnalyticsResult } from '../../../../application/reports/use-cases/get-sales-analytics.use-case';
import { MenuEngineeringResult } from '../../../../application/reports/use-cases/get-menu-engineering.use-case';
import { BranchPerformanceResult } from '../../../../application/reports/use-cases/get-branch-performance.use-case';
import { InventoryAnalyticsResult } from '../../../../application/reports/use-cases/get-inventory-analytics.use-case';
import {
  getSalesAnalyticsAction,
  getMenuEngineeringAction,
  getBranchPerformanceAction,
  getInventoryAnalyticsAction,
} from '../../../actions/report.actions';

interface BranchOption {
  id: string;
  code: string;
  nameAr: string;
}

interface ReportsClientProps {
  currencySymbol: string;
  currency: string;
  branches: BranchOption[];
  initialStartDateIso: string;
  initialEndDateIso: string;
  initialSales: SalesAnalyticsResult;
  initialMenu: MenuEngineeringResult;
  initialBranches: BranchPerformanceResult;
  initialInventory: InventoryAnalyticsResult;
  isBranchScoped?: boolean;
  userBranchId?: string;
}

type TabType = 'sales' | 'menu' | 'branches' | 'inventory';

export function ReportsClient({
  currencySymbol,
  currency = 'EGP',
  branches,
  initialStartDateIso,
  initialEndDateIso,
  initialSales,
  initialMenu,
  initialBranches,
  initialInventory,
  isBranchScoped = false,
  userBranchId,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isBranchScoped && userBranchId ? userBranchId : ''
  );
  const [startDateStr, setStartDateStr] = useState<string>(initialStartDateIso.slice(0, 10));
  const [endDateStr, setEndDateStr] = useState<string>(initialEndDateIso.slice(0, 10));

  const [sales, setSales] = useState<SalesAnalyticsResult>(initialSales);
  const [menu, setMenu] = useState<MenuEngineeringResult>(initialMenu);
  const [branchPerf, setBranchPerf] = useState<BranchPerformanceResult>(initialBranches);
  const [inventory, setInventory] = useState<InventoryAnalyticsResult>(initialInventory);

  const [isPending, startTransition] = useTransition();

  const formatMoney = (minor: number) => {
    return `${(minor / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencySymbol}`;
  };

  const handleApplyFilter = (start?: string, end?: string, branch?: string) => {
    const sDate = start ?? startDateStr;
    const eDate = end ?? endDateStr;
    const bId = isBranchScoped && userBranchId ? userBranchId : (branch !== undefined ? branch : selectedBranchId);

    const startIso = new Date(`${sDate}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${eDate}T23:59:59.999Z`).toISOString();

    startTransition(async () => {
      const [salesRes, menuRes, branchRes, invRes] = await Promise.all([
        getSalesAnalyticsAction({
          branchId: bId || undefined,
          startDateIso: startIso,
          endDateIso: endIso,
        }),
        getMenuEngineeringAction({
          branchId: bId || undefined,
          startDateIso: startIso,
          endDateIso: endIso,
        }),
        isBranchScoped
          ? Promise.resolve({ success: true as const, data: { currency: currency || 'EGP', branches: [] } })
          : getBranchPerformanceAction({
              startDateIso: startIso,
              endDateIso: endIso,
            }),
        getInventoryAnalyticsAction({
          branchId: bId || undefined,
          startDateIso: startIso,
          endDateIso: endIso,
        }),
      ]);

      if (salesRes.success) setSales(salesRes.data);
      if (menuRes.success) setMenu(menuRes.data);
      if (branchRes.success) setBranchPerf(branchRes.data);
      if (invRes.success) setInventory(invRes.data);
    });
  };

  const setPreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth') => {
    const now = new Date();
    let s = new Date();
    const e = new Date();

    if (preset === 'today') {
      // today
    } else if (preset === 'yesterday') {
      s.setDate(now.getDate() - 1);
      e.setDate(now.getDate() - 1);
    } else if (preset === 'last7') {
      s.setDate(now.getDate() - 6);
    } else if (preset === 'thisMonth') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const sStr = s.toISOString().slice(0, 10);
    const eStr = e.toISOString().slice(0, 10);

    setStartDateStr(sStr);
    setEndDateStr(eStr);
    handleApplyFilter(sStr, eStr);
  };

  const totalChannelsCount =
    sales.channels.DINE_IN.count +
    sales.channels.TAKEAWAY.count +
    sales.channels.DELIVERY.count;

  const maxHourlyCount = Math.max(...sales.hourly.map((h) => h.count), 1);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-foreground)] sm:text-2xl">
            التقارير والتحليلات الإدارية
          </h1>
          <p className="mt-1 text-xs admin-muted sm:text-sm">
            متابعة فورية ومباشرة للأداء المالي، ربحية الأصناف، أداء الفروع، وكفاءة المخزون
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => handleApplyFilter()}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border admin-control px-3.5 py-2 text-xs font-medium shadow-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 admin-muted ${isPending ? 'animate-spin' : ''}`} />
          <span>{isPending ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium admin-muted flex items-center gap-1 ml-1">
              <Calendar className="h-3.5 w-3.5 admin-muted" />
              <span>الفترة:</span>
            </span>
            <button
              onClick={() => setPreset('today')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)] transition"
            >
              اليوم
            </button>
            <button
              onClick={() => setPreset('yesterday')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)] transition"
            >
              أمس
            </button>
            <button
              onClick={() => setPreset('last7')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium admin-primary-action transition"
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setPreset('thisMonth')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--admin-background)] text-[var(--admin-foreground)] hover:bg-[var(--admin-border)] transition"
            >
              هذا الشهر
            </button>
          </div>

          {/* Date inputs & Branch selector */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="report-start-date" className="text-xs admin-muted">من:</label>
              <input
                id="report-start-date"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs text-[var(--admin-foreground)] focus:border-[var(--admin-primary)] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="report-end-date" className="text-xs admin-muted">إلى:</label>
              <input
                id="report-end-date"
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs text-[var(--admin-foreground)] focus:border-[var(--admin-primary)] focus:outline-hidden"
              />
            </div>

            {isBranchScoped ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)] text-xs text-[var(--admin-foreground)]">
                <Building2 className="w-3.5 h-3.5 admin-muted" />
                <span className="admin-muted">الفرع:</span>
                <span className="font-semibold text-[var(--admin-foreground)]">
                  {branches.find((b) => b.id === userBranchId)?.nameAr ?? 'الفرع المحدد'}
                </span>
              </div>
            ) : (
              branches.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="report-branch-select" className="text-xs admin-muted">الفرع:</label>
                  <select
                    id="report-branch-select"
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      handleApplyFilter(startDateStr, endDateStr, e.target.value);
                    }}
                    className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs text-[var(--admin-foreground)] focus:border-[var(--admin-primary)] focus:outline-hidden"
                  >
                    <option value="">جميع الفروع المصرح بها</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            <button
              onClick={() => handleApplyFilter()}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg admin-primary-action px-3 py-1.5 text-xs font-medium transition"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>تطبيق</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Sales */}
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">إجمالي المبيعات</span>
            <div className="rounded-lg bg-[var(--admin-success-soft)] p-2 text-[var(--admin-accent-hover)]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--admin-foreground)] sm:text-xl">
            {formatMoney(sales.totalRevenueMinor)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] admin-muted">
            <span>شامل الضرائب والرسوم</span>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">هامش الربح الإجمالي</span>
            <div className="rounded-lg bg-[var(--admin-info-soft)] p-2 text-[var(--admin-info)]">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--admin-foreground)] sm:text-xl">
            {menu.overallMarginPercent}%
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--admin-accent-hover)] font-medium">
            <span>ربح تقريبي: {formatMoney(menu.totalRevenueMinor - menu.totalCostMinor)}</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">الطلبات المنجزة</span>
            <div className="rounded-lg bg-[var(--admin-info-soft)] p-2 text-[var(--admin-info)]">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--admin-foreground)] sm:text-xl">
            {sales.totalOrders.toLocaleString('ar-EG')} طلب
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] admin-muted">
            <span>صالة + سفري + توصيل</span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">متوسط قيمة الطلب</span>
            <div className="rounded-lg bg-[var(--admin-warning-soft)] p-2 text-[var(--admin-warning)]">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--admin-foreground)] sm:text-xl">
            {formatMoney(sales.averageOrderValueMinor)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] admin-muted">
            <span>لكل فاتورة مكتملة</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[var(--admin-border)]">
        <nav className="flex gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition sm:text-sm ${
              activeTab === 'sales'
                ? 'border-[var(--admin-primary)] text-[var(--admin-foreground)]'
                : 'border-transparent admin-muted hover:text-[var(--admin-foreground)]'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>المبيعات والقنوات</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition sm:text-sm ${
              activeTab === 'menu'
                ? 'border-[var(--admin-primary)] text-[var(--admin-foreground)]'
                : 'border-transparent admin-muted hover:text-[var(--admin-foreground)]'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>هندسة المنيو والربحية</span>
          </button>

          {!isBranchScoped && (
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition sm:text-sm ${
                activeTab === 'branches'
                  ? 'border-[var(--admin-primary)] text-[var(--admin-foreground)]'
                  : 'border-transparent admin-muted hover:text-[var(--admin-foreground)]'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>مقارنة أداء الفروع</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition sm:text-sm ${
              activeTab === 'inventory'
                ? 'border-[var(--admin-primary)] text-[var(--admin-foreground)]'
                : 'border-transparent admin-muted hover:text-[var(--admin-foreground)]'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>المخزون والهدر</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Sales & Channels */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Channel Breakdown */}
            <div className="admin-card p-5 lg:col-span-1">
              <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center gap-2">
                <PieChart className="h-4 w-4 admin-muted" />
                <span>توزيع المبيعات حسب القناة</span>
              </h2>

              <div className="mt-4 space-y-4">
                {/* Dine-In */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-[var(--admin-foreground)] mb-1">
                    <span>صالة (POS Dine-In)</span>
                    <span>
                      {formatMoney(sales.channels.DINE_IN.totalMinor)} (
                      {sales.channels.DINE_IN.count} طلب)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--admin-background)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--admin-info)] rounded-full"
                      style={{
                        width: `${
                          totalChannelsCount > 0
                            ? (sales.channels.DINE_IN.count / totalChannelsCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Takeaway */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-[var(--admin-foreground)] mb-1">
                    <span>سفري (POS Takeaway)</span>
                    <span>
                      {formatMoney(sales.channels.TAKEAWAY.totalMinor)} (
                      {sales.channels.TAKEAWAY.count} طلب)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--admin-background)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--admin-accent)] rounded-full"
                      style={{
                        width: `${
                          totalChannelsCount > 0
                            ? (sales.channels.TAKEAWAY.count / totalChannelsCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-[var(--admin-foreground)] mb-1">
                    <span>توصيل أونلاين (Online Delivery)</span>
                    <span>
                      {formatMoney(sales.channels.DELIVERY.totalMinor)} (
                      {sales.channels.DELIVERY.count} طلب)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--admin-background)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--admin-warning)] rounded-full"
                      style={{
                        width: `${
                          totalChannelsCount > 0
                            ? (sales.channels.DELIVERY.count / totalChannelsCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="mt-6 border-t border-[var(--admin-border)] pt-4 space-y-2 text-xs">
                <div className="flex justify-between admin-muted">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono text-[var(--admin-foreground)]">{formatMoney(sales.subtotalMinor)}</span>
                </div>
                <div className="flex justify-between admin-muted">
                  <span>الضرائب المحصلة:</span>
                  <span className="font-mono text-[var(--admin-foreground)]">{formatMoney(sales.taxMinor)}</span>
                </div>
                <div className="flex justify-between admin-muted">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono text-[var(--admin-foreground)]">{formatMoney(sales.deliveryFeeMinor)}</span>
                </div>
                <div className="flex justify-between admin-muted">
                  <span>الخصومات الممنوحة:</span>
                  <span className="font-mono text-[var(--admin-danger)]">-{formatMoney(sales.discountMinor)}</span>
                </div>
                <div className="flex justify-between font-bold text-[var(--admin-foreground)] border-t border-[var(--admin-border)] pt-2 text-sm">
                  <span>صافي الإيراد الإجمالي:</span>
                  <span className="font-mono text-[var(--admin-accent-hover)]">{formatMoney(sales.totalRevenueMinor)}</span>
                </div>
              </div>
            </div>

            {/* Peak Hours Distribution */}
            <div className="admin-card p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 admin-muted" />
                  <span>توزيع المبيعات وأوقات الذروة (24 ساعة)</span>
                </span>
                <span className="text-xs admin-muted font-normal">عدد الطلبات بالساعة</span>
              </h2>

              <div className="mt-6 flex h-48 items-end gap-1 overflow-x-auto pb-2 pt-6">
                {sales.hourly.map((item) => {
                  const heightPercent = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0;
                  return (
                    <div
                      key={item.hour}
                      className="group relative flex flex-1 min-w-[20px] flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 hidden whitespace-nowrap rounded-md bg-[var(--admin-foreground)] px-2 py-1 text-[10px] text-[var(--admin-surface)] shadow-md group-hover:block z-10">
                        {item.label}: {item.count} طلب ({formatMoney(item.totalMinor)})
                      </div>
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          item.count > 0 ? 'bg-[var(--admin-primary)] group-hover:bg-[var(--admin-primary-hover)]' : 'bg-[var(--admin-background)]'
                        }`}
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      />
                      {/* Hour label */}
                      <span className="mt-2 text-[9px] admin-muted font-mono">
                        {item.hour % 3 === 0 ? item.hour : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Payment Methods */}
              <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
                <h3 className="text-xs font-semibold text-[var(--admin-foreground)] mb-3">طرق الدفع المستخدمة:</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {sales.payments.map((p) => (
                    <div key={p.method} className="rounded-lg bg-[var(--admin-background)] p-2.5 border border-[var(--admin-border)]">
                      <span className="text-[11px] admin-muted block">
                        {p.method === 'CASH'
                          ? 'نقدي (Cash)'
                          : p.method === 'CARD'
                          ? 'بطاقة (Card)'
                          : p.method === 'MIXED'
                          ? 'دفع مختلط'
                          : p.method}
                      </span>
                      <span className="text-xs font-bold text-[var(--admin-foreground)] block mt-0.5">
                        {formatMoney(p.totalMinor)}
                      </span>
                      <span className="text-[10px] admin-muted">{p.count} عملية</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Menu Engineering */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="admin-card p-5">
            <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 admin-muted" />
                <span>أداء الأصناف وهامش الربحية (Menu Engineering)</span>
              </span>
              <span className="text-xs admin-muted font-normal">
                مرتبة حسب أعلى إيراد ومطابقة لوصفات الـ BOM
              </span>
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] admin-muted">
                    <th className="pb-3 font-medium">الصنف</th>
                    <th className="pb-3 font-medium">التصنيف</th>
                    <th className="pb-3 font-medium text-center">الكمية المباعة</th>
                    <th className="pb-3 font-medium text-left">إجمالي الإيراد</th>
                    <th className="pb-3 font-medium text-left">التكلفة التقديرية</th>
                    <th className="pb-3 font-medium text-left">الربح الإجمالي</th>
                    <th className="pb-3 font-medium text-center">نسبة الهامش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {menu.topSellingItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center admin-muted">
                        لا توجد مبيعات مسجلة للأصناف خلال الفترة المحددة
                      </td>
                    </tr>
                  ) : (
                    menu.topSellingItems.map((item) => (
                      <tr key={item.productId} className="admin-row-hover">
                        <td className="py-3 font-medium text-[var(--admin-foreground)]">
                          {item.nameAr}
                          <span className="block text-[10px] admin-muted font-mono">
                            {item.nameEn}
                          </span>
                        </td>
                        <td className="py-3 admin-muted">{item.categoryNameAr}</td>
                        <td className="py-3 text-center font-mono font-semibold text-[var(--admin-foreground)]">
                          {item.quantitySold}
                        </td>
                        <td className="py-3 text-left font-mono font-bold text-[var(--admin-foreground)]">
                          {formatMoney(item.totalRevenueMinor)}
                        </td>
                        <td className="py-3 text-left font-mono admin-muted">
                          {formatMoney(item.estimatedCostMinor)}
                        </td>
                        <td className="py-3 text-left font-mono font-semibold text-[var(--admin-accent-hover)]">
                          {formatMoney(item.grossProfitMinor)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium font-mono ${
                              item.marginPercent >= 60
                                ? 'admin-badge admin-badge-success'
                                : item.marginPercent >= 35
                                ? 'admin-badge admin-badge-info'
                                : 'admin-badge admin-badge-warning'
                            }`}
                          >
                            {item.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slow moving items */}
          {menu.slowMovingItems.length > 0 && (
            <div className="admin-card p-5">
              <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--admin-warning)]" />
                <span>أصناف راكدة بدون مبيعات في الفترة ({menu.slowMovingItems.length} صنف)</span>
              </h2>
              <p className="mt-1 text-xs admin-muted">
                أصناف نشطة في المنيو ولكن لم يُسجل لها أي طلب بيع، ينصح بمراجعة أسعارها أو حملاتها الترويجية.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {menu.slowMovingItems.map((item) => (
                  <span
                    key={item.productId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)] px-2.5 py-1 text-xs text-[var(--admin-foreground)]"
                  >
                    <span>{item.nameAr}</span>
                    <span className="text-[10px] admin-muted">({item.categoryNameAr})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Branch Performance */}
      {activeTab === 'branches' && (
        <div className="admin-card p-5">
          <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 admin-muted" />
              <span>مقارنة مؤشرات أداء الفروع والورديات</span>
            </span>
            <span className="text-xs admin-muted font-normal">
              حجم المبيعات، متوسط الفاتورة، والفروقات النقدية
            </span>
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--admin-border)] admin-muted">
                  <th className="pb-3 font-medium">الفرع</th>
                  <th className="pb-3 font-medium text-center">الطلبات</th>
                  <th className="pb-3 font-medium text-left">إجمالي المبيعات</th>
                  <th className="pb-3 font-medium text-left">متوسط الفاتورة</th>
                  <th className="pb-3 font-medium text-center">الورديات</th>
                  <th className="pb-3 font-medium text-left">فروقات الصندوق</th>
                  <th className="pb-3 font-medium text-left">مصروفات الفرع</th>
                  <th className="pb-3 font-medium text-left">صافي المساهمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {branchPerf.branches.map((b) => (
                  <tr key={b.branchId} className="admin-row-hover">
                    <td className="py-3">
                      <span className="font-semibold text-[var(--admin-foreground)] block">{b.nameAr}</span>
                      <span className="text-[10px] admin-muted font-mono">{b.code}</span>
                    </td>
                    <td className="py-3 text-center font-mono font-medium text-[var(--admin-foreground)]">
                      {b.ordersCount}
                    </td>
                    <td className="py-3 text-left font-mono font-bold text-[var(--admin-foreground)]">
                      {formatMoney(b.totalRevenueMinor)}
                    </td>
                    <td className="py-3 text-left font-mono admin-muted">
                      {formatMoney(b.averageOrderValueMinor)}
                    </td>
                    <td className="py-3 text-center font-mono admin-muted">
                      {b.shiftsCount}
                    </td>
                    <td className="py-3 text-left font-mono">
                      <span
                        className={
                          b.cashVarianceMinor < 0
                            ? 'text-[var(--admin-danger)]'
                            : b.cashVarianceMinor > 0
                            ? 'text-[var(--admin-accent-hover)]'
                            : 'admin-muted'
                        }
                      >
                        {formatMoney(b.cashVarianceMinor)}
                      </span>
                    </td>
                    <td className="py-3 text-left font-mono admin-muted">
                      {formatMoney(b.expensesTotalMinor)}
                    </td>
                    <td className="py-3 text-left font-mono font-bold text-[var(--admin-accent-hover)]">
                      {formatMoney(b.netRevenueMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory & Waste */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Operational Consumption Card */}
            <div className="admin-card p-5">
              <span className="text-xs font-medium admin-muted">تكلفة صرف تشغيل المطبخ</span>
              <p className="mt-2 text-xl font-bold text-[var(--admin-foreground)]">
                {formatMoney(inventory.totalOperationalConsumptionCostMinor)}
              </p>
              <p className="mt-1 text-xs admin-muted">
                المكونات المصروفة للتحضير والتشغيل الداخلي
              </p>
            </div>

            {/* Waste Card */}
            <div className="admin-card p-5">
              <span className="text-xs font-medium admin-muted">تكلفة الهدر والتوالف (Waste)</span>
              <p className="mt-2 text-xl font-bold text-[var(--admin-danger)]">
                {formatMoney(inventory.totalWasteCostMinor)}
              </p>
              <p className="mt-1 text-xs admin-muted">
                المواد التالفة أو المنتهية الصلاحية الموثقة في السجل
              </p>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="admin-card p-5">
            <h2 className="text-sm font-semibold text-[var(--admin-foreground)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--admin-warning)]" />
                <span>تنبيهات نواقص المخزون (Low Stock Items)</span>
              </span>
              <span className="text-xs admin-muted font-normal">
                المواد التي بلغت أو تجاوزت حد إعادة الطلب
              </span>
            </h2>

            <div className="mt-4">
              {inventory.lowStockAlerts.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-center text-xs text-[var(--admin-accent-hover)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>لا توجد نواقص في المخزون حالياً، جميع المواد عند المستويات الآمنة</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inventory.lowStockAlerts.map((alert) => (
                    <div
                      key={`${alert.branchNameAr}-${alert.itemId}`}
                      className="rounded-lg border admin-status-warning p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--admin-foreground)]">
                          {alert.itemNameAr}
                        </span>
                        <span className="text-[10px] admin-muted">{alert.branchNameAr}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="admin-muted">الرصيد الحالي:</span>
                        <span className="font-bold font-mono text-[var(--admin-danger)]">
                          {alert.currentStock} {alert.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] admin-muted mt-0.5">
                        <span>حد الأمان:</span>
                        <span className="font-mono">
                          {alert.minThreshold} {alert.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

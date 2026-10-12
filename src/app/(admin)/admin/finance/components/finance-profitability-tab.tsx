'use client';

import React from 'react';
import { Receipt, Calendar } from 'lucide-react';
import { FinancePageData } from '../finance.types';

interface FinanceProfitabilityTabProps {
  report: FinancePageData['report'];
  formatMoney: (minor: number) => string;
}

export function FinanceProfitabilityTab({
  report,
  formatMoney,
}: FinanceProfitabilityTabProps) {
  return (
    <div className="space-y-6">
      {/* Executive P&L Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="admin-card p-4">
          <span className="text-xs font-medium admin-muted">صافي المبيعات (Revenue)</span>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(report.netSalesMinor)}
          </p>
          <p className="mt-1 text-[11px] admin-muted">
            {report.totalOrdersCount} طلب مكتمل ومسلّم
          </p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">تكلفة البضاعة المباعة (COGS)</span>
            <span className="text-[11px] font-semibold text-[var(--admin-danger)]">
              {report.cogsPercent}%
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-danger)]">
            {formatMoney(report.cogsMinor)}
          </p>
          <p className="mt-1 text-[11px] admin-muted">من استهلاك وصفات الـ BOM والمخزون</p>
        </div>

        <div className="admin-card p-4">
          <span className="text-xs font-medium admin-muted">المصروفات التشغيلية الميدانية</span>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-warning)]">
            {formatMoney(report.operatingExpensesMinor)}
          </p>
          <p className="mt-1 text-[11px] admin-muted">نثريات وصيانة ومرافق</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">مجمل الربح التشغيلي</span>
            <span className="text-[11px] font-semibold admin-status-success-text">
              {report.grossMarginPercent}%
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold admin-status-success-text">
            {formatMoney(report.grossProfitMinor)}
          </p>
          <p className="mt-1 text-[11px] admin-muted">(المبيعات - تكلفة البضاعة)</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">صافي هامش التشغيل</span>
            <span className="text-[11px] font-semibold text-[var(--admin-foreground)]">
              {report.operatingMarginPercent}%
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(report.operatingProfitMinor)}
          </p>
          <p className="mt-1 text-[11px] admin-muted">بعد خصم المصروفات</p>
        </div>
      </div>

      {/* Breakdown Section: Categories vs Daily */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Expenses by Category */}
        <div className="admin-card p-5">
          <h2 className="text-base font-semibold text-[var(--admin-foreground)] mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 admin-muted" />
            <span>توزيع المصروفات حسب التبويب</span>
          </h2>
          {report.expensesByCategory.length === 0 ? (
            <p className="py-6 text-center text-xs admin-muted">لا توجد مصروفات مسجلة في هذه الفترة</p>
          ) : (
            <div className="space-y-3">
              {report.expensesByCategory.map((c) => (
                <div key={c.categoryNameAr} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-[var(--admin-foreground)]">{c.categoryNameAr}</span>
                    <span className="font-mono admin-muted">
                      {formatMoney(c.totalMinor)} ({c.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--admin-background)]">
                    <div
                      className="h-full rounded-full bg-[var(--admin-primary)] transition-all"
                      style={{ width: `${Math.min(c.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Daily Breakdown */}
        <div className="admin-card p-5">
          <h2 className="text-base font-semibold text-[var(--admin-foreground)] mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 admin-muted" />
            <span>سجل الأداء المالي اليومي</span>
          </h2>
          {report.dailyBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs admin-muted">لا توجد حركات مالية مسجلة لهذه الفترة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-background)] admin-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">التاريخ</th>
                    <th className="px-3 py-2 font-semibold">المبيعات</th>
                    <th className="px-3 py-2 font-semibold">التكلفة (COGS)</th>
                    <th className="px-3 py-2 font-semibold">المصروفات</th>
                    <th className="px-3 py-2 font-semibold">الربح الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {report.dailyBreakdown.map((d) => (
                    <tr key={d.date} className="hover:bg-[var(--admin-background)]">
                      <td className="px-3 py-2 font-mono text-[var(--admin-foreground)]">{d.date}</td>
                      <td className="px-3 py-2 font-mono text-[var(--admin-foreground)] font-medium">
                        {formatMoney(d.salesMinor)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--admin-danger)]">
                        {formatMoney(d.cogsMinor)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--admin-warning)]">
                        {formatMoney(d.expensesMinor)}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold admin-status-success-text">
                        {formatMoney(d.grossProfitMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

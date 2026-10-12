'use client';

import React from 'react';
import { Receipt, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { FinancePageData } from '../finance.types';
import { ExpenseSource } from '../../../../../domain/finance/enums';

interface FinanceExpensesTabProps {
  expenses: FinancePageData['expenses'];
  filteredExpenses: FinancePageData['expenses'];
  expenseSourceFilter: 'ALL' | ExpenseSource;
  onSourceFilterChange: (src: 'ALL' | ExpenseSource) => void;
  formatMoney: (minor: number) => string;
}

export function FinanceExpensesTab({
  expenses,
  filteredExpenses,
  expenseSourceFilter,
  onSourceFilterChange,
  formatMoney,
}: FinanceExpensesTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards for Expenses */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">إجمالي المصروفات</span>
            <Receipt className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(expenses.reduce((acc, e) => acc + e.amountMinor, 0))}
          </p>
          <p className="mt-1 text-[11px] admin-muted">كافة السندات المسجلة لهذا الفرع</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">مصروفات من درج الكاشير</span>
            <ArrowDownLeft className="h-4 w-4 text-[var(--admin-warning)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(
              expenses
                .filter((e) => e.source === ExpenseSource.REGISTER_CASH)
                .reduce((acc, e) => acc + e.amountMinor, 0)
            )}
          </p>
          <p className="mt-1 text-[11px] admin-muted">خُصمت مباشرة من النقد المتوقع بالأدراج</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">مصروفات من الخزينة / العهدة</span>
            <ArrowUpRight className="h-4 w-4 text-[var(--admin-info)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(
              expenses
                .filter((e) => e.source === ExpenseSource.SAFE_PETTY_CASH)
                .reduce((acc, e) => acc + e.amountMinor, 0)
            )}
          </p>
          <p className="mt-1 text-[11px] admin-muted">من الخزينة الميدانية المستقلة</p>
        </div>
      </div>

      {/* Source Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium admin-muted">مصدر الصرف:</span>
          <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 text-xs">
            {(['ALL', ExpenseSource.REGISTER_CASH, ExpenseSource.SAFE_PETTY_CASH] as const).map(
              (src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => onSourceFilterChange(src)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    expenseSourceFilter === src
                      ? 'admin-primary-action'
                      : 'text-[var(--admin-foreground)] hover:bg-[var(--admin-background)]'
                  }`}
                >
                  {src === 'ALL'
                    ? 'الكل'
                    : src === ExpenseSource.REGISTER_CASH
                    ? 'درج الكاشير (وردية)'
                    : 'الخزينة المركزية'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-background)] admin-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold">التصنيف</th>
                <th className="px-4 py-3 font-semibold">البيان والتفاصيل</th>
                <th className="px-4 py-3 font-semibold">مصدر الصرف</th>
                <th className="px-4 py-3 font-semibold">رقم السند/الفاتورة</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
                <th className="px-4 py-3 font-semibold">الموظف القائم بالصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center admin-muted">
                    لا توجد مصروفات مسجلة تطابق التصفية
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="admin-row-hover transition-colors">
                    <td className="px-4 py-3.5 admin-muted">
                      {new Date(exp.createdAt).toLocaleDateString('ar-EG')}
                      <div className="text-[11px] admin-muted">
                        {new Date(exp.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[var(--admin-foreground)]">
                      {exp.categoryNameAr}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--admin-foreground)] max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="px-4 py-3.5">
                      {exp.source === ExpenseSource.REGISTER_CASH ? (
                        <span className="admin-badge admin-badge-warning">
                          درج الكاشير
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-info">
                          الخزينة المركزية
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono admin-muted">
                      {exp.receiptNumber || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--admin-foreground)]">
                      {formatMoney(exp.amountMinor)}
                    </td>
                    <td className="px-4 py-3.5 admin-muted">
                      {exp.spentByName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

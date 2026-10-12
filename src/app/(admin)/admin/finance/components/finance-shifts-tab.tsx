'use client';

import React from 'react';
import { Clock, AlertTriangle, DollarSign, Wallet, Eye, Lock, CheckCircle2 } from 'lucide-react';
import { FinancePageData } from '../finance.types';
import { CashShiftStatus } from '../../../../../domain/finance/enums';

interface FinanceShiftsTabProps {
  shifts: FinancePageData['shifts'];
  filteredShifts: FinancePageData['shifts'];
  openShiftsCount: number;
  pendingAuditCount: number;
  shiftStatusFilter: 'ALL' | CashShiftStatus;
  onStatusFilterChange: (status: 'ALL' | CashShiftStatus) => void;
  formatMoney: (minor: number) => string;
  onOpenDetails: (shiftId: string) => void;
  onOpenBlindClose: (shiftId: string) => void;
  onOpenAudit: (shiftId: string) => void;
}

export function FinanceShiftsTab({
  shifts,
  filteredShifts,
  openShiftsCount,
  pendingAuditCount,
  shiftStatusFilter,
  onStatusFilterChange,
  formatMoney,
  onOpenDetails,
  onOpenBlindClose,
  onOpenAudit,
}: FinanceShiftsTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">الورديات المفتوحة حالياً</span>
            <Clock className="h-4 w-4 admin-status-success-text" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">{openShiftsCount}</p>
          <p className="mt-1 text-[11px] admin-muted">جلسات كاشير نشطة تتلقى مبيعات</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">بانتظار تدقيق الإدارة</span>
            <AlertTriangle className="h-4 w-4 text-[var(--admin-warning)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">{pendingAuditCount}</p>
          <p className="mt-1 text-[11px] admin-muted">ورديات مغلقة تتطلب اعتماد الفروقات</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">إجمالي مبيعات اليوم (المحصلة)</span>
            <DollarSign className="h-4 w-4 admin-muted" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(shifts.reduce((acc, s) => acc + s.totalSalesMinor, 0))}
          </p>
          <p className="mt-1 text-[11px] admin-muted">من كافة ورديات الفرع المحملة</p>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-xs font-medium">صافي الفروقات (عجز / زيادة)</span>
            <Wallet className="h-4 w-4 admin-muted" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--admin-foreground)]">
            {formatMoney(shifts.reduce((acc, s) => acc + (s.varianceMinor ?? 0), 0))}
          </p>
          <p className="mt-1 text-[11px] admin-muted">إجمالي الفارق الدفتري التراكمي</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium admin-muted">تصفية الحالة:</span>
          <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 text-xs">
            {(['ALL', CashShiftStatus.OPEN, CashShiftStatus.CLOSED, CashShiftStatus.AUDITED] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatusFilterChange(st)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    shiftStatusFilter === st
                      ? 'admin-primary-action'
                      : 'admin-muted hover:text-[var(--admin-foreground)]'
                  }`}
                >
                  {st === 'ALL'
                    ? 'الكل'
                    : st === CashShiftStatus.OPEN
                    ? 'مفتوحة'
                    : st === CashShiftStatus.CLOSED
                    ? 'مغلقة'
                    : 'معتمدة'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="overflow-hidden admin-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-background)] admin-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">الكاشير</th>
                <th className="px-4 py-3 font-semibold">وقت الفتح</th>
                <th className="px-4 py-3 font-semibold">رصيد الافتتاح</th>
                <th className="px-4 py-3 font-semibold">مبيعات نقدية</th>
                <th className="px-4 py-3 font-semibold">مبيعات شبكة</th>
                <th className="px-4 py-3 font-semibold">المتوقع دفترياً</th>
                <th className="px-4 py-3 font-semibold">الفعلي المعدود</th>
                <th className="px-4 py-3 font-semibold">الفارق</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center admin-muted">
                    لا توجد ورديات تطابق الفلتر المحدد
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const isShortage = (shift.varianceMinor ?? 0) < 0;
                  const isBalanced = shift.varianceMinor === 0;

                  return (
                    <tr key={shift.id} className="hover:bg-[var(--admin-background)]/75 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[var(--admin-foreground)]">
                        {shift.cashierName}
                      </td>
                      <td className="px-4 py-3.5 admin-muted">
                        {new Date(shift.openedAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <div className="text-[11px] admin-muted">
                          {new Date(shift.openedAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--admin-foreground)]">
                        {formatMoney(shift.openingCashMinor)}
                      </td>
                      <td className="px-4 py-3.5 font-mono admin-status-success-text">
                        {formatMoney(shift.cashSalesMinor)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--admin-info)]">
                        {formatMoney(shift.cardSalesMinor)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--admin-foreground)]">
                        {shift.expectedCashMinor !== null
                          ? formatMoney(shift.expectedCashMinor)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-medium text-[var(--admin-foreground)]">
                        {shift.closingCashMinor !== null
                          ? formatMoney(shift.closingCashMinor)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {shift.varianceMinor === null ? (
                          <span className="admin-muted">—</span>
                        ) : isBalanced ? (
                          <span className="admin-badge admin-badge-success">
                            مطابق
                          </span>
                        ) : isShortage ? (
                          <span className="admin-badge admin-badge-danger">
                            عجز ({formatMoney(Math.abs(shift.varianceMinor))})
                          </span>
                        ) : (
                          <span className="admin-badge admin-badge-info">
                            زيادة (+{formatMoney(shift.varianceMinor)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {shift.status === CashShiftStatus.OPEN && (
                          <span className="admin-badge admin-badge-success">
                            مفتوحة
                          </span>
                        )}
                        {shift.status === CashShiftStatus.CLOSED && (
                          <span className="admin-badge admin-badge-warning">
                            مغلقة
                          </span>
                        )}
                        {shift.status === CashShiftStatus.AUDITED && (
                          <span className="admin-badge admin-badge-neutral">
                            معتمدة
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(shift.id)}
                            className="inline-flex items-center gap-1 rounded-md border admin-control px-2.5 py-1 text-xs font-medium"
                            title="عرض التفاصيل الكاملة"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>تفاصيل</span>
                          </button>

                          {/* Blind Close button if OPEN */}
                          {shift.status === CashShiftStatus.OPEN && (
                            <button
                              type="button"
                              onClick={() => onOpenBlindClose(shift.id)}
                              className="inline-flex items-center gap-1 rounded-md admin-action-warning px-2.5 py-1 text-xs font-medium"
                              title="إغلاق أعمى للوردية"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              <span>إغلاق</span>
                            </button>
                          )}

                          {/* Audit button if CLOSED */}
                          {shift.status === CashShiftStatus.CLOSED && (
                            <button
                              type="button"
                              onClick={() => onOpenAudit(shift.id)}
                              className="inline-flex items-center gap-1 rounded-md admin-primary-action px-2.5 py-1 text-xs font-medium"
                              title="اعتماد وتدقيق الفروقات"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--admin-success-soft)]" />
                              <span>اعتماد</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

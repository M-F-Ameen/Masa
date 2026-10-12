'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  X,
  Bike,
  Car,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Banknote,
  Users,
  Printer,
  ChevronLeft,
} from 'lucide-react';
import { VehicleType, DriverStatus } from '../../../../../domain/delivery/enums';
import {
  listBranchDriversAction,
  saveDriverAction,
  getDriverPendingSettlementAction,
  settleDriverCashAction,
} from '../../../../actions/delivery.actions';
import { DriverViewItem } from '../../../../../application/delivery/use-cases/list-branch-drivers.use-case';
import { DriverSettlementPrintData } from './driver-settlement-receipt';

interface PendingSettlementData {
  driver: {
    id: string;
    fullName: string;
    phone: string;
    branchId: string;
    branchNameAr: string;
  };
  summary: {
    totalOrdersCount: number;
    codOrdersCount: number;
    prepaidOrdersCount: number;
    totalCollectedCashMinor: number;
    formattedCash: string;
    currency: string;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    totalMinor: number;
    paymentMethod: string;
    paymentStatus: string;
    driverId: string | null;
    deliveredAt: Date | string | null;
    driverSettlementId: string | null;
  }>;
  activeShift: {
    id: string;
    cashierName: string;
  } | null;
}

interface FleetManagementModalProps {
  branchId: string;
  branchName?: string;
  currencySymbol?: string;
  onClose: () => void;
  onSettlementCompleted: (printData: DriverSettlementPrintData) => void;
}

type TabType = 'ROSTER' | 'SETTLEMENTS';

export function FleetManagementModal({
  branchId,
  branchName = 'الفرع المحدد',
  currencySymbol = 'ج.م',
  onClose,
  onSettlementCompleted,
}: FleetManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ROSTER');
  const [drivers, setDrivers] = useState<DriverViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Driver Form State
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState<VehicleType>(VehicleType.MOTORCYCLE);
  const [newDriverPlate, setNewDriverPlate] = useState('');

  // Settle Review State
  const [reviewingDriverId, setReviewingDriverId] = useState<string | null>(null);
  const [settlementDetails, setSettlementDetails] = useState<PendingSettlementData | null>(null);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const loadDrivers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const res = await listBranchDriversAction(branchId);
    if (res.success) {
      setDrivers(res.data);
    } else {
      setErrorMsg(res.error || 'فشل تحميل طياري الفرع');
    }
    setIsLoading(false);
  }, [branchId]);

  useEffect(() => {
    let isCurrent = true;
    async function init() {
      const res = await listBranchDriversAction(branchId);
      if (!isCurrent) return;
      if (res.success) {
        setDrivers(res.data);
      } else {
        setErrorMsg(res.error || 'فشل تحميل طياري الفرع');
      }
      setIsLoading(false);
    }
    init();
    return () => {
      isCurrent = false;
    };
  }, [branchId]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await saveDriverAction({
        branchId,
        fullName: newDriverName.trim(),
        phone: newDriverPhone.trim(),
        vehicleType: newDriverVehicle,
        licensePlate: newDriverPlate.trim() || undefined,
        status: DriverStatus.AVAILABLE,
        isActive: true,
      });

      if (res.success) {
        setSuccessMsg(`تمت إضافة الكابتن ${newDriverName} بنجاح`);
        setIsAddingDriver(false);
        setNewDriverName('');
        setNewDriverPhone('');
        setNewDriverPlate('');
        await loadDrivers();
      } else {
        setErrorMsg(res.error || 'فشل حفظ بيانات الطيار');
      }
    });
  };

  const handleOpenSettleReview = async (driverId: string) => {
    setReviewingDriverId(driverId);
    setErrorMsg(null);
    setSettlementDetails(null);

    startTransition(async () => {
      const res = await getDriverPendingSettlementAction(driverId);
      if (res.success) {
        setSettlementDetails(res.data);
      } else {
        setErrorMsg(res.error || 'فشل جلب تفاصيل العهدة');
      }
    });
  };

  const handleConfirmSettlement = () => {
    if (!reviewingDriverId) return;

    startTransition(async () => {
      setErrorMsg(null);
      const res = await settleDriverCashAction({
        branchId,
        driverId: reviewingDriverId,
        notes: settlementNotes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`تم إقفال عهدة الكابتن ${res.data.driver.fullName} بنجاح`);
        setReviewingDriverId(null);
        setSettlementDetails(null);
        setSettlementNotes('');
        await loadDrivers();
        onSettlementCompleted(res.data as unknown as DriverSettlementPrintData);
      } else {
        setErrorMsg(res.error || 'فشل تسوية العهدة');
      }
    });
  };

  const getVehicleIcon = (vehicle: VehicleType) => {
    switch (vehicle) {
      case VehicleType.CAR:
        return <Car className="size-4 admin-muted" />;
      case VehicleType.BICYCLE:
        return <Bike className="size-4 admin-muted" />;
      case VehicleType.MOTORCYCLE:
      default:
        return <Bike className="size-4 admin-muted" />;
    }
  };

  const pendingSettlementDrivers = drivers.filter(
    (d) => d.pendingCashMinor > 0 || d.unsettledDeliveredCount > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--admin-foreground)]/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      dir="rtl"
    >
      <div className="admin-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4 bg-[var(--admin-background)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="admin-status-info grid size-9 place-items-center rounded-xl border">
              <Bike className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--admin-foreground)]">
                أسطول التوصيل والطيارين — {branchName}
              </h3>
              <p className="text-[11px] admin-muted">
                إدارة طاقم التوصيل وتوزيع الطلبات وتسوية العهد النقدية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 admin-muted hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-5 py-2.5 bg-[var(--admin-background)] shrink-0 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ROSTER');
              setReviewingDriverId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'ROSTER'
                ? 'admin-primary-action shadow-2xs'
                : 'admin-muted hover:bg-[var(--admin-background)]'
            }`}
          >
            <Users className="size-3.5" />
            <span>طاقم الطيارين ({drivers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SETTLEMENTS');
              setIsAddingDriver(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'SETTLEMENTS'
                ? 'admin-primary-action shadow-2xs'
                : 'admin-muted hover:bg-[var(--admin-background)]'
            }`}
          >
            <Banknote className="size-3.5" />
            <span>تسوية العهد النقدية ({pendingSettlementDrivers.length})</span>
          </button>

          <button
            type="button"
            onClick={loadDrivers}
            disabled={isLoading}
            className="mr-auto grid size-7 place-items-center rounded-lg border admin-control disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Banners */}
        {errorMsg && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-[var(--admin-danger-soft)] p-2.5 text-xs text-[var(--admin-danger)] font-medium shrink-0">
            <AlertCircle className="size-4 shrink-0 text-[var(--admin-danger)]" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-[var(--admin-success-soft)] p-2.5 text-xs text-[var(--admin-accent-hover)] font-medium shrink-0">
            <CheckCircle2 className="size-4 shrink-0 text-[var(--admin-accent-hover)]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto text-xs">
          {/* TAB 1: ROSTER */}
          {activeTab === 'ROSTER' && (
            <div className="space-y-4">
              {/* Header with Quick Add Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--admin-foreground)] text-xs">سجل طياري الفرع</h4>
                  <p className="text-[11px] admin-muted">
                    كافة كباتن التوصيل المسجلين على قوة فرع {branchName}
                  </p>
                </div>

                {!isAddingDriver && (
                  <button
                    type="button"
                    onClick={() => setIsAddingDriver(true)}
                    className="flex items-center gap-1.5 rounded-xl admin-primary-action px-3 py-1.5 font-bold shadow-2xs text-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>إضافة كابتن جديد</span>
                  </button>
                )}
              </div>

              {/* Add Driver Inline Form */}
              {isAddingDriver && (
                <form
                  onSubmit={handleCreateDriver}
                  className="rounded-2xl border admin-status-info p-4 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
                    <span className="font-bold text-[var(--admin-info)]">بيانات الكابتن الجديد</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingDriver(false)}
                      className="admin-muted hover:text-[var(--admin-foreground)] text-[11px]"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--admin-foreground)] font-semibold mb-1">الاسم بالكامل:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد عبد الله"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--admin-foreground)] font-semibold mb-1">رقم الهاتف:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: 01012345678"
                        dir="ltr"
                        value={newDriverPhone}
                        onChange={(e) => setNewDriverPhone(e.target.value)}
                        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--admin-foreground)] font-semibold mb-1">وسيلة الانتقال:</label>
                      <select
                        value={newDriverVehicle}
                        onChange={(e) => setNewDriverVehicle(e.target.value as VehicleType)}
                        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                      >
                        <option value={VehicleType.MOTORCYCLE}>دراجة نارية (موتوسيكل)</option>
                        <option value={VehicleType.CAR}>سيارة</option>
                        <option value={VehicleType.BICYCLE}>دراجة هوائية (عجلة)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[var(--admin-foreground)] font-semibold mb-1">رقم اللوحة (اختياري):</label>
                      <input
                        type="text"
                        placeholder="مثال: أ ب ج 123"
                        value={newDriverPlate}
                        onChange={(e) => setNewDriverPlate(e.target.value)}
                        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl admin-primary-action px-4 py-2 font-bold shadow-xs transition disabled:opacity-50"
                    >
                      {isPending ? 'جارٍ الحفظ...' : 'حفظ وإضافة الطيار'}
                    </button>
                  </div>
                </form>
              )}

              {/* Drivers Cards Grid */}
              {isLoading ? (
                <div className="py-12 text-center admin-muted">
                  <Clock className="size-6 mx-auto mb-1 animate-spin text-[var(--admin-muted)]" />
                  <p>جارٍ تحميل الطيارين...</p>
                </div>
              ) : drivers.length === 0 ? (
                <div className="py-12 text-center admin-muted rounded-2xl border border-dashed border-[var(--admin-border)]">
                  <Bike className="size-8 mx-auto mb-2 text-[var(--admin-muted)]" strokeWidth={1.5} />
                  <p className="font-bold text-[var(--admin-foreground)]">لا يوجد طيارين مسجلين في هذا الفرع بعد</p>
                  <p className="text-[11px] admin-muted mt-1">
                    أضف كباتن التوصيل للبدء في إسناد وتوزيع طلبات الدليفري.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {drivers.map((d) => {
                    const isAvailable = d.isActive && d.status === DriverStatus.AVAILABLE;
                    const isOnDelivery = d.status === DriverStatus.ON_DELIVERY;

                    return (
                      <div
                        key={d.id}
                        className="admin-card admin-card-hover p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-9 place-items-center rounded-xl bg-[var(--admin-background)]">
                              {getVehicleIcon(d.vehicleType)}
                            </div>
                            <div>
                              <h5 className="font-bold text-[var(--admin-foreground)] text-xs">{d.fullName}</h5>
                              <span className="text-[11px] admin-muted font-mono" dir="ltr">
                                {d.phone}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`admin-badge ${
                              isAvailable
                                ? 'admin-badge-success'
                                : isOnDelivery
                                ? 'admin-badge-info'
                                : 'admin-badge-neutral'
                            }`}
                          >
                            {isAvailable ? 'متاح بالفرع' : isOnDelivery ? 'في مشوار' : 'غير نشط'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] admin-muted pt-1 border-t border-[var(--admin-border)]">
                          <span>طلبات في الطريق: <strong>{d.activeOrdersCount}</strong></span>
                          {d.pendingCashMinor > 0 && (
                            <span className="text-[var(--admin-warning)] font-bold">
                              عهدة معلقة: {(d.pendingCashMinor / 100).toFixed(2)} {currencySymbol}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTLEMENTS */}
          {activeTab === 'SETTLEMENTS' && (
            <div className="space-y-4">
              {!reviewingDriverId ? (
                <>
                  <div>
                    <h4 className="font-bold text-[var(--admin-foreground)] text-xs">تسوية عهد طياري التوصيل</h4>
                    <p className="text-[11px] admin-muted">
                      قائمة الكباتن الذين قاموا بتسليم طلبات دفع عند الاستلام (COD) ويحملون مبالغ نقدية معلقة
                    </p>
                  </div>

                  {pendingSettlementDrivers.length === 0 ? (
                    <div className="py-12 text-center admin-muted rounded-2xl border border-dashed border-[var(--admin-border)]">
                      <CheckCircle2 className="size-8 mx-auto mb-2 text-[var(--admin-accent)]" strokeWidth={1.5} />
                      <p className="font-bold text-[var(--admin-foreground)]">كافة عهد الطيارين مسوّاة بالكامل</p>
                      <p className="text-[11px] admin-muted mt-1">
                        لا توجد أي مبالغ نقدية معلقة بذمة أي طيار حالياً.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingSettlementDrivers.map((d) => (
                        <div
                          key={d.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border admin-status-warning shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="admin-status-warning grid size-10 place-items-center rounded-xl border">
                              <Banknote className="size-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-[var(--admin-foreground)] text-xs">{d.fullName}</h5>
                                <span className="font-mono text-[11px] admin-muted" dir="ltr">
                                  ({d.phone})
                                </span>
                              </div>
                              <p className="text-[11px] admin-muted mt-0.5">
                                سلّم {d.unsettledDeliveredCount} طلبات بانتظار توريد النقدية
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left font-mono" dir="ltr">
                              <span className="text-sm font-bold text-[var(--admin-warning)]">
                                {(d.pendingCashMinor / 100).toFixed(2)} {currencySymbol}
                              </span>
                              <span className="block text-[10px] admin-muted">مطلوب توريده</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenSettleReview(d.id)}
                              className="rounded-xl admin-action-warning px-3.5 py-2 font-bold shadow-2xs text-xs active:scale-95 transition"
                            >
                              استعراض وتوريد العهدة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Settlement Confirmation Panel */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingDriverId(null);
                        setSettlementDetails(null);
                      }}
                      className="flex items-center gap-1 admin-muted hover:text-[var(--admin-foreground)] text-xs font-semibold"
                    >
                      <ChevronLeft className="size-4 rotate-180" />
                      <span>رجوع لقائمة العهد</span>
                    </button>

                    <span className="font-bold text-[var(--admin-foreground)] text-xs">
                      مراجعة وتوريد عهدة: {settlementDetails?.driver.fullName}
                    </span>
                  </div>

                  {!settlementDetails ? (
                    <div className="py-12 text-center admin-muted">
                      <Clock className="size-6 mx-auto mb-1 animate-spin text-[var(--admin-muted)]" />
                      <p>جارٍ تجهيز كشف حساب الطيار...</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Shift link alert */}
                      <div className="rounded-xl border admin-status-success p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold block">التوريد لوردية الكاشير النشطة:</span>
                          <span className="text-[11px] text-[var(--admin-accent-hover)]">
                            {settlementDetails.activeShift
                              ? `سيتم توريد المبلغ لوردية الكاشير (${settlementDetails.activeShift.cashierName}) مباشرة`
                              : 'تنبيه: لا توجد وردية كاشير نشطة حالياً بالفرع، سيتم تسجيل السند بدون قيد وردية'}
                          </span>
                        </div>
                        <CheckCircle2 className="size-5 text-[var(--admin-accent-hover)] shrink-0" />
                      </div>

                      {/* Orders Breakdown */}
                      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-3 space-y-2">
                        <p className="font-bold text-[var(--admin-foreground)]">الطلبات المسلّمة بالكشف ({settlementDetails.orders.length} طلبات):</p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                          {settlementDetails.orders.map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-[var(--admin-foreground)]" dir="ltr">
                                  {o.orderNumber}
                                </span>
                                <span className="admin-muted mr-2">· {o.customerName || 'عميل'}</span>
                              </div>
                              <div className="text-left font-mono" dir="ltr">
                                <span className="font-bold text-[var(--admin-foreground)]">
                                  {(o.totalMinor / 100).toFixed(2)} {currencySymbol}
                                </span>
                                <span className="text-[10px] admin-muted block">
                                  {o.paymentMethod === 'CASH' ? 'دفع عند الاستلام' : 'بطاقة'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals Summary */}
                      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-3 space-y-1.5">
                        <div className="flex justify-between admin-muted">
                          <span>إجمالي الطلبات:</span>
                          <span>{settlementDetails.summary.totalOrdersCount} طلبات</span>
                        </div>
                        <div className="flex justify-between admin-muted">
                          <span>طلبات الدفع عند الاستلام (COD):</span>
                          <span>{settlementDetails.summary.codOrdersCount} طلبات</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[var(--admin-border)] font-bold text-sm text-[var(--admin-foreground)]">
                          <span>المبلغ النقدي الواجب توريده بالدرج:</span>
                          <span className="font-mono text-base text-[var(--admin-accent-hover)]">
                            {(settlementDetails.summary.totalCollectedCashMinor / 100).toFixed(2)} {currencySymbol}
                          </span>
                        </div>
                      </div>

                      {/* Notes input */}
                      <div>
                        <label className="block text-[var(--admin-foreground)] font-semibold mb-1">ملاحظات التسوية (اختياري):</label>
                        <input
                          type="text"
                          placeholder="مثال: توريد نهاية وردية الغداء"
                          value={settlementNotes}
                          onChange={(e) => setSettlementNotes(e.target.value)}
                          className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                      </div>

                      {/* Confirmation Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setReviewingDriverId(null)}
                          className="rounded-xl border admin-control px-4 py-2 font-medium"
                        >
                          إلغاء
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmSettlement}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-[var(--admin-success)] hover:bg-[var(--admin-accent-hover)] px-4 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                          <Printer className="size-3.5" />
                          <span>{isPending ? 'جارٍ التوريد...' : 'تأكيد التوريد وإيداع النقدية بالدرج'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

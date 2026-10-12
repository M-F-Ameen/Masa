'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  Bike,
  Car,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  User,
} from 'lucide-react';
import { VehicleType, DriverStatus } from '../../../../../domain/delivery/enums';
import { listBranchDriversAction, dispatchOrdersAction } from '../../../../actions/delivery.actions';
import { DetailedOrder } from '../order-detail-modal';
import { DriverViewItem } from '../../../../../application/delivery/use-cases/list-branch-drivers.use-case';

interface DispatchModalProps {
  order: DetailedOrder;
  currencySymbol?: string;
  onClose: () => void;
  onDispatched: (driverName: string) => void;
}

export function DispatchModal({
  order,
  currencySymbol = 'ج.م',
  onClose,
  onDispatched,
}: DispatchModalProps) {
  const [drivers, setDrivers] = useState<DriverViewItem[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadDrivers() {
      if (!order.branchId) {
        setErrorMsg('يجب إسناد الطلب لفرع أولاً قبل اختيار الطيار');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await listBranchDriversAction(order.branchId);
      if (res.success) {
        setDrivers(res.data);
        // Pre-select first available driver if any
        const firstAvailable = res.data.find(
          (d) => d.isActive && d.status === DriverStatus.AVAILABLE
        );
        if (firstAvailable) {
          setSelectedDriverId(firstAvailable.id);
        }
      } else {
        setErrorMsg(res.error || 'فشل تحميل قائمة الطيارين');
      }
      setIsLoading(false);
    }

    loadDrivers();
  }, [order.branchId]);

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

  const handleConfirmDispatch = () => {
    if (!selectedDriverId || !order.branchId) return;

    const chosenDriver = drivers.find((d) => d.id === selectedDriverId);
    if (!chosenDriver) return;

    startTransition(async () => {
      setErrorMsg(null);
      const res = await dispatchOrdersAction({
        branchId: order.branchId!,
        driverId: selectedDriverId,
        orderIds: [order.id],
      });

      if (res.success) {
        onDispatched(chosenDriver.fullName);
      } else {
        setErrorMsg(res.error || 'فشل إسناد الطلب للطيار');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--admin-foreground)]/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      dir="rtl"
    >
      <div className="admin-card w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4 bg-[var(--admin-background)]">
          <div className="flex items-center gap-2.5">
            <div className="admin-status-info grid size-9 place-items-center rounded-xl border">
              <Truck className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--admin-foreground)]">
                إسناد وخروج الطلب مع طيار
              </h3>
              <p className="text-[11px] admin-muted font-mono">
                {order.orderNumber} · {order.customerName}
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--admin-danger-soft)] p-2.5 text-xs text-[var(--admin-danger)] font-medium">
              <AlertCircle className="size-4 shrink-0 text-[var(--admin-danger)]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Brief */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] admin-muted block">العنوان والتسليم:</span>
              <p className="font-medium text-[var(--admin-foreground)] line-clamp-1">
                {order.deliveryAddress || 'عنوان محدد بالتفاصيل'}
              </p>
            </div>
            <div className="text-left font-mono" dir="ltr">
              <span className="text-xs font-bold text-[var(--admin-foreground)]">
                {(order.totalMinor / 100).toFixed(2)} {currencySymbol}
              </span>
              <span className="block text-[10px] admin-muted">
                {order.paymentMethod === 'CASH' ? 'دفع عند الاستلام' : 'مدفوع إلكترونياً'}
              </span>
            </div>
          </div>

          {/* Drivers List */}
          <div>
            <label className="block font-bold text-[var(--admin-foreground)] mb-2">
              اختر كابتن التوصيل بالفرع ({drivers.length} طيار):
            </label>

            {isLoading ? (
              <div className="py-8 text-center admin-muted">
                <Clock className="size-5 mx-auto mb-1 animate-spin text-[var(--admin-muted)]" />
                <p>جارٍ تحميل طياري الفرع...</p>
              </div>
            ) : drivers.length === 0 ? (
              <div className="py-8 text-center admin-muted rounded-xl border border-dashed border-[var(--admin-border)]">
                <User className="size-6 mx-auto mb-1 text-[var(--admin-muted)]" />
                <p className="font-semibold text-[var(--admin-foreground)]">لا يوجد طيارين مسجلين بهذا الفرع</p>
                <p className="text-[11px] mt-0.5 admin-muted">
                  يرجى إضافة طيارين للفرع من زر إدارة الأسطول أولاً.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                {drivers.map((d) => {
                  const isSelected = selectedDriverId === d.id;
                  const isAvailable = d.isActive && d.status === DriverStatus.AVAILABLE;
                  const isOnDelivery = d.status === DriverStatus.ON_DELIVERY;

                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        if (d.isActive) setSelectedDriverId(d.id);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                        isSelected
                          ? 'border-[var(--admin-primary)] bg-[var(--admin-primary-soft)] ring-2 ring-[var(--admin-primary-soft)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)]'
                      } ${!d.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-[var(--admin-background)]">
                          {getVehicleIcon(d.vehicleType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--admin-foreground)] text-xs">
                              {d.fullName}
                            </span>
                            {d.licensePlate && (
                              <span className="text-[10px] bg-[var(--admin-background)] admin-muted px-1.5 py-0.5 rounded font-mono">
                                {d.licensePlate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] admin-muted">
                            <span className="flex items-center gap-1 font-mono" dir="ltr">
                              <Phone className="size-3 text-[var(--admin-muted)]" />
                              {d.phone}
                            </span>
                            {d.activeOrdersCount > 0 && (
                              <span className="text-[var(--admin-info)] font-semibold">
                                · معه {d.activeOrdersCount} طلبات بالشارع
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`admin-badge ${
                            isAvailable
                              ? 'admin-badge-success'
                              : isOnDelivery
                              ? 'admin-badge-info'
                              : 'admin-badge-neutral'
                          }`}
                        >
                          {isAvailable ? 'متاح بالفرع' : isOnDelivery ? 'في مشوار' : 'غير متاح'}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-[var(--admin-primary)]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--admin-border)] px-5 py-3.5 bg-[var(--admin-background)] text-xs">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border admin-control px-4 py-2 font-medium"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirmDispatch}
            disabled={!selectedDriverId || isPending || drivers.length === 0}
            className="flex items-center gap-1.5 rounded-xl admin-primary-action px-4 py-2 font-bold shadow-xs transition disabled:opacity-50"
          >
            <Truck className="size-3.5" />
            <span>{isPending ? 'جارٍ الإسناد...' : 'تأكيد الخروج مع المندوب'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

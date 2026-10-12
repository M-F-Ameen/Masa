'use client';

import React from 'react';
import {
  Clock,
  Phone,
  MapPin,
  Building2,
  AlertCircle,
  Bike,
  Eye,
} from 'lucide-react';
import { OrderStatus, PaymentMethod } from '../../../../../domain/ordering/enums';
import { DetailedOrder } from '../order-detail-modal';

interface OrderOperationalCardProps {
  order: DetailedOrder;
  currencySymbol: string;
  formatMoney: (minor: number) => string;
  formatTimeAgo: (date: Date | string) => string;
  getStatusBadge: (status: string) => { label: string; cls: string };
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onViewDetails: (order: DetailedOrder) => void;
  onStartDispatch: (order: DetailedOrder) => void;
}

export function OrderOperationalCard({
  order,
  currencySymbol,
  formatMoney,
  formatTimeAgo,
  getStatusBadge,
  onUpdateStatus,
  onViewDetails,
  onStartDispatch,
}: OrderOperationalCardProps) {
  const badge = getStatusBadge(order.status);
  const isUnassigned = !order.branchId;

  return (
    <div className="admin-card admin-card-hover flex flex-col justify-between overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-[var(--admin-border)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-[var(--admin-foreground)]">
            {order.orderNumber}
          </span>
          <span className={`admin-badge ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] admin-muted">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-[var(--admin-muted)]" />
            {formatTimeAgo(order.createdAt)}
          </span>
          <span>{order.paymentMethod === PaymentMethod.CASH ? 'دفع عند الاستلام' : order.paymentMethod}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3 flex-1 text-xs">
        {/* Customer Info */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--admin-foreground)]">{order.customerName}</span>
            <a
              href={`tel:${order.customerPhone}`}
              className="admin-muted hover:text-[var(--admin-accent-hover)] font-mono text-[11px] flex items-center gap-1"
              dir="ltr"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3 text-[var(--admin-muted)]" />
              <span>{order.customerPhone}</span>
            </a>
          </div>
          {order.deliveryAddress && (
            <div className="flex items-start gap-1 admin-muted text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-[var(--admin-muted)] shrink-0 mt-0.5" />
              <span className="line-clamp-1">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Branch Assignment Status */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          {order.branch ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--admin-background)] border border-[var(--admin-border)] text-[var(--admin-foreground)] text-[11px]">
              <Building2 className="w-3 h-3 text-[var(--admin-muted)]" />
              <span>فرع: {order.branch.nameAr}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded border admin-status-danger text-[11px] font-semibold">
              <AlertCircle className="w-3 h-3" />
              <span>غير مسند لفرع حتى الآن!</span>
            </div>
          )}

          {order.driverName && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded border admin-status-info text-[11px] font-semibold">
              <Bike className="w-3 h-3 text-[var(--admin-info)]" />
              <span>كابتن: {order.driverName}</span>
            </div>
          )}
        </div>

        {/* Items Preview */}
        <div className="bg-[var(--admin-background)] p-2.5 rounded-lg border border-[var(--admin-border)] text-[11px] space-y-1">
          <span className="font-semibold text-[var(--admin-foreground)] block">
            الأصناف ({order.items.reduce((s, i) => s + i.quantity, 0)} قطع):
          </span>
          <ul className="admin-muted space-y-0.5">
            {order.items.slice(0, 2).map((item) => (
              <li key={item.id} className="truncate">
                • {item.productNameAr} {item.sizeNameAr && `(${item.sizeNameAr})`} × {item.quantity}
              </li>
            ))}
            {order.items.length > 2 && (
              <li className="text-[10px] admin-muted font-medium">
                + {order.items.length - 2} أصناف أخرى...
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Card Footer (Price & Quick Actions) */}
      <div className="p-3 bg-[var(--admin-background)] border-t border-[var(--admin-border)] flex items-center justify-between gap-2">
        <div className="text-left">
          <span className="text-[10px] admin-muted block">الإجمالي:</span>
          <span className="text-sm font-bold text-[var(--admin-foreground)]">
            {formatMoney(order.totalMinor)} {currencySymbol}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Primary Status Step Button */}
          {order.status === OrderStatus.PENDING && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, OrderStatus.CONFIRMED)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg admin-action-warning transition"
            >
              تأكيد
            </button>
          )}

          {order.status === OrderStatus.CONFIRMED && (
            <button
              type="button"
              onClick={() => {
                if (isUnassigned) {
                  onViewDetails(order);
                } else {
                  onUpdateStatus(order.id, OrderStatus.PREPARING);
                }
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                isUnassigned
                  ? 'admin-primary-action'
                  : 'admin-action-warning'
              }`}
            >
              {isUnassigned ? 'إسناد فرع' : 'تجهيز بالمطبخ'}
            </button>
          )}

          {order.status === OrderStatus.PREPARING && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, OrderStatus.READY_FOR_PICKUP)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg admin-primary-action transition"
            >
              جاهز للتوصيل
            </button>
          )}

          {order.status === OrderStatus.READY_FOR_PICKUP && (
            <button
              type="button"
              onClick={() => {
                if (!order.branchId) {
                  onViewDetails(order);
                } else {
                  onStartDispatch(order);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg admin-primary-action transition"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>مع المندوب</span>
            </button>
          )}

          {order.status === OrderStatus.OUT_FOR_DELIVERY && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, OrderStatus.DELIVERED)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--admin-success)] text-white hover:bg-[var(--admin-accent-hover)] transition"
            >
              تم التسليم
            </button>
          )}

          {/* View Details Button */}
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border admin-control transition"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
            <span>تفاصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
import { OrderStatus } from '../../../../domain/ordering/enums';
import { OrderSource } from '../../../../domain/ordering/enums';
import {
  listOrdersAction,
  getOrdersMetricsAction,
  assignOrderBranchAction,
  updateOrderStatusAction,
} from '../../../actions/order.actions';
import { OrderDetailModal, DetailedOrder, BranchOption } from './order-detail-modal';
import { ThermalReceipt } from './thermal-receipt';
import { DispatchModal } from './components/dispatch-modal';
import { FleetManagementModal } from './components/fleet-management-modal';
import { DriverSettlementReceipt, DriverSettlementPrintData } from './components/driver-settlement-receipt';
import { KitchenOrderTicketPrint, KitchenTicketData } from '../../../../components/printing/kitchen-order-ticket';
import { OrdersHeader } from './components/orders-header';
import { OrdersKpiSummary } from './components/orders-kpi-summary';
import { OrdersFilterToolbar } from './components/orders-filter-toolbar';
import { OrderOperationalCard } from './components/order-operational-card';

interface OrdersCockpitClientProps {
  initialOrders: DetailedOrder[];
  initialMetrics: {
    pendingCount: number;
    preparingCount: number;
    inDeliveryCount: number;
    deliveredTodayCount: number;
    todaySalesMinor: number;
  };
  branches: BranchOption[];
  currencySymbol?: string;
  restaurantNameAr?: string;
  restaurantNameEn?: string;
  isBranchRestricted?: boolean;
  userBranchId?: string | null;
  canAssignBranch?: boolean;
  initialDateStr?: string;
}

export function OrdersCockpitClient({
  initialOrders,
  initialMetrics,
  branches,
  currencySymbol = 'ج.م',
  restaurantNameAr = 'المطعم',
  restaurantNameEn = 'Restaurant',
  isBranchRestricted = false,
  userBranchId = null,
  canAssignBranch = true,
  initialDateStr,
}: OrdersCockpitClientProps) {
  const [orders, setOrders] = useState<DetailedOrder[]>(initialOrders);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<OrderSource>(OrderSource.ONLINE);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isBranchRestricted && userBranchId ? userBranchId : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Date Filter States
  type DatePreset = 'today' | 'week' | 'month' | 'custom';
  const defaultDate = initialDateStr ?? new Date().toISOString().slice(0, 10);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDateStr, setStartDateStr] = useState<string>(defaultDate);
  const [endDateStr, setEndDateStr] = useState<string>(defaultDate);

  const getPresetDates = (preset: DatePreset) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset === 'today') {
      return { start: today, end: today };
    }
    if (preset === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { start: d.toISOString().slice(0, 10), end: today };
    }
    if (preset === 'month') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { start: d.toISOString().slice(0, 10), end: today };
    }
    return { start: startDateStr, end: endDateStr };
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getPresetDates(preset);
      setStartDateStr(start);
      setEndDateStr(end);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setDatePreset('custom');
    setStartDateStr(start);
    setEndDateStr(end);
  };

  // Audio & polling states
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resto_sound_muted') === 'true';
    }
    return false;
  });
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // Modal & Print states
  const [activeModalOrder, setActiveModalOrder] = useState<DetailedOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<DetailedOrder | null>(null);
  const [printingKot, setPrintingKot] = useState<KitchenTicketData | null>(null);

  // Delivery Dispatch & Fleet states
  const [dispatchingOrder, setDispatchingOrder] = useState<DetailedOrder | null>(null);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState<boolean>(false);
  const [printedSettlement, setPrintedSettlement] = useState<DriverSettlementPrintData | null>(null);

  const activeFleetBranchId =
    isBranchRestricted && userBranchId
      ? userBranchId
      : selectedBranchId !== 'ALL' && selectedBranchId !== 'UNASSIGNED'
      ? selectedBranchId
      : branches[0]?.id || '';

  const prevPendingCountRef = useRef<number>(initialMetrics.pendingCount);

  // Audio Alert synthesizer using Web Audio API
  const playAlertSound = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio playback might be restricted before user interaction
    }
  }, [isMuted]);

  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('resto_sound_muted', String(next));
      return next;
    });
  };

  // Fetch data
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsRefreshing(true);
      const effectiveBranchId = isBranchRestricted && userBranchId ? userBranchId : selectedBranchId;
      try {
        const [ordersRes, metricsRes] = await Promise.all([
          listOrdersAction({
            status: selectedStatus,
            source: selectedSource,
            branchId: effectiveBranchId,
            search: searchQuery,
            dateFrom: startDateStr ? `${startDateStr}T00:00:00.000Z` : undefined,
            dateTo: endDateStr ? `${endDateStr}T23:59:59.999Z` : undefined,
            limit: 50,
          }),
          getOrdersMetricsAction(effectiveBranchId, selectedSource),
        ]);

        if (ordersRes.success && ordersRes.data) {
          const fetchedOrders = ordersRes.data.orders as unknown as DetailedOrder[];
          setOrders(fetchedOrders);

          // Update active modal order if open
          if (activeModalOrder) {
            const updatedActive = fetchedOrders.find((o) => o.id === activeModalOrder.id);
            if (updatedActive) setActiveModalOrder(updatedActive);
          }
        }

        if (metricsRes.success && metricsRes.data) {
          const newMetrics = metricsRes.data;
          // Trigger audio if pending count increased
          if (newMetrics.pendingCount > prevPendingCountRef.current) {
            playAlertSound();
          }
          prevPendingCountRef.current = newMetrics.pendingCount;
          setMetrics(newMetrics);
        }
      } catch (error) {
        console.error('Failed to refresh orders cockpit:', error);
      } finally {
        if (!isBackground) setIsRefreshing(false);
      }
    },
    [selectedStatus, selectedSource, selectedBranchId, searchQuery, startDateStr, endDateStr, activeModalOrder, playAlertSound, isBranchRestricted, userBranchId]
  );

  // Auto-refresh interval (every 20 seconds)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

  // Handle manual filter change
  const handleFilterChange = (status: string) => {
    setSelectedStatus(status);
  };

  // Trigger search on submit or debounce (skipping duplicate initial mount fetch)
  const isFirstMountRef = useRef<boolean>(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchData(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedStatus, selectedSource, selectedBranchId, searchQuery, startDateStr, endDateStr, fetchData]);

  // Branch assignment action
  const handleAssignBranch = async (orderId: string, branchId: string): Promise<boolean> => {
    const res = await assignOrderBranchAction({ orderId, branchId });
    if (res.success) {
      await fetchData(false);
      return true;
    }
    return false;
  };

  // Status transition action
  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    cancelReason?: string
  ): Promise<boolean> => {
    const res = await updateOrderStatusAction({ orderId, nextStatus, cancelReason });
    if (res.success) {
      await fetchData(false);
      return true;
    }
    return false;
  };

  // Print thermal receipt
  const handlePrint = (order: DetailedOrder) => {
    setPrintingKot(null);
    setPrintedSettlement(null);
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Print Kitchen Order Ticket (KOT)
  const handlePrintKot = (order: DetailedOrder) => {
    setPrintingOrder(null);
    setPrintedSettlement(null);
    setPrintingKot({
      orderNumber: order.orderNumber,
      type: order.type,
      tableName: null,
      sectionName: null,
      guestCount: null,
      customerName: order.customerName,
      customerNotes: order.customerNotes,
      kitchenNotes: null,
      createdAt: order.createdAt,
      branchName: order.branch?.nameAr ?? null,
      cashierName: null,
      items: order.items.map((item) => ({
        id: item.id,
        productNameAr: item.productNameAr,
        productNameEn: item.productNameEn,
        sizeNameAr: item.sizeNameAr,
        quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({ nameAr: m.nameAr })),
      })),
    });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Helper for formatting time ago
  const formatTimeAgo = (dateInput: Date | string) => {
    const now = new Date().getTime();
    const created = new Date(dateInput).getTime();
    const diffMins = Math.max(0, Math.floor((now - created) / 60000));
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} س`;
    const d = new Date(dateInput);
    return `${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatMoney = (minor: number) => (minor / 100).toFixed(2);
  const ordersTotalMinor = orders.reduce((sum, o) => sum + (o.totalMinor ?? 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
        return { label: 'جديد قيد المراجعة', cls: 'admin-badge-info' };
      case OrderStatus.CONFIRMED:
        return { label: 'تم التأكيد', cls: 'admin-badge-warning' };
      case OrderStatus.PREPARING:
        return { label: 'جاري التجهيز', cls: 'admin-badge-warning' };
      case OrderStatus.READY_FOR_PICKUP:
        return { label: 'جاهز للتوصيل', cls: 'admin-badge-info' };
      case OrderStatus.OUT_FOR_DELIVERY:
        return { label: 'مع المندوب', cls: 'admin-badge-info' };
      case OrderStatus.DELIVERED:
        return { label: 'تم التسليم', cls: 'admin-badge-success' };
      case OrderStatus.CANCELLED:
        return { label: 'ملغي', cls: 'admin-badge-danger' };
      case OrderStatus.REJECTED:
        return { label: 'مرفوض', cls: 'admin-badge-neutral' };
      default:
        return { label: status, cls: 'admin-badge-neutral' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header & Controls */}
      <OrdersHeader
        pendingCount={metrics.pendingCount}
        isMuted={isMuted}
        toggleSound={toggleSound}
        autoRefreshEnabled={autoRefreshEnabled}
        setAutoRefreshEnabled={setAutoRefreshEnabled}
        activeFleetBranchId={activeFleetBranchId}
        onOpenFleetModal={() => setIsFleetModalOpen(true)}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchData(false)}
      />

      {/* 2. Top KPI Cards */}
      <OrdersKpiSummary
        metrics={metrics}
        selectedStatus={selectedStatus}
        onFilterChange={handleFilterChange}
        currencySymbol={currencySymbol}
        formatMoney={formatMoney}
      />

      {/* 3. Filters & Date Navigation */}
      <OrdersFilterToolbar
        datePreset={datePreset}
        onPresetChange={handlePresetChange}
        startDateStr={startDateStr}
        endDateStr={endDateStr}
        onCustomDateChange={handleCustomDateChange}
        ordersCount={orders.length}
        ordersTotalMinor={ordersTotalMinor}
        formatMoney={formatMoney}
        currencySymbol={currencySymbol}
        selectedStatus={selectedStatus}
        selectedSource={selectedSource}
        onSourceSelect={setSelectedSource}
        onStatusSelect={(status) => setSelectedStatus(status)}
        metrics={metrics}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        isBranchRestricted={isBranchRestricted}
        userBranchId={userBranchId}
        selectedBranchId={selectedBranchId}
        onBranchChange={(branchId) => setSelectedBranchId(branchId)}
        branches={branches}
      />

      {/* 4. Operational Cards Grid */}
      {orders.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[var(--admin-border)] rounded-2xl bg-[var(--admin-surface)] space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--admin-background)] flex items-center justify-center mx-auto text-[var(--admin-muted)]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--admin-foreground)]">لا توجد طلبات مطابقة</h3>
          <p className="text-xs admin-muted max-w-sm mx-auto">
            لا توجد أي طلبات تتطابق مع الفلتر الحالي أو معايير البحث المحددة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <OrderOperationalCard
              key={order.id}
              order={order}
              currencySymbol={currencySymbol}
              formatMoney={formatMoney}
              formatTimeAgo={formatTimeAgo}
              getStatusBadge={getStatusBadge}
              onUpdateStatus={handleUpdateStatus}
              onViewDetails={(ord) => setActiveModalOrder(ord)}
              onStartDispatch={(ord) => {
                if (!ord.branchId) {
                  setActiveModalOrder(ord);
                } else {
                  setDispatchingOrder(ord);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Detail Modal */}
      {activeModalOrder && (
        <OrderDetailModal
          order={activeModalOrder}
          branches={branches}
          currencySymbol={currencySymbol}
          canAssignBranch={canAssignBranch}
          onClose={() => setActiveModalOrder(null)}
          onAssignBranch={handleAssignBranch}
          onUpdateStatus={handleUpdateStatus}
          onPrint={() => handlePrint(activeModalOrder)}
          onPrintKot={() => handlePrintKot(activeModalOrder)}
          onStartDispatch={(order) => {
            setActiveModalOrder(null);
            setDispatchingOrder(order);
          }}
        />
      )}

      {/* 6. Printable Thermal Receipt (Hidden on screen, rendered on window.print()) */}
      {printingOrder && (
        <ThermalReceipt
          order={printingOrder}
          restaurantNameAr={restaurantNameAr}
          restaurantNameEn={restaurantNameEn}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 6.1 Printable Kitchen Order Ticket (KOT) */}
      {printingKot && (
        <KitchenOrderTicketPrint
          ticket={printingKot}
          restaurantName={restaurantNameAr}
        />
      )}

      {/* 7. Dispatch Modal */}
      {dispatchingOrder && dispatchingOrder.branchId && (
        <DispatchModal
          order={dispatchingOrder}
          currencySymbol={currencySymbol}
          onClose={() => setDispatchingOrder(null)}
          onDispatched={() => {
            setDispatchingOrder(null);
            fetchData(false);
          }}
        />
      )}

      {/* 8. Fleet Management Modal */}
      {isFleetModalOpen && activeFleetBranchId && (
        <FleetManagementModal
          branchId={activeFleetBranchId}
          branchName={branches.find((b) => b.id === activeFleetBranchId)?.nameAr}
          currencySymbol={currencySymbol}
          onClose={() => setIsFleetModalOpen(false)}
          onSettlementCompleted={(settlementData) => {
            setPrintedSettlement(settlementData);
            fetchData(false);
          }}
        />
      )}

      {/* 9. Driver Settlement Printable Receipt */}
      {printedSettlement && (
        <DriverSettlementReceipt
          data={printedSettlement}
          restaurantName={restaurantNameAr}
          currencySymbol={currencySymbol}
          onAfterPrint={() => setPrintedSettlement(null)}
        />
      )}
    </div>
  );
}

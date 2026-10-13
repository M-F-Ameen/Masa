'use client';

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChefHat,
  Clock,
  Check,
  CheckCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Printer,
  Utensils,
  Store,
  Bike,
  AlertTriangle,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { KitchenOrderCard } from '../../../../application/kitchen/use-cases/get-kitchen-orders.use-case';
import {
  getKitchenOrdersAction,
  bumpKitchenOrderAction,
  toggleKitchenItemPreparedAction,
} from '../../../actions/kitchen.actions';
import {
  KitchenOrderTicketPrint,
  KitchenTicketData,
} from '../../../../components/printing/kitchen-order-ticket';

export interface BranchOption {
  id: string;
  nameAr: string;
  code: string;
  isActive: boolean;
}

interface KitchenKdsClientProps {
  initialOrders: KitchenOrderCard[];
  branches: BranchOption[];
  restaurantNameAr?: string;
  restaurantNameEn?: string;
  isBranchRestricted?: boolean;
  userBranchId?: string | null;
}

type OrderTypeFilter = 'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export function KitchenKdsClient({
  initialOrders,
  branches,
  restaurantNameAr = 'المطعم',
  restaurantNameEn = 'Restaurant',
  isBranchRestricted = false,
  userBranchId = null,
}: KitchenKdsClientProps) {
  const [orders, setOrders] = useState<KitchenOrderCard[]>(initialOrders);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isBranchRestricted && userBranchId ? userBranchId : 'ALL'
  );
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sound preference state
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resto_kitchen_sound_muted') === 'true';
    }
    return false;
  });

  // Action pending states
  const [bumpingOrderId, setBumpingOrderId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Print state
  const [printingKot, setPrintingKot] = useState<KitchenTicketData | null>(null);

  // Live timer tick (updates every 1000ms)
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Ref to track known order IDs for sound notification
  const prevOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  // Sound alert using Web Audio API
  const playAlertSound = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 note
      osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.18); // B5 note

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      // Audio playback silently suppressed if blocked by browser policy
    }
  }, [isMuted]);

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('resto_kitchen_sound_muted', String(nextState));
    }
  };

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen request rejected or unavailable
    }
  };

  // Fetch / Refresh kitchen orders
  const refreshOrders = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsRefreshing(true);
      try {
        const branchParam =
          selectedBranchId !== 'ALL'
            ? selectedBranchId
            : isBranchRestricted && userBranchId
            ? userBranchId
            : undefined;

        const res = await getKitchenOrdersAction({ branchId: branchParam });
        if (res.success && res.data) {
          const freshOrders = res.data;

          // Check if any new orders arrived
          const knownIds = prevOrderIdsRef.current;
          const hasNewOrders = freshOrders.some((o) => !knownIds.has(o.id));
          if (hasNewOrders) {
            playAlertSound();
          }

          // Update ref with current set of IDs
          prevOrderIdsRef.current = new Set(freshOrders.map((o) => o.id));
          setOrders(freshOrders);
        }
      } catch (err) {
        console.error('Failed to refresh kitchen orders:', err);
      } finally {
        if (!isBackground) setIsRefreshing(false);
      }
    },
    [selectedBranchId, isBranchRestricted, userBranchId, playAlertSound]
  );

  // Polling effect (every 12 seconds)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      refreshOrders(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshOrders]);

  // Handle branch switch
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
  };

  // Trigger print when printingKot is set
  useEffect(() => {
    if (!printingKot) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintingKot(null);
    }, 150);
    return () => clearTimeout(timer);
  }, [printingKot]);

  // Bump order (mark ready for pickup)
  const handleBumpOrder = async (order: KitchenOrderCard) => {
    if (!order.branchId) {
      alert('لا يمكن تجهيز الطلب لعدم تحديد فرع للطلب.');
      return;
    }

    setBumpingOrderId(order.id);
    try {
      const res = await bumpKitchenOrderAction({
        orderId: order.id,
        branchId: order.branchId,
      });

      if (res.success) {
        startTransition(() => {
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        });
      } else {
        alert(res.error || 'فشل تحديث حالة الطلب');
      }
    } catch (err) {
      console.error('Kitchen KDS bump error:', err);
      alert('حدث خطأ أثناء إنهاء وتجهيز الطلب');
    } finally {
      setBumpingOrderId(null);
    }
  };

  // Toggle single item prepared status
  const handleToggleItem = async (order: KitchenOrderCard, itemId: string, currentStatus: boolean) => {
    setTogglingItemId(itemId);
    try {
      const res = await toggleKitchenItemPreparedAction({
        orderItemId: itemId,
        isPrepared: !currentStatus,
        branchId: order.branchId ?? undefined,
      });

      if (res.success) {
        startTransition(() => {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id !== order.id) return o;
              const nextItems = o.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      isPrepared: !currentStatus,
                      preparedAt: !currentStatus ? new Date().toISOString() : null,
                    }
                  : i
              );
              const prepCount = nextItems.filter((i) => i.isPrepared).length;
              return {
                ...o,
                items: nextItems,
                preparedItemsCount: prepCount,
              };
            })
          );
        });
      } else {
        alert(res.error || 'فشل تحديث حالة الصنف');
      }
    } catch (err) {
      console.error('Kitchen KDS item toggle error:', err);
      alert('حدث خطأ أثناء تحديث حالة الصنف');
    } finally {
      setTogglingItemId(null);
    }
  };

  // Print KOT handler
  const handlePrintKot = (order: KitchenOrderCard) => {
    const kotData: KitchenTicketData = {
      orderNumber: order.orderNumber,
      type: order.type,
      tableName: order.tableName,
      sectionName: order.sectionNameAr,
      customerName: order.customerName,
      customerNotes: order.customerNotes,
      kitchenNotes: order.kitchenNotes,
      createdAt: order.createdAt,
      branchName: order.branchNameAr,
      items: order.items.map((i) => ({
        productNameAr: i.productNameAr,
        productNameEn: i.productNameEn,
        sizeNameAr: i.sizeNameAr,
        sizeNameEn: i.sizeNameEn,
        quantity: i.quantity,
        modifiers: i.modifiers.map((m) => ({
          nameAr: m.nameAr,
          nameEn: m.nameEn,
        })),
      })),
    };
    setPrintingKot(kotData);
  };

  // Filter orders by selected type
  const filteredOrders = orders.filter((o) => {
    if (typeFilter === 'ALL') return true;
    return o.type === typeFilter;
  });

  // Calculate counts for filters
  const dineInCount = orders.filter((o) => o.type === 'DINE_IN').length;
  const takeawayCount = orders.filter((o) => o.type === 'TAKEAWAY').length;
  const deliveryCount = orders.filter((o) => o.type === 'DELIVERY').length;

  // Format stopwatch elapsed time
  const getElapsedDisplay = (startedAtIso: string, fallbackElapsedSeconds: number) => {
    const elapsedSecs =
      currentTime > 0
        ? Math.max(0, Math.floor((currentTime - new Date(startedAtIso).getTime()) / 1000))
        : fallbackElapsedSeconds;
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    let badgeClass = 'kitchen-timer kitchen-timer-normal';
    let isUrgent = false;

    if (mins >= 20) {
      badgeClass = 'kitchen-timer kitchen-timer-urgent animate-pulse';
      isUrgent = true;
    } else if (mins >= 10) {
      badgeClass = 'kitchen-timer kitchen-timer-warning';
    } else {
      badgeClass = 'kitchen-timer kitchen-timer-normal';
    }

    return { formatted, badgeClass, isUrgent };
  };

  const getOrderTypeBadge = (order: KitchenOrderCard) => {
    switch (order.type) {
      case 'DINE_IN':
        return (
          <span className="kitchen-type-badge kitchen-type-dine">
            <Utensils className="w-4 h-4" />
            <span>{order.tableName ? `طاولة ${order.tableName}` : 'صالة'}</span>
          </span>
        );
      case 'TAKEAWAY':
        return (
          <span className="kitchen-type-badge kitchen-type-takeaway">
            <Store className="w-4 h-4" />
            <span>سفري</span>
          </span>
        );
      case 'DELIVERY':
        return (
          <span className="kitchen-type-badge kitchen-type-delivery">
            <Bike className="w-4 h-4" />
            <span>توصيل</span>
          </span>
        );
      default:
        return (
          <span className="kitchen-order-chip inline-flex items-center px-2 py-0.5 text-xs font-bold">
            {order.type}
          </span>
        );
    }
  };

  return (
    <div
      dir="rtl"
      className={`kitchen-app min-h-screen flex flex-col font-sans select-none ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''
      }`}
    >
      {/* Printable KOT Component (Only renders when triggered) */}
      <KitchenOrderTicketPrint ticket={printingKot} restaurantName={restaurantNameAr} />

      {/* Top Navigation & Operational Control Bar */}
      <header className="kitchen-header sticky top-0 z-30 border-b px-4 py-3">
        <div className="kitchen-header-layout">
          {/* Right Section: Back to Admin + Title and Active Count */}
          <div className="kitchen-header-brand">
            <Link
              href="/admin"
              className="kitchen-control kitchen-header-back inline-flex shrink-0 items-center gap-1.5 px-3 text-xs font-semibold"
              title="العودة للوحة التحكم"
            >
              <ArrowRight className="w-4 h-4 text-[var(--kitchen-primary)]" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </Link>
            <div className="kitchen-brand-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border shadow-xs">
              <ChefHat className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight text-[var(--kitchen-deep)]">شاشة المطبخ (KDS)</h1>
                <span className="rounded-full border border-[#B9E3DC] bg-[#E7F5F2] px-2.5 py-0.5 text-xs font-bold text-[#08766D]">
                  {orders.length} نشط
                </span>
              </div>
              <p className="truncate text-xs text-[var(--kitchen-muted)]">
                {restaurantNameAr} • {restaurantNameEn}
              </p>
            </div>
          </div>

          {/* Center Section: Order Type Filter Tabs */}
          <div className="kitchen-filter-group kitchen-header-filters min-w-0 max-w-full">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`kitchen-filter shrink-0 text-xs font-bold flex items-center gap-1.5 ${
                typeFilter === 'ALL'
                  ? 'kitchen-filter-active'
                  : ''
              }`}
            >
              الكل ({orders.length})
            </button>
            <button
              onClick={() => setTypeFilter('DINE_IN')}
              className={`kitchen-filter kitchen-filter-type-dine shrink-0 text-xs font-bold flex items-center gap-1.5 ${
                typeFilter === 'DINE_IN'
                  ? 'kitchen-filter-active'
                  : ''
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              صالة ({dineInCount})
            </button>
            <button
              onClick={() => setTypeFilter('TAKEAWAY')}
              className={`kitchen-filter kitchen-filter-type-takeaway shrink-0 text-xs font-bold flex items-center gap-1.5 ${
                typeFilter === 'TAKEAWAY'
                  ? 'kitchen-filter-active'
                  : ''
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              سفري ({takeawayCount})
            </button>
            <button
              onClick={() => setTypeFilter('DELIVERY')}
              className={`kitchen-filter kitchen-filter-type-delivery shrink-0 text-xs font-bold flex items-center gap-1.5 ${
                typeFilter === 'DELIVERY'
                  ? 'kitchen-filter-active'
                  : ''
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              توصيل ({deliveryCount})
            </button>
          </div>

          {/* Left Section: Controls & Branch Switcher */}
          <div className="kitchen-header-operations">
            {/* Branch Switcher Dropdown */}
            {!isBranchRestricted && (
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="kitchen-control kitchen-header-branch w-full min-w-0 max-w-full px-3 text-xs font-medium sm:w-auto"
              >
                <option value="ALL">جميع الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'تفعيل التنبيه الصوتي' : 'كتم التنبيه الصوتي'}
              className={`kitchen-control kitchen-control-icon text-xs font-medium ${
                isMuted
                  ? 'kitchen-control-off'
                  : 'kitchen-control-on'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? 'إيقاف التحديث التلقائي مؤقتاً' : 'تشغيل التحديث التلقائي'}
              className={`kitchen-control kitchen-control-icon text-xs font-medium ${
                autoRefreshEnabled
                  ? 'kitchen-control-on'
                  : 'kitchen-control-off'
              }`}
            >
              {autoRefreshEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => refreshOrders(false)}
              disabled={isRefreshing}
              title="تحديث فوري"
              className="kitchen-control kitchen-control-icon disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1D6C6B]' : ''}`} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
              className="kitchen-control kitchen-control-icon"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Order Tickets Canvas */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="kitchen-empty flex h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center">
            <div className="kitchen-empty-icon mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-inner">
              <ChefHat className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-[var(--kitchen-deep)]">
              لا توجد طلبات قيد التجهيز في المطبخ حالياً
            </h3>
            <p className="max-w-sm text-sm text-[var(--kitchen-muted)]">
              المطبخ في وضع الجاهزية. ستظهر التذاكر الجديدة هنا فور تأكيدها وتتحرك بشكل تسلسلي حسب وقت النزول.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const { formatted: elapsedText, badgeClass: timerBadgeClass, isUrgent } = getElapsedDisplay(
                order.kitchenStartedAt,
                order.elapsedSeconds
              );
              const isBumping = bumpingOrderId === order.id;
              const isAllPrepared =
                order.totalItemsCount > 0 && order.preparedItemsCount === order.totalItemsCount;

              return (
                <div
                  key={order.id}
                  className={`kitchen-ticket flex flex-col justify-between overflow-hidden transition-all duration-200 ${
                    isUrgent
                      ? 'kitchen-ticket-urgent'
                      : isAllPrepared
                      ? 'kitchen-ticket-ready'
                      : ''
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="kitchen-ticket-header border-b p-3.5">
                    {/* Row 1: Destination / Order Type Badge + Timer */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        {getOrderTypeBadge(order)}
                        {order.branchNameAr && selectedBranchId === 'ALL' && (
                          <span className="text-[11px] font-medium text-[var(--kitchen-muted)]">({order.branchNameAr})</span>
                        )}
                      </div>

                      {/* Elapsed Timer Badge */}
                      <div
                        className={`${timerBadgeClass} shrink-0`}
                        title="الوقت المنقضي منذ بدء التجهيز"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs font-bold">{elapsedText}</span>
                      </div>
                    </div>

                    {/* Row 2: Order Number (LTR nowrap) + Customer Name + Reprint KOT */}
                    <div className="kitchen-ticket-meta flex items-center justify-between border-t pt-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="kitchen-order-chip px-2 py-0.5 font-mono text-xs font-bold tracking-wider"
                          dir="ltr"
                        >
                          #{order.orderNumber}
                        </span>
                        {order.customerName && (
                          <span className="max-w-[130px] truncate font-medium text-[var(--kitchen-deep)]">
                            {order.customerName}
                          </span>
                        )}
                      </div>

                      {/* Reprint KOT Button */}
                      <button
                        onClick={() => handlePrintKot(order)}
                        title="إعادة طباعة بون المطبخ (80mm)"
                        className="kitchen-print shrink-0 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Kitchen or Customer Notes Alert */}
                    {(order.kitchenNotes || order.customerNotes) && (
                      <div className="kitchen-note mt-2.5 flex items-start gap-1.5 rounded-xl p-2 text-xs">
                        <AlertTriangle className="kitchen-note-icon mt-0.5 h-4 w-4 shrink-0" />
                        <div className="leading-relaxed">
                          {order.kitchenNotes && (
                            <p className="font-bold">ملاحظة مطبخ: {order.kitchenNotes}</p>
                          )}
                          {order.customerNotes && (
                            <p className="opacity-90">ملاحظة زبون: {order.customerNotes}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items Preparation Checklist */}
                  <div className="kitchen-items max-h-[360px] flex-1 divide-y overflow-y-auto p-3">
                    {order.items.map((item) => {
                      const isItemLoading = togglingItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(order, item.id, item.isPrepared)}
                          className={`kitchen-item flex cursor-pointer items-start justify-between gap-2.5 px-1.5 py-2 transition-all group ${
                            item.isPrepared
                              ? 'kitchen-item-prepared'
                              : ''
                          }`}
                        >
                          {/* Item Details */}
                          <div className="flex items-start gap-2 flex-1">
                            {/* Quantity Badge */}
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-black font-mono ${
                                item.isPrepared
                                  ? 'kitchen-quantity kitchen-quantity-prepared'
                                  : 'kitchen-quantity'
                              }`}
                            >
                              {item.quantity}×
                            </span>

                            <div className="flex-1">
                              <p
                                className={`text-sm font-bold leading-snug transition-all ${
                                item.isPrepared
                                  ? 'kitchen-product-prepared line-through'
                                  : 'kitchen-product'
                                }`}
                              >
                                {item.productNameAr}
                                {item.sizeNameAr && (
                                  <span className="mr-1.5 text-xs font-normal text-[var(--kitchen-muted)]">
                                    ({item.sizeNameAr})
                                  </span>
                                )}
                              </p>

                              {/* Modifiers List */}
                              {item.modifiers.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {item.modifiers.map((m) => (
                                    <li
                                      key={m.id}
                                      className="kitchen-modifier flex items-center gap-1 text-xs font-medium"
                                    >
                                      <span className="kitchen-modifier-dot h-1 w-1 rounded-full"></span>
                                      <span>{m.nameAr}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          {/* Item Prepared Checkbox */}
                          <button
                            type="button"
                            disabled={isItemLoading}
                            className={`kitchen-check flex shrink-0 items-center justify-center transition-all ${
                              item.isPrepared
                                ? 'kitchen-check-prepared'
                                : ''
                            }`}
                          >
                            {isItemLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--kitchen-muted)]" />
                            ) : item.isPrepared ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ticket Footer & Bump Action */}
                  <div className="kitchen-ticket-footer space-y-2 border-t p-3">
                    {/* Item Progress Bar */}
                    <div className="kitchen-progress-label flex items-center justify-between px-1 text-xs">
                      <span>إنجاز الأصناف</span>
                      <span className="kitchen-progress-value font-mono font-bold">
                        {order.preparedItemsCount} / {order.totalItemsCount}
                      </span>
                    </div>

                    <div className="kitchen-progress-track h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="kitchen-progress-fill h-full transition-all duration-300"
                        style={{
                          width: `${
                            order.totalItemsCount > 0
                              ? (order.preparedItemsCount / order.totalItemsCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    {/* Big Touch Bump Button */}
                    <button
                      type="button"
                      disabled={isBumping}
                      onClick={() => handleBumpOrder(order)}
                      className={`kitchen-bump flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all active:scale-98 ${
                        isAllPrepared
                          ? 'kitchen-bump-ready'
                          : ''
                      } disabled:opacity-50`}
                    >
                      {isBumping ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>جاري التسليم...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-4 h-4 stroke-[2]" />
                          <span>تم التجهيز (Bump)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

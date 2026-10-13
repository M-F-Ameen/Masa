import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Coins,
  ShoppingBag,
  Store,
  ChefHat,
  Receipt,
  Wallet,
  Package,
  Armchair,
  Clock,
  AlertTriangle,
  ChevronLeft,
  Activity,
  Check,
} from 'lucide-react';
import { prisma } from '../../../infrastructure/db/prisma';
import { SessionService } from '../../../infrastructure/auth/session.service';
import { BranchContextService } from '../../../infrastructure/auth/branch-context.service';
import { RbacGuard } from '../../../infrastructure/auth/rbac-guard';
import { PermissionCode } from '../../../domain/staff/enums/permission.enum';
import { Money } from '../../../domain/shared/value-objects/money';
import { getCairoTodayRange } from '../../../domain/shared/utils/date-range';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await SessionService.getCurrent();
  if (!session) redirect('/login');

  const cookieStore = await cookies();
  const activeBranchIdFromCookie = cookieStore.get('resto_active_branch_id')?.value;

  // Resolve and verify active branch access according to branch scoping (GR-8.3)
  let verifiedBranchId: string | null = null;
  try {
    verifiedBranchId = await BranchContextService.assertBranchAccess(
      session,
      activeBranchIdFromCookie
    );
  } catch {
    verifiedBranchId = null;
  }

  // 1. Fetch Contextual Core Data
  const [settings, userProfile] = await Promise.all([
    prisma.restaurantSetting.findFirst(),
    prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: { select: { name: true, description: true } } },
    }),
  ]);

  const currency = settings?.currency || 'EGP';
  const currencySymbol = settings?.currencySymbol || 'ج.م';

  // 2. Today's Date Range Boundaries (Normalized to Operational Timezone Africa/Cairo)
  const now = new Date();
  const { startOfToday, endOfToday } = getCairoTodayRange(now);

  const arabicDate = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const branchScope = verifiedBranchId ? { branchId: verifiedBranchId, deletedAt: null } : { deletedAt: null };

  // 3. Operational Data Queries (Scoped to Active Branch & RBAC)
  const [
    todayPaidOrders,
    todayTotalOrdersCount,
    activeInFlightOrdersCount,
    pendingWebOrdersCount,
    openCashShift,
    tables,
    branchInventories,
    recentOrders,
    orgStats,
  ] = await Promise.all([
    // Today's Paid Orders for Revenue Calculation
    prisma.order.findMany({
      where: {
        ...branchScope,
        createdAt: { gte: startOfToday, lte: endOfToday },
        paymentStatus: 'PAID',
      },
      select: { totalMinor: true },
    }),

    // Total orders placed today
    prisma.order.count({
      where: {
        ...branchScope,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),

    // Active in-flight orders right now
    prisma.order.count({
      where: {
        ...branchScope,
        status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
      },
    }),

    // Pending unassigned web delivery orders
    prisma.order.count({
      where: {
        ...branchScope,
        status: 'PENDING',
      },
    }),

    // Open cash shift for current branch
    verifiedBranchId
      ? prisma.cashShift.findFirst({
          where: { branchId: verifiedBranchId, status: 'OPEN' },
          include: { cashier: { select: { fullName: true } } },
          orderBy: { openedAt: 'desc' },
        })
      : null,

    // Dining tables for occupancy calculation
    verifiedBranchId
      ? prisma.diningTable.findMany({
          where: { branchId: verifiedBranchId, isActive: true, deletedAt: null },
          select: { status: true },
        })
      : [],

    // Low stock verification
    verifiedBranchId && RbacGuard.hasPermission(session, PermissionCode.MANAGE_INVENTORY)
      ? prisma.branchInventory.findMany({
          where: { branchId: verifiedBranchId },
          include: { inventoryItem: { select: { nameAr: true, unit: true } } },
        })
      : [],

    // 5 Most recent orders in active branch
    prisma.order.findMany({
      where: branchScope,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        source: true,
        status: true,
        paymentStatus: true,
        totalMinor: true,
        createdAt: true,
        table: { select: { tableNumber: true } },
        customer: { select: { fullName: true } },
      },
    }),

    // Organization stats (For Super Admin overview)
    session.isSuperAdmin
      ? Promise.all([
          prisma.branch.count({ where: { isActive: true } }),
          prisma.user.count({ where: { isActive: true } }),
          prisma.product.count({ where: { isActive: true } }),
          prisma.customer.count(),
        ])
      : null,
  ]);

  // Financial calculations via Money Value Object (GR-1.1 & GR-8.2)
  const todayRevenueMoney = todayPaidOrders.reduce(
    (acc: Money, o: { totalMinor: number }) => acc.add(Money.fromMinor(o.totalMinor, currency)),
    Money.zero(currency)
  );

  // Table Occupancy stats
  const totalTablesCount = tables.length;
  const occupiedTablesCount = tables.filter((t: { status: string }) => t.status === 'OCCUPIED').length;
  const occupancyPercentage =
    totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;

  // Low stock items count
  const lowStockCount = branchInventories.filter(
    (bi) => Number(bi.quantity) <= Number(bi.minThreshold)
  ).length;

  const displayName = userProfile?.fullName ?? 'المستخدم';

  // Format minor to major with currency
  const formatMoney = (minor: number) => {
    return `${(minor / 100).toFixed(2)} ${currencySymbol}`;
  };

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {/* 1. Contextual Executive Welcome Banner */}
      <div className="admin-card relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-foreground)] tracking-tight">
              مرحباً، {displayName}
            </h1>
            <p className="admin-muted text-xs sm:text-sm font-medium">
              قمرة القيادة التشغيلية للمطعم • نظرة حية على مبيعات اليوم، حالة الصالة، والورديات المفتوحة
            </p>
          </div>

          {/* Date & System Status */}
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <div className="admin-control flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold">
              <Clock className="admin-muted size-3.5" />
              <span>{arabicDate}</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-accent-hover)]">
              <Activity className="size-3 text-[var(--admin-accent)]" />
              <span>النظام متصل وقنوات التشغيل نشطة</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Operational Intelligence Alerts (Shown when actionable conditions occur) */}
      {(pendingWebOrdersCount > 0 || lowStockCount > 0 || !openCashShift) && (
        <div className="space-y-2.5">
          {pendingWebOrdersCount > 0 && RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS) && (
            <div className="admin-status-danger flex items-center justify-between rounded-xl border p-3.5 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="admin-status-dot-danger size-2 rounded-full animate-ping" />
                <span className="font-bold">
                  تنبيه الطلبات: يوجد {pendingWebOrdersCount} طلب توصيل جديد وارد من الموقع بانتظار الاعتماد والإسناد!
                </span>
              </div>
              <Link
                href="/admin/orders"
                className="admin-action-danger flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 font-bold transition"
              >
                <span>مركز الطلبات</span>
                <ChevronLeft className="size-3" />
              </Link>
            </div>
          )}

          {lowStockCount > 0 && RbacGuard.hasPermission(session, PermissionCode.MANAGE_INVENTORY) && (
            <div className="admin-status-warning flex items-center justify-between rounded-xl border p-3.5 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 shrink-0 text-[var(--admin-warning)]" />
                <span className="font-bold">
                  تنبيه المخزون: يوجد {lowStockCount} من الخامات في هذا الفرع وصلت لحد إعادة الطلب أو أوشكت على النفاد.
                </span>
              </div>
              <Link
                href="/admin/inventory"
                className="admin-action-warning flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 font-bold transition"
              >
                <span>فحص النواقص</span>
                <ChevronLeft className="size-3" />
              </Link>
            </div>
          )}

          {!openCashShift && (RbacGuard.hasPermission(session, PermissionCode.POS_ACCESS) || RbacGuard.hasPermission(session, PermissionCode.MANAGE_FINANCE)) && (
            <div className="admin-soft-primary flex items-center justify-between rounded-xl border p-3.5 text-xs">
              <div className="flex items-center gap-2.5">
                <Wallet className="size-4 shrink-0" />
                <span>
                  لا توجد وردية مالية مفتوحة حالياً في هذا الفرع. يرجى فتح وردية جديدة قبل بدء تسجيل المبيعات.
                </span>
              </div>
              <Link
                href="/admin/finance"
                className="admin-primary-action flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 font-bold transition"
              >
                <span>فتح وردية</span>
                <ChevronLeft className="size-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 3. Live Operational Pulse (Today's Key Performance Indicators) */}
      <div className="flex flex-wrap justify-center gap-3.5">
        {/* Metric 1: Today's Revenue (Role Protected) */}
        {(session.isSuperAdmin ||
          RbacGuard.hasPermission(session, PermissionCode.VIEW_REPORTS) ||
          RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS)) && (
          <div className="admin-card flex w-full flex-col justify-between p-5 sm:w-[calc(50%-0.4375rem)] lg:w-[calc(25%-0.65625rem)]">
            <div className="flex items-center justify-between">
              <span className="admin-muted text-xs font-bold">مبيعات اليوم المحصلة</span>
              <div className="admin-status-success grid size-8 place-items-center rounded-xl border">
                <Coins className="size-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3">
<div className="admin-number text-2xl sm:text-3xl font-black text-[var(--admin-foreground)] tracking-tight">
                {formatMoney(todayRevenueMoney.amount)}
              </div>
              <p className="admin-muted mt-1 text-[11px] font-medium">
                إجمالي {todayPaidOrders.length} فاتورة مسددة اليوم
              </p>
            </div>
          </div>
        )}

        {/* Metric 2: In-Flight Orders */}
        {(session.isSuperAdmin || RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS)) && (
          <div className="admin-card flex w-full flex-col justify-between p-5 sm:w-[calc(50%-0.4375rem)] lg:w-[calc(25%-0.65625rem)]">
            <div className="flex items-center justify-between">
              <span className="admin-muted text-xs font-bold">الطلبات النشطة الآن</span>
              <div className="admin-status-info grid size-8 place-items-center rounded-xl border">
                <ShoppingBag className="size-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3">
<div className="admin-number text-2xl sm:text-3xl font-black text-[var(--admin-info)] tracking-tight">
                {activeInFlightOrdersCount}
              </div>
              <p className="admin-muted mt-1 text-[11px] font-medium">
                من إجمالي {todayTotalOrdersCount} طلب سُجلت اليوم
              </p>
            </div>
          </div>
        )}

        {/* Metric 3: Table Occupancy */}
        {(session.isSuperAdmin || RbacGuard.hasPermission(session, PermissionCode.MANAGE_BRANCHES)) && (
          <div className="admin-card flex w-full flex-col justify-between p-5 sm:w-[calc(50%-0.4375rem)] lg:w-[calc(25%-0.65625rem)]">
            <div className="flex items-center justify-between">
              <span className="admin-muted text-xs font-bold">إشغال الصالة والطاولات</span>
              <div className="admin-status-warning grid size-8 place-items-center rounded-xl border">
                <Armchair className="size-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
<span className="admin-number text-2xl sm:text-3xl font-black text-[var(--admin-foreground)]">
                  {occupiedTablesCount}/{totalTablesCount}
                </span>
                <span className="admin-number text-sm font-bold text-[var(--admin-warning)]">
                  ({occupancyPercentage}%)
                </span>
              </div>
              <div className="admin-progress-track mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="admin-progress-warning h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Metric 4: Current Cash Shift Status */}
        {(session.isSuperAdmin ||
          RbacGuard.hasPermission(session, PermissionCode.MANAGE_FINANCE) ||
          RbacGuard.hasPermission(session, PermissionCode.POS_ACCESS)) && (
          <div className="admin-card flex w-full flex-col justify-between p-5 sm:w-[calc(50%-0.4375rem)] lg:w-[calc(25%-0.65625rem)]">
            <div className="flex items-center justify-between">
              <span className="admin-muted text-xs font-bold">الوردية المالية الحالية</span>
              <div className="admin-status-info grid size-8 place-items-center rounded-xl border">
                <Wallet className="size-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3">
              {openCashShift ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="admin-status-dot-success size-2 rounded-full" />
                    <span className="admin-status-success-text text-sm font-bold">
                      مفتوحة • {openCashShift.cashier?.fullName || 'الكاشير'}
                    </span>
                  </div>
                  <p className="admin-muted mt-1 text-[11px] font-mono">
                    عهدة الافتتاح: {formatMoney(openCashShift.openingCashMinor)}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="admin-muted text-sm font-bold">لا توجد وردية مفتوحة</span>
                  <p className="admin-muted mt-1 text-[11px]">الدرج مغلق حالياً</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Tactical Launchpad (Immediate Touch Action Buttons) */}
      <div className="space-y-3">
        <h2 className="admin-muted text-xs font-bold uppercase tracking-wider">
          الإجراءات والعمليات السريعة
        </h2>

        <div className="flex flex-wrap justify-center gap-3">
          {/* Action 1: POS Screen */}
          {RbacGuard.hasPermission(session, PermissionCode.POS_ACCESS) && (
            <Link
              href="/pos"
              className="admin-primary-action group flex min-h-[110px] w-full flex-col justify-between rounded-2xl p-4.5 transition sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-white/10 grid place-items-center text-white">
                  <Store className="size-5" strokeWidth={1.8} />
                </div>
                <ChevronLeft className="size-4 text-white/65 group-hover:text-white group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <p className="text-sm font-bold">شاشة الكاشير (POS)</p>
                <span className="text-[11px] text-white/65">مبيعات الصالة والسفري</span>
              </div>
            </Link>
          )}

          {/* Action 2: Online Order Center */}
          {RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS) && (
            <Link
              href="/admin/orders"
              className="admin-card admin-card-hover group flex min-h-[110px] w-full flex-col justify-between p-4.5 text-[var(--admin-foreground)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="admin-status-danger grid size-9 place-items-center rounded-xl border">
                  <ShoppingBag className="size-5" strokeWidth={1.8} />
                </div>
                {pendingWebOrdersCount > 0 ? (
                  <span className="admin-badge admin-badge-danger font-mono">
                    {pendingWebOrdersCount} جديد
                  </span>
                ) : (
                  <ChevronLeft className="admin-muted size-4 group-hover:text-[var(--admin-primary)] group-hover:-translate-x-0.5 transition" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold">مركز الطلبات</p>
                <span className="admin-muted text-[11px]">إدارة طلبات التوصيل</span>
              </div>
            </Link>
          )}

          {/* Action 3: Kitchen Display */}
          {RbacGuard.hasPermission(session, PermissionCode.KITCHEN_VIEW) && (
            <Link
              href="/admin/kitchen"
              className="admin-card admin-card-hover group flex min-h-[110px] w-full flex-col justify-between p-4.5 text-[var(--admin-foreground)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="admin-status-info grid size-9 place-items-center rounded-xl border">
                  <ChefHat className="size-5" strokeWidth={1.8} />
                </div>
                <ChevronLeft className="admin-muted size-4 group-hover:text-[var(--admin-primary)] group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <p className="text-sm font-bold">شاشة المطبخ (KDS)</p>
                <span className="admin-muted text-[11px]">متابعة تذاكر الطهي الحية</span>
              </div>
            </Link>
          )}

          {/* Action 4: Invoices Audit */}
          {(RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS) ||
            RbacGuard.hasPermission(session, PermissionCode.VIEW_REPORTS)) && (
            <Link
              href="/admin/invoices"
              className="admin-card admin-card-hover group flex min-h-[110px] w-full flex-col justify-between p-4.5 text-[var(--admin-foreground)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="admin-status-info grid size-9 place-items-center rounded-xl border">
                  <Receipt className="size-5" strokeWidth={1.8} />
                </div>
                <ChevronLeft className="admin-muted size-4 group-hover:text-[var(--admin-primary)] group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <p className="text-sm font-bold">سجل الفواتير</p>
                <span className="admin-muted text-[11px]">طباعة ومراجعة البونات</span>
              </div>
            </Link>
          )}

          {/* Action 5: Finance & Shifts */}
          {RbacGuard.hasPermission(session, PermissionCode.MANAGE_FINANCE) && (
            <Link
              href="/admin/finance"
              className="admin-card admin-card-hover group flex min-h-[110px] w-full flex-col justify-between p-4.5 text-[var(--admin-foreground)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="admin-status-info grid size-9 place-items-center rounded-xl border">
                  <Wallet className="size-5" strokeWidth={1.8} />
                </div>
                <ChevronLeft className="admin-muted size-4 group-hover:text-[var(--admin-primary)] group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <p className="text-sm font-bold">المالية والورديات</p>
                <span className="admin-muted text-[11px]">إغلاق وردية ومصروفات</span>
              </div>
            </Link>
          )}

          {/* Action 6: Inventory */}
          {RbacGuard.hasPermission(session, PermissionCode.MANAGE_INVENTORY) && (
            <Link
              href="/admin/inventory"
              className="admin-card admin-card-hover group flex min-h-[110px] w-full flex-col justify-between p-4.5 text-[var(--admin-foreground)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <div className="flex items-center justify-between">
                <div className="admin-status-warning grid size-9 place-items-center rounded-xl border">
                  <Package className="size-5" strokeWidth={1.8} />
                </div>
                <ChevronLeft className="admin-muted size-4 group-hover:text-[var(--admin-primary)] group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <p className="text-sm font-bold">المخزون والوصفات</p>
                <span className="admin-muted text-[11px]">أرصدة الخامات والـ BOM</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* 5. Recent Branch Operations Feed (Live Activity) */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="admin-soft-primary grid size-8 place-items-center rounded-xl border">
              <Activity className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--admin-foreground)]">آخر العمليات والطلبات</h3>
              <p className="admin-muted text-[11px]">أحدث 5 طلبات تم تسجيلها في هذا الفرع</p>
            </div>
          </div>

          <Link
            href="/admin/invoices"
            className="admin-muted flex items-center gap-1 text-xs font-bold transition hover:text-[var(--admin-primary)]"
          >
            <span>عرض سجل الفواتير كاملاً</span>
            <ChevronLeft className="size-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-muted p-8 text-center text-xs font-medium">
            لا توجد أي طلبات مسجلة في هذا الفرع حتى الآن.
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {recentOrders.map((order) => {
              const typeLabel =
                order.type === 'DINE_IN'
                  ? `صالة ${order.table?.tableNumber ? `(طاولة ${order.table.tableNumber})` : ''}`
                  : order.type === 'TAKEAWAY'
                  ? 'سفري'
                  : `توصيل ${order.customer?.fullName ? `(${order.customer.fullName})` : ''}`;

              const isPaid = order.paymentStatus === 'PAID';

              return (
                <div
                  key={order.id}
                  className="admin-row-hover flex flex-col justify-between gap-3 p-3.5 transition sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="admin-id-chip rounded-lg px-2 py-1 font-mono text-xs font-black">
                      {order.orderNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--admin-foreground)]">{typeLabel}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'admin-badge admin-badge-success'
                              : 'admin-badge admin-badge-danger'
                          }`}
                        >
                          {isPaid ? 'مدفوعة' : 'شيك مفتوح'}
                        </span>
                      </div>
                      <span className="admin-muted mt-0.5 block text-[10px] font-mono">
                        {new Intl.DateTimeFormat('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(order.createdAt))}
                        {' • '}
                        {order.source === 'POS' ? 'كاشير الفرع' : order.source === 'PHONE' ? 'طلب هاتفي' : 'أونلاين (الموقع)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-mono text-sm font-black text-[var(--admin-foreground)]">
                      {formatMoney(order.totalMinor)}
                    </span>
                    <Link
                      href={`/admin/invoices`}
                      className="admin-control rounded-lg border px-2.5 py-1 text-xs font-bold transition"
                    >
                      معاينة
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Organization & Strategic Foundation (Visible to Super Admin) */}
      {session.isSuperAdmin && orgStats && (
        <div className="space-y-3 pt-2">
          <h2 className="admin-muted text-xs font-bold uppercase tracking-wider">
            نظرة المنظومة المركزية (Super Admin)
          </h2>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/branches"
              className="admin-card admin-card-hover w-full p-5 transition sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              <span className="admin-muted block text-[11px] font-medium">الفروع النشطة</span>
              <span className="admin-number mt-1 block text-3xl font-black text-[var(--admin-foreground)]">
                {orgStats[0]}
              </span>
              <span className="admin-status-success-text mt-1 flex items-center gap-1 text-[10px] font-bold">
                <Check className="size-3" />
                <span>نطاق فروع موحد</span>
              </span>
            </Link>

            <Link
              href="/admin/staff"
              className="admin-card admin-card-hover w-full p-5 transition sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              <span className="admin-muted block text-[11px] font-medium">فريق العمل (RBAC)</span>
              <span className="admin-number mt-1 block text-3xl font-black text-[var(--admin-foreground)]">
                {orgStats[1]}
              </span>
              <span className="admin-muted mt-1 block text-[10px] font-medium">
                موظفين وصلاحيات
              </span>
            </Link>

            <Link
              href="/admin/menu"
              className="admin-card admin-card-hover w-full p-5 transition sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              <span className="admin-muted block text-[11px] font-medium">أصناف الكتالوج</span>
              <span className="admin-number mt-1 block text-3xl font-black text-[var(--admin-foreground)]">
                {orgStats[2]}
              </span>
              <span className="admin-muted mt-1 block text-[10px] font-medium">
                منيو وإضافات جاهزة
              </span>
            </Link>

            <Link
              href="/admin/customers"
              className="admin-card admin-card-hover w-full p-5 transition sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              <span className="admin-muted block text-[11px] font-medium">عملاء الـ CRM</span>
              <span className="admin-number mt-1 block text-3xl font-black text-[var(--admin-foreground)]">
                {orgStats[3]}
              </span>
              <span className="admin-muted mt-1 block text-[10px] font-medium">
                سجل موحد للعملاء
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

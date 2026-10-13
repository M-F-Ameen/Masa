import { cookies } from 'next/headers';
import { prisma } from '../../../infrastructure/db/prisma';
import { AdminNavItem, AdminNavSection } from './admin-nav';
import { AdminShell } from './admin-shell';
import { SessionService } from '../../../infrastructure/auth/session.service';
import { RbacGuard } from '../../../infrastructure/auth/rbac-guard';
import { PermissionCode } from '../../../domain/staff/enums/permission.enum';
import { redirect } from 'next/navigation';
import { logoutAction } from '../../actions/auth.actions';
import { AppLogger } from '../../../infrastructure/logging/logger';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await SessionService.getCurrent();
  if (!session) redirect('/login');

  const canSwitchBranches =
    session.isSuperAdmin ||
    session.permissions.includes(PermissionCode.MANAGE_BRANCHES);

  // If user is super admin or has MANAGE_BRANCHES, they can switch between all active branches.
  // Otherwise, strictly filter branches to only the branches assigned to them.
  const branchFilter = canSwitchBranches
    ? { isActive: true, deletedAt: null }
    : { id: { in: session.assignedBranchIds }, isActive: true, deletedAt: null };

  const [settings, branches, cookieStore, userProfile] = await Promise.all([
    prisma.restaurantSetting.findFirst(),
    prisma.branch.findMany({
      where: branchFilter,
      select: { id: true, code: true, nameAr: true },
      orderBy: { createdAt: 'asc' },
    }),
    cookies(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, role: { select: { name: true, description: true } } },
    }),
  ]);

  const activeBranchIdFromCookie = cookieStore.get('resto_active_branch_id')?.value;
  // If user is restricted to branches, ensure the cookie belongs to their assigned branches
  const validCookieBranch =
    activeBranchIdFromCookie &&
    (canSwitchBranches || session.assignedBranchIds.includes(activeBranchIdFromCookie))
      ? activeBranchIdFromCookie
      : null;

  const activeBranch =
    branches.find((b) => b.id === validCookieBranch) ?? branches[0] ?? null;
  const activeBranchId = activeBranch ? activeBranch.id : null;

  // Live indicator: Pending orders count for active branch
  let pendingOrdersCount = 0;
  if (RbacGuard.hasPermission(session, PermissionCode.MANAGE_ORDERS)) {
    try {
      pendingOrdersCount = await prisma.order.count({
        where: {
          status: 'PENDING',
          deletedAt: null,
          ...(activeBranchId ? { branchId: activeBranchId } : {}),
        },
      });
    } catch (err) {
      AppLogger.warn('Failed to count pending orders for admin badge', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let pendingBookingsCount = 0;
  try {
    pendingBookingsCount = await prisma.eventBooking.count({
      where: {
        status: 'PENDING',
        ...(activeBranchId ? { branchId: activeBranchId } : {}),
      },
    });
  } catch (err) {
    AppLogger.warn('Failed to count pending bookings for admin badge', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const rawSections: Array<{
    title?: string;
    items: Array<{
      label: string;
      href: string;
      iconName: string;
      requiredPermission?: PermissionCode;
      anyOfPermissions?: PermissionCode[];
      badge?: string | number | null;
      badgeColor?: 'zinc' | 'emerald' | 'rose' | 'amber' | 'blue';
    }>;
  }> = [
    {
      title: 'الرئيسية',
      items: [
        { label: 'لوحة التحكم', href: '/admin', iconName: 'LayoutDashboard' },
      ],
    },
    {
      title: 'العمليات الميدانية والتشغيل',
      items: [
        {
          label: 'نقطة البيع',
          href: '/pos',
          iconName: 'Store',
          requiredPermission: PermissionCode.POS_ACCESS,
        },
        {
          label: 'طلبات الهاتف',
          href: '/pos/phone-orders',
          iconName: 'PhoneCall',
          requiredPermission: PermissionCode.POS_ACCESS,
        },
        {
          label: 'مركز الطلبات',
          href: '/admin/orders',
          iconName: 'ShoppingBag',
          requiredPermission: PermissionCode.MANAGE_ORDERS,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
          badgeColor: 'rose',
        },
        {
          label: 'المطبخ',
          href: '/admin/kitchen',
          iconName: 'ChefHat',
          requiredPermission: PermissionCode.KITCHEN_VIEW,
        },
        {
          label: 'الطاولات',
          href: '/admin/tables',
          iconName: 'Armchair',
          requiredPermission: PermissionCode.MANAGE_BRANCHES,
        },
        {
          label: 'الحجوزات',
          href: '/admin/bookings',
          iconName: 'CalendarCheck',
          requiredPermission: PermissionCode.MANAGE_ORDERS,
          badge: pendingBookingsCount > 0 ? pendingBookingsCount : null,
          badgeColor: 'amber',
        },
      ],
    },
    {
      title: 'المالية والرقابة',
      items: [
        {
          label: 'فواتير',
          href: '/admin/invoices',
          iconName: 'Receipt',
          anyOfPermissions: [PermissionCode.MANAGE_ORDERS, PermissionCode.VIEW_REPORTS],
        },
        {
          label: 'المالية',
          href: '/admin/finance',
          iconName: 'Wallet',
          requiredPermission: PermissionCode.MANAGE_FINANCE,
        },
        {
          label: 'التقارير',
          href: '/admin/reports',
          iconName: 'BarChart3',
          requiredPermission: PermissionCode.VIEW_REPORTS,
        },
      ],
    },
    {
      title: 'إدارة الكتالوج والمخزون',
      items: [
        {
          label: 'قائمة الطعام',
          href: '/admin/menu',
          iconName: 'UtensilsCrossed',
          requiredPermission: PermissionCode.MANAGE_MENU,
        },
        {
          label: 'المخزون',
          href: '/admin/inventory',
          iconName: 'Package',
          requiredPermission: PermissionCode.MANAGE_INVENTORY,
        },
        {
          label: 'العملاء',
          href: '/admin/customers',
          iconName: 'Contact',
          requiredPermission: PermissionCode.MANAGE_CUSTOMERS,
        },
      ],
    },
    {
      title: 'إدارة النظام والمنظومة',
      items: [
        {
          label: 'إدارة الفروع',
          href: '/admin/branches',
          iconName: 'Building2',
          requiredPermission: PermissionCode.MANAGE_BRANCHES,
        },
        {
          label: 'الموظفين',
          href: '/admin/staff',
          iconName: 'Users',
          requiredPermission: PermissionCode.MANAGE_STAFF,
        },
        {
          label: 'إعدادات',
          href: '/admin/settings',
          iconName: 'Settings',
          requiredPermission: PermissionCode.MANAGE_SETTINGS,
        },
      ],
    },
  ];

  const visibleNavSections: AdminNavSection[] = rawSections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => {
        if (item.anyOfPermissions && item.anyOfPermissions.length > 0) {
          return item.anyOfPermissions.some((p) => RbacGuard.hasPermission(session, p));
        }
        if (!item.requiredPermission) return true;
        return RbacGuard.hasPermission(session, item.requiredPermission);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const visibleNavItems: AdminNavItem[] = visibleNavSections.flatMap((s) => s.items);

  const displayName = userProfile?.fullName ?? 'المستخدم';
  const roleName = userProfile?.role?.name ?? session.role;

  return (
    <AdminShell
      restaurantNameAr={settings?.nameAr ?? 'منظومة المطعم'}
      restaurantNameEn={settings?.nameEn ?? 'Restaurant Platform'}
      restaurantLogoUrl={settings?.logoUrl ?? null}
      currency={settings?.currency ?? 'EGP'}
      currencySymbol={settings?.currencySymbol ?? 'ج.م'}
      branches={branches}
      activeBranchId={activeBranchId}
      canSwitchBranches={canSwitchBranches}
      displayName={displayName}
      roleName={roleName}
      visibleNavItems={visibleNavItems}
      navSections={visibleNavSections}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}

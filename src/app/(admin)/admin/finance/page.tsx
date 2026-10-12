import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '../../../../infrastructure/db/prisma';
import { SessionService } from '../../../../infrastructure/auth/session.service';
import { BranchContextService } from '../../../../infrastructure/auth/branch-context.service';
import { PermissionCode } from '../../../../domain/staff/enums/permission.enum';
import { PrismaFinanceRepository } from '../../../../infrastructure/finance/prisma-finance.repository';
import { FinanceClient } from './finance-client';
import { FinancePageData } from './finance.types';
import { AppLogger } from '../../../../infrastructure/logging/logger';

export const dynamic = 'force-dynamic';

export default async function AdminFinancePage() {
  const session = await SessionService.getCurrent();
  if (!session) redirect('/login');

  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_FINANCE);
  } catch {
    redirect('/admin');
  }

  const cookieStore = await cookies();
  const activeBranchIdFromCookie = cookieStore.get('resto_active_branch_id')?.value;

  // Branch Scope (GR-8.3 & GR-1.4): Filter branches based on user assignment
  const allowedBranches = await prisma.branch.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(session.isSuperAdmin ? {} : { id: { in: session.assignedBranchIds } }),
    },
    select: { id: true, nameAr: true },
    orderBy: { createdAt: 'asc' },
  });

  if (allowedBranches.length === 0) {
    return (
      <div className="p-6 text-center admin-muted" dir="rtl">
        لم يتم العثور على أي فرع مخصص لحسابك أو نشط في النظام.
      </div>
    );
  }

  let verifiedBranchId: string;
  try {
    if (activeBranchIdFromCookie) {
      await BranchContextService.assertBranchAccess(session, activeBranchIdFromCookie);
      verifiedBranchId = activeBranchIdFromCookie;
    } else {
      verifiedBranchId = allowedBranches[0].id;
    }
  } catch (error) {
    AppLogger.warn('Finance page branch access fallback triggered', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.userId,
    });
    verifiedBranchId = allowedBranches[0].id;
  }

  const financeRepo = new PrismaFinanceRepository();
  const settings = await prisma.restaurantSetting.findFirst();
  const currency = settings?.currency ?? 'EGP';
  const currencySymbol = settings?.currencySymbol ?? 'ج.م';

  // Current month bounds for P&L default
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [shifts, expenses, categories, activeShift, report] = await Promise.all([
    financeRepo.listShifts({ branchId: verifiedBranchId, limit: 50 }),
    financeRepo.listExpenses({ branchId: verifiedBranchId, limit: 100 }),
    financeRepo.listCategories(),
    financeRepo.getActiveShift(verifiedBranchId, session.userId),
    financeRepo.getProfitAndLoss({
      branchId: verifiedBranchId,
      fromDate,
      toDate,
    }),
  ]);

  const pageData: FinancePageData = {
    branchId: verifiedBranchId,
    allowedBranches,
    currency,
    currencySymbol,
    shifts,
    expenses,
    categories,
    report,
    activeShift,
  };

  return <FinanceClient initialData={pageData} />;
}

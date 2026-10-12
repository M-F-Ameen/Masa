import { cookies } from 'next/headers';
import { prisma } from '../../../../infrastructure/db/prisma';
import { BranchContextService } from '../../../../infrastructure/auth/branch-context.service';
import { PermissionCode } from '../../../../domain/staff/enums/permission.enum';
import { assertPagePermission } from '../../../../infrastructure/auth/page-guard';
import { ListTablesUseCase } from '../../../../application/tables/use-cases/list-tables.use-case';
import { TablesClient } from './tables-client';
import { AppLogger } from '../../../../infrastructure/logging/logger';

export const dynamic = 'force-dynamic';

export default async function AdminTablesPage() {
  const session = await assertPagePermission(PermissionCode.MANAGE_BRANCHES);

  const cookieStore = await cookies();
  const activeBranchIdFromCookie = cookieStore.get('resto_active_branch_id')?.value;

  // Branch Scope: retrieve accessible branches for user
  const allowedBranches = await prisma.branch.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(session.isSuperAdmin ? {} : { id: { in: session.assignedBranchIds } }),
    },
    select: { id: true, nameAr: true, code: true },
    orderBy: { createdAt: 'asc' },
  });

  if (allowedBranches.length === 0) {
    return (
      <div className="p-8 text-center admin-muted" dir="rtl">
        لم يتم العثور على أي فرع متاح أو مخصص لحسابك في النظام.
      </div>
    );
  }

  let verifiedBranchId: string;
  try {
    verifiedBranchId = await BranchContextService.assertBranchAccess(
      session,
      activeBranchIdFromCookie
    );
  } catch (error) {
    AppLogger.warn('Tables page branch access fallback triggered', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.userId,
    });
    verifiedBranchId = allowedBranches[0].id;
  }

  const [settings, tablesData] = await Promise.all([
    prisma.restaurantSetting.findFirst({
      select: { nameAr: true, nameEn: true, currency: true, currencySymbol: true },
    }),
    new ListTablesUseCase().execute(verifiedBranchId),
  ]);

  return (
    <TablesClient
      initialSections={tablesData.sections}
      initialTables={tablesData.tables}
      branches={allowedBranches}
      activeBranchId={verifiedBranchId}
      currencySymbol={settings?.currencySymbol ?? 'ج.م'}
      restaurantNameAr={settings?.nameAr ?? 'منظومة المطعم'}
    />
  );
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SessionService } from '../../../../infrastructure/auth/session.service';
import { PermissionCode } from '../../../../domain/staff/enums/permission.enum';
import { BranchContextService } from '../../../../infrastructure/auth/branch-context.service';
import { RbacGuard } from '../../../../infrastructure/auth/rbac-guard';
import { prisma } from '../../../../infrastructure/db/prisma';
import { PrismaPosRepository } from '../../../../infrastructure/pos/prisma-pos.repository';
import { GetPosCatalogUseCase } from '../../../../application/pos/use-cases/get-pos-catalog.use-case';
import { GetActiveCashShiftUseCase } from '../../../../application/pos/use-cases/cash-shift.use-cases';
import { PhoneOrdersClient } from './phone-orders-client';

export default async function PhoneOrdersPage() {
  const session = await SessionService.getCurrent();
  if (!session) redirect('/login');
  if (!RbacGuard.hasPermission(session, PermissionCode.POS_ACCESS)) redirect('/admin');

  const cookieBranchId = (await cookies()).get('resto_active_branch_id')?.value;
  const repository = new PrismaPosRepository();
  const activeShift = await new GetActiveCashShiftUseCase(repository).execute(session.userId);
  const permittedCookieBranch = cookieBranchId && (session.isSuperAdmin || session.assignedBranchIds.includes(cookieBranchId))
    ? cookieBranchId
    : undefined;
  const branchId = await BranchContextService.assertBranchAccess(session, activeShift?.branchId ?? permittedCookieBranch);
  const [branch, settings, categories, restaurantSetting] = await Promise.all([
    prisma.branch.findUniqueOrThrow({ where: { id: branchId }, select: { id: true, nameAr: true } }),
    repository.getSettings(),
    new GetPosCatalogUseCase(repository).execute(branchId),
    prisma.restaurantSetting.findFirst({ select: { deliveryFee: true } }),
  ]);

  return (
    <PhoneOrdersClient
      branch={branch}
      settings={settings}
      categories={categories}
      deliveryFeeMinor={restaurantSetting?.deliveryFee ?? 0}
    />
  );
}

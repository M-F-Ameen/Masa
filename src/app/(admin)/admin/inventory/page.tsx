import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '../../../../infrastructure/db/prisma';
import { SessionService } from '../../../../infrastructure/auth/session.service';
import { BranchContextService } from '../../../../infrastructure/auth/branch-context.service';
import { PermissionCode } from '../../../../domain/staff/enums/permission.enum';
import { InventoryClient } from './inventory-client';
import { InventoryPageData, CatalogProductForRecipe } from './inventory.types';
import { ListInventoryItemsUseCase } from '../../../../application/inventory/use-cases/manage-inventory-items.use-cases';
import { GetBranchStockUseCase } from '../../../../application/inventory/use-cases/manage-branch-stock.use-cases';
import { ListSuppliersUseCase } from '../../../../application/inventory/use-cases/manage-suppliers.use-cases';
import { ListPurchaseOrdersUseCase } from '../../../../application/inventory/use-cases/manage-purchase-orders.use-cases';
import { ListInventoryMovementsUseCase } from '../../../../application/inventory/use-cases/list-inventory-movements.use-case';
import { RecipeItemDto } from '../../../../domain/inventory/contracts/inventory.repository';
import { UnitOfMeasure } from '../../../../domain/inventory/enums';
import { AppLogger } from '../../../../infrastructure/logging/logger';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const session = await SessionService.getCurrent();
  if (!session) redirect('/login');

  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_INVENTORY);
  } catch {
    redirect('/admin');
  }

  const cookieStore = await cookies();
  const activeBranchIdFromCookie = cookieStore.get('resto_active_branch_id')?.value;

  // Branch Scope (GR-8.3 & GR-1.4): Filter branches based on user assignment and verify access
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
    verifiedBranchId = await BranchContextService.assertBranchAccess(session, activeBranchIdFromCookie);
  } catch (error) {
    AppLogger.warn('Inventory page branch access fallback triggered', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.userId,
    });
    verifiedBranchId = await BranchContextService.assertBranchAccess(session, null);
  }

  const activeBranch = allowedBranches.find((b) => b.id === verifiedBranchId) ?? allowedBranches[0];
  const settings = await prisma.restaurantSetting.findFirst();

  const [
    items,
    stock,
    suppliers,
    purchaseOrders,
    movements,
    catalogProductsRaw,
    recipeItemsRaw,
  ] = await Promise.all([
    new ListInventoryItemsUseCase().execute(),
    new GetBranchStockUseCase().execute(activeBranch.id),
    new ListSuppliersUseCase().execute(),
    new ListPurchaseOrdersUseCase().execute(activeBranch.id),
    new ListInventoryMovementsUseCase().execute({ branchId: activeBranch.id, limit: 100 }),
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        sizes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        modifierGroups: {
          where: { group: { isActive: true } },
          include: { group: { include: { modifiers: { where: { isActive: true } } } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.recipeItem.findMany({
      include: {
        inventoryItem: true,
      },
    }),
  ]);

  const catalogProducts: CatalogProductForRecipe[] = catalogProductsRaw.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    categoryNameAr: p.category.nameAr,
    sizes: p.sizes.map((s) => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn })),
    modifiers: p.modifierGroups.flatMap((mg) =>
      mg.group.modifiers.map((m) => ({
        id: m.id,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        groupNameAr: mg.group.nameAr,
      }))
    ),
  }));

  const recipesMap: Record<string, RecipeItemDto[]> = {};
  for (const r of recipeItemsRaw) {
    let targetProductId = r.productId;
    if (!targetProductId && r.productSizeId) {
      const match = catalogProductsRaw.find((p) => p.sizes.some((s) => s.id === r.productSizeId));
      if (match) targetProductId = match.id;
    }
    if (!targetProductId && r.modifierId) {
      const match = catalogProductsRaw.find((p) =>
        p.modifierGroups.some((mg) => mg.group.modifiers.some((m) => m.id === r.modifierId))
      );
      if (match) targetProductId = match.id;
    }

    if (targetProductId) {
      if (!recipesMap[targetProductId]) recipesMap[targetProductId] = [];
      recipesMap[targetProductId].push({
        id: r.id,
        inventoryItemId: r.inventoryItemId,
        inventoryItemNameAr: r.inventoryItem.nameAr,
        inventoryItemNameEn: r.inventoryItem.nameEn,
        unit: r.inventoryItem.unit as UnitOfMeasure,
        productId: r.productId,
        productSizeId: r.productSizeId,
        modifierId: r.modifierId,
        quantity: Number(r.quantity),
      });
    }
  }

  const pageData: InventoryPageData = {
    branchId: activeBranch.id,
    branchName: activeBranch.nameAr,
    currency: settings?.currencySymbol ?? 'ج.م',
    items,
    stock,
    recipes: recipesMap,
    suppliers,
    purchaseOrders,
    movements,
    catalogProducts,
  };

  return <InventoryClient initialData={pageData} />;
}

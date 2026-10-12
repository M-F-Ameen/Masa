import { NextResponse } from 'next/server';
import { PermissionCode } from '../../../../../domain/staff/enums/permission.enum';
import { SessionService } from '../../../../../infrastructure/auth/session.service';
import { prisma } from '../../../../../infrastructure/db/prisma';
import { buildCatalogWorkbook, workbookToBuffer } from '../../../../../application/catalog/excel/catalog-excel';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const template = new URL(request.url).searchParams.get('template') === '1';

    const [categories, products] = template
      ? [[], []]
      : await Promise.all([
          prisma.category.findMany({
            where: { deletedAt: null },
            orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
            select: { id: true, nameAr: true, nameEn: true, description: true, isActive: true, sortOrder: true },
          }),
          prisma.product.findMany({
            where: { deletedAt: null },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            include: {
              category: { select: { id: true, nameAr: true, nameEn: true } },
              sizes: { orderBy: { sortOrder: 'asc' } },
            },
          }),
        ]);

    const workbook = buildCatalogWorkbook(categories, products, template);
    const buffer = await workbookToBuffer(workbook);
    const filename = template ? 'masa-menu-template.xlsx' : 'masa-menu-export.xlsx';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر تصدير بيانات المنيو.' }, { status: 403 });
  }
}

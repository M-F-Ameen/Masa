'use server';

import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../infrastructure/db/prisma';
import { PermissionCode } from '../../domain/staff/enums/permission.enum';
import { ForbiddenError, ValidationError } from '../../domain/shared/errors/domain-error';
import { SessionService } from '../../infrastructure/auth/session.service';
import { detectImageType } from '../../infrastructure/uploads/image-signature';
import { CategoryInput, ProductInput, ModifierGroupInput, BranchAvailabilityInput } from '../../application/catalog/dto/catalog.dto';
import { SaveCategoryUseCase } from '../../application/catalog/use-cases/save-category.use-case';
import { SaveProductUseCase } from '../../application/catalog/use-cases/save-product.use-case';
import { SaveModifierGroupUseCase } from '../../application/catalog/use-cases/save-modifier-group.use-case';
import { DeleteProductUseCase } from '../../application/catalog/use-cases/delete-product.use-case';
import { DeleteCategoryUseCase } from '../../application/catalog/use-cases/delete-category.use-case';
import { DeleteModifierGroupUseCase } from '../../application/catalog/use-cases/delete-modifier-group.use-case';
import { SetBranchAvailabilityUseCase } from '../../application/catalog/use-cases/set-branch-availability.use-case';
import { SetCatalogStatusUseCase } from '../../application/catalog/use-cases/set-catalog-status.use-case';
import { ToggleProductFeaturedUseCase } from '../../application/catalog/use-cases/toggle-product-featured.use-case';
import { CatalogResource } from '../../domain/catalog/enums/catalog-resource.enum';
import { ActionResult, toActionFailure } from './action-result';
import {
  CatalogImportValidationError,
  catalogNameKey,
  catalogSingleNameKey,
  parseCatalogWorkbook,
  type CatalogImportSummary,
} from '../../application/catalog/excel/catalog-excel';

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new SaveCategoryUseCase().execute(input);
    revalidatePath('/admin/menu');
    return { success: true, data: { id: result.id } };
  } catch (error) { return toActionFailure(error); }
}

export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new SaveProductUseCase().execute(input);
    revalidatePath('/admin/menu');
    revalidatePath('/');
    return { success: true, data: { id: result.id } };
  } catch (error) { return toActionFailure(error); }
}

export async function saveModifierGroupAction(input: ModifierGroupInput): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new SaveModifierGroupUseCase().execute(input);
    revalidatePath('/admin/menu');
    return { success: true, data: { id: result.id } };
  } catch (error) { return toActionFailure(error); }
}

export async function setBranchAvailabilityAction(input: BranchAvailabilityInput): Promise<ActionResult<{ isAvailable: boolean }>> {
  try {
    const session = await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    if (!session.isSuperAdmin && !session.assignedBranchIds.includes(input.branchId)) {
      throw new ForbiddenError('لا تملك صلاحية إدارة توفر الأصناف في هذا الفرع');
    }
    const result = await new SetBranchAvailabilityUseCase().execute(input);
    revalidatePath('/admin/menu');
    return { success: true, data: { isAvailable: result.isAvailable } };
  } catch (error) { return toActionFailure(error); }
}

export async function setCatalogStatusAction(input: { resource: CatalogResource; id: string; isActive: boolean }): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new SetCatalogStatusUseCase().execute(input);
    revalidatePath('/admin/menu');
    return { success: true, data: { isActive: result.isActive } };
  } catch (error) { return toActionFailure(error); }
}

export async function toggleProductFeaturedAction(productId: string): Promise<ActionResult<{ isFeatured: boolean }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new ToggleProductFeaturedUseCase().execute({ productId });
    revalidatePath('/admin/menu');
    revalidatePath('/');
    return { success: true, data: { isFeatured: result.isFeatured } };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const file = formData.get('file');
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      throw new ValidationError('يرجى اختيار ملف صورة صالح');
    }

    const allowedMimeTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    };

    const fileType = file.type?.toLowerCase();
    if (!fileType || !allowedMimeTypes[fileType]) {
      throw new ValidationError('صيغة الملف غير مدعومة. الصيغ المسموحة: JPEG, PNG, WEBP, AVIF');
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      throw new ValidationError('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectImageType(buffer);
    if (!ext) {
      throw new ValidationError('محتوى الملف ليس صورة صالحة (JPEG, PNG, WEBP, AVIF)');
    }

    const fileName = `prod_${crypto.randomUUID()}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    await fs.promises.writeFile(path.join(uploadDir, fileName), buffer);

    return { success: true, data: { url: `/uploads/products/${fileName}` } };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new DeleteProductUseCase().execute({ id: productId });
    revalidatePath('/admin/menu');
    revalidatePath('/');
    revalidatePath('/pos');
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new DeleteCategoryUseCase().execute({ id: categoryId });
    revalidatePath('/admin/menu');
    revalidatePath('/');
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function deleteModifierGroupAction(groupId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);
    const result = await new DeleteModifierGroupUseCase().execute({ id: groupId });
    revalidatePath('/admin/menu');
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function importCatalogAction(formData: FormData): Promise<ActionResult<CatalogImportSummary>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_MENU);

    const file = formData.get('file');
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      throw new CatalogImportValidationError(['يرجى اختيار ملف Excel صالح.']);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new CatalogImportValidationError(['حجم ملف Excel يجب ألا يتجاوز 10 ميجابايت.']);
    }

    const fileName = String((file as File).name ?? '').toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      throw new CatalogImportValidationError(['صيغة الملف غير مدعومة. استخدم ملف xlsx أو xls.']);
    }

    const catalog = await parseCatalogWorkbook(Buffer.from(await file.arrayBuffer()));
    const summary = await prisma.$transaction(async (transaction) => {
      const errors: string[] = [];
      let categoriesCreated = 0;
      let categoriesUpdated = 0;
      let productsCreated = 0;
      let productsUpdated = 0;
      let sizesCreated = 0;
      let sizesUpdated = 0;

      const existingCategories = await transaction.category.findMany({
        where: { deletedAt: null },
        select: { id: true, nameAr: true, nameEn: true },
      });
      const categoryById = new Map(existingCategories.map((category) => [category.id, category]));
      const categoryByKey = new Map<string, (typeof existingCategories)[number]>();
      const categoryByName = new Map<string, (typeof existingCategories)[number] | null>();
      for (const category of existingCategories) {
        categoryByKey.set(catalogNameKey(category.nameAr, category.nameEn), category);
        for (const name of [category.nameAr, category.nameEn]) {
          const key = catalogSingleNameKey(name);
          const current = categoryByName.get(key);
          categoryByName.set(key, current && current.id !== category.id ? null : category);
        }
      }

      const importedCategoryKeys = new Set<string>();
      for (const row of catalog.categories) {
        const key = catalogNameKey(row.nameAr, row.nameEn);
        if (importedCategoryKeys.has(key)) {
          errors.push(`ورقة التصنيفات، الصف ${row.rowNumber}: التصنيف مكرر في الملف.`);
          continue;
        }
        importedCategoryKeys.add(key);

        const existing = row.id ? categoryById.get(row.id) : categoryByKey.get(key);
        if (row.id && !existing) {
          errors.push(`ورقة التصنيفات، الصف ${row.rowNumber}: معرف التصنيف غير موجود في النظام.`);
          continue;
        }
        const conflictingCategory = categoryByKey.get(key);
        if (conflictingCategory && existing && conflictingCategory.id !== existing.id) {
          errors.push(`ورقة التصنيفات، الصف ${row.rowNumber}: اسم التصنيف مستخدم بمعرف مختلف.`);
          continue;
        }

        const saved = existing
          ? await transaction.category.update({
              where: { id: existing.id },
              data: {
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                description: row.description || null,
                isActive: row.isActive,
                sortOrder: row.sortOrder,
              },
            })
          : await transaction.category.create({
              data: {
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                description: row.description || null,
                isActive: row.isActive,
                sortOrder: row.sortOrder,
              },
            });

        categoryById.set(saved.id, saved);
        categoryByKey.set(key, saved);
        categoryByName.set(catalogSingleNameKey(saved.nameAr), saved);
        categoryByName.set(catalogSingleNameKey(saved.nameEn), saved);
        if (existing) categoriesUpdated += 1;
        else categoriesCreated += 1;
      }

      const existingProducts = await transaction.product.findMany({
        where: { deletedAt: null },
        select: { id: true, categoryId: true, nameAr: true, nameEn: true },
      });
      const productById = new Map(existingProducts.map((product) => [product.id, product]));
      const productByKey = new Map<string, (typeof existingProducts)[number] | null>();
      const productByName = new Map<string, (typeof existingProducts)[number] | null>();
      for (const product of existingProducts) {
        const key = `${product.categoryId}|${catalogNameKey(product.nameAr, product.nameEn)}`;
        productByKey.set(key, productByKey.has(key) ? null : product);
        for (const name of [product.nameAr, product.nameEn]) {
          const nameKey = catalogSingleNameKey(name);
          const current = productByName.get(nameKey);
          productByName.set(nameKey, current && current.id !== product.id ? null : product);
        }
      }

      for (const row of catalog.products) {
        let categoryId = row.categoryId;
        if (categoryId && !categoryById.has(categoryId)) {
          errors.push(`ورقة الأصناف، الصف ${row.rowNumber}: معرف التصنيف غير موجود في النظام أو الملف.`);
          continue;
        }
        if (!categoryId) {
          const categoryCandidates = [row.categoryAr, row.categoryEn].filter(Boolean).map((name) => categoryByName.get(catalogSingleNameKey(name!)));
          const resolved = categoryCandidates.find(Boolean);
          if (!resolved || categoryCandidates.some((candidate) => candidate === null)) {
            errors.push(`ورقة الأصناف، الصف ${row.rowNumber}: تعذر تحديد تصنيف الصنف بشكل فريد.`);
            continue;
          }
          categoryId = resolved.id;
        }

        const key = `${categoryId}|${catalogNameKey(row.nameAr, row.nameEn)}`;
        const existing = row.id ? productById.get(row.id) : productByKey.get(key);
        if (row.id && !existing) {
          errors.push(`ورقة الأصناف، الصف ${row.rowNumber}: معرف الصنف غير موجود في النظام.`);
          continue;
        }
        if (!row.id && existing === null) {
          errors.push(`ورقة الأصناف، الصف ${row.rowNumber}: اسم الصنف مكرر داخل نفس التصنيف.`);
          continue;
        }

        const saved = existing
          ? await transaction.product.update({
              where: { id: existing.id },
              data: {
                categoryId,
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                description: row.description || null,
                imageUrl: row.imageUrl || null,
                isActive: row.isActive,
                isFeatured: row.isFeatured,
                sortOrder: row.sortOrder,
              },
            })
          : await transaction.product.create({
              data: {
                categoryId,
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                description: row.description || null,
                imageUrl: row.imageUrl || null,
                isActive: row.isActive,
                isFeatured: row.isFeatured,
                sortOrder: row.sortOrder,
              },
            });

        productById.set(saved.id, saved);
        productByKey.set(key, saved);
        for (const name of [saved.nameAr, saved.nameEn]) productByName.set(catalogSingleNameKey(name), saved);
        if (existing) productsUpdated += 1;
        else productsCreated += 1;
      }

      const existingSizes = await transaction.productSize.findMany({
        select: { id: true, productId: true, nameAr: true, nameEn: true },
      });
      const sizeById = new Map(existingSizes.map((size) => [size.id, size]));
      const sizeByKey = new Map<string, (typeof existingSizes)[number]>();
      for (const size of existingSizes) {
        sizeByKey.set(`${size.productId}|${catalogNameKey(size.nameAr, size.nameEn)}`, size);
      }

      for (const row of catalog.sizes) {
        let product = row.productId ? productById.get(row.productId) : undefined;
        if (row.productId && !product) {
          errors.push(`ورقة المقاسات، الصف ${row.rowNumber}: معرف الصنف غير موجود في النظام أو الملف.`);
          continue;
        }
        if (!product) {
          const candidates = [row.productAr, row.productEn].filter(Boolean).map((name) => productByName.get(catalogSingleNameKey(name!)));
          const resolved = candidates.find(Boolean);
          if (!resolved || candidates.some((candidate) => candidate === null)) {
            errors.push(`ورقة المقاسات، الصف ${row.rowNumber}: تعذر تحديد الصنف بشكل فريد.`);
            continue;
          }
          product = resolved;
        }

        const existing = row.id ? sizeById.get(row.id) : sizeByKey.get(`${product.id}|${catalogNameKey(row.nameAr, row.nameEn)}`);
        if (row.id && (!existing || existing.productId !== product.id)) {
          errors.push(`ورقة المقاسات، الصف ${row.rowNumber}: معرف المقاس غير موجود أو لا ينتمي إلى الصنف المحدد.`);
          continue;
        }
        const saved = existing
          ? await transaction.productSize.update({
              where: { id: existing.id },
              data: {
                productId: product.id,
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                price: row.priceMinor,
                isActive: row.isActive,
                sortOrder: row.sortOrder,
              },
            })
          : await transaction.productSize.create({
              data: {
                productId: product.id,
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                price: row.priceMinor,
                isActive: row.isActive,
                sortOrder: row.sortOrder,
              },
            });
        sizeById.set(saved.id, saved);
        sizeByKey.set(`${product.id}|${catalogNameKey(row.nameAr, row.nameEn)}`, saved);
        if (existing) sizesUpdated += 1;
        else sizesCreated += 1;
      }

      if (errors.length > 0) throw new CatalogImportValidationError(errors);

      return {
        categoriesCreated,
        categoriesUpdated,
        productsCreated,
        productsUpdated,
        sizesCreated,
        sizesUpdated,
      };
    });

    revalidatePath('/admin/menu');
    revalidatePath('/');
    revalidatePath('/pos');
    return { success: true, data: summary };
  } catch (error) {
    if (error instanceof CatalogImportValidationError) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }
    return toActionFailure(error);
  }
}



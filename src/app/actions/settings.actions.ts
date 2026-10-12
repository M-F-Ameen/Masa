'use server';

import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { UpdateSettingsUseCase } from '../../application/settings/use-cases/update-settings.use-case';
import { UpdateSettingsDto } from '../../application/settings/dto/settings.dto';
import { ActionResult, toActionFailure } from './action-result';
import { SessionService } from '../../infrastructure/auth/session.service';
import { PermissionCode } from '../../domain/staff/enums/permission.enum';
import { ValidationError } from '../../domain/shared/errors/domain-error';
import { detectImageType } from '../../infrastructure/uploads/image-signature';
import { prisma } from '../../infrastructure/db/prisma';

export type SettingsActionResultData = {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string | null;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxRatePercent: number;
  deliveryFee: number;
  phone?: string | null;
  address?: string | null;
};

export async function updateSettingsAction(formData: UpdateSettingsDto): Promise<ActionResult<SettingsActionResultData>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_SETTINGS);
    const useCase = new UpdateSettingsUseCase();
    const settings = await useCase.execute(formData);
    revalidatePath('/admin/settings');
    revalidatePath('/admin');
    revalidatePath('/admin', 'layout');

    return {
      success: true,
      data: {
        id: settings.id,
        nameAr: settings.nameAr,
        nameEn: settings.nameEn,
        logoUrl: settings.logoUrl,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        locale: settings.locale,
        taxRatePercent: Number(settings.taxRatePercent),
        deliveryFee: settings.deliveryFee,
        phone: settings.phone,
        address: settings.address,
      },
    };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function uploadRestaurantLogoAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    await SessionService.requirePermission(PermissionCode.MANAGE_SETTINGS);

    const file = formData.get('file');
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      throw new ValidationError('Please select a valid logo image.');
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
    if (!file.type || !allowedMimeTypes.has(file.type.toLowerCase())) {
      throw new ValidationError('Unsupported logo format. Use JPEG, PNG, WEBP, or AVIF.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('Logo file is too large. The maximum size is 5 MB.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = detectImageType(buffer);
    if (!extension) {
      throw new ValidationError('The uploaded file is not a valid image.');
    }

    const settings = await prisma.restaurantSetting.findFirst({
      select: { id: true, logoUrl: true },
    });
    if (!settings) {
      throw new ValidationError('Restaurant settings are not available to save the logo.');
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const fileName = `restaurant-logo_${crypto.randomUUID()}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const logoUrl = `/uploads/branding/${fileName}`;
    await fs.promises.writeFile(filePath, buffer);

    try {
      await prisma.restaurantSetting.update({
        where: { id: settings.id },
        data: { logoUrl },
      });
    } catch (error) {
      await fs.promises.unlink(filePath).catch(() => undefined);
      throw error;
    }

    if (settings.logoUrl?.startsWith('/uploads/branding/')) {
      await fs.promises.unlink(path.join(uploadDir, path.basename(settings.logoUrl))).catch(() => undefined);
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin', 'layout');
    return { success: true, data: { url: logoUrl } };
  } catch (error) {
    return toActionFailure(error);
  }
}

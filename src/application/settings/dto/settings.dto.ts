import { z } from 'zod';

export const updateSettingsSchema = z.object({
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  nameAr: z.string().min(2, 'اسم المطعم بالعربية مطلوب'),
  nameEn: z.string().min(2, 'اسم المطعم بالإنجليزية مطلوب'),
  currency: z.string().length(3, 'كود العملة يجب أن يكون 3 أحرف معيارية (ISO 4217)').toUpperCase(),
  currencySymbol: z.string().min(1, 'رمز العملة مطلوب'),
  locale: z.string().min(2, 'اللغة وتنسيق الأرقام مطلوب'),
  taxRatePercent: z.number().min(0).max(100, 'نسبة الضريبة يجب أن تكون بين 0 و 100'),
  deliveryFee: z.number().int().min(0, 'رسوم التوصيل يجب أن تكون أكبر من أو تساوي صفر'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;

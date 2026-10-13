import { z } from 'zod';

const itemSchema = z.object({
  productId: z.string().uuid(),
  sizeId: z.string().uuid(),
  modifierIds: z.array(z.string().uuid()).max(50).refine((ids) => new Set(ids).size === ids.length, 'الإضافات مكررة').default([]),
  quantity: z.number().int().min(1).max(99),
});

export const findPhoneCustomerSchema = z.string().trim().min(5).max(32);

export const createPhoneOrderSchema = z.object({
  branchId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  type: z.enum(['DELIVERY', 'TAKEAWAY']),
  customerName: z.string().trim().min(2, 'اسم العميل مطلوب').max(120),
  customerPhone: z.string().trim().min(5).max(32),
  addressId: z.string().uuid().optional(),
  area: z.string().trim().max(120).optional(),
  street: z.string().trim().max(160).optional(),
  building: z.string().trim().max(40).optional(),
  floor: z.string().trim().max(40).optional(),
  apartment: z.string().trim().max(40).optional(),
  landmark: z.string().trim().max(160).optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  customerNotes: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1, 'أضف صنفاً واحداً على الأقل').max(100),
}).superRefine((value, ctx) => {
  if (value.type === 'DELIVERY' && !value.addressId) {
    if (!value.area) ctx.addIssue({ code: 'custom', path: ['area'], message: 'المنطقة أو الحي مطلوب' });
    if (!value.street) ctx.addIssue({ code: 'custom', path: ['street'], message: 'اسم الشارع مطلوب' });
  }
  if (new Set(value.items.map((item) => `${item.productId}:${item.sizeId}:${item.modifierIds.slice().sort().join(',')}`)).size !== value.items.length) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'عدّل كمية الصنف المكرر بدلاً من إضافته مرة أخرى' });
  }
});

export type CreatePhoneOrderDto = z.infer<typeof createPhoneOrderSchema>;

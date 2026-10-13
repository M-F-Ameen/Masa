'use server';

import { revalidatePath } from 'next/cache';
import { FindCustomerByPhoneUseCase } from '../../application/customers/use-cases/find-customer-by-phone.use-case';
import { CreatePhoneOrderDto, createPhoneOrderSchema, findPhoneCustomerSchema } from '../../application/pos/dto/phone-order.dto';
import { CreatePhoneOrderUseCase } from '../../application/pos/use-cases/create-phone-order.use-case';
import { PermissionCode } from '../../domain/staff/enums/permission.enum';
import { BranchContextService } from '../../infrastructure/auth/branch-context.service';
import { SessionService } from '../../infrastructure/auth/session.service';
import { ActionResult, toActionFailure } from './action-result';

export interface PhoneCustomerMatch {
  customer: { id: string; fullName: string; phone: string } | null;
  addresses: Array<{
    id: string;
    title: string;
    city: string;
    area: string;
    street: string;
    addressText: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    landmark: string | null;
    deliveryNotes: string | null;
    isDefault: boolean;
  }>;
}

export interface PhoneOrderCreated {
  id: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  locale: string;
}

export async function findPhoneCustomerAction(rawPhone: string): Promise<ActionResult<PhoneCustomerMatch>> {
  try {
    await SessionService.requirePermission(PermissionCode.POS_ACCESS);
    const phone = findPhoneCustomerSchema.parse(rawPhone);
    const match = await new FindCustomerByPhoneUseCase().execute(phone);
    return {
      success: true,
      data: {
        customer: match ? { id: match.id, fullName: match.fullName, phone: match.phone } : null,
        addresses: match?.addresses.map(({ id, title, city, area, street, building, floor, apartment, landmark, deliveryNotes, isDefault }) => ({
          id, title, city, area, street, addressText: area ? null : street, building, floor, apartment, landmark, deliveryNotes, isDefault,
        })) ?? [],
      },
    };
  } catch (error) { return toActionFailure(error); }
}

export async function createPhoneOrderAction(input: CreatePhoneOrderDto): Promise<ActionResult<PhoneOrderCreated>> {
  try {
    const session = await SessionService.requirePermission(PermissionCode.POS_ACCESS);
    const validated = createPhoneOrderSchema.parse(input);
    const branchId = await BranchContextService.assertBranchAccess(session, validated.branchId);
    const order = await new CreatePhoneOrderUseCase().execute({ ...validated, branchId }, session.userId);
    revalidatePath('/pos');
    revalidatePath('/pos/phone-orders');
    revalidatePath('/admin/kitchen');
    revalidatePath('/admin/orders');
    return { success: true, data: order };
  } catch (error) { return toActionFailure(error); }
}

import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/db/prisma';
import { PrismaPosTransaction } from '../../../infrastructure/pos/prisma-pos-transaction';
import { PhoneNumber } from '../../../domain/customers/value-objects/phone-number';
import { Money } from '../../../domain/shared/value-objects/money';
import { NotFoundError, ValidationError } from '../../../domain/shared/errors/domain-error';
import { OrderNumberService } from '../../../domain/ordering/services/order-number.service';
import { OrderPricingService } from '../../../domain/ordering/services/order-pricing.service';
import { OrderSource, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../../../domain/ordering/enums';
import { PosResolvedLine } from '../../../domain/pos/contracts/pos.repository';
import { PosSaleService } from '../../../domain/pos/services/pos-sale.service';
import { MatchOrCreateCustomerUseCase } from '../../customers/use-cases/match-or-create-customer.use-case';
import { CreatePhoneOrderDto, createPhoneOrderSchema } from '../dto/phone-order.dto';

export class CreatePhoneOrderUseCase {
  public async execute(input: CreatePhoneOrderDto, cashierId: string) {
    const validated = createPhoneOrderSchema.parse(input);
    const phone = PhoneNumber.fromString(validated.customerPhone);

    const replay = await prisma.order.findUnique({ where: { posIdempotencyKey: validated.idempotencyKey } });
    if (replay) {
      if (replay.source !== OrderSource.PHONE || replay.createdById !== cashierId) {
        throw new ValidationError('مفتاح العملية مستخدم لطلب آخر؛ أعد المحاولة');
      }
      const settings = await prisma.restaurantSetting.findFirst({ select: { currency: true, locale: true } });
      if (!settings) throw new NotFoundError('إعدادات المطعم غير مهيأة');
      return { id: replay.id, orderNumber: replay.orderNumber, totalMinor: replay.totalMinor, currency: replay.currency ?? settings.currency, locale: settings.locale };
    }

    return prisma.$transaction(async (tx) => {
      const setting = await tx.restaurantSetting.findFirst();
      if (!setting) throw new NotFoundError('إعدادات المطعم غير مهيأة');
      const branch = await tx.branch.findFirst({ where: { id: validated.branchId, isActive: true }, select: { id: true } });
      if (!branch) throw new NotFoundError('الفرع غير متاح حالياً');

      const existing = await tx.order.findUnique({ where: { posIdempotencyKey: validated.idempotencyKey } });
      if (existing) {
        if (existing.source !== OrderSource.PHONE || existing.createdById !== cashierId) {
          throw new ValidationError('مفتاح العملية مستخدم لطلب آخر؛ أعد المحاولة');
        }
        return { id: existing.id, orderNumber: existing.orderNumber, totalMinor: existing.totalMinor, currency: existing.currency ?? setting.currency, locale: setting.locale };
      }

      const isDelivery = validated.type === OrderType.DELIVERY;
      const selectedAddress = validated.addressId
        ? await tx.customerAddress.findFirst({ where: { id: validated.addressId, customer: { phone: phone.value } } })
        : null;
      if (validated.addressId && !selectedAddress) throw new ValidationError('العنوان المحدد لا يخص هذا العميل');

      const customerResult = await new MatchOrCreateCustomerUseCase().execute({
        phone: phone.value,
        fullName: validated.customerName,
      }, tx);

      let chosenAddress = selectedAddress ?? customerResult.address;
      if (isDelivery && !chosenAddress && validated.addressText) {
        const existingFreeformAddress = await tx.customerAddress.findFirst({
          where: { customerId: customerResult.customer.id, area: '', street: validated.addressText },
        });
        chosenAddress = existingFreeformAddress ?? await tx.customerAddress.create({
          data: {
            customerId: customerResult.customer.id,
            title: 'عنوان التوصيل',
            city: '',
            area: '',
            street: validated.addressText,
            deliveryNotes: validated.deliveryNotes ?? null,
            isDefault: (await tx.customerAddress.count({ where: { customerId: customerResult.customer.id } })) === 0,
          },
        });
      }
      if (isDelivery && !chosenAddress) throw new ValidationError('أدخل عنوان التوصيل');

      const products = await new PrismaPosTransaction(tx).getProducts(validated.branchId, [...new Set(validated.items.map((item) => item.productId))]);
      if (products.length !== new Set(validated.items.map((item) => item.productId)).size) {
        throw new ValidationError('يوجد صنف غير متاح حالياً في هذا الفرع');
      }
      const lines: PosResolvedLine[] = validated.items.map((item) => PosSaleService.resolveLine(item, products, setting.currency));
      const pricingItems = lines.map((line) => ({
        unitPrice: Money.fromMinor(line.unitPriceMinor, setting.currency),
        quantity: line.quantity,
        modifierDeltas: line.modifiers.map((modifier) => Money.fromMinor(modifier.priceDeltaMinor, setting.currency)),
      }));
      const deliveryFee = isDelivery ? Money.fromMinor(setting.deliveryFee, setting.currency) : Money.zero(setting.currency);
      const pricing = OrderPricingService.calculate(pricingItems, deliveryFee, Number(setting.taxRatePercent));
      if (pricing.total.amount <= 0 || pricing.total.amount > 2147483647) throw new ValidationError('إجمالي الطلب غير صالح');

      const orderNumber = await OrderNumberService.getNextOrderNumber(tx);
      const addressSummary = isDelivery && chosenAddress
        ? !selectedAddress && validated.addressText
          ? validated.addressText
          : [chosenAddress.city, chosenAddress.area, chosenAddress.street,
            chosenAddress.building ? `عمارة ${chosenAddress.building}` : null,
            chosenAddress.floor ? `طابق ${chosenAddress.floor}` : null,
            chosenAddress.apartment ? `شقة ${chosenAddress.apartment}` : null,
            chosenAddress.landmark ? `علامة: ${chosenAddress.landmark}` : null]
          .filter(Boolean).join('، ')
        : 'استلام من الفرع';

      const order = await tx.order.create({
        data: {
          orderNumber,
          posIdempotencyKey: validated.idempotencyKey,
          customerId: customerResult.customer.id,
          branchId: branch.id,
          cashierId,
          createdById: cashierId,
          source: OrderSource.PHONE,
          type: validated.type,
          status: OrderStatus.PREPARING,
          kitchenStartedAt: new Date(),
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.CASH,
          currency: setting.currency,
          subtotalMinor: pricing.subtotal.amount,
          deliveryFeeMinor: pricing.deliveryFee.amount,
          taxRatePercent: setting.taxRatePercent,
          taxMinor: pricing.tax.amount,
          discountMinor: pricing.discount.amount,
          totalMinor: pricing.total.amount,
          customerName: validated.customerName,
          customerPhone: phone.value,
          deliveryAddress: addressSummary,
          deliveryNotes: isDelivery
            ? (selectedAddress ? chosenAddress?.deliveryNotes : validated.deliveryNotes ?? chosenAddress?.deliveryNotes) ?? null
            : null,
          customerNotes: validated.customerNotes ?? null,
          items: { create: lines.map(({ modifiers, ...line }) => ({
            productId: line.productId,
            sizeId: line.sizeId,
            productNameAr: line.productNameAr,
            productNameEn: line.productNameEn,
            sizeNameAr: line.sizeNameAr,
            sizeNameEn: line.sizeNameEn,
            unitPriceMinor: line.unitPriceMinor,
            quantity: line.quantity,
            totalPriceMinor: line.totalPriceMinor,
            modifiers: { create: modifiers.map((modifier) => ({
              modifierId: modifier.modifierId,
              nameAr: modifier.nameAr,
              nameEn: modifier.nameEn,
              priceDeltaMinor: modifier.priceDeltaMinor,
            })) },
          })) },
        },
      });

      await tx.customer.update({ where: { id: customerResult.customer.id }, data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: pricing.total.amount },
        lastOrderAt: new Date(),
      } });

      await new PrismaPosTransaction(tx).deductInventoryForSale(
        { branchId: branch.id, cashierId, canDiscount: false }, order.id, order.orderNumber, lines
      );

      return { id: order.id, orderNumber: order.orderNumber, totalMinor: order.totalMinor, currency: setting.currency, locale: setting.locale };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }).catch(async (error: unknown) => {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
      if (code !== 'P2002') throw error;
      const concurrentReplay = await prisma.order.findUnique({ where: { posIdempotencyKey: validated.idempotencyKey } });
      if (!concurrentReplay || concurrentReplay.source !== OrderSource.PHONE || concurrentReplay.createdById !== cashierId) throw error;
      const settings = await prisma.restaurantSetting.findFirst({ select: { currency: true, locale: true } });
      if (!settings) throw new NotFoundError('إعدادات المطعم غير مهيأة');
      return {
        id: concurrentReplay.id,
        orderNumber: concurrentReplay.orderNumber,
        totalMinor: concurrentReplay.totalMinor,
        currency: concurrentReplay.currency ?? settings.currency,
        locale: settings.locale,
      };
    });
  }
}

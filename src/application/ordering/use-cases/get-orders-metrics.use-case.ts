import { prisma } from '../../../infrastructure/db/prisma';
import { OrderSource, OrderStatus } from '../../../domain/ordering/enums';
import { Prisma } from '@prisma/client';
import { getCairoTodayRange } from '../../../domain/shared/utils/date-range';

export class GetOrdersMetricsUseCase {
  public async execute(branchId?: string, source: OrderSource = OrderSource.ONLINE) {
    const branchFilter: Prisma.OrderWhereInput =
      branchId && branchId !== 'ALL'
        ? branchId === 'UNASSIGNED'
          ? { branchId: null }
          : { branchId }
        : {};

    branchFilter.source = source;
    const { startOfToday, endOfToday } = getCairoTodayRange();

    const [pendingCount, preparingCount, inDeliveryCount, deliveredTodayCount, todaySalesAggregate] =
      await Promise.all([
        prisma.order.count({
          where: {
            ...branchFilter,
            status: OrderStatus.PENDING,
          },
        }),
        prisma.order.count({
          where: {
            ...branchFilter,
            status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
          },
        }),
        prisma.order.count({
          where: {
            ...branchFilter,
            status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY] },
          },
        }),
        prisma.order.count({
          where: {
            ...branchFilter,
            status: OrderStatus.DELIVERED,
            createdAt: { gte: startOfToday, lte: endOfToday },
          },
        }),
        prisma.order.aggregate({
          where: {
            ...branchFilter,
            status: OrderStatus.DELIVERED,
            createdAt: { gte: startOfToday, lte: endOfToday },
          },
          _sum: {
            totalMinor: true,
          },
        }),
      ]);

    return {
      pendingCount,
      preparingCount,
      inDeliveryCount,
      deliveredTodayCount,
      todaySalesMinor: todaySalesAggregate._sum.totalMinor ?? 0,
    };
  }
}

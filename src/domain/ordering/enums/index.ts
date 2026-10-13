/**
 * Order Lifecycle Statuses
 */
export enum OrderStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/**
 * Order Origin Source
 */
export enum OrderSource {
  ONLINE = 'ONLINE',
  POS = 'POS',
  PHONE = 'PHONE',
}

/**
 * Fulfillment Type
 */
export enum OrderType {
  DELIVERY = 'DELIVERY',
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
}

/**
 * Payment Statuses
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Supported Payment Methods
 */
export enum PaymentMethod {
  MIXED = 'MIXED',
  CASH = 'CASH',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

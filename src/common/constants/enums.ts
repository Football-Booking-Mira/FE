// Trạng thái booking
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_USE: "in_use",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

// Trạng thái thanh toán
export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
  REFUNDED: "refunded",
} as const;

// Phương thức thanh toán
export const PAYMENT_METHOD = {
  CASH: "cash",
  TRANSFER: "transfer",
  ZALOPAY: "zalopay",
  VNPAY: "vnpay",
  QR: "qr",
} as const;

// (tuỳ, nếu muốn type cho đẹp)
export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Mã giảm giá (Voucher)
export const DISCOUNT_TYPES = {
  PERCENT: "percent",
  AMOUNT: "amount",
} as const;

export const VOUCHER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];
export type VoucherStatus =
  (typeof VOUCHER_STATUS)[keyof typeof VOUCHER_STATUS];

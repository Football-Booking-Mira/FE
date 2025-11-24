// Trạng thái booking
export const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_USE: 'in_use',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no_show',
} as const;

// Trạng thái thanh toán
export const PAYMENT_STATUS = {
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
    REFUNDED: 'refunded',
} as const;

// Phương thức thanh toán
export const PAYMENT_METHOD = {
    CASH: 'cash',
    TRANSFER: 'transfer',
    MOMO: 'momo',
    VNPAY: 'vnpay',
    QR: 'qr',
} as const;

// (tuỳ, nếu muốn type cho đẹp)
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

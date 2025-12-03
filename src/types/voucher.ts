// Types for voucher statistics and management

export interface VoucherSummary {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountValue?: number;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface VoucherStatsUser {
  _id: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  count: number;
  totalDiscount: number;
}

export interface VoucherStatsBooking {
  _id: string;
  bookingId: {
    _id: string;
    code: string;
    status: string;
  };
  userId: {
    _id: string;
    name?: string;
    phone?: string;
  };
  orderTotal: number;
  discountAmount: number;
  status: "applied" | "restored";
  restoredAt?: string;
}

export interface VoucherStatsPayload {
  totals: {
    issued: number;
    used: number;
    restored: number;
    remaining: number;
    discountGiven: number;
  };
  users: VoucherStatsUser[];
  bookings: VoucherStatsBooking[];
}


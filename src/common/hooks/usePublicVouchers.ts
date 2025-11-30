import { useState, useEffect } from "react";
import api from "@/common/utils/api";

export interface PublicVoucher {
  code: string;
  description: string;
  discountType: "percent" | "amount";
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue: number;
  remainingQuantity: number;
  startDate: string;
  endDate: string;
  applicableCourtTypes: string[];
  timeRestrictions: {
    startHour: number;
    endHour: number;
  } | null;
  discountDisplay: string;
}

export const usePublicVouchers = (limit: number = 20) => {
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/vouchers/public", {
        params: { limit },
      });
      const data = response.data?.data || response.data || [];

      if (data.length === 0) {
        console.warn(" [Frontend] No vouchers returned from API");
      }

      setVouchers(data);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải danh sách voucher!";
      setError(errorMessage);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [limit]);

  return {
    vouchers,
    loading,
    error,
    refetch: fetchVouchers,
  };
};

export default usePublicVouchers;

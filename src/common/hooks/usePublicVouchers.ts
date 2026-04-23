import { useState, useEffect, useRef } from "react";
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

  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RETRIES = 20;

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
      setLoading(false);
      retryRef.current = 0; // Reset retry counter on success
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải danh sách voucher!";

      // Auto retry khi server chưa sẵn sàng (network error)
      const isNetworkError =
        err?.code === "ERR_NETWORK" ||
        err?.message?.includes("Network Error") ||
        !err?.response;

      if (isNetworkError && retryRef.current < MAX_RETRIES) {
        retryRef.current += 1;
        console.log(
          `[Voucher] Đang thử kết nối lại... (lần ${retryRef.current})`
        );
        // Giữ loading = true, không set error khi đang retry
        retryTimerRef.current = setTimeout(() => {
          fetchVouchers();
        }, 3000);
        return; // Không tắt loading, không set error
      }

      setError(errorMessage);
      setVouchers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [limit]);

  return {
    vouchers,
    loading,
    error,
    refetch: fetchVouchers,
  };
};

export default usePublicVouchers;

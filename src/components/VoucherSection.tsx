import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePublicVouchers } from "@/common/hooks/usePublicVouchers";
import { toast } from "sonner";
import { Copy, CheckCircle2, Calendar, Tag } from "lucide-react";

const VoucherSection: React.FC = () => {
  const { vouchers, loading, error } = usePublicVouchers(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
            🎁 Mã Giảm Giá Đang Hot
          </h2>
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-600 border-t-green-500"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải voucher...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error("VoucherSection Error:", error);
    // Hiển thị thông báo lỗi thay vì ẩn
    return (
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Mã Giảm Giá Đang Hot
          </h2>
          <div className="text-center text-red-600">
            Không thể tải voucher. Vui lòng thử lại sau.
          </div>
          <div className="text-center text-sm text-gray-500 mt-2">{error}</div>
        </div>
      </section>
    );
  }

  if (!vouchers || vouchers.length === 0) {
    // Hiển thị thông báo khi không có voucher thay vì ẩn
    return (
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            🎁 Mã Giảm Giá Đang Hot
          </h2>
          <div className="text-center text-gray-600">
            Hiện tại chưa có mã giảm giá nào. Vui lòng quay lại sau!
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Mã Giảm Giá Đang Hot
          </h2>
          <p className="text-gray-600">Sao chép mã và sử dụng khi thanh toán</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {vouchers.map((voucher) => (
            <Card
              key={voucher.code}
              className="overflow-hidden border-2 border-green-200 hover:border-green-400 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Tag className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Còn {voucher.remainingQuantity} lượt
                  </span>
                </div>
                <div className="text-2xl font-bold mb-1">{voucher.code}</div>
                <div className="text-sm opacity-90">
                  {voucher.description || "Mã giảm giá"}
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-green-600">
                      {voucher.discountDisplay}
                    </span>
                  </div>
                  {voucher.minOrderValue > 0 && (
                    <p className="text-xs text-gray-500">
                      Áp dụng cho đơn từ{" "}
                      {voucher.minOrderValue.toLocaleString("vi-VN")}đ
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(voucher.startDate)} -{" "}
                      {formatDate(voucher.endDate)}
                    </span>
                  </div>
                  {voucher.timeRestrictions && (
                    <div className="text-xs text-gray-500">
                      ⏰ Áp dụng: {voucher.timeRestrictions.startHour}:00 -{" "}
                      {voucher.timeRestrictions.endHour}:00
                    </div>
                  )}
                  {voucher.applicableCourtTypes.length > 0 && (
                    <div className="text-xs text-gray-500">
                      🏟️ Áp dụng cho: {voucher.applicableCourtTypes.join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopyCode(voucher.code)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    variant="default"
                  >
                    {copiedCode === voucher.code ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Sao chép mã
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VoucherSection;

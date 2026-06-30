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
      <section className="py-16 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-emerald-100">
              🎁 Ưu đãi
            </span>
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
              Mã Giảm Giá Đang Hot
            </h2>
          </div>
          {/* Skeleton voucher cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="skeleton h-28 rounded-none"></div>
                <div className="p-5 space-y-3">
                  <div className="skeleton h-6 w-1/2 rounded-lg"></div>
                  <div className="skeleton h-4 w-3/4 rounded-lg"></div>
                  <div className="skeleton h-10 w-full rounded-xl mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error("VoucherSection Error:", error);
    // Hiển thị thông báo lỗi thay vì ẩn
    return (
      <section className="py-16 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-800 tracking-tight">
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
      <section className="py-16 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-800 tracking-tight">
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
    <section className="py-16 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-emerald-100">
            🎁 Ưu đãi đặc biệt
          </span>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2 tracking-tight">
            Mã Giảm Giá Đang Hot
          </h2>
          <p className="text-gray-500 font-medium">Sao chép mã và sử dụng khi thanh toán</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {vouchers.map((voucher) => (
            <Card
              key={voucher.code}
              className="ticket-cutout overflow-hidden border border-emerald-100 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 rounded-2xl bg-white"
            >
              {/* Top: Voucher Code & Badge */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 text-white relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10"
                     style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Tag className="w-5 h-5 opacity-80" />
                    <span className="text-[11px] bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                      Còn {voucher.remainingQuantity} lượt
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold tracking-wider mb-1 font-mono">{voucher.code}</div>
                  <div className="text-sm opacity-80 font-medium">
                    {voucher.description || "Mã giảm giá"}
                  </div>
                </div>
              </div>

              {/* Dashed divider */}
              <div className="border-t-2 border-dashed border-emerald-200 mx-5"></div>

              {/* Bottom: Details */}
              <div className="p-5">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                      {voucher.discountDisplay}
                    </span>
                  </div>
                  {voucher.minOrderValue > 0 && (
                    <p className="text-xs text-gray-500 bg-gray-50 inline-block px-2.5 py-1 rounded-lg">
                      Đơn tối thiểu{" "}
                      {voucher.minOrderValue.toLocaleString("vi-VN")}đ
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-5 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {formatDate(voucher.startDate)} –{" "}
                      {formatDate(voucher.endDate)}
                    </span>
                  </div>
                  {voucher.timeRestrictions && (
                    <div className="text-xs text-gray-400 pl-6">
                      ⏰ {voucher.timeRestrictions.startHour}:00 –{" "}
                      {voucher.timeRestrictions.endHour}:00
                    </div>
                  )}
                  {voucher.applicableCourtTypes.length > 0 && (
                    <div className="text-xs text-gray-400 pl-6">
                      🏟️ {voucher.applicableCourtTypes.join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopyCode(voucher.code)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm hover:shadow-md hover:shadow-emerald-600/20 transition-all"
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

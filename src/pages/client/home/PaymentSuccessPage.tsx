

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';


interface CheckoutData {
  courtId?: string;
  courtName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: number;
  name?: string;
  bookingCode?: string;
}

interface RememberMeData {
  email?: string;
  password?: string;
  rememberMe?: boolean;
}

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rspCode = searchParams.get("vnp_ResponseCode");
  const rawAmount = searchParams.get("vnp_Amount");
  const txnRef = searchParams.get("vnp_TxnRef");

  const amount =
    rawAmount && !Number.isNaN(Number(rawAmount)) ? Number(rawAmount) / 100 : 0;
  const isSuccess = rspCode === "00";
  const alreadySent = useRef(false);

  const formattedAmount =
    amount > 0 ? amount.toLocaleString("vi-VN") + " VNĐ" : "—";

  // Lấy checkoutData từ localStorage
  const checkoutData: CheckoutData | null = JSON.parse(
    window.localStorage.getItem("checkout-data") || "null"
  );

  // ✅ Lấy email từ localStorage key 'ĐATHAAHHA'
  const rememberMe: RememberMeData | null = JSON.parse(
    window.localStorage.getItem("ĐATHAAHHA") || "null"
  );

  const emailToSend = rememberMe?.email || null;

  // ================================
  // Gửi email tự động
  // ================================
  useEffect(() => {
    console.log("=== [PaymentResultPage] useEffect gửi email chạy ===");
    console.log("isSuccess:", isSuccess);
    console.log("txnRef:", txnRef);
    console.log("checkoutData:", checkoutData);
    console.log("emailToSend (ĐATHAAHHA):", emailToSend);

    if (!isSuccess) {
      console.log("⛔ Thanh toán không thành công → không gửi email.");
      return;
    }

    if (!checkoutData) {
      console.log("⛔ Không có checkoutData → không gửi email.");
      return;
    }

    if (!emailToSend) {
      console.log("⛔ Không tìm thấy email trong ĐATHAAHHA → không gửi email.");
      return;
    }

    if (alreadySent.current) {
      console.log("⛔ Email đã gửi rồi → ngăn gửi lại.");
      return;
    }

    alreadySent.current = true;

    const payload = {
      email: emailToSend,
      customerName: checkoutData.name || "Khách hàng",
      bookingCode: txnRef || checkoutData.bookingCode || `TEMP-${Date.now()}`,
      courtName: checkoutData.courtName || "N/A",
      date: checkoutData.date || "N/A",
      startTime: checkoutData.startTime || "N/A",
      endTime: checkoutData.endTime || "N/A",
      total: checkoutData.totalPrice || 0,
    };

    const sendEmail = async () => {
      const API_URL = "http://localhost:3000/api/email/payment-success";
      console.log("📩 Chuẩn bị gửi email...");
      console.log("Payload gửi đi:", payload);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("📥 Response status:", res.status);

<<<<<<< HEAD
        const data = await res.json().catch(() => {
          console.log("❗ Không parse được JSON từ backend!");
          return { message: "Không có JSON trả về!" };
        });
=======
                    {/* Thông tin đơn hàng */}
                    <div className='text-left text-sm text-gray-700 mb-6 space-y-1'>
                        <p>
                            <span className='font-medium'>Mã đơn hàng:</span>{' '}
                            <span>{txnRef || '—'}</span>
                        </p>
                        <p>
                            <span className='font-medium'>Số tiền:</span>{' '}
                            <span>{formattedAmount}</span>
                        </p>
                    </div>
>>>>>>> 68aec3ae45b3c21fa2fd780b8d97131fe48ec6d6

        console.log("📥 Response JSON:", data);

<<<<<<< HEAD
        if (res.status === 200) {
          toast.success("Email xác nhận đã được gửi thành công!");
        } else {
          toast.error(data.message || "Gửi email thất bại!");
        }
      } catch (err) {
        console.error("🔥 Lỗi khi gọi API gửi email:", err);
        toast.error("Có lỗi xảy ra khi gửi email!");
      }
    };

    sendEmail();
  }, [checkoutData, txnRef, emailToSend]);

  const handleRetryBooking = () => {
    if (checkoutData?.courtId) {
      navigate(`/pitch/${checkoutData.courtId}`);
    } else {
      navigate("/booking");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6
              ${isSuccess ? "bg-green-100" : "bg-red-100"}`}
          >
            {isSuccess ? (
              <CheckCircle className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {isSuccess ? "Đặt Sân Thành Công" : "Thanh Toán Không Thành Công"}
          </h1>

          <p className="text-gray-600 mb-6">
            {isSuccess
              ? "Cảm ơn bạn đã đặt sân. Chúc bạn có trận đấu vui vẻ!"
              : "Giao dịch không thành công. Vui lòng thử lại!"}
          </p>

          <div className="text-left text-sm text-gray-700 mb-6 space-y-1">
            <p>
              <span className="font-medium">Mã đơn hàng:</span>{" "}
              <span>{txnRef || checkoutData?.bookingCode || "—"}</span>
            </p>
            <p>
              <span className="font-medium">Số tiền:</span>{" "}
              <span>{formattedAmount}</span>
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              <span>{emailToSend || "—"}</span>
            </p>
          </div>

          <div className="space-y-3">
            {isSuccess ? (
              <button
                onClick={() => navigate("/my-bookings")}
                className="w-full px-6 py-3 !mb-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Xem Chi Tiết
              </button>
            ) : (
              <button
                onClick={handleRetryBooking}
                className="w-full px-6 py-3 !mb-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Đặt Lại Sân
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Về Trang Chủ
            </button>
          </div>
=======
                        {/* Nút VỀ ĐƠN ĐẶT SÂN – nền xanh nhạt, hover full xanh */}
          <Button
            variant='outline'
            onClick={() => navigate('/my-bookings')}
            className='w-full px-6 py-3 rounded-lg border-green-500 text-green-600 bg-green-50
                   hover:bg-green-500 hover:text-white transition-colors'
          >
            Về đơn đặt sân
          </Button>

          <button
            onClick={() => navigate('/')}
            className='w-full px-6 py-3 rounded-lg bg-slate-100 text-slate-700 font-medium
                   hover:bg-slate-200 hover:text-slate-900 transition-colors'
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    </div>
>>>>>>> 68aec3ae45b3c21fa2fd780b8d97131fe48ec6d6
        </div >
      </div >
    </div >
  );
};

export default PaymentResultPage;

import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';


interface CheckoutData {
  courtId?: string;
  courtName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: number;
}

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const method = searchParams.get('method');
  const status = searchParams.get('status');
  const rspCode = searchParams.get('vnp_ResponseCode') || status;
  const rawAmount = searchParams.get('vnp_Amount') || searchParams.get('amount');
  const txnRef = searchParams.get('orderId') || searchParams.get('vnp_TxnRef');

  // Thanh toán VNPay sends amount * 100, ZaloPay sends raw amount
  const amount = rawAmount
    ? (method === 'zalopay' ? Number(rawAmount) : Number(rawAmount) / 100)
    : 0;

  const isSuccess = rspCode === '00' || rspCode === '0';
  const formattedAmount = amount > 0 ? amount.toLocaleString('vi-VN') + ' VNĐ' : '—';

  // Lấy lại thông tin checkout cuối cùng (để quay lại đúng sân)
  const checkoutData: CheckoutData | null = JSON.parse(
    window.localStorage.getItem('checkout-data') || 'null'
  );

  // ⭐ Xóa checkout-data sau khi thanh toán thành công để tránh dùng lại
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        localStorage.removeItem('checkout-data');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleRetryBooking = () => {
    if (checkoutData?.courtId) {
      navigate(`/pitch/${checkoutData.courtId}`);
    } else {
      navigate('/booking');
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors'>
      <div className='max-w-lg w-full'>
        <div className='bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-10 text-center relative overflow-hidden'>
          {/* Trang trí nền */}
          {isSuccess ? (
            <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-green-500 to-emerald-400"></div>
          ) : (
            <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-red-500 to-orange-400"></div>
          )}

          {/* Icon */}
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 mt-4
                        ${isSuccess
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'}`}
          >
            {isSuccess ? (
              <CheckCircle className='w-14 h-14 text-green-600 dark:text-green-400' />
            ) : (
              <XCircle className='w-14 h-14 text-red-600 dark:text-red-400' />
            )}
          </div>

          {/* Tiêu đề */}
          <h1 className='text-3xl font-black text-gray-900 dark:text-gray-100 mb-4 tracking-tight'>
            {isSuccess ? 'Đặt Sân Thành Công' : 'Thanh Toán Thất Bại'}
          </h1>

          <p className='text-gray-500 dark:text-gray-400 mb-8 text-base leading-relaxed'>
            {isSuccess
              ? 'Cảm ơn bạn đã đặt sân. Chúc bạn có trận đấu vui vẻ! ⚽'
              : 'Giao dịch thanh toán chưa hoàn tất hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức khác.'}
          </p>

          {/* Thông tin đơn hàng */}
          <div className='bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-gray-700'>
            <div className='space-y-3 text-left'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-500 dark:text-gray-400 text-sm'>Mã đơn hàng</span>
                <span className='font-mono font-bold text-gray-900 dark:text-gray-100 text-sm'>{txnRef || '—'}</span>
              </div>
              <div className='h-px bg-gray-200 dark:bg-gray-700'></div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-500 dark:text-gray-400 text-sm'>Số tiền</span>
                <span className={`font-black text-lg ${isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formattedAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Nút hành động */}
          <div className='space-y-3'>
            {isSuccess ? (
              <button
                onClick={() => navigate('/my-bookings')}
                className='w-full px-6 py-4 bg-linear-to-r from-green-600 to-emerald-500 text-white font-black rounded-2xl hover:from-green-500 hover:to-emerald-400 transition-all active:scale-[0.98] shadow-xl shadow-green-600/20 text-base'
              >
                Xem Đơn Đặt Sân
              </button>
            ) : (
              <button
                onClick={handleRetryBooking}
                className='w-full px-6 py-4 bg-linear-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl hover:from-orange-400 hover:to-amber-400 transition-all active:scale-[0.98] shadow-xl shadow-orange-500/20 text-base'
              >
                Đặt Lại Sân
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              className='w-full px-6 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold
                   hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all active:scale-[0.98]'
            >
              Về Trang Chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
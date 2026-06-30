import React, { useEffect } from 'react';
import { Check, XCircle, Home, ClipboardList } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
    <div className='min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden'>
      
      {/* Background Celebration Blobs */}
      {isSuccess && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-300/20 rounded-full blur-[100px] opacity-50 animate-pulse delay-700"></div>
        </>
      )}

      <div className='max-w-md md:max-w-lg mx-auto w-full relative z-10'>
        <div className='bg-card rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-border/40 p-10 text-center flex flex-col items-center transition-all'>
          
          {/* Icon */}
          <div className={`relative flex items-center justify-center mb-6 ${isSuccess ? '' : 'bg-destructive/10 rounded-full w-24 h-24'}`}>
            {isSuccess ? (
              <div className="bg-emerald-50 text-emerald-600 rounded-full p-6 shadow-sm">
                <Check className='w-12 h-12 text-emerald-600' strokeWidth={3} />
              </div>
            ) : (
              <XCircle className='w-14 h-14 text-destructive' />
            )}
          </div>

          {/* Title */}
          <h1 className='text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-2'>
            {isSuccess ? 'Đặt Sân Thành Công!' : 'Thanh Toán Thất Bại'}
          </h1>

          {/* Subtitle */}
          <p className='text-sm text-muted-foreground px-6 mb-8'>
            {isSuccess
              ? 'Cảm ơn bạn đã đặt sân. Chúc bạn có trận đấu vui vẻ! ⚽'
              : 'Giao dịch thanh toán chưa hoàn tất hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức khác.'}
          </p>

          {/* Minimalist Order Details */}
          <div className='w-full mb-8 flex flex-col gap-4 text-left px-2'>
            <div className='flex flex-row items-center justify-between'>
              <span className='text-muted-foreground text-sm font-medium'>Mã đơn hàng</span>
              <span className='font-mono text-xs tracking-wider text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/40'>
                {txnRef || '—'}
              </span>
            </div>
            <div className='flex flex-row items-center justify-between'>
              <span className='text-muted-foreground text-sm font-medium'>Số tiền</span>
              <span className={`text-xl font-black ${isSuccess ? 'text-emerald-600' : 'text-destructive'}`}>
                {formattedAmount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='w-full flex flex-col gap-3'>
            {isSuccess ? (
              <>
                <Button 
                  onClick={() => navigate('/my-bookings')}
                  variant="outline"
                  className="w-full py-6 rounded-2xl text-base font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-sm flex items-center justify-center gap-2 group"
                >
                  <ClipboardList className='w-5 h-5 group-hover:scale-110 transition-transform' />
                  Xem Đơn Đặt Sân
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full py-6 rounded-2xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <Home className='w-5 h-5 group-hover:scale-110 transition-transform' />
                  Về Trang Chủ
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleRetryBooking}
                  variant="destructive"
                  className="w-full py-6 rounded-2xl text-base font-semibold hover:-translate-y-0.5 transition-all shadow-md"
                >
                  Đặt Lại Sân
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full py-6 rounded-2xl text-base font-semibold"
                >
                  <Home className='w-5 h-5 mr-2' />
                  Về Trang Chủ
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
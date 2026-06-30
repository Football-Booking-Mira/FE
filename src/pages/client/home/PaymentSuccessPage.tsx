import React, { useEffect } from 'react';
import { Check, XCircle } from 'lucide-react';
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
      
      {isSuccess && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-300/20 rounded-full blur-[100px] opacity-50 animate-pulse delay-700"></div>
        </>
      )}

      <div className='max-w-md w-full relative z-10'>
        <div className='bg-card rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-border/40 p-10 text-center flex flex-col items-center transition-all'>
          
          {/* Icon */}
          <div className={`relative flex items-center justify-center w-24 h-24 mb-6 ${isSuccess ? '' : 'bg-destructive/10 rounded-full'}`}>
            {isSuccess ? (
              <>
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20"></div>
                <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
                  <Check className='w-12 h-12 text-primary' strokeWidth={3} />
                </div>
              </>
            ) : (
              <XCircle className='w-14 h-14 text-destructive' />
            )}
          </div>

          {/* Title */}
          <h1 className='text-2xl font-bold text-foreground tracking-tight mb-2'>
            {isSuccess ? 'Đặt Sân Thành Công' : 'Thanh Toán Thất Bại'}
          </h1>

          {/* Subtitle */}
          <p className='text-sm text-muted-foreground px-6 mb-8'>
            {isSuccess
              ? 'Cảm ơn bạn đã đặt sân. Chúc bạn có trận đấu vui vẻ! ⚽'
              : 'Giao dịch thanh toán chưa hoàn tất hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức khác.'}
          </p>

          {/* Order Details List */}
          <div className='w-full bg-accent/50 rounded-2xl p-5 mb-8 flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm font-medium'>Mã đơn hàng</span>
              <span className='font-mono text-xs font-bold bg-background border border-border/50 px-2.5 py-1 rounded-md text-foreground shadow-sm'>
                {txnRef || '—'}
              </span>
            </div>
            <div className='h-px w-full bg-border/50'></div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm font-medium'>Số tiền</span>
              <span className={`text-xl font-extrabold ${isSuccess ? 'text-primary' : 'text-destructive'}`}>
                {formattedAmount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='w-full flex flex-col gap-3'>
            {isSuccess ? (
              <Button 
                onClick={() => navigate('/my-bookings')}
                variant="default"
                className="w-full py-6 rounded-2xl text-base font-semibold hover:-translate-y-0.5 transition-all shadow-md"
              >
                Xem Đơn Đặt Sân
              </Button>
            ) : (
              <Button 
                onClick={handleRetryBooking}
                variant="destructive"
                className="w-full py-6 rounded-2xl text-base font-semibold hover:-translate-y-0.5 transition-all shadow-md"
              >
                Đặt Lại Sân
              </Button>
            )}

            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full py-6 rounded-2xl text-base font-semibold"
            >
              Về Trang Chủ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
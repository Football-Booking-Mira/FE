import React, { useEffect, useState } from 'react';
import { Check, XCircle, Home, ClipboardList, Copy, CheckSquare, ShieldCheck, HelpCircle, Phone, Calendar, Clock, CreditCard } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

interface SlotItem {
  id: string;
  startTime: string;
  endTime: string;
  price: number;
  fieldName?: string;
}

interface CheckoutData {
  courtId?: string;
  courtName?: string;
  date?: string;
  slots?: SlotItem[];
  totalPrice?: number;
  totalDuration?: number;
  overallStart?: string;
  overallEnd?: string;
  bookingId?: string;
  bookingIds?: string[];
  isMultiBooking?: boolean;
  isRetryPayment?: boolean;
}

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const method = searchParams.get('method');
  const status = searchParams.get('status');
  const rspCode = searchParams.get('vnp_ResponseCode') || status;
  const rawAmount = searchParams.get('vnp_Amount') || searchParams.get('amount');
  const txnRef = searchParams.get('orderId') || searchParams.get('vnp_TxnRef');

  // Load checkout-data once on mount to preserve it during this session
  const [localCheckoutData] = useState<CheckoutData | null>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('checkout-data') || 'null');
    } catch {
      return null;
    }
  });

  const [copied, setCopied] = useState(false);

  // VNPay amount is multiplied by 100, ZaloPay amount is raw
  const amount = rawAmount
    ? (method === 'zalopay' ? Number(rawAmount) : Number(rawAmount) / 100)
    : 0;

  const displayAmount = amount > 0 ? amount : (localCheckoutData?.totalPrice || 0);
  const formattedAmount = displayAmount > 0 ? displayAmount.toLocaleString('vi-VN') + 'đ' : '—';

  const isSuccess = rspCode === '00' || rspCode === '0';

  // Clear checkout-data only on success after a short delay
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        localStorage.removeItem('checkout-data');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleCopyCode = () => {
    if (txnRef) {
      navigator.clipboard.writeText(txnRef);
      setCopied(true);
      toast.success('Đã sao chép mã đơn hàng! 📋', {
        position: 'top-center',
        autoClose: 1500,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetryPayment = () => {
    if (localCheckoutData) {
      const updated = {
        ...localCheckoutData,
        isRetryPayment: true,
      };
      window.localStorage.setItem('checkout-data', JSON.stringify(updated));
      navigate('/checkout');
    } else {
      navigate('/booking');
    }
  };

  const formattedDate = localCheckoutData?.date
    ? dayjs(localCheckoutData.date).format('DD/MM/YYYY')
    : dayjs().format('DD/MM/YYYY');

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decorative Glow Blobs */}
      {isSuccess ? (
        <>
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-md md:max-w-lg mx-auto w-full relative z-10"
      >
        {/* Ticket-style Card Container */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-300">
          
          <div className="p-8 md:p-10 flex flex-col items-center">
            {/* Animated Status Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 120, delay: 0.1 }}
              className="relative mb-6"
            >
              {isSuccess ? (
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                    <Check className="w-10 h-10" strokeWidth={3} />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="absolute inset-0 rounded-full bg-emerald-500/5 -z-10"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                    <XCircle className="w-10 h-10" strokeWidth={2.5} />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="absolute inset-0 rounded-full bg-rose-500/5 -z-10"
                  />
                </div>
              )}
            </motion.div>

            {/* Title & Headline */}
            <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-center`}>
              {isSuccess ? (
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  Đặt Sân Thành Công!
                </span>
              ) : (
                <span className="bg-gradient-to-r from-rose-600 to-amber-500 dark:from-rose-400 dark:to-amber-300 bg-clip-text text-transparent">
                  Thanh Toán Thất Bại
                </span>
              )}
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8 px-4 leading-relaxed">
              {isSuccess
                ? 'Tuyệt vời! Lịch đặt sân của bạn đã được thanh toán và giữ sân thành công. Chúc bạn có trận đấu vui vẻ! ⚽'
                : 'Giao dịch thanh toán chưa hoàn tất hoặc đã bị hủy từ phía khách hàng. Đừng lo lắng, tài khoản của bạn chưa bị trừ tiền.'}
            </p>

            {/* Ticket Information Section */}
            <div className="w-full space-y-4 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-5">
              
              {/* Order Transaction Code */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Mã đơn hàng</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-200 font-bold shadow-sm max-w-[160px] truncate font-mono">
                    {txnRef ? (txnRef.length > 8 ? txnRef.slice(0, 8) : txnRef) : '—'}
                  </span>
                  {txnRef && (
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Sao chép mã đơn"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Court Name */}
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Sân bóng</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm max-w-[200px] text-right">
                  {localCheckoutData?.courtName || 'MIRA Football Court'}
                </span>
              </div>

              {/* Booking Date */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Ngày thi đấu</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </div>

              {/* Time Slots */}
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Khung giờ</span>
                {localCheckoutData?.slots && localCheckoutData.slots.length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {localCheckoutData.slots.map((slot, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                      >
                        {slot.startTime} - {slot.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {localCheckoutData?.overallStart && localCheckoutData?.overallEnd
                      ? `${localCheckoutData.overallStart} - ${localCheckoutData.overallEnd}`
                      : '—'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Perforations Divider */}
          <div className="relative my-1 px-8">
            {/* Left cutout circle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-950 rounded-full -ml-3 border-r border-slate-200/50 dark:border-slate-800/50 z-10 transition-colors" />
            {/* Right cutout circle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-950 rounded-full -mr-3 border-l border-slate-200/50 dark:border-slate-800/50 z-10 transition-colors" />
            {/* Dashed line */}
            <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {/* Bottom Total Paid & Status Area */}
          <div className="p-8 md:p-10 pt-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <div className="flex flex-col text-left">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tổng thanh toán</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {formattedAmount}
                </span>
              </div>
              <div>
                {isSuccess ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đã thanh toán
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <CreditCard className="w-3.5 h-3.5" />
                    Chưa thanh toán
                  </span>
                )}
              </div>
            </div>

            {/* Payment Method / Support Info */}
            <div className="w-full text-center mb-8 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Thanh toán an toàn qua cổng {method ? method.toUpperCase() : 'thanh toán'}</span>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-3">
              {isSuccess ? (
                <>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="w-full sm:flex-1 shrink py-6 rounded-2xl text-base font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm flex items-center justify-center gap-2 group transition-all"
                  >
                    <Home className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                    Về Trang Chủ
                  </Button>
                  <Button
                    onClick={() => navigate('/my-bookings')}
                    className="w-full sm:flex-1 shrink py-6 rounded-2xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 group"
                  >
                    <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Lịch Đặt Sân
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="w-full sm:flex-1 shrink py-6 rounded-2xl text-base font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm flex items-center justify-center gap-2 group transition-all"
                  >
                    <Home className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                    Về Trang Chủ
                  </Button>
                  <Button
                    onClick={handleRetryPayment}
                    className="w-full sm:flex-1 shrink py-6 rounded-2xl text-base font-semibold bg-rose-600 hover:bg-rose-700 text-white hover:-translate-y-0.5 transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 group"
                  >
                    Thử Lại Thanh Toán
                  </Button>
                </>
              )}
            </div>

            {/* Quick Customer Support Details */}
            <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Cần hỗ trợ? Hotline: <span className="font-bold text-slate-600 dark:text-slate-400">1900 6384</span></span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentResultPage;
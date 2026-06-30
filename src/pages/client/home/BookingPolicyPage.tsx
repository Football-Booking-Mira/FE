import React, { useEffect, useState } from 'react';
import { Checkbox, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    Clock,
    ShieldCheck,
    AlertTriangle,
    Footprints,
    CalendarClock,
    Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BookingPolicyPage: React.FC = () => {
    const navigate = useNavigate();
    const [accepted, setAccepted] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('checkout-data');
        if (!stored) {
            message.error('Không tìm thấy thông tin đặt sân, quay lại trang chủ!');
            navigate('/', { replace: true });
            return;
        }
        setReady(true);
    }, [navigate]);

    if (!ready) return null;

    const handleAgree = () => {
        if (!accepted) {
            message.warning('Vui lòng tích vào ô "Tôi đã đọc và đồng ý"');
            return;
        }
        navigate('/checkout');
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className='min-h-screen bg-slate-50 dark:bg-gray-950 py-12 px-4 sm:px-6 transition-all duration-300'>
            <div className='max-w-5xl mx-auto'>

                {/* HEADER */}
                <header className='text-center mb-14'>
                    <h1 className='text-3xl md:text-4xl font-extrabold tracking-tight text-foreground'>
                        Quy định &amp; Nội quy
                    </h1>
                    <p className='text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed'>
                        Để sân chơi luôn chuyên nghiệp và đảm bảo quyền lợi tốt nhất cho bạn,
                        hãy dành 1 phút điểm qua các quy định cốt lõi tại{' '}
                        <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>Sân Bóng Mira</span>.
                    </p>
                </header>

                {/* MAIN GRID */}
                <div className='grid md:grid-cols-2 gap-10'>

                    {/* ── CỘT 1: THANH TOÁN & GIỮ CHỖ ── */}
                    <section className='space-y-8'>
                        {/* Section header */}
                        <div className='flex items-center gap-3'>
                            <span className='h-5 w-1 rounded-full bg-emerald-500 shrink-0' />
                            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
                                Thanh toán &amp; Giữ chỗ
                            </h2>
                        </div>

                        {/* Khách đặt online */}
                        <div className='space-y-3'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <CheckCircle2 className='w-4 h-4 text-emerald-500 shrink-0' />
                                Khách đặt online
                            </h3>
                            <ul className='space-y-2 pl-6'>
                                <li className='flex items-start gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Thanh toán <span className='font-semibold text-foreground'>100%</span> cọc ngay để chốt lịch nhanh nhất.
                                    </span>
                                </li>
                                <li className='flex items-start gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Hệ thống tự động khóa sân ngay sau khi giao dịch thành công.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Khách đặt tại sân */}
                        <div className='space-y-3'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <CheckCircle2 className='w-4 h-4 text-blue-500 shrink-0' />
                                Khách đặt tại sân
                            </h3>
                            <ul className='space-y-2 pl-6'>
                                <li className='flex items-start gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-blue-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Yêu cầu đặt cọc trước <span className='font-semibold text-foreground'>50%</span> tại quầy.
                                    </span>
                                </li>
                                <li className='flex items-start gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-blue-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Phần còn lại hoàn tất trước khi tiếng còi khai cuộc vang lên.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Quy định hủy lịch */}
                        <div className='space-y-3'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <AlertTriangle className='w-4 h-4 text-amber-500 shrink-0' />
                                Quy định hủy lịch
                            </h3>
                            <div className='border border-border rounded-lg overflow-hidden'>
                                <div className='flex items-center justify-between px-4 py-3 bg-background border-b border-border'>
                                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                        <Clock className='w-3.5 h-3.5' />
                                        Trước 6 tiếng
                                    </div>
                                    <Badge variant='outline' className='text-emerald-600 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 font-semibold'>
                                        Hoàn tiền 100%
                                    </Badge>
                                </div>
                                <div className='flex items-center justify-between px-4 py-3 bg-background'>
                                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                        <Clock className='w-3.5 h-3.5' />
                                        Dưới 6 tiếng
                                    </div>
                                    <Badge variant='destructive' className='font-semibold'>
                                        Không hoàn trả
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── CỘT 2: VĂN HÓA & NỘI QUY SÂN ── */}
                    <section className='space-y-8'>
                        {/* Section header */}
                        <div className='flex items-center gap-3'>
                            <span className='h-5 w-1 rounded-full bg-blue-500 shrink-0' />
                            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
                                Văn hóa &amp; Nội quy sân
                            </h2>
                        </div>

                        {/* Giày thi đấu */}
                        <div className='space-y-2'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <Footprints className='w-4 h-4 text-muted-foreground shrink-0' />
                                Giày thi đấu
                            </h3>
                            <p className='text-sm text-muted-foreground leading-relaxed pl-6'>
                                <Badge variant='destructive' className='mr-1.5 text-[10px] font-bold'>NGHIÊM CẤM</Badge>
                                Giày đinh cao (FG/SG).
                            </p>
                            <p className='text-sm text-muted-foreground leading-relaxed pl-6'>
                                <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>YÊU CẦU:</span>{' '}
                                Chỉ sử dụng giày đinh dăm (TF) hoặc chuyên dụng sân cỏ nhân tạo để bảo vệ an toàn cho chính bạn và mặt sân.
                            </p>
                        </div>

                        {/* Check-in & Thời gian */}
                        <div className='space-y-2'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <CalendarClock className='w-4 h-4 text-muted-foreground shrink-0' />
                                Check-in &amp; Thời gian
                            </h3>
                            <p className='text-sm text-muted-foreground leading-relaxed pl-6'>
                                Đến sân trước <span className='font-semibold text-foreground'>10–15 phút</span> để chuẩn bị.
                                Vui lòng kết thúc trận đấu đúng giờ để bàn giao sân cho ca tiếp theo.
                            </p>
                            <p className='text-sm text-muted-foreground leading-relaxed pl-6'>
                                <Badge variant='destructive' className='mr-1.5 text-[10px] font-bold'>LƯU Ý</Badge>
                                Khách đến muộn quá 5 phút so với giờ bắt đầu ca sẽ bị hủy sân và{' '}
                                <span className='font-semibold text-destructive'>không được hoàn tiền</span>.
                            </p>
                        </div>

                        {/* An ninh & Văn hóa */}
                        <div className='space-y-2'>
                            <h3 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                <ShieldCheck className='w-4 h-4 text-muted-foreground shrink-0' />
                                An ninh &amp; Văn hóa
                            </h3>
                            <ul className='space-y-2 pl-6'>
                                <li className='flex items-start gap-2'>
                                    <XCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Giữ gìn vệ sinh chung, không hút thuốc và sử dụng chất kích thích tại sân.
                                    </span>
                                </li>
                                <li className='flex items-start gap-2'>
                                    <XCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
                                    <span className='text-sm text-muted-foreground leading-relaxed'>
                                        Mọi hành vi làm hư hỏng cơ sở vật chất sẽ phải bồi thường theo quy định.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Bảo mật */}
                        <div className='flex items-start gap-3 p-4 rounded-lg border border-border bg-background'>
                            <Lock className='w-4 h-4 text-muted-foreground shrink-0 mt-0.5' />
                            <div>
                                <p className='text-sm font-semibold text-foreground mb-0.5'>Bảo mật 100%</p>
                                <p className='text-sm text-muted-foreground leading-relaxed'>
                                    Mira cam kết bảo mật tuyệt đối thông tin cá nhân. Chúng tôi chỉ sử dụng dữ liệu để xác nhận dịch vụ nhanh chóng nhất.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* FOOTER — Accept & Actions */}
                <div className='mt-14 pt-8 border-t border-border'>
                    <div className='max-w-2xl mx-auto flex flex-col items-center gap-8'>
                        <label className='flex items-center gap-3 cursor-pointer select-none'>
                            <Checkbox
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                            />
                            <span className='text-sm font-medium text-foreground'>
                                Tôi xin chịu trách nhiệm &amp; chấp hành mọi nội quy trên
                            </span>
                        </label>

                        <div className='flex flex-col sm:flex-row gap-4 w-full'>
                            <button
                                onClick={handleBack}
                                className='flex-1 py-3 px-8 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleAgree}
                                className={`flex-1 py-3 px-8 rounded-lg text-sm font-bold transition-all ${
                                    accepted
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/30'
                                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }`}
                            >
                                Đồng ý &amp; Tiếp tục
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BookingPolicyPage;

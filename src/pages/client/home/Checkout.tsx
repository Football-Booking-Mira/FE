import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/common/utils/api';
import { usePublicVouchers, useVoucherValidation } from '@/common/hooks';
import { useAuth } from '@/common/contexts';

interface SlotItem {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number; // phút
}

interface CheckoutData {
    courtId: string;
    courtName: string;
    date: string;
    slots: SlotItem[];

    totalPrice: number; //  tổng thanh toán (sân + thiết bị) nếu có
    totalDuration: number;
    overallStart: string;
    overallEnd: string;

    //  breakdown (nếu có)
    totalFieldPrice?: number; // tiền sân
    equipmentTotal?: number; // tiền thiết bị
    equipmentBySlot?: Record<string, any[]>;

    bookingId?: string;
    bookingIds?: string[];
    isMultiBooking?: boolean;

    startTime?: string;
    endTime?: string;

    isRetryPayment?: boolean;
    total?: number; // fallback legacy
}

const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN');
};

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} VNĐ`;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, userName } = useAuth();

    const [bookingData, setBookingData] = useState<CheckoutData | null>(() => {
        return JSON.parse(window.localStorage.getItem('checkout-data') || 'null');
    });

    // Tổng tiền thực sự sẽ thanh toán (booking mới = tổng đơn, thanh toán lại = còn thiếu)
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [retryInfo, setRetryInfo] = useState<{
        bookingId: string;
        amountToPay: number;
    } | null>(null);

    // Trạng thái Mã giảm giá
    const [voucherInput, setVoucherInput] = useState('');
    const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);

    // nếu không có bookingData thì đá về home
    useEffect(() => {
        if (!bookingData) {
            toast.error('Không có thông tin đặt sân, đang điều hướng về trang chủ...');
            navigate('/');
        }
    }, [bookingData, navigate]);

    if (!bookingData) return null;

    //  DERIVED MONEY (TIỀN SÂN + THIẾT BỊ)
    const fieldMoney = useMemo(() => {
        // ưu tiên totalFieldPrice
        const direct = safeNum(bookingData.totalFieldPrice);
        if (direct > 0) return direct;

        // fallback: tính tổng slot.price
        const fromSlots =
            Array.isArray(bookingData.slots) && bookingData.slots.length > 0
                ? bookingData.slots.reduce((sum, s) => sum + safeNum(s.price), 0)
                : 0;

        return fromSlots;
    }, [bookingData.totalFieldPrice, bookingData.slots]);

    const equipMoney = useMemo(
        () => safeNum(bookingData.equipmentTotal),
        [bookingData.equipmentTotal]
    );

    const computedGrandTotal = useMemo(() => {
        const sum = fieldMoney + equipMoney;
        return sum > 0 ? sum : 0;
    }, [fieldMoney, equipMoney]);

    // base total (trước voucher): ưu tiên totalPrice nếu > 0, fallback = field + equip
    const baseTotal = useMemo(() => {
        if (bookingData.isRetryPayment && retryInfo) return safeNum(retryInfo.amountToPay);

        const direct = safeNum(bookingData.totalPrice ?? bookingData.total);
        if (direct > 0) return direct;

        return computedGrandTotal;
    }, [
        bookingData.isRetryPayment,
        retryInfo,
        bookingData.totalPrice,
        bookingData.total,
        computedGrandTotal,
    ]);

    //  TIME & DURATION
    const totalHours = useMemo(() => {
        const d = safeNum(bookingData.totalDuration);
        if (d > 0) return d / 60;

        const fromSlots =
            Array.isArray(bookingData.slots) && bookingData.slots.length > 0
                ? bookingData.slots.reduce((sum, s) => sum + safeNum(s.duration), 0) / 60
                : 0;

        return fromSlots || 0;
    }, [bookingData.totalDuration, bookingData.slots]);

    const firstSlot = bookingData.slots?.[0];
    const lastSlot =
        bookingData.slots && bookingData.slots.length > 0
            ? bookingData.slots[bookingData.slots.length - 1]
            : undefined;

    const bookingStartTime =
        bookingData.overallStart || firstSlot?.startTime || bookingData.startTime || '06:00';
    const bookingEndTime =
        bookingData.overallEnd || lastSlot?.endTime || bookingData.endTime || '07:00';

    //  Voucher validation hook
    const {
        validating: validatingVoucher,
        voucherResult,
        error: voucherError,
        validateVoucher,
        clearVoucher,
        discountAmount,
        finalTotal,
    } = useVoucherValidation({
        orderTotal: baseTotal,
        courtId: bookingData?.courtId || '',
        bookingDate: bookingData?.date,
        startTime: bookingData?.overallStart || bookingData?.startTime,
    });

    // Public vouchers cho popup chọn mã
    const {
        vouchers: publicVouchers,
        loading: loadingPublicVouchers,
        error: publicVouchersError,
        refetch: refetchPublicVouchers,
    } = usePublicVouchers(20);

    // Prefill thông tin người đặt từ tài khoản hiện tại (localStorage.user)
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (!name) setName(parsed.name || userName || '');
                if (!phone) setPhone(parsed.phone || '');
                if (!email) setEmail(parsed.email || '');
            } else {
                if (!name && userName) setName(userName);
            }
        } catch {
            // bỏ qua
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ĐỌC checkout-data & gọi API thanh toán lại (nếu có)
    useEffect(() => {
        if (!bookingData) return;

        if (bookingData.isRetryPayment && bookingData.bookingId) {
            api.get(`/bookings/${bookingData.bookingId}/retry-payment-info`)
                .then((res) => {
                    const info = res.data.data;
                    setRetryInfo({
                        bookingId: info.bookingId,
                        amountToPay: info.amountToPay,
                    });
                    setTotalAmount(safeNum(info.amountToPay));
                })
                .catch((err) => {
                    const msg = err?.response?.data?.message || 'Không thể thanh toán lại đơn này!';
                    toast.error(msg);

                    // fallback về baseTotal hiện tại
                    setTotalAmount(baseTotal);
                });
        } else {
            // flow đặt sân mới -> mặc định là baseTotal (trước voucher)
            setTotalAmount(baseTotal);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingData]);

    // Cập nhật totalAmount khi có voucher hoặc thay đổi baseTotal
    // Chỉ áp dụng voucher khi tạo booking mới, không phải retry payment
    useEffect(() => {
        if (bookingData?.isRetryPayment) return;

        if (voucherResult && safeNum(finalTotal) > 0) {
            setTotalAmount(safeNum(finalTotal));
        } else {
            setTotalAmount(baseTotal);
        }
    }, [voucherResult, finalTotal, baseTotal, bookingData?.isRetryPayment]);

    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'zalopay'>('vnpay');
    const [isPaying, setIsPaying] = useState(false);

    const [errors, setErrors] = useState<{
        name?: string;
        phone?: string;
        email?: string;
    }>({});

    //  Voucher actions
    const handleApplyVoucher = async (codeFromList?: string, expectedDiscountValue?: number) => {
        const rawCode = (codeFromList ?? voucherInput).trim();
        if (!rawCode) {
            toast.error('Vui lòng chọn mã voucher!');
            return;
        }

        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để sử dụng voucher!');
            return;
        }

        const upperCode = rawCode.toUpperCase();
        await validateVoucher(upperCode, expectedDiscountValue);
        setVoucherInput(upperCode);
    };

    const handleSelectVoucherFromList = async (
        code: string,
        minOrderValue: number,
        discountValue: number
    ) => {
        if (minOrderValue > 0 && baseTotal < minOrderValue) {
            toast.error(
                `❌ Không thể áp dụng voucher "${code}". Đơn của bạn (${new Intl.NumberFormat(
                    'vi-VN'
                ).format(baseTotal)}đ) chưa đủ điều kiện. Đơn tối thiểu: ${new Intl.NumberFormat(
                    'vi-VN'
                ).format(minOrderValue)}đ`
            );
            return;
        }

        await handleApplyVoucher(code, discountValue);
        setVoucherDialogOpen(false);
    };

    const handleRemoveVoucher = () => {
        clearVoucher();
        setVoucherInput('');
        setTotalAmount(baseTotal);
    };

    //  SUBMIT
    const handleSubmit = async () => {
        if (!bookingData) {
            toast.error('Không tìm thấy thông tin đặt sân!');
            return;
        }

        const newErrors: typeof errors = {};

        const nameTrim = name.trim();
        const phoneTrim = phone.trim();
        const emailTrim = email.trim();

        if (!nameTrim) newErrors.name = 'Vui lòng nhập họ và tên';

        if (!phoneTrim) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^\d{10}$/.test(phoneTrim)) {
            newErrors.phone = 'Số điện thoại phải gồm đúng 10 chữ số (0–9)';
        }

        if (!emailTrim) {
            newErrors.email = 'Vui lòng nhập email';
        } else if (!emailRegex.test(emailTrim)) {
            newErrors.email = 'Email không hợp lệ (vd: ten@gmail.com)';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error('Vui lòng nhập đúng thông tin trước khi thanh toán!');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.token || !user?._id) {
            toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!');
            navigate('/signin');
            return;
        }

        // Admin không được đặt sân ở trang khách hàng
        if (user?.role === 'admin') {
            toast.error('Tài khoản quản trị không thể đặt sân ở đây. Vui lòng sử dụng trang quản trị để tạo đơn đặt sân!');
            return;
        }

        try {
            setIsPaying(true);

            // giá trị tạm thời (local snapshot)
            let currentCheckout: CheckoutData = { ...bookingData };
            let bookingId = currentCheckout.bookingId;
            let bookingIds = currentCheckout.bookingIds || [];

            const isRetryCheckout = currentCheckout.isRetryPayment || !!retryInfo;

            // flow đặt sân mới: reset ids
            if (!isRetryCheckout) {
                bookingId = undefined;
                bookingIds = [];
                currentCheckout.bookingId = undefined;
                currentCheckout.bookingIds = [];
                currentCheckout.isMultiBooking = false;
            }

            // tạo booking nếu chưa có
            if (!bookingId) {
                //  totalFieldAmount gửi TIỀN SÂN (không phải grand)
                const totalFieldAmount = fieldMoney;

                //  totalAmountToPay: tổng thanh toán trước voucher (để BE có thể dùng nếu cần)
                const totalAllAmount = computedGrandTotal || baseTotal;

                const resBooking = await api.post('/bookings', {
                    courtId: bookingData.courtId,
                    customerId: user._id,
                    date: bookingData.date,
                    startTime: bookingStartTime,
                    endTime: bookingEndTime,
                    paymentMethod,
                    note: '',
                    customerInfo: {
                        name: nameTrim,
                        phone: phoneTrim,
                        email: emailTrim,
                    },
                    slots: bookingData.slots,

                    //  giữ field cho BE
                    totalFieldAmount,

                    //  gửi thêm để BE muốn dùng thì dùng (không ảnh hưởng nếu BE ignore)
                    equipmentTotal: equipMoney,
                    totalAmount: totalAllAmount,
                    equipmentBySlot: bookingData.equipmentBySlot || undefined,

                    voucherCode: voucherResult?.code || undefined,
                });

                const dataBooking = resBooking.data;
                if (!dataBooking.success) {
                    console.error('Tạo booking thất bại:', dataBooking);
                    toast.error(dataBooking.message || 'Không tạo được đơn đặt sân!');
                    setIsPaying(false);
                    return;
                }

                const created = dataBooking.data;

                if (Array.isArray(created)) {
                    bookingIds = created.map((b: any) => b._id);
                    bookingId = bookingIds[0];

                    // nếu server trả total/fieldAmount thì lấy để sync
                    const totalFromServer = created.reduce(
                        (sum: number, b: any) => sum + safeNum(b.total || b.fieldAmount || 0),
                        0
                    );

                    if (totalFromServer > 0 && currentCheckout.isRetryPayment !== true) {
                        // chỉ sync nếu là flow mới
                        setTotalAmount(totalFromServer);
                    }

                    currentCheckout = {
                        ...currentCheckout,
                        bookingId,
                        bookingIds,
                        isMultiBooking: bookingIds.length > 1,
                    };
                } else {
                    const b = created;
                    bookingId = b._id;

                    currentCheckout = {
                        ...currentCheckout,
                        bookingId,
                        isMultiBooking: false,
                    };
                }

                setBookingData(currentCheckout);
                localStorage.setItem('checkout-data', JSON.stringify(currentCheckout));
            }

            //  VNPay
            if (paymentMethod === 'vnpay') {
                const payAmount = safeNum(totalAmount);

                if (payAmount <= 0) {
                    toast.error('Số tiền thanh toán không hợp lệ!');
                    setIsPaying(false);
                    return;
                }

                const payload: any = {};

                const isRetry = currentCheckout.isRetryPayment === true || !!retryInfo;
                if (isRetry) {
                    payload.isRetryPayment = true;
                    payload.amount = payAmount; // chỉ retry mới gửi amount
                }

                if (currentCheckout.isMultiBooking && bookingIds.length > 0) {
                    payload.bookingIds = bookingIds;
                } else if (bookingId) {
                    payload.bookingId = bookingId;
                }

                try {
                    const res = await api.post('/payment/vnpay/create', payload);
                    const data = res.data;

                    if (!data.success) {
                        const errorMsg = data.message || 'Không tạo được liên kết thanh toán VNPay!';
                        const isVoucherOutOfStock =
                            data.code === 'VOUCHER_OUT_OF_STOCK' ||
                            String(errorMsg).includes('hết lượt');

                        if (isVoucherOutOfStock && voucherResult?.code) {
                            clearVoucher();
                            setVoucherInput('');
                            setTotalAmount(baseTotal);
                            setIsPaying(false);
                            toast.error(
                                `Voucher "${voucherResult.code}" đã hết lượt sử dụng, vui lòng chọn voucher khác.`
                            );
                            return;
                        }

                        setIsPaying(false);
                        toast.error(errorMsg);
                        return;
                    }

                    const paymentUrl = data.paymentUrl || data?.data?.paymentUrl || data?.data?.url;
                    console.log('VNPay response:', data);

                    if (paymentUrl) {
                        toast.success('Đang chuyển tới trang thanh toán VNPay...');
                        window.location.href = paymentUrl;
                    } else {
                        setIsPaying(false);
                        toast.error('Không tạo được liên kết thanh toán VNPay!');
                    }
                    return;
                } catch (error: any) {
                    const errorData = error.response?.data || {};
                    const errorMsg = errorData.message || 'Không tạo được liên kết thanh toán VNPay!';
                    const isVoucherOutOfStock =
                        errorData.code === 'VOUCHER_OUT_OF_STOCK' ||
                        error.response?.status === 409 ||
                        String(errorMsg).includes('hết lượt');

                    if (isVoucherOutOfStock && voucherResult?.code) {
                        clearVoucher();
                        setVoucherInput('');
                        setTotalAmount(baseTotal);
                        setIsPaying(false);
                        toast.error(
                            `Voucher "${voucherResult.code}" đã hết lượt sử dụng, vui lòng chọn voucher khác.`
                        );
                        return;
                    }

                    setIsPaying(false);
                    toast.error(errorMsg);
                    return;
                }

                const paymentUrl = data.paymentUrl || data?.data?.paymentUrl || data?.data?.url;
                console.log('VNPay response:', data);

                if (paymentUrl) {
                    toast.success('Đang chuyển tới trang thanh toán VNPay...');
                    window.location.href = paymentUrl;
                } else {
                    setIsPaying(false);
                    toast.error('Không tạo được liên kết thanh toán VNPay!');
                }
                return;
            }

            //  ZaloPay
            if (paymentMethod === 'zalopay') {
                toast.success('Đặt sân thành công! Đang chuyển hướng đến cổng thanh toán ZaloPay...');
                const createdIds = bookingIds.length > 0 ? bookingIds : [bookingId];
                const paymentRes = await api.post('/payment/zalopay/create', {
                    amount: totalAmount,
                    bookingIds: createdIds,
                });
                
                if (paymentRes.data?.paymentUrl) {
                    window.location.href = paymentRes.data.paymentUrl;
                } else {
                    toast.error('Lỗi khi lấy link thanh toán ZaloPay');
                    navigate('/my-bookings');
                }
                return;
            }
        } catch (err) {
            console.error('Lỗi khi thanh toán:', err);
            toast.error('Có lỗi xảy ra khi thanh toán!');
            setIsPaying(false);
        }
    };

    return (
        <div className='min-h-screen bg-slate-50 dark:bg-gray-950 py-10 px-4'>
            <div className='max-w-6xl mx-auto'>

                {/* PAGE HEADER */}
                <div className='mb-8'>
                    <h1 className='text-3xl font-extrabold tracking-tight text-foreground'>Thanh toán đặt sân</h1>
                    <p className='text-sm text-muted-foreground mt-1'>Kiểm tra thông tin và hoàn tất thanh toán</p>
                </div>

                {/* 2-COLUMN GRID */}
                <div className='grid lg:grid-cols-12 gap-8 items-start'>

                    {/* ── LEFT COLUMN (form + voucher) ── */}
                    <div className='lg:col-span-7 space-y-6'>

                        {/* Thông tin người đặt */}
                        <Card className='border border-border shadow-sm'>
                            <CardContent className='p-6 space-y-4'>
                                <h2 className='text-base font-semibold text-foreground'>Thông tin người đặt</h2>
                                <div className='grid gap-4'>
                                    <div>
                                        <Label htmlFor='name'>Họ và tên</Label>
                                        <Input
                                            id='name'
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (errors.name)
                                                    setErrors((p) => ({ ...p, name: undefined }));
                                            }}
                                            placeholder='Nhập tên'
                                            className={`mt-1 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                                        />
                                        {errors.name && (
                                            <p className='text-sm text-red-500 mt-1'>{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor='phone'>Số điện thoại</Label>
                                        <Input
                                            id='phone'
                                            value={phone}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                if (raw.length <= 10) setPhone(raw);
                                                if (errors.phone)
                                                    setErrors((p) => ({ ...p, phone: undefined }));
                                            }}
                                            placeholder='Nhập số điện thoại 10 số'
                                            className={`mt-1 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                                        />
                                        {errors.phone && (
                                            <p className='text-sm text-red-500 mt-1'>{errors.phone}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor='email'>Email</Label>
                                        <Input
                                            id='email'
                                            type='email'
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email)
                                                    setErrors((p) => ({ ...p, email: undefined }));
                                            }}
                                            placeholder='Nhập email (vd: ten@gmail.com)'
                                            className={`mt-1 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                                        />
                                        {errors.email && (
                                            <p className='text-sm text-red-500 mt-1'>{errors.email}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Voucher - chỉ khi tạo booking mới */}
                        {!bookingData.isRetryPayment && (
                            <Card className='border border-border shadow-sm'>
                                <CardContent className='p-6 space-y-4'>
                                    <h2 className='text-base font-semibold text-foreground'>Mã giảm giá (Voucher)</h2>

                                    {!voucherResult ? (
                                        <div className='space-y-3'>
                                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                                                <p className='text-sm text-muted-foreground'>
                                                    Nhấn nút bên phải để xem danh sách các voucher đang hoạt động và còn hạn, sau đó chọn một mã phù hợp.
                                                </p>

                                                <Dialog
                                                    open={voucherDialogOpen}
                                                    onOpenChange={(open) => {
                                                        setVoucherDialogOpen(open);
                                                        if (open) refetchPublicVouchers();
                                                    }}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            disabled={validatingVoucher}
                                                            className='bg-emerald-600 hover:bg-emerald-700 text-white shrink-0'
                                                        >
                                                            Chọn mã voucher
                                                        </Button>
                                                    </DialogTrigger>

                                                    <DialogContent className='max-w-lg'>
                                                        <DialogHeader>
                                                            <DialogTitle>Chọn mã voucher</DialogTitle>
                                                            <DialogDescription>
                                                                Danh sách các voucher đang hoạt động và còn hạn sử dụng. Chọn một mã để áp dụng cho đơn của bạn.
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        {loadingPublicVouchers ? (
                                                            <p className='text-sm text-muted-foreground py-4 text-center'>Đang tải danh sách voucher...</p>
                                                        ) : publicVouchersError ? (
                                                            <p className='text-sm text-destructive py-4'>{publicVouchersError}</p>
                                                        ) : publicVouchers.length === 0 ? (
                                                            <p className='text-sm text-muted-foreground py-4 text-center'>Hiện tại chưa có voucher nào khả dụng.</p>
                                                        ) : (
                                                            <div className='space-y-3 max-h-80 overflow-y-auto pr-1'>
                                                                {publicVouchers.map((v) => {
                                                                    const isOutOfStock = v.remainingQuantity <= 0;
                                                                    const isMinOrderNotMet =
                                                                        v.minOrderValue > 0 &&
                                                                        baseTotal < v.minOrderValue;
                                                                    const isDisabled = isOutOfStock || isMinOrderNotMet;

                                                                    return (
                                                                        <button
                                                                            key={v.code}
                                                                            type='button'
                                                                            onClick={() =>
                                                                                handleSelectVoucherFromList(
                                                                                    v.code,
                                                                                    v.minOrderValue,
                                                                                    v.discountValue
                                                                                )
                                                                            }
                                                                            disabled={isDisabled}
                                                                            className={`w-full text-left border-2 border-dashed rounded-xl p-4 flex justify-between items-center transition-all ${
                                                                                isDisabled
                                                                                    ? 'border-border opacity-50 cursor-not-allowed bg-muted/30'
                                                                                    : 'border-border hover:border-emerald-500 hover:bg-accent/50 cursor-pointer bg-card'
                                                                            }`}
                                                                        >
                                                                            {/* LEFT: code + meta */}
                                                                            <div className='space-y-1.5 flex-1 min-w-0 mr-4'>
                                                                                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded inline-block ${isDisabled ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                                                    {v.code}
                                                                                </span>
                                                                                {v.description && (
                                                                                    <p className='text-xs text-muted-foreground truncate'>{v.description}</p>
                                                                                )}
                                                                                <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                                                                                    <span>
                                                                                        Còn lại:{' '}
                                                                                        {isOutOfStock ? (
                                                                                            <span className='font-semibold text-destructive'>Hết lượt</span>
                                                                                        ) : (
                                                                                            <span className='font-semibold text-emerald-600 dark:text-emerald-400'>{v.remainingQuantity}</span>
                                                                                        )}
                                                                                    </span>
                                                                                    {v.minOrderValue > 0 && (
                                                                                        <span>
                                                                                            Đơn tối thiểu:{' '}
                                                                                            <span className={`font-semibold ${isMinOrderNotMet ? 'text-destructive' : ''}`}>
                                                                                                {new Intl.NumberFormat('vi-VN').format(v.minOrderValue)} VNĐ
                                                                                            </span>
                                                                                            {isMinOrderNotMet && <span className='ml-1 text-destructive'>(Không đủ)</span>}
                                                                                        </span>
                                                                                    )}
                                                                                    <span>
                                                                                        Hạn:{' '}
                                                                                        <span className='font-semibold'>
                                                                                            {new Date(v.startDate).toLocaleDateString('vi-VN')} - {new Date(v.endDate).toLocaleDateString('vi-VN')}
                                                                                        </span>
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* RIGHT: discount value */}
                                                                            <div className='text-lg font-bold text-foreground shrink-0'>
                                                                                {v.discountDisplay}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </DialogContent>
                                                </Dialog>
                                            </div>

                                            {!isAuthenticated && (
                                                <p className='text-sm text-amber-600 dark:text-amber-400'>
                                                    ⚠️ Vui lòng đăng nhập để sử dụng voucher
                                                </p>
                                            )}

                                            {voucherError && (
                                                <p className='text-sm text-destructive bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-lg'>
                                                    ❌ {voucherError}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-3'>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono font-bold text-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded'>
                                                        {voucherResult.code}
                                                    </span>
                                                    <span className='text-sm text-emerald-700 dark:text-emerald-400 font-medium'>đã áp dụng</span>
                                                </div>
                                                <Button
                                                    onClick={handleRemoveVoucher}
                                                    variant='outline'
                                                    size='sm'
                                                    className='text-destructive border-destructive/30 hover:bg-destructive/5'
                                                >
                                                    Xóa
                                                </Button>
                                            </div>

                                            <div className='grid grid-cols-2 gap-2 text-sm'>
                                                <span className='text-muted-foreground'>Giảm giá:</span>
                                                <span className='font-bold text-emerald-600 dark:text-emerald-400'>-{formatCurrency(discountAmount)}</span>

                                                <span className='text-muted-foreground'>Tổng tiền ban đầu:</span>
                                                <span className='font-medium text-muted-foreground line-through'>{formatCurrency(baseTotal)}</span>

                                                <span className='text-muted-foreground'>Tổng sau giảm:</span>
                                                <span className='font-extrabold text-emerald-600 dark:text-emerald-400'>{formatCurrency(finalTotal)}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Phương thức thanh toán */}
                        <Card className='border border-border shadow-sm'>
                            <CardContent className='p-6 space-y-4'>
                                <h2 className='text-base font-semibold text-foreground'>Phương thức thanh toán</h2>

                                <div className='flex flex-col gap-3'>
                                    {[
                                        { value: 'vnpay', label: 'Thanh toán qua VNPay', desc: 'Thẻ nội địa, thẻ quốc tế, quét mã QR', iconImage: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png' },
                                        { value: 'zalopay', label: 'Thanh toán qua ZaloPay', desc: 'Ví ZaloPay, thẻ ATM, thẻ quốc tế', iconImage: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png' },
                                    ].map((method) => (
                                        <label
                                            key={method.value}
                                            className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                                                paymentMethod === method.value
                                                    ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-900/20 shadow-sm shadow-emerald-500/10'
                                                    : 'border-border hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:border-emerald-800'
                                            }`}
                                        >
                                            <div className='pt-1'>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    paymentMethod === method.value ? 'border-emerald-500' : 'border-muted-foreground/40'
                                                }`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ${
                                                        paymentMethod === method.value ? 'bg-emerald-500 scale-100' : 'bg-transparent scale-0'
                                                    }`}></div>
                                                </div>
                                                <input
                                                    type='radio'
                                                    value={method.value}
                                                    checked={paymentMethod === method.value}
                                                    onChange={() => setPaymentMethod(method.value as 'vnpay' | 'zalopay')}
                                                    className='hidden'
                                                    name='paymentMethodGroup'
                                                />
                                            </div>
                                            <div className='flex items-center gap-4 flex-1'>
                                                <div className='w-12 h-12 bg-white dark:bg-gray-800 border border-border rounded-xl overflow-hidden flex items-center justify-center p-2 shrink-0'>
                                                    <img src={method.iconImage} alt={method.label} className='w-full h-full object-contain' />
                                                </div>
                                                <div>
                                                    <h4 className={`font-semibold text-sm transition-colors ${
                                                        paymentMethod === method.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                                                    }`}>{method.label}</h4>
                                                    <p className='text-xs text-muted-foreground mt-0.5'>{method.desc}</p>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── RIGHT COLUMN (order summary — sticky) ── */}
                    <div className='lg:col-span-5'>
                        <div className='sticky top-24'>
                            <Card className='border border-border shadow-sm'>
                                <CardContent className='p-6 space-y-5'>
                                    <h2 className='text-base font-semibold text-foreground'>Thông tin đặt sân</h2>

                                    <div className='space-y-3 text-sm'>
                                        <div className='flex justify-between'>
                                            <span className='text-muted-foreground'>Sân:</span>
                                            <span className='font-semibold text-foreground text-right'>{bookingData.courtName}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-muted-foreground'>Ngày:</span>
                                            <span className='font-semibold text-foreground'>{formatDate(bookingData.date)}</span>
                                        </div>
                                        <div className='flex justify-between items-start gap-4'>
                                            <span className='text-muted-foreground shrink-0'>Các khung giờ:</span>
                                            <div className='flex flex-col gap-1 text-right'>
                                                {bookingData.slots && bookingData.slots.length > 0 ? (
                                                    bookingData.slots.map((s, idx) => (
                                                        <span key={idx} className='font-semibold text-foreground'>
                                                            {s.startTime} - {s.endTime}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className='font-semibold text-foreground'>
                                                        {bookingData.startTime} - {bookingData.endTime}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-muted-foreground'>Tổng số giờ:</span>
                                            <span className='font-semibold text-foreground'>{totalHours} giờ</span>
                                        </div>
                                    </div>

                                    <div className='border-t border-border pt-4 space-y-2 text-sm'>
                                        <div className='flex justify-between'>
                                            <span className='text-muted-foreground'>Tiền sân:</span>
                                            <span className='font-medium text-foreground'>{formatCurrency(fieldMoney)}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-muted-foreground'>Tiền thiết bị:</span>
                                            <span className='font-medium text-foreground'>{formatCurrency(equipMoney)}</span>
                                        </div>
                                        {voucherResult && discountAmount > 0 && (
                                            <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
                                                <span>Giảm giá ({voucherResult.code}):</span>
                                                <span className='font-semibold'>-{formatCurrency(discountAmount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className='border-t border-border pt-4 flex justify-between items-center'>
                                        <span className='text-sm font-semibold text-foreground'>Tổng thanh toán:</span>
                                        <span className='text-xl font-extrabold text-emerald-600 dark:text-emerald-400'>
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>

                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isPaying}
                                        className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm'
                                    >
                                        {isPaying ? (
                                            <>
                                                <span className='animate-spin'>⏳</span>
                                                <span>Đang chuyển sang {paymentMethod === 'zalopay' ? 'ZaloPay' : 'VNPay'}...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Thanh toán ngay</span>
                                                <span>→</span>
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Checkout;


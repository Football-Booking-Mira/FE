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

    // Voucher state
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

        // fallback: sum slot.price
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
            // ignore
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

    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo'>('vnpay');
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
            navigate('/login');
            return;
        }

        try {
            setIsPaying(true);

            // local snapshot
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

                const resBooking = await fetch('http://localhost:3000/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${user.token}`,
                    },
                    body: JSON.stringify({
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
                    }),
                });

                const dataBooking = await resBooking.json();
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

                const res = await fetch('http://localhost:3000/api/payment/vnpay/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    let errorData: any;
                    try {
                        errorData = await res.json();
                    } catch {
                        errorData = { message: 'Không tạo được liên kết thanh toán VNPay!' };
                    }

                    const errorMsg =
                        errorData.message || 'Không tạo được liên kết thanh toán VNPay!';
                    const isVoucherOutOfStock =
                        errorData.code === 'VOUCHER_OUT_OF_STOCK' ||
                        res.status === 409 ||
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

                const data = await res.json();

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
            }

            //  MoMo giả lập
            if (paymentMethod === 'momo') {
                const payload = {
                    ...bookingData,
                    bookingId,
                    customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
                    paymentMethod: 'momo',
                    amount: safeNum(totalAmount) || baseTotal,
                };
                console.log('Dữ liệu gửi thanh toán MoMo:', payload);
                toast.success('Giả lập thanh toán MoMo thành công!');
                setIsPaying(false);
            }
        } catch (err) {
            console.error('Lỗi khi thanh toán:', err);
            toast.error('Có lỗi xảy ra khi thanh toán!');
            setIsPaying(false);
        }
    };

    return (
        <div className='min-h-screen bg-white flex justify-center items-start py-12 px-4'>
            <Card className='w-full max-w-2xl shadow-2xl rounded-3xl overflow-hidden'>
                <div className='bg-white text-green-600 text-center py-6 px-4 border-b border-gray-200'>
                    <h1 className='text-3xl font-extrabold mb-1'>Thanh Toán Đặt Sân</h1>
                </div>

                <CardContent className='p-8 space-y-8'>
                    {/* Thông tin đặt sân */}
                    <div className='bg-green-50 rounded-xl p-6 shadow-inner'>
                        <h2 className='font-semibold text-lg text-gray-700 mb-4'>
                            Thông tin đặt sân
                        </h2>

                        <div className='grid grid-cols-2 gap-2 text-gray-600'>
                            <span>Sân:</span>
                            <span className='font-medium text-gray-800'>
                                {bookingData.courtName}
                            </span>

                            <span>Ngày:</span>
                            <span className='font-medium text-gray-800'>
                                {formatDate(bookingData.date)}
                            </span>

                            <span>Các khung giờ:</span>
                            <div className='flex flex-col gap-1'>
                                {bookingData.slots && bookingData.slots.length > 0 ? (
                                    bookingData.slots.map((s, idx) => (
                                        <span
                                            key={idx}
                                            className='font-medium text-gray-800 min-w-[140px]'
                                        >
                                            {s.startTime} - {s.endTime}
                                        </span>
                                    ))
                                ) : (
                                    <span className='font-medium text-gray-800 min-w-[140px]'>
                                        {bookingData.startTime} - {bookingData.endTime}
                                    </span>
                                )}
                            </div>

                            <span>Tổng số giờ:</span>
                            <span className='font-medium text-gray-800'>{totalHours} giờ</span>

                            {/*  breakdown */}
                            <span>Tiền sân:</span>
                            <span className='font-medium text-gray-800'>
                                {formatCurrency(fieldMoney)}
                            </span>

                            <span>Tiền thiết bị:</span>
                            <span className='font-medium text-gray-800'>
                                {formatCurrency(equipMoney)}
                            </span>

                            <span>Tổng thanh toán:</span>
                            <span className='font-bold text-green-700 text-lg'>
                                {formatCurrency(baseTotal)}
                            </span>
                        </div>
                    </div>

                    {/* Voucher - chỉ khi tạo booking mới */}
                    {!bookingData.isRetryPayment && (
                        <div className='bg-blue-50 rounded-xl p-6 shadow-inner border border-blue-200'>
                            <h2 className='font-semibold text-lg text-gray-700 mb-4'>
                                Mã giảm giá (Voucher)
                            </h2>

                            {!voucherResult ? (
                                <div className='space-y-4'>
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                                        <p className='text-sm text-gray-600'>
                                            Nhấn nút bên phải để xem danh sách các voucher đang hoạt
                                            động và còn hạn, sau đó chọn một mã phù hợp.
                                        </p>

                                        <Dialog
                                            open={voucherDialogOpen}
                                            onOpenChange={setVoucherDialogOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    disabled={validatingVoucher}
                                                    className='bg-blue-600 hover:bg-blue-700 text-white px-4'
                                                >
                                                    Chọn mã voucher
                                                </Button>
                                            </DialogTrigger>

                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Chọn mã voucher</DialogTitle>
                                                    <DialogDescription>
                                                        Danh sách các voucher đang hoạt động và còn
                                                        hạn sử dụng. Chọn một mã để áp dụng cho đơn
                                                        của bạn.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {loadingPublicVouchers ? (
                                                    <p className='text-sm text-gray-500'>
                                                        Đang tải danh sách voucher...
                                                    </p>
                                                ) : publicVouchersError ? (
                                                    <p className='text-sm text-red-600'>
                                                        {publicVouchersError}
                                                    </p>
                                                ) : publicVouchers.length === 0 ? (
                                                    <p className='text-sm text-gray-500'>
                                                        Hiện tại chưa có voucher nào khả dụng.
                                                    </p>
                                                ) : (
                                                    <div className='space-y-2 max-h-80 overflow-y-auto'>
                                                        {publicVouchers.map((v) => {
                                                            const isDisabled =
                                                                v.minOrderValue > 0 &&
                                                                baseTotal < v.minOrderValue;

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
                                                                    className={`w-full text-left border rounded-lg p-3 transition flex flex-col gap-1 ${
                                                                        isDisabled
                                                                            ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                                                                            : 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                                                    }`}
                                                                >
                                                                    <div className='flex items-center justify-between'>
                                                                        <span
                                                                            className={`font-semibold ${
                                                                                isDisabled
                                                                                    ? 'text-gray-500'
                                                                                    : 'text-blue-700'
                                                                            }`}
                                                                        >
                                                                            {v.code}
                                                                        </span>
                                                                        <span
                                                                            className={`text-sm font-semibold ${
                                                                                isDisabled
                                                                                    ? 'text-gray-500'
                                                                                    : 'text-green-700'
                                                                            }`}
                                                                        >
                                                                            {v.discountDisplay}
                                                                        </span>
                                                                    </div>

                                                                    {v.description && (
                                                                        <p
                                                                            className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}
                                                                        >
                                                                            {v.description}
                                                                        </p>
                                                                    )}

                                                                    <div className='flex flex-wrap gap-3 text-xs text-gray-500 mt-1'>
                                                                        <span>
                                                                            Còn lại:{' '}
                                                                            <span className='font-semibold text-green-700'>
                                                                                {
                                                                                    v.remainingQuantity
                                                                                }
                                                                            </span>
                                                                        </span>

                                                                        {v.minOrderValue > 0 && (
                                                                            <span>
                                                                                Đơn tối thiểu:{' '}
                                                                                <span
                                                                                    className={`font-semibold ${
                                                                                        isDisabled
                                                                                            ? 'text-red-600'
                                                                                            : ''
                                                                                    }`}
                                                                                >
                                                                                    {new Intl.NumberFormat(
                                                                                        'vi-VN'
                                                                                    ).format(
                                                                                        v.minOrderValue
                                                                                    )}{' '}
                                                                                    VNĐ
                                                                                </span>
                                                                                {isDisabled && (
                                                                                    <span className='ml-1 text-red-600 font-semibold'>
                                                                                        (Không đủ
                                                                                        điều kiện)
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        )}

                                                                        <span>
                                                                            Hạn dùng:{' '}
                                                                            <span className='font-semibold'>
                                                                                {new Date(
                                                                                    v.startDate
                                                                                ).toLocaleDateString(
                                                                                    'vi-VN'
                                                                                )}{' '}
                                                                                -{' '}
                                                                                {new Date(
                                                                                    v.endDate
                                                                                ).toLocaleDateString(
                                                                                    'vi-VN'
                                                                                )}
                                                                            </span>
                                                                        </span>
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
                                        <p className='text-sm text-amber-600'>
                                            ⚠️ Vui lòng đăng nhập để sử dụng voucher
                                        </p>
                                    )}

                                    {voucherError && (
                                        <p className='text-sm text-red-600 bg-red-50 p-2 rounded'>
                                            ❌ {voucherError}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    <div className='bg-green-100 border border-green-300 rounded-lg p-4'>
                                        <div className='flex items-center justify-between mb-2'>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-semibold text-green-800'>
                                                    Voucher đã áp dụng: {voucherResult.code}
                                                </span>
                                            </div>
                                            <Button
                                                onClick={handleRemoveVoucher}
                                                variant='outline'
                                                size='sm'
                                                className='text-red-600 border-red-300 hover:bg-red-50'
                                            >
                                                Xóa
                                            </Button>
                                        </div>

                                        <div className='grid grid-cols-2 gap-2 text-sm text-gray-700'>
                                            <span>Giảm giá:</span>
                                            <span className='font-bold text-green-700'>
                                                -{formatCurrency(discountAmount)}
                                            </span>

                                            <span>Tổng tiền ban đầu:</span>
                                            <span className='font-medium text-gray-600 line-through'>
                                                {formatCurrency(baseTotal)}
                                            </span>

                                            <span>Tổng tiền sau giảm:</span>
                                            <span className='font-bold text-green-700 text-lg'>
                                                {formatCurrency(finalTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Thông tin người đặt */}
                    <div className='space-y-4'>
                        <h2 className='font-semibold text-lg text-gray-700'>Thông tin người đặt</h2>
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
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${
                                        errors.name ? 'border-red-500 focus:border-red-500' : ''
                                    }`}
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
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${
                                        errors.phone ? 'border-red-500 focus:border-red-500' : ''
                                    }`}
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
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${
                                        errors.email ? 'border-red-500 focus:border-red-500' : ''
                                    }`}
                                />
                                {errors.email && (
                                    <p className='text-sm text-red-500 mt-1'>{errors.email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className='space-y-3'>
                        <h2 className='font-semibold text-lg text-gray-700'>
                            Phương thức thanh toán
                        </h2>
                        <div className='flex flex-col sm:flex-row gap-4'>
                            {[
                                { value: 'vnpay', label: 'Thanh toán qua VNPay' },
                                { value: 'momo', label: 'Thanh toán qua MoMo' },
                            ].map((method) => (
                                <label
                                    key={method.value}
                                    className={`flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:shadow transition ${
                                        paymentMethod === method.value
                                            ? 'border-green-600 bg-green-50'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    <input
                                        type='radio'
                                        value={method.value}
                                        checked={paymentMethod === method.value}
                                        onChange={() =>
                                            setPaymentMethod(method.value as 'vnpay' | 'momo')
                                        }
                                        className='accent-green-600'
                                    />
                                    <span>{method.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={isPaying}
                        className='w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed'
                    >
                        {isPaying ? 'Đang chuyển sang VNPay...' : 'Hoàn tất thanh toán'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Checkout;

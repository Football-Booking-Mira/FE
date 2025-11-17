import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CheckoutData {
    courtId: string;
    courtName: string;
    date: string; // ISO string
    startTime: string; // "16:00"
    endTime: string; // "18:00"
    totalPrice: number;
    bookingId?: string;
}

const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN');
};

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} VNĐ`;

// regex đơn giản cho email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Checkout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [bookingData, setBookingData] = useState<CheckoutData | null>(() => {
        return JSON.parse(window.localStorage.getItem('checkout-data') || 'null');
    });

    useEffect(() => {
        if (!bookingData) navigate('/booking');
    }, [bookingData, navigate]);

    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo'>('vnpay');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

    const handleSubmit = async () => {
        if (!bookingData) {
            toast.error('Không tìm thấy thông tin đặt sân!');
            return;
        }

        const newErrors: typeof errors = {};

        // Họ tên
        if (!name.trim()) newErrors.name = 'Vui lòng nhập họ và tên';

        // SĐT: bắt buộc, chỉ 10 chữ số
        const phoneTrim = phone.trim();
        if (!phoneTrim) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^\d{10}$/.test(phoneTrim)) {
            newErrors.phone = 'Số điện thoại phải gồm đúng 10 chữ số (0–9)';
        }

        // Email: bắt buộc + đúng format
        const emailTrim = email.trim();
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
            return navigate('/login');
        }

        try {
            setIsPaying(true);

            let bookingId = bookingData.bookingId;

            // 1. Tạo booking nếu chưa có
            if (!bookingId) {
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
                        startTime: bookingData.startTime,
                        endTime: bookingData.endTime,
                        paymentMethod, // vnpay / momo
                        note: '',
                        customerInfo: {
                            name: nameTrim,
                            phone: phoneTrim,
                            email: emailTrim,
                        },
                    }),
                });

                const dataBooking = await resBooking.json();
                if (!dataBooking.success) {
                    console.error('Tạo booking thất bại:', dataBooking);
                    toast.error(dataBooking.message || 'Không tạo được đơn đặt sân!');
                    setIsPaying(false);
                    return;
                }

                bookingId = dataBooking.data._id;

                const newCheckoutData: CheckoutData = {
                    ...bookingData,
                    bookingId,
                };
                setBookingData(newCheckoutData);
                localStorage.setItem('checkout-data', JSON.stringify(newCheckoutData));
            }

            // 2. Thanh toán VNPay
            if (paymentMethod === 'vnpay') {
                const res = await fetch('http://localhost:3000/api/payment/vnpay/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId }),
                });

                const data = await res.json();
                const paymentUrl = data.paymentUrl || data?.data?.url;

                if (data.success && paymentUrl) {
                    toast.success('Đang chuyển tới trang thanh toán VNPay...');
                    window.location.href = paymentUrl;
                } else {
                    toast.error(data.message || 'Không tạo được liên kết thanh toán VNPay!');
                    setIsPaying(false);
                }
                return;
            }

            // 3. Giả lập MoMo
            if (paymentMethod === 'momo') {
                const payload = {
                    ...bookingData,
                    bookingId,
                    customer: { name: nameTrim, phone: phoneTrim, email: emailTrim },
                    paymentMethod: 'momo',
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

    if (!bookingData) return null;

    // để dùng trong body Booking
    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    const emailTrim = email.trim();

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

                            <span>Giờ:</span>
                            <span className='font-medium text-gray-800'>
                                {bookingData.startTime} - {bookingData.endTime}
                            </span>

                            <span>Tổng tiền:</span>
                            <span className='font-bold text-green-700 text-lg'>
                                {formatCurrency(bookingData.totalPrice)}
                            </span>
                        </div>
                    </div>

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
                                    // chỉ cho nhập số & tối đa 10 ký tự
                                    value={phone}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        if (raw.length <= 10) {
                                            setPhone(raw);
                                        }
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

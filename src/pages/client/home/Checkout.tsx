import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/common/utils/api';

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
    date: string; // ISO string
    slots: SlotItem[];
    totalPrice: number;
    totalDuration: number;
    overallStart: string;
    overallEnd: string;
    bookingId?: string;

    // backward compatible
    startTime?: string;
    endTime?: string;

    //  khi đi từ MyBookings (Thanh toán lại)
    isRetryPayment?: boolean;
    total?: number; // tổng tiền booking, nếu có
}

const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN');
};

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} VNĐ`;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Checkout: React.FC = () => {
    const navigate = useNavigate();

    const [bookingData, setBookingData] = useState<CheckoutData | null>(() => {
        return JSON.parse(window.localStorage.getItem('checkout-data') || 'null');
    });

    // Tổng tiền thực sự sẽ thanh toán (booking mới = tổng đơn, thanh toán lại = còn thiếu)
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [retryInfo, setRetryInfo] = useState<{
        bookingId: string;
        amountToPay: number;
    } | null>(null);

    // nếu không có bookingData thì đá về home
    useEffect(() => {
        if (!bookingData) {
            toast.error('Không có thông tin đặt sân, đang điều hướng về trang chủ...');
            navigate('/');
        }
    }, [bookingData, navigate]);

    // ĐỌC checkout-data & gọi API thanh toán lại (nếu có)
    useEffect(() => {
        if (!bookingData) return;

        // TH1: từ MyBookings, đang Thanh toán lại
        if (bookingData.isRetryPayment && bookingData.bookingId) {
            api.get(`/bookings/${bookingData.bookingId}/retry-payment-info`)
                .then((res) => {
                    const info = res.data.data;
                    setRetryInfo({
                        bookingId: info.bookingId,
                        amountToPay: info.amountToPay,
                    });
                    setTotalAmount(info.amountToPay);
                })
                .catch((err) => {
                    const msg = err?.response?.data?.message || 'Không thể thanh toán lại đơn này!';
                    toast.error(msg);
                    // fallback về tổng cũ nếu có
                    const fallback = bookingData.totalPrice ?? bookingData.total ?? 0;
                    setTotalAmount(fallback);
                });
        } else {
            // TH2: flow đặt sân mới
            const amount = bookingData.totalPrice ?? bookingData.total ?? 0;
            setTotalAmount(amount);
        }
    }, [bookingData]);

    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'transfer'>('vnpay');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

    if (!bookingData) return null;

    //  TÍNH TOÁN TỪ DỮ LIỆU MỚI
    const totalPrice = bookingData.totalPrice ?? bookingData.total ?? 0;
    const totalHours =
        bookingData.totalDuration && bookingData.totalDuration > 0
            ? bookingData.totalDuration / 60
            : bookingData.slots?.reduce((sum, s) => sum + s.duration, 0) / 60 || 0;

    const slotsDisplay =
        bookingData.slots && bookingData.slots.length
            ? bookingData.slots.map((s) => `${s.startTime} - ${s.endTime}`).join(', ')
            : bookingData.startTime && bookingData.endTime
                ? `${bookingData.startTime} - ${bookingData.endTime}`
                : '--';

    const firstSlot = bookingData.slots?.[0];
    const lastSlot =
        bookingData.slots && bookingData.slots.length > 0
            ? bookingData.slots[bookingData.slots.length - 1]
            : undefined;

    const bookingStartTime =
        bookingData.overallStart || firstSlot?.startTime || bookingData.startTime || '06:00';
    const bookingEndTime =
        bookingData.overallEnd || lastSlot?.endTime || bookingData.endTime || '07:00';
    const [qrData, setQrData] = useState<{ image: string; qrUrl: string; amount: number } | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const token = localStorage.getItem('token');

    const handlePrintInvoice = async () => {
  if (!bookingData) return;

  try {
    const res = await fetch('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookingId: bookingData.bookingId,
        method: 'transfer',
        discount: 0,
        note: 'Thanh toán bằng QR',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      toast.error(data.message || 'Không tạo được hóa đơn!');
      return;
    }

    const invoice = data.invoice;
    const items = data.items;

    // Lấy thông tin khách hàng từ invoice.customerId
    const customer = invoice.customerId || {};

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Hóa đơn</title></head><body>');
    printWindow.document.write('<h2>Hóa đơn thanh toán</h2>');

    // Thông tin khách hàng
    printWindow.document.write(`<p>Khách hàng: ${customer.name || ''}</p>`);
    printWindow.document.write(`<p>Số điện thoại: ${customer.phone || ''}</p>`);
    printWindow.document.write(`<p>Email: ${customer.email || ''}</p>`);

    // Thông tin hóa đơn
    printWindow.document.write(`<p>Mã hóa đơn: ${invoice.code}</p>`);
    printWindow.document.write(`<p>Phương thức thanh toán: ${invoice.method}</p>`);
    printWindow.document.write(`<p>Tổng tiền: ${invoice.total.toLocaleString()}đ</p>`);

    // Danh sách chi tiết
    if (items && items.length > 0) {
      printWindow.document.write('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">');
      printWindow.document.write('<tr><th>Tên</th><th>Số lượng</th><th>Đơn vị</th><th>Đơn giá</th><th>Thành tiền</th></tr>');
      items.forEach((item: any) => {
        printWindow.document.write(`
          <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>${item.unit}</td>
            <td>${item.price.toLocaleString()}đ</td>
            <td>${item.subtotal.toLocaleString()}đ</td>
          </tr>
        `);
      });
      printWindow.document.write('</table>');
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } catch (err) {
    console.error(err);
    toast.error('Lỗi khi tạo hoặc in hóa đơn!');
  }
};



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

            let bookingId = bookingData.bookingId;

            //  Tạo booking nếu chưa có (flow đặt sân mới)
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
                        startTime: bookingStartTime,
                        endTime: bookingEndTime,
                        paymentMethod, // vnpay / momo
                        note: '',
                        customerInfo: {
                            name: nameTrim,
                            phone: phoneTrim,
                            email: emailTrim,
                        },
                        slots: bookingData.slots,
                        totalFieldAmount: totalPrice,
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

            //  Thanh toán VNPay đặt sân mới + thanh toán lại
            if (paymentMethod === 'vnpay') {
                if (totalAmount <= 0) {
                    toast.error('Số tiền thanh toán không hợp lệ!');
                    setIsPaying(false);
                    return;
                }

                const payload: any = {
                    bookingId,
                    amount: totalAmount, // ⭐ dùng số tiền thực sự cần trả
                };

                const isRetry = bookingData.isRetryPayment || !!retryInfo;
                if (isRetry) {
                    payload.isRetryPayment = true;
                }

                const res = await fetch('http://localhost:3000/api/payment/vnpay/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();
                const paymentUrl = data.paymentUrl || data?.data?.paymentUrl || data?.data?.url;

                if (data.success && paymentUrl) {
                    toast.success('Đang chuyển tới trang thanh toán VNPay...');
                    window.location.href = paymentUrl;
                } else {
                    toast.error(data.message || 'Không tạo được liên kết thanh toán VNPay!');
                    setIsPaying(false);
                }
                return;
            }

            //  Giả lập MoMo
            if (paymentMethod === 'momo') {
                const payload = {
                    ...bookingData,
                    bookingId,
                    customer: { name: nameTrim, phone: phoneTrim, email: emailTrim },
                    paymentMethod: 'momo',
                    amount: totalAmount || totalPrice,
                };
                console.log('Dữ liệu gửi thanh toán MoMo:', payload);
                toast.success('Giả lập thanh toán MoMo thành công!');
                setIsPaying(false);
            }

            if (paymentMethod === 'transfer') {
                try {
                    const resQR = await fetch('http://localhost:3000/api/bookings/payment/vietqr', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${user.token}`,
                        },
                        body: JSON.stringify({
                            bookingId,
                            amount: totalPrice,
                            customer: { name: nameTrim, phone: phoneTrim, email: emailTrim },
                        }),
                    });

                    const dataQR = await resQR.json();
                    if (!dataQR.success) {
                        toast.error(dataQR.message || 'Không tạo được mã QR!');
                        setIsPaying(false);
                        return;
                    }

                    // dataQR.data.qrImage: ảnh Base64
                    // dataQR.data.qrUrl: URL API VietQR

                    setQrData({
                        image: dataQR.data.qrImageBase64,
                        qrUrl: dataQR.data.qrUrl,
                        amount: totalPrice,
                    });

                    setShowQrModal(true);
                } catch (err) {
                    console.error(err);
                    toast.error('Lỗi khi tạo QR thanh toán!');
                }

                setIsPaying(false);
                return;
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

                            <span>Tổng tiền:</span>
                            <span className='font-bold text-green-700 text-lg'>
                                {/* ưu tiên hiển thị số tiền thực sự sẽ thanh toán */}
                                {formatCurrency(totalAmount || totalPrice)}
                            </span>
                        </div>
                    </div>

                    {/* Thông tin người đặt */}
                    {/* (phần dưới giữ nguyên như cũ) */}
                    {/* ... Toàn bộ phần form name/phone/email, chọn phương thức, Button gọi handleSubmit ... */}

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
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${errors.name ? 'border-red-500 focus:border-red-500' : ''
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
                                        if (raw.length <= 10) {
                                            setPhone(raw);
                                        }
                                        if (errors.phone)
                                            setErrors((p) => ({ ...p, phone: undefined }));
                                    }}
                                    placeholder='Nhập số điện thoại 10 số'
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''
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
                                    className={`mt-1 border-green-300 focus:border-green-500 focus:ring-green-200 ${errors.email ? 'border-red-500 focus:border-red-500' : ''
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
                                { value: 'transfer', label: 'Thanh toán bằng QR Code' },
                            ].map((method) => (
                                <label
                                    key={method.value}
                                    className={`flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:shadow transition ${paymentMethod === method.value
                                        ? 'border-green-600 bg-green-50'
                                        : 'border-gray-300'
                                        }`}
                                >
                                    <input
                                        type='radio'
                                        value={method.value}
                                        checked={paymentMethod === method.value}
                                        onChange={() =>
                                            setPaymentMethod(method.value as 'vnpay' | 'momo' | 'transfer')
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
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isPaying
                            ? paymentMethod === 'vnpay'
                                ? 'Đang chuyển sang VNPay...'
                                : paymentMethod === 'momo'
                                    ? 'Đang mở MoMo...'
                                    : 'Đang tạo mã QR...'
                            : 'Hoàn tất thanh toán'}
                    </Button>

                </CardContent>
            </Card>
            {showQrModal && qrData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-[380px] text-center space-y-4">
                        <h2 className="text-xl font-bold text-green-700">Thanh toán bằng QR Code</h2>

                        <img
                            src={qrData.image}
                            alt="VietQR"
                            className="w-64 h-64 mx-auto border rounded-xl shadow"
                        />

                        <p className="text-gray-700 font-semibold">
                            Số tiền: <span className="text-green-700">{qrData.amount.toLocaleString()}đ</span>
                        </p>

                        <div className='flex gap-2'>
                            <Button
                                onClick={() => setShowQrModal(false)}
                                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl"
                            >
                                Đóng
                            </Button>
                            <Button
                                onClick={handlePrintInvoice}
                                className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl"
                            >
                                Đã thanh toán
                            </Button>
                        </div>


                    </div>
                </div>
            )}

        </div>
    );
};

export default Checkout;
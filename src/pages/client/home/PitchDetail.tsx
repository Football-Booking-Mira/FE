import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import BookingTimeSelector from '@/components/BookingTimeSelector';
import { toast, ToastContainer } from 'react-toastify';
import { CheckCircle2, XCircle } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

const socket = io('http://localhost:3000');

interface Court {
    _id: string;
    name: string;
    type: string;
    formats?: string[] | string;
    location?: string;
    basePrice: number;
    peakPrice: number;
    images: string[];
    address?: string;
    openHours?: string;
    totalCourts?: number;
    amenities?: string[];
}

function formatVNDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

const PitchDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [court, setCourt] = useState<Court | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<{
        date: string;
        startTime: string;
        endTime: string;
        price: number;
    } | null>(null);
    const [currentImage, setCurrentImage] = useState(0);

    //  Lấy chi tiết sân
    useEffect(() => {
        const fetchCourt = async () => {
            try {
                const res = await fetch(`http://localhost:3000/api/courts/${id}`);
                const data = await res.json();
                setCourt(data.data);
            } catch (err) {
                console.error('Lỗi tải sân:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourt();
    }, [id]);

    //  Socket cập nhật realtime
    useEffect(() => {
        if (!id) return;
        socket.emit('join:court', id);
        socket.on('court:updated', (payload: any) => {
            if (payload.courtId === id) setCourt(payload.court);
        });
        return () => {
            socket.emit('leave:court', id);
            socket.off('court:updated');
        };
    }, [id]);

    // === Đặt sân ===
    const handleBooking = async () => {
        if (!selectedSlot || !court?._id) return;

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user?._id) {
                toast.error('Vui lòng đăng nhập trước khi đặt sân!', {
                    position: 'top-right',
                    theme: 'colored',
                    icon: false,
                    style: {
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '15px',
                        borderRadius: '10px',
                        padding: '12px 16px',
                    },
                });
                return navigate('/login');
            }

            const res = await fetch('http://localhost:3000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({
                    courtId: court._id,
                    customerId: user._id,
                    date: selectedSlot.date,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    paymentMethod: 'vnpay',
                    note: '',
                }),
            });

            const data = await res.json();

            if (data.success) {
                const booking = data.data;

                const bookingData = {
                    bookingId: booking._id,
                    code: booking.code,
                    courtId: booking.courtId,
                    courtName: court.name,          // lấy từ UI
                    date: booking.date,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    hours: booking.hours,
                    totalPrice: booking.total,      // tổng tiền
                    paymentMethod: booking.paymentMethod,
                };

                localStorage.setItem("checkout-data", JSON.stringify(bookingData));
                toast.success('⚽ Đặt sân thành công!', {
                    position: 'top-right',
                    autoClose: 2500,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'colored',
                    icon: false,
                    style: {
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '15px',
                        borderRadius: '10px',
                        padding: '12px 16px',
                    },
                });
                // localStorage.setItem("checkout-data", JSON.stringify(bookingData));
                setTimeout(() => {
                    navigate("/checkout");
                }, 500); // delay 0.5s để toast kịp hiển thị


            } else {
                toast.error(data.message || 'Đặt sân thất bại!', {
                    position: 'top-right',
                    theme: 'colored',
                    icon: false,
                    style: {
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '15px',
                        borderRadius: '10px',
                        padding: '12px 16px',
                    },
                });
            }
        } catch (err) {
            console.error('Lỗi khi đặt sân:', err);
            toast.error('Có lỗi xảy ra khi đặt sân!', {
                position: 'top-right',
                theme: 'colored',
                icon: false,
                style: {
                    backgroundColor: '#b91c1c',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '15px',
                    borderRadius: '10px',
                    padding: '12px 16px',
                },
            });
        }
    };

    //  Giao diện
    if (loading) return <p className='text-center mt-10 text-gray-600'>Đang tải dữ liệu...</p>;
    if (!court) return <p className='text-center mt-10 text-gray-600'>Không tìm thấy sân.</p>;

    return (
        <div className='min-h-screen bg-gray-50 py-10 relative'>
            <ToastContainer newestOnTop />

            <div className='max-w-[1600px] mx-auto grid grid-cols-[2fr_1fr] gap-10'>
                {/* === CỘT TRÁI === */}
                <div className='bg-white shadow-sm rounded-2xl p-8 space-y-10'>
                    <h1 className='text-3xl font-bold text-gray-800 mb-4'>{court.name}</h1>

                    {/*  Ảnh sân  */}
                    <div className='space-y-4'>
                        <div className='rounded-xl overflow-hidden border border-gray-100 shadow'>
                            <img
                                src={court.images?.[currentImage]}
                                alt={`Sân ${currentImage + 1}`}
                                className='w-full h-[400px] object-cover'
                            />
                        </div>
                        <div className='flex gap-2 overflow-x-auto'>
                            {court.images?.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className={`w-28 h-20 object-cover rounded-lg cursor-pointer border-2 ${currentImage === idx
                                        ? 'border-green-600'
                                        : 'border-gray-300 hover:border-green-400'
                                        }`}
                                    onClick={() => setCurrentImage(idx)}
                                />
                            ))}
                        </div>
                    </div>

                    {/*  Bộ chọn giờ  */}
                    <BookingTimeSelector
                        courtId={court._id}
                        basePrice={court.basePrice}
                        peakPrice={court.peakPrice}
                        onSlotSelected={(slot) => setSelectedSlot(slot)}
                    />
                </div>

                {/* === CỘT PHẢI === */}
                <div className='bg-white shadow rounded-2xl p-8 border border-gray-200 h-fit'>
                    <h3 className='text-2xl font-bold text-gray-900 mb-6'>Tóm tắt đặt sân</h3>

                    <div className='space-y-3 text-[15px] text-gray-700'>
                        <div className='flex justify-between border-b pb-1'>
                            <span>Ngày đặt sân:</span>
                            <span className='font-semibold'>
                                {selectedSlot ? formatVNDate(new Date(selectedSlot.date)) : '--'}
                            </span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Tên sân:</span>
                            <span className='font-semibold text-gray-800'>
                                {court?.name || '--'}
                            </span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Loại sân:</span>
                            <span className='font-semibold'>
                                {court?.type === 'indoor'
                                    ? 'Trong nhà'
                                    : court?.type === 'outdoor'
                                        ? 'Ngoài trời'
                                        : court?.type === 'vip'
                                            ? 'VIP'
                                            : '--'}
                            </span>
                        </div>

                        {court?.formats && (
                            <div className='flex justify-between border-b pb-1'>
                                <span>Định dạng:</span>
                                <span className='font-semibold text-right'>
                                    {Array.isArray(court.formats)
                                        ? court.formats.join(', ')
                                        : court.formats || '--'}
                                </span>
                            </div>
                        )}

                        <div className='flex justify-between border-b pb-1'>
                            <span>Khung giờ:</span>
                            <span className='font-semibold'>
                                {selectedSlot
                                    ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                                    : '--'}
                            </span>
                        </div>

                        {selectedSlot && (
                            <>
                                <div className='flex justify-between border-b pb-1'>
                                    <span>Loại giá:</span>
                                    <span className='font-semibold'>
                                        {parseInt(selectedSlot.startTime) >= 16
                                            ? 'Giá cao điểm (16h – 22h)'
                                            : 'Giá thường (08h – 16h)'}
                                    </span>
                                </div>
                                <div className='flex justify-between border-b pb-1'>
                                    <span>Số giờ:</span>
                                    <span>
                                        {selectedSlot?.startTime && selectedSlot?.endTime
                                            ? `${parseInt(selectedSlot.endTime) -
                                            parseInt(selectedSlot.startTime)
                                            } giờ`
                                            : '0 giờ'}
                                    </span>
                                </div>
                            </>
                        )}

                        <div className='flex justify-between border-b pb-1'>
                            <span>Vị trí:</span>
                            <span className='font-semibold text-right'>
                                {court?.location || 'Chưa có thông tin'}
                            </span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Giờ mở cửa:</span>
                            <span className='font-semibold text-right'>
                                {court?.openHours || '06:00 - 22:00'}
                            </span>
                        </div>

                        <div className='border-b pb-2'>
                            <span className='block font-medium mb-1'>Tiện ích:</span>
                            {court?.amenities && court.amenities.length > 0 ? (
                                <div className='flex flex-wrap gap-2'>
                                    {court.amenities.map((a, idx) => (
                                        <span
                                            key={idx}
                                            className='bg-green-50 text-green-700 text-xs px-2 py-1 rounded-md border border-green-200'
                                        >
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className='text-gray-500 text-sm italic'>
                                    Chưa có tiện ích
                                </span>
                            )}
                        </div>

                        <div className='flex justify-between items-center text-green-700 font-extrabold text-xl border-t pt-3'>
                            <span>Tổng tiền:</span>
                            <span className='text-green-700'>
                                {selectedSlot
                                    ? `${selectedSlot.price.toLocaleString('vi-VN')} VNĐ`
                                    : '0 VNĐ'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleBooking}
                        disabled={!selectedSlot}
                        className={`w-full mt-6 font-bold py-3 rounded-lg transition ${selectedSlot
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        Đặt sân
                    </button>

                    <p className='text-xs text-gray-400 mt-10 leading-relaxed italic border-t border-gray-100 pt-5'>
                        * Đặt sân cần được xác nhận bởi chủ sân <br />* Có thể hủy trước 2 giờ
                        <br />* Thời tiết xấu sẽ được hỗ trợ sắp xếp lại
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PitchDetail;

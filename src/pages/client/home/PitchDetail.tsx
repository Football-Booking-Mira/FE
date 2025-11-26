import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import BookingTimeSelector from '@/components/BookingTimeSelector';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Court {
    _id: string;
    name: string;
    type: string; // indoor | outdoor | vip
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

interface SelectedSlot {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number; // phút
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
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
    const [currentImage, setCurrentImage] = useState(0);

    const socketRef = useRef<Socket | null>(null);

    // ===== LẤY CHI TIẾT SÂN =====
    const fetchCourt = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`http://localhost:3000/api/courts/${id}`);
            const data = await res.json();
            if (data?.success && data.data) {
                setCourt(data.data);
                setCurrentImage(0);
            } else {
                toast.error('Không tìm thấy sân!');
                setCourt(null);
            }
        } catch (err) {
            console.error('Lỗi tải sân:', err);
            toast.error('Lỗi tải thông tin sân!');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCourt();
    }, [fetchCourt]);

    // ===== SOCKET REALTIME =====
    useEffect(() => {
        if (!id) return;

        const socket = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

        socketRef.current = socket;

        socket.emit('join:court', id);

        socket.on('court:updated', (payload: any) => {
            if (payload?.courtId === id && payload.court) {
                setCourt(payload.court);
            }
        });

        return () => {
            socket.emit('leave:court', id);
            socket.off('court:updated');
            socket.disconnect();
        };
    }, [id]);

    // ===== ĐẶT SÂN (CHUYỂN QUA TRANG CHÍNH SÁCH) =====
    const handleBooking = () => {
        if (!selectedSlots.length || !court?._id) {
            toast.error('Vui lòng chọn khung giờ trước khi đặt sân!');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?._id || !user?.token) {
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
            navigate('/login');
            return;
        }

        const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
        const totalDuration = selectedSlots.reduce((sum, s) => sum + s.duration, 0);
        const date = selectedSlots[0].date;

        const sortedByTime = [...selectedSlots].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
        );
        const overallStart = sortedByTime[0].startTime;
        const overallEnd = sortedByTime[sortedByTime.length - 1].endTime;

        const checkoutData = {
            courtId: court._id,
            courtName: court.name,
            date,
            slots: selectedSlots,
            totalPrice,
            totalDuration,
            overallStart,
            overallEnd,
        };

        localStorage.setItem('checkout-data', JSON.stringify(checkoutData));

        // chuyển sang trang chính sách
        window.location.href = '/booking-policy';
    };

    if (loading) {
        return <p className='text-center mt-10 text-gray-600'>Đang tải dữ liệu...</p>;
    }

    if (!court) {
        return <p className='text-center mt-10 text-gray-600'>Không tìm thấy sân.</p>;
    }

    const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedSlots.reduce((sum, s) => sum + s.duration, 0);

    const dateDisplay = selectedSlots.length ? formatVNDate(new Date(selectedSlots[0].date)) : '--';

    const timeDisplay = selectedSlots.length
        ? selectedSlots.map((s) => `${s.startTime} - ${s.endTime}`).join(', ')
        : '--';

    let priceTypeLabel = '--';
    if (selectedSlots.length) {
        const hasPeak = selectedSlots.some((s) => parseInt(s.startTime) >= 16);
        const hasNormal = selectedSlots.some((s) => parseInt(s.startTime) < 16);
        if (hasPeak && hasNormal) {
            priceTypeLabel = 'Kết hợp giờ thường + cao điểm';
        } else if (hasPeak) {
            priceTypeLabel = 'Giá cao điểm (16h – 22h)';
        } else {
            priceTypeLabel = 'Giá thường (06h – 16h)';
        }
    }

    return (
        <div className='min-h-screen bg-gray-50 py-10'>
            <ToastContainer newestOnTop />

            <div className='max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10'>
                {/* CỘT TRÁI */}
                <div className='bg-white shadow-sm rounded-2xl p-8 space-y-10'>
                    <h1 className='text-3xl font-bold text-gray-800 mb-4'>{court.name}</h1>

                    {/* ẢNH SÂN */}
                    <div className='space-y-4'>
                        <div className='rounded-xl overflow-hidden border border-gray-100 shadow'>
                            <img
                                src={
                                    court.images?.[currentImage] ||
                                    court.images?.[0] ||
                                    'https://picsum.photos/1200/600'
                                }
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
                                    className={`w-28 h-20 object-cover rounded-lg cursor-pointer border-2 ${
                                        currentImage === idx
                                            ? 'border-green-600'
                                            : 'border-gray-300 hover:border-green-400'
                                    }`}
                                    onClick={() => setCurrentImage(idx)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* BỘ CHỌN GIỜ */}
                    <BookingTimeSelector
                        courtId={court._id}
                        basePrice={court.basePrice}
                        peakPrice={court.peakPrice}
                        onSlotSelected={(slots) => setSelectedSlots(slots)}
                    />
                </div>

                {/* CỘT PHẢI: TÓM TẮT */}
                <div className='bg-white shadow rounded-2xl p-8 border border-gray-200 h-fit'>
                    <h3 className='text-2xl font-bold text-gray-900 mb-6'>Tóm tắt đặt sân</h3>

                    <div className='space-y-3 text-[15px] text-gray-700'>
                        <div className='flex justify-between border-b pb-1'>
                            <span>Ngày đặt sân:</span>
                            <span className='font-semibold'>{dateDisplay}</span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Tên sân:</span>
                            <span className='font-semibold text-gray-800'>
                                {court.name || '--'}
                            </span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Loại sân:</span>
                            <span className='font-semibold'>
                                {court.type === 'indoor'
                                    ? 'Trong nhà'
                                    : court.type === 'outdoor'
                                    ? 'Ngoài trời'
                                    : court.type === 'vip'
                                    ? 'VIP'
                                    : court.type}
                            </span>
                        </div>

                        {court.formats && (
                            <div className='flex justify-between border-b pb-1'>
                                <span>Định dạng:</span>
                                <span className='font-semibold text-right'>
                                    {Array.isArray(court.formats)
                                        ? court.formats.join(', ')
                                        : court.formats}
                                </span>
                            </div>
                        )}

                        <div className='flex justify-between border-b pb-1'>
                            <span>Khung giờ:</span>
                            <span className='font-semibold text-right'>{timeDisplay}</span>
                        </div>

                        {selectedSlots.length > 0 && (
                            <>
                                <div className='flex justify-between border-b pb-1'>
                                    <span>Loại giá:</span>
                                    <span className='font-semibold'>{priceTypeLabel}</span>
                                </div>
                                <div className='flex justify-between border-b pb-1'>
                                    <span>Tổng số giờ:</span>
                                    <span>{totalDuration / 60} giờ</span>
                                </div>
                            </>
                        )}

                        <div className='flex justify-between border-b pb-1'>
                            <span>Vị trí:</span>
                            <span className='font-semibold text-right'>
                                {court.location || 'Chưa có thông tin'}
                            </span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Giờ mở cửa:</span>
                            <span className='font-semibold text-right'>
                                {court.openHours || '06:00 - 22:00'}
                            </span>
                        </div>

                        <div className='border-b pb-2'>
                            <span className='block font-medium mb-1'>Tiện ích:</span>
                            {court.amenities && court.amenities.length > 0 ? (
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
                            <span>
                                {totalPrice ? `${totalPrice.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleBooking}
                        disabled={!selectedSlots.length}
                        className={`w-full mt-6 font-bold py-3 rounded-lg transition ${
                            selectedSlots.length
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        Đặt sân
                    </button>

                    <p className='text-xs text-gray-400 mt-10 leading-relaxed italic border-t border-gray-100 pt-5'>
                        * Có thể hủy sớm cách giờ đá trên 6 giờ
                        <br />* Thời tiết xấu sẽ được hỗ trợ sắp xếp lại
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PitchDetail;

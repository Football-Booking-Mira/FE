import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import BookingTimeSelector from '@/components/BookingTimeSelector';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingScreen from '@/components/LoadingScreen';

import EquipmentPickerModal, { type EquipmentPickItem } from '@/components/EquipmentPickerModal';

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

interface SelectedSlot {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number;
}

interface Review {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    userId: {
        _id: string;
        name: string;
        avatar: string;
    };
}

//  ENV URL
const RAW_API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE = RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000').replace(/\/$/, '');

function formatVNDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

// key nội bộ: gắn cả date để phân biệt nhiều ngày
const slotKeyOf = (s: SelectedSlot) => `${s.date}|${s.startTime}-${s.endTime}`;

const PitchDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [court, setCourt] = useState<Court | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
    const [currentImage, setCurrentImage] = useState(0);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [open, setOpen] = useState(true);
    const [equipmentBySlot, setEquipmentBySlot] = useState<Record<string, EquipmentPickItem[]>>({});

    const [equipModalOpen, setEquipModalOpen] = useState(false);
    const [activeSlotKey, setActiveSlotKey] = useState<string>('');
    const [activeSlotLabel, setActiveSlotLabel] = useState<string>('');

    const socketRef = useRef<Socket | null>(null);

    //  FETCH COURT (with auto-retry when server is not ready)
    const retryRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchCourt = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/courts/${id}`);
            const data = await res.json();

            if (data?.success && data.data) {
                setCourt(data.data);
                setCurrentImage(0);
                retryRef.current = 0; // Reset retry counter on success
            } else {
                toast.error(data?.message || 'Không tìm thấy sân!');
                setCourt(null);
            }
            setLoading(false);
        } catch (err) {
            console.error('Lỗi tải sân:', err);
            // Auto retry khi server chưa sẵn sàng (network error)
            if (retryRef.current < 20) {
                retryRef.current += 1;
                console.log(`[PitchDetail] Đang thử kết nối lại... (lần ${retryRef.current})`);
                retryTimerRef.current = setTimeout(() => {
                    fetchCourt();
                }, 3000);
            } else {
                toast.error('Không thể kết nối tới máy chủ. Vui lòng thử lại sau!');
                setCourt(null);
                setLoading(false);
            }
        }
    }, [id]);

    useEffect(() => {
        fetchCourt();
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [fetchCourt]);

    //  SOCKET
    useEffect(() => {
        if (!id) return;

        const socket = io(SOCKET_URL, {
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

    // dọn thiết bị của slot bị bỏ chọn
    useEffect(() => {
        const keys = new Set(selectedSlots.map(slotKeyOf));
        setEquipmentBySlot((prev) => {
            const next: Record<string, EquipmentPickItem[]> = {};
            for (const k of Object.keys(prev)) {
                if (keys.has(k)) next[k] = prev[k];
            }
            return next;
        });
    }, [selectedSlots]);

    // Đánh giá (Review)
    useEffect(() => {
        if (!id) return;

        const fetchReviews = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");

                const res = await fetch(
                    `http://localhost:3000/api/review/court-pulic/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const json = await res.json();
                if (json.success) {
                    setReviews(json.data.reviews);
                }
            } catch (error) {
                console.error("Lỗi lấy review:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [id]);
    // đếm thiết bị theo slot để hiện “Thiết bị (n)” trong ô ca
    const equipmentCountBySlot = useMemo(() => {
        const m: Record<string, number> = {};
        for (const [k, arr] of Object.entries(equipmentBySlot)) m[k] = (arr || []).length;
        return m;
    }, [equipmentBySlot]);

    const overallTime = useMemo(() => {
        if (!selectedSlots.length) return { overallStart: '', overallEnd: '' };

        const sorted = [...selectedSlots].sort(
            (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
        );
        const overallStart = sorted[0].startTime;
        const overallEnd = sorted.reduce(
            (mx, s) => (toMinutes(s.endTime) > toMinutes(mx) ? s.endTime : mx),
            sorted[0].endTime
        );
        return { overallStart, overallEnd };
    }, [selectedSlots]);

    //  TIỀN SÂN
    const courtTotal = useMemo(
        () => selectedSlots.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
        [selectedSlots]
    );

    // TIỀN THIẾT BỊ (qty * unitPrice)
    const equipmentTotal = useMemo(() => {
        let sum = 0;
        for (const arr of Object.values(equipmentBySlot)) {
            for (const it of arr || []) {
                sum += (Number(it.price) || 0) * (Number(it.qty) || 0);
            }
        }
        return sum;
    }, [equipmentBySlot]);

    // TỔNG THANH TOÁN
    const grandTotal = courtTotal + equipmentTotal;

    const totalDuration = selectedSlots.reduce((sum, s) => sum + s.duration, 0);

    const dateDisplay = selectedSlots.length ? formatVNDate(new Date(selectedSlots[0].date)) : '--';
    const timeDisplay = selectedSlots.length
        ? selectedSlots.map((s) => `${s.startTime} - ${s.endTime}`).join(', ')
        : '--';

    const priceTypeLabel =
        selectedSlots.length > 0 && court
            ? selectedSlots.some((s) => s.price === court.peakPrice)
                ? 'Giá cao điểm'
                : 'Giá cơ bản'
            : '--';

    const openEquipForSlot = (slot: SelectedSlot) => {
        const k = slotKeyOf(slot);
        setActiveSlotKey(k);
        setActiveSlotLabel(`${slot.startTime} - ${slot.endTime}`);
        setEquipModalOpen(true);
    };

    const handleSaveEquip = (items: EquipmentPickItem[]) => {
        if (!activeSlotKey) return;
        setEquipmentBySlot((prev) => ({
            ...prev,
            [activeSlotKey]: items || [],
        }));
        setEquipModalOpen(false);
    };

    const handleBooking = () => {
        if (!selectedSlots.length || !court?._id) {
            toast.error('Vui lòng chọn khung giờ trước khi đặt sân!');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?._id || !user?.token) {
            toast.error('Vui lòng đăng nhập để đặt sân');
            navigate('/signin');
            return;
        }

        // Admin không được đặt sân ở trang khách hàng
        if (user?.role === 'admin') {
            toast.error('Tài khoản quản trị không thể đặt sân ở đây. Vui lòng sử dụng trang quản trị để tạo đơn đặt sân!');
            return;
        }

        const checkoutData = {
            courtId: court._id,
            courtName: court.name,
            date: selectedSlots[0].date,
            slots: selectedSlots,

            //  tách rõ
            courtTotal,
            equipmentTotal,
            grandTotal,

            totalDuration,
            overallStart: overallTime.overallStart,
            overallEnd: overallTime.overallEnd,

            equipmentBySlot,
        };

        localStorage.setItem('checkout-data', JSON.stringify(checkoutData));
        navigate('/booking-policy');
    };

    if (loading) {
        return <LoadingScreen fullScreen text="Đang tải thông tin sân..." />;
    }
    if (!court) return <p className='text-center mt-10 text-gray-600 dark:text-gray-300'>Không tìm thấy sân.</p>;

    return (
        <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-10'>
            <ToastContainer newestOnTop style={{ zIndex: 10001 }} />

            <div className='max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10'>
                {/* CỘT TRÁI */}
                <div className='bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-8 space-y-10'>
                    <h1 className='text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4'>{court.name}</h1>

                    {/* Ảnh sân */}
                    <div className='space-y-4'>
                        <div className='rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow'>
                            <img
                                src={
                                    court.images?.[currentImage] ||
                                    court.images?.[0] ||
                                    'https://picsum.photos/1200/600'
                                }
                                className='w-full h-[400px] object-cover'
                                alt='court'
                            />
                        </div>

                        <div className='flex gap-2 overflow-x-auto'>
                            {court.images?.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    className={`w-28 h-20 object-cover rounded-lg cursor-pointer border-2 ${currentImage === idx
                                        ? 'border-green-600'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                        }`}
                                    onClick={() => setCurrentImage(idx)}
                                    alt={`thumb-${idx}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* SELECT TIME + NÚT THIẾT BỊ TRONG Ô CA */}
                    <BookingTimeSelector
                        courtId={court._id}
                        basePrice={court.basePrice}
                        peakPrice={court.peakPrice}
                        onSlotSelected={setSelectedSlots}
                        onPickEquipment={openEquipForSlot}
                        equipmentCountBySlot={equipmentCountBySlot}
                    />
                </div>

                {/* CỘT PHẢI */}
                <div className='bg-white dark:bg-gray-800 shadow rounded-2xl p-8 border border-gray-200 dark:border-gray-700 h-fit'>
                    <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6'>Tóm tắt đặt sân</h3>

                    <div className='space-y-3 text-[15px] text-gray-700 dark:text-gray-300'>
                        <div className='flex justify-between border-b pb-1'>
                            <span>Ngày đặt sân:</span>
                            <span className='font-semibold'>{dateDisplay}</span>
                        </div>

                        <div className='flex justify-between border-b pb-1'>
                            <span>Tên sân:</span>
                            <span className='font-semibold text-gray-800 dark:text-gray-200'>
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
                                {/* VỊ TRÍ */}
                                <div className='flex justify-between border-b dark:border-gray-700 pb-2'>
                                    <span>Vị trí:</span>
                                    <span className='font-semibold text-right'>
                                        {court.location || 'Chưa có thông tin'}
                                    </span>
                                </div>

                                {/* GIỜ MỞ CỬA */}
                                <div className='flex justify-between border-b dark:border-gray-700 pb-2'>
                                    <span>Giờ mở cửa:</span>
                                    <span className='font-semibold text-right'>
                                        {court.openHours || '06:00 - 22:00'}
                                    </span>
                                </div>

                                {/* TIỆN ÍCH */}
                                <div className='border-b dark:border-gray-700 pb-2'>
                                    <span className='block font-medium mb-1'>Tiện ích:</span>
                                    {court.amenities && court.amenities.length > 0 ? (
                                        <div className='flex flex-wrap gap-2'>
                                            {court.amenities.map((a, idx) => (
                                                <span
                                                    key={idx}
                                                    className='bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-md border border-green-200 dark:border-green-800'
                                                >
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className='text-gray-500 dark:text-gray-400 text-sm italic'>
                                            Chưa có tiện ích
                                        </span>
                                    )}
                                </div>
                            </>
                        )}

                        {/* THIẾT BỊ THEO SLOT */}
                        {selectedSlots.length > 0 && (
                            <div className='border-b dark:border-gray-700 pb-3'>
                                <span className='block font-medium mb-3'>
                                    Thiết bị theo khung giờ:
                                </span>
                                <div className='space-y-3'>
                                    {selectedSlots.map((s) => {
                                        const k = slotKeyOf(s);
                                        const picked = equipmentBySlot[k] || [];
                                        return (
                                            <div
                                                key={k}
                                                className='flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-transparent dark:border-gray-700/50'
                                            >
                                                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                                    {s.startTime} - {s.endTime}
                                                    {picked.length > 0 && (
                                                        <span className='ml-2 text-xs text-green-600 dark:text-green-400 font-bold'>
                                                            ({picked.length} món)
                                                        </span>
                                                    )}
                                                </span>
                                                <button
                                                    type='button'
                                                    onClick={() => openEquipForSlot(s)}
                                                    className='text-[9px] px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all font-black shadow-sm'
                                                >
                                                    {picked.length > 0 ? 'Sửa' : 'Thêm'} thiết bị
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/*  tiền sân + tiền thiết bị */}
                        <div className='flex justify-between border-b dark:border-gray-700 pb-2'>
                            <span>Tiền sân:</span>
                            <span className='font-semibold'>
                                {courtTotal.toLocaleString('vi-VN')} VNĐ
                            </span>
                        </div>

                        <div className='flex justify-between border-b dark:border-gray-700 pb-2'>
                            <span>Tiền thiết bị:</span>
                            <span className='font-semibold'>
                                {equipmentTotal.toLocaleString('vi-VN')} VNĐ
                            </span>
                        </div>

                        <div className='flex justify-between items-center text-green-600 dark:text-green-400 font-black text-xl border-t dark:border-gray-700 pt-5'>
                            <span>Tổng thanh toán:</span>
                            <span>{grandTotal.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                    </div>

                    <button
                        onClick={handleBooking}
                        disabled={!selectedSlots.length}
                        className={`w-full mt-6 font-bold py-3 rounded-xl transition-all shadow-lg ${selectedSlots.length
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                        type='button'
                    >
                        Đặt sân ngay
                    </button>
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6 border border-gray-200 dark:border-gray-700 h-fit mt-5">
                        {/* Header */}
                        <div
                            className="flex items-center justify-between cursor-pointer select-none"
                            onClick={() => setOpen(!open)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-yellow-500 text-xl">⭐</span>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 !mb-0">
                                    Đánh giá & nhận xét sân
                                </h3>
                            </div>

                            <span className="text-gray-500 dark:text-gray-300 text-lg transition-transform duration-200">
                                {open ? "▾" : "▸"}
                            </span>
                        </div>

                        {/* Content */}
                        {open && (
                            <div className="mt-5 space-y-5">
                                {/* Loading */}
                                {loading && (
                                    <div className="text-gray-500 dark:text-gray-300 text-sm italic">
                                        Đang tải đánh giá...
                                    </div>
                                )}

                                {/* Empty */}
                                {!loading && reviews.length === 0 && (
                                    <div className="text-gray-500 dark:text-gray-300 italic text-sm">
                                        Sân này chưa có đánh giá nào
                                    </div>
                                )}

                                {/* Reviews */}
                                {!loading &&
                                    reviews.map((review) => (
                                        <div
                                            key={review._id}
                                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition"
                                        >
                                            {/* User */}
                                            <div className="flex items-center gap-4 mb-3">
                                                <img
                                                    src={
                                                        review.userId?.avatar ||
                                                        `https://ui-avatars.com/api/?name=${review.userId?.name || 'Khách'}&background=random`
                                                    }
                                                    alt={review.userId?.name || 'Người dùng'}
                                                    className="w-11 h-11 rounded-full object-cover border"
                                                />

                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                                        {review.userId?.name || 'Người dùng ẩn danh'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-300">
                                                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                                                    </p>
                                                </div>

                                                {/* Rating number */}
                                                <span className="text-sm font-semibold text-yellow-500">
                                                    {review.rating}/5
                                                </span>
                                            </div>

                                            {/* Stars */}
                                            <div className="flex items-center gap-1 mb-2">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={
                                                            i < review.rating
                                                                ? "text-yellow-500"
                                                                : "text-gray-300 dark:text-gray-600"
                                                        }
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Comment */}
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                                {review.comment}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* MODAL CHỌN THIẾT BỊ */}
            <EquipmentPickerModal
                open={equipModalOpen}
                onClose={() => setEquipModalOpen(false)}
                slotLabel={activeSlotLabel}
                slotKey={activeSlotKey}
                token={JSON.parse(localStorage.getItem('user') || '{}')?.token}
                initialItems={activeSlotKey ? equipmentBySlot[activeSlotKey] || [] : []}
                otherSlotsPicked={Object.keys(equipmentBySlot)
                    .filter(k => k !== activeSlotKey)
                    .flatMap(k => equipmentBySlot[k])}
                onSave={handleSaveEquip}
            />
        </div >
    );
};

export default PitchDetail;

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import BookingTimeSelector from '@/components/BookingTimeSelector';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingScreen from '@/components/LoadingScreen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
                    `${API_BASE}/review/court-pulic/${id}`,
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
    // đếm thiết bị theo slot để hiện "Thiết bị (n)" trong ô ca
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
        <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 md:px-6 lg:px-8 font-sans'>
            <ToastContainer newestOnTop style={{ zIndex: 10001 }} />

            {/* === 12-COLUMN GRID: Left (8) + Right Sidebar (4) === */}
            <div className='max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start'>

                {/* ============================================= */}
                {/* CỘT TRÁI — col-span-8                        */}
                {/* Court Info + Images + Time Selector + Reviews */}
                {/* ============================================= */}
                <div className='lg:col-span-8 space-y-6'>

                    {/* Court Info Card */}
                    <Card className='shadow-sm border-gray-100/80 dark:border-gray-700/50 overflow-hidden'>
                        <CardContent className='p-6 md:p-8 space-y-8'>
                            {/* Court name & badges */}
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                    <Badge variant="outline" className='bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 font-bold text-xs rounded-lg px-3 py-1'>
                                        {court.type === 'indoor' ? '🏢 Trong nhà' : court.type === 'outdoor' ? '🌤️ Ngoài trời' : court.type === 'vip' ? '⭐ VIP' : court.type}
                                    </Badge>
                                    {court.formats && (
                                        <Badge variant="secondary" className='font-semibold text-xs rounded-lg px-3 py-1'>
                                            {Array.isArray(court.formats) ? court.formats.join(', ') : court.formats}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className='text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-200'>{court.name}</h1>
                                {court.location && (
                                    <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-sm">
                                        <span className="text-emerald-500">📍</span> {court.location}
                                    </p>
                                )}
                            </div>

                            {/* Ảnh sân */}
                            <div className='space-y-3'>
                                <div className='rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm img-zoom-container'>
                                    <img
                                        src={
                                            court.images?.[currentImage] ||
                                            court.images?.[0] ||
                                            'https://picsum.photos/1200/600'
                                        }
                                        className='w-full h-[300px] md:h-[420px] object-cover'
                                        alt='court'
                                    />
                                </div>

                                <div className='flex gap-2 overflow-x-auto scrollbar-hide pb-1'>
                                    {court.images?.map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            className={`w-20 h-14 md:w-24 md:h-18 object-cover rounded-lg cursor-pointer border-2 transition-all duration-200 shrink-0 ${currentImage === idx
                                                ? 'border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.03]'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-emerald-400 opacity-60 hover:opacity-100'
                                                }`}
                                            onClick={() => setCurrentImage(idx)}
                                            alt={`thumb-${idx}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SELECT TIME + NÚT THIẾT BỊ TRONG Ô CA */}
                    <BookingTimeSelector
                        courtId={court._id}
                        basePrice={court.basePrice}
                        peakPrice={court.peakPrice}
                        onSlotSelected={setSelectedSlots}
                        onPickEquipment={openEquipForSlot}
                        equipmentCountBySlot={equipmentCountBySlot}
                    />

                    {/* ======================================= */}
                    {/* REVIEWS — Now in LEFT column, never     */}
                    {/* overlapped by sticky sidebar            */}
                    {/* ======================================= */}
                    <Card className='shadow-sm border-gray-100/80 dark:border-gray-700 max-w-4xl mx-auto w-full'>
                        <CardHeader className='cursor-pointer select-none' onClick={() => setOpen(!open)}>
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-base">⭐</div>
                                    <CardTitle className='text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100'>
                                        Đánh giá & nhận xét
                                        {reviews.length > 0 && (
                                            <Badge variant="secondary" className='ml-2 text-[10px] font-bold rounded-md'>
                                                {reviews.length}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </div>
                                <span className="text-gray-400 dark:text-gray-300 text-base transition-transform duration-200 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">
                                    {open ? "▾" : "▸"}
                                </span>
                            </div>
                        </CardHeader>

                        {open && (
                            <CardContent className='space-y-4 pt-0 max-w-3xl mx-auto w-full'>
                                {/* Loading */}
                                {loading && (
                                    <div className="space-y-3">
                                        {[0, 1].map(i => (
                                            <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="skeleton w-8 h-8 rounded-full"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="skeleton h-3.5 w-24 rounded-md"></div>
                                                        <div className="skeleton h-3 w-16 rounded-md"></div>
                                                    </div>
                                                </div>
                                                <div className="skeleton h-3.5 w-full rounded-md"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty */}
                                {!loading && reviews.length === 0 && (
                                    <div className="text-center py-10">
                                        <div className="text-4xl mb-3">💬</div>
                                        <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">
                                            Sân này chưa có đánh giá nào
                                        </p>
                                    </div>
                                )}

                                {/* Reviews */}
                                {!loading &&
                                    reviews.map((review) => (
                                        <div
                                            key={review._id}
                                            className="bg-gray-50/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-all duration-200 border-l-[3px] border-l-amber-400 dark:border-l-amber-500"
                                        >
                                            {/* User */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <img
                                                    src={
                                                        review.userId?.avatar ||
                                                        `https://ui-avatars.com/api/?name=${review.userId?.name || 'Khách'}&background=random`
                                                    }
                                                    alt={review.userId?.name || 'Người dùng'}
                                                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-200 dark:border-amber-700 shadow-sm"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {review.userId?.name || 'Người dùng ẩn danh'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                                                    </p>
                                                </div>

                                                {/* Rating badge */}
                                                <Badge variant="outline" className='text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30 rounded-lg px-2.5 py-1'>
                                                    {review.rating}/5 ★
                                                </Badge>
                                            </div>

                                            {/* Stars */}
                                            <div className="flex items-center gap-0.5 mb-2">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={`text-sm ${
                                                            i < review.rating
                                                                ? "text-amber-400"
                                                                : "text-gray-200 dark:text-gray-600"
                                                        }`}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Comment */}
                                            <p className="text-sm mt-2 leading-relaxed text-foreground">
                                                {review.comment}
                                            </p>
                                        </div>
                                    ))}
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* ============================================= */}
                {/* CỘT PHẢI — col-span-4 (Sticky Sidebar)      */}
                {/* Summary only — scrolls internally if tall    */}
                {/* ============================================= */}
                <div className='lg:col-span-4'>
                    <Card className='shadow-sm border-gray-100/80 dark:border-gray-700 sticky top-24 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide'>
                        <CardHeader className='pb-2'>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-base">📋</div>
                                <CardTitle className='text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100'>Tóm tắt đặt sân</CardTitle>
                            </div>
                        </CardHeader>

                        <CardContent className='space-y-0 text-sm'>
                            {/* Summary rows */}
                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Ngày đặt sân</span>
                                <span className='text-sm font-medium text-foreground'>{dateDisplay}</span>
                            </div>

                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Tên sân</span>
                                <span className='text-sm font-medium text-foreground truncate max-w-[55%] text-right'>
                                    {court.name || '--'}
                                </span>
                            </div>

                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Loại sân</span>
                                <span className='text-sm font-medium text-foreground'>
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
                                <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                    <span className="text-sm text-muted-foreground">Định dạng</span>
                                    <span className='text-sm font-medium text-foreground text-right'>
                                        {Array.isArray(court.formats)
                                            ? court.formats.join(', ')
                                            : court.formats}
                                    </span>
                                </div>
                            )}

                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Khung giờ</span>
                                <span className='text-sm font-medium text-foreground text-right max-w-[55%]'>{timeDisplay}</span>
                            </div>

                            {selectedSlots.length > 0 && (
                                <>
                                    <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                        <span className="text-sm text-muted-foreground">Loại giá</span>
                                        <span className='text-sm font-medium text-foreground'>{priceTypeLabel}</span>
                                    </div>
                                    <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                        <span className="text-sm text-muted-foreground">Tổng số giờ</span>
                                        <span className="text-sm font-medium text-foreground">{totalDuration / 60} giờ</span>
                                    </div>
                                    {/* VỊ TRÍ */}
                                    <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                        <span className="text-sm text-muted-foreground">Vị trí</span>
                                        <span className='text-sm font-medium text-foreground text-right max-w-[55%]'>
                                            {court.location || 'Chưa có thông tin'}
                                        </span>
                                    </div>

                                    {/* GIỜ MỞ CỬA */}
                                    <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                        <span className="text-sm text-muted-foreground">Giờ mở cửa</span>
                                        <span className='text-sm font-medium text-foreground text-right'>
                                            {court.openHours || '06:00 - 22:00'}
                                        </span>
                                    </div>

                                    {/* TIỆN ÍCH */}
                                    <div className='py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                        <span className='block font-medium text-sm text-muted-foreground mb-2'>Tiện ích</span>
                                        {court.amenities && court.amenities.length > 0 ? (
                                            <div className='flex flex-wrap gap-1.5'>
                                                {court.amenities.map((a, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className='bg-emerald-50 dark:bg-green-900/30 text-emerald-700 dark:text-green-400 border-emerald-100 dark:border-green-800 text-[11px] font-semibold rounded-md'
                                                    >
                                                        {a}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className='text-gray-400 dark:text-gray-400 text-sm italic'>
                                                Chưa có tiện ích
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* THIẾT BỊ THEO SLOT */}
                            {selectedSlots.length > 0 && (
                                <div className='py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                    <span className='block font-medium text-sm text-muted-foreground mb-2.5'>
                                        Thiết bị theo khung giờ
                                    </span>
                                    <div className='space-y-2'>
                                        {selectedSlots.map((s) => {
                                            const k = slotKeyOf(s);
                                            const picked = equipmentBySlot[k] || [];
                                            return (
                                                <div
                                                    key={k}
                                                    className='flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50'
                                                >
                                                    <span className='text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5'>
                                                        <span className="text-emerald-500 text-[10px]">⏰</span>
                                                        {s.startTime} – {s.endTime}
                                                        {picked.length > 0 && (
                                                            <Badge variant="outline" className='text-[9px] text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-green-900/20 border-emerald-100 dark:border-green-800 font-bold rounded-md px-1.5 py-0'>
                                                                {picked.length}
                                                            </Badge>
                                                        )}
                                                    </span>
                                                    <button
                                                        type='button'
                                                        onClick={() => openEquipForSlot(s)}
                                                        className='text-[10px] px-2 py-1 rounded-md border border-emerald-200 dark:border-green-800 text-emerald-700 dark:text-green-400 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-green-900/20 transition-all font-bold'
                                                    >
                                                        {picked.length > 0 ? 'Sửa' : '+ Thêm'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/*  tiền sân + tiền thiết bị */}
                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Tiền sân</span>
                                <span className='text-sm font-medium text-foreground'>
                                    {courtTotal.toLocaleString('vi-VN')} VNĐ
                                </span>
                            </div>

                            <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-700/50'>
                                <span className="text-sm text-muted-foreground">Tiền thiết bị</span>
                                <span className='text-sm font-medium text-foreground'>
                                    {equipmentTotal.toLocaleString('vi-VN')} VNĐ
                                </span>
                            </div>

                            {/* Total row with gradient background */}
                            <div className='flex justify-between items-center mt-4 p-3.5 -mx-1 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30'>
                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Tổng thanh toán</span>
                                <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight">{grandTotal.toLocaleString('vi-VN')} VNĐ</span>
                            </div>

                            <button
                                onClick={handleBooking}
                                disabled={!selectedSlots.length}
                                className={`w-full mt-5 font-bold py-3 rounded-xl transition-all duration-200 text-sm ${selectedSlots.length
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                type='button'
                            >
                                {selectedSlots.length ? '⚡ Đặt sân ngay' : 'Đặt sân ngay'}
                            </button>
                        </CardContent>
                    </Card>
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

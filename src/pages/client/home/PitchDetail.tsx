import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import BookingTimeSelector from '@/components/BookingTimeSelector';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingScreen from '@/components/LoadingScreen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap, Clock, MapPin, CheckCircle2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// ENV URL
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

// Internal key for slot
const slotKeyOf = (s: SelectedSlot) => `${s.date}|${s.startTime}-${s.endTime}`;

const PitchDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [court, setCourt] = useState<Court | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
    const [currentImage, setCurrentImage] = useState(0);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsOpen, setReviewsOpen] = useState(true);
    const [equipmentBySlot, setEquipmentBySlot] = useState<Record<string, EquipmentPickItem[]>>({});

    const [equipModalOpen, setEquipModalOpen] = useState(false);
    const [activeSlotKey, setActiveSlotKey] = useState<string>('');
    const [activeSlotLabel, setActiveSlotLabel] = useState<string>('');

    const socketRef = useRef<Socket | null>(null);

    // FETCH COURT
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
                retryRef.current = 0;
            } else {
                toast.error(data?.message || 'Không tìm thấy sân!');
                setCourt(null);
            }
            setLoading(false);
        } catch (err) {
            console.error('Lỗi tải sân:', err);
            if (retryRef.current < 20) {
                retryRef.current += 1;
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

    // SOCKET
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

    // Clean equipment for unselected slots
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

    // Reviews
    useEffect(() => {
        if (!id) return;

        const fetchReviews = async () => {
            try {
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
                    setReviews(json.data.reviews || []);
                }
            } catch (error) {
                console.error("Lỗi lấy review:", error);
            }
        };

        fetchReviews();
    }, [id]);

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

    // Financial totals
    const courtTotal = useMemo(
        () => selectedSlots.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
        [selectedSlots]
    );

    const equipmentTotal = useMemo(() => {
        let sum = 0;
        for (const arr of Object.values(equipmentBySlot)) {
            for (const it of arr || []) {
                sum += (Number(it.price) || 0) * (Number(it.qty) || 0);
            }
        }
        return sum;
    }, [equipmentBySlot]);

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

        if (user?.role === 'admin') {
            toast.error('Tài khoản quản trị không thể đặt sân ở đây. Vui lòng sử dụng trang quản trị để tạo đơn đặt sân!');
            return;
        }

        const checkoutData = {
            courtId: court._id,
            courtName: court.name,
            date: selectedSlots[0].date,
            slots: selectedSlots,
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
    if (!court) return <p className='text-center mt-10 text-muted-foreground font-semibold'>Không tìm thấy sân.</p>;

    return (
        <div className='min-h-screen bg-slate-50 dark:bg-slate-950 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 font-sans pb-28 lg:pb-8'>
            <ToastContainer newestOnTop style={{ zIndex: 10001 }} />

            {/* Main Container */}
            <div className='max-w-[1550px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative'>

                {/* LEFT COLUMN (col-span-8) */}
                <div className='lg:col-span-8 space-y-6'>

                    {/* Court Info Card */}
                    <Card className='shadow-xs border-border/80 rounded-3xl overflow-hidden bg-card'>
                        <CardContent className='p-5 sm:p-7 space-y-6'>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                                    <Badge variant="outline" className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs rounded-lg px-3 py-1'>
                                        {court.type === 'indoor' ? '🏢 Trong nhà' : court.type === 'outdoor' ? '🌤️ Ngoài trời' : court.type === 'vip' ? '⭐ VIP' : court.type}
                                    </Badge>
                                    {court.formats && (
                                        <Badge variant="secondary" className='font-semibold text-xs rounded-lg px-3 py-1'>
                                            {Array.isArray(court.formats) ? court.formats.join(', ') : court.formats}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold rounded-lg px-2.5 py-1 flex items-center gap-1">
                                        <ShieldCheck size={12} /> Giữ sân 100%
                                    </Badge>
                                </div>
                                <h1 className='text-2xl sm:text-3xl font-black tracking-tight text-foreground'>{court.name}</h1>
                                {court.location && (
                                    <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                                        <MapPin size={15} className="text-emerald-500 shrink-0" /> {court.location}
                                    </p>
                                )}
                            </div>

                            {/* Images Gallery */}
                            <div className='space-y-3'>
                                <div className='rounded-2xl overflow-hidden border border-border/60 shadow-xs relative bg-muted'>
                                    <img
                                        src={
                                            court.images?.[currentImage] ||
                                            court.images?.[0] ||
                                            'https://picsum.photos/1200/600'
                                        }
                                        className='w-full h-[280px] sm:h-[400px] object-cover'
                                        alt='court'
                                    />
                                </div>

                                {court.images && court.images.length > 1 && (
                                    <div className='flex gap-2.5 overflow-x-auto scrollbar-hide pb-1'>
                                        {court.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                className={`w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-xl cursor-pointer border-2 transition-all shrink-0 ${currentImage === idx
                                                    ? 'border-emerald-500 shadow-md scale-105'
                                                    : 'border-border/60 hover:border-emerald-400 opacity-70 hover:opacity-100'
                                                    }`}
                                                onClick={() => setCurrentImage(idx)}
                                                alt={`thumb-${idx}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* TIME SELECTOR GRID */}
                    <BookingTimeSelector
                        courtId={court._id}
                        basePrice={court.basePrice}
                        peakPrice={court.peakPrice}
                        onSlotSelected={setSelectedSlots}
                        onPickEquipment={openEquipForSlot}
                        equipmentCountBySlot={equipmentCountBySlot}
                    />

                    {/* REVIEWS SECTION */}
                    <Card className='shadow-xs border-border/80 rounded-3xl overflow-hidden bg-card'>
                        <CardHeader className='cursor-pointer select-none py-4 px-6 border-b border-border/40 hover:bg-muted/20 transition-colors' onClick={() => setReviewsOpen(!reviewsOpen)}>
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">⭐</div>
                                    <CardTitle className='text-base font-extrabold text-foreground'>
                                        Đánh giá & nhận xét
                                        {reviews.length > 0 && (
                                            <Badge variant="secondary" className='ml-2 text-[10px] font-extrabold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                                                {reviews.length}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </div>
                                <div className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                                    {reviewsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </div>
                        </CardHeader>

                        {reviewsOpen && (
                            <CardContent className='p-6 space-y-4'>
                                {reviews.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground text-xs font-semibold">
                                            Sân bóng này chưa có đánh giá nào. Hãy là người đầu tiên đặt sân và trải nghiệm!
                                        </p>
                                    </div>
                                ) : (
                                    reviews.map((review) => (
                                        <div
                                            key={review._id}
                                            className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={
                                                            review.userId?.avatar ||
                                                            `https://ui-avatars.com/api/?name=${review.userId?.name || 'Khách'}&background=random`
                                                        }
                                                        alt={review.userId?.name || 'Người dùng'}
                                                        className="w-8 h-8 rounded-full object-cover border border-amber-500/30"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">
                                                            {review.userId?.name || 'Khách hàng'}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className='text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'>
                                                    {review.rating}/5 ★
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                                                {review.comment}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* RIGHT COLUMN (col-span-4) - DESKTOP SIDEBAR WITH PINNED FOOTER */}
                <div className='lg:col-span-4 sticky top-20 hidden lg:block'>
                    <Card className='shadow-xl border-border/80 rounded-3xl overflow-hidden bg-card flex flex-col max-h-[calc(100vh-100px)]'>
                        {/* Header */}
                        <CardHeader className='pb-3 pt-5 px-6 border-b border-border/50 bg-muted/20 shrink-0'>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold text-sm">📋</div>
                                    <CardTitle className='text-base font-extrabold text-foreground'>Tóm tắt đặt sân</CardTitle>
                                </div>
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    {selectedSlots.length} Khung giờ
                                </span>
                            </div>
                        </CardHeader>

                        {/* Scrollable Summary Rows */}
                        <CardContent className='p-6 overflow-y-auto no-scrollbar space-y-0 text-xs flex-1'>
                            <div className='flex justify-between py-2.5 border-b border-border/40'>
                                <span className="text-muted-foreground">Ngày đặt sân</span>
                                <span className='font-bold text-foreground'>{dateDisplay}</span>
                            </div>

                            <div className='flex justify-between py-2.5 border-b border-border/40'>
                                <span className="text-muted-foreground">Tên sân</span>
                                <span className='font-bold text-foreground truncate max-w-[55%] text-right'>
                                    {court.name || '--'}
                                </span>
                            </div>

                            <div className='flex justify-between py-2.5 border-b border-border/40'>
                                <span className="text-muted-foreground">Loại sân & Định dạng</span>
                                <span className='font-bold text-foreground'>
                                    {court.type === 'indoor' ? 'Trong nhà' : court.type === 'outdoor' ? 'Ngoài trời' : 'VIP'} ({Array.isArray(court.formats) ? court.formats.join(', ') : court.formats || 'Standard'})
                                </span>
                            </div>

                            <div className='flex justify-between py-2.5 border-b border-border/40'>
                                <span className="text-muted-foreground">Khung giờ</span>
                                <span className='font-bold text-emerald-600 dark:text-emerald-400 text-right max-w-[60%] truncate'>{timeDisplay}</span>
                            </div>

                            {selectedSlots.length > 0 && (
                                <>
                                    <div className='flex justify-between py-2.5 border-b border-border/40'>
                                        <span className="text-muted-foreground">Loại giá</span>
                                        <span className='font-bold text-foreground'>{priceTypeLabel}</span>
                                    </div>
                                    <div className='flex justify-between py-2.5 border-b border-border/40'>
                                        <span className="text-muted-foreground">Tổng thời gian</span>
                                        <span className="font-bold text-foreground">{totalDuration / 60} giờ</span>
                                    </div>
                                    <div className='flex justify-between py-2.5 border-b border-border/40'>
                                        <span className="text-muted-foreground">Vị trí</span>
                                        <span className='font-medium text-foreground text-right max-w-[55%] truncate'>
                                            {court.location || 'Chưa có thông tin'}
                                        </span>
                                    </div>

                                    {/* Equipment per slot */}
                                    <div className='py-3 border-b border-border/40 space-y-2'>
                                        <span className='block font-bold text-muted-foreground text-[11px] uppercase tracking-wider'>
                                            Thiết bị theo khung giờ
                                        </span>
                                        <div className='space-y-1.5'>
                                            {selectedSlots.map((s) => {
                                                const k = slotKeyOf(s);
                                                const picked = equipmentBySlot[k] || [];
                                                return (
                                                    <div
                                                        key={k}
                                                        className='flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/50'
                                                    >
                                                        <span className='text-[11px] font-semibold text-foreground flex items-center gap-1.5 truncate'>
                                                            <Clock size={11} className="text-emerald-500 shrink-0" />
                                                            {s.startTime} – {s.endTime}
                                                            {picked.length > 0 && (
                                                                <Badge variant="outline" className='text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold px-1.5 py-0'>
                                                                    {picked.length} món
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <button
                                                            type='button'
                                                            onClick={() => openEquipForSlot(s)}
                                                            className='text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-card hover:bg-emerald-500/10 transition-all font-extrabold shrink-0'
                                                        >
                                                            {picked.length > 0 ? 'Sửa' : '+ Thêm'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Breakdown Prices */}
                            <div className='pt-2 space-y-1.5'>
                                <div className='flex justify-between text-xs text-muted-foreground'>
                                    <span>Tiền sân</span>
                                    <span className='font-bold text-foreground'>{courtTotal.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className='flex justify-between text-xs text-muted-foreground'>
                                    <span>Tiền thiết bị</span>
                                    <span className='font-bold text-foreground'>{equipmentTotal.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </CardContent>

                        {/* PINNED ACTION FOOTER (ALWAYS VISIBLE ON DESKTOP) */}
                        <div className='p-5 border-t border-border bg-card shrink-0 shadow-lg space-y-3'>
                            <div className='flex justify-between items-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20'>
                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Tổng thanh toán</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    {grandTotal.toLocaleString('vi-VN')}đ
                                </span>
                            </div>

                            <button
                                onClick={handleBooking}
                                disabled={!selectedSlots.length}
                                className={`w-full font-black py-3.5 rounded-2xl transition-all duration-300 text-sm flex items-center justify-center gap-2 ${selectedSlots.length
                                    ? 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                    : 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border/50'
                                    }`}
                                type='button'
                            >
                                {selectedSlots.length ? (
                                    <>
                                        <Zap size={16} className="fill-white" />
                                        <span>ĐẶT SÂN NGAY</span>
                                    </>
                                ) : (
                                    'Vui lòng chọn khung giờ'
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-muted-foreground pt-1">
                                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Giữ sân tức thì</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-500" /> Đảm bảo 100%</span>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>

            {/* MOBILE & TABLET FLOATING STICKY ACTION BAR (<1024px) */}
            <div className='fixed bottom-0 left-0 right-0 z-50 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-border/80 p-3 sm:p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] lg:hidden'>
                <div className='max-w-md mx-auto flex items-center justify-between gap-3'>
                    <div className='flex flex-col min-w-0'>
                        {selectedSlots.length > 0 ? (
                            <>
                                <span className='text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider truncate'>
                                    {selectedSlots.length} ca đặt — {dateDisplay}
                                </span>
                                <div className='flex items-baseline gap-1'>
                                    <span className='text-xs font-semibold text-muted-foreground'>Tổng:</span>
                                    <span className='text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight'>
                                        {grandTotal.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className='flex flex-col'>
                                <span className='text-xs font-bold text-foreground'>Đặt sân {court.name}</span>
                                <span className='text-[10px] text-muted-foreground'>Vui lòng chọn ca bên trên</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleBooking}
                        disabled={!selectedSlots.length}
                        className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-md ${selectedSlots.length
                            ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30 active:scale-95'
                            : 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border/50'
                            }`}
                        type='button'
                    >
                        {selectedSlots.length ? (
                            <>
                                <Zap size={14} className="fill-white" />
                                <span>Đặt ngay</span>
                            </>
                        ) : (
                            'Chọn ca'
                        )}
                    </button>
                </div>
            </div>

            {/* EQUIPMENT MODAL */}
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
        </div>
    );
};

export default PitchDetail;

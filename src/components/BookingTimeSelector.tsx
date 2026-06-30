import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

dayjs.locale('vi');

export interface SelectedSlot {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number;
}

interface Props {
    courtId: string;
    basePrice: number;
    peakPrice: number;
    onSlotSelected: (slots: SelectedSlot[]) => void;
    single?: boolean;

    onPickEquipment?: (slot: SelectedSlot) => void;
    equipmentCountBySlot?: Record<string, number>;
}

interface BookedSlot {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    slots?: { startTime: string; endTime: string }[];
}

const RAW_API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE = RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000').replace(/\/$/, '');

const START_HOUR = 6;
const SLOT_DURATION = 60;
const BREAK_DURATION = 15;
const PEAK_START = 16;

const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
});

const minToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (m === 0) return `${h}h`;
    return `${h}h${m}`;
};

const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateToVN = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const generateSlots = () => {
    const slots: { start: string; end: string }[] = [];
    let current = START_HOUR * 60;
    const endDay = 23 * 60;

    while (current + SLOT_DURATION <= endDay) {
        const start = minToTime(current);
        const end = minToTime(current + SLOT_DURATION);
        slots.push({ start, end });
        current += SLOT_DURATION + BREAK_DURATION;
    }
    return slots;
};

const TIME_SLOTS = generateSlots();
const slotKeyOf = (date: string, start: string, end: string) => `${date}|${start}-${end}`;

const BookingTimeSelector: React.FC<Props> = ({
    courtId,
    basePrice,
    peakPrice,
    onSlotSelected,
    single,
    onPickEquipment,
    equipmentCountBySlot,
}) => {
    const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateStr());
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [selectedHours, setSelectedHours] = useState(0);
    const [breakMinutes, setBreakMinutes] = useState(0);

    //  giữ callback ổn định tránh loop
    const onSlotSelectedRef = useRef(onSlotSelected);
    useEffect(() => {
        onSlotSelectedRef.current = onSlotSelected;
    }, [onSlotSelected]);

    const fetchBooked = useCallback(async () => {
        if (!courtId || !selectedDateStr) return;
        try {
            const res = await fetch(
                `${API_BASE}/bookings/court/${courtId}?startDate=${selectedDateStr}&endDate=${selectedDateStr}`
            );
            const data = await res.json();
            if (data.success) setBookedSlots(data.data || []);
        } catch (e) {
            console.error(e);
        }
    }, [courtId, selectedDateStr]);

    // reset khi đổi ngày / sân
    useEffect(() => {
        setSelectedSlots([]);
        setTotalPrice(0);
        setSelectedHours(0);
        setBreakMinutes(0);

        // dùng ref
        onSlotSelectedRef.current([]);

        fetchBooked();
    }, [fetchBooked]);

    useEffect(() => {
        if (!courtId) return;

        socket.emit('join:court', courtId);

        const handleBookingUpdated = (payload?: { courtId?: string; date?: string }) => {
            if (!payload || !payload.courtId || String(payload.courtId) === String(courtId)) {
                if (!payload?.date || payload.date === selectedDateStr) fetchBooked();
            }
        };

        const handleBookingGlobalUpdated = () => fetchBooked();

        socket.on('booking_updated', handleBookingUpdated);
        socket.on('booking_global_updated', handleBookingGlobalUpdated);

        return () => {
            socket.off('booking_updated', handleBookingUpdated);
            socket.off('booking_global_updated', handleBookingGlobalUpdated);
            socket.emit('leave:court', courtId);
        };
    }, [courtId, selectedDateStr, fetchBooked]);

    const isBooked = (s: string, e: string) => {
        const sMin = timeToMin(s);
        const eMin = timeToMin(e);

        return bookedSlots.some((b) => {
            const bDate =
                typeof b.date === 'string'
                    ? b.date.slice(0, 10)
                    : new Date(b.date).toISOString().slice(0, 10);

            if (bDate !== selectedDateStr) return false;
            if (b.status === 'cancelled') return false;

            if (Array.isArray(b.slots) && b.slots.length > 0) {
                return b.slots.some((slot) => {
                    const bS = timeToMin(slot.startTime);
                    const bE = timeToMin(slot.endTime);
                    return sMin < bE && eMin > bS;
                });
            }

            const bS = timeToMin(b.startTime);
            const bE = timeToMin(b.endTime);
            return sMin < bE && eMin > bS;
        });
    };

    const isPast = (s: string) => {
        const todayStr = getLocalDateStr();
        if (selectedDateStr > todayStr) return false;
        if (selectedDateStr < todayStr) return true;
        const now = new Date();
        const [h, m] = s.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        return slotTime < now;
    };

    const isSelected = (s: string) => selectedSlots.includes(s);

    const handleSlotClick = (s: string, e: string) => {
        if (isPast(s) || isBooked(s, e)) return;

        setSelectedSlots((prev) => {
            if (single) {
                if (prev.includes(s)) return [];
                return [s];
            }
            if (prev.includes(s)) return prev.filter((x) => x !== s);
            return [...prev, s].sort((a, b) => timeToMin(a) - timeToMin(b));
        });
    };

    // bỏ onSlotSelected khỏi deps để không loop
    useEffect(() => {
        if (selectedSlots.length === 0) {
            setTotalPrice(0);
            setSelectedHours(0);
            setBreakMinutes(0);
            onSlotSelectedRef.current([]);
            return;
        }

        let total = 0;
        const chosenSlots: SelectedSlot[] = [];
        const chosenIndexes: number[] = [];

        TIME_SLOTS.forEach((slot, idx) => {
            if (selectedSlots.includes(slot.start)) {
                const sMin = timeToMin(slot.start);
                const isPeak = sMin / 60 >= PEAK_START;
                const price = isPeak ? peakPrice : basePrice;
                total += price;

                chosenIndexes.push(idx);
                chosenSlots.push({
                    date: selectedDateStr,
                    startTime: slot.start,
                    endTime: slot.end,
                    price,
                    duration: 60,
                });
            }
        });

        let totalBreak = 0;
        const sortedStarts = [...selectedSlots].sort((a, b) => timeToMin(a) - timeToMin(b));
        for (let i = 0; i < sortedStarts.length - 1; i++) {
            const currentSlot = TIME_SLOTS.find(s => s.start === sortedStarts[i]);
            const nextSlot = TIME_SLOTS.find(s => s.start === sortedStarts[i + 1]);
            if (currentSlot && nextSlot) {
                const gap = timeToMin(nextSlot.start) - timeToMin(currentSlot.end);
                if (gap > 0) {
                   totalBreak += gap;
                }
            }
        }

        setTotalPrice(total);
        setSelectedHours(chosenSlots.length);
        setBreakMinutes(totalBreak);

        onSlotSelectedRef.current(chosenSlots);
    }, [selectedSlots, selectedDateStr, basePrice, peakPrice]);

    const selectedDisplay =
        selectedSlots.length === 0
            ? '--:--'
            : TIME_SLOTS.filter((slot) => selectedSlots.includes(slot.start))
                  .map(
                      (slot) => `${formatDisplayTime(slot.start)} - ${formatDisplayTime(slot.end)}`
                  )
                  .join(', ');

    return (
        <Card className='w-full max-w-4xl mx-auto shadow-sm border-gray-100 dark:border-gray-700'>
            <CardHeader className='pb-2'>
                <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-3'>
                    <CardTitle className='text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight'>
                        Chọn khung giờ
                    </CardTitle>

                    <Badge variant="outline" className='bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50 font-semibold text-xs rounded-lg px-3 py-1.5'>
                        ⚠️ Có {BREAK_DURATION} phút nghỉ dọn sân giữa các ca
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className='space-y-6'>
                {/* Date picker row */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                        <label className='block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider'>
                            Chọn ngày
                        </label>
                        <DatePicker
                            value={selectedDateStr ? dayjs(selectedDateStr, 'YYYY-MM-DD') : null}
                            format='DD/MM/YYYY'
                            allowClear={false}
                            onChange={(d) =>
                                setSelectedDateStr(d ? d.format('YYYY-MM-DD') : getLocalDateStr())
                            }
                            disabledDate={(current) =>
                                !!current && current.isBefore(dayjs().startOf('day'))
                            }
                            className='w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 h-10 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm dark:text-gray-100'
                        />

                        <div className='text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium'>
                            📅 Đã chọn: {formatDateToVN(selectedDateStr)}
                        </div>
                    </div>

                    <div className='md:col-span-2 flex items-center text-xs text-gray-500 dark:text-gray-400 leading-relaxed'>
                        <div className='bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 w-full'>
                            <p className='text-gray-600 dark:text-gray-300'>
                                💡 Click vào ô giờ để chọn / bỏ chọn. Bạn có thể chọn nhiều ca trong cùng
                                một ngày.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className='flex flex-wrap gap-3 text-xs'>
                    <div className='flex items-center gap-1.5'>
                        <span className='w-3 h-3 rounded-sm border border-gray-200 bg-white'></span>
                        <span className='text-gray-500'>Trống</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <span className='w-3 h-3 rounded-sm bg-emerald-600'></span>
                        <span className='text-gray-500'>Đã chọn</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <span className='w-3 h-3 rounded-sm bg-red-500'></span>
                        <span className='text-gray-500'>Đã đặt</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <span className='w-3 h-3 rounded-sm bg-gray-100 border border-dashed border-gray-300'></span>
                        <span className='text-gray-500'>Quá hạn</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <Badge variant="outline" className='bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-1.5 py-0 rounded'>CAO ĐIỂM</Badge>
                        <span className='text-gray-500'>Từ {PEAK_START}h</span>
                    </div>
                </div>

                {/* Time slots grid */}
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5'>
                    {TIME_SLOTS.map((slot, index) => {
                        const past = isPast(slot.start);
                        const booked = isBooked(slot.start, slot.end);
                        const selected = isSelected(slot.start);
                        const startMin = timeToMin(slot.start);
                        const isPeak = startMin / 60 >= PEAK_START;
                        const price = isPeak ? peakPrice : basePrice;

                        const slotObj: SelectedSlot = {
                            date: selectedDateStr,
                            startTime: slot.start,
                            endTime: slot.end,
                            price,
                            duration: 60,
                        };

                        const k = slotKeyOf(selectedDateStr, slot.start, slot.end);
                        const eqCount = equipmentCountBySlot?.[k] ?? 0;

                        return (
                            <button
                                key={index}
                                onClick={() => handleSlotClick(slot.start, slot.end)}
                                disabled={past || booked}
                                type='button'
                                className={`
                                    relative flex flex-col items-center justify-center rounded-xl p-2.5 min-h-[96px]
                                    transition-all duration-200 border-2 text-sm
                                    ${past
                                        ? 'bg-gray-50 dark:bg-gray-800/50 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                        : booked
                                        ? 'bg-red-500/10 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-400 dark:text-red-500 cursor-not-allowed'
                                        : selected
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-[1.02] z-10'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer text-gray-800 dark:text-gray-100 hover:shadow-sm'
                                    }
                                `}
                            >
                                <span className='font-bold text-[13px] mb-1'>
                                    {formatDisplayTime(slot.start)} – {formatDisplayTime(slot.end)}
                                </span>

                                {!past && !booked && (
                                    <span
                                        className={`text-[11px] font-semibold ${selected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}
                                    >
                                        {price.toLocaleString('vi-VN')}đ
                                    </span>
                                )}

                                {booked && (
                                    <Badge variant="destructive" className='text-[9px] font-bold uppercase mt-1 px-2 py-0 rounded-md'>
                                        Đã đặt
                                    </Badge>
                                )}

                                {past && !booked && (
                                    <Badge variant="secondary" className='text-[9px] font-bold uppercase mt-1 px-2 py-0 rounded-md text-gray-500 dark:text-gray-400'>
                                        Quá hạn
                                    </Badge>
                                )}

                                {!past && !booked && isPeak && (
                                    <Badge variant="outline" className='absolute top-1.5 right-1.5 text-[8px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700 px-1.5 py-0 rounded-md'>
                                        Cao điểm
                                    </Badge>
                                )}

                                {/*  NÚT THÊM THIẾT BỊ TRONG Ô CA (chỉ khi selected) */}
                                {selected && !past && !booked && onPickEquipment && (
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onPickEquipment(slotObj);
                                        }}
                                        className='mt-1.5 text-[9px] px-2 py-0.5 rounded-md bg-white/90 dark:bg-gray-100/10 text-emerald-800 dark:text-emerald-300 font-bold border border-white/60 dark:border-gray-500/30 hover:bg-white dark:hover:bg-gray-100/20 transition-all shadow-sm'
                                    >
                                        {eqCount > 0 ? `Thiết bị (${eqCount})` : '+ Thiết bị'}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Summary footer */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/50 rounded-xl p-4 flex items-center gap-4 min-h-[80px]'>
                        <div className='w-10 h-10 bg-blue-100 dark:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0'>
                            <span className='text-lg'>⏱</span>
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-1'>
                                Khung giờ đã chọn
                            </p>
                            <p className='text-blue-900 dark:text-blue-100 font-bold text-sm leading-tight truncate'>{selectedDisplay}</p>
                        </div>
                    </div>

                    <div className='bg-emerald-50/80 dark:bg-green-900/20 border border-emerald-100 dark:border-green-700/50 rounded-xl p-4 flex flex-col justify-center min-h-[80px]'>
                        <div className='flex justify-between items-center mb-1.5'>
                            <p className='text-[10px] text-emerald-600 dark:text-green-400 font-bold uppercase tracking-widest'>
                                Tổng tiền dự kiến
                            </p>
                            <Badge variant="outline" className='text-[9px] bg-emerald-100 dark:bg-green-800 text-emerald-700 dark:text-green-200 border-emerald-200 dark:border-green-700 px-2 py-0 font-bold rounded-md'>
                                VNĐ
                            </Badge>
                        </div>
                        <div className='flex items-end justify-between mt-1'>
                            <div className='flex flex-col gap-1'>
                                <p className='text-[10px] text-emerald-600 dark:text-green-500'>
                                    (Giá cao điểm từ {PEAK_START}h)
                                </p>
                                {selectedHours > 0 && (
                                    <p className='text-[10px] text-red-500 dark:text-red-400 font-bold'>
                                        {selectedHours} giờ chơi, nghỉ {breakMinutes} phút giữa các ca
                                    </p>
                                )}
                            </div>
                            <p className='text-2xl font-extrabold text-emerald-700 dark:text-green-400 tracking-tight'>
                                {totalPrice.toLocaleString('vi-VN')}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default BookingTimeSelector;

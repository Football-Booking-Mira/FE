import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

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

        chosenIndexes.sort((a, b) => a - b);
        let breaks = 0;
        for (let i = 0; i < chosenIndexes.length - 1; i++) {
            if (chosenIndexes[i + 1] === chosenIndexes[i] + 1) breaks++;
        }

        setTotalPrice(total);
        setSelectedHours(chosenSlots.length);
        setBreakMinutes(breaks * BREAK_DURATION);

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
        <div className='w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 font-sans transition-colors'>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3'>
                <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>Chọn khung giờ</h2>

                <div className='bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-3 py-1 rounded-lg border border-yellow-200 dark:border-yellow-700/50 flex items-center gap-2 shadow-sm text-xs md:text-[13px]'>
                    <span>⚠️</span>
                    <span className='font-semibold'>
                        Có {BREAK_DURATION} phút nghỉ dọn sân giữa các ca
                    </span>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                <div>
                    <label className='block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider'>
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
                        className='w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 h-10 focus:ring-2 focus:ring-green-500 outline-none font-bold text-sm dark:text-gray-100'
                    />

                    <div className='text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium'>
                        📅 Đã chọn: {formatDateToVN(selectedDateStr)}
                    </div>
                </div>

                <div className='md:col-span-2 flex items-center text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic'>
                    <p>
                        * Click vào ô giờ để chọn / bỏ chọn. Bạn có thể chọn nhiều ca trong cùng
                        một ngày (ví dụ: 6h–7h, 7h15–8h15 và 19h45–20h45).
                    </p>
                </div>
            </div>

                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4'>
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

                        let btnClass =
                            'border rounded-lg p-2 flex flex-col items-center justify-center transition-all duration-200 min-h-[90px] relative ';

                    if (past) {
                        btnClass +=
                            'bg-red-50/30 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-300 dark:text-red-900/50 cursor-not-allowed opacity-60';
                    } else if (booked) {
                        btnClass += 'bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700 text-white cursor-not-allowed';
                    } else if (selected) {
                        btnClass +=
                            'bg-green-600 dark:bg-green-600 border-green-600 dark:border-green-500 text-white shadow-lg transform scale-[1.02] z-10';
                    } else {
                        btnClass +=
                            'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-100 hover:shadow-sm';
                    }

                        return (
                            <button
                                key={index}
                                onClick={() => handleSlotClick(slot.start, slot.end)}
                                disabled={past || booked}
                                className={btnClass}
                                type='button'
                            >
                                <span className='font-bold text-sm mb-1'>
                                    {formatDisplayTime(slot.start)} - {formatDisplayTime(slot.end)}
                                </span>

                                {!past && !booked && (
                                    <span
                                        className={`text-[11px] font-bold ${selected ? 'text-green-100' : 'text-green-700'}`}
                                    >
                                        {price.toLocaleString('vi-VN')} VNĐ
                                    </span>
                                )}

                                {booked && (
                                    <span className='text-[9px] font-extrabold uppercase tracking-wide bg-red-700 text-white px-2 py-0.5 rounded mt-1'>
                                        ĐÃ ĐẶT
                                    </span>
                                )}

                                {past && !booked && (
                                    <span className='text-[9px] font-black uppercase mt-1 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 shadow-sm'>
                                        QUÁ HẠN
                                    </span>
                                )}

                                {!past && !booked && isPeak && (
                                    <span className='absolute top-1 right-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-bold'>
                                        CAO ĐIỂM
                                    </span>
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
                                        className='mt-1 text-[9px] px-1.5 py-0.5 rounded bg-white/90 dark:bg-gray-100/10 text-green-800 dark:text-green-300 font-black border border-white/60 dark:border-gray-500/30 hover:bg-white dark:hover:bg-gray-100/20 transition-all shadow-sm'
                                    >
                                        {eqCount > 0 ? `Thiết bị (${eqCount})` : 'Thêm thiết bị'}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 flex items-center gap-4 shadow-sm min-h-[80px]'>
                    <div className='bg-blue-600 text-white p-2.5 rounded-full shadow-md shrink-0 flex items-center justify-center'>
                        <span className='text-lg'>⏱</span>
                    </div>
                    <div className='flex-1'>
                        <p className='text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-widest mb-1'>
                            CÁC KHUNG GIỜ ĐÃ CHỌN
                        </p>
                        <p className='text-blue-900 dark:text-blue-100 font-bold text-sm leading-tight'>{selectedDisplay}</p>
                    </div>
                </div>

                <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl p-4 flex flex-col justify-center shadow-sm min-h-[80px]'>
                    <div className='flex justify-between items-center mb-1.5'>
                        <p className='text-[10px] text-green-700 dark:text-green-400 font-bold uppercase tracking-widest'>
                            TỔNG TIỀN DỰ KIẾN
                        </p>
                        <span className='text-[10px] bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full font-bold'>
                            VNĐ
                        </span>
                    </div>
                    <div className='flex items-end justify-between mt-1'>
                        <div className='flex flex-col gap-1'>
                            <p className='text-[10px] text-green-600 dark:text-green-500'>
                                (Giá cao điểm từ {PEAK_START}h)
                            </p>
                            {selectedHours > 0 && (
                                <p className='text-[10px] text-red-500 dark:text-red-400 font-bold'>
                                    {selectedHours} giờ chơi, nghỉ {breakMinutes} phút giữa các ca
                                </p>
                            )}
                        </div>
                        <p className='text-2xl font-black text-green-700 dark:text-green-400'>
                            {totalPrice.toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingTimeSelector;

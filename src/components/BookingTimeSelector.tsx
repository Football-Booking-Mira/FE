import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

interface Props {
    courtId: string;
    basePrice: number;
    peakPrice: number;
    onSlotSelected: (slot: {
        date: string;
        startTime: string;
        endTime: string;
        price: number;
        duration: number;
    }) => void;
}

interface BookedSlot {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
}

//  CẤU HÌNH
const START_HOUR = 6;
const SLOT_DURATION = 60; // 1 ca 60 phút
const BREAK_DURATION = 15; // nghỉ 15p
const PEAK_START = 16; // sau 16h là cao điểm

// socket dùng chung
const socket = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
    withCredentials: true,
});

// phút -> HH:MM
const minToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// HH:MM -> phút
const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// hiển thị 6h / 7h15
const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (m === 0) return `${h}h`;
    return `${h}h${m}`;
};

// yyyy-mm-dd hôm nay
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

// tạo list ca: 6:00-7:00, 7:15-8:15, ..., 21:00-22:00
const generateSlots = () => {
    const slots: { start: string; end: string }[] = [];
    let current = START_HOUR * 60;
    const endDay = 23 * 60; // để ca cuối là 21:00-22:00

    while (current + SLOT_DURATION <= endDay) {
        const start = minToTime(current);
        const end = minToTime(current + SLOT_DURATION);
        slots.push({ start, end });
        current += SLOT_DURATION + BREAK_DURATION;
    }
    return slots;
};

const TIME_SLOTS = generateSlots();

const BookingTimeSelector: React.FC<Props> = ({
    courtId,
    basePrice,
    peakPrice,
    onSlotSelected,
}) => {
    const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateStr());
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [selectedHours, setSelectedHours] = useState(0);
    const [breakMinutes, setBreakMinutes] = useState(0);

    //* fetch slot đã đặt
    const fetchBooked = useCallback(async () => {
        if (!courtId || !selectedDateStr) return;
        try {
            const res = await fetch(
                `http://localhost:3000/api/bookings/court/${courtId}?startDate=${selectedDateStr}&endDate=${selectedDateStr}`
            );
            const data = await res.json();
            if (data.success) setBookedSlots(data.data || []);
        } catch (e) {
            console.error(e);
        }
    }, [courtId, selectedDateStr]);

    //* lần đầu / đổi ngày
    useEffect(() => {
        setRangeStart('');
        setRangeEnd('');
        setTotalPrice(0);
        setSelectedHours(0);
        setBreakMinutes(0);
        fetchBooked();
    }, [fetchBooked]);

    //*  SOCKET: booking_updated + booking_global_updated
    useEffect(() => {
        if (!courtId) return;

        // join room theo sân
        socket.emit('join:court', courtId);

        const handleBookingUpdated = (payload?: { courtId?: string; date?: string }) => {
            // nếu không gửi payload chi tiết thì vẫn refetch
            if (!payload || !payload.courtId || String(payload.courtId) === String(courtId)) {
                // nếu có date thì check thêm ngày
                if (!payload?.date || payload.date === selectedDateStr) {
                    fetchBooked();
                }
            }
        };

        const handleBookingGlobalUpdated = () => {
            // BE emit event này khi admin thao tác -> refetch lại slot
            fetchBooked();
        };

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

    const isInRange = (s: string, e: string) => {
        if (!rangeStart) return false;
        const effectiveEnd = rangeEnd || rangeStart;
        const sMin = timeToMin(s);
        const rStartMin = timeToMin(rangeStart);
        const rEndMin = timeToMin(effectiveEnd);
        return sMin >= rStartMin && timeToMin(e) <= rEndMin;
    };

    const checkConflict = (start: string, end: string) => {
        const startMin = timeToMin(start);
        const endMin = timeToMin(end);
        const slotsInRange = TIME_SLOTS.filter((slot) => {
            const slotS = timeToMin(slot.start);
            const slotE = timeToMin(slot.end);
            return slotS >= startMin && slotE <= endMin;
        });
        return slotsInRange.some((slot) => isBooked(slot.start, slot.end));
    };

    const handleSlotClick = (s: string, e: string) => {
        if (isPast(s) || isBooked(s, e)) return;

        if (!rangeStart) {
            setRangeStart(s);
            setRangeEnd(e);
            return;
        }

        const sMin = timeToMin(s);
        const startMin = timeToMin(rangeStart);

        const currentSlot = TIME_SLOTS.find((t) => t.start === rangeStart);
        const isSingleSlotSelected = currentSlot && currentSlot.end === rangeEnd;

        // bỏ chọn
        if (s === rangeStart && e === rangeEnd) {
            setRangeStart('');
            setRangeEnd('');
            return;
        }

        if (isSingleSlotSelected) {
            if (sMin > startMin) {
                if (checkConflict(rangeStart, e)) {
                    alert('Khoảng chọn bị vướng lịch đã đặt!');
                    return;
                }
                setRangeEnd(e);
                return;
            }
            if (sMin < startMin) {
                if (checkConflict(s, rangeEnd)) {
                    alert('Khoảng chọn bị vướng lịch đã đặt!');
                    return;
                }
                setRangeStart(s);
                return;
            }
        }

        setRangeStart(s);
        setRangeEnd(e);
    };

    const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStart = e.target.value;
        setRangeStart(newStart);
        const slot = TIME_SLOTS.find((t) => t.start === newStart);
        if (slot) setRangeEnd(slot.end);
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newEnd = e.target.value;
        if (checkConflict(rangeStart, newEnd)) {
            alert('Khoảng thời gian này có chứa lịch đã đặt!');
            return;
        }
        setRangeEnd(newEnd);
    };

    // tính tiền mỗi khi đổi range
    useEffect(() => {
        if (!rangeStart || !rangeEnd) {
            setTotalPrice(0);
            setSelectedHours(0);
            setBreakMinutes(0);
            return;
        }
        let total = 0;
        let validSlotsCount = 0;

        TIME_SLOTS.forEach((slot) => {
            const sMin = timeToMin(slot.start);
            const eMin = timeToMin(slot.end);
            const rStart = timeToMin(rangeStart);
            const rEnd = timeToMin(rangeEnd);

            if (sMin >= rStart && eMin <= rEnd) {
                const isPeak = sMin / 60 >= PEAK_START;
                total += isPeak ? peakPrice : basePrice;
                validSlotsCount++;
            }
        });

        setTotalPrice(total);
        setSelectedHours(validSlotsCount);
        setBreakMinutes(validSlotsCount > 1 ? (validSlotsCount - 1) * BREAK_DURATION : 0);

        onSlotSelected({
            date: selectedDateStr,
            startTime: rangeStart,
            endTime: rangeEnd,
            price: total,
            duration: validSlotsCount * 60,
        });
    }, [rangeStart, rangeEnd, selectedDateStr, basePrice, peakPrice, onSlotSelected]);

    return (
        <div className='w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 font-sans'>
            {/* HEADER + NOTE 15P NGHỈ */}
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>Chọn khung giờ</h2>

                <div className='bg-yellow-50 text-yellow-800 px-3 py-1 rounded-lg border border-yellow-200 flex items-center gap-2 shadow-sm text-xs md:text-[13px]'>
                    <span>⚠️</span>
                    <span className='font-semibold'>
                        Có {BREAK_DURATION} phút nghỉ dọn sân giữa các ca
                    </span>
                </div>
            </div>

            {/* FILTER */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-5'>
                <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Chọn ngày
                    </label>
                    <input
                        type='date'
                        value={selectedDateStr}
                        onChange={(e) => setSelectedDateStr(e.target.value)}
                        min={getLocalDateStr()}
                        className='w-full bg-white border border-gray-300 rounded-lg px-3 h-9 focus:ring-2 focus:ring-green-500 outline-none font-medium text-sm'
                    />
                    <div className='text-xs text-gray-500 mt-1'>
                        Đã chọn: {formatDateToVN(selectedDateStr)}
                    </div>
                </div>

                <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Giờ bắt đầu
                    </label>
                    <select
                        value={rangeStart}
                        onChange={handleStartChange}
                        className='w-full bg-white border border-gray-300 rounded-lg px-3 h-9 focus:ring-2 focus:ring-green-500 outline-none font-medium text-sm'
                    >
                        <option value=''>--Chọn--</option>
                        {TIME_SLOTS.map((slot) => {
                            if (isPast(slot.start) || isBooked(slot.start, slot.end)) return null;
                            return (
                                <option key={slot.start} value={slot.start}>
                                    {formatDisplayTime(slot.start)}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Giờ kết thúc
                    </label>
                    <select
                        value={rangeEnd}
                        onChange={handleEndChange}
                        disabled={!rangeStart}
                        className={`w-full border border-gray-300 rounded-lg px-3 h-9 focus:ring-2 focus:ring-green-500 outline-none font-medium text-sm ${
                            !rangeStart
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white'
                        }`}
                    >
                        <option value=''>--Chọn--</option>
                        {rangeStart &&
                            TIME_SLOTS.map((slot) => {
                                const startMin = timeToMin(rangeStart);
                                const currentSlotStart = timeToMin(slot.start);
                                if (currentSlotStart < startMin) return null;
                                return (
                                    <option key={slot.end} value={slot.end}>
                                        {formatDisplayTime(slot.end)}
                                    </option>
                                );
                            })}
                    </select>
                </div>
            </div>

            <p className='text-[11px] text-gray-500 mb-3 italic'>
                * Click vào ô giờ để chọn. Click thêm ca khác để chọn nhiều ca liền kề.
            </p>

            {/* GRID GIỜ */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4'>
                {TIME_SLOTS.map((slot, index) => {
                    const past = isPast(slot.start);
                    const booked = isBooked(slot.start, slot.end);
                    const selected = isInRange(slot.start, slot.end);
                    const startMin = timeToMin(slot.start);
                    const isPeak = startMin / 60 >= PEAK_START;
                    const price = isPeak ? peakPrice : basePrice;

                    let btnClass =
                        'border rounded-lg p-2 flex flex-col items-center justify-center transition-all duration-200 min-h-[80px] relative ';

                    if (past) {
                        btnClass +=
                            'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50';
                    } else if (booked) {
                        btnClass += 'bg-red-500 border-red-600 text-white cursor-not-allowed';
                    } else if (selected) {
                        btnClass +=
                            'bg-green-600 border-green-600 text-white shadow-md transform scale-[1.02]';
                    } else {
                        btnClass +=
                            'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer text-gray-800 hover:shadow-sm';
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleSlotClick(slot.start, slot.end)}
                            disabled={past || booked}
                            className={btnClass}
                        >
                            <span className='font-bold text-sm mb-1'>
                                {formatDisplayTime(slot.start)} - {formatDisplayTime(slot.end)}
                            </span>

                            {!past && !booked && (
                                <span
                                    className={`text-[11px] font-bold ${
                                        selected ? 'text-green-100' : 'text-green-700'
                                    }`}
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
                                <span className='text-[9px] font-bold uppercase mt-1 text-gray-400 border border-gray-300 px-2 py-0.5 rounded bg-white'>
                                    QUÁ HẠN
                                </span>
                            )}

                            {!past && !booked && isPeak && (
                                <span className='absolute top-1 right-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-bold'>
                                    CAO ĐIỂM
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TỔNG TIỀN */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 shadow-sm min-h-[70px]'>
                    <div className='bg-blue-600 text-white p-2 rounded-full shadow-md shrink-0'>
                        ⏱
                    </div>
                    <div className='flex-1'>
                        <p className='text-[10px] text-blue-700 font-bold uppercase tracking-wide mb-1'>
                            KHUNG GIỜ ĐÃ CHỌN
                        </p>
                        <p className='text-blue-900 font-bold text-lg'>
                            {rangeStart && rangeEnd
                                ? `${formatDisplayTime(rangeStart)} - ${formatDisplayTime(
                                      rangeEnd
                                  )}`
                                : '--:--'}
                        </p>
                    </div>
                </div>

                <div className='bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col justify-center shadow-sm min-h-[70px]'>
                    <div className='flex justify-between items-center mb-1'>
                        <p className='text-[10px] text-green-700 font-bold uppercase tracking-wide'>
                            TỔNG TIỀN DỰ KIẾN
                        </p>
                        <span className='text-[9px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold'>
                            VNĐ
                        </span>
                    </div>
                    <div className='flex items-end justify-between mt-1'>
                        <div className='flex flex-col gap-0.5'>
                            <p className='text-[9px] text-green-600'>
                                (Giá cao điểm từ {PEAK_START}h)
                            </p>
                            {selectedHours > 0 && (
                                <p className='text-[10px] text-red-500 font-semibold'>
                                    {selectedHours} giờ chơi, nghỉ {breakMinutes} phút giữa các ca
                                </p>
                            )}
                        </div>
                        <p className='text-xl font-black text-green-700'>
                            {totalPrice.toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingTimeSelector;

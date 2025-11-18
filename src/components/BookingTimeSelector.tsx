import React, { useEffect, useState } from 'react';

interface Props {
    courtId: string;
    basePrice: number; // Giá thường
    peakPrice: number; // Giá cao điểm
    onSlotSelected: (slot: {
        date: string;
        startTime: string;
        endTime: string;
        price: number;
        duration: number; // Tổng thời gian đá thực tế (phút)
    }) => void;
}

interface BookedSlot {
    date: string;
    startTime: string;
    endTime: string;
}

// --- CẤU HÌNH ---
const START_HOUR = 6;
const SLOT_DURATION = 60; // 1 ca 60 phút
const BREAK_DURATION = 15; // Nghỉ 15 phút
const PEAK_START = 16; // 16h bắt đầu tính giá cao điểm

// Helper: Đổi phút -> HH:MM
const minToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper: Đổi HH:MM -> Phút
const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Helper: Format hiển thị "6h" hoặc "7h15"
const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (m === 0) return `${h}h`; // 6:00 -> 6h
    return `${h}h${m}`; // 7:15 -> 7h15
};

// Helper: Lấy ngày hiện tại (YYYY-MM-DD) theo giờ địa phương
const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Chuyển YYYY-MM-DD sang DD/MM/YYYY để hiển thị
const formatDateToVN = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

// --- TẠO LIST CA ---
const generateSlots = () => {
    const slots = [];
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

    useEffect(() => {
        const fetchBooked = async () => {
            try {
                const res = await fetch(
                    `http://localhost:3000/api/bookings/court/${courtId}?startDate=${selectedDateStr}&endDate=${selectedDateStr}`
                );
                const data = await res.json();
                if (data.success) setBookedSlots(data.data || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchBooked();
        setRangeStart('');
        setRangeEnd('');
        setTotalPrice(0);
    }, [selectedDateStr, courtId]);

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

    useEffect(() => {
        if (!rangeStart || !rangeEnd) {
            setTotalPrice(0);
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
        if (rangeStart && rangeEnd) {
            onSlotSelected({
                date: selectedDateStr,
                startTime: rangeStart,
                endTime: rangeEnd,
                price: total,
                duration: validSlotsCount * 60,
            });
        }
    }, [rangeStart, rangeEnd, selectedDateStr]);

    return (
        <div className='w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 font-sans'>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3'>
                <h3 className='text-lg font-bold text-gray-800'>Chọn khung giờ</h3>
                <div className='bg-yellow-50 text-yellow-800 px-3 py-1 rounded-lg border border-yellow-200 flex items-center gap-2 shadow-sm'>
                    <span className='text-base'>⚠️</span>
                    <span className='font-bold text-xs'>
                        Có {BREAK_DURATION}p nghỉ dọn sân giữa các ca
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-5'>
                <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Chọn ngày
                    </label>
                    <div className='relative w-full h-9'>
                        <input
                            type='date'
                            value={selectedDateStr}
                            onChange={(e) => setSelectedDateStr(e.target.value)}
                            min={getLocalDateStr()}
                            className='absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer'
                        />
                        <div className='absolute inset-0 w-full h-full bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm font-medium text-gray-700 pointer-events-none'>
                            {formatDateToVN(selectedDateStr)}
                            <span className='ml-auto text-gray-400 text-xs'>📅</span>
                        </div>
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

            {/* GRID */}
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
                                <div className='flex flex-col items-center animate-pulse'>
                                    <span className='text-[9px] font-extrabold uppercase tracking-wider bg-red-700 text-white px-2 py-0.5 rounded mt-1'>
                                        ĐÃ ĐẶT
                                    </span>
                                </div>
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

            {/* FOOTER - FIX LỖI ĐÈ CHỮ */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {/* CỘT 1: KHUNG GIỜ */}
                {/* Sửa: bỏ h-[70px], dùng min-h để tự giãn, thêm py-3 để thoáng */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 shadow-sm min-h-[70px]'>
                    <div className='bg-blue-600 text-white p-2 rounded-full shadow-md shrink-0'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                    </div>
                    <div className='flex-1 min-w-0'>
                        <p className='text-[10px] text-blue-700 font-bold uppercase tracking-wide mb-1 truncate'>
                            KHUNG GIỜ ĐÃ CHỌN
                        </p>
                        <div className='flex flex-col'>
                            <p className='text-blue-900 font-bold text-lg leading-tight break-words'>
                                {rangeStart && rangeEnd
                                    ? `${formatDisplayTime(rangeStart)} - ${formatDisplayTime(
                                          rangeEnd
                                      )}`
                                    : '--:--'}
                            </p>
                            {rangeStart && rangeEnd && (
                                <span className='text-[9px] text-blue-500 font-medium mt-0.5 truncate'>
                                    (Đã bao gồm nghỉ {BREAK_DURATION}p)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* CỘT 2: TỔNG TIỀN */}
                {/* Sửa: bỏ h-[70px], dùng min-h, layout flex-col thoáng hơn */}
                <div className='bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col justify-center shadow-sm min-h-[70px]'>
                    <div className='flex justify-between items-center mb-1 gap-2'>
                        <p className='text-[10px] text-green-700 font-bold uppercase tracking-wide whitespace-nowrap'>
                            TỔNG TIỀN DỰ KIẾN
                        </p>
                        <span className='text-[9px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold shrink-0'>
                            VNĐ
                        </span>
                    </div>

                    <div className='flex items-end justify-between mt-1 gap-2'>
                        <p className='text-[9px] text-green-600 leading-tight max-w-[60%]'>
                            (Giá cao điểm từ {PEAK_START}h)
                        </p>
                        <p className='text-xl font-black text-green-700 leading-none'>
                            {totalPrice.toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingTimeSelector;

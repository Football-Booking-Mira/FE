import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

interface SelectedSlot {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number; // phút
}

interface Props {
    courtId: string;
    basePrice: number;
    peakPrice: number;
    // giờ trả ra MẢNG ca đã chọn
    onSlotSelected: (slots: SelectedSlot[]) => void;
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
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]); // lưu startTime
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
        setSelectedSlots([]);
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

    const isSelected = (s: string) => selectedSlots.includes(s);

    const handleSlotClick = (s: string, e: string) => {
        if (isPast(s) || isBooked(s, e)) return;

        setSelectedSlots((prev) => {
            // đã chọn -> bỏ chọn
            if (prev.includes(s)) {
                return prev.filter((x) => x !== s);
            }
            // chưa chọn -> thêm
            return [...prev, s].sort((a, b) => timeToMin(a) - timeToMin(b));
        });
    };

    // tính tiền mỗi khi đổi selectedSlots
    useEffect(() => {
        if (selectedSlots.length === 0) {
            setTotalPrice(0);
            setSelectedHours(0);
            setBreakMinutes(0);
            onSlotSelected([]);
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
            if (chosenIndexes[i + 1] === chosenIndexes[i] + 1) {
                breaks++;
            }
        }

        setTotalPrice(total);
        setSelectedHours(chosenSlots.length);
        setBreakMinutes(breaks * BREAK_DURATION);

        onSlotSelected(chosenSlots);
    }, [selectedSlots, selectedDateStr, basePrice, peakPrice]);

    // chuỗi hiển thị các khung giờ đã chọn
    const selectedDisplay =
        selectedSlots.length === 0
            ? '--:--'
            : TIME_SLOTS.filter((slot) => selectedSlots.includes(slot.start))
                  .map(
                      (slot) => `${formatDisplayTime(slot.start)} - ${formatDisplayTime(slot.end)}`
                  )
                  .join(', ');

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

            {/* CHỌN NGÀY */}
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

                <div className='md:col-span-2 flex items-center text-xs text-gray-500'>
                    <p>
                        * Click vào ô giờ để chọn / bỏ chọn. Bạn có thể chọn nhiều ca trong cùng một
                        ngày (ví dụ: 6h–7h, 7h15–8h15 và 19h45–20h45).
                    </p>
                </div>
            </div>

            {/* GRID GIỜ */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4'>
                {TIME_SLOTS.map((slot, index) => {
                    const past = isPast(slot.start);
                    const booked = isBooked(slot.start, slot.end);
                    const selected = isSelected(slot.start);
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
                            CÁC KHUNG GIỜ ĐÃ CHỌN
                        </p>
                        <p className='text-blue-900 font-bold text-sm'>{selectedDisplay}</p>
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

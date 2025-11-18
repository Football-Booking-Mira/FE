import React, { useEffect, useState } from 'react';

interface Props {
    courtId: string;
    basePrice: number;
    peakPrice: number;
    onSlotSelected: (slot: {
        date: string;
        startTime: string;
        endTime: string;
        price: number;
    }) => void;
}

interface BookedSlot {
    date: string;
    startTime: string;
    endTime: string;
}

// Tạo các khung giờ từ 6h đến 21h (16 slot)
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
    const startHour = i + 6;
    const endHour = startHour + 1;
    return {
        start: `${String(startHour).padStart(2, '0')}:00`,
        end: `${String(endHour).padStart(2, '0')}:00`,
        label: `${String(startHour).padStart(2, '0')}:00`,
    };
});

const PEAK_START = 16;

const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const BookingTimeSelector: React.FC<Props> = ({
    courtId,
    basePrice,
    peakPrice,
    onSlotSelected,
}) => {
    const [selectedDateStr, setSelectedDateStr] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [totalPrice, setTotalPrice] = useState<number>(0);

    // Lấy danh sách giờ đã đặt
    const fetchBookedSlots = async (dateStr: string) => {
        try {
            const res = await fetch(
                `http://localhost:3000/api/bookings/court/${courtId}?startDate=${dateStr}&endDate=${dateStr}`
            );
            const data = await res.json();
            if (data.success) setBookedSlots(data.data || []);
        } catch {
            console.error('Lỗi tải giờ đã đặt');
        }
    };

    useEffect(() => {
        fetchBookedSlots(selectedDateStr);
        setStartTime('');
        setEndTime('');
        setTotalPrice(0);
        onSlotSelected({
            date: selectedDateStr,
            startTime: '',
            endTime: '',
            price: 0,
        });
    }, [selectedDateStr]);

    // Check quá hạn
    const isPastSlot = (time: string) => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (selectedDateStr > todayStr) return false;
        if (selectedDateStr < todayStr) return true;

        const [h, m] = time.split(':').map(Number);
        const slotDate = new Date();
        slotDate.setHours(h, m, 0, 0);
        return slotDate < now;
    };

    // Check trùng
    const isBooked = (start: string, end: string) => {
        const s1 = toMinutes(start);
        const e1 = toMinutes(end);

        return bookedSlots.some((b) => {
            const bookedDateStr =
                typeof b.date === 'string'
                    ? b.date.slice(0, 10)
                    : new Date(b.date).toISOString().slice(0, 10);

            if (bookedDateStr !== selectedDateStr) return false;

            const s2 = toMinutes(b.startTime);
            const e2 = toMinutes(b.endTime);

            return s1 < e2 && e1 > s2;
        });
    };

    // Xử lý click chọn khung giờ
    const handleSlotClick = (slotStart: string, slotEnd: string) => {
        const past = isPastSlot(slotStart);
        const booked = isBooked(slotStart, slotEnd);

        if (past || booked) return;

        // Nếu chưa có start time, set start = clicked
        if (!startTime) {
            setStartTime(slotStart);
            setEndTime(slotEnd);
            return;
        }

        const clickMin = toMinutes(slotStart);
        const startMin = toMinutes(startTime);
        const endMin = endTime ? toMinutes(endTime) : startMin + 60;

        // 1. Click vào vùng ĐANG chọn (trừ biên) -> Bỏ chọn
        if (clickMin >= startMin && clickMin < endMin) {
            setStartTime('');
            setEndTime('');
            return;
        }

        // 2. Click vào ô liền kề CUỐI (biên phải)
        // Ví dụ: Đang chọn 8-9. Click 9.
        if (clickMin === endMin) {
            // LOGIC MỚI: Nếu đang chỉ chọn 1 giờ, thì hiểu là muốn CHUYỂN sang ô mới
            // (Thay vì mở rộng thành 8-10, sẽ chuyển thành 9-10)
            const currentDuration = endMin - startMin;
            if (currentDuration === 60) {
                setStartTime(slotStart);
                setEndTime(slotEnd);
                return;
            }

            // Nếu đang chọn nhiều giờ (ví dụ 8-10), click 10 sẽ mở rộng tiếp thành 8-11
            setEndTime(slotEnd);
            return;
        }

        // 3. Click vào ô liền kề ĐẦU (biên trái) -> Mở rộng về trước
        if (toMinutes(slotEnd) === startMin) {
            setStartTime(slotStart);
            return;
        }

        // 4. Click vào ô rời rạc -> Chọn mới
        setStartTime(slotStart);
        setEndTime(slotEnd);
    };

    useEffect(() => {
        if (!startTime || !endTime) {
            setTotalPrice(0);
            onSlotSelected({
                date: selectedDateStr,
                startTime: '',
                endTime: '',
                price: 0,
            });
            return;
        }

        const startMin = toMinutes(startTime);
        const endMin = toMinutes(endTime);
        let total = 0;

        for (let min = startMin; min < endMin; min += 60) {
            const hour = min / 60;
            total += hour >= PEAK_START ? peakPrice : basePrice;
        }

        setTotalPrice(total);
        onSlotSelected({
            date: selectedDateStr,
            startTime,
            endTime,
            price: total,
        });
    }, [startTime, endTime, selectedDateStr]);

    const isSlotSelected = (slotStart: string, slotEnd: string) => {
        if (!startTime || !endTime) return false;
        const slotMin = toMinutes(slotStart);
        const startMin = toMinutes(startTime);
        const endMin = toMinutes(endTime);
        return slotMin >= startMin && slotMin <= endMin;
    };

    return (
        <div className='bg-white shadow-sm rounded-2xl p-6 space-y-6 font-sans'>
            <h3 className='text-lg font-bold text-gray-800'>Chọn khung giờ</h3>

            <div className='flex flex-wrap gap-6'>
                <div>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                        Chọn ngày
                    </label>
                    <input
                        type='date'
                        value={selectedDateStr}
                        onChange={(e) => setSelectedDateStr(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className='border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-700'
                    />
                </div>

                <div>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                        Giờ bắt đầu
                    </label>
                    <select
                        value={startTime}
                        onChange={(e) => {
                            setStartTime(e.target.value);
                            setEndTime('');
                        }}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none min-w-[100px]'
                    >
                        <option value=''>--Chọn--</option>
                        {TIME_SLOTS.map(({ start, end }) => {
                            const disabled = isPastSlot(start) || isBooked(start, end);
                            return (
                                <option key={start} value={start} disabled={disabled}>
                                    {start}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                        Giờ kết thúc
                    </label>
                    <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none min-w-[100px]'
                        disabled={!startTime}
                    >
                        <option value=''>--Chọn--</option>
                        {startTime &&
                            Array.from({ length: 23 - parseInt(startTime) }, (_, i) => {
                                const endHour = parseInt(startTime) + i + 1;
                                const endTimeValue = `${String(endHour).padStart(2, '0')}:00`;
                                if (endHour > 22) return null;
                                return (
                                    <option key={endTimeValue} value={endTimeValue}>
                                        {endTimeValue}
                                    </option>
                                );
                            }).filter(Boolean)}
                    </select>
                </div>
            </div>

            <div>
                <p className='text-sm font-semibold mb-3 text-gray-700'>
                    Lưới khung giờ (click để chọn nhanh)
                </p>
                <div className='grid grid-cols-5 gap-3'>
                    {TIME_SLOTS.map(({ start, end, label }) => {
                        const past = isPastSlot(start);
                        const booked = isBooked(start, end);
                        const selected = isSlotSelected(start, end);
                        const hour = parseInt(start);
                        const isPeak = hour >= PEAK_START;
                        const price = isPeak ? peakPrice : basePrice;

                        let bgColor = '';
                        let textColor = '';
                        let borderColor = '';
                        let cursor = 'cursor-pointer';

                        if (past) {
                            bgColor = 'bg-gray-200';
                            textColor = 'text-gray-400';
                            borderColor = 'border-gray-300';
                            cursor = 'cursor-not-allowed';
                        } else if (booked) {
                            bgColor = 'bg-red-500';
                            textColor = 'text-white';
                            borderColor = 'border-red-600';
                            cursor = 'cursor-not-allowed';
                        } else if (selected) {
                            bgColor = 'bg-green-600';
                            textColor = 'text-white';
                            borderColor = 'border-green-700';
                        } else {
                            bgColor = 'bg-white hover:bg-green-50';
                            textColor = 'text-gray-800';
                            borderColor = 'border-gray-300 hover:border-green-400';
                        }

                        return (
                            <button
                                key={start}
                                onClick={() => handleSlotClick(start, end)}
                                disabled={past || booked}
                                className={`${bgColor} ${textColor} ${borderColor} ${cursor} 
                                    border-2 rounded-lg p-3 text-center transition-all 
                                    flex flex-col items-center justify-center min-h-[80px] shadow-sm`}
                            >
                                <div className='text-base font-bold'>{label}</div>
                                <div className='text-xs mt-1 font-medium'>
                                    {past
                                        ? 'Quá hạn'
                                        : booked
                                        ? 'Đã đặt'
                                        : `${price.toLocaleString()}đ`}
                                </div>
                                {!past && !booked && (
                                    <div className='text-[10px] mt-0.5 opacity-75'>
                                        {isPeak ? 'Cao điểm' : 'Thường'}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {startTime && endTime && (
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3'>
                    <div className='bg-blue-100 p-2 rounded-full text-blue-600'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <circle cx='12' cy='12' r='10' />
                            <polyline points='12 6 12 12 16 14' />
                        </svg>
                    </div>
                    <div>
                        <p className='text-sm font-semibold text-blue-900 mb-0.5'>
                            Khung giờ đã chọn
                        </p>
                        <div className='text-blue-700 font-medium text-sm'>
                            {startTime} - {endTime} •{' '}
                            <span className='font-bold'>
                                {(toMinutes(endTime) - toMinutes(startTime)) / 60} giờ
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className='p-5 bg-green-50 border-2 border-green-200 rounded-xl flex justify-between items-center shadow-sm'>
                <div>
                    <p className='text-gray-600 font-medium text-sm uppercase tracking-wide'>
                        Tổng tiền dự kiến
                    </p>
                    {startTime && endTime && (
                        <p className='text-xs text-gray-500 mt-1'>
                            Đã áp dụng giá {PEAK_START}h bắt đầu cao điểm
                        </p>
                    )}
                </div>
                <span className='text-green-700 font-bold text-2xl'>
                    {totalPrice > 0 ? `${totalPrice.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                </span>
            </div>
        </div>
    );
};

export default BookingTimeSelector;

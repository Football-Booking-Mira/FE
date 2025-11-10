import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'sonner';
interface Props {
    courtId: string;
    basePrice: number; // Giá thường
    peakPrice: number; // Giá cao điểm
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

// Giờ mở cửa 6h - 22h
const TIME_POINTS = [
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
];

// Khung giờ nhanh (2 tiếng)
const QUICK_SLOTS = [
    ['06:00', '08:00'],
    ['08:00', '10:00'],
    ['10:00', '12:00'],
    ['12:00', '14:00'],
    ['14:00', '16:00'],
    ['16:00', '18:00'],
    ['18:00', '20:00'],
    ['20:00', '22:00'],
];

const PEAK_START = 16; // Giờ cao điểm bắt đầu từ 16h

const BookingTimeSelector: React.FC<Props> = ({
    courtId,
    basePrice,
    peakPrice,
    onSlotSelected,
}) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [price, setPrice] = useState<number>(0);

    //  Lấy danh sách giờ đã đặt
    const fetchBookedSlots = async (date: Date) => {
        const d = date.toISOString().slice(0, 10);
        try {
            const res = await fetch(
                `http://localhost:3000/api/bookings/court/${courtId}?startDate=${d}&endDate=${d}`
            );
            const data = await res.json();
            if (data.success) setBookedSlots(data.data || []);
        } catch {
            console.error('Lỗi tải giờ đã đặt');
        }
    };

    useEffect(() => {
        fetchBookedSlots(selectedDate);
        setStartTime('');
        setEndTime('');
        setPrice(0);
        onSlotSelected({
            date: selectedDate.toISOString().slice(0, 10),
            startTime: '',
            endTime: '',
            price: 0,
        });
    }, [selectedDate]);

    //  Kiểm tra giờ quá hạn
    const isPastTime = (time: string) => {
        const slotDate = new Date(selectedDate);
        const [h, m] = time.split(':').map(Number);
        slotDate.setHours(h, m, 0, 0);
        return slotDate < new Date();
    };

    //  Kiểm tra đã bị đặt chưa (bao gồm toàn bộ khoảng giờ)
    const isBooked = (t: string) =>
        bookedSlots.some((b) => {
            const sameDate = b.date === selectedDate.toISOString().slice(0, 10);
            const withinRange = t >= b.startTime && t < b.endTime;
            return sameDate && withinRange;
        });

    //  Tính tiền tự động
    const calculatePrice = (start: string, end: string) => {
        const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startMin = toMinutes(start);
        const endMin = toMinutes(end);
        const totalHours = (endMin - startMin) / 60;

        let total = 0;
        for (let h = startMin; h < endMin; h += 60) {
            const hour = h / 60;
            total += hour >= PEAK_START ? peakPrice : basePrice;
        }
        return total;
    };

    //  Cập nhật tổng tiền khi chọn giờ
    useEffect(() => {
        if (startTime && endTime && endTime > startTime) {
            const total = calculatePrice(startTime, endTime);
            setPrice(total);
            onSlotSelected({
                date: selectedDate.toISOString().slice(0, 10),
                startTime,
                endTime,
                price: total,
            });
        } else {
            setPrice(0);
            onSlotSelected({
                date: selectedDate.toISOString().slice(0, 10),
                startTime: '',
                endTime: '',
                price: 0,
            });
        }
    }, [startTime, endTime]);

    // Chọn nhanh khung giờ (2 tiếng)
    const handleQuickSlotClick = (start: string, end: string) => {
        const past = isPastTime(start);
        const overlapBooked = bookedSlots.some(
            (b) =>
                b.date === selectedDate.toISOString().slice(0, 10) &&
                !(end <= b.startTime || start >= b.endTime)
        );

        if (past) {
            toast.warning('Khung giờ này đã quá hạn!');
            return;
        }

        if (overlapBooked) {
            toast.error('Khung giờ này đã có người đặt!');
            return;
        }

        const total = calculatePrice(start, end);
        setStartTime(start);
        setEndTime(end);
        setPrice(total);
        onSlotSelected({
            date: selectedDate.toISOString().slice(0, 10),
            startTime: start,
            endTime: end,
            price: total,
        });
    };

    return (
        <div className='bg-white shadow-sm rounded-2xl p-6 space-y-6'>
            <h3 className='text-lg font-bold text-gray-800'>3. Chọn khung giờ</h3>

            {/* Ngày & giờ */}
            <div className='flex flex-wrap gap-6'>
                <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 block'>Ngày</label>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => date && setSelectedDate(date)}
                        dateFormat='dd/MM/yyyy'
                        minDate={new Date()}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
                    />
                </div>

                <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 block'>
                        Giờ bắt đầu
                    </label>
                    <select
                        value={startTime}
                        onChange={(e) => {
                            setStartTime(e.target.value);
                            setEndTime('');
                            setPrice(0);
                        }}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
                    >
                        <option value=''>--Chọn--</option>
                        {TIME_POINTS.slice(0, -1).map((t) => (
                            <option key={t} value={t} disabled={isPastTime(t) || isBooked(t)}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 block'>
                        Giờ kết thúc
                    </label>
                    <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
                        disabled={!startTime}
                    >
                        <option value=''>--Chọn--</option>
                        {TIME_POINTS.filter((t) => t > startTime).map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Timeline trạng thái sân */}
            <div>
                <p className='text-sm font-semibold mb-2 text-gray-700'>Timeline trạng thái sân</p>
                <div className='flex flex-wrap gap-2'>
                    {TIME_POINTS.map((t, i) => {
                        if (i === TIME_POINTS.length - 1) return null;
                        const next = TIME_POINTS[i + 1];
                        const past = isPastTime(t);
                        const booked = isBooked(t);
                        const isPeak = parseInt(t) >= PEAK_START;

                        const bg = booked
                            ? 'bg-red-500 text-white border-red-600 cursor-not-allowed shadow-sm'
                            : past
                            ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';

                        return (
                            <div
                                key={t}
                                className={`w-[90px] text-center text-sm py-2 rounded-md border transition ${bg}`}
                            >
                                {t} - {next}
                                <div className='text-[11px]'>
                                    {booked
                                        ? 'Đã đặt'
                                        : past
                                        ? 'Quá hạn'
                                        : isPeak
                                        ? 'Cao điểm'
                                        : 'Thường'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Khung giờ nhanh */}
            <div>
                <p className='text-sm font-semibold mb-2 text-gray-700'>Khung giờ nhanh</p>
                <div className='flex flex-wrap gap-2'>
                    {QUICK_SLOTS.map(([s, e]) => {
                        const past = isPastTime(s);
                        const overlapBooked = bookedSlots.some(
                            (b) =>
                                b.date === selectedDate.toISOString().slice(0, 10) &&
                                !(e <= b.startTime || s >= b.endTime)
                        );
                        const selected = startTime === s && endTime === e;

                        const color = selected
                            ? 'bg-green-600 text-white'
                            : past
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : overlapBooked
                            ? 'bg-red-500 text-white cursor-not-allowed border-red-600'
                            : 'bg-white hover:bg-green-50 text-gray-800 border border-gray-200';

                        return (
                            <button
                                key={s}
                                onClick={() => handleQuickSlotClick(s, e)}
                                disabled={past || overlapBooked}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${color}`}
                            >
                                {s.replace(':00', 'h')}–{e.replace(':00', 'h')}
                                <div className='text-[11px]'>
                                    {past ? 'Quá hạn' : overlapBooked ? 'Đã đặt' : 'Có thể đặt'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tổng tiền */}
            <div className='p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold'>
                Tổng tiền dự kiến:{' '}
                <span className='text-green-800'>
                    {price ? `${price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                </span>
            </div>
        </div>
    );
};

export default BookingTimeSelector;

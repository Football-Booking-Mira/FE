import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'sonner';

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

// Time slot NHANH (2 tiếng)
const TIME_SLOTS: [string, string][] = [
    ['06:00', '08:00'],
    ['08:00', '10:00'],
    ['10:00', '12:00'],
    ['12:00', '14:00'],
    ['14:00', '16:00'],
    ['16:00', '18:00'],
    ['18:00', '20:00'],
    ['20:00', '22:00'],
];

const PEAK_START = 16;

const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

// hàm cộng 1 tiếng
const getNextHour = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// START_POINTS: 06:00 → 21:00 (16 mốc)  => block 06–07,...,21–22
const TIME_POINTS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

// END_POINTS: cộng 1h từ START => 07:00 → 22:00
const END_POINTS = TIME_POINTS.map((t) => getNextHour(t));

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

    //  lấy danh sách giờ đã đặt
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

    //  Check quá hạn theo giờ
    const isPastByClock = (time: string) => {
        const slotDate = new Date(selectedDate);
        const [h, m] = time.split(':').map(Number);
        slotDate.setHours(h, m, 0, 0);
        return slotDate < new Date();
    };

    const isQuickSlotPast = (slotStart: string) => isPastByClock(slotStart);

    // 1 mốc giờ nằm trong khung 2h đã quá hạn => coi như quá hạn
    const isTimePastByBlock = (time: string) => {
        if (isPastByClock(time)) return true;

        const tMin = toMinutes(time);

        const inPastQuickSlot = TIME_SLOTS.some(([s, e]) => {
            const sMin = toMinutes(s);
            const eMin = toMinutes(e);
            if (tMin >= sMin && tMin < eMin) {
                return isQuickSlotPast(s);
            }
            return false;
        });

        return inPastQuickSlot;
    };

    //  CHECK trùng booking [start, end)
    const isBooked = (start: string, end: string) => {
        if (!start || !end) return false;

        const selectedDateStr = selectedDate.toISOString().slice(0, 10);
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

    //  Tính tiền
    const calculatePrice = (start: string, end: string) => {
        const sMin = toMinutes(start);
        const eMin = toMinutes(end);
        let total = 0;
        for (let h = sMin; h < eMin; h += 60) {
            const hour = h / 60;
            total += hour >= PEAK_START ? peakPrice : basePrice;
        }
        return total;
    };

    useEffect(() => {
        if (startTime && endTime && toMinutes(endTime) > toMinutes(startTime)) {
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

    //  KHUNG NHANH: GHÉP 2 SLOT LIỀN NHAU
    const handleQuickSlotClick = (slotStart: string, slotEnd: string) => {
        if (isQuickSlotPast(slotStart)) return toast.warning('Khung giờ này đã quá hạn!');
        if (isBooked(slotStart, slotEnd)) return toast.error('Khung giờ này đã có người đặt!');

        if (!startTime || !endTime) {
            setStartTime(slotStart);
            setEndTime(slotEnd);
            return;
        }

        if (slotEnd === startTime) {
            setStartTime(slotStart);
            return;
        }

        if (slotStart === endTime) {
            setEndTime(slotEnd);
            return;
        }

        setStartTime(slotStart);
        setEndTime(slotEnd);
    };

    const isSlotInRange = (slotStart: string, slotEnd: string) => {
        if (!startTime || !endTime) return false;
        return (
            toMinutes(slotStart) >= toMinutes(startTime) && toMinutes(slotEnd) <= toMinutes(endTime)
        );
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

                {/* Dropdown giờ bắt đầu */}
                <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 block'>
                        Giờ bắt đầu
                    </label>
                    <select
                        value={startTime}
                        onChange={(e) => {
                            setStartTime(e.target.value);
                            setEndTime('');
                        }}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
                    >
                        <option value=''>--Chọn--</option>
                        {TIME_POINTS.map((t) => {
                            const next = getNextHour(t); // block: t → t+1
                            const disabled = isTimePastByBlock(t) || isBooked(t, next);
                            return (
                                <option key={t} value={t} disabled={disabled}>
                                    {t}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Dropdown giờ kết thúc */}
                <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 block'>
                        Giờ kết thúc
                    </label>
                    <select
                        value={endTime}
                        onChange={(e) => {
                            const val = e.target.value;
                            const idx = END_POINTS.indexOf(val);
                            const prev = TIME_POINTS[idx]; // start tương ứng

                            if (prev && isBooked(prev, val)) {
                                toast.error('❌ Giờ kết thúc trùng vùng đã đặt!');
                                return;
                            }
                            setEndTime(val);
                        }}
                        className='border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
                        disabled={!startTime}
                    >
                        <option value=''>--Chọn--</option>
                        {END_POINTS.filter(
                            (t) => toMinutes(t) > (startTime ? toMinutes(startTime) : 0)
                        ).map((t) => {
                            const idx = END_POINTS.indexOf(t);
                            const prev = TIME_POINTS[idx];
                            const disabled = isTimePastByBlock(t) || (!!prev && isBooked(prev, t));
                            return (
                                <option key={t} value={t} disabled={disabled}>
                                    {t}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Timeline trạng thái sân */}
            <div>
                <p className='text-sm font-semibold mb-2 text-gray-700'>Timeline trạng thái sân</p>
                <div className='flex flex-wrap gap-2'>
                    {TIME_POINTS.map((t) => {
                        const next = getNextHour(t); // 06→07,...,21→22
                        const booked = isBooked(t, next);
                        const past = isTimePastByBlock(t);

                        const color = booked
                            ? 'bg-red-500 text-white border-red-600'
                            : past
                            ? 'bg-gray-200 text-gray-500 border-gray-300'
                            : 'bg-green-50 text-green-700 border-green-200';

                        return (
                            <div
                                key={t}
                                className={`w-[70px] text-center text-sm py-2 rounded-md border transition ${color}`}
                            >
                                {t}
                                <div className='text-[11px]'>{booked ? 'Đã đặt' : 'Trống'}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Khung giờ nhanh */}
            <div>
                <p className='text-sm font-semibold mb-2 text-gray-700'>Khung giờ nhanh</p>
                <div className='flex flex-wrap gap-2'>
                    {TIME_SLOTS.map(([s, e]) => {
                        const past = isQuickSlotPast(s);
                        const booked = isBooked(s, e);
                        const selected = isSlotInRange(s, e);

                        const color = selected
                            ? 'bg-green-600 text-white'
                            : booked
                            ? 'bg-red-500 text-white cursor-not-allowed border-red-600'
                            : past
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-white hover:bg-green-50 text-gray-800 border border-gray-200';

                        return (
                            <button
                                key={s}
                                onClick={() => handleQuickSlotClick(s, e)}
                                disabled={past || booked}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${color}`}
                            >
                                {s.replace(':00', 'h')}–{e.replace(':00', 'h')}
                                <div className='text-[11px]'>
                                    {booked ? 'Đã đặt' : past ? 'Quá hạn' : 'Có thể đặt'}
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

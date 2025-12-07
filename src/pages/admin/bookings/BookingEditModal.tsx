import { useEffect, useMemo, useState } from 'react';
import { Modal, Row, Col, Select, DatePicker, Card } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'sonner';
import api from '@/common/utils/api';

import { TIME_SLOTS, timeToMin } from './timeSlotUtils';

const formatVND = (v: number = 0) =>
    v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

interface BookingSlot {
    startTime: string;
    endTime: string;
}

interface Booking {
    _id: string;
    code: string;
    courtId?: { _id: string; name: string };
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    slots?: BookingSlot[];
    // thêm các field liên quan tới tiền & voucher
    voucherDiscount?: number;
    discountTotal?: number;
    fieldAmount?: number;
    equipmentTotal?: number;
}

interface CourtOption {
    _id: string;
    name: string;
}

interface EditModalProps {
    open: boolean;
    booking: Booking | null;
    bookings: Booking[]; // để check trùng giờ
    courts: CourtOption[];
    onClose: () => void;
    onUpdated: () => void; // gọi lại fetchBookings + fetchStats
}

interface EditValues {
    courtId?: string;
    date: Dayjs | null;
    slots: BookingSlot[];
    priceInfo?: {
        fieldAmount: number;
        equipmentTotal: number;
        discountTotal: number;
        total: number;
        totalHours: number;
        normalHours: number;
        peakHours: number;
    };
}

export const BookingEditModal: React.FC<EditModalProps> = ({
    open,
    booking,
    bookings,
    courts,
    onClose,
    onUpdated,
}) => {
    const [editValues, setEditValues] = useState<EditValues>({
        courtId: undefined,
        date: null,
        slots: [],
        priceInfo: undefined,
    });

    // --- helper date / slot ---

    const getEditDateStr = () => {
        if (!editValues.date) return null;
        return dayjs(editValues.date).format('YYYY-MM-DD');
    };

    const isSlotPast = (slotStart: string) => {
        const dateStr = getEditDateStr();
        if (!dateStr) return false;

        const todayStr = dayjs().format('YYYY-MM-DD');
        if (dateStr > todayStr) return false;
        if (dateStr < todayStr) return true;

        const [h, m] = slotStart.split(':').map(Number);
        const now = new Date();
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        return slotTime < now;
    };

    // tất cả các slot đã được đặt (trừ chính booking đang sửa)
    const bookedRangesForDay = useMemo<BookingSlot[]>(() => {
        if (!editValues.courtId || !editValues.date) return [];
        const dateStr = getEditDateStr();
        if (!dateStr) return [];

        const ranges: BookingSlot[] = [];

        bookings
            .filter((b) => {
                if (!b.courtId || b.courtId._id !== editValues.courtId) return false;
                if (booking && b._id === booking._id) return false; // bỏ qua đơn đang sửa
                if (b.status === 'cancelled') return false;
                const bDateStr = dayjs(b.date).format('YYYY-MM-DD');
                return bDateStr === dateStr;
            })
            .forEach((b) => {
                if (Array.isArray(b.slots) && b.slots.length > 0) {
                    ranges.push(...b.slots);
                } else {
                    ranges.push({ startTime: b.startTime, endTime: b.endTime });
                }
            });

        return ranges;
    }, [editValues.courtId, editValues.date, bookings, booking]);

    const isSlotBooked = (s: string, e: string) => {
        const sMin = timeToMin(s);
        const eMin = timeToMin(e);

        return bookedRangesForDay.some((b) => {
            const bS = timeToMin(b.startTime);
            const bE = timeToMin(b.endTime);
            // có giao nhau
            return sMin < bE && eMin > bS;
        });
    };

    const isSlotSelected = (s: string, e: string) => {
        return editValues.slots.some((sl) => sl.startTime === s && sl.endTime === e);
    };

    //  tính số ca + phút nghỉ từ slots đã chọn

    const selectedSlotsCount = editValues.slots.length;

    // Mỗi cặp ca nghỉ 15 phút
    const BREAK_MINUTES = 15;
    const selectedBreakMinutes =
        selectedSlotsCount > 1 ? (selectedSlotsCount - 1) * BREAK_MINUTES : 0;
    //  call BE tính tiền theo slots ---
    const calculateEditPrice = async (values: { courtId?: string; slots: BookingSlot[] }) => {
        if (!values.courtId || !values.slots || values.slots.length === 0) return;

        try {
            // tuỳ bạn chỉnh lại endpoint / method cho khớp BE
            const res = await api.post('/bookings/calculate', {
                courtId: values.courtId,
                slots: values.slots,
            });

            const data = res.data?.data;
            if (!data) return;

            setEditValues((prev) => ({
                ...prev,
                priceInfo: {
                    fieldAmount: data.fieldAmount,
                    equipmentTotal: data.equipmentTotal,
                    discountTotal: data.discountTotal,
                    total: data.total,
                    totalHours: data.totalHours,
                    normalHours: data.normalHours,
                    peakHours: data.peakHours,
                },
            }));
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || 'Không tính được tiền sân, vui lòng kiểm tra giờ!';
            toast.error(msg);
            setEditValues((prev) => ({ ...prev, priceInfo: undefined }));
        }
    };

    // --- click slot: toggle từng ca, không kéo cả dải ---

    const handleSlotClick = (s: string, e: string) => {
        if (!editValues.courtId || !editValues.date) {
            toast.error('Vui lòng chọn sân và ngày trước khi chọn giờ!');
            return;
        }

        if (isSlotPast(s) || isSlotBooked(s, e)) return;

        setEditValues((prev) => {
            const exists = prev.slots.some((sl) => sl.startTime === s && sl.endTime === e);

            let nextSlots: BookingSlot[];
            if (exists) {
                // bỏ chọn
                nextSlots = prev.slots.filter((sl) => !(sl.startTime === s && sl.endTime === e));
            } else {
                // chọn thêm
                nextSlots = [...prev.slots, { startTime: s, endTime: e }];
            }

            const next: EditValues = {
                ...prev,
                slots: nextSlots,
            };

            if (next.courtId && nextSlots.length > 0) {
                calculateEditPrice({
                    courtId: next.courtId,
                    slots: nextSlots,
                });
            } else {
                next.priceInfo = undefined;
            }

            return next;
        });
    };

    // --- submit ---

    const handleSave = async () => {
        if (!booking) return;
        const { courtId, date, slots } = editValues;

        if (!courtId || !date || !slots || slots.length === 0) {
            toast.error('Vui lòng chọn sân, ngày và ít nhất 1 ca hợp lệ!');
            return;
        }

        try {
            await api.patch(`/bookings/${booking._id}/time`, {
                courtId,
                date: dayjs(date).format('YYYY-MM-DD'),
                slots, // BE tự tính startTime/endTime + total từ slots
            });

            toast.success('✅ Đã cập nhật giờ / sân!');
            onClose();
            onUpdated();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi cập nhật giờ / sân!';
            toast.error(msg);
        }
    };

    // --- init khi mở modal ---

    useEffect(() => {
        if (!open || !booking) return;

        const initialSlots: BookingSlot[] =
            Array.isArray(booking.slots) && booking.slots.length > 0
                ? booking.slots
                : [
                      {
                          startTime: booking.startTime,
                          endTime: booking.endTime,
                      },
                  ];

        const initial: EditValues = {
            courtId: booking.courtId?._id,
            date: dayjs(booking.date),
            slots: initialSlots,
            priceInfo: undefined,
        };

        setEditValues(initial);
        calculateEditPrice(initial);
    }, [open, booking]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleSave}
            okText='Lưu thay đổi'
            cancelText='Hủy'
            width={900}
            centered
            title={booking ? `Chỉnh sửa đặt sân - ${booking.code}` : 'Chỉnh sửa đặt sân'}
        >
            {booking && (
                <div className='space-y-4'>
                    {/* chọn sân + ngày */}
                    <Row gutter={12}>
                        <Col span={12}>
                            <div className='text-xs font-semibold text-gray-600 mb-1'>Chọn sân</div>
                            <Select
                                style={{ width: '100%' }}
                                placeholder='Chọn sân'
                                value={editValues.courtId}
                                options={courts.map((c) => ({
                                    value: c._id,
                                    label: c.name,
                                }))}
                                onChange={(value) =>
                                    setEditValues((prev) => ({
                                        ...prev,
                                        courtId: value,
                                        slots: [],
                                        priceInfo: undefined,
                                    }))
                                }
                            />
                        </Col>
                        <Col span={12}>
                            <div className='text-xs font-semibold text-gray-600 mb-1'>
                                Chọn ngày đá
                            </div>
                            <DatePicker
                                style={{ width: '100%' }}
                                format='DD/MM/YYYY'
                                value={editValues.date}
                                onChange={(value) =>
                                    setEditValues((prev) => ({
                                        ...prev,
                                        date: value,
                                        slots: [],
                                        priceInfo: undefined,
                                    }))
                                }
                            />
                        </Col>
                    </Row>

                    {/* info số ca + phút nghỉ */}
                    <div className='text-sm text-gray-700'>
                        Đã chọn <b>{selectedSlotsCount}</b> ca, nghỉ <b>{selectedBreakMinutes}</b>{' '}
                        phút.
                    </div>

                    {/* GRID chọn ca giờ */}
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'>
                        {TIME_SLOTS.map((slot, idx) => {
                            const past = isSlotPast(slot.start);
                            const booked = isSlotBooked(slot.start, slot.end);
                            const selected = isSlotSelected(slot.start, slot.end);

                            const selectedPast = past && selected;

                            let btnClass =
                                'border rounded-lg p-2 flex flex-col items-center justify-center min-h-[70px] text-sm transition-all ';

                            if (selectedPast) {
                                // ca thuộc booking hiện tại, nhưng đã quá giờ -> vẫn highlight nhưng mờ + không cho click
                                btnClass +=
                                    'bg-green-500 border-green-500 text-white opacity-60 cursor-not-allowed';
                            } else if (past) {
                                btnClass +=
                                    'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60';
                            } else if (booked) {
                                btnClass +=
                                    'bg-red-500 border-red-600 text-white cursor-not-allowed';
                            } else if (selected) {
                                btnClass +=
                                    'bg-green-600 border-green-600 text-white shadow-md scale-[1.02]';
                            } else {
                                btnClass +=
                                    'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer';
                            }

                            return (
                                <button
                                    key={idx}
                                    type='button'
                                    disabled={past || booked} // vẫn không cho thao tác với ca quá hạn / đã bị người khác đặt
                                    className={btnClass}
                                    onClick={() => handleSlotClick(slot.start, slot.end)}
                                >
                                    <span className='font-semibold'>
                                        {slot.start} - {slot.end}
                                    </span>
                                    {booked && (
                                        <span className='mt-1 text-[11px] font-bold uppercase'>
                                            ĐÃ ĐẶT
                                        </span>
                                    )}
                                    {past && !booked && (
                                        <span className='mt-1 text-[11px] text-gray-400'>
                                            QUÁ HẠN
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {editValues.priceInfo && (
                        <Card size='small' className='mt-2'>
                            <div className='text-sm font-semibold mb-1'>
                                Tiền sân sau khi chỉnh sửa
                            </div>
                            <div className='text-sm space-y-1'>
                                <div className='flex justify-between'>
                                    <span>Tiền sân</span>
                                    <span>{formatVND(editValues.priceInfo.fieldAmount)}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span>Tiền thiết bị</span>
                                    <span>{formatVND(editValues.priceInfo.equipmentTotal)}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span>Giảm giá</span>
                                    <span>-{formatVND(editValues.priceInfo.discountTotal)}</span>
                                </div>
                                <div className='border-t mt-1 pt-1 flex justify-between font-semibold'>
                                    <span>Tổng sau chỉnh sửa</span>
                                    <span>{formatVND(editValues.priceInfo.total)}</span>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default BookingEditModal;

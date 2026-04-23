import { useEffect, useMemo, useState } from 'react';
import { Modal, Row, Col, Select, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'sonner';
import api from '@/common/utils/api';
import { 
    Calendar, 
    Clock, 
    ChevronRight, 
    CreditCard, 
    AlertCircle, 
    X, 
    CheckCircle2, 
    Info,
    Layout as LayoutIcon,
    History
} from 'lucide-react';

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
    bookings: Booking[];
    courts: CourtOption[];
    onClose: () => void;
    onUpdated: () => void;
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
    const [loading, setLoading] = useState(false);

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

    const bookedRangesForDay = useMemo<BookingSlot[]>(() => {
        if (!editValues.courtId || !editValues.date) return [];
        const dateStr = getEditDateStr();
        if (!dateStr) return [];

        const ranges: BookingSlot[] = [];

        bookings
            .filter((b) => {
                if (!b.courtId || b.courtId._id !== editValues.courtId) return false;
                if (booking && b._id === booking._id) return false;
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
            return sMin < bE && eMin > bS;
        });
    };

    const isSlotSelected = (s: string, e: string) => {
        return editValues.slots.some((sl) => sl.startTime === s && sl.endTime === e);
    };

    const selectedSlotsCount = editValues.slots.length;
    const BREAK_MINUTES = 15;
    const selectedBreakMinutes = selectedSlotsCount > 1 ? (selectedSlotsCount - 1) * BREAK_MINUTES : 0;

    const calculateEditPrice = async (values: { courtId?: string; slots: BookingSlot[] }) => {
        if (!values.courtId || !values.slots || values.slots.length === 0) return;

        try {
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
            const msg = err?.response?.data?.message || 'Không tính được tiền sân!';
            toast.error(msg);
            setEditValues((prev) => ({ ...prev, priceInfo: undefined }));
        }
    };

    const handleSlotClick = (s: string, e: string) => {
        if (!editValues.courtId || !editValues.date) {
            toast.error('Vui lòng chọn sân và ngày trước!');
            return;
        }

        if (isSlotPast(s) || isSlotBooked(s, e)) return;

        setEditValues((prev) => {
            const exists = prev.slots.some((sl) => sl.startTime === s && sl.endTime === e);

            let nextSlots: BookingSlot[];
            if (exists) {
                nextSlots = prev.slots.filter((sl) => !(sl.startTime === s && sl.endTime === e));
            } else {
                nextSlots = [...prev.slots, { startTime: s, endTime: e }];
            }

            const next: EditValues = { ...prev, slots: nextSlots };

            if (next.courtId && nextSlots.length > 0) {
                calculateEditPrice({ courtId: next.courtId, slots: nextSlots });
            } else {
                next.priceInfo = undefined;
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!booking) return;
        const { courtId, date, slots } = editValues;

        if (!courtId || !date || !slots || slots.length === 0) {
            toast.error('Vui lòng hoàn thành thông tin!');
            return;
        }

        try {
            setLoading(true);
            await api.patch(`/bookings/${booking._id}/time`, {
                courtId,
                date: dayjs(date).format('YYYY-MM-DD'),
                slots,
            });

            toast.success('Cập nhật lịch thành công!');
            onClose();
            onUpdated();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi cập nhật lịch!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !booking) return;

        const initialSlots: BookingSlot[] =
            Array.isArray(booking.slots) && booking.slots.length > 0
                ? booking.slots
                : [{ startTime: booking.startTime, endTime: booking.endTime }];

        const initial: EditValues = {
            courtId: booking.courtId?._id,
            date: dayjs(booking.date),
            slots: initialSlots,
            priceInfo: undefined,
        };

        setEditValues(initial);
        calculateEditPrice(initial);
    }, [open, booking]);

    const isDarkMode = document.documentElement.classList.contains('dark');

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={1000}
            centered
            className="premium-modal-v2"
            closeIcon={<div className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all mt-1 mr-1"><X size={18} className="text-slate-400" /></div>}
            title={
                <div className="flex items-center gap-4 py-4 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 rotate-3">
                        <History size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase italic">Chỉnh sửa giờ & sân</span>
                        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest uppercase mt-1">Mã đơn: #{booking?.code}</span>
                    </div>
                </div>
            }
        >
            {booking && (
                <div className="p-2 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
                    {/* Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-4xl border border-slate-100 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        
                        <div className="space-y-2 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <LayoutIcon size={12} /> Chọn sân thi đấu
                            </label>
                            <Select
                                value={editValues.courtId}
                                options={courts.map((c) => ({ value: c._id, label: c.name }))}
                                onChange={(value) => setEditValues((prev) => ({ ...prev, courtId: value, slots: [], priceInfo: undefined }))}
                                className="premium-select-v2 w-full"
                                placeholder="Chọn sân..."
                            />
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Calendar size={12} /> Ngày đặt sân
                            </label>
                            <DatePicker
                                value={editValues.date}
                                format="DD/MM/YYYY"
                                onChange={(value) => setEditValues((prev) => ({ ...prev, date: value, slots: [], priceInfo: undefined }))}
                                className="premium-input-v2 w-full"
                                allowClear={false}
                            />
                        </div>
                    </div>

                    {/* Slot Picker Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500"><Clock size={16} /></div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Khung giờ hoạt động</h3>
                            </div>
                            <div className="px-4 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-bold flex items-center gap-2 border border-indigo-500/20 shadow-sm animate-in fade-in slide-in-from-right-2 duration-500">
                                <Info size={12} /> Đã chọn {selectedSlotsCount} ca • Nghỉ {selectedBreakMinutes} phút
                            </div>
                        </div>

                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {TIME_SLOTS.map((slot, idx) => {
                                const past = isSlotPast(slot.start);
                                const booked = isSlotBooked(slot.start, slot.end);
                                const selected = isSlotSelected(slot.start, slot.end);

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={past || booked}
                                        onClick={() => handleSlotClick(slot.start, slot.end)}
                                        className={`group relative flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-300 border-2 overflow-hidden ${
                                            selected
                                                ? "bg-linear-to-br from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-xl shadow-emerald-500/30 scale-[1.05] z-10"
                                                : booked
                                                ? "bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20 text-rose-300 dark:text-rose-500/40 cursor-not-allowed"
                                                : past
                                                ? "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:scale-[1.03] cursor-pointer shadow-sm"
                                        }`}
                                    >
                                        <span className="text-[13px] font-black tracking-tight">{slot.start} - {slot.end}</span>
                                        {booked && <span className="text-[9px] font-black uppercase mt-1 px-2 py-0.5 bg-rose-500 text-white rounded-lg scale-90">Đã đặt</span>}
                                        {past && !booked && <span className="text-[9px] font-black uppercase mt-1 opacity-50">Hết hạn</span>}
                                        {selected && <div className="absolute top-1 right-1"><CheckCircle2 size={12} className="text-white/70" /></div>}
                                        {!past && !booked && !selected && <span className="text-[9px] font-bold uppercase mt-1 text-slate-300 group-hover:text-indigo-400 transition-colors">Trống</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Summary Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
                        <div className="lg:col-span-8 flex flex-col justify-end">
                            <div className="p-5 bg-amber-50 dark:bg-amber-500/5 rounded-3xl border border-amber-200 dark:border-amber-500/20 flex gap-4 items-start">
                                <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-1"><AlertCircle size={20} /></div>
                                <div>
                                    <h4 className="font-black text-amber-800 dark:text-amber-400 text-xs uppercase tracking-widest mb-1">Lưu ý quan trọng</h4>
                                    <p className="text-[12px] text-amber-700/80 dark:text-amber-400/60 leading-relaxed font-semibold">
                                        Việc thay đổi giờ đá có thể làm thay đổi tổng tiền đơn hàng nếu có sự chênh lệch giữa các khung giờ cao điểm / bình thường. Ưu đãi voucher (nếu có) sẽ được tính lại dựa trên giá trị mới.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                            {editValues.priceInfo && (
                                <div className="bg-slate-900 dark:bg-indigo-950/40 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                                        <div className="p-2.5 bg-indigo-500 rounded-2xl"><CreditCard size={18} /></div>
                                        <span className="font-black text-sm uppercase tracking-widest italic opacity-90">Tóm tắt chi phí</span>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center group">
                                            <span className="text-xs font-black text-slate-400 uppercase group-hover:text-indigo-400 transition-colors">Tiền sân</span>
                                            <span className="text-sm font-bold font-mono">{formatVND(editValues.priceInfo.fieldAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <span className="text-xs font-black text-slate-400 uppercase group-hover:text-indigo-400 transition-colors">Thiết bị</span>
                                            <span className="text-sm font-bold font-mono text-emerald-400">{formatVND(editValues.priceInfo.equipmentTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <span className="text-xs font-black text-slate-400 uppercase group-hover:text-rose-400 transition-colors">Giảm giá</span>
                                            <span className="text-sm font-bold font-mono text-rose-400">-{formatVND(editValues.priceInfo.discountTotal)}</span>
                                        </div>
                                        
                                        <div className="pt-5 mt-5 border-t border-white/20">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right">Tổng thanh toán dự kiến</span>
                                                <div className="flex justify-between items-end">
                                                    <ChevronRight size={24} className="text-indigo-500 animate-pulse mb-1" />
                                                    <span className="text-3xl font-black text-white font-mono tracking-tighter drop-shadow-lg">{formatVND(editValues.priceInfo.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                        <button
                            onClick={onClose}
                            className="px-8 py-3.5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-500 dark:hover:text-rose-400 transition-all active:scale-95"
                        >
                            Hủy bỏ các thay đổi
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !editValues.slots.length}
                            className="flex items-center gap-3 px-10 py-3.5 bg-linear-to-r from-indigo-600 to-violet-700 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? "Đang xử lý..." : (<>Lưu các thay đổi <ChevronRight size={16} /></>)}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .premium-modal-v2 .ant-modal-content {
                    border-radius: 48px !important;
                    padding: 24px !important;
                    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                }
                .dark .premium-modal-v2 .ant-modal-content {
                    background: #0f172a !important;
                }
                .premium-select-v2 .ant-select-selector {
                    border-radius: 20px !important;
                    height: 54px !important;
                    padding: 0 20px !important;
                    display: flex !important;
                    align-items: center !important;
                    font-weight: 700 !important;
                    border: 2px solid #f1f5f9 !important;
                    background: #fff !important;
                    transition: all 0.3s !important;
                }
                .dark .premium-select-v2 .ant-select-selector {
                    background: rgba(255,255,255,0.03) !important;
                    border-color: rgba(255,255,255,0.05) !important;
                    color: white !important;
                }
                .premium-select-v2:hover .ant-select-selector {
                    border-color: #6366f1 !important;
                }
                .premium-input-v2 {
                    border-radius: 20px !important;
                    height: 54px !important;
                    padding: 0 20px !important;
                    font-weight: 700 !important;
                    border: 2px solid #f1f5f9 !important;
                    background: #fff !important;
                    transition: all 0.3s !important;
                }
                .dark .premium-input-v2 {
                    background: rgba(255,255,255,0.03) !important;
                    border-color: rgba(255,255,255,0.05) !important;
                    color: white !important;
                }
                .premium-input-v2:hover {
                    border-color: #6366f1 !important;
                }
                .premium-modal-v2 .ant-modal-header {
                    background: transparent !important;
                    border-bottom: none !important;
                    margin-bottom: 0 !important;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </Modal>
    );
};

export default BookingEditModal;

import React, { useEffect, useMemo, useState } from 'react';
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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl p-0 border border-border/80 rounded-2xl md:rounded-3xl shadow-2xl bg-card max-h-[92vh] overflow-y-auto no-scrollbar flex flex-col">
                
                {/* Modal Header */}
                <DialogHeader className="px-5 py-4 md:px-6 md:py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-3 shrink-0">
                            <History size={18} className="md:size-5" />
                        </div>
                        <div className="flex flex-col text-left">
                            <DialogTitle className="text-base md:text-lg font-black text-foreground tracking-tight leading-none uppercase italic">
                                Chỉnh sửa giờ & sân
                            </DialogTitle>
                            <DialogDescription className="text-[10px] md:text-xs font-semibold text-indigo-500 dark:text-indigo-400 mt-1 font-mono tracking-wider">
                                MÃ ĐƠN: #{booking?.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {booking && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                        
                        {/* Main Grid: Responsive column scaling */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* Left panel (8 cols on large screens): Selectors and Hour Slot Picker */}
                            <div className="lg:col-span-8 space-y-6">
                                
                                {/* Selectors Area */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl md:rounded-2xl border border-border/60 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    
                                    {/* Court Select */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5 flex items-center gap-1.5">
                                            <LayoutIcon size={12} className="text-indigo-500 shrink-0" /> Chọn sân thi đấu
                                        </label>
                                        <Select
                                            value={editValues.courtId}
                                            onValueChange={(value) => setEditValues((prev) => ({ ...prev, courtId: value, slots: [], priceInfo: undefined }))}
                                        >
                                            <SelectTrigger className="w-full h-11 rounded-xl border-border bg-card font-semibold text-xs transition-all hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500">
                                                <SelectValue placeholder="Chọn sân..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border bg-card">
                                                {courts.map((c) => (
                                                    <SelectItem key={c._id} value={c._id} className="text-xs font-semibold">
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date Input */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-indigo-500 shrink-0" /> Ngày đặt sân
                                        </label>
                                        <input
                                            type="date"
                                            value={editValues.date ? editValues.date.format('YYYY-MM-DD') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditValues((prev) => ({ ...prev, date: val ? dayjs(val) : null, slots: [], priceInfo: undefined }));
                                            }}
                                            className="w-full h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                                        />
                                    </div>
                                </div>

                                {/* Hour Slot Picker Selection Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={15} className="text-indigo-500 shrink-0" />
                                            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Khung giờ hoạt động</h3>
                                        </div>
                                        <div className="px-3.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold w-max flex items-center gap-1.5 border border-indigo-500/20">
                                            <Info size={11} className="shrink-0" />
                                            <span>Đã chọn {selectedSlotsCount} ca {selectedBreakMinutes > 0 && `• Nghỉ ${selectedBreakMinutes} phút`}</span>
                                        </div>
                                    </div>

                                    {/* Responsive time slot grid: 2 cols on mobile, 3 on tablet, 4 on laptop */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
                                                    className={`group relative flex flex-col items-center justify-center py-3.5 rounded-xl transition-all duration-200 border-2 ${
                                                        selected
                                                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-md shadow-emerald-500/20 scale-[1.02] z-10 font-bold"
                                                            : booked
                                                            ? "bg-rose-500/5 border-rose-500/10 text-rose-300 dark:text-rose-500/40 cursor-not-allowed opacity-60"
                                                            : past
                                                            ? "bg-muted/30 border-muted/10 text-muted-foreground/45 cursor-not-allowed opacity-50"
                                                            : "bg-card border-border/80 text-foreground/80 hover:border-indigo-400 hover:text-indigo-600 hover:scale-[1.01] cursor-pointer shadow-xs"
                                                    }`}
                                                >
                                                    <span className="text-[12px] font-bold tracking-tight">{slot.start} - {slot.end}</span>
                                                    {booked && <span className="text-[8px] font-extrabold uppercase mt-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-md">Đã đặt</span>}
                                                    {past && !booked && <span className="text-[8px] font-extrabold uppercase mt-1 text-muted-foreground/60">Hết hạn</span>}
                                                    {selected && <div className="absolute top-1 right-1"><CheckCircle2 size={10} className="text-white/80" /></div>}
                                                    {!past && !booked && !selected && <span className="text-[8px] font-bold uppercase mt-1 text-muted-foreground group-hover:text-indigo-500">Trống</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>

                            {/* Right panel (4 cols on large screens): Sticky Bill & Warnings */}
                            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-0">
                                
                                {/* Cost Summary Card (only shows when priceInfo is resolved) */}
                                {editValues.priceInfo && (
                                    <div className="bg-slate-950 dark:bg-indigo-950/20 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-white/5 animate-in zoom-in-95 duration-200">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
                                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/10 text-left">
                                            <div className="p-2 bg-indigo-500 rounded-xl text-white shrink-0"><CreditCard size={14} /></div>
                                            <span className="font-extrabold text-xs uppercase tracking-wider opacity-90">Tóm tắt chi phí</span>
                                        </div>
                                        
                                        <div className="space-y-3.5 text-xs text-left">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Tiền sân</span>
                                                <span className="font-mono font-semibold">{formatVND(editValues.priceInfo.fieldAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Thiết bị</span>
                                                <span className="font-mono font-semibold text-emerald-400">{formatVND(editValues.priceInfo.equipmentTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Giảm giá</span>
                                                <span className="font-mono font-semibold text-rose-400">-{formatVND(editValues.priceInfo.discountTotal)}</span>
                                            </div>
                                            
                                            <div className="pt-4 mt-4 border-t border-white/10">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest text-right">Tổng thanh toán dự kiến</span>
                                                    <div className="flex justify-between items-end">
                                                        <ChevronRight size={18} className="text-indigo-500 animate-pulse shrink-0" />
                                                        <span className="text-2xl font-black text-white font-mono tracking-tight">{formatVND(editValues.priceInfo.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Important Warning Box */}
                                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 flex gap-3 items-start text-left">
                                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-wider">Lưu ý quan trọng</h4>
                                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/60 leading-relaxed font-semibold">
                                            Việc thay đổi giờ đá có thể làm thay đổi tổng tiền đơn hàng nếu có sự chênh lệch giữa các khung giờ cao điểm / bình thường. Ưu đãi voucher (nếu có) sẽ được tính lại dựa trên giá trị mới.
                                        </p>
                                    </div>
                                </div>

                            </div>

                        </div>

                    </div>
                )}

                {/* Modal Footer Actions Bar */}
                <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-border bg-muted/10">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-xs font-semibold h-11 px-5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                    >
                        Hủy bỏ các thay đổi
                    </Button>
                    <Button
                        disabled={loading || !editValues.slots.length}
                        onClick={handleSave}
                        className="bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-xs h-11 px-7 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all flex items-center gap-1.5"
                    >
                        {loading ? "Đang xử lý..." : (<>Lưu các thay đổi <ChevronRight size={14} /></>)}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default BookingEditModal;

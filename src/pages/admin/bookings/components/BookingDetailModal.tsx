import React, { useEffect, useState, useMemo } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, User, Landmark, ShoppingCart } from "lucide-react";
import dayjs from "dayjs";

interface Booking {
    _id: string;
    code: string;
    customerInfo?: { name?: string; phone?: string; email?: string };
    customerId?: { name?: string; username?: string; phone?: string; email?: string };
    courtId?: { _id: string; name: string };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    equipmentTotal?: number;
    fieldAmount?: number;
    status: string;
}

interface EquipmentItem {
    _id: string;
    name: string;
    mode: "rent" | "sell";
    qty: number;
    price: number;
    subtotal: number;
    unit?: string;
}

interface Props {
    open: boolean;
    bookingId: string | null;
    onClose: () => void;
}

const formatVND = (v: number = 0) =>
    v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function BookingDetailModal({ open, bookingId, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState<{
        booking: Booking;
        items: EquipmentItem[];
    } | null>(null);

    useEffect(() => {
        if (open && bookingId) {
            fetchDetail();
        }
    }, [open, bookingId]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/bookings/${bookingId}/admin-detail`);
            setDetailData(res.data?.data || res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Không thể tải chi tiết đơn hàng!");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const mergedItems = useMemo(() => {
        if (!detailData?.items) return [];
        const map: Record<string, EquipmentItem> = {};
        detailData.items.forEach((it) => {
            const key = `${it.name}_${it.mode}_${it.price}_${it.unit || ""}`;
            if (map[key]) {
                map[key] = {
                    ...map[key],
                    qty: map[key].qty + it.qty,
                    subtotal: map[key].subtotal + it.subtotal,
                };
            } else {
                map[key] = { ...it };
            }
        });
        return Object.values(map);
    }, [detailData]);

    if (!open) return null;

    const booking = detailData?.booking;
    const customerName = booking?.customerInfo?.name || booking?.customerId?.name || booking?.customerId?.username || "Khách lẻ";

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                        <Eye className="text-emerald-600" size={18} />
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Chi tiết đơn đặt sân đang hoạt động
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn đặt: #{booking?.code || "—"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {loading || !booking ? (
                        <div className="py-20 text-center text-muted-foreground text-xs font-semibold">Đang tải thông tin...</div>
                    ) : (
                        <>
                            {/* Metadata */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/10 border border-border/60 text-xs">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Khách hàng</span>
                                    <p className="font-bold text-foreground">{customerName}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sân bóng</span>
                                    <p className="font-bold text-foreground">{booking.courtId?.name || "—"}</p>
                                </div>
                                <div className="space-y-1 sm:col-span-2 border-t border-border/40 pt-2.5 mt-1">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Thời gian</span>
                                    <p className="font-semibold text-foreground">
                                        {dayjs(booking.date).format("DD/MM/YYYY")} · {booking.startTime} - {booking.endTime}
                                    </p>
                                </div>
                            </div>

                            {/* Rented Equipment / Sales Items */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border/60 pb-2">
                                    <ShoppingCart size={12} className="text-emerald-600" /> Dịch vụ & thiết bị sử dụng
                                </h4>
                                <div className="border border-border/60 rounded-xl overflow-hidden shadow-2xs divide-y divide-border/40 text-xs">
                                    {mergedItems.length > 0 ? (
                                        mergedItems.map((item, idx) => {
                                            const isRent = item.mode === "rent";
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-card hover:bg-muted/10 transition-colors">
                                                    <div>
                                                        <div className="font-bold text-foreground flex items-center gap-1.5">
                                                            <span>{item.name}</span>
                                                            <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase border ${
                                                                isRent
                                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                            }`}>
                                                                {isRent ? "Thuê" : "Bán"}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            {formatVND(item.price)} x {item.qty} {item.unit || "cái"}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-foreground font-mono">{formatVND(item.subtotal)}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-4 text-center text-muted-foreground/60 italic">Chưa thuê hoặc mua thiết bị nào.</div>
                                    )}
                                </div>
                            </div>

                            {/* Summary panel */}
                            <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60 grid grid-cols-2 gap-4 text-xs font-semibold">
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tiền sân bóng</span>
                                    <p className="font-bold text-foreground font-mono mt-0.5">{formatVND(booking.fieldAmount ?? booking.total ?? 0)}</p>
                                </div>
                                <div className="text-right border-l border-border/60 pl-4">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tiền dịch vụ</span>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{formatVND(booking.equipmentTotal ?? 0)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end pt-2 border-t border-border/40">
                                <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                                    Đóng
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

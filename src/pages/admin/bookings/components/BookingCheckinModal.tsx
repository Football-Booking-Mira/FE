import React, { useEffect, useState } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Info, MapPin, Minus, PackageCheck, Plus, ShoppingBag, User } from "lucide-react";
import dayjs from "dayjs";

interface BookingSlot {
    startTime: string;
    endTime: string;
}

interface Booking {
    _id: string;
    code: string;
    customerInfo?: { name?: string; phone?: string; email?: string };
    customerId?: { name?: string; username?: string; phone?: string; email?: string };
    courtId?: { _id: string; name: string };
    date: string;
    startTime: string;
    endTime: string;
    slots?: BookingSlot[];
    equipmentTotal?: number;
}

interface EquipmentItem {
    key: string;
    equipmentId: string;
    name: string;
    mode: "rent" | "sell";
    price: number;
    stock: number;
    unit?: string;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    mode: "checkin" | "add_equipment";
    onClose: () => void;
    onSuccess: () => void;
}

const formatVND = (v: number = 0) =>
    v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function BookingCheckinModal({ open, booking, mode, onClose, onSuccess }: Props) {
    const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
    const [equipmentQty, setEquipmentQty] = useState<Record<string, number>>({});
    const [equipmentBaseQty, setEquipmentBaseQty] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && booking) {
            loadEquipments();
        }
    }, [open, booking]);

    const loadEquipments = async () => {
        if (!booking) return;
        try {
            setLoading(true);
            const equipRes = await api.get("/equipments");
            const rawEquipments = equipRes.data?.data || equipRes.data || [];

            const baseQty: Record<string, number> = {};
            try {
                const itemsRes = await api.get(`/bookings/${booking._id}/equipments-detail`);
                const items = itemsRes.data?.data || [];
                items.forEach((it: any) => {
                    const m: "rent" | "sell" = it.mode === "sell" ? "sell" : "rent";
                    const eqId = typeof it.equipmentId === "string" ? it.equipmentId : it.equipmentId?._id;
                    if (eqId) {
                        const key = `${eqId}_${m}`;
                        baseQty[key] = (baseQty[key] || 0) + (it.qty || 0);
                    }
                });
            } catch (err) {
                console.error("Failed to load existing equipment:", err);
            }

            const list: EquipmentItem[] = [];
            rawEquipments.forEach((e: any) => {
                const unit = e.unit || "cái";
                const stock = e.availableQuantity ?? e.stockLeft ?? e.stock ?? e.totalQuantity ?? 0;

                if (e.mode === "rent" || e.mode === "both") {
                    if (e.rentPrice && e.rentPrice > 0) {
                        list.push({
                            key: `${e._id}_rent`,
                            equipmentId: e._id,
                            name: e.name,
                            mode: "rent",
                            price: e.rentPrice,
                            stock,
                            unit,
                        });
                    }
                }
                if (e.mode === "sell" || e.mode === "both") {
                    if (e.salePrice && e.salePrice > 0) {
                        list.push({
                            key: `${e._id}_sell`,
                            equipmentId: e._id,
                            name: e.name,
                            mode: "sell",
                            price: e.salePrice,
                            stock,
                            unit,
                        });
                    }
                }
            });

            setEquipmentList(list);
            setEquipmentBaseQty(baseQty);
            setEquipmentQty(baseQty);
        } catch (err) {
            toast.error("Không thể tải danh sách thiết bị!");
        } finally {
            setLoading(false);
        }
    };

    const changeQty = (key: string, delta: number, maxStock: number) => {
        setEquipmentQty((prev) => {
            const curr = prev[key] ?? 0;
            const base = equipmentBaseQty[key] || 0;
            let next = curr + delta;
            if (next < base) next = base;
            const maxTotal = base + maxStock;
            if (next > maxTotal) next = maxTotal;
            return { ...prev, [key]: next };
        });
    };

    const addedTotal = equipmentList.reduce((sum, item) => {
        const totalQty = equipmentQty[item.key] || 0;
        const base = equipmentBaseQty[item.key] || 0;
        const addQty = Math.max(0, totalQty - base);
        return sum + addQty * item.price;
    }, 0);

    const oldTotal = booking?.equipmentTotal || 0;
    const newTotal = oldTotal + addedTotal;

    const handleConfirm = async () => {
        if (!booking) return;
        const items = equipmentList
            .map((item) => {
                const totalQty = equipmentQty[item.key] || 0;
                const base = equipmentBaseQty[item.key] || 0;
                const qty = Math.max(0, totalQty - base);
                if (qty <= 0) return null;
                return {
                    equipmentId: item.equipmentId,
                    mode: item.mode,
                    qty,
                    price: item.price,
                };
            })
            .filter(Boolean);

        try {
            const url = mode === "checkin"
                ? `/bookings/${booking._id}/checkin`
                : `/bookings/${booking._id}/equipments`;

            await api.patch(url, {
                items,
                equipmentTotal: addedTotal,
            });

            toast.success(
                mode === "checkin"
                    ? "📦 Check-in thành công, đã cập nhật dịch vụ!"
                    : "📦 Đã thêm thiết bị vào đơn đặt!"
            );
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Lỗi thao tác check-in/dịch vụ!");
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                            <PackageCheck size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                {mode === "checkin" ? "Check-in & Dịch vụ" : "Thêm thiết bị / Phụ trợ"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn hàng: #{booking.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Context info details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/10 p-4 rounded-xl border border-border/60">
                        <div className="flex items-start gap-2.5">
                            <User size={14} className="text-muted-foreground mt-0.5" />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Khách hàng</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">
                                    {booking.customerInfo?.name || booking.customerId?.name || "Khách lẻ"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <MapPin size={14} className="text-muted-foreground mt-0.5" />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sân bóng</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">{booking.courtId?.name || "—"}</div>
                            </div>
                        </div>
                        <div className="sm:col-span-2 flex items-start gap-2.5 border-t border-border/40 pt-3 mt-1">
                            <Clock size={14} className="text-muted-foreground mt-0.5" />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Thời gian đặt</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dayjs(booking.date).format("DD/MM/YYYY")}</span>
                                    <span className="mx-2 text-border">|</span>
                                    {Array.isArray(booking.slots) && booking.slots.length > 0
                                        ? booking.slots.map((s) => `${s.startTime}-${s.endTime}`).join(", ")
                                        : `${booking.startTime}-${booking.endTime}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Equipment section list */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border/60 pb-2">
                            <ShoppingBag size={13} className="text-emerald-600" />
                            Danh sách thiết bị & Dịch vụ
                        </h4>

                        {loading ? (
                            <div className="py-12 text-center text-muted-foreground text-xs font-medium">Đang tải thiết bị...</div>
                        ) : equipmentList.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground text-xs italic">Không có thiết bị dịch vụ khả dụng.</div>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {equipmentList.map((item) => {
                                    const qty = equipmentQty[item.key] || 0;
                                    const base = equipmentBaseQty[item.key] || 0;
                                    const maxTotal = base + item.stock;
                                    const isRent = item.mode === "rent";

                                    return (
                                        <div
                                            key={item.key}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                                                qty > 0
                                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                                    : "bg-muted/10 border-border/60"
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase border ${
                                                        isRent
                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    }`}>
                                                        {isRent ? "Thuê" : "Bán"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                                                    <span>Đơn giá: {formatVND(item.price)}/{item.unit || "cái"}</span>
                                                    <span>Kho: {item.stock} {item.unit || "cái"}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center bg-card rounded-lg border border-border/60 p-0.5">
                                                <button
                                                    onClick={() => changeQty(item.key, -1, item.stock)}
                                                    disabled={qty <= base}
                                                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-foreground">{qty}</span>
                                                <button
                                                    onClick={() => changeQty(item.key, 1, item.stock)}
                                                    disabled={qty >= maxTotal}
                                                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Total cost and action actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-4 border-t border-border/60">
                        <div className="bg-muted/30 dark:bg-muted/10 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phí thêm lần này</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{formatVND(addedTotal)}</p>
                            </div>
                            {mode === "add_equipment" && (
                                <div className="text-right border-l border-border/60 pl-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tổng dịch vụ mới</p>
                                    <p className="text-sm font-bold text-foreground mt-0.5 font-mono">{formatVND(newTotal)}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2.5">
                            <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                                Hủy bỏ
                            </Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-1.5" onClick={handleConfirm}>
                                {mode === "checkin" ? "Xác nhận Check-in" : "Cập nhật dịch vụ"} <ChevronRight size={13} />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

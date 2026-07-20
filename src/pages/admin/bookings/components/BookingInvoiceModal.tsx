import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, FileText, Hash, MapPin, Printer, User } from "lucide-react";
import dayjs from "dayjs";
import { printInvoiceMira } from "@/common/utils/printInvoice";

interface Props {
    open: boolean;
    invoiceDetail: any | null;
    loading: boolean;
    onClose: () => void;
}

const formatVND = (v: number = 0) =>
    v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const PAYMENT_METHOD_TEXT: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
};

export default function BookingInvoiceModal({ open, invoiceDetail, loading, onClose }: Props) {
    
    const mergedItems = useMemo(() => {
        if (!invoiceDetail?.items) return [];
        const map: Record<string, any> = {};
        invoiceDetail.items.forEach((it: any) => {
            const key = `${it.name || ""}_${it.mode || ""}_${it.price || 0}_${it.unit || ""}`;
            if (map[key]) {
                map[key].qty += it.qty || 0;
                map[key].subtotal += it.subtotal || (it.qty || 0) * (it.price || 0);
            } else {
                map[key] = {
                    ...it,
                    qty: it.qty || 0,
                    subtotal: it.subtotal || (it.qty || 0) * (it.price || 0),
                };
            }
        });
        return Object.values(map);
    }, [invoiceDetail]);

    if (!open) return null;

    const handlePrint = () => {
        if (invoiceDetail) {
            printInvoiceMira(invoiceDetail);
        }
    };

    const inv = invoiceDetail?.invoice;
    const booking = inv?.bookingId || {};
    const customer = inv?.customerId || booking?.customerId || booking?.customerInfo || {};
    const methodLabel = PAYMENT_METHOD_TEXT[inv?.method] || inv?.method || "—";

    const fieldAmount = booking.fieldAmount ?? booking.total ?? 0;
    const equipmentTotal = booking.equipmentTotal ?? 0;
    const voucherDiscount = booking.voucherDiscount ?? booking.discountTotal ?? 0;
    const subtotalBeforeDiscount = fieldAmount + equipmentTotal;
    
    const depositPaid = Number(booking.depositAmount ?? 0);
    const depositPaidBefore = Math.max(0, depositPaid - Number(inv?.total || 0));

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                {loading || !invoiceDetail ? (
                    <div className="py-20 text-center text-muted-foreground text-xs font-semibold">Đang tải thông tin hóa đơn...</div>
                ) : (
                    <div className="flex flex-col">
                        {/* Header Details */}
                        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-base font-bold text-foreground">
                                        Hóa đơn thanh toán
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Mã hóa đơn: {inv.code} {booking.code ? `(Đơn đặt: #${booking.code})` : ""}
                                    </DialogDescription>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                                    Đã thanh toán
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                            {/* Summary contextual grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/10 p-4 rounded-xl border border-border/60">
                                <div className="flex items-start gap-2.5">
                                    <User className="text-muted-foreground mt-0.5" size={14} />
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Khách hàng</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">{customer.name || customer.username || "Khách lẻ"}</div>
                                        {customer.phone && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{customer.phone}</div>}
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <Calendar className="text-muted-foreground mt-0.5" size={14} />
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Thanh toán lúc</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">{dayjs(inv.createdAt || inv.paidAt).format("DD/MM/YYYY HH:mm")}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">{methodLabel}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="text-muted-foreground mt-0.5" size={14} />
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sân bóng</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">{booking.courtId?.name || "—"}</div>
                                        {booking.date && (
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                                {dayjs(booking.date).format("DD/MM/YYYY")} · {booking.startTime}-{booking.endTime}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Service / Equipment List */}
                            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                                <div className="bg-muted/30 px-4 py-2 border-b border-border/60 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>Hạng mục / Thiết bị</span>
                                    <span>Thành tiền</span>
                                </div>
                                <div className="p-4 divide-y divide-border/40 text-xs">
                                    {mergedItems.length > 0 ? (
                                        mergedItems.map((item: any, idx: number) => {
                                            const isRent = item.mode === "rent";
                                            return (
                                                <div key={idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                                                    <div>
                                                        <div className="font-bold text-foreground flex items-center gap-1.5">
                                                            <span>{item.name || "Dịch vụ"}</span>
                                                            <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase border ${
                                                                isRent
                                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                            }`}>
                                                                {isRent ? "Thuê" : "Bán"}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                                            {formatVND(item.price)} x {item.qty} {item.unit || ""}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-foreground font-mono">{formatVND(item.subtotal)}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-2 text-center text-muted-foreground/60 text-xs italic">Không dùng dịch vụ/thiết bị phụ trợ.</div>
                                    )}
                                </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                                <div className="divide-y divide-border/40 text-xs">
                                    <div className="flex justify-between items-center px-4 py-2.5 bg-card">
                                        <span className="text-muted-foreground">Tiền sân bóng</span>
                                        <span className="font-semibold text-foreground">{formatVND(fieldAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-2.5 bg-card">
                                        <span className="text-muted-foreground">Tiền dịch vụ</span>
                                        <span className="font-semibold text-foreground">{formatVND(equipmentTotal)}</span>
                                    </div>
                                    {voucherDiscount > 0 && (
                                        <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <span>Khuyến mãi voucher</span>
                                            <span>-{formatVND(voucherDiscount)}</span>
                                        </div>
                                    )}
                                    {inv.discount > 0 && (
                                        <div className="flex justify-between items-center px-4 py-2.5 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-semibold">
                                            <span>Chiết khấu từ hệ thống</span>
                                            <span>-{formatVND(inv.discount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-4 py-3 bg-muted/20 font-bold text-sm">
                                        <span>Tổng thanh toán đơn</span>
                                        <span>{formatVND(subtotalBeforeDiscount - voucherDiscount - inv.discount)}</span>
                                    </div>
                                    {depositPaid > 0 && (
                                        <div className="flex justify-between items-center px-4 py-2.5 bg-card text-muted-foreground font-semibold">
                                            <span>Tiền cọc đã trừ</span>
                                            <span>-{formatVND(depositPaid)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-4 py-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                                        <span>Tổng tiền thu tại quầy</span>
                                        <span>{formatVND(inv.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions block */}
                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                                <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                                    Đóng cửa sổ
                                </Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm" onClick={handlePrint}>
                                    <Printer size={14} /> In hóa đơn (In nhiệt)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

import React, { useEffect, useState } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, User, Hash } from "lucide-react";

interface Booking {
    _id: string;
    code: string;
    customerInfo?: { name?: string; phone?: string; email?: string };
    customerId?: { name?: string; username?: string; phone?: string; email?: string };
    depositAmount?: number;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    onClose: () => void;
    onSuccess: () => void;
}

const formatVND = (v: number = 0) =>
    v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function BookingCancelCashModal({ open, booking, onClose, onSuccess }: Props) {
    const [refundDeposit, setRefundDeposit] = useState(false);
    const [adminReason, setAdminReason] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setRefundDeposit(false);
            setAdminReason("");
        }
    }, [open]);

    if (!booking) return null;

    const customerName = booking.customerInfo?.name || booking.customerId?.name || booking.customerId?.username || "Khách lẻ";
    const depositAmount = booking.depositAmount || 0;

    const handleConfirm = async () => {
        try {
            setLoading(true);
            await api.post(`/bookings/${booking._id}/admin-cancel-cash`, {
                refundDeposit,
                adminReason,
            });
            toast.success("❌ Đã hủy đơn tiền mặt và cập nhật trạng thái tiền!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Lỗi khi hủy đơn tiền mặt!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5 text-rose-600">
                        <AlertTriangle size={20} />
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Hủy đơn đặt sân (Tiền mặt)
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn đặt: #{booking.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Booking metadata */}
                    <div className="p-3.5 rounded-xl bg-muted/10 border border-border/60 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Khách hàng:</span>
                            <span className="font-bold text-foreground">{customerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tiền đặt cọc:</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatVND(depositAmount)}</span>
                        </div>
                    </div>

                    {/* Checkbox for deposit refund */}
                    {depositAmount > 0 && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                            <input
                                type="checkbox"
                                id="refundDeposit"
                                checked={refundDeposit}
                                onChange={(e) => setRefundDeposit(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="refundDeposit" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                    Hoàn lại tiền cọc cho khách
                                </Label>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Chọn hộp này nếu muốn trả lại khoản cọc {formatVND(depositAmount)} cho khách. Nếu không chọn, khoản cọc này sẽ bị tịch thu.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cancellation reason */}
                    <div className="space-y-1.5">
                        <Label htmlFor="adminReason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Lý do hủy đơn <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            id="adminReason"
                            placeholder="Nhập lý do hủy đơn bắt buộc..."
                            value={adminReason}
                            onChange={(e) => setAdminReason(e.target.value)}
                            className="text-xs bg-card border-border min-h-[80px]"
                        />
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                        <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                            Bỏ qua
                        </Button>
                        <Button
                            disabled={loading || !adminReason.trim()}
                            onClick={handleConfirm}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 px-5"
                        >
                            {loading ? "Đang xử lý..." : "Xác nhận hủy đơn"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

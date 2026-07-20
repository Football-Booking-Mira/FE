import React, { useEffect, useState } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface Booking {
    _id: string;
    code: string;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BookingRejectModal({ open, booking, onClose, onSuccess }: Props) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setReason("");
        }
    }, [open]);

    if (!booking) return null;

    const handleConfirm = async () => {
        if (!reason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối!");
            return;
        }

        try {
            setLoading(true);
            await api.post(`/bookings/${booking._id}/refund/reject`, {
                reason: reason.trim(),
            });
            toast.success("Đã từ chối yêu cầu hoàn tiền!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối hoàn tiền thất bại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2 text-rose-600">
                        <AlertCircle size={20} />
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Từ chối hoàn tiền
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn đặt: #{booking.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="rejectReason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Lý do từ chối hoàn tiền <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            id="rejectReason"
                            placeholder="Nhập lý do từ chối hoàn tiền để phản hồi lại khách hàng..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="text-xs bg-card border-border min-h-[80px]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                        <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                            Bỏ qua
                        </Button>
                        <Button
                            disabled={loading || !reason.trim()}
                            onClick={handleConfirm}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 px-5"
                        >
                            {loading ? "Đang xử lý..." : "Xác nhận từ chối"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, User, Phone, Mail, Landmark, CreditCard, Clipboard } from "lucide-react";

interface Booking {
    _id: string;
    code: string;
    customerInfo?: { name?: string; phone?: string; email?: string };
    customerId?: { name?: string; username?: string; phone?: string; email?: string };
    refundBankName?: string;
    refundAccountNumber?: string;
    refundAccountName?: string;
    refundNote?: string;
    refund?: {
        adminReason?: string;
        billImage?: string;
    };
    refundAdminReason?: string;
    refundBillImage?: string;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    mode: "account" | "admin";
    onClose: () => void;
}

export default function BookingRefundModal({ open, booking, mode, onClose }: Props) {
    if (!booking) return null;

    const customerName = booking.customerInfo?.name || booking.customerId?.name || booking.customerId?.username || "Ẩn danh";
    const customerPhone = booking.customerInfo?.phone || booking.customerId?.phone || "";
    const customerEmail = booking.customerInfo?.email || booking.customerId?.email || "";

    const adminReason = booking.refund?.adminReason || booking.refundAdminReason || "";
    const billImage = booking.refund?.billImage || booking.refundBillImage || "";

    const isAccountMode = mode === "account";
    const isAdminMode = mode === "admin";

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <DialogTitle className="text-base font-bold text-foreground">
                        {isAdminMode ? `Chi tiết hoàn tiền` : `Thông tin tài khoản hoàn tiền`}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        Mã đơn đặt: #{booking.code}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Customer information card */}
                    <div className="p-4 rounded-xl bg-muted/10 border border-border/60 shadow-2xs space-y-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <User size={12} className="text-emerald-600" /> Thông tin khách hàng
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Họ tên</span>
                                <span className="font-bold text-foreground mt-0.5">{customerName}</span>
                            </div>
                            {customerPhone && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Số điện thoại</span>
                                    <span className="font-medium text-foreground mt-0.5">{customerPhone}</span>
                                </div>
                            )}
                            {customerEmail && (
                                <div className="flex flex-col sm:col-span-2 mt-1">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Email</span>
                                    <span className="font-medium text-foreground mt-0.5 truncate">{customerEmail}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bank account details for manual refund */}
                    {isAccountMode && (
                        <div className="p-4 rounded-xl bg-muted/10 border border-border/60 shadow-2xs space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Landmark size={12} className="text-emerald-600" /> Tài khoản nhận hoàn tiền
                            </h4>
                            <div className="space-y-3.5 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ngân hàng</Label>
                                        <Input readOnly value={booking.refundBankName || ""} className="h-9 text-xs bg-card border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Số tài khoản</Label>
                                        <Input readOnly value={booking.refundAccountNumber || ""} className="h-9 text-xs font-mono bg-card border-border" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tên chủ tài khoản</Label>
                                    <Input readOnly value={booking.refundAccountName || ""} className="h-9 text-xs font-bold uppercase bg-card border-border" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ghi chú từ khách</Label>
                                    <Textarea readOnly value={booking.refundNote || "Không có ghi chú"} className="text-xs bg-card border-border min-h-[60px]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin processing results */}
                    {isAdminMode && (adminReason || billImage) && (
                        <div className="p-4 rounded-xl border border-dashed border-border space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <AlertCircle size={12} className="text-emerald-600" /> Kết quả xử lý từ quản trị viên
                            </h4>
                            <div className="space-y-3.5 text-xs">
                                {adminReason && (
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lý do từ chối / Ghi chú</span>
                                        <Textarea readOnly value={adminReason} className="text-xs bg-muted/20 border-border min-h-[60px]" />
                                    </div>
                                )}
                                {billImage && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            <span>Ảnh giao dịch / Chứng từ</span>
                                            <a href={billImage} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                                Xem ảnh gốc
                                            </a>
                                        </div>
                                        <div className="rounded-lg overflow-hidden border border-border bg-muted/10 p-2 flex items-center justify-center">
                                            <img src={billImage} alt="Chứng từ hoàn tiền" className="max-h-56 object-contain rounded" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end pt-2 border-t border-border/40">
                        <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                            Đóng cửa sổ
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

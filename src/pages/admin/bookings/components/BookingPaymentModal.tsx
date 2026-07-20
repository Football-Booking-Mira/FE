import React, { useEffect, useState } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, DollarSign, Info, MapPin, QrCode, User, Wallet } from "lucide-react";
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
    fieldAmount?: number;
    total: number;
    equipmentTotal?: number;
    voucherDiscount?: number;
    discountTotal?: number;
    voucherCode?: string;
    voucher?: { code?: string };
    depositAmount?: number;
    depositStatus?: string;
    depositMethod?: string;
    isGroup?: boolean;
    groupedItems?: Booking[];
}

interface QrData {
    image: string;
    amount: number;
    bankName?: string;
    accountNo?: string;
    accountName?: string;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    onClose: () => void;
    onSuccess: () => void;
}

const formatVND = (v: number = 0) =>
    v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function BookingPaymentModal({ open, booking, onClose, onSuccess }: Props) {
    const [discountInput, setDiscountInput] = useState("");
    const [discountReason, setDiscountReason] = useState("");
    const [method, setMethod] = useState<"cash" | "transfer">("cash");
    const [receivedAmount, setReceivedAmount] = useState("");
    const [qrData, setQrData] = useState<QrData | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [showQr, setShowQr] = useState(false);

    useEffect(() => {
        if (open) {
            setDiscountInput("");
            setDiscountReason("");
            setMethod("cash");
            setReceivedAmount("");
            setQrData(null);
            setShowQr(false);
        }
    }, [open]);

    if (!booking) return null;

    const activeBookings = booking.isGroup
        ? (booking.groupedItems || []).filter((item: any) => item.status !== "cancelled")
        : [];
    const isGroupPayment = !!booking.isGroup;

    const depositPaid = isGroupPayment
        ? activeBookings.reduce((sum, b) => {
            const hasDeposit = (b.depositAmount || 0) > 0 && b.depositStatus === "paid";
            return sum + (hasDeposit ? Number(b.depositAmount) : 0);
        }, 0)
        : ((booking.depositAmount || 0) > 0 && booking.depositStatus === "paid"
            ? Number(booking.depositAmount)
            : 0);

    const voucherDiscount = isGroupPayment
        ? activeBookings.reduce((sum, b) => sum + Number(b.voucherDiscount ?? b.discountTotal ?? 0), 0)
        : Number(booking.voucherDiscount ?? booking.discountTotal ?? 0);

    const voucherCode = isGroupPayment
        ? activeBookings.map((b) => b.voucherCode || b.voucher?.code).filter(Boolean).join(", ")
        : (booking.voucherCode || booking.voucher?.code || "");

    const totalFieldAmount = isGroupPayment
        ? activeBookings.reduce((sum, b) => sum + Number(b.fieldAmount ?? b.total ?? 0), 0)
        : Number(booking.fieldAmount ?? booking.total ?? 0);

    const totalEquipmentTotal = isGroupPayment
        ? activeBookings.reduce((sum, b) => sum + Number(b.equipmentTotal || 0), 0)
        : Number(booking.equipmentTotal || 0);

    const originalTotal = totalFieldAmount + totalEquipmentTotal;
    const paymentBaseTotal = Math.max(0, originalTotal - depositPaid - voucherDiscount);

    // Parsing discount
    const rawDiscount = parseInt(discountInput.replace(/\./g, ""), 10) || 0;
    const paymentFinalTotal = Math.max(0, paymentBaseTotal - rawDiscount);

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, "");
        if (!val) {
            setDiscountInput("");
            return;
        }
        const num = parseInt(val, 10);
        setDiscountInput(num.toLocaleString("vi-VN"));
    };

    const handleMethodChange = async (val: "cash" | "transfer") => {
        setMethod(val);
        if (val !== "transfer") {
            setShowQr(false);
            return;
        }
        if (paymentFinalTotal > 0) {
            await generateQr(paymentFinalTotal);
        }
    };

    const generateQr = async (amount: number) => {
        const targetBooking = booking.isGroup
            ? (booking.groupedItems || []).find((item: any) => item.status !== "cancelled") || booking.groupedItems?.[0]
            : booking;

        if (!targetBooking) {
            toast.error("Không tìm thấy ca đặt sân hợp lệ!");
            return;
        }

        try {
            setQrLoading(true);
            const token = localStorage.getItem("token");
            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
            
            const res = await fetch(`${API_URL}/bookings/payment/vietqr`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: targetBooking._id,
                    amount,
                    customer: {
                        name: targetBooking.customerInfo?.name || targetBooking.customerId?.name || "Khách hàng",
                        phone: targetBooking.customerInfo?.phone || targetBooking.customerId?.phone || "",
                        email: targetBooking.customerInfo?.email || targetBooking.customerId?.email || "",
                    },
                }),
            });

            const result = await res.json();
            if (!res.ok || !result?.success) {
                toast.error(result?.message || "Không tạo được mã QR! Vui lòng thử lại.");
                return;
            }

            const qr = result?.data?.qrImageBase64 as string | undefined;
            const bankName = result?.data?.bankName as string | undefined;
            const accountNo = result?.data?.accountNo as string | undefined;
            const accountName = result?.data?.accountName as string | undefined;

            if (qr) {
                setQrData({
                    image: qr,
                    amount,
                    bankName,
                    accountNo,
                    accountName,
                });
                setShowQr(true);
            } else {
                toast.error("Không nhận được mã QR từ hệ thống.");
            }
        } catch (err) {
            toast.error("Lỗi khi kết nối hệ thống QR!");
        } finally {
            setQrLoading(false);
        }
    };

    const handleConfirm = async () => {
        const targetBooking = booking.isGroup
            ? (booking.groupedItems || []).find((item: any) => item.status !== "cancelled") || booking.groupedItems?.[0]
            : booking;

        if (!targetBooking) {
            toast.error("Không tìm thấy ca đặt sân hợp lệ!");
            return;
        }

        try {
            setPaymentLoading(true);
            await api.post("/invoices", {
                bookingId: targetBooking._id,
                discount: rawDiscount,
                method,
                note: discountReason || "",
            });

            toast.success("💰 Thanh toán & tạo hóa đơn thành công!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Thanh toán thất bại!");
        } finally {
            setPaymentLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Tạo hóa đơn thanh toán
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn đặt: #{booking.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Customer Context Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/10 p-4 rounded-xl border border-border/60">
                        <div className="flex items-start gap-2.5">
                            <User className="text-muted-foreground mt-0.5" size={14} />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Khách hàng</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">
                                    {booking.customerInfo?.name || booking.customerId?.name || "Khách lẻ"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Calendar className="text-muted-foreground mt-0.5" size={14} />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ngày đá</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">
                                    {dayjs(booking.date).format("DD/MM/YYYY")}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <MapPin className="text-muted-foreground mt-0.5" size={14} />
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sân bóng</div>
                                <div className="text-xs font-semibold text-foreground mt-0.5">{booking.courtId?.name || "—"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Cost breakdown details */}
                    <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                        <div className="bg-muted/30 px-4 py-2 border-b border-border/60 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Chi tiết tính toán</span>
                            <span>Giá trị</span>
                        </div>
                        <div className="divide-y divide-border/40 text-xs">
                            <div className="flex justify-between items-center px-4 py-2.5 bg-card">
                                <span className="text-muted-foreground">Tiền sân</span>
                                <span className="font-semibold text-foreground">{formatVND(totalFieldAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2.5 bg-card">
                                <span className="text-muted-foreground">Tiền dịch vụ/thiết bị</span>
                                <span className="font-semibold text-foreground">{formatVND(totalEquipmentTotal)}</span>
                            </div>
                            {voucherDiscount > 0 && (
                                <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <span>Khuyến mãi {voucherCode ? `(${voucherCode})` : ""}</span>
                                    <span>-{formatVND(voucherDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-2.5 bg-muted/20 font-bold">
                                <span>Tổng tiền hóa đơn</span>
                                <span>{formatVND(originalTotal)}</span>
                            </div>
                            {depositPaid > 0 && (
                                <div className="flex justify-between items-center px-4 py-2.5 bg-card text-muted-foreground font-semibold">
                                    <span>Đã cọc trước</span>
                                    <span>-{formatVND(depositPaid)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-3 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                                <span>Số tiền còn lại</span>
                                <span>{formatVND(paymentBaseTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Inputs panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="discountInput" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Chiết khấu / Giảm giá (VND)
                            </Label>
                            <Input
                                id="discountInput"
                                type="text"
                                placeholder="0"
                                value={discountInput}
                                onChange={handleDiscountChange}
                                className="h-10 text-xs text-foreground bg-card border-border hover:border-indigo-400 focus:border-indigo-500 rounded-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="discountReason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Lý do giảm giá
                            </Label>
                            <Input
                                id="discountReason"
                                type="text"
                                placeholder="VD: Khách quen, giảm trừ giờ..."
                                value={discountReason}
                                onChange={(e) => setDiscountReason(e.target.value)}
                                className="h-10 text-xs text-foreground bg-card border-border hover:border-indigo-400 focus:border-indigo-500 rounded-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Phương thức thanh toán <span className="text-rose-500">*</span>
                            </Label>
                            <select
                                value={method}
                                onChange={(e) => handleMethodChange(e.target.value as any)}
                                className="w-full h-10 px-3 text-xs text-foreground bg-card border border-border rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="cash">💵 Tiền mặt</option>
                                <option value="transfer">🏦 Chuyển khoản ngân hàng</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="receivedAmount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Tiền khách đưa (Tiền mặt)
                            </Label>
                            <Input
                                id="receivedAmount"
                                type="text"
                                placeholder="VD: 500.000"
                                value={receivedAmount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setReceivedAmount(val ? parseInt(val, 10).toLocaleString("vi-VN") : "");
                                }}
                                className="h-10 text-xs text-foreground bg-card border-border hover:border-indigo-400 focus:border-indigo-500 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Bank Transfer QR section */}
                    {method === "transfer" && showQr && qrData && (
                        <div className="bg-muted/10 border border-border/80 rounded-xl p-5 flex flex-col items-center justify-center gap-4">
                            <div className="text-center">
                                <h5 className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5 uppercase">
                                    <QrCode size={14} className="text-indigo-600" /> Quét mã VietQR chuyển khoản
                                </h5>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Số tiền chuyển chính xác để hệ thống tự ghi nhận</p>
                            </div>
                            <div className="w-48 h-48 bg-white border rounded-xl p-2 shadow-inner flex items-center justify-center relative overflow-hidden">
                                {qrLoading ? (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-bold">Đang tải...</div>
                                ) : (
                                    <img src={qrData.image} alt="VietQR code" className="max-w-full max-h-full object-contain" />
                                )}
                            </div>
                            <div className="text-[11px] text-muted-foreground text-center space-y-0.5 font-semibold">
                                <p>Ngân hàng: <span className="text-foreground">{qrData.bankName}</span></p>
                                <p>Số tài khoản: <span className="text-foreground font-mono">{qrData.accountNo}</span></p>
                                <p>Chủ tài khoản: <span className="text-foreground uppercase">{qrData.accountName}</span></p>
                                <p className="text-xs font-black text-indigo-600 mt-2">Số tiền cần quét: {formatVND(qrData.amount)}</p>
                            </div>
                        </div>
                    )}

                    {/* Footer calculations & confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-4 border-t border-border/60">
                        <div className="bg-linear-to-r from-emerald-500/5 to-teal-500/5 p-3.5 rounded-xl border border-emerald-500/20 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tổng thực thu</span>
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{formatVND(paymentFinalTotal)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2.5">
                            <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                                Hủy bỏ
                            </Button>
                            <Button
                                disabled={paymentLoading}
                                onClick={handleConfirm}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-1.5"
                            >
                                {paymentLoading ? "Đang xử lý..." : "Xác nhận thanh toán"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import axios from "axios";
import {
    User,
    Phone,
    Mail,
    Calendar,
    Clock,
    MapPin,
    CreditCard,
    MessageSquare,
    Star,
    Hash,
    AlertTriangle,
    Eye,
    EyeOff,
} from "lucide-react";
import dayjs from "dayjs";

// Shadcn UI Imports
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import api from "@/common/utils/api";

interface Props {
    open: boolean;
    reviewId: string | null;
    onClose: () => void;
}

const ReviewAdminDetailModal: React.FC<Props> = ({
    open,
    reviewId,
    onClose,
}) => {
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState<any>(null);

    useEffect(() => {
        if (open && reviewId) {
            fetchDetail();
        }
    }, [open, reviewId]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/review/${reviewId}`);
            setReview(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const u = review?.userId;
    const b = review?.bookingId;
    const c = review?.courtId;
    const userExists = !!u;

    const courtTypeLabel = (type: string) => {
        switch (type) {
            case "indoor": return "Trong nhà";
            case "outdoor": return "Ngoài trời";
            case "vip": return "VIP";
            default: return type || "—";
        }
    };

    const isActive = review?.status === "active";

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                {loading || !review ? (
                    <div className="flex justify-center items-center py-20">
                        <Spin tip="Đang tải thông tin chi tiết..." />
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* ====== HEADER ====== */}
                        <div className="px-6 py-5 border-b border-border bg-muted/20 relative">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12 border border-border/80 bg-linear-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-xs">
                                    <AvatarFallback className="bg-transparent text-white text-base font-bold">
                                        {userExists ? (u.name || 'A').charAt(0).toUpperCase() : '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <DialogTitle className="text-base font-bold text-foreground">
                                        {userExists ? u.name : "Người dùng không tồn tại"}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star 
                                                    key={star} 
                                                    size={12} 
                                                    className={`${review.rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/20'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-bold bg-amber-400/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-sm">
                                            {review.rating}.0 / 5.0
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====== BODY ====== */}
                        <div className="p-6 space-y-6">
                            {/* Thông tin khách hàng */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                    Thông tin khách hàng
                                </h4>
                                {userExists ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InfoRow icon={<User size={13} />} label="Họ tên" value={u.name || '—'} />
                                        <InfoRow icon={<Phone size={13} />} label="Số điện thoại" value={u.phone || '—'} />
                                        <InfoRow icon={<Mail size={13} />} label="Email" value={u.email || '—'} className="sm:col-span-2" />
                                    </div>
                                ) : (
                                    <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
                                        <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                                        <div>
                                            <p className="font-bold text-sm">Người dùng không tồn tại</p>
                                            <p className="text-xs opacity-80">Tài khoản liên kết đã bị xóa khỏi hệ thống.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Thông tin đặt sân */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                    Thông tin đặt sân
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoRow 
                                        icon={<Hash size={13} />} 
                                        label="Mã đặt sân" 
                                        value={b?.code || '—'} 
                                        valueClass="text-blue-600 dark:text-blue-400 font-mono font-bold" 
                                    />
                                    <InfoRow 
                                        icon={<Calendar size={13} />} 
                                        label="Ngày đặt sân" 
                                        value={b?.date ? dayjs(b.date).format('DD/MM/YYYY') : '—'} 
                                    />
                                    <InfoRow 
                                        icon={<Clock size={13} />} 
                                        label="Khung giờ thuê" 
                                        value={b ? `${b.startTime} - ${b.endTime}` : '—'} 
                                    />
                                    <InfoRow 
                                        icon={<CreditCard size={13} />} 
                                        label="Tổng thanh toán" 
                                        value={b?.total ? `${b.total.toLocaleString('vi-VN')} ₫` : '—'} 
                                        valueClass="text-emerald-600 dark:text-emerald-400 font-bold" 
                                    />
                                </div>
                            </div>

                            {/* Thông tin sân */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                    Thông tin sân bóng
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoRow icon={<Star size={13} />} label="Tên sân" value={c?.name || '—'} />
                                    <InfoRow
                                        icon={<MapPin size={13} />}
                                        label="Môi trường"
                                        value={
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold border border-blue-500/20">
                                                {courtTypeLabel(c?.type)}
                                            </span>
                                        }
                                    />
                                    <InfoRow icon={<MapPin size={13} />} label="Địa điểm / Khu vực" value={c?.location || '—'} className="sm:col-span-2" />
                                </div>
                            </div>

                            {/* Nội dung đánh giá */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                    Ý kiến & nhận xét
                                </h4>
                                <div className="bg-muted/30 dark:bg-muted/10 border border-border/80 rounded-xl p-4">
                                    <p className="text-foreground text-sm leading-relaxed italic whitespace-pre-wrap">
                                        "{review.comment || 'Khách hàng không để lại nhận xét bằng lời.'}"
                                    </p>
                                </div>
                            </div>

                            {/* Footer Status Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/60">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">Trạng thái:</span>
                                    <Badge 
                                        variant="secondary" 
                                        className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-none shadow-none ${
                                            isActive 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        }`}
                                    >
                                        {isActive ? "✅ Hiển thị công khai" : "🚫 Đã ẩn"}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground font-semibold">
                                    <span>Tạo: {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                                    <span>Sửa: {dayjs(review.updatedAt).format('DD/MM/YYYY HH:mm')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

// Reusable info row component
const InfoRow = ({
    icon,
    label,
    value,
    className = "",
    valueClass = "",
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    className?: string;
    valueClass?: string;
}) => (
    <div className={`flex items-center gap-3 bg-muted/10 dark:bg-muted/5 rounded-xl p-3 border border-border/60 ${className}`}>
        <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center text-muted-foreground shrink-0 border border-border/80 shadow-2xs">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
            <div className={`text-xs font-semibold text-foreground mt-0.5 truncate ${valueClass}`}>
                {value}
            </div>
        </div>
    </div>
);

export default ReviewAdminDetailModal;

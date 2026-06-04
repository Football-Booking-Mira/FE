import React, { useEffect, useState } from "react";
import { Modal, Spin, Rate } from "antd";
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
} from "lucide-react";
import dayjs from "dayjs";

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
            const token = localStorage.getItem("token");

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const res = await axios.get(
                `${API_URL}/review/${reviewId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setReview(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

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

    const statusColor = review?.status === "active"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

    return (
        <Modal
            open={open}
            title={null}
            onCancel={onClose}
            footer={null}
            width={640}
            destroyOnHidden
            styles={{
                body: { padding: 0 },
                content: {
                    borderRadius: 24,
                    overflow: "hidden",
                    background: "transparent",
                },
            }}
            closable={false}
        >
            {loading || !review ? (
                <div className="flex justify-center items-center py-20 bg-white dark:bg-slate-900">
                    <Spin size="large" />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    {/* ====== HEADER ====== */}
                    <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 pb-8">
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-all backdrop-blur-sm z-30 cursor-pointer"
                        >
                            ✕
                        </button>

                        {/* Stars background */}
                        <div className="absolute top-4 left-4 opacity-10">
                            <Star size={80} />
                        </div>

                        <div className="relative z-10 flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-16 h-16 ${userExists ? 'bg-white/20' : 'bg-white/10'} backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-black text-2xl border border-white/20 shadow-lg`}>
                                {userExists ? (u.name || 'A').charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="text-white">
                                {userExists ? (
                                    <>
                                        <h3 className="font-black text-xl">{u.name || 'Ẩn danh'}</h3>
                                        <p className="text-white/70 text-sm font-medium">{u.email || ''}</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            Người dùng không tồn tại
                                        </h3>
                                        <p className="text-white/60 text-sm">Tài khoản đã bị xóa hoặc không còn tồn tại</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Rating preview */}
                        <div className="relative z-10 mt-4 flex items-center gap-3">
                            <Rate disabled value={review.rating} className="text-lg" style={{ color: '#fff' }} />
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-xl text-white font-black text-sm">
                                {review.rating}/5
                            </span>
                        </div>
                    </div>

                    {/* ====== BODY ====== */}
                    <div className="p-6 space-y-6">

                        {/* Thông tin khách hàng */}
                        <div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={12} /> Thông tin khách hàng
                            </h4>
                            {userExists ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoRow icon={<User size={14} />} label="Họ tên" value={u.name || '—'} />
                                    <InfoRow icon={<Phone size={14} />} label="Số điện thoại" value={u.phone || '—'} />
                                    <InfoRow icon={<Mail size={14} />} label="Email" value={u.email || '—'} className="sm:col-span-2" />
                                </div>
                            ) : (
                                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 rounded-xl flex items-center justify-center">
                                        <AlertTriangle size={18} className="text-rose-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">Người dùng không tồn tại</p>
                                        <p className="text-rose-500/70 dark:text-rose-400/60 text-xs">Tài khoản đã bị xóa khỏi hệ thống</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thông tin đặt sân */}
                        <div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Calendar size={12} /> Thông tin đặt sân
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoRow icon={<Hash size={14} />} label="Mã booking" value={b?.code || '—'} valueClass="text-blue-600 dark:text-blue-400 font-mono" />
                                <InfoRow icon={<Calendar size={14} />} label="Ngày đá" value={b?.date ? dayjs(b.date).format('DD/MM/YYYY') : '—'} />
                                <InfoRow icon={<Clock size={14} />} label="Thời gian" value={b ? `${b.startTime} - ${b.endTime}` : '—'} />
                                <InfoRow icon={<CreditCard size={14} />} label="Tổng tiền" value={b?.total ? `${b.total.toLocaleString('vi-VN')}đ` : '—'} valueClass="text-emerald-600 dark:text-emerald-400 font-bold" />
                            </div>
                        </div>

                        {/* Thông tin sân */}
                        <div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MapPin size={12} /> Thông tin sân
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoRow icon={<Star size={14} />} label="Tên sân" value={c?.name || '—'} />
                                <InfoRow
                                    icon={<MapPin size={14} />}
                                    label="Loại sân"
                                    value={
                                        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-500/20">
                                            {courtTypeLabel(c?.type)}
                                        </span>
                                    }
                                />
                                <InfoRow icon={<MapPin size={14} />} label="Địa điểm" value={c?.location || '—'} className="sm:col-span-2" />
                            </div>
                        </div>

                        {/* Nội dung đánh giá */}
                        <div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MessageSquare size={12} /> Nội dung đánh giá
                            </h4>
                            <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 rounded-2xl p-4">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                                    "{review.comment || 'Không có nhận xét'}"
                                </p>
                            </div>
                        </div>

                        {/* Footer info */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">Trạng thái:</span>
                                <span className={`px-3 py-1 text-xs font-black rounded-xl border ${statusColor}`}>
                                    {review.status === "active" ? "✅ Hiển thị" : "🚫 Đã ẩn"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
                                <span>Tạo: {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                                <span>Cập nhật: {dayjs(review.updatedAt).format('DD/MM/YYYY HH:mm')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
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
    <div className={`flex items-start gap-3 bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 border border-slate-100 dark:border-white/5 ${className}`}>
        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 truncate ${valueClass}`}>
                {value}
            </p>
        </div>
    </div>
);

export default ReviewAdminDetailModal;

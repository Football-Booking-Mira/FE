import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import axios from 'axios';
import {
    Star,
    MessageSquare,
    Eye,
    EyeOff,
    Search,
    User,
    Calendar,
    Filter,
    Phone,
    Clock,
    RefreshCw,
    SlidersHorizontal,
    FileText,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReviewAdminDetailModal from './components/ReviewAdminDetailModal';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import api from '@/common/utils/api';

const ReviewsAdmin = () => {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [search, setSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    // Display Status confirmation state
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [selectedReviewIdForStatus, setSelectedReviewIdForStatus] = useState<string | null>(null);
    const [targetStatus, setTargetStatus] = useState<'active' | 'hidden' | null>(null);

    const fetchReviews = async (page: number) => {
        try {
            setLoading(true);
            const res = await api.get(`/review/admin/list?page=${page}&limit=${pagination.limit}`);
            const data = res.data.data;
            const cleaned = (data.reviews || []).filter((r: any) => r?.bookingId);
            setReviews(cleaned);
            setPagination((prev) => ({ ...prev, page: data.pagination.page, total: data.pagination.total }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReviews(1); }, []);

    const updateStatus = async (id: string, status: 'active' | 'hidden') => {
        try {
            await api.patch(`/review/${id}/status`, { status });
            fetchReviews(pagination.page);
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = reviews.filter((r) => {
        const name = r.userId?.name?.toLowerCase() || '';
        const code = r.bookingId?.code?.toLowerCase() || '';
        const comment = r.comment?.toLowerCase() || '';
        const matchSearch = !search || name.includes(search.toLowerCase()) || code.includes(search.toLowerCase()) || comment.includes(search.toLowerCase());
        const matchRating = ratingFilter === 'all' || r.rating === ratingFilter;
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchRating && matchStatus;
    });

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—';
    const activeCount = reviews.filter(r => r.status === 'active').length;

    const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
    }));

    return (
        <TooltipProvider>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-background min-h-screen">
                {/* 1. Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div className="space-y-1">
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">BÌNH LUẬN & ĐÁNH GIÁ</h2>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            Theo dõi phản hồi, ý kiến đánh giá từ khách hàng đặt sân bóng.
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchReviews(pagination.page)} 
                        className="w-fit h-9 px-3 gap-1.5 text-xs border-border"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </Button>
                </div>

                {/* 2. Summary Dashboard */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Average Rating Card */}
                    <Card className="shadow-xs border-border/80 rounded-xl bg-card">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Đánh giá chung</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-foreground">{avgRating}</span>
                                <span className="text-xs text-muted-foreground">/ 5.0</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-1.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star 
                                        key={s} 
                                        size={14} 
                                        className={parseFloat(avgRating as string) >= s ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/20'} 
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Cards */}
                    <Card className="shadow-xs border-border/80 rounded-xl bg-card">
                        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tổng phản hồi</CardTitle>
                            <MessageSquare size={14} className="text-muted-foreground opacity-60" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-3xl font-black text-foreground">{pagination.total}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">Từ lịch sử đặt sân</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-border/80 rounded-xl bg-card">
                        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Đang hiển thị</CardTitle>
                            <Eye size={14} className="text-muted-foreground opacity-60" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-semibold">Công khai trên App</p>
                        </CardContent>
                    </Card>

                    {/* Distribution Card */}
                    <Card className="shadow-xs border-border/80 rounded-xl bg-card col-span-2 lg:col-span-1">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phân bổ điểm sao</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 space-y-1.5">
                            {ratingDistribution.map(({ star, pct }) => (
                                <div key={star} className="flex items-center gap-2 text-xs">
                                    <div className="flex items-center gap-0.5 w-6 text-muted-foreground font-semibold">
                                        {star} <Star size={10} className="fill-amber-400 text-amber-400" />
                                    </div>
                                    <Progress value={pct} className="h-1.5 flex-1 bg-muted [&>div]:bg-emerald-600" />
                                    <span className="text-[10px] text-muted-foreground font-semibold w-6 text-right">{pct}%</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4">
                    {/* Search and general controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative w-full md:w-80">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text" 
                                placeholder="Tìm kiếm tên, mã đơn, nội dung..."
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 h-10 border border-border rounded-lg text-sm bg-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-all"
                            />
                        </div>

                        {/* Swipeable Scrollbar filter container for mobile responsiveness */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none whitespace-nowrap">
                            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/20 shrink-0">
                                <Filter size={13} className="text-muted-foreground ml-2 mr-1" />
                                {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
                                    <button 
                                        key={r} 
                                        onClick={() => setRatingFilter(r)}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${ratingFilter === r ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {r === 'all' ? 'Tất cả' : <>{r} <Star size={10} className={ratingFilter === r ? 'fill-amber-400 text-amber-400' : 'fill-muted-foreground text-amber-400/30'} /></>}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center border border-border rounded-lg p-1 bg-muted/20 shrink-0">
                                <SlidersHorizontal size={13} className="text-muted-foreground ml-2 mr-1" />
                                {(['all', 'active', 'hidden'] as const).map((s) => (
                                    <button 
                                        key={s} 
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {s === 'all' ? 'Tất cả' : s === 'active' ? 'Hiển thị' : 'Đã ẩn'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Reviews List (Mobile-First Layout) */}
                {loading ? (
                    <div className="flex justify-center py-20"><Spin tip="Đang tải danh sách bình luận..." /></div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((record) => {
                            const u = record.userId;
                            const b = record.bookingId;
                            const isActive = record.status === 'active';
                            const initial = u ? (u.name || 'A').charAt(0).toUpperCase() : '?';

                            return (
                                <Card 
                                    key={record._id} 
                                    className={`shadow-xs border-border/70 rounded-xl overflow-hidden hover:shadow-xs transition-all hover:border-border ${
                                        !isActive ? 'bg-muted/10 opacity-75' : 'bg-card'
                                    }`}
                                >
                                    {/* Card Container */}
                                    <div className="p-4 md:p-6 space-y-4">
                                        {/* Row 1: Profile and Stars */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10 border border-border/80 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-xs">
                                                    <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                                                        {initial}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-foreground text-sm leading-tight">
                                                        {u ? (u.name || 'Ẩn danh') : <span className="italic text-destructive text-xs">Người dùng không tồn tại</span>}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star 
                                                                    key={star} 
                                                                    size={12} 
                                                                    className={`${record.rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/20'}`} 
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">•</span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                                            {record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY') : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <Badge 
                                                variant="secondary" 
                                                className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border-none shadow-none ${
                                                    isActive 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                }`}
                                            >
                                                {isActive ? 'Công khai' : 'Đã ẩn'}
                                            </Badge>
                                        </div>

                                        {/* Row 2: Comment Content */}
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground leading-relaxed break-words pl-1.5 border-l-2 border-emerald-500/20">
                                                {record.comment || <span className="italic text-muted-foreground">Không có nội dung nhận xét</span>}
                                            </p>
                                        </div>

                                        {/* Row 3: Metadata with Minimalist Icons */}
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-muted-foreground border-t border-border/40">
                                            {u?.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={11} className="text-muted-foreground opacity-70" />
                                                    <span className="font-semibold text-foreground/80">{u.phone}</span>
                                                </span>
                                            )}
                                            {b?.code && (
                                                <span className="flex items-center gap-1">
                                                    <FileText size={11} className="text-muted-foreground opacity-70" />
                                                    <span 
                                                        onClick={() => { setSelectedReviewId(record._id); setDetailOpen(true); }}
                                                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                    >
                                                        #{b.code}
                                                    </span>
                                                </span>
                                            )}
                                            {b?.startTime && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} className="text-muted-foreground opacity-70" />
                                                    <span>{b.startTime} – {b.endTime}</span>
                                                </span>
                                            )}
                                            {b?.date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={11} className="text-muted-foreground opacity-70" />
                                                    <span>{dayjs(b.date).format('DD/MM/YYYY')}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 4: Action Buttons (Bottom Bar Layout) */}
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => { setSelectedReviewId(record._id); setDetailOpen(true); }}
                                                className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                                            >
                                                <Eye size={13} className="mr-1" />
                                                Chi tiết
                                            </Button>

                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => {
                                                    setSelectedReviewIdForStatus(record._id);
                                                    setTargetStatus(isActive ? 'hidden' : 'active');
                                                    setStatusConfirmOpen(true);
                                                }}
                                                className={`text-xs h-8 px-3 font-semibold ${
                                                    isActive 
                                                        ? "text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                                                        : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                }`}
                                            >
                                                {isActive ? (
                                                    <>
                                                        <EyeOff size={13} className="mr-1" />
                                                        Ẩn bình luận
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye size={13} className="mr-1" />
                                                        Hiện bình luận
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

                        {filtered.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-dashed rounded-xl">
                                <MessageSquare size={40} className="mb-3 opacity-20" />
                                <p className="font-semibold text-sm">Không tìm thấy đánh giá nào trùng khớp</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-center gap-1.5 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchReviews(pagination.page - 1)}
                            className="h-9 text-xs gap-1 border-border"
                        >
                            Trước
                        </Button>
                        
                        {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1).map((p) => (
                            <Button
                                key={p}
                                variant={pagination.page === p ? "default" : "outline"}
                                size="icon"
                                onClick={() => fetchReviews(p)}
                                className={`w-9 h-9 text-xs font-bold ${
                                    pagination.page === p 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white border-emerald-600' 
                                        : 'border-border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {p}
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                            onClick={() => fetchReviews(pagination.page + 1)}
                            className="h-9 text-xs gap-1 border-border"
                        >
                            Sau
                        </Button>
                    </div>
                )}

                <ReviewAdminDetailModal
                    open={detailOpen}
                    reviewId={selectedReviewId}
                    onClose={() => setDetailOpen(false)}
                />

                <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
                    <AlertDialogContent className="border border-border/80 rounded-2xl overflow-hidden shadow-xl sm:max-w-md bg-card p-6">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-base font-bold text-foreground">
                                {targetStatus === 'hidden' ? 'Ẩn bình luận này?' : 'Hiển thị bình luận này?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                {targetStatus === 'hidden' 
                                    ? 'Bình luận này sẽ bị gỡ bỏ khỏi giao diện hiển thị của khách hàng. Bạn vẫn có thể khôi phục lại hiển thị sau.' 
                                    : 'Bình luận sẽ được công khai trở lại trên trang chi tiết sân để tất cả khách hàng cùng theo dõi.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="mt-5 flex flex-row items-center justify-end gap-2">
                            <AlertDialogCancel asChild>
                                <Button variant="outline" className="h-9 px-4 text-xs font-semibold border-border">Hủy bỏ</Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button 
                                    onClick={async () => {
                                        if (selectedReviewIdForStatus && targetStatus) {
                                            await updateStatus(selectedReviewIdForStatus, targetStatus);
                                        }
                                        setStatusConfirmOpen(false);
                                    }} 
                                    className={`h-9 px-4 text-xs font-semibold text-white border-none shadow-xs transition-colors ${
                                        targetStatus === 'hidden' 
                                            ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800' 
                                            : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800'
                                    }`}
                                >
                                    Xác nhận
                                </Button>
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
};

export default ReviewsAdmin;

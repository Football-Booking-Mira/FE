import { useEffect, useState } from 'react';
import { Rate, Spin } from 'antd';
import axios from 'axios';
import {
    Star,
    MessageSquare,
    Eye,
    EyeOff,
    Search,
    User,
    Calendar,
    BarChart3,
    Filter,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReviewAdminDetailModal from './components/ReviewAdminDetailModal';

const ReviewsAdmin = () => {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [search, setSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

    const token = localStorage.getItem('token');
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    const fetchReviews = async (page: number) => {
        try {
            setLoading(true);
            const res = await axios.get(
                `http://localhost:3000/api/review/admin/list?page=${page}&limit=${pagination.limit}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
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
        await axios.patch(
            `http://localhost:3000/api/review/${id}/status`,
            { status },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchReviews(pagination.page);
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

    const STAR_COLORS: Record<number, string> = {
        5: 'from-emerald-400 to-emerald-600',
        4: 'from-teal-400 to-teal-600',
        3: 'from-amber-400 to-amber-600',
        2: 'from-orange-400 to-orange-600',
        1: 'from-rose-400 to-rose-600',
    };

    return (
        <div className="px-4 pb-12 space-y-8 pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic">
                        <div className="p-3.5 bg-linear-to-br from-amber-500 to-orange-600 rounded-[20px] shadow-2xl shadow-amber-500/40 -rotate-3 flex items-center justify-center border border-white/20">
                            <Star size={28} className="text-white" />
                        </div>
                        <span className="relative">
                            BÌNH LUẬN & ĐÁNH GIÁ
                            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-amber-500/30 rounded-full" />
                        </span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm">
                        <span className="flex h-2.5 w-2.5 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        Quản lý phản hồi và đánh giá từ khách hàng
                    </p>
                </div>
            </div>

            {/* Stats + Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI Cards */}
                <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                    <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 p-4"><Star size={80} /></div>
                        <div className="text-[10px] font-black uppercase opacity-60 mb-1">Đánh giá trung bình</div>
                        <div className="text-5xl font-black">{avgRating}</div>
                        <div className="flex mt-2">
                            {[1,2,3,4,5].map(s => (
                                <Star key={s} size={16} className={`${parseFloat(avgRating as string) >= s ? 'fill-white' : 'opacity-30'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl w-fit mb-3"><MessageSquare size={18} className="text-blue-500" /></div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{pagination.total}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Tổng đánh giá</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl w-fit mb-3"><Eye size={18} className="text-emerald-500" /></div>
                            <div className="text-2xl font-black text-emerald-500">{activeCount}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Đang hiện</div>
                        </div>
                    </div>
                </div>

                {/* Rating Distribution */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-2 mb-6">
                        <BarChart3 size={16} className="text-amber-500" /> Phân phối sao
                    </h3>
                    <div className="space-y-3">
                        {ratingDistribution.map(({ star, count, pct }) => (
                            <div key={star} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-12 shrink-0">
                                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">{star}</span>
                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                </div>
                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full bg-linear-to-r ${STAR_COLORS[star]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-400 w-12 text-right">{count} ({pct}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex-1 min-w-48 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    <input
                        type="text" placeholder="Tìm kiếm tên, mã đơn, nội dung..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl font-semibold text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    />
                </div>

                {/* Rating filter pills */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400 shrink-0" />
                    {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
                        <button key={r} onClick={() => setRatingFilter(r)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${ratingFilter === r ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                        >
                            {r === 'all' ? 'Tất cả' : <>{r} <Star size={10} className={ratingFilter === r ? 'fill-white' : 'fill-amber-400 text-amber-400'} /></>}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-2xl p-1 gap-1">
                    {(['all', 'active', 'hidden'] as const).map((s) => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {s === 'all' ? 'Tất cả' : s === 'active' ? 'Hiển thị' : 'Đã ẩn'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Review Cards */}
            {loading ? (
                <div className="flex justify-center py-20"><Spin size="large" /></div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((record) => {
                        const u = record.userId;
                        const b = record.bookingId;
                        const isActive = record.status === 'active';

                        return (
                            <div key={record._id} className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-all ${!isActive ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 ${u ? 'bg-linear-to-br from-blue-500 to-indigo-600' : 'bg-linear-to-br from-slate-400 to-slate-500'} rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ${u ? 'shadow-blue-500/20' : 'shadow-slate-400/20'} shrink-0`}>
                                            {u ? (u.name || 'A').charAt(0).toUpperCase() : '?'}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center flex-wrap gap-3 mb-2">
                                                {u ? (
                                                    <span className="font-black text-slate-800 dark:text-white">{u.name || 'Ẩn danh'}</span>
                                                ) : (
                                                    <span className="font-semibold text-rose-500 dark:text-rose-400 italic text-sm">Người dùng không tồn tại</span>
                                                )}
                                                <Rate disabled value={record.rating} className="text-sm" />
                                                <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-lg uppercase ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                    {isActive ? 'Hiển thị' : 'Đã ẩn'}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2 mb-3">
                                                {record.comment || <span className="italic text-slate-300">Không có nội dung</span>}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                                                {u?.phone && <span className="flex items-center gap-1"><User size={11} /> {u.phone}</span>}
                                                {!u && <span className="flex items-center gap-1 text-rose-400"><User size={11} /> Đã xóa tài khoản</span>}
                                                {b?.code && <span className="flex items-center gap-1 text-blue-500">#{b.code}</span>}
                                                {b?.startTime && <span className="flex items-center gap-1"><Calendar size={11} />{b.startTime}–{b.endTime}</span>}
                                                {record.createdAt && <span>{dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => { setSelectedReviewId(record._id); setDetailOpen(true); }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all border border-slate-100 dark:border-white/5"
                                        >
                                            <Eye size={14} /> Chi tiết
                                        </button>
                                        <button
                                            onClick={() => updateStatus(record._id, isActive ? 'hidden' : 'active')}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all border ${
                                                isActive
                                                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border-rose-100 dark:border-rose-500/20'
                                                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border-emerald-100 dark:border-emerald-500/20'
                                            }`}
                                        >
                                            {isActive ? <><EyeOff size={14} /> Ẩn</> : <><Eye size={14} /> Hiện</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
                            <Star size={48} className="mb-4 opacity-30" />
                            <p className="font-bold">Không có đánh giá nào</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => fetchReviews(p)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${pagination.page === p ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-white/10 hover:border-amber-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            <ReviewAdminDetailModal
                open={detailOpen}
                reviewId={selectedReviewId}
                onClose={() => setDetailOpen(false)}
            />
        </div>
    );
};

export default ReviewsAdmin;

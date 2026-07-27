import { useEffect, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Users,
    Trophy,
    ArrowUpRight,
    Clock,
    LayoutDashboard,
    Calendar,
    Zap,
    TrendingUp,
    PieChart as PieChartIcon,
    Flame,
    CheckCircle2,
    AlertCircle,
    Activity,
    ShieldCheck
} from 'lucide-react';
import {
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
    Pie,
    PieChart,
    Area,
    AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

interface BookingStats {
    revenueOverview: {
        daily: number;
        totalPaid: number;
        totalUnpaid: number;
    };
    bookingsOverview: {
        today: number;
        week: number;
        month: number;
    };
    courtsStats: { name: string; count: number }[];
    customerStats: {
        total: number;
        newThisMonth: number;
        topList: { user: any; count: number }[];
    };
    peakHours: { time: string; count: number }[];
    courtStatus: {
        inUse: number;
        reserved: number;
        available: number;
    };
    revenueTrend: { date: string; revenue: number }[];
    totalRevenue: number;
}

const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return '0';
    return Number(value).toLocaleString('vi-VN');
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function BookingStatsReportPage() {
    const [stats, setStats] = useState<BookingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
    const [periodOffset, setPeriodOffset] = useState(0);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                period: selectedPeriod,
                offset: periodOffset.toString(),
            });
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const res = await fetch(
                `${API_URL}/reports/public/booking-stats?${params}`
            );
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Lỗi khi lấy báo cáo');
            setStats(json.data);
        } catch (e: any) {
            console.error('Fetch stats error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();

        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket'],
            withCredentials: true,
        });

        const handleUpdate = () => {
            fetchStats();
        };

        socketInstance.on('booking_global_updated', handleUpdate);
        socketInstance.on('booking_updated', handleUpdate);

        return () => {
            socketInstance.off('booking_global_updated', handleUpdate);
            socketInstance.off('booking_updated', handleUpdate);
            socketInstance.disconnect();
        };
    }, [selectedPeriod, periodOffset]);

    const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'year') => {
        setSelectedPeriod(period);
        setPeriodOffset(0);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        setPeriodOffset((prev) => (direction === 'prev' ? prev - 1 : prev + 1));
    };

    const getPeriodLabel = () => {
        const now = new Date();
        if (selectedPeriod === 'year') return `Năm ${now.getFullYear() + periodOffset}`;
        if (selectedPeriod === 'day') {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + periodOffset);
            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        }
        if (selectedPeriod === 'month') {
            const d = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
            return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
        }
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + periodOffset * 7);
        const day = d.getDay() || 7;
        const start = new Date(d);
        start.setDate(d.getDate() - day + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `Từ ${start.getDate()}/${start.getMonth() + 1} đến ${end.getDate()}/${end.getMonth() + 1}`;
    };

    if (loading && !stats)
        return (
            <div className='flex items-center justify-center min-h-[500px]'>
                <div className='relative flex flex-col items-center gap-3'>
                    <div className='animate-spin rounded-full h-14 w-14 border-4 border-emerald-500/20 border-t-emerald-500'></div>
                    <span className='text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase animate-pulse'>
                        Đang tải dữ liệu MIRA Football...
                    </span>
                </div>
            </div>
        );

    const pieData = [
        { name: 'Đang dùng', value: stats?.courtStatus?.inUse || 0 },
        { name: 'Đã đặt', value: stats?.courtStatus?.reserved || 0 },
        { name: 'Còn trống', value: stats?.courtStatus?.available || 0 },
    ];

    const totalCourts = (stats?.courtStatus?.inUse || 0) + (stats?.courtStatus?.reserved || 0) + (stats?.courtStatus?.available || 0);
    const occupancyRate = totalCourts > 0 
        ? Math.round((((stats?.courtStatus?.inUse || 0) + (stats?.courtStatus?.reserved || 0)) / totalCourts) * 100) 
        : 0;

    return (
        <div className='space-y-6 sm:space-y-8 p-1 sm:p-2 animate-in fade-in duration-700'>
            {/* Header Hero Section */}
            <div className='flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card dark:bg-slate-900/60 p-5 sm:p-7 rounded-3xl border border-border/80 shadow-xs relative overflow-hidden'>
                <div className='absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none'></div>

                <div className='relative z-10 space-y-1.5'>
                    <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold uppercase tracking-widest'>
                        <ShieldCheck size={13} />
                        Báo cáo hiệu suất MIRA Football
                    </div>
                    <h1 className='text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3'>
                        <span>Thống kê & Phân tích</span>
                    </h1>
                    <p className='text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
                        Cập nhật theo thời gian thực — Dữ liệu kinh doanh và vận hành sân bóng
                    </p>
                </div>

                {/* Period Controls */}
                <div className='flex flex-wrap sm:flex-nowrap items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-border/60 relative z-10 w-full xl:w-auto justify-between sm:justify-start'>
                    <div className='flex bg-card p-1 rounded-xl shadow-xs border border-border/50'>
                        {(['day', 'week', 'month', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePeriodChange(p)}
                                className={`px-3.5 sm:px-5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    selectedPeriod === p
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                {p === 'day'
                                    ? 'Ngày'
                                    : p === 'week'
                                      ? 'Tuần'
                                      : p === 'month'
                                        ? 'Tháng'
                                        : 'Năm'}
                            </button>
                        ))}
                    </div>
                    <div className='hidden sm:block h-6 w-px bg-border/80 mx-1'></div>
                    <div className='flex items-center gap-2 sm:gap-3'>
                        <button
                            onClick={() => handleNavigate('prev')}
                            className='p-2 bg-card hover:bg-emerald-500/10 hover:text-emerald-600 text-muted-foreground border border-border/60 rounded-xl shadow-xs transition-all'
                            title="Kỳ trước"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className='flex flex-col items-center min-w-[110px] sm:min-w-[140px]'>
                            <span className='text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest'>
                                {selectedPeriod === 'week' ? 'Giai đoạn' : 'Thời gian'}
                            </span>
                            <span className='text-xs sm:text-sm font-extrabold text-foreground truncate'>
                                {getPeriodLabel()}
                            </span>
                        </div>
                        <button
                            onClick={() => handleNavigate('next')}
                            className='p-2 bg-card hover:bg-emerald-500/10 hover:text-emerald-600 text-muted-foreground border border-border/60 rounded-xl shadow-xs transition-all'
                            title="Kỳ tiếp"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 1: KPI Stat Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
                {/* 1. Today Revenue */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className='group bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-md shadow-emerald-500/10 relative overflow-hidden cursor-default border border-emerald-500/30'
                >
                    <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none'>
                        <DollarSign size={80} />
                    </div>
                    <div className='relative z-10'>
                        <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center gap-2'>
                                <div className='p-2 bg-white/20 rounded-xl backdrop-blur-md'>
                                    <TrendingUp size={16} />
                                </div>
                                <span className='text-emerald-100 text-[10px] font-black uppercase tracking-widest'>
                                    Doanh thu Hôm nay
                                </span>
                            </div>
                        </div>
                        <h3 className='text-3xl font-black mb-1.5 tracking-tight'>
                            {formatCurrency(stats?.revenueOverview?.daily)}{' '}
                            <span className='text-xl font-bold'>đ</span>
                        </h3>
                        <p className='text-emerald-100/80 text-xs font-medium flex items-center gap-1'>
                            <ArrowUpRight size={14} className="text-emerald-200" />
                            +12% so với hôm qua
                        </p>
                    </div>
                </motion.div>

                {/* 2. Total Period Revenue */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className='group bg-linear-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 rounded-3xl text-white shadow-md shadow-indigo-500/10 relative overflow-hidden cursor-default border border-indigo-500/30'
                >
                    <div className='absolute bottom-0 right-0 p-4 opacity-10 group-hover:-translate-y-2 transition-transform pointer-events-none'>
                        <Zap size={80} />
                    </div>
                    <div className='relative z-10'>
                        <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center gap-2'>
                                <div className='p-2 bg-white/20 rounded-xl backdrop-blur-md'>
                                    <Zap size={16} className='text-amber-300' />
                                </div>
                                <span className='text-indigo-100 text-[10px] font-black uppercase tracking-widest'>
                                    Tổng cộng kỳ này
                                </span>
                            </div>
                        </div>
                        <h3 className='text-3xl font-black mb-1.5 tracking-tight'>
                            {formatCurrency(stats?.totalRevenue)}{' '}
                            <span className='text-xl text-indigo-100 font-bold'>đ</span>
                        </h3>
                        <div className='flex items-center gap-2 mt-1'>
                            <span className='text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider'>
                                ⚡ TÍCH CỰC
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Total Paid */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className='bg-card p-6 rounded-3xl border border-border/80 shadow-xs relative overflow-hidden'
                >
                    <div className='flex items-center justify-between mb-4'>
                        <div className='p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl'>
                            <CheckCircle2 size={18} />
                        </div>
                        <span className='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
                            Đã thanh toán
                        </span>
                    </div>
                    <h3 className='text-2xl font-black text-foreground tracking-tight'>
                        {formatCurrency(stats?.revenueOverview?.totalPaid)}{' '}
                        <span className='text-base font-bold text-emerald-600 dark:text-emerald-400'>đ</span>
                    </h3>
                    <div className='w-full bg-muted h-2 rounded-full mt-4 overflow-hidden'>
                        <div
                            className='bg-emerald-500 h-full rounded-full transition-all duration-500'
                            style={{
                                width: `${stats?.revenueOverview ? Math.min(100, Math.round((stats.revenueOverview.totalPaid / ((stats.revenueOverview.totalPaid + stats.revenueOverview.totalUnpaid) || 1)) * 100)) : 0}%`,
                            }}
                        ></div>
                    </div>
                </motion.div>

                {/* 4. Total Unpaid */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className='bg-card p-6 rounded-3xl border border-rose-500/30 shadow-xs relative overflow-hidden'
                >
                    <div className='flex items-center justify-between mb-4'>
                        <div className='p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl'>
                            <AlertCircle size={18} />
                        </div>
                        <span className='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
                            Chưa thanh toán
                        </span>
                    </div>
                    <h3 className='text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight'>
                        {formatCurrency(stats?.revenueOverview?.totalUnpaid)}{' '}
                        <span className='text-base font-bold'>đ</span>
                    </h3>
                    <div className='mt-4 flex items-center gap-1.5'>
                        <Clock size={12} className="text-amber-500 shrink-0" />
                        <span className='text-[10px] font-bold text-muted-foreground italic'>
                            Cần nhắc nhở thu hồi công nợ
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Section 2: Charts Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
                {/* Revenue Trend Area Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='lg:col-span-8 bg-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-xs'
                >
                    <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8'>
                        <div>
                            <h3 className='text-lg sm:text-xl text-foreground font-black flex items-center gap-2.5'>
                                <TrendingUp className='text-emerald-500' size={22} />
                                Phân tích Xu hướng Doanh thu
                            </h3>
                            <p className='text-muted-foreground text-xs font-medium mt-1'>
                                Biến động doanh thu theo mốc thời gian kinh doanh
                            </p>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20'>
                                <div className='w-2.5 h-2.5 rounded-full bg-emerald-500'></div>
                                <span className='text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
                                    Doanh thu (đ)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='h-[320px] sm:h-[360px] w-full'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <AreaChart data={stats?.revenueTrend}>
                                <defs>
                                    <linearGradient id='colorRev' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='5%' stopColor='#10b981' stopOpacity={0.25} />
                                        <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray='3 3'
                                    strokeOpacity={0.1}
                                />
                                <XAxis
                                    dataKey='date'
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                    tickFormatter={(v) =>
                                        v >= 1000000
                                            ? `${(v / 1000000).toFixed(1)}Tr`
                                            : v.toLocaleString()
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                        padding: '12px 16px',
                                        backgroundColor: '#0f172a',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ fontWeight: 800, color: '#34d399' }}
                                    labelStyle={{
                                        fontWeight: 900,
                                        marginBottom: '4px',
                                        color: '#94a3b8',
                                    }}
                                    formatter={(v: any) => [`${formatCurrency(v)} đ`, 'Doanh thu']}
                                />
                                <Area
                                    type='monotone'
                                    dataKey='revenue'
                                    stroke='#10b981'
                                    strokeWidth={3.5}
                                    fillOpacity={1}
                                    fill='url(#colorRev)'
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Court Occupancy Status Donut */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className='lg:col-span-4 bg-card border border-border/80 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col justify-between relative overflow-hidden'
                >
                    <div className='absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-5 pointer-events-none text-foreground'>
                        <PieChartIcon size={200} />
                    </div>

                    <h3 className='text-lg sm:text-xl font-black mb-6 relative z-10 flex items-center gap-2 text-foreground'>
                        <Activity className='text-emerald-500' size={20} />
                        Vận hành Sân Hiện tại
                    </h3>

                    <div className='flex-1 min-h-[220px] relative z-10 my-2'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx='50%'
                                    cy='50%'
                                    innerRadius={68}
                                    outerRadius={92}
                                    paddingAngle={6}
                                    dataKey='value'
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke='rgba(0,0,0,0)'
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: '#fff',
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none'>
                            <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
                                HIỆU SUẤT
                            </p>
                            <p className='text-3xl font-black text-emerald-600 dark:text-emerald-400'>
                                {occupancyRate}%
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5 mt-4 relative z-10'>
                        {pieData.map((item, idx) => (
                            <div
                                key={idx}
                                className='flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/60 transition-all'
                            >
                                <div className='flex items-center gap-2.5'>
                                    <div
                                        className='w-3 h-3 rounded-full shadow-xs'
                                        style={{ backgroundColor: COLORS[idx] }}
                                    ></div>
                                    <span className='text-xs font-bold text-foreground'>
                                        {item.name}
                                    </span>
                                </div>
                                <span className='text-xs font-black text-foreground bg-card px-2.5 py-0.5 rounded-md border border-border/50'>
                                    {item.value} sân
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Section 3: Rankings & Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {/* Bookings Count Overview */}
                <motion.div
                    whileHover={{ y: -3 }}
                    className='bg-card p-6 sm:p-7 rounded-3xl border border-border/80 shadow-xs'
                >
                    <div className='flex justify-between items-center mb-6'>
                        <h3 className='text-base font-black text-foreground flex items-center gap-2.5'>
                            <div className='p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl'>
                                <Calendar size={18} />
                            </div>
                            Lượt đặt sân bóng
                        </h3>
                        <div className='p-2 bg-muted rounded-full'>
                            <ArrowUpRight size={14} className='text-muted-foreground' />
                        </div>
                    </div>

                    <div className='space-y-3.5'>
                        <div className='flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/30 transition-all'>
                            <div className='flex items-center gap-3'>
                                <div className='w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs'>
                                    1
                                </div>
                                <span className='font-bold text-xs text-foreground'>
                                    Hôm nay
                                </span>
                            </div>
                            <span className='text-2xl font-black text-indigo-600 dark:text-indigo-400'>
                                {stats?.bookingsOverview?.today || 0} <span className="text-xs font-bold">đơn</span>
                            </span>
                        </div>
                        <div className='flex justify-between items-center p-4 bg-teal-500/5 rounded-2xl border border-teal-500/10 hover:border-teal-500/30 transition-all'>
                            <div className='flex items-center gap-3'>
                                <div className='w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs'>
                                    7
                                </div>
                                <span className='font-bold text-xs text-foreground'>
                                    Tuần này
                                </span>
                            </div>
                            <span className='text-2xl font-black text-teal-600 dark:text-teal-400'>
                                {stats?.bookingsOverview?.week || 0} <span className="text-xs font-bold">đơn</span>
                            </span>
                        </div>
                        <div className='flex justify-between items-center p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 hover:border-amber-500/30 transition-all'>
                            <div className='flex items-center gap-3'>
                                <div className='w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm shadow-xs'>
                                    30
                                </div>
                                <span className='font-bold text-xs text-foreground'>
                                    Tháng này
                                </span>
                            </div>
                            <span className='text-2xl font-black text-amber-600 dark:text-amber-400'>
                                {stats?.bookingsOverview?.month || 0} <span className="text-xs font-bold">đơn</span>
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Pitch Leaderboard */}
                <motion.div
                    whileHover={{ y: -3 }}
                    className='bg-card p-6 sm:p-7 rounded-3xl border border-border/80 shadow-xs'
                >
                    <div className='flex justify-between items-center mb-6'>
                        <h3 className='text-base font-black text-foreground flex items-center gap-2.5'>
                            <div className='p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl'>
                                <Trophy size={18} />
                            </div>
                            Bảng xếp hạng Sân Hot
                        </h3>
                    </div>

                    <div className='space-y-4'>
                        {stats?.courtsStats?.slice(0, 5).map((c, i) => (
                            <div key={i} className='group'>
                                <div className='flex justify-between mb-1.5 items-end'>
                                    <div className='flex items-center gap-2.5'>
                                        <div
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black ${i === 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted text-muted-foreground'}`}
                                        >
                                            {i === 0 ? '👑' : i + 1}
                                        </div>
                                        <span className='text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors'>
                                            {c.name}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <span className='text-xs font-black text-foreground'>
                                            {c.count}
                                        </span>
                                        <span className='text-[10px] font-bold text-muted-foreground uppercase'>
                                            lượt
                                        </span>
                                    </div>
                                </div>
                                <div className='w-full h-2 bg-muted rounded-full overflow-hidden'>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${(c.count / (stats?.courtsStats?.[0]?.count || 1)) * 100}%`,
                                        }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-emerald-500/80 group-hover:bg-amber-500'}`}
                                    ></motion.div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* VIP Customer Loyalty */}
                <motion.div
                    whileHover={{ y: -3 }}
                    className='bg-card p-6 sm:p-7 rounded-3xl border border-border/80 shadow-xs md:col-span-2 lg:col-span-1'
                >
                    <div className='flex justify-between items-center mb-6'>
                        <h3 className='text-base font-black text-foreground flex items-center gap-2.5'>
                            <div className='p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl'>
                                <Users size={18} />
                            </div>
                            Khách hàng thân thiết
                        </h3>
                    </div>

                    <div className='flex items-center justify-between mb-6 p-2 bg-muted/40 rounded-2xl border border-border/50'>
                        <div className='flex-1 text-center p-2'>
                            <p className='text-[10px] font-black text-muted-foreground uppercase tracking-wider'>
                                Tổng khách
                            </p>
                            <p className='text-xl font-black text-foreground'>
                                {stats?.customerStats?.total || 0}
                            </p>
                        </div>
                        <div className='w-px h-7 bg-border/80'></div>
                        <div className='flex-1 text-center p-2'>
                            <p className='text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
                                Tháng mới
                            </p>
                            <p className='text-xl font-black text-emerald-600 dark:text-emerald-400'>
                                +{stats?.customerStats?.newThisMonth || 0}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-3'>
                        {stats?.customerStats?.topList?.slice(0, 3).map((item, i) => (
                            <div
                                key={i}
                                className='flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/60'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='relative'>
                                        <div className='w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs'>
                                            {item.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        {i === 0 && (
                                            <div className='absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-card flex items-center justify-center text-[8px]'>
                                                👑
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className='text-xs font-bold text-foreground truncate max-w-[110px]'>
                                            {item.user?.name || 'Khách hàng'}
                                        </p>
                                        <p className='text-[10px] text-muted-foreground font-mono truncate'>
                                            {item.user?.phone || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <p className='text-sm font-black text-emerald-600 dark:text-emerald-400'>
                                        {item.count} <span className="text-[10px] font-semibold text-muted-foreground">đơn</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Section 4: Hot Peak Hours Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-xs'
            >
                <div className='flex justify-between items-center mb-8'>
                    <div>
                        <h3 className='text-lg sm:text-xl font-black text-foreground flex items-center gap-2.5'>
                            <div className='p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl'>
                                <Clock size={20} />
                            </div>
                            Khung giờ Vàng (Peak Hours Analytics)
                        </h3>
                        <p className='text-muted-foreground text-xs font-medium mt-1'>
                            Tần suất và mật độ đặt sân theo từng khung giờ trong ngày
                        </p>
                    </div>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                    {(stats?.peakHours || []).map((p, i) => {
                        const maxCount = Math.max(...(stats?.peakHours || []).map((h) => h.count));
                        const validMaxCount = maxCount > 0 ? maxCount : 1;
                        const intensity = p.count / validMaxCount;
                        const isHot = intensity > 0.7 && p.count > 0;

                        return (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.03 }}
                                className={`p-4 text-center rounded-2xl border transition-all flex flex-col items-center justify-center relative overflow-hidden ${
                                    isHot
                                        ? 'bg-linear-to-br from-amber-500 via-orange-500 to-amber-600 text-white border-none shadow-md shadow-orange-500/20'
                                        : 'bg-muted/30 border-border/60 text-foreground'
                                }`}
                            >
                                {isHot && (
                                    <div className='absolute top-2 right-2 flex items-center gap-1 text-amber-200'>
                                        <Flame size={12} className="animate-bounce" />
                                    </div>
                                )}

                                <p
                                    className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isHot ? 'text-amber-100' : 'text-muted-foreground'}`}
                                >
                                    {p.time}
                                </p>
                                <div className='flex flex-col items-center'>
                                    <p
                                        className={`text-2xl font-black mb-1 ${isHot ? 'text-white' : 'text-foreground'}`}
                                    >
                                        {p.count}
                                    </p>
                                    <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isHot ? 'bg-white/20 text-white' : 'bg-card text-muted-foreground border border-border/60'}`}
                                    >
                                        lượt đặt
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}

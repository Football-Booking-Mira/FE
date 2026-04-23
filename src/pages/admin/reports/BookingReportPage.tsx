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

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

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
            const res = await fetch(
                `http://localhost:3000/api/reports/public/booking-stats?${params}`
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
            <div className='flex items-center justify-center min-h-[600px]'>
                <div className="relative">
                    <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500'></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600">MIRA</div>
                </div>
            </div>
        );

    const pieData = [
        { name: 'Đang dùng', value: stats?.courtStatus.inUse || 0 },
        { name: 'Đã đặt', value: stats?.courtStatus.reserved || 0 },
        { name: 'Còn trống', value: stats?.courtStatus.available || 0 },
    ];

    return (
        <div className='space-y-8 p-1 md:p-6 animate-in fade-in duration-1000'>
            {/* 🚀 Premium Header */}
            <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900/50 p-6 rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden'>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                
                <div className="relative z-10">
                    <h1 className='text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-4'>
                        <div className='p-3.5 bg-linear-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none'>
                            <LayoutDashboard size={28} />
                        </div>
                        <div>
                            <span>Thống kê & Phân tích</span>
                            <div className="h-1 w-12 bg-emerald-500 rounded-full mt-1"></div>
                        </div>
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-2 font-medium flex items-center gap-2'>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Hệ thống báo cáo hiệu suất kinh doanh Mira
                    </p>
                </div>

                <div className='flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-white/5 relative z-10'>
                    <div className='flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm'>
                        {(['day', 'week', 'month', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePeriodChange(p)}
                                className={`px-4 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                                    selectedPeriod === p
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-500/20'
                                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Năm'}
                            </button>
                        ))}
                    </div>
                    <div className='hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1'></div>
                    <div className='flex items-center gap-2 sm:gap-4 px-1 sm:px-2'>
                        <button
                            onClick={() => handleNavigate('prev')}
                            className='p-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm transition-all'
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedPeriod === 'week' ? 'Giai đoạn' : 'Thời gian'}</span>
                            <span className='text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 truncate'>
                                {getPeriodLabel()}
                            </span>
                        </div>
                        <button
                            onClick={() => handleNavigate('next')}
                            className='p-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm transition-all'
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 💰 Section 1: KPI Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className='group bg-linear-to-br from-emerald-500 to-teal-600 p-6 rounded-4xl text-white shadow-xl shadow-emerald-200 dark:shadow-none relative overflow-hidden cursor-default'
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <TrendingUp size={16} />
                            </div>
                            <span className='text-emerald-50 text-[10px] font-black uppercase tracking-widest'>Doanh thu Hôm nay</span>
                        </div>
                        <h3 className='text-3xl font-black mb-1'>
                            {formatCurrency(stats?.revenueOverview.daily)}{' '}
                            <span className='text-lg font-bold'>₫</span>
                        </h3>
                        <p className="text-emerald-100/70 text-xs font-medium">+12% so với hôm qua</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className='group bg-linear-to-bl from-blue-500 to-indigo-600 border-none p-6 rounded-4xl text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden cursor-default'
                >
                    <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:-translate-y-2 transition-transform">
                        <Zap size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <Zap size={16} className="text-amber-300" />
                            </div>
                            <span className='text-blue-100 text-[10px] font-black uppercase tracking-widest'>Tổng cộng kỳ này</span>
                        </div>
                        <h3 className='text-3xl font-black text-white mb-1'>
                            {formatCurrency(stats?.totalRevenue)} <span className='text-lg text-blue-100 font-bold'>₫</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded shadow-sm">TÍCH CỰC</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className='bg-white dark:bg-slate-900 p-6 rounded-4xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                            <TrendingUp size={16} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã thanh toán</span>
                    </div>
                    <h3 className='text-2xl font-black text-slate-900 dark:text-white'>
                        {formatCurrency(stats?.revenueOverview.totalPaid)} <span className="text-sm font-bold">₫</span>
                    </h3>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full" 
                            style={{ width: `${stats ? (stats.revenueOverview.totalPaid / (stats.revenueOverview.totalPaid + stats.revenueOverview.totalUnpaid + 1)) * 100 : 0}%` }}
                        ></div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className='bg-white dark:bg-slate-900 p-6 rounded-4xl border border-rose-100 dark:border-white/5 shadow-xl shadow-rose-100/50 dark:shadow-none'
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                            <Clock size={16} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa thanh toán</span>
                    </div>
                    <h3 className='text-2xl font-black text-rose-500 dark:text-rose-400'>
                        {formatCurrency(stats?.revenueOverview.totalUnpaid)} <span className="text-sm font-bold">₫</span>
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 italic">Cần nhắc nhở thanh toán</span>
                    </div>
                </motion.div>
            </div>

            {/* 📊 Section 2: Main Charts */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                {/* Biểu đồ xu hướng Doanh thu */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
                >
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className='text-xl text-slate-900 dark:text-white font-extrabold flex items-center gap-2'>
                                <TrendingUp className="text-emerald-500" size={20} />
                                Phân tích Xu hướng Doanh thu
                            </h3>
                            <p className="text-slate-400 text-xs font-medium mt-1">Dữ liệu doanh thu biến động theo thời gian</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Doanh thu</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className='h-[350px] w-full'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <AreaChart data={stats?.revenueTrend}>
                                <defs>
                                    <linearGradient id='colorRev' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='5%' stopColor='#10b981' stopOpacity={0.1}/>
                                        <stop offset='95%' stopColor='#10b981' stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray='3 3' strokeOpacity={0.05} />
                                <XAxis 
                                    dataKey='date' 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}Tr` : v.toLocaleString()}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '12px' }}
                                    itemStyle={{ fontWeight: 800, color: '#0f172a' }}
                                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#64748b' }}
                                    formatter={(v: any) => [formatCurrency(v) + ' ₫', 'Doanh thu']}
                                />
                                <Area 
                                    type='monotone' 
                                    dataKey='revenue' 
                                    stroke='#10b981' 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill='url(#colorRev)' 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* ⚽ Section: Trạng thái Sân bóng */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className='lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden flex flex-col'
                >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-5 pointer-events-none text-slate-900 dark:text-white">
                        <PieChartIcon size={220} />
                    </div>
                    
                    <h3 className='text-xl font-extrabold mb-6 relative z-10 flex items-center gap-2 text-slate-900 dark:text-white'>
                        <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
                        Vận hành Sân Hiện tại
                    </h3>

                    <div className="flex-1 min-h-[220px] relative z-10">
                        <ResponsiveContainer width='100%' height='100%'>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx='50%'
                                    cy='50%'
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey='value'
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Hiệu suất</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                {stats ? Math.round((stats.courtStatus.inUse / (stats.courtStatus.inUse + stats.courtStatus.available + 0.1)) * 100) || 0 : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6 relative z-10">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx] }}></div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{item.value} sân</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* 🏆 Section 3: Rankings & Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                {/* 📊 Section: Lượt đặt sân */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className='bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
                >
                    <div className="flex justify-between items-center mb-8">
                        <h3 className='text-lg font-black text-slate-800 dark:text-white flex items-center gap-3'>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl"><Calendar size={20} /></div>
                            Lượt đặt sân bóng
                        </h3>
                        <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-full"><ArrowUpRight size={16} className="text-slate-400" /></div>
                    </div>
                    
                    <div className='space-y-4'>
                        <div className='flex justify-between items-center p-5 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl group cursor-default border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all'>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:scale-110 transition-transform">1</div>
                                <span className='font-extrabold text-slate-700 dark:text-slate-200'>Hôm nay</span>
                            </div>
                            <span className='text-3xl font-black text-indigo-600 dark:text-indigo-400'>
                                {stats?.bookingsOverview.today}
                            </span>
                        </div>
                        <div className='flex justify-between items-center p-5 bg-teal-50/50 dark:bg-teal-500/5 rounded-2xl group cursor-default border border-transparent hover:border-teal-100 dark:hover:border-teal-500/20 transition-all'>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-teal-600 dark:text-teal-400 shadow-sm group-hover:scale-110 transition-transform">7</div>
                                <span className='font-extrabold text-slate-700 dark:text-slate-200'>Tuần này</span>
                            </div>
                            <span className='text-3xl font-black text-teal-600 dark:text-teal-400'>
                                {stats?.bookingsOverview.week}
                            </span>
                        </div>
                        <div className='flex justify-between items-center p-5 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl group cursor-default border border-transparent hover:border-amber-100 dark:hover:border-amber-500/20 transition-all'>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-amber-600 dark:text-amber-400 shadow-sm group-hover:scale-110 transition-transform">30</div>
                                <span className='font-extrabold text-slate-700 dark:text-slate-200'>Tháng này</span>
                            </div>
                            <span className='text-3xl font-black text-amber-600 dark:text-amber-400'>
                                {stats?.bookingsOverview.month}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* ⚽ Section: Rankings */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className='bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
                >
                    <div className="flex justify-between items-center mb-8">
                        <h3 className='text-lg font-black text-slate-800 dark:text-white flex items-center gap-3'>
                            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><Trophy size={20} /></div>
                            Bảng xếp hạng Sân
                        </h3>
                    </div>
                    
                    <div className='space-y-5'>
                        {stats?.courtsStats.slice(0, 5).map((c, i) => (
                            <div key={i} className='group'>
                                <div className='flex justify-between mb-2 items-end'>
                                    <div className='flex items-center gap-3'>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                            {i + 1}
                                        </div>
                                        <span className='text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-500 transition-colors'>
                                            {c.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className='text-sm font-black text-slate-900 dark:text-white'>{c.count}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Lượt</span>
                                    </div>
                                </div>
                                <div className='w-full h-2 bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden'>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(c.count / (stats.courtsStats[0]?.count || 1)) * 100}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-amber-400/50'}`}
                                    ></motion.div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 👤 Section: Customers */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className='bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
                >
                    <div className="flex justify-between items-center mb-8">
                        <h3 className='text-lg font-black text-slate-800 dark:text-white flex items-center gap-3'>
                            <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl"><Users size={20} /></div>
                            Khách hàng thân thiết
                        </h3>
                    </div>

                    <div className='flex items-center justify-between mb-8 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl'>
                        <div className="flex-1 text-center p-3">
                            <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Tổng khách</p>
                            <p className='text-2xl font-black text-slate-900 dark:text-white'>{stats?.customerStats.total}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1 text-center p-3">
                            <p className='text-[10px] font-black text-emerald-500 uppercase tracking-widest'>Tháng mới</p>
                            <p className='text-2xl font-black text-emerald-600 dark:text-emerald-400'>+{stats?.customerStats.newThisMonth}</p>
                        </div>
                    </div>

                    <div className='space-y-4'>
                        {stats?.customerStats.topList.slice(0, 3).map((item, i) => (
                            <div key={i} className='flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-default'>
                                <div className='flex items-center gap-4'>
                                    <div className="relative">
                                        <div className='w-11 h-11 rounded-2xl bg-linear-to-tr from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-violet-500/20'>
                                            {item.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        {i === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px]">👑</div>}
                                    </div>
                                    <div>
                                        <p className='text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[120px]'>
                                            {item.user?.name || 'Khách ẩn danh'}
                                        </p>
                                        <p className='text-[10px] text-slate-400 font-bold'>
                                            {item.user?.phone || 'Chưa cập nhật'}
                                        </p>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <p className='text-lg font-black text-slate-900 dark:text-white'>
                                        {item.count}
                                    </p>
                                    <p className='text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase'>Đơn</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* 🕐 Section 4: Hot Hours Analytics */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none'
            >
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className='text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3'>
                            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><Clock size={22} /></div>
                            Khung giờ Vàng
                        </h3>
                        <p className="text-slate-400 text-xs font-medium mt-1">Phân tích hiệu suất đặt sân theo từng khung giờ trong ngày</p>
                    </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
                    {stats?.peakHours.map((p, i) => {
                        const maxCount = Math.max(...stats.peakHours.map(h => h.count));
                        // Ngăn chia cho 0 và xử lý cường độ
                        const validMaxCount = maxCount > 0 ? maxCount : 1;
                        const intensity = p.count / validMaxCount;
                        
                        // Kích hoạt giao diện dark mode cho khung giờ được đặt nhiều nhất
                        const isHot = intensity > 0.8 && p.count > 0;
                        
                        return (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className={`p-6 text-center rounded-3xl border transition-all group relative overflow-hidden flex flex-col items-center justify-center ${
                                    isHot 
                                        ? 'bg-linear-to-br from-amber-400 to-orange-500 dark:from-emerald-500/10 dark:to-emerald-500/5 text-white border-none shadow-xl shadow-orange-200 dark:shadow-emerald-500/10' 
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5 text-slate-900 dark:text-slate-300'
                                }`}
                            >
                                {isHot && <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50 pointer-events-none"></div>}
                                {isHot && <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
                                
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-4 z-10 ${isHot ? 'text-amber-50 dark:text-emerald-400 group-hover:text-white transition-colors' : 'text-slate-400'}`}>
                                    {p.time}
                                </p>
                                <div className="flex flex-col items-center z-10">
                                    <p className={`text-4xl font-black mb-1 group-hover:scale-110 transition-transform ${isHot ? 'text-white dark:text-emerald-400 drop-shadow-md' : 'text-slate-800 dark:text-slate-200'}`}>{p.count}</p>
                                    <span className={`text-[10px] font-black px-2 py-0.5 mt-1 rounded shadow-xs uppercase ${isHot ? 'bg-white/20 dark:bg-emerald-500/20 text-white dark:text-emerald-300' : 'bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-none'}`}>
                                        Đặt sân
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

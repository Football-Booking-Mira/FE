import React, {
  useEffect,
  useState,
} from 'react';

import {
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface HotHour {
  fromHour: string; // ví dụ: "18:00"
  toHour: string;   // ví dụ: "20:00"
  count: number;
}

interface TopCustomer {
  user: {
    username?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  count: number;
}

interface TopCourt {
  court: {
    name: string;
  };
  count: number;
}

interface BookingStats {
  hotHour?: HotHour | null;
  topCustomer?: TopCustomer | null;
  topCourt?: TopCourt | null;
  hourTrend?: { date: string; count: number }[];
  // courtRate?: { court: string; value: number }[];
  revenueTrend?: { date: string; revenue: number }[];
  topCustomersList?: TopCustomer[];

  courtRate?: number;
  totalRevenue?: number;
}


const formatCurrency = (value?: number | string) => {
  if (value === undefined || value === null) return "0";
  return Number(value).toLocaleString("vi-VN");
};

export default function BookingStatsReportPage() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, -1 = previous, 1 = next

  const fetchStats = async (period?: 'week' | 'month' | 'year', offset: number = 0) => {
    try {
      setError("");
      setLoading(true);

      let url = `http://localhost:3000/api/reports/public/booking-stats`;
      const params = new URLSearchParams();

      if (period) {
        params.append('period', period);
      }

      if (offset !== 0) {
        params.append('offset', offset.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      console.log("📌 API response:", json); // log kiểm tra

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Lỗi khi lấy báo cáo");
      }

      const reportData = json.data; // 👈 Đây mới đúng

      setStats({
        hotHour: reportData.hotHour ?? null,
        topCustomer: reportData.topCustomer ?? null,
        topCourt: reportData.topCourt ?? null,
        hourTrend: reportData.hourTrend ?? [],
        revenueTrend: reportData.revenueTrend ?? [],
        topCustomersList: reportData.topCustomersList ?? [],

        courtRate: reportData.courtRate ?? 0,
        totalRevenue: reportData.totalRevenue ?? 0, // 👈 đúng field doanh thu
      });

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  const handlePeriodChange = (period: 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
    setPeriodOffset(0); // Reset to current period when changing period type
    fetchStats(period, 0);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? periodOffset - 1 : periodOffset + 1;
    setPeriodOffset(newOffset);
    fetchStats(selectedPeriod, newOffset);
  };

  

  const getPeriodLabel = () => {
  const now = new Date();

  if (selectedPeriod === 'year') {
    const year = now.getFullYear() + periodOffset;
    return `Năm ${year}`;
  }

  if (selectedPeriod === 'month') {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth() + periodOffset,
      1
    );
    return `Tháng ${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`;
  }

  // week – bắt đầu từ Thứ 2 (sync backend)
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + periodOffset * 7
  );

  const day = targetDate.getDay() || 7; // CN = 7
  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(targetDate.getDate() - day + 1);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return `Tuần ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}
   - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}/${endOfWeek.getFullYear()}`;
};


  useEffect(() => {
    fetchStats(selectedPeriod, periodOffset);
  }, [selectedPeriod, periodOffset]);

  if (loading) return <p className="p-6">Đang tải báo cáo...</p>;
  if (error) return <p className="text-red-500 p-6">{error}</p>;


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between flex-wrap gap-4 mb-6 items-center">
        <div className="flex items-center gap-2 font-semibold text-xl">
          <CalendarDays size={22} /> <span>Tổng quan Booking</span>
        </div>

        {/* Time Period Filter Tabs for Overview */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'week'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Tuần
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'month'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Tháng
          </button>
          <button
            onClick={() => handlePeriodChange('year')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'year'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Năm
          </button>
        </div>
      </div>


      {/* Card số liệu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle>Tổng doanh thu</CardTitle>
            <DollarSign className="w-5 h-5" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">
              {/* Chuyển totalRevenue sang number trước khi dùng toLocaleString */}
              {stats?.totalRevenue !== undefined && stats?.totalRevenue !== null
                ? Number(stats.totalRevenue).toLocaleString("vi-VN")
                : "0"} ₫
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Khung giờ hot nhất</h2>

            <p className="text-xl font-bold">
              {Array.isArray(stats?.hotHour) && stats.hotHour.length > 0
                ? stats.hotHour.map((h, i) =>
                  <span key={i}>
                    {h.fromHour} – {h.toHour}
                  </span>
                )
                : stats?.hotHour?.fromHour && stats?.hotHour?.toHour
                  ? `${stats.hotHour.fromHour} – ${stats.hotHour.toHour}`
                  : "--"
              }
            </p>

            <p className="text-sm mt-2 text-gray-600">
              Lượt: {stats?.topCourt?.count || 0}

            </p>
          </CardContent>
        </Card>


        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Khách đặt nhiều nhất</h2>
            <p className="text-2xl font-bold">{stats?.topCustomer?.user?.name || stats?.topCustomer?.user?.username || "--"}</p>
            <p className="text-sm mt-2 text-gray-600">Lượt: {stats?.topCustomer?.count || 0}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Sân đặt nhiều nhất</h2>
            <p className="text-2xl font-bold">{stats?.topCourt?.court?.name || "--"}</p>
            <p className="text-sm mt-2 text-gray-600">Lượt: {stats?.topCourt?.count || 0}</p>
          </CardContent>
        </Card>

      </div>

      {/* Biểu đồ trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">


        <Card className="lg:col-span-2 rounded-2xl shadow-sm mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Biểu đồ doanh thu</CardTitle>

            {/* Navigation Controls */}
            { (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate('prev')}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Kỳ trước"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <span className="text-sm font-medium text-gray-600 min-w-[120px] text-center">
                  {getPeriodLabel()}
                </span>

                <button
                  onClick={() => handleNavigate('next')}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Kỳ sau"
                  disabled={false}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {stats?.revenueTrend && stats.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.revenueTrend.map(item => ({
                  date: item.date,
                  revenue: Number(item.revenue) // ✅ đảm bảo là number
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                <YAxis
  domain={[0, selectedPeriod === 'year' ? 400000000 : 100000000]}
  ticks={
    selectedPeriod === 'year'
      ? [100000000, 150000000, 200000000, 400000000]
      : [1000000, 10000000, 50000000, 100000000]
  }
  tickFormatter={(value) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    return formatCurrency(value);
  }}
/>
                  <Tooltip formatter={(value: any) => [formatCurrency(value) + " ₫","Doanh thu"]} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className='h-48 flex items-center justify-center text-gray-400 text-sm'>
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Tỷ lệ sử dụng sân</h2>
            <p className="text-2xl font-bold">
              {stats?.courtRate !== undefined ? stats.courtRate + "%" : "--"}
            </p>
            <p className="text-sm text-gray-400 mt-1">Tính theo toàn bộ lượt đặt</p>
          </CardContent>
        </Card>

      </div>

      {/* Table TOP 4 khách đặt nhiều nhất */}
      <Card className="rounded-2xl shadow-sm bg-white">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">Top khách hàng đặt nhiều nhất</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white rounded-xl">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Hạng</th>
                  <th className="text-left p-3">Tên khách</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Số lượt đặt</th>
                </tr>
              </thead>

              <tbody>
                {stats?.topCustomersList?.slice(0, 4).map((item, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-400">#{i + 1}</td>

                    <td className="p-3 font-medium">
                      {item.user?.name || item.user?.username || "--"}
                    </td>

                    <td className="p-3 text-gray-500">
                      {item.user?.email || "--"}
                    </td>

                    <td className="p-3 font-bold">
                      {item.count}
                    </td>
                  </tr>
                ))}

                {/* Fallback nếu không có dữ liệu */}
                {(!stats?.topCustomersList || stats.topCustomersList.length === 0) && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={4}>
                      Không có dữ liệu khách hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>


    </div>
  );
}



// import React, { useEffect, useState } from "react";
//   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
//   import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
//   import { CalendarDays, DollarSign, Download, FileSpreadsheet } from "lucide-react";


//   interface HotHour {
//     fromHour: string; // ví dụ: "18:00"
//     toHour: string;   // ví dụ: "20:00"
//     count: number;
//   }

//   interface TopCustomer {
//     user: {
//       username?: string;
//       name?: string;
//       phone?: string;
//       email?: string;
//     };
//     count: number;
//   }

//   interface TopCourt {
//     court: {
//       name: string;
//     };
//     count: number;
//   }

//   interface BookingStats {
//     hotHour?: HotHour | null;
//     topCustomer?: TopCustomer | null;
//     topCourt?: TopCourt | null;
//     hourTrend?: { date: string; count: number }[];
//     // courtRate?: { court: string; value: number }[];
//     revenueTrend?: { date: string; revenue: number }[]; 
//     topCustomersList?: TopCustomer[];
    
//     courtRate?: number;
//     totalRevenue?: number;
//   }


//   const formatCurrency = (value?: number | string) => {
//   if (value === undefined || value === null) return "0";
//   return Number(value).toLocaleString("vi-VN");
// };

//   export default function BookingStatsReportPage() {
//     const [stats, setStats] = useState<BookingStats | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState("");

//     // ✅ Thêm filter khoảng thời gian
//     const [fromDate, setFromDate] = useState("");
//     const [toDate, setToDate] = useState("");


// const fetchStats = async (from?: string, to?: string) => {
//   try {
//     setError("");
//     setLoading(true);

//     const url = from && to
//       ? `http://localhost:3000/api/reports/public/booking-stats?from=${from}&to=${to}`
//       : `http://localhost:3000/api/reports/public/booking-stats`;

//     const res = await fetch(url);
//     const json = await res.json();

//     console.log("📌 API response:", json); // log kiểm tra

//     if (!res.ok || !json.success) {
//       throw new Error(json.error || "Lỗi khi lấy báo cáo");
//     }

//     const reportData = json.data; // 👈 Đây mới đúng

//     setStats({
//       hotHour: reportData.hotHour ?? null,
//       topCustomer: reportData.topCustomer ?? null,
//       topCourt: reportData.topCourt ?? null,
//       hourTrend: reportData.hourTrend ?? [],
//       revenueTrend: reportData.revenueTrend ?? [],
//       topCustomersList: reportData.topCustomersList ?? [],

//       courtRate: reportData.courtRate ?? 0,
//       totalRevenue: reportData.totalRevenue ?? 0, // 👈 đúng field doanh thu
//     });

//   } catch (e: any) {
//     setError(e.message);
//   } finally {
//     setLoading(false);
//   }
// };


//     useEffect(() => {
//       fetchStats();
//     }, []);

//     if (loading) return <p className="p-6">Đang tải báo cáo...</p>;
//     if (error) return <p className="text-red-500 p-6">{error}</p>;
    

//     return (
//       <div className="p-6 bg-gray-50 min-h-screen">
//               {/* Header */}
//         <div className="flex justify-between flex-wrap gap-4 mb-6 items-center">
//           <div className="flex items-center gap-2 font-semibold text-xl">
//             <CalendarDays size={22}/> <span>Tổng quan Booking</span>
//           </div>
//         </div>

//         {/* ✅ Thanh Filter có chọn khoảng ngày */}
//         <div className="flex flex-wrap gap-4 items-center justify-between mb-6">

//           <div className="flex flex-wrap gap-3 items-end">
            

//             {/* Input Từ ngày */}
//             <div className="flex flex-col">
//               <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
//               <input
//                 type="date"
//                 value={fromDate}
//                 onChange={e => setFromDate(e.target.value)}
//                 className="border px-3 py-2 rounded-lg text-sm w-[150px]"
//               />
//             </div>

//             {/* Input Đến ngày */}
//             <div className="flex flex-col">
//               <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
//               <input
//                 type="date"
//                 value={toDate}
//                 onChange={e => setToDate(e.target.value)}
//                 className="border px-3 py-2 rounded-lg text-sm w-[150px]"
//               />
//             </div>

//             {/* Nút Áp dụng */}
//             <button
//               onClick={() => {
//                 if (!fromDate || !toDate) {
//                   alert("Vui lòng chọn từ ngày và đến ngày!");
//                   return;
//                 }
//                 fetchStats(fromDate, toDate);
//               }}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
//             >
//               Áp dụng
//             </button>
//           </div>
//         </div>

//         {/* Card số liệu */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           <Card className="rounded-2xl shadow-sm bg-white">
//               <CardHeader className="flex justify-between items-center pb-2">
//                 <CardTitle>Tổng doanh thu</CardTitle>
//                 <DollarSign className="w-5 h-5" />
//               </CardHeader>

//               <CardContent>
//                 <div className="text-2xl font-semibold">
//                   {/* Chuyển totalRevenue sang number trước khi dùng toLocaleString */}
//                   {stats?.totalRevenue !== undefined && stats?.totalRevenue !== null
//                     ? Number(stats.totalRevenue).toLocaleString("vi-VN")
//                     : "0"} ₫
//                 </div>
//                 <p className="text-sm text-gray-500 mt-1">Tính theo 7 ngày gần nhất</p>
//               </CardContent>
//           </Card>


//           <Card className="rounded-2xl shadow-sm">
//             <CardContent className="p-4">
//               <h2 className="text-sm text-gray-500 mb-1">Khung giờ hot nhất</h2>

//               <p className="text-xl font-bold">
//                 {Array.isArray(stats?.hotHour) && stats.hotHour.length > 0
//                   ? stats.hotHour.map((h, i) =>
//                       <span key={i}>
//                         {h.fromHour} – {h.toHour}
//                       </span>
//                     )
//                   : stats?.hotHour?.fromHour && stats?.hotHour?.toHour
//                     ? `${stats.hotHour.fromHour} – ${stats.hotHour.toHour}`
//                     : "--"
//                 }
//               </p>

//               <p className="text-sm mt-2 text-gray-600">
//                   Lượt: {stats?.topCourt?.count || 0} 

//               </p>
//             </CardContent>
//           </Card>


//           <Card className="rounded-2xl shadow-sm">
//             <CardContent className="p-4">
//               <h2 className="text-sm text-gray-500 mb-1">Khách đặt nhiều nhất</h2>
//               <p className="text-2xl font-bold">{stats?.topCustomer?.user?.name || stats?.topCustomer?.user?.username || "--"}</p>
//               <p className="text-sm mt-2 text-gray-600">Lượt: {stats?.topCustomer?.count || 0}</p>
//             </CardContent>
//           </Card>

//           <Card className="rounded-2xl shadow-sm">
//             <CardContent className="p-4">
//               <h2 className="text-sm text-gray-500 mb-1">Sân đặt nhiều nhất</h2>
//               <p className="text-2xl font-bold">{stats?.topCourt?.court?.name || "--"}</p>
//               <p className="text-sm mt-2 text-gray-600">Lượt: {stats?.topCourt?.count || 0}</p>
//             </CardContent>
//           </Card>

//         </div>

//         {/* Biểu đồ trend */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">


//           <Card className="lg:col-span-2 rounded-2xl shadow-sm mb-6">
//             <CardHeader>
//               <CardTitle>Biểu đồ doanh thu</CardTitle>
//             </CardHeader>
//             <CardContent>
//               {stats?.revenueTrend && stats.revenueTrend.length > 0 ? (
//                 <ResponsiveContainer width="100%" height={250}>
//                   <LineChart data={stats.revenueTrend.map(item => ({
//                     date: item.date,
//                     revenue: Number(item.revenue) // ✅ đảm bảo là number
//                   }))}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="date" />
//                     <YAxis 
//                       tickFormatter={(value) => formatCurrency(value)} 
//                     />
//                     <Tooltip formatter={(value: any) => formatCurrency(value) + " ₫"} />
//                     <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
//                   </LineChart>
//                 </ResponsiveContainer>
//               ) : (
//                 <div className='h-48 flex items-center justify-center text-gray-400 text-sm'>
//                   Không có dữ liệu
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           <Card className="rounded-2xl shadow-sm bg-white">
//             <CardContent className="p-4">
//               <h2 className="text-sm text-gray-500 mb-1">Tỷ lệ sử dụng sân</h2>
//               <p className="text-2xl font-bold">
//                 {stats?.courtRate !== undefined ? stats.courtRate + "%" : "--"}
//               </p>
//               <p className="text-sm text-gray-400 mt-1">Tính theo toàn bộ lượt đặt</p>
//             </CardContent>
//           </Card>

//         </div>

//         {/* Table TOP 4 khách đặt nhiều nhất */}
//           <Card className="rounded-2xl shadow-sm bg-white">
//             <CardContent className="p-4">
//               <h2 className="text-xl font-semibold mb-4">Top khách hàng đặt nhiều nhất</h2>

//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm bg-white rounded-xl">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="text-left p-3">Hạng</th>
//                       <th className="text-left p-3">Tên khách</th>
//                       <th className="text-left p-3">Email</th>
//                       <th className="text-left p-3">Số lượt đặt</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {stats?.topCustomersList?.slice(0, 4).map((item, i) => (
//                       <tr key={i} className="border-b hover:bg-gray-50">
//                         <td className="p-3 font-bold text-gray-400">#{i + 1}</td>

//                         <td className="p-3 font-medium">
//                           {item.user?.name || item.user?.username || "--"}
//                         </td>

//                         <td className="p-3 text-gray-500">
//                           {item.user?.email || "--"}
//                         </td>

//                         <td className="p-3 font-bold">
//                           {item.count}
//                         </td>
//                       </tr>
//                     ))}

//                     {/* Fallback nếu không có dữ liệu */}
//                     {(!stats?.topCustomersList || stats.topCustomersList.length === 0) && (
//                       <tr>
//                         <td className="p-4 text-center text-gray-500" colSpan={4}>
//                           Không có dữ liệu khách hàng
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//             </CardContent>
//           </Card>


//       </div>
//     );
//   }

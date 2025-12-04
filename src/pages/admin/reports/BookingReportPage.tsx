import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { CalendarDays, DollarSign, Download, FileSpreadsheet } from "lucide-react";


interface HotHour {
  hour: string;
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
  courtRate?: { court: string; value: number }[];
  revenueTrend?: { date: string; revenue: number }[]; 
  topCustomersList?: TopCustomer[];
}


export default function BookingStatsReportPage() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Thêm filter khoảng thời gian
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
    const totalRevenue = stats?.revenueTrend?.reduce((sum, item) => sum + item.revenue, 0) || 0;

  const fetchStats = async (from?: string, to?: string) => {
    try {
      setLoading(true);
      const url = from && to
        ? `http://localhost:3000/api/reports/public/booking-stats?from=${from}&to=${to}`
        : `http://localhost:3000/api/reports/public/booking-stats`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lỗi khi lấy báo cáo");
      }

      setStats(data.data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Lỗi server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <p className="p-6">Đang tải báo cáo...</p>;
  if (error) return <p className="text-red-500 p-6">{error}</p>;
  

  //   const getLast7DaysRevenueTrend = () => {
  //   if (!stats?.revenueTrend) return [];
  //   const last7 = [];
  //   const today = new Date();

  //   for (let i = 6; i >= 0; i--) {
  //     const d = new Date();
  //     d.setDate(today.getDate() - i);
  //     const key = d.toISOString().split("T")[0];
  //     const match = stats.revenueTrend.find(item => item.date === key);

  //     last7.push({
  //       date: format(d, "dd/MM"),
  //       revenue: match?.revenue || 0
  //     });
  //   }

  //   return last7;
  // };

  // ✅ Gom trend theo loại filter
  // const getTrendData = () => {
  //   if (!stats?.hourTrend) return [];

  //   const grouped: Record<string, number> = {};

  //   stats.hourTrend.forEach((item) => {
  //     const d = new Date(item.date);
  //     let key = "";

  //     if (rangeType === "day") {
  //       key = item.date;
  //     } else if (rangeType === "week") {
  //       key = `${d.getFullYear()}-W${getWeekNumber(d)}`;
  //     } else {
  //       key = `${d.getFullYear()}-${d.getMonth() + 1}`;
  //     }

  //     grouped[key] = (grouped[key] || 0) + item.count;
  //   });

  //   return Object.keys(grouped).map(k => ({ date: k, count: grouped[k] }));
  // };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
      <div className="flex justify-between flex-wrap gap-4 mb-6 items-center">
        <div className="flex items-center gap-2 font-semibold text-xl">
          <CalendarDays size={22}/> <span>Tổng quan Booking</span>
        </div>

        <div className="flex gap-3">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <FileSpreadsheet size={16}/> Xuất Excel
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Download size={16}/> Xuất PDF
          </button>
        </div>
      </div>

      {/* ✅ Thanh Filter có chọn khoảng ngày */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        {/* <div className="flex items-center gap-2 font-semibold text-xl">
          <CalendarDays size={22}/> <span>Tổng quan Booking</span>
        </div> */}

        <div className="flex flex-wrap gap-3 items-end">
          

          {/* Input Từ ngày */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm w-[150px]"
            />
          </div>

          {/* Input Đến ngày */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm w-[150px]"
            />
          </div>

          {/* Nút Áp dụng */}
          <button
            onClick={() => {
              if (!fromDate || !toDate) {
                alert("Vui lòng chọn từ ngày và đến ngày!");
                return;
              }
              fetchStats(fromDate, toDate);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {/* Card số liệu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl shadow-sm bg-white">
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle>Tổng doanh thu</CardTitle>
            <DollarSign className="text-yellow-500 w-5 h-5" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">
              {totalRevenue.toLocaleString("vi-VN")} ₫
            </div>
            <p className="text-sm text-gray-500 mt-1">Tính theo 7 ngày gần nhất</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Khung giờ hot nhất</h2>
            <p className="text-2xl font-bold">{stats?.hotHour?.hour || "--"}</p>
            <p className="text-sm mt-2 text-gray-600">Lượt: {stats?.hotHour?.count || 0}</p>
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
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Doanh thu 7 ngày gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='h-48 flex items-center justify-center text-gray-400 text-sm'>
                            (Biểu đồ đang cập nhật...)
                        </div>
                    </CardContent>
        </Card>

        {/* <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4 text-lg">Tỉ lệ đặt theo sân</h2>
            <div className="w-full h-[280px] flex justify-center">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats?.courtRate || []} dataKey="value" nameKey="court" innerRadius={50} outerRadius={90}>
                    {stats?.courtRate?.map((_, i) => <Cell key={i}/>)}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36}/>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card> */}

        <Card className="rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4">
            <h2 className="text-sm text-gray-500 mb-1">Tỷ lệ sử dụng sân</h2>
            <p className="text-2xl font-bold">
              {stats?.courtRate
                ? (stats.courtRate.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1) + "%"
                : "--"}
            </p>
            <p className="text-sm text-gray-400 mt-1">Tính theo toàn bộ lượt đặt</p>
          </CardContent>
      </Card>
      </div>

      {/* Table khách đặt nhiều nhất */}
      {/* <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">Danh sách khách đặt nhiều nhất</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white rounded-xl">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Tên khách</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Lượt đặt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 font-medium">{stats?.topCustomer?.user?.name || stats?.topCustomer?.user?.username}</td>
                  <td className="p-3">{stats?.topCustomer?.user?.email || "--"}</td>
                  <td className="p-3 font-bold">{stats?.topCustomer?.count || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card> */}

      {/* Table TOP 4 khách đặt nhiều nhất */}
<Card className="rounded-2xl shadow-sm bg-white">
  <CardContent className="p-4">
    <h2 className="text-xl font-semibold mb-4">Top 4 khách hàng đặt nhiều nhất</h2>

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
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
// import { FileSpreadsheet, Download } from "lucide-react";
// import { Tabs } from "antd";

// interface HotHour {
//   hour: string;
//   count: number;
// }

// interface TopCustomer {
//   user: {
//     username?: string;
//     name?: string;
//     phone?: string;
//     email?: string;
//   };
//   count: number;
// }

// interface TopCourt {
//   court: {
//     name: string;
//   };
//   count: number;
// }

// interface BookingStats {
//   hotHour?: HotHour | null;
//   topCustomer?: TopCustomer | null;
//   topCourt?: TopCourt | null;
//   hourTrend?: { date: string; count: number }[];
//   topCustomersList?: TopCustomer[];
// }

// export default function BookingStatsReportPage() {
//   const [stats, setStats] = useState<BookingStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [fromDate, setFromDate] = useState("2025-07-03");
//   const [toDate, setToDate] = useState("2025-10-01");

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const res = await fetch("http://localhost:3000/api/reports/public/booking-stats");
//         const data = await res.json();

//         if (!res.ok || !data.success) {
//           throw new Error(data.error || "Lỗi khi lấy báo cáo");
//         }

//         setStats(data.data);
//       } catch (err: any) {
//         console.error(err);
//         setError(err.message || "Lỗi server");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchStats();
//   }, []);

//   if (loading) return <p className="p-6">Đang tải báo cáo...</p>;
//   if (error) return <p className="text-red-500 p-6">{error}</p>;

//   const tabItems = [
//     {
//       key: "revenue",
//       label: "Doanh thu",
//       children: <p>Chưa có dữ liệu doanh thu</p>
//     },
//     {
//       key: "booking",
//       label: "Đặt sân",
//       children: (
//         <>
//           {/* Stats cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//             <StatCard label="Khung giờ hot" value={stats?.hotHour?.hour} sub={`Lượt: ${stats?.hotHour?.count || 0}`} />
//             <StatCard
//               label="Khách hàng top"
//               value={stats?.topCustomer?.user?.name || stats?.topCustomer?.user?.username}
//               sub={`Lượt đặt: ${stats?.topCustomer?.count || 0}`}
//             />
//             <StatCard label="Sân được đặt nhiều" value={stats?.topCourt?.court?.name} sub={`Lượt: ${stats?.topCourt?.count || 0}`} />
//             <StatCard label="Tỉ lệ đặt thành công" value="--" sub="(Backend trả thêm nếu cần)" />
//           </div>

//           {/* Chart trend */}
//           <Card className="rounded-2xl shadow-sm mb-6">
//             <CardContent className="p-4">
//               <h2 className="font-semibold mb-4 text-lg">Lượt đặt theo ngày</h2>
//               <div className="w-full h-[260px]">
//                 <ResponsiveContainer>
//                   <LineChart data={stats?.hourTrend || []}>
//                     <CartesianGrid />
//                     <XAxis dataKey="date" />
//                     <YAxis />
//                     <Tooltip />
//                     <Line type="monotone" dataKey="count" strokeWidth={2} />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Table top customers */}
//           <Card className="rounded-2xl shadow-sm">
//             <CardContent className="p-4">
//               <h2 className="text-xl font-semibold mb-4">Top khách hàng</h2>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm bg-white rounded-xl">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="text-left p-3">Tên khách</th>
//                       <th className="text-left p-3">Email</th>
//                       <th className="text-left p-3">Số lần đặt</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {stats?.topCustomersList?.map((item, i) => (
//                       <tr key={i} className="border-b">
//                         <td className="p-3 font-medium">{item.user?.name || item.user?.username || "--"}</td>
//                         <td className="p-3 text-gray-500">{item.user?.email || "--"}</td>
//                         <td className="p-3 font-bold">{item.count}</td>
//                       </tr>
//                     )) || (
//                       <tr>
//                         <td className="p-4 text-center text-gray-500" colSpan={3}>Không có dữ liệu</td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </CardContent>
//           </Card>
//         </>
//       )
//     },
//     {
//       key: "customers",
//       label: "Khách hàng",
//       children: <p>Thống kê khách hàng khác nếu cần</p>
//     }
//   ];

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       {/* Header */}
//       <div className="flex justify-between flex-wrap gap-4 mb-6 items-center">
//         <div>
//           <h1 className="text-2xl font-bold">Báo cáo & Thống kê</h1>
//           <p className="text-gray-500 text-sm">Phân tích doanh thu & lượt đặt sân</p>
//         </div>

//         <div className="flex gap-3">
//           <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
//             <FileSpreadsheet /> Xuất Excel
//           </Button>
//           <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
//             <Download /> Xuất PDF
//           </Button>
//         </div>
//       </div>

//       {/* Filter */}
//       <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border mb-6 items-end">
//         <div className="flex flex-col">
//           <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
//           <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-3 py-2 rounded-lg text-sm w-[150px]" />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
//           <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-3 py-2 rounded-lg text-sm w-[150px]" />
//         </div>

//         <Button className="bg-gray-200 hover:bg-gray-300 text-black text-sm px-4 rounded-lg">Làm mới</Button>
//         <Button className="bg-gray-700 hover:bg-gray-800 text-white text-sm px-4 rounded-lg">Xem tất cả</Button>
//       </div>

//       {/* Tabs */}
//       <Tabs items={tabItems} defaultActiveKey="booking" />
//     </div>
//   );
// }

// function StatCard({ label, value, sub }: { label: string; value?: string | null; sub?: string }) {
//   return (
//     <Card className="rounded-2xl shadow-sm">
//       <CardContent className="p-4">
//         <h2 className="text-xs text-gray-500 mb-1">{label}</h2>
//         <p className="text-2xl font-bold">{value || "--"}</p>
//         {sub && <p className="text-sm mt-2 text-gray-600">{sub}</p>}
//       </CardContent>
//     </Card>
//   );
// }

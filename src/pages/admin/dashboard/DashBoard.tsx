// src/pages/admin/dashboard/DashBoard.tsx
import React from 'react';
import {
  CalendarCheck, Goal, DollarSign, UserPlus, ArrowRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Components Con (Tái sử dụng từ code cũ) ---

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  // ... (Giữ nguyên StatCard)
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex items-center justify-between">
    <div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
    <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
      <Icon className={`w-7 h-7 ${color}`} />
    </div>
  </div>
);

const RecentBookings: React.FC = () => {
  const bookings = [
    // ... (Giữ nguyên dữ liệu bookings)
    { customer: 'Nguyễn Văn A', time: '10:00 - 11:00', status: 'Duyệt', field: 'Sân số 1' },
    { customer: 'Trần Thị B', time: '14:00 - 15:00', status: 'Đã xác nhận', field: 'Sân số 1' },
    { customer: 'Phạm Văn C', time: '18:00 - 19:00', status: 'Duyệt', field: 'Sân số 3' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Lịch đặt gần đây</h2>
      <div className="overflow-x-auto">
        {/* ... (Giữ nguyên cấu trúc bảng) */}
        <table className="min-w-full divide-y divide-gray-200">
          {/* ... (thead và tbody) */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sân</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.customer}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.field}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.time}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        booking.status === 'Đã xác nhận'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'Duyệt'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button className="text-green-600 hover:text-green-900 font-medium">Duyệt</button>
                  <button className="text-red-600 hover:text-red-900 font-medium">Hủy</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const revenueData = [
  // ... (Giữ nguyên dữ liệu biểu đồ)
  { name: 'T2', DoanhThu: 4000000 },
  { name: 'T3', DoanhThu: 3000000 },
  { name: 'T4', DoanhThu: 5000000 },
  { name: 'T5', DoanhThu: 4500000 },
  { name: 'T6', DoanhThu: 6000000 },
  { name: 'T7', DoanhThu: 7500000 },
  { name: 'CN', DoanhThu: 5500000 },
];

const StatisticsChart: React.FC = () => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-[350px] flex flex-col">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Thống kê Doanh thu (Tuần)</h2>
    <div className="flex-grow">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={revenueData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis 
            stroke="#6b7280" 
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} 
          />
          <Tooltip formatter={(value: number) => [`${value.toLocaleString()}đ`, 'Doanh thu']} />
          <Line 
            type="monotone" 
            dataKey="DoanhThu" 
            stroke="#10B981" 
            strokeWidth={2} 
            dot={{ stroke: '#059669', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AvailableFields: React.FC = () => (
  // ... (Giữ nguyên AvailableFields)
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Sân trống sắp tới</h2>
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
        <p className="text-gray-700">
          <span className="font-semibold text-green-700">Sân số 2</span>: 17:00 - 18:00
        </p>
        <ArrowRight className="w-5 h-5 text-green-600" />
      </div>
      <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
        <p className="text-gray-700">
          <span className="font-semibold text-green-700">Sân Mini 1</span>: 19:00 - 20:00
        </p>
        <ArrowRight className="w-5 h-5 text-green-600" />
      </div>
    </div>
  </div>
);

// --- Component DashBoard Chính ---

const DashBoard: React.FC = () => {
  return (
    <>
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Tổng lượt đặt lịch hôm nay"
          value="125"
          icon={CalendarCheck}
          color="text-green-600"
        />
        <StatCard
          title="Số sân đang hoạt động"
          value="15"
          icon={Goal}
          color="text-blue-600"
        />
        <StatCard
          title="Tổng doanh thu tuần"
          value="15.000.000đ"
          icon={DollarSign}
          color="text-indigo-600"
        />
        <StatCard
          title="Người dùng mới"
          value="30"
          icon={UserPlus}
          color="text-yellow-600"
        />
      </div>

      {/* 2. Tables and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentBookings />
        </div>
        <div className="lg:col-span-1">
          <StatisticsChart />
        </div>
      </div>

      {/* 3. Available Fields - full width */}
      <div className="mt-6">
        <AvailableFields />
      </div>
    </>
  );
};

export default DashBoard;
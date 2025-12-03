import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart } from "recharts";

const BookingReportPage = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:3000/report/booking-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 grid gap-4">
      <h1 className="text-xl font-bold">Thống kê booking</h1>

      {stats && (
        <>
          {/* 1. Khung giờ hot */}
          <Card className="rounded-2xl shadow p-2">
            <CardContent>
              <p className="text-lg font-semibold">Khung giờ hot nhất</p>
              <p>Giờ: {stats.hotHour?.hour}</p>
              <p>Số lượt đặt: {stats.hotHour?.count}</p>
            </CardContent>
          </Card>

          {/* 2. Khách đặt nhiều nhất */}
          <Card className="rounded-2xl shadow p-2">
            <CardContent>
              <p className="text-lg font-semibold">Khách đặt nhiều nhất</p>
              <p>SĐT: {stats.topUser?.phone}</p>
              <p>Số lần đặt: {stats.topUser?.count}</p>
            </CardContent>
          </Card>

          {/* 3. Sân đặt nhiều nhất */}
          <Card className="rounded-2xl shadow p-2">
            <CardContent>
              <p className="text-lg font-semibold">Sân đặt nhiều nhất</p>
              <p>Tên sân: {stats.topCourt?.courtName}</p>
              <p>Số lượt đặt: {stats.topCourt?.count}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BookingReportPage;

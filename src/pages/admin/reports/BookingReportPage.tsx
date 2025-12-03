import React, { useEffect, useState } from "react";

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
    code?: string;
    type?: string;
  };
  count: number;
}

interface BookingStats {
  hotHour?: HotHour | null;
  topCustomer?: TopCustomer | null;
  topCourt?: TopCourt | null;
}

export default function BookingStatsReportPage() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/api/reports/public/booking-stats"
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Lỗi khi lấy báo cáo");
        }

        setStats(data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Lỗi server");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <p>Đang tải báo cáo...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        📊 Báo cáo
      </h1>

      {/* 1. Khung giờ hot nhất */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>🔥 Khung giờ hot nhất</h2>
        {stats?.hotHour ? (
          <p style={valueStyle}>
            Giờ: <strong>{stats.hotHour.hour}</strong> <br />
            Số lượt đặt: <strong>{stats.hotHour.count}</strong>
          </p>
        ) : (
          <p>Không có dữ liệu</p>
        )}
      </div>

      {/* 2. Khách đặt nhiều nhất */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>👤 Khách đặt nhiều nhất</h2>
        {stats?.topCustomer ? (
          <p style={valueStyle}>
            Khách:{" "}
            <strong>
              {stats.topCustomer.user?.name ||
                stats.topCustomer.user?.username ||
                "Không có tên"}
            </strong>{" "}
            <br />
            Số lượt đặt: <strong>{stats.topCustomer.count}</strong>
          </p>
        ) : (
          <p>Không có dữ liệu</p>
        )}
      </div>

      {/* 3. Sân đặt nhiều nhất */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>🏟 Sân đặt nhiều nhất</h2>
        {stats?.topCourt ? (
          <p style={valueStyle}>
            Sân: <strong>{stats.topCourt.court?.name || "Không có tên"}</strong>{" "}
            <br />
            Số lượt đặt: <strong>{stats.topCourt.count}</strong>
          </p>
        ) : (
          <p>Không có dữ liệu</p>
        )}
      </div>
    </div>
  );
}

/* Styles */
const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  borderRadius: 8,
  marginBottom: 16,
  border: "1px solid #eee",
  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  marginBottom: 8,
};

const valueStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
};

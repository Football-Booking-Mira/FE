import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";

interface Court {
  _id: string;
  name: string;
  type: string;
  status: string;
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  images: string[];
  phone?: string;
  address?: string;
}

const Booking: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🟩 Load danh sách sân
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/courts");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        // Xử lý dữ liệu trả về
        if (data && Array.isArray(data.data)) setCourts(data.data);
        else if (Array.isArray(data)) setCourts(data);
      } catch (err) {
        console.error("Lỗi tải danh sách sân:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourts();
  }, []);

  const handleBooking = (id: string, name: string) => {
    navigate(`/bookingonepage/${id}`, { state: { courtName: name } });
  };

  if (loading)
    return (
      <p className="text-center mt-20 text-gray-500">
        Đang tải danh sách sân...
      </p>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Danh Sách Sân</h1>

      {/* Danh sách sân */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court) => (
          <Card
            key={court._id}
            className="shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all"
          >
            <img
              src={court.images?.[0] || "https://picsum.photos/800/400"}
              alt={court.name}
              className="w-full h-48 object-cover"
            />

            <CardHeader className="flex justify-between items-center">
              <CardTitle>{court.name}</CardTitle>
              {court.status === "locked" ? (
                <Lock className="text-red-500" />
              ) : (
                <Unlock className="text-green-500" />
              )}
            </CardHeader>

            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                {court.description || "Chưa có mô tả"}
              </p>

              <div className="mt-3 text-sm space-y-1">
                <p>
                  <span className="font-semibold">Giá thường:</span>{" "}
                  {court.basePrice}k
                </p>
                <p>
                  <span className="font-semibold">Giờ cao điểm:</span>{" "}
                  {court.peakPrice}k
                </p>
              </div>

              {/* 🕒 Giờ mở cửa */}
              <div className="bg-gray-100 mt-4 p-3 rounded-xl">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  ⏰ Giờ mở cửa
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-700">
                  <span>
                    <strong>Thứ 2 - Thứ 6:</strong> 6:00 - 22:00
                  </span>
                  <span>
                    <strong>Thứ 7:</strong> 6:00 - 23:00
                  </span>
                  <span>
                    <strong>Chủ nhật:</strong> 7:00 - 23:00
                  </span>
                </div>
              </div>

              {/* Nút đặt sân */}
              <Button
                className="mt-4 w-full"
                disabled={court.status === "locked"}
                onClick={() => handleBooking(court._id, court.name)}
              >
                {court.status === "locked" ? "Đang khóa" : "Đặt sân ngay"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Booking;

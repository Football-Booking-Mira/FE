import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";

interface Court {
  _id: string;
  name: string;
  basePrice: number;
  peakPrice: number;
  images: string[];
  description?: string;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const query = useQuery();

  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Lấy thông tin từ query (truyền từ trang chi tiết)
  const selectedDate = query.get("date");
  const selectedTimeSlot = query.get("timeSlot");
  const selectedPrice = query.get("price");
  const selectedName = query.get("name");

  // ✅ Gọi API lấy chi tiết sân
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courts/${id}`);
        const data = await res.json();
        setCourt(data.data);
      } catch (err) {
        console.error("Lỗi tải thông tin sân:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourt();
  }, [id]);

  if (loading)
    return (
      <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>
    );

  if (!court)
    return (
      <p className="text-center mt-10 text-gray-600">Không tìm thấy sân.</p>
    );

  const handleConfirmBooking = () => {
    alert(
      `✅ Xác nhận đặt sân:\n\nSân: ${
        court.name
      }\nNgày: ${selectedDate}\nKhung giờ: ${selectedTimeSlot}\nGiá: ${Number(
        selectedPrice
      ).toLocaleString()}đ`
    );

    // sau này bạn có thể gọi API POST /api/bookings ở đây
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Thông tin sân */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <h2 className="text-xl font-semibold">{court.name}</h2>
          <p className="text-gray-700">
            {court.description || "Không có mô tả chi tiết"}
          </p>
          <p>
            <b>Giá thường:</b> {court.basePrice.toLocaleString()}đ
          </p>
          <p>
            <b>Giá giờ cao điểm:</b> {court.peakPrice.toLocaleString()}đ
          </p>
        </div>
      </div>

      {/* Thông tin đặt sân */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-blue-800 text-lg">
          Thông tin đặt sân
        </h3>
        <p>
          <b>Sân:</b> {selectedName || court.name}
        </p>
        <p>
          <b>Ngày:</b> {selectedDate}
        </p>
        <p>
          <b>Khung giờ:</b> {selectedTimeSlot}
        </p>
        <p>
          <b>Giá:</b> {Number(selectedPrice).toLocaleString()}đ
        </p>
      </div>

      {/* Nút xác nhận */}
      <div className="text-center mt-6">
        <button
          onClick={handleConfirmBooking}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition"
        >
          Xác nhận đặt sân
        </button>
      </div>
    </div>
  );
};

export default Booking;

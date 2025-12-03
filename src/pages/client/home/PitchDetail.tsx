import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import BookingTimeSelector from "@/components/BookingTimeSelector";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Court {
  _id: string;
  name: string;
  type: string;
  formats?: string[] | string;
  location?: string;
  basePrice: number;
  peakPrice: number;
  images: string[];
  address?: string;
  openHours?: string;
  totalCourts?: number;
  amenities?: string[];
}

interface SelectedSlot {
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  duration: number;
}

function formatVNDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const PitchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [currentImage, setCurrentImage] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  // === LẤY CHI TIẾT SÂN ===
  const fetchCourt = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:3000/api/courts/${id}`);
      const data = await res.json();
      if (data?.success && data.data) {
        setCourt(data.data);
        setCurrentImage(0);
      } else {
        toast.error("Không tìm thấy sân!");
        setCourt(null);
      }
    } catch (err) {
      console.error("Lỗi tải sân:", err);
      toast.error("Lỗi tải thông tin sân!");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourt();
  }, [fetchCourt]);

  // === SOCKET REALTIME ===
  useEffect(() => {
    if (!id) return;

    const socket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.emit("join:court", id);

    socket.on("court:updated", (payload: any) => {
      if (payload?.courtId === id && payload.court) {
        setCourt(payload.court);
      }
    });

    return () => {
      socket.emit("leave:court", id);
      socket.off("court:updated");
      socket.disconnect();
    };
  }, [id]);

  // === HANDLE BOOKING MULTI SLOT ===
  const handleBooking = () => {
    if (!selectedSlots.length || !court?._id) {
      toast.error("Vui lòng chọn khung giờ trước khi đặt sân!");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id || !user?.token) {
      toast.error("Vui lòng đăng nhập trước khi đặt sân!");
      navigate("/login");
      return;
    }

    const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedSlots.reduce((sum, s) => sum + s.duration, 0);

    const date = selectedSlots[0].date;

    // Lưu dữ liệu cho FE
    const checkoutData = {
      courtId: court._id,
      date,
      slots: selectedSlots,
      totalPrice,
      totalDuration,
    };

    // LƯU LOCAL STORAGE để BookingPolicyPage xử lý
    localStorage.setItem("checkout-data", JSON.stringify(checkoutData));

    // Chuyển qua trang chính sách
    navigate("/booking-policy");
  };

  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>
    );
  }

  if (!court) {
    return (
      <p className="text-center mt-10 text-gray-600">Không tìm thấy sân.</p>
    );
  }

  const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedSlots.reduce((sum, s) => sum + s.duration, 0);

  const dateDisplay = selectedSlots.length
    ? formatVNDate(new Date(selectedSlots[0].date))
    : "--";
  const timeDisplay = selectedSlots.length
    ? selectedSlots.map((s) => `${s.startTime} - ${s.endTime}`).join(", ")
    : "--";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <ToastContainer newestOnTop />

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
        {/* CỘT TRÁI */}
        <div className="bg-white shadow-sm rounded-2xl p-8 space-y-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {court.name}
          </h1>

          {/* Ảnh sân */}
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow">
              <img
                src={
                  court.images?.[currentImage] ||
                  court.images?.[0] ||
                  "https://picsum.photos/1200/600"
                }
                className="w-full h-[400px] object-cover"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {court.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  className={`w-28 h-20 object-cover rounded-lg cursor-pointer border-2 ${
                    currentImage === idx
                      ? "border-green-600"
                      : "border-gray-300 hover:border-green-400"
                  }`}
                  onClick={() => setCurrentImage(idx)}
                />
              ))}
            </div>
          </div>

          {/* SELECT TIME */}
          <BookingTimeSelector
            courtId={court._id}
            basePrice={court.basePrice}
            peakPrice={court.peakPrice}
            onSlotSelected={(slots) => setSelectedSlots(slots)}
          />
        </div>

        {/* CỘT PHẢI: SUMMARY */}
        <div className="bg-white shadow rounded-2xl p-8 border border-gray-200 h-fit">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Tóm tắt đặt sân
          </h3>

          <div className="space-y-3 text-gray-700 text-[15px]">
            <div className="flex justify-between border-b pb-1">
              <span>Ngày:</span>
              <span className="font-semibold">{dateDisplay}</span>
            </div>

            <div className="flex justify-between border-b pb-1">
              <span>Khung giờ:</span>
              <span className="font-semibold">{timeDisplay}</span>
            </div>

            <div className="flex justify-between border-b pb-1">
              <span>Tổng thời lượng:</span>
              <span>{totalDuration / 60} giờ</span>
            </div>

            <div className="flex justify-between items-center font-bold text-xl text-green-700 border-t pt-3">
              <span>Tổng tiền:</span>
              <span>{totalPrice.toLocaleString("vi-VN")} VNĐ</span>
            </div>
          </div>

          <button
            onClick={handleBooking}
            disabled={!selectedSlots.length}
            className={`w-full mt-6 py-3 rounded-lg font-bold transition ${
              selectedSlots.length
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            Đặt sân
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchDetail;

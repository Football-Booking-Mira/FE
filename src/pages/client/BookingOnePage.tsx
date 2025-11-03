import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Court {
  _id: string;
  name: string;
  basePrice: number;
  peakPrice: number;
  images: string[];
}

interface Slot {
  startTime: string;
  endTime: string;
  status: "available" | "booked";
}

const BookingOnePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string>("");
  const [currentImage, setCurrentImage] = useState(0);

  // 🟩 Load thông tin sân
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/courts/${id}`);
        const data = await res.json();
        setCourt(data.data);
      } catch (err) {
        console.error("Lỗi tải sân:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourt();
  }, [id]);

  // 🟨 Lấy danh sách khung giờ khả dụng
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/bookings/available?courtId=${id}&date=${selectedDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        } else {
          // Dữ liệu mẫu nếu chưa có API
          const temp: Slot[] = [];
          for (let h = 6; h < 22; h++) {
            temp.push({
              startTime: `${h.toString().padStart(2, "0")}:00`,
              endTime: `${(h + 1).toString().padStart(2, "0")}:00`,
              status: Math.random() > 0.6 ? "booked" : "available",
            });
          }
          setSlots(temp);
        }
      } catch (err) {
        console.error("Lỗi tải khung giờ:", err);
      }
    };
    fetchSlots();
  }, [id, selectedDate]);

  // 🟧 Đặt sân
  const handleBooking = () => {
    setNotification(
      "⚙️ Chức năng đang được phát triển. Vui lòng quay lại sau!"
    );
  };

  // 🟥 Khi click slot
  const handleSlotClick = (slot: Slot) => {
    if (slot.status === "booked") {
      setNotification("❌ Khung giờ này đã được đặt!");
      return;
    }
    setSelectedSlot(slot);
    setNotification("");
  };

  if (loading)
    return (
      <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>
    );

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 bg-gray-50 min-h-screen">
      {court && (
        <>
          {/* 🏷️ Tiêu đề */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-green-700 mb-2">
              Đặt sân {court.name}
            </h1>
            <p className="text-gray-500">
              Chọn ngày và khung giờ phù hợp để đặt sân nhanh chóng
            </p>
          </div>

          {/* 🖼️ Ảnh sân – hiển thị 3 ảnh, khách bấm xem ảnh lớn */}
          <div className="mb-10">
            {/* Ảnh chính */}
            <div className="rounded-2xl overflow-hidden shadow-lg mb-4">
              <img
                src={
                  court.images?.[currentImage] ||
                  "https://picsum.photos/1000/500"
                }
                alt={`Ảnh sân ${currentImage + 1}`}
                className="w-full h-[400px] object-cover rounded-2xl transition-all duration-300 hover:scale-[1.02]"
              />
            </div>

            {/* Ảnh nhỏ (thumbnail) */}
            <div className="flex justify-center gap-4">
              {court.images?.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Ảnh nhỏ ${idx + 1}`}
                  className={`w-32 h-24 object-cover rounded-xl cursor-pointer border-4 transition-all duration-300 ${
                    currentImage === idx
                      ? "border-green-600 scale-105"
                      : "border-transparent hover:scale-105 hover:opacity-90"
                  }`}
                  onClick={() => setCurrentImage(idx)}
                />
              ))}

              {/* Nếu có ít hơn 3 ảnh, hiển thị ảnh mẫu */}
              {(!court.images || court.images.length === 0) && (
                <>
                  <img
                    src="https://picsum.photos/200/120?1"
                    className="w-32 h-24 object-cover rounded-xl"
                  />
                  <img
                    src="https://picsum.photos/200/120?2"
                    className="w-32 h-24 object-cover rounded-xl"
                  />
                  <img
                    src="https://picsum.photos/200/120?3"
                    className="w-32 h-24 object-cover rounded-xl"
                  />
                </>
              )}
            </div>
          </div>

          {/* 📅 Chọn ngày */}
          <div className="flex justify-center items-center mb-6">
            <label className="font-medium text-lg mr-3 text-gray-700">
              Chọn ngày:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
            />
          </div>

          {/* 🕓 Khung giờ */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold text-green-700 mb-4 text-center">
              Chọn khung giờ bạn muốn
            </h2>

            {/* 🟨 Thông báo */}
            {notification && (
              <div
                className={`mb-4 text-center py-2 px-4 rounded-lg font-medium ${
                  notification.includes("✅")
                    ? "bg-green-100 text-green-700"
                    : notification.includes("❌")
                    ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {notification}
              </div>
            )}

            {/* ⏰ Danh sách khung giờ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.startTime}
                  onClick={() => handleSlotClick(slot)}
                  className={`p-3 text-center rounded-lg border transition-all duration-200 font-medium ${
                    slot.status === "booked"
                      ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed"
                      : selectedSlot?.startTime === slot.startTime
                      ? "bg-green-600 text-white border-green-700 shadow-md scale-105"
                      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:shadow"
                  }`}
                >
                  {slot.startTime} - {slot.endTime}
                </div>
              ))}
            </div>
          </div>

          {/* 🔘 Nút xác nhận */}
          <div className="mt-8 text-center">
            <button
              onClick={handleBooking}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-10 py-3 rounded-full shadow-md transition transform hover:scale-105"
            >
              Xác nhận đặt sân
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingOnePage;

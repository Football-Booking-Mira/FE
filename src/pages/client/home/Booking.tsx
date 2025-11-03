import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string>("");
  const [currentImage, setCurrentImage] = useState(0);

  const navigate = useNavigate();

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

  const handleBooking = () => {
    if (!selectedSlot) {
      setNotification("⚠️ Vui lòng chọn khung giờ trước khi đặt sân!");
      return;
    }
    const totalPrice = court?.basePrice || 350000;

    navigate("/checkout", {
      state: {
        courtName: court?.name || "Sân không xác định",
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        totalPrice,
      },
    });
  };

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
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {court && (
        <>
          {/* 🏷️ Header */}
          <h1 className="text-3xl font-bold text-gray-800">{court.name}</h1>
          <p className="text-gray-600 mb-6">Nam Từ liên Hà Nội</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trái: Carousel ảnh */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-lg overflow-hidden shadow-lg">
                <img
                  src={
                    court.images?.[currentImage] ||
                    `https://picsum.photos/1000/500?random=${currentImage}`
                  }
                  alt={`Sân ${currentImage + 1}`}
                  className="w-full h-80 object-cover"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {court.images?.map((img, idx) => (
                  <img
                    key={idx}
                    src={img || `https://picsum.photos/200/120?random=${idx}`}
                    alt={`Thumbnail ${idx + 1}`}
                    className={`w-24 h-16 object-cover rounded-lg cursor-pointer border-2 ${
                      currentImage === idx
                        ? "border-green-600"
                        : "border-gray-300 hover:border-gray-500"
                    }`}
                    onClick={() => setCurrentImage(idx)}
                  />
                ))}
              </div>
            </div>

            {/* Phải: Thông tin sân */}
            <div className="bg-white p-6 rounded-2xl shadow space-y-4">
              <div className="flex justify-between text-gray-700">
                <span>Đánh giá:</span>
                <span className="font-semibold text-yellow-500">
                  {/* 4/5 (1 đánh giá) */}
                </span>
              </div>

              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Giờ mở cửa:</span> 6h - 23h
                </p>

                <p>
                  <span className="font-semibold">Giá sân:</span>{" "}
                  {court.basePrice?.toLocaleString()} đ
                </p>
                <p>
                  <span className="font-semibold">Giá sân giờ vàng:</span>{" "}
                  {court.peakPrice?.toLocaleString()} đ
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Dịch vụ tiện ích</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Wifi",
                    "Bãi đỗ xe oto",
                    "Bãi đỗ xe máy",
                    "Căng tin",
                    "Trà đá",
                    "Đồ ăn",
                    "Nước uống",
                  ].map((service) => (
                    <span
                      key={service}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chọn ngày & khung giờ */}
          <div className="bg-white p-6 rounded-2xl shadow space-y-6">
            {/* Ngày */}
            <div className="flex items-center gap-3">
              <label className="font-medium text-gray-700">Chọn ngày:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring focus:ring-gray-400 outline-none"
              />
            </div>

            {/* Khung giờ */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Chọn khung giờ
              </h2>

              {notification && (
                <div
                  className={`text-center py-2 px-4 rounded font-medium ${
                    notification.includes("❌")
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {notification}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {slots.map((slot) => (
                  <div
                    key={slot.startTime}
                    onClick={() => handleSlotClick(slot)}
                    className={`p-3 text-center rounded border font-medium cursor-pointer ${
                      slot.status === "booked"
                        ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed"
                        : selectedSlot?.startTime === slot.startTime
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {slot.startTime} - {slot.endTime}
                  </div>
                ))}
              </div>
            </div>

            {/* Nút đặt sân */}
            <div className="text-center">
              <button
                onClick={handleBooking}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-10 py-3 rounded-xl shadow transition"
              >
                Xác nhận đặt sân
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Booking;

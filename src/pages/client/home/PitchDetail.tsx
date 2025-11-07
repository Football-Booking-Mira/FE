import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface Court {
  _id: string;
  name: string;
  basePrice: number;
  peakPrice: number;
  images: string[];
  address?: string;
  openHours?: string;
  totalCourts?: number;
  amenities?: string[];
}

const WEEK_DAYS_VN = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

const TIME_SLOTS = [
  "08:00 - 10:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "18:00 - 20:00",
  "20:00 - 22:00",
];

const PRICE_MAP: Record<string, number> = {
  "08:00 - 10:00": 300000,
  "14:00 - 16:00": 300000,
  "16:00 - 18:00": 400000,
  "18:00 - 20:00": 400000,
  "20:00 - 22:00": 400000,
};

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
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [currentImage, setCurrentImage] = useState(0);

  // --- 🗓️ Tuần hiện tại ---
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay() === 0 ? 7 : today.getDay(); // CN là 7
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1));
    return monday;
  });

  const getWeekDates = (start: Date) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

  const [dateRange, setDateRange] = useState<Date[]>(getWeekDates(weekStart));

  // Khi đổi tuần => cập nhật lại range ngày
  useEffect(() => {
    setDateRange(getWeekDates(weekStart));
  }, [weekStart]);

  // Chuyển tuần
  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  // Tải dữ liệu sân
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courts/${id}`);
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

  const handleSlotClick = (date: Date, slot: string) => {
    const [startTime, endTime] = slot.split(" - ");
    setSelectedSlot({
      date: date.toISOString().slice(0, 10),
      startTime,
      endTime,
    });
  };

  const handleBooking = () => {
    if (!selectedSlot || !court?._id) return;
    navigate(
      `/booking/${court._id}?date=${
        selectedSlot.date
      }&timeSlot=${encodeURIComponent(
        `${selectedSlot.startTime} - ${selectedSlot.endTime}`
      )}`
    );
  };

  if (loading)
    return (
      <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>
    );

  if (!court)
    return (
      <p className="text-center mt-10 text-gray-600">Không tìm thấy sân.</p>
    );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 🏷️ Header */}
      <h1 className="text-3xl font-bold text-gray-800">{court.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trái: Ảnh */}
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
                    ? "border-blue-600"
                    : "border-gray-300 hover:border-gray-500"
                }`}
                onClick={() => setCurrentImage(idx)}
              />
            ))}
          </div>
        </div>

        {/* Phải: Thông tin sân */}
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <h2 className="font-semibold">Thông tin sân:</h2>
          <p>
            <span className="font-semibold">Giờ mở cửa:</span>{" "}
            {court.openHours || "08.00h - 22.00h"}
          </p>
          <p>
            <span className="font-semibold">Giá sân:</span>{" "}
            {court.basePrice?.toLocaleString() || "—"} đ
          </p>
          <p>
            <span className="font-semibold">Giá sân giờ vàng:</span>{" "}
            {court.peakPrice?.toLocaleString() || "—"} đ
          </p>
          <div className="space-y-2">
            <p className="font-semibold">Dịch vụ tiện ích:</p>
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

      {/* --- 🗓️ Thanh chọn tuần --- */}
      <div className="flex justify-center items-center gap-4 mt-10">
        <button
          onClick={handlePrevWeek}
          className="px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200"
        >
          ◀
        </button>
        <div className="font-semibold text-gray-700">
          {formatVNDate(dateRange[0])} -{" "}
          {formatVNDate(dateRange[dateRange.length - 1])}
        </div>
        <button
          onClick={handleNextWeek}
          className="px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200"
        >
          ▶
        </button>
      </div>

      {/* --- Bảng khung giờ --- */}
      <div className="bg-white p-6 rounded-2xl shadow space-y-6 mt-6 overflow-x-auto">
        <div className="grid grid-cols-[120px_repeat(5,1fr)] border border-gray-300 rounded-lg">
          {dateRange.map((date, i) => (
            <React.Fragment key={i}>
              {/* Cột ngày */}
              <div
                className={`flex flex-col justify-center items-center border-b border-r border-gray-300 py-4 text-sm font-semibold ${
                  selectedSlot?.date === date.toISOString().slice(0, 10)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <div>{WEEK_DAYS_VN[i % 7]}</div>
                <div className="mt-1 text-xs">{formatVNDate(date)}</div>
              </div>

              {/* Cột khung giờ */}
              {TIME_SLOTS.map((slot) => {
                const price = PRICE_MAP[slot];
                const isSelected =
                  selectedSlot?.date === date.toISOString().slice(0, 10) &&
                  selectedSlot?.startTime === slot.split(" - ")[0];

                return (
                  <button
                    key={`${date}-${slot}`}
                    onClick={() => handleSlotClick(date, slot)}
                    className={`border-b border-r border-gray-300 p-3 text-xs text-center transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-white hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-medium">{slot}</div>
                    <div className="text-gray-600 text-[12px] font-normal mt-1">
                      {price.toLocaleString("vi-VN")}đ
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Nút đặt sân */}
      <div className="text-center">
        <button
          onClick={handleBooking}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-3 rounded-xl shadow transition"
        >
          Đặt sân ngay
        </button>
      </div>
    </div>
  );
};

export default PitchDetail;

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface Court {
  _id: string;
  name: string;
  type: string;
  formats?: string[];
  location?: string;

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

const PEAK_SLOTS = ["16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"];

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
    price: number;
  } | null>(null);
  const [currentImage, setCurrentImage] = useState(0);

  // Tuần hiện tại
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay() === 0 ? 7 : today.getDay();
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

  useEffect(() => {
    setDateRange(getWeekDates(weekStart));
  }, [weekStart]);

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

  // Gọi API BE
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

  // Chọn khung giờ
  const handleSlotClick = (date: Date, slot: string) => {
    if (!court) return;
    const [startTime, endTime] = slot.split(" - ");
    const isPeak = PEAK_SLOTS.includes(slot);
    const price = isPeak ? court.peakPrice : court.basePrice;

    setSelectedSlot({
      date: date.toISOString().slice(0, 10),
      startTime,
      endTime,
      price,
    });
  };

  // Chuyển sang trang booking
  const handleBooking = () => {
    if (!selectedSlot || !court?._id) return;

    const params = new URLSearchParams({
      date: selectedSlot.date,
      timeSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
      price: selectedSlot.price.toString(),
      name: court.name,
    });

    navigate(`/booking/${court._id}?${params.toString()}`);
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
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">{court.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ảnh sân */}
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

          {/* Thông tin sân */}
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md rounded-2xl p-6 space-y-5 font-sans text-gray-800">
            <h2 className="text-lg font-semibold text-green-700 border-l-4 border-green-500 pl-3">
              <b> Thông tin sân</b>
            </h2>

            <div className="bg-gray-100 p-6 rounded-2xl shadow space-y-3 text-sm text-gray-100">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-semibold text-gray-700">
                  Định dạng sân:{" "}
                </span>
                <span className="text-gray-900">
                  <b>{court.formats || "7v7"}</b>
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-semibold text-gray-700">
                  Địa chỉ sân:{" "}
                </span>
                <span className="text-gray-900">
                  <b>{court.location || "Chưa cập nhật"}</b>
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-semibold text-gray-700">Giờ mở cửa:</span>
                <span className="text-gray-900">
                  <b>{court.openHours || "08.00h - 22.00h"}</b>
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-semibold text-gray-700">Giá thường:</span>
                <span className="text-green-700 font-medium">
                  <b> {court.basePrice?.toLocaleString() || "800,000"}đ</b>
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Giá giờ cao điểm:
                </span>
                <span className="text-red-600 font-medium">
                  <b>{court.peakPrice?.toLocaleString() || "1,250,000"}đ</b>
                </span>
              </div>
            </div>

            <div className="pt-2">
              <p className="font-semibold text-gray-700 mb-2">
                <b>Dịch vụ tiện ích:</b>
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Wifi",
                  "Bãi đỗ xe oto",
                  "Bãi đỗ xe máy",
                  "Trà đá",
                  "Đồ ăn",
                  "Nước uống",
                ].map((service) => (
                  <span
                    key={service}
                    className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-xs font-medium shadow-sm hover:bg-green-100 transition"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {selectedSlot && (
              <div className="mt-4 bg-gray-100 border border-gray-100 text-green -800 p-4 rounded-xl text-sm shadow-inner">
                <p className="flex justify-between border-b border-gray-100 pb-1">
                  Ngày: <b>{selectedSlot.date}</b>
                </p>
                <p className="flex justify-between border-b border-gray-100 pb-1">
                  Khung giờ:{" "}
                  <b>
                    {selectedSlot.startTime}h - {selectedSlot.endTime}h{" "}
                  </b>
                </p>
                <p className="flex justify-between border-b border-gray-100 pb-1 text-red-600">
                  Giá: <b>{selectedSlot.price.toLocaleString()}đ</b>
                </p>
              </div>
            )}
          </div>
        </div>

        {/*  Bảng khung giờ */}
        <div className="flex justify-center items-center gap-4 mt-6 mb-2">
          <button
            onClick={handlePrevWeek}
            className="px-4 py-2 rounded-full bg-white shadow border border-gray-300 hover:bg-gray-50"
          >
            ◀
          </button>
          <div className="font-semibold text-gray-800 bg-white px-4 py-2 rounded-full shadow">
            {formatVNDate(dateRange[0])} -{" "}
            {formatVNDate(dateRange[dateRange.length - 1])}
          </div>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 rounded-full bg-white shadow border border-gray-300 hover:bg-gray-50"
          >
            ▶
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow space-y-6 mt-6 overflow-x-auto">
          <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-[6px]">
            {dateRange.map((date, i) => {
              const now = new Date();
              const isPastDay = date.setHours(23, 59, 59, 999) < now.getTime();

              return (
                <React.Fragment key={i}>
                  {/* Cột ngày */}
                  <div
                    className={`flex flex-col justify-center items-center py-4 text-sm font-semibold rounded-lg shadow-sm border border-gray-200 ${
                      selectedSlot?.date === date.toISOString().slice(0, 10)
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div>{WEEK_DAYS_VN[i % 7]}</div>
                    <div className="mt-1 text-xs">{formatVNDate(date)}</div>
                  </div>

                  {/* Các khung giờ */}
                  {TIME_SLOTS.map((slot) => {
                    const isPeak = PEAK_SLOTS.includes(slot);
                    const price = isPeak ? court.peakPrice : court.basePrice;
                    const isSelected =
                      selectedSlot?.date === date.toISOString().slice(0, 10) &&
                      selectedSlot?.startTime === slot.split(" - ")[0];

                    const [startTime, endTime] = slot.split(" - ");
                    const [endHour, endMinute] = endTime.split(":").map(Number);
                    const slotEnd = new Date(date);
                    slotEnd.setHours(endHour, endMinute, 0, 0);

                    const isExpired = slotEnd < now || isPastDay;

                    return (
                      <button
                        key={`${date}-${slot}`}
                        onClick={() =>
                          !isExpired && handleSlotClick(date, slot)
                        }
                        disabled={isExpired}
                        className={`p-3 text-xs text-center rounded-lg border border-gray-200 transition-all duration-150 ease-in-out shadow-sm
                ${
                  isSelected
                    ? "bg-green-500 text-white scale-[1.02] shadow-md"
                    : isExpired
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-blue-50 text-gray-800"
                }`}
                      >
                        <div className="font-medium">
                          {slot}
                          {isExpired && (
                            <div className="text-[11px] text-gray-500 font-normal mt-0.5">
                              Quá hạn
                            </div>
                          )}
                        </div>

                        {/* Ẩn giá khi quá hạn */}
                        {!isExpired && (
                          // <div
                          //   className={`text-[12px] mt-1 ${
                          //     isPeak
                          //       ? "text-red-600 font-semibold"
                          //       : "text-gray-700"
                          //   }`}
                          // >
                          <div
                            className={`text-[12px] mt-1 ${
                              isSelected
                                ? "text-white"
                                : isPeak
                                ? "text-red-600 font-semibold"
                                : "text-gray-600"
                            }`}
                          >
                            {price.toLocaleString("vi-VN")}đ
                          </div>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleBooking}
            disabled={!selectedSlot}
            className={`font-bold px-10 py-3 rounded-xl shadow transition ${
              selectedSlot
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

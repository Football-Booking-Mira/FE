import api from "@/common/utils/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError(err.response.data.message);
        } else {
          setError("Có lỗi xảy ra.");
        }
      });
  }, [id]);

  if (error) {
    return (
      <div className="text-center text-red-600 mt-10 text-xl">{error}</div>
    );
  }

  if (!booking) return <p>Đang tải...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Chi tiết đơn đặt sân</h1>

      <p>
        <strong>Sân:</strong> {booking.pitch?.name}
      </p>
      <p>
        <strong>Người đặt:</strong> {booking.user?.name}
      </p>
      <p>
        <strong>Thời gian:</strong>
        {new Date(booking.startTime).toLocaleString()}
        {" -> "}
        {new Date(booking.endTime).toLocaleString()}
      </p>
      <p>
        <strong>Giá:</strong> {booking.price}
      </p>
      <p>
        <strong>Trạng thái:</strong> {booking.status}
      </p>
    </div>
  );
}

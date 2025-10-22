import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Court {
  _id: string;
  name: string;
  address: string;
  type: string;
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CourtDetail() {
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // ✅ Gọi API lấy thông tin sân
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courts/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.message || "Lỗi tải dữ liệu");

        setCourt(data.data);
        setDescription(data.data.description || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourt();
  }, [id]);

  // ✅ Lưu mô tả mới
  const handleSave = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/courts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = await res.json();

      if (!res.ok || !result.success)
        throw new Error(result.message || "Không thể cập nhật mô tả");

      alert("✅ Cập nhật mô tả thành công!");
    } catch (err: any) {
      alert("❌ Lỗi khi cập nhật: " + err.message);
    }
  };

  if (loading)
    return <p className="p-6 text-gray-600">⏳ Đang tải dữ liệu...</p>;
  if (error) return <p className="p-6 text-red-600">Lỗi: {error}</p>;
  if (!court) return <p className="p-6 text-gray-600">Không tìm thấy sân</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-green-700 mb-6">
        🏟️ Chi tiết sân bóng
      </h1>

      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow">
        <div>
          <p className="text-gray-600">Tên sân</p>
          <input
            value={court.name}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100"
          />

          <p className="text-gray-600 mt-4">Địa chỉ</p>
          <input
            value={court.address}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100"
          />

          <p className="text-gray-600 mt-4">Hình thức</p>
          <input
            value={court.formats}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100"
          />
        </div>

        <div>
          <p className="text-gray-600">Giá cơ bản (VNĐ/giờ)</p>
          <input
            value={court.basePrice}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100"
          />

          <p className="text-gray-600 mt-4">Giá cao điểm (VNĐ/giờ)</p>
          <input
            value={court.peakPrice}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100"
          />

          <p className="text-gray-600 mt-4">Trạng thái</p>
          <span
            className={`px-4 py-2 rounded-full text-white ${
              court.type === "indoor" ? "bg-green-500" : "bg-yellow-500"
            }`}
          >
            {court.type === "indoor" ? "Trong nhà" : "Ngoài trời"}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 mt-8 rounded-2xl shadow">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          📝 Mô tả sân
        </h2>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Nhập mô tả chi tiết về sân..."
          rows={6}
          className="w-full border rounded-lg px-3 py-2"
        />

        <button
          onClick={handleSave}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          💾 Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

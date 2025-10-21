import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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

  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courts/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
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

  const handleSave = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/courts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = await res.json();
      alert(result.message || "Cập nhật thành công!");
    } catch (err) {
      alert("Lỗi khi cập nhật sân bóng!");
    }
  };

  if (loading) return <p className="text-center mt-10">Đang tải dữ liệu...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!court) return <p className="text-center mt-10">Không tìm thấy sân</p>;

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
        <ReactQuill
          theme="snow"
          value={description}
          onChange={setDescription}
          placeholder="Nhập mô tả chi tiết về sân..."
          className="bg-white"
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

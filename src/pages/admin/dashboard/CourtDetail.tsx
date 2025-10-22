import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "http://localhost:3000/api";

interface Court {
  _id: string;
  name: string;
  address: string;
  type: string; // "indoor" | "outdoor"
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  amenities: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function CourtDetail() {
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [originalCourt, setOriginalCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // fetch court
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/courts/${id}`);
        const data = await res.json();
        if (!res.ok) {
          // try to read message from body
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        const payload = data?.data ?? data;
        // ensure numeric fields are numbers
        const normalized: Court = {
          ...payload,
          basePrice: Number(payload.basePrice ?? 0),
          peakPrice: Number(payload.peakPrice ?? 0),
          description: payload.description ?? "",
          amenities: payload.amenities ?? [],
        };
        setCourt(normalized);
        setOriginalCourt(normalized);
        setDescription(normalized.description ?? "");
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchCourt();
  }, [id]);

  const handleChange = (field: keyof Court, value: any) => {
    setCourt((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // small util to check if form changed
  const isDirty = () => {
    if (!court || !originalCourt) return false;
    // ignore timestamps when comparing
    const a = { ...court };
    const b = { ...originalCourt };
    delete (a as any).createdAt;
    delete (a as any).updatedAt;
    delete (b as any).createdAt;
    delete (b as any).updatedAt;
    return (
      JSON.stringify(a) !== JSON.stringify(b) ||
      description !== (originalCourt.description ?? "")
    );
  };

  const handleSave = async () => {
    if (!court) return;
    // basic validation
    if (!court.name || court.name.trim().length === 0) {
      alert("Vui lòng nhập tên sân.");
      return;
    }
    if (court.basePrice < 0 || court.peakPrice < 0) {
      alert("Giá không được nhỏ hơn 0.");
      return;
    }

    try {
      setSaving(true);
      const bodyToSend = { ...court, description };
      const res = await fetch(`${API_BASE}/courts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyToSend),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.message || `HTTP ${res.status}`);
      }
      // success — update original snapshot
      setOriginalCourt({ ...court, description });
      alert(result?.message ?? "Cập nhật thành công!");
    } catch (err: any) {
      alert("Lỗi khi cập nhật: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6">⏳ Đang tải dữ liệu...</p>;
  if (error) return <p className="p-6 text-red-600">Lỗi: {error}</p>;
  if (!court) return <p className="p-6">Không tìm thấy sân</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-green-700 mb-6">
        🏟️ Chỉnh sửa sân bóng
      </h1>

      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow">
        <div>
          <label className="text-gray-600 block">Tên sân</label>
          <input
            value={court.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />

          <label className="text-gray-600 mt-4 block">Địa chỉ</label>
          <input
            value={court.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />

          <label className="text-gray-600 mt-4 block">Hình thức</label>
          <input
            value={court.formats}
            onChange={(e) => handleChange("formats", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="text-gray-600 block">Giá cơ bản (VNĐ/giờ)</label>
          <input
            type="number"
            value={court.basePrice}
            onChange={(e) => handleChange("basePrice", Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2"
          />

          <label className="text-gray-600 mt-4 block">
            Giá cao điểm (VNĐ/giờ)
          </label>
          <input
            type="number"
            value={court.peakPrice}
            onChange={(e) => handleChange("peakPrice", Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2"
          />

          <label className="text-gray-600 mt-4 block">Loại sân</label>
          <select
            value={court.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="indoor">Trong nhà</option>
            <option value="outdoor">Ngoài trời</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 mt-8 rounded-2xl shadow">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          📝 Mô tả sân
        </h2>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Nhập mô tả chi tiết về sân..."
        />

        <div className="flex items-center justify-between mt-6">
          <div>
            <button
              disabled={!isDirty() || saving}
              onClick={handleSave}
              className={`px-6 py-2 rounded-lg text-white ${
                !isDirty() || saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {isDirty() ? "Có thay đổi chưa lưu" : "Không có thay đổi"}
          </div>
        </div>
      </div>
    </div>
  );
}

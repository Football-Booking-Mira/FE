import React, { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ErrorBoundary from "@/common/components/ErrorBoundary";
import "react-quill/dist/quill.snow.css";

const ReactQuill = lazy(() => import("react-quill"));

interface Court {
  _id: string;
  name: string;
  address: string;
  type: string;
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  images: string[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CourtDetail() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");

  //  Lấy dữ liệu chi tiết sân
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const res = await fetch(`${API_URL}/courts/${id}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Lỗi khi tải dữ liệu");
        setCourt(data.data);
        setDescription(data.data.description || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchCourt();
  }, [id]);

  //  Hàm lưu mô tả
  const handleSave = async () => {
    try {
      const res = await fetch(`${API_URL}/courts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khi cập nhật");
      alert(" Lưu mô tả thành công!");
    } catch (err: any) {
      alert(" " + err.message);
    }
  };

  if (loading)
    return (
      <p className="text-gray-500 text-center mt-10">Đang tải dữ liệu...</p>
    );
  if (error)
    return <p className="text-red-500 text-center mt-10">Lỗi: {error}</p>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-green-700 mb-6">
          Chi tiết sân: {court?.name}
        </h1>

        <div className="space-y-3 text-gray-800 mb-6">
          <p>
            <strong className="text-gray-700">Địa chỉ:</strong> {court?.address}
          </p>
          <p>
            <strong className="text-gray-700">Loại sân:</strong> {court?.type}
          </p>
          <p>
            <strong className="text-gray-700">Giá cơ bản:</strong>{" "}
            {court?.basePrice?.toLocaleString()} VND / giờ
          </p>
          <p>
            <strong className="text-gray-700">Giá cao điểm:</strong>{" "}
            {court?.peakPrice?.toLocaleString()} VND / giờ
          </p>
          <p>
            <strong className="text-gray-700">Hình thức:</strong>{" "}
            {court?.formats}
          </p>
        </div>

        <hr className="my-4" />

        <h2 className="text-lg font-semibold mb-3 text-green-700">
          Mô tả sân bóng
        </h2>

        <ErrorBoundary
          fallback={
            <textarea
              className="w-full min-h-[200px] p-3 border rounded-lg bg-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết về sân..."
            />
          }
        >
          <Suspense
            fallback={
              <textarea
                className="w-full min-h-[200px] p-3 border rounded-lg bg-white"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Đang tải trình soạn thảo..."
              />
            }
          >
            {/* If ReactQuill throws (e.g. findDOMNode removed), ErrorBoundary will show the textarea fallback */}
            <ReactQuill
              theme="snow"
              value={description}
              onChange={setDescription}
              placeholder="Nhập mô tả chi tiết về sân..."
              className="bg-white rounded-lg"
            />
          </Suspense>
        </ErrorBoundary>

        <button
          onClick={handleSave}
          className="mt-6 bg-[#27AE60] hover:bg-[#2ECC71] text-white font-semibold px-6 py-2 rounded-lg shadow-md transition"
        >
          Lưu mô tả
        </button>
      </div>
    </div>
  );
}

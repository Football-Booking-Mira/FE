import React, { useEffect, useState } from "react";
import axios from "axios";
import { rootRoutes } from "@routes/index";
import { useRoutes } from "react-router";
import { AuthProvider } from "@/common/contexts";

function App() {
  const router = useRoutes(rootRoutes);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/courts")
      .then((res) => {
        console.log("API response:", res.data);

        // Tùy theo cấu trúc dữ liệu trả về của backend
        // Ưu tiên các key phổ biến: courts / data / results
        const data =
          res.data?.courts || res.data?.data || res.data?.results || [];

        if (Array.isArray(data)) {
          setCourts(data);
        } else {
          console.warn("Dữ liệu không phải mảng:", data);
          setCourts([]);
        }
      })
      .catch((err) => {
        console.error("Lỗi API:", err);
        setCourts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthProvider>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Danh sách sân</h1>

        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : Array.isArray(courts) && courts.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {courts.map((court: any) => (
              <div key={court._id} className="border rounded-lg p-4 shadow">
                {/* Hiển thị ảnh (nếu có) */}
                {court.images?.length > 0 && (
                  <img
                    src={court.images[0]}
                    alt={court.name}
                    className="w-full h-40 object-cover rounded"
                  />
                )}

                <h2 className="text-lg font-semibold mt-2">{court.name}</h2>
                <p>Mã sân: {court.code}</p>
                <p>Loại sân: {court.type}</p>
                <p>
                  Giá cơ bản:{" "}
                  {court.basePrice
                    ? court.basePrice.toLocaleString()
                    : "Chưa có"}
                  ₫
                </p>
                <p>
                  Giá cao điểm:{" "}
                  {court.peakPrice
                    ? court.peakPrice.toLocaleString()
                    : "Chưa có"}
                  ₫
                </p>
                <p>Định dạng: {court.formats || "Không rõ"}</p>
                <p className="text-gray-600 text-sm">{court.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Không có sân nào để hiển thị.</p>
        )}
      </div>

      {/* Giữ router để không mất route của app */}
      {router}
    </AuthProvider>
  );
}

export default App;

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Court {
  _id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  images: string[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export default function PitchDetail() {
  const { id } = useParams<{ id: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchCourt = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courts/${id}`);
        if (!res.ok) throw new Error("Không tìm thấy sân");
        const data = await res.json();
        setCourt(data.data);
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchCourt();
  }, [id]);

  if (loading)
    return (
      <p className="text-center mt-20 text-gray-500">Đang tải dữ liệu sân...</p>
    );
  if (error) return <p className="text-center mt-20 text-red-500">{error}</p>;
  if (!court)
    return (
      <p className="text-center mt-20 text-gray-500">Không có dữ liệu sân.</p>
    );

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* HEADER */}
      <header className="bg-green-600 text-white px-8 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-2xl font-bold"> Chi tiết sân</h1>
        <a href="/" className="hover:text-yellow-400 transition">
          Trang chủ
        </a>
      </header>

      {/* NỘI DUNG CHI TIẾT */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* ẢNH */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <img
            src={court.images?.[0] || "https://picsum.photos/600/400"}
            alt={court.name}
            className="rounded-2xl shadow-lg object-cover w-full h-80"
          />
          <div>
            <h2 className="text-3xl font-bold text-green-700 mb-3">
              {court.name}
            </h2>
            <p className="text-gray-600 mb-2"> Mã sân: {court.code}</p>
            <p className="text-gray-600 mb-2"> Loại sân: {court.type}</p>
            <p className="text-gray-600 mb-4">Trạng thái: {court.status}</p>

            {/* GIÁ */}
            <div className="mb-6">
              <p className="text-2xl font-semibold text-yellow-500">
                Giá cơ bản: {court.basePrice?.toLocaleString()} VNĐ / giờ
              </p>
              <p className="text-lg text-gray-600">
                Giá cao điểm: {court.peakPrice?.toLocaleString()} VNĐ / giờ
              </p>
            </div>

            <button className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 shadow-md transition">
              Đặt sân ngay
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2 text-green-700">
            Mô tả sân
          </h2>
          {court?.description ? (
            <div
              className="prose max-w-none bg-white p-4 rounded-lg shadow-sm"
              dangerouslySetInnerHTML={{ __html: court.description }}
            />
          ) : (
            <p className="text-gray-500 italic">Chưa có mô tả cho sân này</p>
          )}
        </div>

        {/* MÔ TẢ */}
        {court.description && (
          <section className="mb-8">
            <h3 className="text-2xl font-bold text-green-700 mb-3">
              Mô tả sân
            </h3>
            <p className="text-gray-700 leading-relaxed">{court.description}</p>
          </section>
        )}

        {/* TIỆN ÍCH */}
        <section className="bg-gray-100 rounded-2xl p-6 shadow-md">
          <h3 className="text-2xl font-bold text-green-700 mb-4">
            Tiện ích sân
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            {court.amenities?.length > 0 ? (
              court.amenities.map((item, idx) => <li key={idx}>{item}</li>)
            ) : (
              <li>Chưa có thông tin tiện ích</li>
            )}
          </ul>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-white text-center py-6 mt-10">
        <p>© 2025 Đặt Sân Nhanh. Tất cả các quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}

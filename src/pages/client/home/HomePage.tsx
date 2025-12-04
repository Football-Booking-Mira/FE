import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import VoucherSection from "@/components/VoucherSection";

interface Court {
  _id: string;
  name: string;
  type: string;
  status: string;
  basePrice: number;
  peakPrice: number;
  formats: string;
  description: string;
  images: string[];
  phone?: string;
  address?: string;
  location?: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [offset, setOffset] = useState<{ [key: string]: number }>({});
  const [selectedFormat, setSelectedFormat] = useState<string>("all"); // <-- filter format

  const fetchCourts = async (params: any = {}) => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams(params).toString();
      const res = await fetch(
        `http://localhost:3000/api/courts${query ? "/search?" + query : ""}`
      );

      if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.data)) setCourts(data.data);
      else if (Array.isArray(data)) setCourts(data);
      else setCourts([]);
    } catch (err) {
      console.error("Lỗi tải danh sách sân:", err);
      setError("Không thể tải dữ liệu sân.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let previousCourts: string[] = [];

    const intervalFetch = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/courts");
        if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
        const data = await res.json();

        const newCourts: Court[] = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        const newIds = newCourts.map((c) => c._id);
        const isDifferent =
          newIds.length !== previousCourts.length ||
          newIds.some((id, i) => id !== previousCourts[i]);

        if (isDifferent) {
          setCourts(newCourts);
          previousCourts = newIds;
        }
      } catch (err) {
        console.error("Lỗi tải danh sách sân:", err);
      } finally {
        setLoading(false);
      }
    };

    intervalFetch();
    const interval = setInterval(intervalFetch, 5000);

    return () => clearInterval(interval);
  }, []);

  const normalizeFormats = (formats: string | string[]): string[] => {
    if (Array.isArray(formats)) return formats;
    if (typeof formats === "string")
      return formats.split(",").map((f) => f.trim());
    return [];
  };

  const groupedCourts = {
    "5v5": courts.filter(
      (c) =>
        normalizeFormats(c.formats).includes("5v5") && c.status !== "locked"
    ),
    "7v7": courts.filter(
      (c) =>
        normalizeFormats(c.formats).includes("7v7") && c.status !== "locked"
    ),
    "9v9": courts.filter(
      (c) =>
        normalizeFormats(c.formats).includes("9v9") && c.status !== "locked"
    ),
    "11v11": courts.filter(
      (c) =>
        normalizeFormats(c.formats).includes("11v11") && c.status !== "locked"
    ),
  };

  const navigateSlide = (format: string, direction: "prev" | "next") => {
    const list = groupedCourts[format as keyof typeof groupedCourts];
    const currentOffset = offset[format] || 0;
    const maxOffset = Math.max(0, list.length - 4);

    let newOffset = currentOffset;
    if (direction === "next" && currentOffset < maxOffset) newOffset++;
    else if (direction === "prev" && currentOffset > 0) newOffset--;

    setOffset((prev) => ({ ...prev, [format]: newOffset }));
  };

  const handleSearch = () => {
    const params: any = {};
    if (searchName) params.name = searchName;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    fetchCourts(params);
  };

  const handleBooking = () => {
    navigate("/booking");
  };

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      {/* Hero Section */}
      <section
        className="h-[90vh] bg-cover bg-center flex flex-col justify-center items-start text-white px-10 md:px-20"
        style={{ backgroundImage: "url('/images/anh1.jpg')" }}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg leading-tight">
          Đặt sân cùng
        </h1>
        <h2 className="text-6xl md:text-7xl font-extrabold text-green-500 mt-1 drop-shadow-lg leading-tight">
          Mira
        </h2>
        <p className="mt-4 max-w-xl text-lg md:text-xl text-white drop-shadow-md">
          Trải nghiệm chơi bóng đỉnh cao với hệ thống sân hiện đại, tiện ích đầy
          đủ và dịch vụ chuyên nghiệp
        </p>
      </section>

      {/* Search Section */}
      <section
        className="bg-white py-6 shadow-lg rounded-lg max-w-4xl mx-auto"
        style={{
          marginTop: "-60px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div className="px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col md:flex-row items-center gap-4"
          >
            <input
              type="text"
              placeholder="Tên sân..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-l-md p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              placeholder="Giá tối thiểu..."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-32 border-t border-b border-gray-300 p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              min={0}
            />
            <input
              type="number"
              placeholder="Giá tối đa..."
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-32 border-t border-b border-gray-300 rounded-r-md p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              min={0}
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-md flex items-center gap-2 shadow-md transition duration-300"
            >
              <FaSearch /> Tìm sân
            </button>
          </form>

          {/* Format Filter */}
          <div className="flex justify-center mt-4 gap-4 flex-wrap">
            {["all", "5v5", "7v7", "9v9", "11v11"].map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  selectedFormat === format
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {format === "all" ? "Tất cả" : format}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Voucher Section */}
      <VoucherSection />

      {/* Courts List */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-6">
            Danh sách sân bóng đá Mira
          </h2>

          {loading ? (
            <p className="text-center text-gray-500 text-lg">
              Đang tải danh sách sân...
            </p>
          ) : courts.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">
              Không có sân nào được tìm thấy.
            </p>
          ) : (
            Object.entries(groupedCourts)
              .filter(
                ([format]) =>
                  selectedFormat === "all" || selectedFormat === format
              ) // <-- lọc theo format
              .map(([format, list]) => (
                <div key={format} className="mb-16">
                  <h3 className="text-2xl font-semibold mb-6 text-green-700 border-b-2 border-green-200 pb-2">
                    Sân {format}
                  </h3>

                  {list.length === 0 ? (
                    <p className="text-gray-500 mb-4 text-center">
                      Chưa có sân {format} nào.
                    </p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => navigateSlide(format, "prev")}
                        disabled={(offset[format] || 0) === 0}
                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full disabled:opacity-50 transition-colors"
                      >
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>

                      <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 transition-all duration-500">
                          {list
                            .slice(
                              offset[format] || 0,
                              (offset[format] || 0) + 4
                            )
                            .map((court) => (
                              <div
                                key={`${format}-${court._id}`}
                                className="bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-300"
                              >
                                <div className="relative">
                                  <img
                                    src={
                                      court.images?.[0] ||
                                      "https://picsum.photos/800/400"
                                    }
                                    alt={court.name}
                                    className="w-full h-48 object-contain bg-gray-100"
                                  />
                                </div>
                                <div className="p-5 text-left">
                                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                                    {court.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2 font-bold">
                                    {court.location || "Địa chỉ sân:"}
                                  </p>
                                  <div className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                                    <span className="font-bold">Giá:</span>{" "}
                                    {court.basePrice.toLocaleString("vi-VN")}đ -{" "}
                                    {court.peakPrice.toLocaleString("vi-VN")}đ
                                  </div>
                                  <button
                                    onClick={() =>
                                      navigate(`/pitch/${court._id}`)
                                    }
                                    className={`w-full py-2 rounded-lg transition-colors ${
                                      court.status === "maintenance"
                                        ? "bg-yellow-500 text-white cursor-not-allowed"
                                        : "bg-green-600 text-white hover:bg-green-700"
                                    }`}
                                    disabled={court.status === "maintenance"}
                                  >
                                    {court.status === "maintenance"
                                      ? "Sân bảo trì"
                                      : "Xem chi tiết"}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <button
                        onClick={() => navigateSlide(format, "next")}
                        disabled={
                          (offset[format] || 0) >= Math.max(0, list.length - 4)
                        }
                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;

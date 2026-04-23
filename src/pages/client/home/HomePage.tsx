import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
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
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [searchName, setSearchName] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [offset, setOffset] = useState<{ [key: string]: number }>({});
  const [selectedFormat, setSelectedFormat] = useState<string>("all");

  // Xác định số phần tử trên mỗi trang dựa vào chiều rộng màn hình
  // Sử dụng CSS cho responsive thay vì logic JS phức tạp.
  
  const itemsPerPage = 4;

  const fetchCourts = async (params: any = {}) => {
    try {
      setLoading(true);
      setConnectionError(false);

      const query = new URLSearchParams(params).toString();
      const res = await fetch(
        `http://localhost:3000/api/courts${query ? "/search?" + query : ""}`
      );

      if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.data)) setCourts(data.data);
      else if (Array.isArray(data)) setCourts(data);
      else setCourts([]);
      setConnectionError(false);
    } catch (err) {
      console.error("Lỗi tải danh sách sân:", err);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let previousCourts: string[] = [];
    let hasLoadedOnce = false;

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

        // Nếu server trả về OK -> xóa lỗi, dừng loading
        setConnectionError(false);
        setRetryCount(0);
        hasLoadedOnce = true;
        setLoading(false);
      } catch (err) {
        console.error("Lỗi tải danh sách sân:", err);
        // Nếu chưa load được lần nào -> giữ loading + hiện lỗi kết nối
        if (!hasLoadedOnce) {
          setConnectionError(true);
          setRetryCount((prev) => prev + 1);
          // Giữ loading = true để spinner hiện thay vì "Không có sân"
          setLoading(true);
        }
      }
    };

    intervalFetch();
    // Retry nhanh hơn (3s) khi chưa kết nối được
    const interval = setInterval(intervalFetch, 3000);

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

    let newOffset = currentOffset;
    if (direction === "next" && currentOffset + itemsPerPage < list.length) {
      newOffset += itemsPerPage;
    } else if (direction === "prev" && currentOffset - itemsPerPage >= 0) {
      newOffset -= itemsPerPage;
    }

    setOffset((prev) => ({ ...prev, [format]: newOffset }));
  };

  const handleSearch = () => {
    const params: any = {};
    if (searchName) params.name = searchName;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    fetchCourts(params);
  };

  return (
    <div className="font-sans bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 min-h-screen">
      {/* Hero Section */}
      <section
        className="h-[70vh] md:h-[90vh] bg-cover bg-center flex flex-col justify-center items-start text-white px-6 md:px-20 relative"
        style={{ backgroundImage: "url('/images/anh1.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 w-full max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow-md leading-tight text-white mb-2">
            Đặt sân cùng
          </h1>
          <h2 className="text-5xl md:text-7xl font-extrabold text-green-500 drop-shadow-md leading-tight mb-4">
            Mira
          </h2>
          <p className="max-w-xl text-base md:text-xl text-gray-100 drop-shadow-sm leading-relaxed">
            Trải nghiệm chơi bóng đỉnh cao với hệ thống sân hiện đại, tiện ích đầy
            đủ và dịch vụ chuyên nghiệp.
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section
        className="bg-white dark:bg-gray-800 p-6 md:p-8 shadow-2xl rounded-2xl w-[calc(100%-2rem)] max-w-5xl mx-auto -mt-16 md:-mt-24 relative z-20 border border-gray-100 dark:border-gray-700 transition-all duration-300"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col md:flex-row items-end gap-4"
        >
          <div className="w-full md:flex-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Tên sân</label>
            <input
              type="text"
              placeholder="VD: Sân Tân Mỹ..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 rounded-lg p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="w-full md:w-40">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Giá tối thiểu</label>
            <input
              type="number"
              placeholder="0 đ"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 rounded-lg p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
              min={0}
            />
          </div>

          <div className="w-full md:w-40">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Giá tối đa</label>
            <input
              type="number"
              placeholder="1.000.000 đ"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 rounded-lg p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
              min={0}
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <FaSearch /> Tìm kiếm
          </button>
        </form>

        {/* Format Filter */}
        <div className="flex justify-center md:justify-start mt-6 gap-2 md:gap-4 flex-wrap">
          {["all", "5v5", "7v7", "9v9", "11v11"].map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm
                ${
                selectedFormat === format
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {format === "all" ? "Tất cả các loại sân" : `Sân ${format}`}
            </button>
          ))}
        </div>
      </section>

      {/* Voucher Section */}
      <div className="mt-8">
        <VoucherSection />
      </div>

      {/* Courts List */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Khám Phá Sân Bóng Mira
            </h2>
            <div className="w-24 h-1 bg-green-500 mx-auto rounded-full"></div>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-52 gap-4">
              {connectionError ? (
                <>
                  {/* Server chưa sẵn sàng - auto retry */}
                  <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-t-green-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">
                      Đang kết nối tới máy chủ...
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                      Hệ thống đang tự động thử lại {retryCount > 0 ? `(lần ${retryCount})` : ''}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải danh sách sân...</p>
                </>
              )}
            </div>
          ) : courts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-300 text-lg">
              Không có sân nào được tìm thấy.
            </p>
          ) : (
            Object.entries(groupedCourts)
              .filter(
                ([format]) =>
                  selectedFormat === "all" || selectedFormat === format
              )
              .map(([format, list]) => {
                if (list.length === 0) return null;
                
                const currentOffset = offset[format] || 0;
                const showPrev = currentOffset > 0;
                const showNext = currentOffset + itemsPerPage < list.length;
                
                return (
                  <div key={format} className="mb-16">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-sm">⚽</span>
                        Sân {format}
                        </h3>
                    </div>

                    {/* Mobile: Horizontal Scroll, Desktop: Grid with sliced items */}
                    <div className="relative group">
                        {/* Mobile view - scrollable container */}
                        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-4 px-4">
                            {list.map((court) => (
                                <div key={court._id} className="min-w-[85vw] sm:min-w-[300px] snap-center">
                                    <CourtCard court={court} navigate={navigate} />
                                </div>
                            ))}
                        </div>

                        {/* Desktop view - Grid with slicing */}
                        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
                            {list.slice(currentOffset, currentOffset + itemsPerPage).map((court) => (
                                <CourtCard key={court._id} court={court} navigate={navigate} />
                            ))}
                        </div>
                    </div>

                    {/* Pagination Bottom */}
                    {list.length > itemsPerPage && (
                        <div className="hidden md:flex justify-center items-center gap-4 mt-8">
                            <button
                                onClick={() => navigateSlide(format, "prev")}
                                disabled={!showPrev}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    showNext ? 'bg-white dark:bg-gray-800 shadow-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-700 hover:scale-105' : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <FaChevronLeft />
                            </button>
                            <span className="text-gray-500 dark:text-gray-300 font-medium text-sm bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm">
                                Trang {Math.floor(currentOffset / itemsPerPage) + 1} / {Math.ceil(list.length / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => navigateSlide(format, "next")}
                                disabled={!showNext}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    showNext ? 'bg-white dark:bg-gray-800 shadow-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-700 hover:scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
};

// Component thẻ thông tin Sân (Dùng chung)
const CourtCard = ({ court, navigate }: { court: Court, navigate: any }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transform hover:-translate-y-1 transition-all duration-300 h-full flex flex-col group cursor-pointer"
         onClick={() => court.status !== "maintenance" && navigate(`/pitch/${court._id}`)}>
        <div className="relative overflow-hidden aspect-4/3">
            <img
                src={court.images?.[0] || "https://picsum.photos/400/300"}
                alt={court.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {court.status === "maintenance" && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Bảo trì
                </div>
            )}
        </div>
        <div className="p-5 flex-1 flex flex-col text-left">
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1">
                {court.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3 flex items-start gap-1 line-clamp-2">
                <span className="text-green-500 dark:text-green-400 mt-0.5">📍</span> {court.location || "Chưa có địa chỉ"}
            </p>
            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700/50 flex flex-row items-center justify-between gap-1">
                <div className="flex flex-col min-w-0">
                    <span className="text-sm text-gray-500 dark:text-gray-300 mb-0.5 leading-none">Giá thuê</span>
                    <div className="flex flex-row items-baseline gap-1 flex-wrap">
                        <span className="font-bold text-green-600 dark:text-green-400 text-lg leading-none">
                            {court.basePrice.toLocaleString("vi-VN")}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-300 leading-none">VNĐ/giờ</span>
                    </div>
                </div>
                
                <button
                    className={`whitespace-nowrap shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    court.status === "maintenance"
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 cursor-not-allowed"
                        : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white"
                    }`}
                    disabled={court.status === "maintenance"}
                >
                    Đặt ngay
                </button>
            </div>
        </div>
    </div>
);

export default HomePage;

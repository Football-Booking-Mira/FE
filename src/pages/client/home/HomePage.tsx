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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
        `${API_URL}/courts${query ? "/search?" + query : ""}`
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
        const res = await fetch(`${API_URL}/courts`);
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
        className="h-[70vh] md:h-[90vh] bg-cover bg-center flex flex-col justify-center items-start text-white px-6 md:px-20 relative overflow-hidden"
        style={{ backgroundImage: "url('/images/anh1.jpg')" }}
      >
        {/* Multi-layer overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        
        {/* Animated content */}
        <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 border border-emerald-400/30">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Hệ thống sân bóng hiện đại
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-3">
              Đặt sân cùng
            </h1>
            <h2 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6"
                style={{ background: 'linear-gradient(135deg, #34d399, #10b981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Mira
            </h2>
            <p className="max-w-xl text-base md:text-lg text-gray-200/90 leading-relaxed font-light">
              Trải nghiệm chơi bóng đỉnh cao với hệ thống sân hiện đại, tiện ích đầy
              đủ và dịch vụ chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full h-auto" preserveAspectRatio="none">
            <path fill="#f9fafb" d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* Search Section */}
      <section
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 md:p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] rounded-2xl w-[calc(100%-2rem)] max-w-5xl mx-auto -mt-12 md:-mt-20 relative z-20 border border-gray-100/80 dark:border-gray-700 transition-all duration-300"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col md:flex-row items-end gap-4"
        >
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-200 mb-2 uppercase tracking-wider">Tên sân</label>
            <input
              type="text"
              placeholder="VD: Sân Tân Mỹ..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-3.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          </div>
          
          <div className="w-full md:w-40">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-200 mb-2 uppercase tracking-wider">Giá tối thiểu</label>
            <input
              type="number"
              placeholder="0 đ"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-3.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              min={0}
            />
          </div>

          <div className="w-full md:w-40">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-200 mb-2 uppercase tracking-wider">Giá tối đa</label>
            <input
              type="number"
              placeholder="1.000.000 đ"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-3.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              min={0}
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl flex justify-center items-center gap-2.5 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <FaSearch className="text-sm" /> Tìm kiếm
          </button>
        </form>

        {/* Format Filter Tabs */}
        <div className="flex justify-center md:justify-start mt-6 gap-1.5 md:gap-2 flex-wrap">
          {["all", "5v5", "7v7", "9v9", "11v11"].map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative
                ${
                selectedFormat === format
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 scale-[1.03]"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-gray-600"
              }`}
            >
              {format === "all" ? "Tất cả" : `Sân ${format}`}
            </button>
          ))}
        </div>
      </section>

      {/* Voucher Section */}
      <div className="mt-12">
        <VoucherSection />
      </div>

      {/* Courts List */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-emerald-100 dark:border-emerald-800/30">
              ⚽ Sân bóng chất lượng cao
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Khám Phá Sân Bóng Mira
            </h2>
          </div>

          {loading ? (
            <div>
              {connectionError ? (
                <div className="flex flex-col justify-center items-center h-52 gap-4">
                  {/* Server chưa sẵn sàng - auto retry */}
                  <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-t-emerald-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
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
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Skeleton Loading Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton-card bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="skeleton skeleton-img"></div>
                      <div className="p-5">
                        <div className="skeleton skeleton-line" style={{ width: '75%' }}></div>
                        <div className="skeleton skeleton-line short"></div>
                        <div className="skeleton skeleton-line price"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏟️</div>
              <p className="text-gray-500 dark:text-gray-300 text-lg font-medium">
                Không có sân nào được tìm thấy.
              </p>
              <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc tìm kiếm</p>
            </div>
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
                    <div className="flex justify-between items-center mb-8 px-1">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-3 tracking-tight">
                        <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-green-900/30 text-emerald-600 dark:text-green-400 flex items-center justify-center text-base shadow-sm">⚽</span>
                        Sân {format}
                        <span className="text-sm font-medium text-gray-400 ml-1">({list.length} sân)</span>
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
                        <div className="hidden md:flex justify-center items-center gap-3 mt-10">
                            <button
                                onClick={() => navigateSlide(format, "prev")}
                                disabled={!showPrev}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                    showPrev ? 'bg-white dark:bg-gray-800 shadow-md text-emerald-600 dark:text-green-400 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:scale-105 border border-gray-100 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <FaChevronLeft className="text-sm" />
                            </button>
                            <span className="text-gray-500 dark:text-gray-300 font-semibold text-sm bg-white dark:bg-gray-800 px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 tabular-nums">
                                {Math.floor(currentOffset / itemsPerPage) + 1} / {Math.ceil(list.length / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => navigateSlide(format, "next")}
                                disabled={!showNext}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                    showNext ? 'bg-white dark:bg-gray-800 shadow-md text-emerald-600 dark:text-green-400 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:scale-105 border border-gray-100 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <FaChevronRight className="text-sm" />
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100/80 dark:border-gray-700 overflow-hidden transform hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col group cursor-pointer"
         onClick={() => court.status !== "maintenance" && navigate(`/pitch/${court._id}`)}>
        <div className="relative overflow-hidden aspect-4/3 img-zoom-container">
            <img
                src={court.images?.[0] || "https://picsum.photos/400/300"}
                alt={court.name}
                className="w-full h-full object-cover"
            />
            {/* Gradient overlay on image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Format badge */}
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-white/50">
                {court.formats}
            </div>

            {court.status === "maintenance" && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Bảo trì
                </div>
            )}
        </div>
        <div className="p-5 flex-1 flex flex-col text-left">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-green-400 transition-colors line-clamp-1 tracking-tight">
                {court.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 flex items-start gap-1.5 line-clamp-2 leading-relaxed">
                <span className="text-emerald-500 dark:text-green-400 mt-0.5 shrink-0">📍</span> {court.location || "Chưa có địa chỉ"}
            </p>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-row items-center justify-between gap-1">
                <div className="flex flex-col min-w-0">
                    <span className="text-xs text-gray-400 dark:text-gray-300 mb-1 uppercase tracking-wider font-medium">Giá thuê</span>
                    <div className="flex flex-row items-baseline gap-1 flex-wrap">
                        <span className="font-extrabold text-emerald-600 dark:text-green-400 text-xl leading-none tracking-tight">
                            {court.basePrice.toLocaleString("vi-VN")}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-300 leading-none font-medium">đ/giờ</span>
                    </div>
                </div>
                
                <button
                    className={`whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                    court.status === "maintenance"
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 cursor-not-allowed"
                        : "bg-emerald-50 dark:bg-green-900/30 text-emerald-600 dark:text-green-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-600/20"
                    }`}
                    disabled={court.status === "maintenance"}
                >
                    Đặt ngay →
                </button>
            </div>
        </div>
    </div>
);

export default HomePage;

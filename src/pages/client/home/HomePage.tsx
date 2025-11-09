import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaTrophy,
  FaFutbol,
  FaLightbulb,
  FaCar,
  FaDoorOpen,
  FaWater,
  FaCalendarAlt,
} from "react-icons/fa";

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
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Khai báo đầy đủ state
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Hàm chuyển trang đặt sân
  const handleBooking = () => {
    navigate("/booking");
  };

  // ✅ Tải danh sách sân
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/courts");
        if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
        const data = await res.json();

        if (data && Array.isArray(data.data)) {
          setCourts(data.data);
        } else if (Array.isArray(data)) {
          setCourts(data);
        } else {
          console.warn("Không nhận được mảng sân hợp lệ:", data);
          setCourts([]);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách sân:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourts();
  }, []);

  const fields = [
    {
      name: "Sân 5 người",
      size: "Kích thước 20x40m",
      price: "300.000đ/giờ",
      features: ["Phù hợp đá mini", "Có hệ thống chiếu sáng", "Miễn phí nước"],
    },
    {
      name: "Sân 7 người",
      size: "Kích thước 40x60m",
      price: "500.000đ/giờ",
      features: ["Thích hợp cho đội lớn", "Có trọng tài", "Có bãi đỗ xe"],
      highlight: true,
    },
    {
      name: "Sân 11 người",
      size: "Kích thước 68x105m",
      price: "800.000đ/giờ",
      features: ["Thi đấu chuyên nghiệp", "Có phòng thay đồ", "Có trọng tài"],
    },
  ];

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      {/* Hero section */}
      <section
        className="h-[90vh] bg-cover bg-center flex flex-col justify-center items-center text-white text-center"
        style={{ backgroundImage: "url('/images/anh1.jpg')" }}
      >
        <h1 className="text-6xl font-extrabold drop-shadow-lg">Sân Bóng Đá</h1>
        <h2 className="text-6xl font-extrabold text-green-400 mt-2 drop-shadow-lg">
          Mira
        </h2>
        <p className="mt-4 text-lg text-black">
          Trải nghiệm chơi bóng đỉnh cao với hệ thống sân hiện đại, tiện ích đầy
          đủ và dịch vụ chuyên nghiệp
        </p>
        <div className="mt-6 space-x-4">
          <button
            onClick={handleBooking}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-semibold"
          >
            Đặt sân ngay
          </button>
        </div>
      </section>

      {/* 🏟️ Sân bóng */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-6">
            ⚽ Sân bóng Mira
          </h2>
          <p className="text-center text-gray-600 mb-10">
            Khám phá sân bóng hiện đại, tiện nghi và sẵn sàng phục vụ bạn mỗi
            ngày
          </p>

          {loading ? (
            <p className="text-center text-gray-500">
              Đang tải danh sách sân...
            </p>
          ) : courts.length === 0 ? (
            <p className="text-center text-gray-500">
              Không có sân nào được tìm thấy.
            </p>
          ) : (
            <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-8">
              {courts.slice(0, 6).map((court) => (
                <div
                  key={court._id}
                  className="bg-white border border-gray-200 rounded shadow hover:shadow-md overflow-hidden"
                >
                  <img
                    src={court.images?.[0] || "https://picsum.photos/800/400"}
                    alt={court.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-5 text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {court.name}
                    </h3>

                    <div className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                      💰 Giá: {court.basePrice}k - {court.peakPrice}k
                    </div>

                    <button
                      onClick={() => navigate(`/pitch/${court._id}`)}
                      className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      disabled={court.status === "locked"}
                    >
                      {court.status === "locked" ? "Đang khóa" : "Xem chi tiết"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tiêu chuẩn quốc tế */}
      <section className="py-20 bg-white text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Về <span className="text-green-600">Mira soccer field</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Hệ thống sân bóng đá hiện đại với đầy đủ tiện ích, cam kết mang đến
            trải nghiệm chơi bóng tuyệt vời nhất cho mọi đội bóng
          </p>

          <div className="flex flex-col md:flex-row items-center mt-10">
            <img
              src="/images/anh2.jpg"
              alt="sân bóng"
              className="rounded-2xl shadow-lg w-full md:w-1/2 mb-8 md:mb-0"
            />
            <div className="md:ml-10 text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tiêu chuẩn quốc tế, dịch vụ tận tâm
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Mira Field tự hào là hệ thống sân bóng đá hiện đại tại TP. Hà
                Nội, đạt chuẩn quốc tế và dịch vụ chuyên nghiệp.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-600 mr-2 text-lg" />3
                  loại sân: 5 người, 7 người, 11 người
                </li>
                <li className="flex items-center">
                  <FaClock className="text-green-600 mr-2 text-lg" />
                  Mở cửa từ 6:00 - 22:00 hằng ngày
                </li>
                <li className="flex items-center">
                  <FaTrophy className="text-green-600 mr-2 text-lg" />
                  Hỗ trợ tổ chức giải đấu và sự kiện
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Ưu điểm dịch vụ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <FaFutbol />,
              title: "Cỏ nhân tạo cao cấp",
              desc: "Sân cỏ nhân tạo chất lượng cao, đảm bảo độ bền và an toàn cho người chơi.",
            },
            {
              icon: <FaLightbulb />,
              title: "Hệ thống chiếu sáng LED",
              desc: "Đèn LED hiện đại, chiếu sáng đều khắp sân, phù hợp cho các trận đấu ban đêm.",
            },
            {
              icon: <FaCar />,
              title: "Chỗ gửi xe miễn phí",
              desc: "Bãi đỗ xe rộng rãi, an toàn, miễn phí cho tất cả khách hàng.",
            },
            {
              icon: <FaDoorOpen />,
              title: "Phòng thay đồ rộng rãi",
              desc: "Phòng thay đồ sạch sẽ, thoáng mát, đầy đủ tiện nghi.",
            },
            {
              icon: <FaWater />,
              title: "Nước uống miễn phí",
              desc: "Cung cấp nước uống sạch miễn phí cho tất cả người chơi.",
            },
            {
              icon: <FaTrophy />,
              title: "Trọng tài chuyên nghiệp",
              desc: "Đội ngũ trọng tài có kinh nghiệm, đảm bảo tính công bằng trong các trận đấu.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 bg-gray-50 rounded-2xl shadow text-center hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <div className="text-green-600 text-4xl mb-3 mx-auto">
                {item.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bảng giá thuê sân */}
      <section className="py-16 bg-white text-center">
        <h2 className="text-3xl font-bold mb-3">Bảng giá thuê sân</h2>
        <p className="text-gray-600 mb-10">
          Giá cả hợp lý, dịch vụ chất lượng cao cho mọi loại sân bóng
        </p>

        <div className="flex flex-wrap justify-center gap-8 px-4">
          {fields.map((field, index) => (
            <div
              key={index}
              className={`w-[300px] p-6 border rounded-2xl shadow-sm transition-all duration-300 ${
                field.highlight
                  ? "border-green-500 bg-green-50 scale-105"
                  : "border-gray-200 bg-white"
              }`}
            >
              {field.highlight && (
                <span className="inline-block bg-green-500 text-white text-sm font-semibold px-3 py-1 rounded-full mb-2">
                  Phổ biến nhất
                </span>
              )}
              <div className="text-2xl font-bold mb-2">{field.name}</div>
              <div className="text-sm text-gray-500 mb-4">{field.size}</div>
              <div className="text-3xl font-bold text-green-600 mb-6">
                {field.price}
              </div>
              <ul className="text-left mb-6 space-y-2">
                {field.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    ✅ <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleBooking}
                className={`w-full py-2 rounded-lg font-semibold transition-all duration-300 ${
                  field.highlight
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "border border-green-600 text-green-600 hover:bg-green-50"
                }`}
              >
                Đặt sân ngay
              </button>
            </div>
          ))}
        </div>

        {/* Ưu đãi đặc biệt */}
        <section className="py-12 bg-green-50 mt-12 rounded-xl mx-4">
          <h2 className="text-3xl font-bold mb-8">Ưu đãi đặc biệt</h2>
          <div className="flex justify-center gap-16 flex-wrap">
            <div>
              <FaClock className="text-green-600 text-3xl mx-auto mb-2" />
              <h3 className="font-bold">Giờ vàng (6:00 – 8:00)</h3>
              <p>Giảm 20% cho tất cả loại sân</p>
            </div>
            <div>
              <FaCalendarAlt className="text-green-600 text-3xl mx-auto mb-2" />
              <h3 className="font-bold">Đặt sân theo tháng</h3>
              <p>Giảm 15% khi đặt từ 10 buổi trở lên</p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default HomePage;

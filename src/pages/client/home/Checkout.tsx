import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutData {
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
}

const Checkout: React.FC = () => {
  const location = useLocation();

  const navigate = useNavigate();
  // const bookingData = location.state as CheckoutData | undefined;
  const bookingData = JSON.parse(window.localStorage.getItem("checkout-data") || "null");


  useEffect(() => {
    if (!bookingData) navigate("/booking");
  }, [bookingData, navigate]);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {
    if (!name || !phone) {
      alert("Vui lòng nhập đầy đủ họ tên và số điện thoại!");
      return;
    }

    if (!bookingData?.bookingId) {
      alert("Không tìm thấy thông tin đặt sân!");
      return;
    }

    // Nếu thanh toán qua VNPay
    if (paymentMethod === "transfer") {
      try {
        const res = await fetch("http://localhost:3000/api/payment/vnpay/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: bookingData.bookingId }), 
        });

        const data = await res.json();

        if (data.success && data.paymentUrl) {
          window.location.href = data.paymentUrl; 
          return;
        } else {
          alert("Không tạo được liên kết thanh toán VNPay!");
          return;
        }
      } catch (err) {
        console.error("Lỗi gọi API VNPay:", err);
        alert("Lỗi thanh toán VNPay!");
        return;
      }
    }

    // Nếu là cash hoặc momo → xử lý bình thường
    const payload = {
      ...bookingData,
      customer: { name, phone, email },
      paymentMethod,
    };

    console.log("📦 Dữ liệu gửi thanh toán:", payload);

    alert("✅ Thanh toán thành công!");
    
  };


  if (!bookingData) return null;

  return (
    <div className="min-h-screen bg-white flex justify-center items-start py-12 px-4">
      <Card className="w-full max-w-2xl shadow-2xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-white text-green-600 text-center py-6 px-4 border-b border-gray-200">
          <h1 className="text-3xl font-extrabold mb-1">Thanh Toán Đặt Sân</h1>
        </div>

        <CardContent className="p-8 space-y-8">
          {/* Thông tin đặt sân */}
          <div className="bg-green-50 rounded-xl p-6 shadow-inner">
            <h2 className="font-semibold text-lg text-gray-700 mb-4">
              Thông tin đặt sân
            </h2>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <span>Sân:</span>
              <span className="font-medium text-gray-800">
                {bookingData.courtName}
              </span>
              <span>Ngày:</span>
              <span className="font-medium text-gray-800">
                {bookingData.date}
              </span>
              <span>Giờ:</span>
              <span className="font-medium text-gray-800">
                {bookingData.startTime} - {bookingData.endTime}
              </span>
              <span>Tổng tiền:</span>
              <span className="font-bold text-green-700 text-lg">
                {bookingData.totalPrice.toLocaleString()}₫
              </span>
            </div>
          </div>

          {/* Thông tin khách hàng */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-gray-700">
              Thông tin người đặt
            </h2>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên"
                  className="mt-1 border-green-300 focus:border-green-500 focus:ring-green-200"
                />
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="mt-1 border-green-300 focus:border-green-500 focus:ring-green-200"
                />
              </div>
              <div>
                <Label htmlFor="email">Email </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email"
                  className="mt-1 border-green-300 focus:border-green-500 focus:ring-green-200"
                />
              </div>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div className="space-y-3">
            <h2 className="font-semibold text-lg text-gray-700">
              Phương thức thanh toán
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {["cash", "transfer", "momo"].map((method) => (
                <label
                  key={method}
                  className={`flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:shadow transition ${paymentMethod === method
                    ? "border-green-600 bg-green-50"
                    : "border-gray-300"
                    }`}
                >
                  <input
                    type="radio"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="accent-green-600"
                  />
                  <span>
                    {method === "cash"
                      ? "Tiền mặt tại sân"
                      : method === "transfer"
                        ? "Chuyển khoản"
                        : "Ví Momo"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Nút xác nhận */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg transition"
          >
            Hoàn tất thanh toán
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkout;

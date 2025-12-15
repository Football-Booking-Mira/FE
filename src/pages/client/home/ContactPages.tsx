
import React, { useState } from "react";

type FormData = {
  name: string;
  email: string;
   phone: string;
  message: string;
};

const ContactPages: React.FC = () => {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
     phone: "",
    message: "",
  });

  const [sent, setSent] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const res = await fetch("http://localhost:3000/api/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) throw new Error("Gửi thất bại");

    setSent(true);
    setForm({ name: "", email: "",  phone: "", message: "" });
  } catch (error) {
    alert("Không gửi được liên hệ");
  }
};


  return (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">

    <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-8 w-full max-w-lg border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-gray-700 mb-2">
        Liên hệ với chúng tôi
      </h2>
      <p className="text-center text-gray-500 mb-6">
        Chúng tôi luôn sẵn sàng hỗ trợ bạn!
      </p>

      {sent && (
        <p className="text-green-600 bg-green-50 border border-green-200 p-3 rounded-lg text-center mb-4">
          ✅ Tin nhắn đã được gửi! Chúng tôi sẽ liên hệ lại sớm nhất.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Họ và tên */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Họ và tên
          </label>
          <input
            type="text"
            name="name"
            placeholder="Nhập họ và tên..."
            value={form.name}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="Địa chỉ email của bạn..."
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
        {/* Số điện thoại */}
<div>
  <label className="block text-sm font-medium text-gray-600 mb-1">
    Số điện thoại
  </label>
  <input
    type="tel"
    name="phone"
    placeholder="Số điện thoại của bạn..."
    value={form.phone}
    onChange={handleChange}
    required
    pattern="^[0-9]{9,11}$"
    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
  />
</div>

        {/* Nội dung */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Nội dung liên hệ
          </label>
          <textarea
            name="message"
            placeholder="Bạn muốn chúng tôi hỗ trợ gì?"
            value={form.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
          ></textarea>
        </div>

        {/* Nút gửi */}
        <button
          type="submit"
          className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-black-700 active:scale-95 transition"
        >
          Gửi tin nhắn
        </button>
      </form>
    </div>
  </div>
);

};

export default ContactPages;

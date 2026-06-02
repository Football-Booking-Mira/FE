import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";

const { TextArea } = Input;

const ContactPages: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) => {
    try {
      setLoading(true);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${API_URL}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.message || "Gửi liên hệ thất bại");
        return;
      }

      message.success("Gửi liên hệ thành công 🎉");
      form.resetFields();
    } catch {
      message.error("Không thể gửi liên hệ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-20 transition-colors">
      <div className="max-w-3xl mx-auto">

{/* ===== THÔNG TIN LIÊN HỆ ===== */}
<div className="text-center mb-16">
  <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-green-600 dark:text-green-500 mb-6">
    HÃY LIÊN HỆ VỚI CHÚNG TÔI
  </h1>

  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-2">
    Nếu bạn có bất kỳ thắc mắc nào,
  </p>

  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-2">
    hãy liên hệ với chúng tôi qua form điền thông tin bên dưới
    hoặc gọi trực tiếp qua số điện thoại.
  </p>

  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
    Hoặc gửi email tới{" "}
    <span className="font-semibold text-green-600 dark:text-green-400">
      MiraFootball@gmail.com
    </span>
  </p>

  {/* ===== SỐ ĐIỆN THOẠI NỔI BẬT ===== */}
  <div className="inline-flex items-center gap-3 px-8 py-4 mb-10 rounded-full bg-white dark:bg-gray-800 border border-green-900 dark:border-green-600 shadow-sm transition-colors">
    <span className="text-green-600 text-2xl">📞</span>
    <a
      href="tel:0900000000"
      className="text-xl font-bold text-green-700 dark:text-green-400 hover:underline"
    >
      0900 000 000
    </a>
  </div>

  <a href="/" className="text-base text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 hover:underline block transition-colors">
    ← Quay lại trang chủ
  </a>
</div>



        {/* ===== FORM LIÊN HỆ ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 px-8 py-10 transition-colors">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
            >
              <Input
                placeholder="Họ và tên"
                size="large"
                style={{ fontSize: 16, height: 46, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không đúng định dạng" },
              ]}
            >
              <Input
                placeholder="Email"
                size="large"
                style={{ fontSize: 16, height: 46, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                {
                  pattern: /^0\d{9}$/,
                  message: "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số",
                },
              ]}
            >
              <Input
                placeholder="Số điện thoại"
                size="large"
                style={{ fontSize: 16, height: 46, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              name="message"
              rules={[
                { required: true, message: "Vui lòng nhập nội dung liên hệ" },
              ]}
            >
              <TextArea
                rows={5}
                placeholder="Nội dung liên hệ"
                style={{ fontSize: 16, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  background: "var(--color-green-600)",
                  borderColor: "var(--color-green-600)",
                  height: 48,
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  borderRadius: 12,
                  color: "#fff"
                }}
              >
                GỬI LIÊN HỆ
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ContactPages;

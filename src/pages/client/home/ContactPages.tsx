import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { FacebookOutlined } from "@ant-design/icons";

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

      const res = await fetch("http://localhost:3000/api/contacts", {
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
    <div className="min-h-screen bg-gray-100 px-4 py-20">
      <div className="max-w-3xl mx-auto">

{/* ===== THÔNG TIN LIÊN HỆ ===== */}
<div className="text-center mb-16">
  <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-green-600 mb-6">
    HÃY LIÊN HỆ VỚI CHÚNG TÔI
  </h1>

  <p className="text-gray-700 text-lg leading-relaxed mb-2">
    Nếu bạn có bất kỳ thắc mắc nào,
  </p>

  <p className="text-gray-700 text-lg leading-relaxed mb-2">
    hãy liên hệ với chúng tôi qua form điền thông tin bên dưới
    hoặc gọi trực tiếp qua số điện thoại.
  </p>

  <p className="text-gray-700 text-lg leading-relaxed mb-6">
    Hoặc gửi email tới{" "}
    <span className="font-semibold text-green-600">
      MiraFootball@gmail.com
    </span>
  </p>

  {/* ===== SỐ ĐIỆN THOẠI NỔI BẬT ===== */}
  <div className="inline-flex items-center gap-3 px-8 py-4 mb-10 rounded-full bg-white border border-green-900 shadow-sm">
    <span className="text-green-600 text-2xl">📞</span>
    <a
      href="tel:0900000000"
      className="text-xl font-bold text-green-700 hover:underline"
    >
      0900 000 000
    </a>
  </div>

  <a href="/" className="text-base text-gray-600 hover:underline block">
    ← Quay lại trang chủ
  </a>
</div>



        {/* ===== FORM LIÊN HỆ ===== */}
        <div className="bg-white rounded-2xl shadow-md px-8 py-10">
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
                  background: "black",
                  borderColor: "black",
                  height: 48,
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  fontWeight: 500,
                  borderRadius: 12,
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

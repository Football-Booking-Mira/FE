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
    } catch (error) {
      message.error("Không thể gửi liên hệ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center text-gray-700 mb-2">
          Liên hệ với chúng tôi
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          {/* Họ tên */}
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên" },
            ]}
          >
            <Input placeholder="Nhập họ và tên" size="large" allowClear />
          </Form.Item>

          {/* Email */}
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              placeholder="example@gmail.com"
              size="large"
              type="email"
              allowClear
            />
          </Form.Item>

          {/* Số điện thoại */}
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              {
                pattern: /^0\d{9}$/,
                message:
                  "Số điện thoại phải bắt đầu bằng 0 và gồm đúng 10 chữ số",
              },
            ]}
          >
            <Input
              placeholder="0123456789"
              size="large"
              allowClear
            />
          </Form.Item>

          {/* Nội dung */}
          <Form.Item
            label="Nội dung liên hệ"
            name="message"
            rules={[
              { required: true, message: "Vui lòng nhập nội dung hỗ trợ" },
            ]}
          >
            <TextArea
              rows={5}
              placeholder="Bạn cần chúng tôi hỗ trợ gì?"
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                background: "#22c55e",
                borderColor: "#22c55e",
                height: "44px",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              Gửi liên hệ
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default ContactPages;




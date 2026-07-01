import React, { useState } from "react";
import { Form, message } from "antd";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background text-foreground py-12 md:py-20 px-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          
          {/* Left Column: Contact Information */}
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Liên hệ với chúng tôi</h1>
            <p className="text-muted-foreground mt-4 text-lg mb-10">
              Bạn có câu hỏi hoặc cần hỗ trợ? Đừng ngần ngại liên hệ với đội ngũ Mira.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Điện thoại</h3>
                  <a href="tel:0900000000" className="text-muted-foreground mt-1 hover:text-primary transition-colors">
                    0900 000 000
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Email</h3>
                  <a href="mailto:MiraFootball@gmail.com" className="text-muted-foreground mt-1 hover:text-primary transition-colors">
                    MiraFootball@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Địa chỉ</h3>
                  <p className="text-muted-foreground mt-1">
                    Số 89 Chùa Láng, Phường Láng, Hà Nội
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Giờ làm việc</h3>
                  <p className="text-muted-foreground mt-1">
                    06:00 - 23:00, Thứ 2 - Chủ Nhật
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div>
            <Card className="shadow-lg border-border bg-card rounded-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold">Gửi tin nhắn cho chúng tôi</CardTitle>
              </CardHeader>
              <CardContent>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  requiredMark={false}
                  className="flex flex-col gap-4"
                >
                  <Form.Item
                    name="name"
                    rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
                    className="mb-0"
                    label={<span className="text-sm font-medium text-foreground">Họ và tên</span>}
                  >
                    <Input placeholder="Nhập họ và tên của bạn" className="mt-1" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email" },
                      { type: "email", message: "Email không đúng định dạng" },
                    ]}
                    className="mb-0"
                    label={<span className="text-sm font-medium text-foreground">Email</span>}
                  >
                    <Input placeholder="Nhập địa chỉ email" className="mt-1" />
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
                    className="mb-0"
                    label={<span className="text-sm font-medium text-foreground">Số điện thoại</span>}
                  >
                    <Input placeholder="Nhập số điện thoại của bạn" className="mt-1" />
                  </Form.Item>

                  <Form.Item
                    name="message"
                    rules={[{ required: true, message: "Vui lòng nhập nội dung liên hệ" }]}
                    className="mb-0"
                    label={<span className="text-sm font-medium text-foreground">Nội dung tin nhắn</span>}
                  >
                    <Textarea 
                      rows={5} 
                      placeholder="Nhập nội dung cần hỗ trợ..." 
                      className="mt-1 resize-none" 
                    />
                  </Form.Item>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold text-md mt-2"
                    size="lg"
                  >
                    {loading ? "ĐANG GỬI..." : "GỬI TIN NHẮN"}
                  </Button>
                </Form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactPages;

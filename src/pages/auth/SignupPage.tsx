import {
  Form,
  Input,
  Button,
  message,
  Result,
  Upload,
  Avatar,
  Typography
} from "antd";
import { useRegister } from "@/common/hooks";
import { useState } from "react";
import { formatApiError } from "@/common/utils/formApiErr";
import { MailOutlined, UploadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import api from "@/common/utils/api";
import { Link, useNavigate } from "react-router-dom";

export function SignupPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const handleErrMessage = formatApiError(form);
  const { mutate: register, isPending } = useRegister(handleErrMessage);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleSubmit = async (values: any) => {
    register(
      {
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        avatar: values.avatar,
      },
      {
        onSuccess: () => {
          message.success("Đăng ký thành công!");
          setIsVerificationSent(true);
          form.resetFields();
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Side: Image/Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-green-900 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop" 
          alt="Football Stadium" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-end p-20 text-white h-full w-full">
          <img src="/lg-mira.png" alt="Logo Sân" className="h-28 w-fit mb-8 object-contain drop-shadow-xl filter brightness-0 invert" />
          <h2 className="text-5xl font-extrabold mb-6 tracking-tight text-white drop-shadow-lg font-sans">Gia nhập MIRA</h2>
          <p className="text-xl text-gray-200 drop-shadow-md font-medium leading-relaxed max-w-lg">
            Đăng ký ngay hôm nay để nhận được ưu đãi và tự do đặt những sân thi đấu với chất lượng tốt nhất cùng với những trận cầu đỉnh cao.
          </p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center px-6 sm:px-12 lg:px-24 relative bg-white dark:bg-gray-950 transition-colors duration-300 py-16 overflow-y-auto h-screen">
        <Link to="/" className="absolute top-8 left-8 text-gray-500 dark:text-gray-400 hover:text-green-500 font-medium flex items-center gap-2 transition-colors z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-full">
          <ArrowLeftOutlined /> <span className="hidden sm:inline">Quay về trang chủ</span>
        </Link>

        <div className="w-full max-w-md my-auto">
          <div className="text-center mb-8 block lg:hidden">
            <img src="/lg-mira.png" alt="Logo" className="h-20 mx-auto drop-shadow-sm" />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <Typography.Title level={2} className="mb-2! text-gray-800! dark:text-white! font-sans tracking-tight">
              {isVerificationSent ? "Xác thực Email" : "Đăng ký thành viên"}
            </Typography.Title>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">
              {isVerificationSent ? "Vui lòng làm theo hướng dẫn bên dưới." : "Chỉ với vài thao tác cơ bản để trở thành thành viên."}
            </p>
          </div>

          {isVerificationSent ? (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
              <Result
                icon={<MailOutlined className="text-6xl text-green-500 drop-shadow-md" />}
                title={<span className="text-2xl font-bold text-gray-800 dark:text-white">Kiểm tra Email của bạn</span>}
                subTitle={<span className="text-gray-600 dark:text-gray-400 text-base block mt-2">Chúng tôi đã gửi một email xác thực đến hòm thư của bạn. Vui lòng nhấn vào liên kết trong email để kích hoạt tài khoản.</span>}
                extra={[
                  <Button
                    key="close"
                    type="primary"
                    className="h-12 px-8 text-base font-bold bg-green-500 hover:bg-green-600 border-none rounded-xl mt-4"
                    onClick={() => navigate("/signin")}
                  >
                    Chuyển đến Đăng nhập
                  </Button>,
                ]}
              />
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark="optional"
              size="large"
            >
              <div className="flex justify-center mb-8">
                <Form.Item name="avatar" className="mb-0!">
                  <div className="flex flex-col items-center">
                    <Upload
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={async (file) => {
                        try {
                          const formData = new FormData();
                          formData.append("avatar", file as RcFile);

                          const res = await api.post("/upload/avatar", formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                          });

                          const envelope: any = res.data || {};
                          const url = envelope.data?.url;

                          if (!url) {
                            throw new Error("Không nhận được URL ảnh từ server");
                          }

                          form.setFieldsValue({ avatar: url });
                          message.success("Tải ảnh thành công!");
                        } catch (error: any) {
                          console.error(error);
                          message.error(error?.message || "Tải ảnh thất bại!");
                        }
                        return false;
                      }}
                    >
                      <div className="relative group cursor-pointer transition-transform hover:scale-105 duration-300">
                        <Avatar
                          src={form.getFieldValue("avatar")}
                          size={100}
                          icon={!form.getFieldValue("avatar") && <UploadOutlined className="text-gray-400" />}
                          className="bg-gray-100 dark:bg-gray-800 border-4 border-green-50 text-3xl shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <UploadOutlined className="text-white text-xl" />
                        </div>
                      </div>
                    </Upload>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">Ảnh đại diện (tuỳ chọn)</span>
                  </div>
                </Form.Item>
              </div>
              
              <Form.Item
                label={<span className="font-semibold text-gray-700 dark:text-gray-300">Họ và tên</span>}
                name="fullName"
                rules={[
                  { required: true, message: "Vui lòng nhập họ và tên của bạn" },
                  { min: 2, message: "Họ và tên phải ít nhất 2 ký tự" },
                ]}
              >
                <Input 
                  placeholder="Nguyễn Văn A" 
                  className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500"
                  allowClear 
                />
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold text-gray-700 dark:text-gray-300">Email</span>}
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input 
                  placeholder="name@example.com" 
                  type="email" 
                  className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500"
                  allowClear 
                />
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold text-gray-700 dark:text-gray-300">Số điện thoại</span>}
                name="phone"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại" },
                  {
                    pattern: /^[0-9]{10,11}$/,
                    message: "Số điện thoại phải bao gồm 10 đến 11 chữ số",
                  },
                ]}
              >
                <Input 
                  placeholder="0912 345 678" 
                  className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500"
                  allowClear 
                />
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold text-gray-700 dark:text-gray-300">Mật khẩu</span>}
                name="password"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu" },
                  { min: 6, message: "Mật khẩu phải lớn hơn hoặc bằng 6 ký tự" },
                ]}
              >
                <Input.Password 
                  placeholder="Mật khẩu của bạn (Tối thiểu 6 ký tự)" 
                  className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500"
                />
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold text-gray-700 dark:text-gray-300">Xác nhận mật khẩu</span>}
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Vui lòng nhập lại để xác nhận mật khẩu" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Mật khẩu xác nhận không trùng khớp!"));
                    },
                  }),
                ]}
                className="mb-8"
              >
                <Input.Password 
                  placeholder="Nhập lại mật khẩu" 
                  className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500"
                />
              </Form.Item>

              <Form.Item className="mb-0!">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={isPending}
                  className="h-14 text-lg font-bold bg-green-500 hover:bg-green-600 border-none rounded-xl shadow-lg shadow-green-500/30 transition-all"
                >
                  Đăng ký tài khoản
                </Button>
              </Form.Item>
            </Form>
          )}

          {!isVerificationSent && (
            <div className="text-center mt-8 text-base text-gray-600 dark:text-gray-400">
              Đã có tài khoản?{" "}
              <Link to="/signin" className="text-green-500 font-bold hover:text-green-600 hover:underline transition-all">
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignupPage;

import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Result,
  Space,
  Upload,
  Avatar,
} from "antd";
import { useRegister } from "@/common/hooks";
import { useState } from "react";
import { formatApiError } from "@/common/utils/formApiErr";
import { MailOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import api from "@/common/utils/api";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupModal({
  isOpen,
  onClose,
  onSwitchToLogin,
}: SignupModalProps) {
  const [form] = Form.useForm();
  const handleErrMessage = formatApiError(form);
  const { mutate: register, isPending } = useRegister(handleErrMessage);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleSubmit = async (values: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    avatar?: string;
  }) => {
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

  const handleCancel = () => {
    form.resetFields();
    onClose();
    setIsVerificationSent(false);
  };

  return (
    <Modal
      title={isVerificationSent ? "Xác thực Email" : "Đăng ký tài khoản"}
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      centered
      width={500}
      styles={{
        body: { padding: "24px" },
      }}
    >
      {isVerificationSent ? (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Result
            icon={
              <MailOutlined style={{ fontSize: "48px", color: "#22c55e" }} />
            }
            title="Kiểm tra Email của bạn"
            subTitle="Chúng tôi đã gửi một email xác thực đến địa chỉ email của bạn. Vui lòng click vào liên kết trong email để xác thực tài khoản."
            extra={[
              <Button
                key="resend"
                type="default"
                onClick={() => setIsVerificationSent(false)}
              >
                Quay lại
              </Button>,
              <Button
                key="close"
                type="primary"
                style={{ background: "#22c55e", borderColor: "#22c55e" }}
                onClick={() => {
                  handleCancel();
                }}
              >
                Đóng
              </Button>,
            ]}
          />
        </Space>
      ) : (
        <>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item label="Ảnh đại diện" name="avatar">
              <>
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

                    return false; // chặn Upload auto upload
                  }}
                >
                  <Button icon={<UploadOutlined />} size="large">
                    Chọn ảnh đại diện
                  </Button>
                </Upload>

                {form.getFieldValue("avatar") && (
                  <div style={{ marginTop: 12, textAlign: "center" }}>
                    <Avatar
                      src={form.getFieldValue("avatar")}
                      size={64}
                      style={{ border: "2px solid #22c55e" }}
                    />
                  </div>
                )}
              </>
            </Form.Item>
            <Form.Item
              label="Họ và tên"
              name="fullName"
              rules={[
                { required: true, message: "Vui lòng nhập họ và tên của bạn" },
                { min: 2, message: "Họ và tên phải ít nhất 2 ký tự" },
              ]}
            >
              <Input
                placeholder="Nhập họ và tên của bạn"
                size="large"
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                placeholder="example@email.com"
                size="large"
                type="email"
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                {
                  pattern: /^[0-9]{10,11}$/,
                  message: "Số điện thoại phải từ 10 đến 11 chữ số",
                },
              ]}
            >
              <Input placeholder="0123456789" size="large" allowClear />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu" },
                { min: 6, message: "Mật khẩu phải ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password placeholder="Tối thiểu 6 ký tự" size="large" />
            </Form.Item>

            <Form.Item
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Mật khẩu xác nhận không khớp")
                    );
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Nhập lại mật khẩu" size="large" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={isPending}
                style={{
                  background: "#22c55e",
                  borderColor: "#22c55e",
                  height: "44px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Đăng ký ngay
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}
          >
            Đã có tài khoản?{" "}
            <a
              onClick={onSwitchToLogin}
              style={{ color: "#22c55e", fontWeight: 500, cursor: "pointer" }}
            >
              Đăng nhập ngay
            </a>
          </div>
        </>
      )}
    </Modal>
  );
}

import { useState } from "react";
import { Modal, Form, Input, Button, message, Result } from "antd";
import { useForgotPassword } from "@/common/hooks";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSwitchToLogin,
}: ForgotPasswordModalProps) {
  const [form] = Form.useForm();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { mutate, isPending } = useForgotPassword();

  const handleSubmit = async (values: { email: string }) => {
    mutate(values, {
      onSuccess: () => {
        message.success("Email đã được gửi thành công!");
        setIsSubmitted(true);
      },
      onError: () => {
        message.error("Không thể gửi email đặt lại mật khẩu!");
      },
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setIsSubmitted(false);
    onClose();
  };

  return (
    <Modal
      title="Quên mật khẩu"
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      centered
      width={500}
      styles={{
        body: { padding: "24px" },
      }}
    >
      {!isSubmitted ? (
        <>
          <p
            style={{ color: "#666", marginBottom: "20px", textAlign: "center" }}
          >
            Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
          </p>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                placeholder="m@example.com"
                size="large"
                type="email"
                allowClear
              />
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
                Gửi hướng dẫn
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}
          >
            Nhớ mật khẩu?{" "}
            <a
              onClick={onSwitchToLogin}
              style={{ color: "#22c55e", fontWeight: 500, cursor: "pointer" }}
            >
              Đăng nhập ngay
            </a>
          </div>
        </>
      ) : (
        <Result
          status="success"
          title="Gửi thành công!"
          subTitle={
            <div style={{ marginTop: "16px" }}>
              <p>
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.
              </p>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Vui lòng kiểm tra email (bao gồm thư mục spam) để tiếp tục.
              </p>
            </div>
          }
          extra={
            <Button
              type="primary"
              onClick={handleCancel}
              size="large"
              style={{
                background: "#22c55e",
                borderColor: "#22c55e",
                height: "44px",
                paddingLeft: "32px",
                paddingRight: "32px",
              }}
            >
              Quay lại
            </Button>
          }
        />
      )}
    </Modal>
  );
}

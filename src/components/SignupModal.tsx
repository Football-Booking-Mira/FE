import { Modal, Form, Input, Button, message } from "antd";
import { useRegister } from "@/common/hooks";

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
  const { mutate: register, isPending } = useRegister();

  const handleSubmit = async (values: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    register(
      {
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      },
      {
        onSuccess: () => {
          message.success("Đăng ký thành công!");
          form.resetFields();
          onClose();
        },
      }
    );
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Đăng ký tài khoản"
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      centered
      width={500}
      styles={{
        body: { padding: "24px" },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            { required: true, message: "Vui lòng nhập họ và tên của bạn" },
            { min: 2, message: "Họ và tên phải ít nhất 2 ký tự" },
          ]}
        >
          <Input placeholder="Nhập họ và tên của bạn" size="large" allowClear />
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

      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
        Đã có tài khoản?{" "}
        <a
          onClick={onSwitchToLogin}
          style={{ color: "#22c55e", fontWeight: 500, cursor: "pointer" }}
        >
          Đăng nhập ngay
        </a>
      </div>
    </Modal>
  );
}

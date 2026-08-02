import { Modal, Form, Input, Button, Checkbox } from "antd";
import { useLogin } from "@/common/hooks/useLogin";
import { formatApiError } from "@/common/utils/formApiErr";
import {
  getRememberedEmail,
  setRememberedEmail,
  removeRememberedEmail,
} from "@/common/utils/rememberMe";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToForgot?: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  onSwitchToSignup,
  onSwitchToForgot,
}: LoginModalProps) {
  const [form] = Form.useForm();
  const handleErrMessage = formatApiError(form);
  const { mutate: login, isPending } = useLogin(() => {
    form.resetFields();
    onClose();
  }, handleErrMessage);

  const handleSubmit = async (values: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => {
    const payload = {
      email: values.email,
      password: values.password,
    };
    if (values.rememberMe) {
      setRememberedEmail(values.email);
    } else {
      removeRememberedEmail();
    }
    await login(payload);
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const rememberedEmail = getRememberedEmail();

  return (
    <Modal
      title="Đăng nhập"
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
        initialValues={{
          email: rememberedEmail,
          password: "",
          rememberMe: !!rememberedEmail,
        }}
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

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
        >
          <Input.Password placeholder="Mật khẩu của bạn" size="large" />
        </Form.Item>

        <Form.Item
          name="rememberMe"
          valuePropName="checked"
        >
          <Checkbox>Ghi nhớ tôi</Checkbox>
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
            Đăng nhập
          </Button>
        </Form.Item>

        <Form.Item>
          <a
            onClick={onSwitchToForgot}
            style={{
              float: "right",
              color: "#666",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Quên mật khẩu?
          </a>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
        Chưa có tài khoản?{" "}
        <a
          onClick={onSwitchToSignup}
          style={{ color: "#22c55e", fontWeight: 500, cursor: "pointer" }}
        >
          Đăng ký ngay
        </a>
      </div>
    </Modal>
  );
}

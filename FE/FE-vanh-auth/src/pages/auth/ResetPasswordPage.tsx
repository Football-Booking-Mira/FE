import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Button, Form, Input, message, Result, Space } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useResetPassword } from "@/common/hooks";

type ResetStep = "form" | "loading" | "success" | "error";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState<ResetStep>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const token = searchParams.get("token");
  const { mutate, isPending } = useResetPassword();

  useEffect(() => {
    if (!token) {
      setErrorMessage("Token không hợp lệ hoặc bị thiếu");
      setStep("error");
    }
  }, [token]);

  const handleSubmit = (values: {
    password: string;
    confirmPassword: string;
  }) => {
    if (!token) {
      message.error("Token không hợp lệ");
      return;
    }

    mutate(
      {
        resetToken: token,
        newPassword: values.password,
      },
      {
        onSuccess: () => {
          message.success("Mật khẩu đã được đặt lại thành công!");
          setStep("success");
        },
        onError: () => {
          message.error("Không thể đặt lại mật khẩu. Vui lòng thử lại.");
          setErrorMessage("Token đã hết hạn hoặc không hợp lệ");
          setStep("error");
        },
      }
    );
  };

  if (step === "form") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
                color: "#22c55e",
              }}
            >
              <LockOutlined />
            </div>
            <h1
              style={{ fontSize: "24px", margin: "0 0 8px 0", fontWeight: 600 }}
            >
              Đặt lại mật khẩu
            </h1>
            <p style={{ color: "#666", margin: "0" }}>
              Nhập mật khẩu mới của bạn
            </p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              label="Mật khẩu mới"
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới" },
                { min: 6, message: "Mật khẩu phải ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                size="large"
              />
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
                Đặt lại mật khẩu
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Result
            status="success"
            icon={
              <CheckCircleOutlined
                style={{
                  fontSize: "72px",
                  color: "#22c55e",
                  animation: "scaleIn 0.5s ease-out",
                }}
              />
            }
            title="Đặt lại mật khẩu thành công!"
            subTitle="Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển về trang chủ."
            extra={
              <Space>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate("/")}
                  style={{
                    background: "#22c55e",
                    borderColor: "#22c55e",
                    height: "44px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  Về trang chủ
                </Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Result
            status="error"
            icon={
              <CloseCircleOutlined
                style={{
                  fontSize: "72px",
                  color: "#ef4444",
                  animation: "shake 0.5s ease-in-out",
                }}
              />
            }
            title="Đặt lại mật khẩu thất bại"
            subTitle={
              errorMessage ||
              "Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email."
            }
            extra={
              <Space>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate("/")}
                  style={{
                    background: "#22c55e",
                    borderColor: "#22c55e",
                    height: "44px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  Về trang chủ
                </Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }
}

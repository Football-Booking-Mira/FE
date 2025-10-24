import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Button, Result, Space, message } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useVerifyToken } from "@/common/hooks";

type VerifyStep = "loading" | "success" | "error";

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<VerifyStep>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { mutate: verifyToken } = useVerifyToken();

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        navigate(`/reset-password?token=${searchParams.get("token")}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, searchParams, navigate]);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setErrorMessage("Token không hợp lệ hoặc bị thiếu");
      setStep("error");
      return;
    }

    setStep("loading");
    verifyToken(
      { resetToken: token },
      {
        onSuccess: () => {
          message.success("Email xác nhận thành công!");
          setStep("success");
        },
        onError: () => {
          setErrorMessage("Token không hợp lệ hoặc đã hết hạn");
          setStep("error");
        },
      }
    );
  }, [searchParams, verifyToken]);

  if (step === "loading") {
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
            textAlign: "center",
          }}
        >
          <div style={{ animation: "spin 1s linear infinite" }}>
            <LoadingOutlined
              style={{
                fontSize: "64px",
                color: "#22c55e",
              }}
            />
          </div>
          <h2 style={{ marginTop: "20px", fontWeight: 600 }}>
            Đang xác nhận email...
          </h2>
          <p style={{ color: "#666", marginTop: "10px" }}>
            Vui lòng chờ trong giây lát
          </p>
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
            title="Xác nhận email thành công!"
            subTitle="Email của bạn đã được xác nhận. Bạn sẽ được chuyển tới trang đặt lại mật khẩu."
            extra={
              <Space>
                <Button
                  type="primary"
                  size="large"
                  onClick={() =>
                    navigate(
                      `/reset-password?token=${searchParams.get("token")}`
                    )
                  }
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
                <Button
                  size="large"
                  onClick={() => navigate("/")}
                  style={{
                    height: "44px",
                    fontSize: "16px",
                  }}
                >
                  Trang chủ
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
            title="Xác nhận email thất bại"
            subTitle={
              errorMessage ||
              "Token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
            }
            extra={
              <Space>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate("/signup")}
                  style={{
                    background: "#22c55e",
                    borderColor: "#22c55e",
                    height: "44px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  Đăng ký lại
                </Button>
                <Button
                  size="large"
                  onClick={() => navigate("/")}
                  style={{
                    height: "44px",
                    fontSize: "16px",
                  }}
                >
                  Trang chủ
                </Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }
}

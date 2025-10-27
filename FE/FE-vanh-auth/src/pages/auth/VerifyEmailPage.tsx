import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Button, Result, Spin, Space } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useVerifyEmail } from "@/common/hooks/useVerifyEmail";
import { useAuth } from "@/common/contexts";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setIsAuthenticated, setUserName, setUserRole } = useAuth();
  const { mutate: verifyEmail } = useVerifyEmail();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [countdown, setCountdown] = useState(3);

  const verificationToken = searchParams.get("token");

  useEffect(() => {
    if (!verificationToken) {
      setStatus("error");
      return;
    }

    // Gọi API xác thực email
    verifyEmail(
      { verificationToken },
      {
        onSuccess(data) {
          setStatus("success");
          localStorage.setItem("token", data.data.accessToken);
          localStorage.setItem("user", JSON.stringify(data.data.user));
          setIsAuthenticated(true);
          setUserName(data.data.user.name);
          setUserRole(data.data.user.role);
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                navigate("/", { replace: true });
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        },
        onError() {
          setStatus("error");
        },
      }
    );
  }, [
    verificationToken,
    verifyEmail,
    setIsAuthenticated,
    setUserName,
    setUserRole,
    navigate,
  ]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {status === "loading" && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Spin size="large" />
            <h2 style={{ color: "#666", margin: 0 }}>Đang xác thực email...</h2>
            <p style={{ color: "#999", marginBottom: 0 }}>
              Vui lòng chờ một chút
            </p>
          </Space>
        )}

        {status === "success" && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <div style={{ fontSize: "48px", color: "#22c55e" }}>
              <CheckCircleOutlined />
            </div>
            <h2 style={{ color: "#22c55e", margin: 0 }}>
              Xác thực thành công!
            </h2>
            <p style={{ color: "#666", marginBottom: 0 }}>
              Email của bạn đã được xác thực
            </p>
            <p style={{ color: "#999", marginBottom: 0 }}>
              Đang chuyển hướng trong {countdown}s...
            </p>
            <Button
              type="primary"
              block
              size="large"
              style={{ background: "#22c55e", borderColor: "#22c55e" }}
              onClick={() => navigate("/", { replace: true })}
            >
              Về trang chủ
            </Button>
          </Space>
        )}

        {status === "error" && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Result
              status="error"
              title="Xác thực thất bại"
              subTitle={
                !verificationToken
                  ? "Token xác thực không hợp lệ"
                  : "Email không thể xác thực. Vui lòng thử lại hoặc liên hệ hỗ trợ."
              }
              extra={
                <Button
                  type="primary"
                  onClick={() => navigate("/", { replace: true })}
                  style={{ background: "#22c55e", borderColor: "#22c55e" }}
                >
                  Về trang chủ
                </Button>
              }
            />
          </Space>
        )}
      </Card>
    </div>
  );
}

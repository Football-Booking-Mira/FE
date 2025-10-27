import { LoginModal } from "@/components/LoginModal";
import { SignupModal } from "@/components/SignupModal";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { Button, Space } from "antd";
import { useState } from "react";
import { useAuth } from "@/common/contexts";

export function AuthModals() {
  const { isAuthenticated } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  const handleSwitchToSignup = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const handleSwitchToForgot = () => {
    setIsLoginOpen(false);
    setIsForgotOpen(true);
  };

  const handleSwitchFromForgotToLogin = () => {
    setIsForgotOpen(false);
    setIsLoginOpen(true);
  };

  return (
    <Space>
      <Button
        style={{
          background: "#22c55e",
          borderColor: "#22c55e",
        }}
        type="primary"
        onClick={() => setIsLoginOpen(true)}
      >
        Đăng nhập
      </Button>

      <Button
        className="hover:border-[#22c55e]"
        style={{
          color: "#22c55e",
          borderColor: "#22c55e",
        }}
        type="default"
        onClick={() => setIsSignupOpen(true)}
      >
        Đăng ký
      </Button>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignup={handleSwitchToSignup}
        onSwitchToForgot={handleSwitchToForgot}
      />

      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSwitchToLogin={handleSwitchFromForgotToLogin}
      />
    </Space>
  );
}

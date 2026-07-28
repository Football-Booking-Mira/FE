import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  Home, 
  Lock, 
  Mail, 
  Sparkles,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { useVerifyEmail } from "@/common/hooks/useVerifyEmail";
import { useAuth } from "@/common/contexts";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setIsAuthenticated, setUserName, setUserRole } = useAuth();
  const { mutate: verifyEmail } = useVerifyEmail();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [countdown, setCountdown] = useState(3);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const verificationToken = searchParams.get("token");

  useEffect(() => {
    if (!verificationToken) {
      setStatus("error");
      return;
    }

    verifyEmail(
      { verificationToken },
      {
        onSuccess(res: any) {
          setStatus("success");
          
          const payload = res?.data || res || {};
          const accessToken = payload.token || payload.accessToken || "";
          const user = payload.user || null;

          if (accessToken) {
            localStorage.setItem("token", accessToken);
          }
          if (user) {
            localStorage.setItem("user", JSON.stringify({ ...user, token: accessToken }));
            setIsAuthenticated(true);
            setUserName(user.name);
            setUserRole(user.role);
            setVerifiedEmail(user.email || null);
          }

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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Halo Blurs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Logo & Trust Line */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-7xl mx-auto z-20">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/lg-mira.png" alt="Logo" className="h-10 w-auto object-contain filter brightness-0 invert" />
          <div>
            <span className="font-black text-lg tracking-wider text-white block">MIRA FOOTBALL</span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase block -mt-1">Xác thực tài khoản</span>
          </div>
        </Link>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hệ thống bảo mật SSL 256-bit</span>
        </div>
      </div>

      {/* Main Glassmorphic Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 my-auto"
      >
        <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-950/20 relative overflow-hidden text-center">
          {/* Decorative Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {/* LOADING STATE */}
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 relative z-10 py-4"
              >
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping opacity-25" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-teal-400 border-b-transparent border-l-transparent animate-spin" />
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Lock className="w-7 h-7" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Đang xác thực tài khoản...</h2>
                  <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                    Hệ thống đang kiểm tra mã xác thực của bạn. Vui lòng chờ trong giây lát.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Kết nối bảo mật tới MIRA Auth Server...</span>
                </div>
              </motion.div>
            )}

            {/* SUCCESS STATE */}
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-6 relative z-10"
              >
                {/* Glowing Success Badge */}
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                  <div className="w-20 h-20 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-emerald-400">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                      >
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Xác thực chính thức</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Email đã được kích hoạt!</h2>
                  <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                    Tài khoản của bạn đã sẵn sàng. Bạn có thể sử dụng đầy đủ dịch vụ đặt sân bóng tại MIRA.
                  </p>
                </div>

                {/* Verified Detail Card */}
                {verifiedEmail && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">Địa chỉ Email đã xác minh</span>
                      <span className="text-xs font-mono font-bold text-slate-200 truncate block">{verifiedEmail}</span>
                    </div>
                  </div>
                )}

                {/* Auto Redirect Bar */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                    <span>Tự động chuyển hướng</span>
                    <span className="font-mono text-emerald-400 font-bold">{countdown} giây...</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full"
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 3, ease: "linear" }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>VỀ TRANG CHỦ & ĐẶT SÂN NGAY</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ERROR STATE */}
            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-6 relative z-10"
              >
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl animate-pulse" />
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-inner">
                    <XCircle className="w-10 h-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Xác thực không thành công</h2>
                  <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                    {!verificationToken
                      ? "Liên kết xác thực thiếu thông tin token hoặc không hợp lệ."
                      : "Mã xác thực đã hết hạn (quá 15 phút) hoặc đã được sử dụng trước đó."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 text-left space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <HelpCircle className="w-4 h-4" />
                    <span>Cách xử lý gợi ý:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Đăng nhập lại và yêu cầu gửi lại email kích hoạt mới.</li>
                    <li>Hoặc liên hệ hotline hỗ trợ: <strong className="text-white">0123 456 789</strong></li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => navigate("/signin")}
                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Đăng nhập lại</span>
                  </button>
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    className="py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Trang chủ</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Support Notice */}
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>MIRA Football Platform &bull; Bảo mật thông tin tuyệt đối</span>
        </p>
      </motion.div>
    </div>
  );
}

export default VerifyEmailPage;

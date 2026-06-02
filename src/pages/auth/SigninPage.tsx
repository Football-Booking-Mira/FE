import { Form, Input, Button, Checkbox, Typography } from "antd";
import { useLogin } from "@/common/hooks/useLogin";
import { formatApiError } from "@/common/utils/formApiErr";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";

export function SigninPage() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const handleErrMessage = formatApiError(form);
    const { mutate: login, isPending } = useLogin(() => {
        form.resetFields();
        navigate("/");
    }, handleErrMessage);

    const handleSubmit = async (values: any) => {
        const payload = {
            email: values.email,
            password: values.password,
        };
        if (values.rememberMe) {
            localStorage.setItem("rememberMe", JSON.stringify(values));
        } else {
            localStorage.removeItem("rememberMe");
        }
        await login(payload);
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
                    <h2 className="text-5xl font-extrabold mb-6 tracking-tight text-white drop-shadow-lg font-sans">Sân bóng MIRA</h2>
                    <p className="text-xl text-gray-200 drop-shadow-md font-medium leading-relaxed max-w-lg">
                        Trải nghiệm chơi bóng đỉnh cao với hệ thống sân cỏ hiện đại bậc nhất, tiện ích đầy đủ và dịch vụ chăm sóc khách hàng chuyên nghiệp.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center px-6 sm:px-12 lg:px-24 relative bg-white dark:bg-gray-950 transition-colors duration-300 py-16 overflow-y-auto h-screen">
                <Link to="/" className="absolute top-8 left-8 text-gray-500 dark:text-gray-400 hover:text-green-500 font-medium flex items-center gap-2 transition-colors z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <ArrowLeftOutlined /> <span className="hidden sm:inline">Quay lại trang chủ</span>
                </Link>

                <div className="w-full max-w-md my-auto">
                    <div className="text-center mb-10 block lg:hidden">
                        <img src="/lg-mira.png" alt="Logo" className="h-24 mx-auto drop-shadow-sm" />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <Typography.Title level={2} className="mb-2! text-gray-800! dark:text-white! font-sans tracking-tight">Đăng nhập tài khoản</Typography.Title>
                        <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Chào mừng bạn trở lại! Vui lòng điền thông tin bên dưới.</p>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        requiredMark="optional"
                        initialValues={
                            localStorage.getItem("rememberMe")
                                ? JSON.parse(localStorage.getItem("rememberMe") || "{}")
                                : { rememberMe: false }
                        }
                        size="large"
                    >
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
                                className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-base"
                                allowClear 
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-semibold text-gray-700 dark:text-gray-300">Mật khẩu</span>}
                            name="password"
                            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
                        >
                            <Input.Password 
                                placeholder="Nhập mật khẩu của bạn" 
                                className="rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white px-4 py-3 hover:border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-base"
                            />
                        </Form.Item>

                        <div className="flex items-center justify-between mb-8">
                            <Form.Item name="rememberMe" valuePropName="checked" className="mb-0!">
                                <Checkbox className="text-gray-600 dark:text-gray-400 font-medium">Ghi nhớ đăng nhập</Checkbox>
                            </Form.Item>

                            <Link to="/forgot-password" className="text-green-600 font-semibold hover:text-green-500 hover:underline transition-all">
                                Quên mật khẩu?
                            </Link>
                        </div>

                        <Form.Item className="mb-6!">
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={isPending}
                                className="h-14 text-lg font-bold bg-green-500 hover:bg-green-600 border-none rounded-xl shadow-lg shadow-green-500/30 transition-all"
                            >
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>
                    
                    <div className="text-center mt-8 text-base text-gray-600 dark:text-gray-400">
                        Chưa có tài khoản?{" "}
                        <Link to="/signup" className="text-green-500 font-bold hover:text-green-600 hover:underline transition-all">
                            Đăng ký ngay thôi!
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SigninPage;

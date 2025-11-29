import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-9xl font-bold text-gray-300">404</h1>
      <h2 className="text-3xl md:text-4xl font-semibold text-gray-700 mt-4">
        Oops! Không tìm thấy trang
      </h2>
      <p className="text-gray-500 mt-2 text-center max-w-md">
        Trang bạn đang tìm kiếm có thể đã bị xóa hoặc không tồn tại.
      </p>
      <Button
        type="primary"
        size="large"
        className="mt-6"
        onClick={() => navigate("/")}
      >
        Quay về trang chủ
      </Button>
    </div>
  );
};

export default NotFound;

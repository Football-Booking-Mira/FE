import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "antd/dist/reset.css";
import "./index.css";
import App from "@/App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, message, theme } from "antd";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

message.config({
  maxCount: 1,
});

function AntdConfigWrapper({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <ConfigProvider
      theme={{
        cssVar: true,
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#10b981", // Emerald 500
          colorInfo: "#0ea5e9", // Sky 500
          wireframe: false,
          colorLink: "#10b981",
          colorLinkHover: "#059669",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AntdConfigWrapper>
          <App />
          <Toaster richColors position="top-center" />
        </AntdConfigWrapper>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);

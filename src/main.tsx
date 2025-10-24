import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "@/App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, message } from "antd";
import "@ant-design/v5-patch-for-react-19";

const queryClient = new QueryClient();

message.config({
  maxCount: 1,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            cssVar: true,
            token: {
              colorPrimary: "#22c55e",
              colorInfo: "#22c52e",
              wireframe: false,
              sizeStep: 5,
              sizeUnit: 2,
              fontSize: 12,
              colorLink: "#22c60e",
              colorLinkHover: "#16a34a",
              linkHoverDecoration: "underline",
              linkDecoration: "wavy",
            },
          }}
        >
          <App />
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);

import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";
import SessionProviderWrapper from "@/app/frontend/sessionProviderWrapper";

export const metadata: Metadata = {
  title: "数据库系统概论作业",
  description: "没有介绍。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppRouterCacheProvider
          options = { { key: "css" } }
        >
          <SessionProviderWrapper>
            { children }
          </SessionProviderWrapper>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

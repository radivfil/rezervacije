import type { Metadata, Viewport } from "next";
import { messages } from "@/lib/i18n";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: messages.meta.defaultTitle,
  description: messages.meta.defaultDescription,
  generator: null,
  applicationName: null,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

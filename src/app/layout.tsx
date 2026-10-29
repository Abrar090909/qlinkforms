import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Geist for text, Geist Mono for amounts and receipt numbers (DESIGN.md
// section 3). Exposed as CSS variables that tokens.css maps to font-sans/mono.
const geist = Geist({ variable: "--font-geist-src", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono-src",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "UPI Forms", template: "%s · UPI Forms" },
  description:
    "Online forms that collect UPI, card and netbanking payments straight into your own Razorpay account.",
};

export const viewport: Viewport = { themeColor: "#f6f5f1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// One open font for everything (DESIGN.md section 3). Exposed as a CSS
// variable that src/styles/tokens.css maps to font-sans.
const interTight = Inter_Tight({
  variable: "--font-inter-tight-src",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "UPI Forms", template: "%s · UPI Forms" },
  description:
    "Online forms that collect UPI, card and netbanking payments straight into your own Razorpay account.",
};

export const viewport: Viewport = { themeColor: "#1b1b1b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${interTight.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

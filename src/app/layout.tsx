import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Work_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Open fonts from DESIGN.md section 3. Exposed as CSS variables that
// src/styles/tokens.css maps to font-sans, font-form and font-display.
const inter = Inter({ variable: "--font-inter-src", subsets: ["latin"] });
const workSans = Work_Sans({
  variable: "--font-work-sans-src",
  subsets: ["latin"],
  preload: false,
});
const playfair = Playfair_Display({
  variable: "--font-playfair-src",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "UPI Forms", template: "%s · UPI Forms" },
  description:
    "Online forms that collect UPI, card and netbanking payments straight into your own Razorpay account.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#2a222b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${workSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

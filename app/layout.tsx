import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Paystack Webhook Relayer",
  description: "Read and replay your paystack webhooks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

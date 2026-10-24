import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "Book a consultation | Beginwaka", description: "Book and pay for a Beginwaka advisory consultation." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://assets.calendly.com" />
        <link rel="preconnect" href="https://js.paystack.co" />
      </head>
      <body>{children}</body>
    </html>
  );
}

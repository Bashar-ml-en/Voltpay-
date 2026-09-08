import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultPay | Autonomous Agent with Terminal 3 TEE Guardrails",
  description: "Hardware-enforced spending boundaries and verifiable identity for autonomous AI agents.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" />
      </head>
      <body className="min-h-screen bg-[#090d16] text-[#f0f4fc] antialiased">
        {children}
      </body>
    </html>
  );
}

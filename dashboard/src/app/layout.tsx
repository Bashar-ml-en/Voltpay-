import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultPay | Autonomous Agent with Terminal 3 TEE Guardrails",
  description: "Hardware-enforced spending boundaries and verifiable identity for autonomous AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-[#f0f4fc] antialiased">
        {children}
      </body>
    </html>
  );
}

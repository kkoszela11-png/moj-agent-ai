import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "@/app/components/AuthGate";

export const metadata: Metadata = {
  title: "Mój Agent AI",
  description: "Chatbot AI zbudowany na warsztacie",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}

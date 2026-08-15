import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/app/components/Nav";

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
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
          <Nav />
        </div>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bazar — thoughtful finds for everyday life",
  description: "Discover useful, well-made finds at Bazar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Bazar", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

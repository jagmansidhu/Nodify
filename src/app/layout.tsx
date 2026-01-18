import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nodeify - Visualize Your Network",
  description: "A visual graph for your professional connections with engagement heat mapping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

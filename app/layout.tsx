import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Город говорит — летний городской фестиваль",
  description:
    "Программа, место проведения и предварительная регистрация на городской фестиваль «Город говорит».",
  openGraph: {
    title: "Город говорит — летний городской фестиваль",
    description:
      "Музыка, творчество и городские истории. 15 августа в Центральном городском парке.",
    type: "website",
    locale: "ru_RU",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

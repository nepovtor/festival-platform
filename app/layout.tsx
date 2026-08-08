import type { Metadata } from "next";
import { PublicAnalytics } from "@/components/public-analytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const configuredGoogleAnalyticsId =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
const googleAnalyticsId = /^G-[A-Z0-9]+$/.test(
  configuredGoogleAnalyticsId ?? "",
) && configuredGoogleAnalyticsId
  ? configuredGoogleAnalyticsId
  : "G-5TRMXGC4H8";
const configuredYandexMetrikaId =
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim();
const yandexMetrikaId =
  /^\d+$/.test(configuredYandexMetrikaId ?? "") && configuredYandexMetrikaId
  ? configuredYandexMetrikaId
  : "111386192";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Грибной фестиваль Lay’s",
  description:
    "Городской фестиваль в честь возвращения Lay’s «Белые грибы со сметаной».",
  openGraph: {
    title: "Грибной фестиваль Lay’s",
    description:
      "Музыка, грибной рекорд, мастер-классы и бесплатный вход.",
    type: "website",
    locale: "ru_RU",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og.png`,
        width: 1200,
        height: 630,
        alt: "Грибной фестиваль Lay’s",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Грибной фестиваль Lay’s",
    description:
      "Музыка, грибной рекорд, мастер-классы и бесплатный вход.",
    images: [`${siteUrl.replace(/\/$/, "")}/og.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <PublicAnalytics
          googleAnalyticsId={googleAnalyticsId}
          yandexMetrikaId={yandexMetrikaId}
        />
        {children}
      </body>
    </html>
  );
}

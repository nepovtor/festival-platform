import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const googleAnalyticsId = /^G-[A-Z0-9]+$/.test(
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "",
)
  ? process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
  : undefined;
const yandexMetrikaId = /^\d+$/.test(
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? "",
)
  ? process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Грибной фестиваль Lay’s — 16 августа, стадион «Динамо»",
  description:
    "Городской фестиваль в честь возвращения Lay’s «Белые грибы со сметаной»: музыка, грибной рекорд, мастер-классы и бесплатный вход.",
  openGraph: {
    title: "Грибной фестиваль Lay’s",
    description:
      "16 августа, 12:00–22:00. Верхняя площадка стадиона «Динамо». Вход бесплатный.",
    type: "website",
    locale: "ru_RU",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og.png`,
        width: 1200,
        height: 630,
        alt: "Грибной фестиваль Lay’s — 16 августа на стадионе «Динамо»",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Грибной фестиваль Lay’s",
    description:
      "16 августа, 12:00–22:00. Стадион «Динамо». Вход бесплатный.",
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
        {children}
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${googleAnalyticsId}',{anonymize_ip:true});`}
            </Script>
          </>
        )}
        {yandexMetrikaId && (
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${yandexMetrikaId},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
          </Script>
        )}
      </body>
    </html>
  );
}

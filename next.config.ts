import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const isDevelopment = process.env.NODE_ENV === "development";
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
const googleAnalyticsEnabled = Boolean(googleAnalyticsId);
const yandexMetrikaEnabled = Boolean(yandexMetrikaId);
const analyticsScriptSources = [
  ...(googleAnalyticsEnabled ? ["https://www.googletagmanager.com"] : []),
  ...(yandexMetrikaEnabled
    ? ["https://mc.yandex.ru", "https://yastatic.net"]
    : []),
].join(" ");
const analyticsConnectSources = [
  ...(googleAnalyticsEnabled
    ? [
        "https://www.googletagmanager.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
      ]
    : []),
  ...(yandexMetrikaEnabled
    ? [
        "https://mc.yandex.ru",
        "https://mc.yandex.by",
        "https://mc.yandex.com",
        "https://mc.webvisor.com",
        "https://mc.webvisor.org",
        "wss://mc.yandex.ru",
        "wss://mc.yandex.by",
        "wss://mc.yandex.com",
        "wss://mc.webvisor.com",
        "wss://mc.webvisor.org",
      ]
    : []),
].join(" ");
const analyticsImageSources = [
  ...(googleAnalyticsEnabled
    ? [
        "https://*.google-analytics.com",
        "https://www.googletagmanager.com",
      ]
    : []),
  ...(yandexMetrikaEnabled
    ? [
        "https://mc.yandex.ru",
        "https://mc.yandex.by",
        "https://mc.yandex.com",
        "https://mc.webvisor.com",
        "https://mc.webvisor.org",
      ]
    : []),
].join(" ");
const yandexFrameAncestorSources = [
  "https://metrika.yandex.ru",
  "https://analytics.yandex.by",
  "https://analytics.yandex.com",
  "https://analytics.yandex.com.tr",
  "https://analytics.yandex.kz",
  "https://analytics.yandex.ru",
  "https://metr.yandex.by",
  "https://metr.yandex.com",
  "https://metr.yandex.com.tr",
  "https://metr.yandex.kz",
  "https://metr.yandex.ru",
  "https://metrica.ya.ru",
  "https://metrica.yandex",
  "https://metrica.yandex.by",
  "https://metrica.yandex.com",
  "https://metrica.yandex.com.tr",
  "https://metrica.yandex.kz",
  "https://metrica.yandex.ru",
  "https://metrika.ya.ru",
  "https://metrika.yandex",
  "https://metrika.yandex.by",
  "https://metrika.yandex.com",
  "https://metrika.yandex.com.tr",
  "https://metrika.yandex.kz",
  "https://metrika.yandex.uz",
].join(" ");

function contentSecurityPolicy(allowWebvisorFrames: boolean) {
  const connectSources = allowWebvisorFrames ? analyticsConnectSources : "";
  const imageSources = allowWebvisorFrames ? analyticsImageSources : "";
  const scriptSources = allowWebvisorFrames ? analyticsScriptSources : "";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self'${connectSources ? ` ${connectSources}` : ""}`,
    "font-src 'self' data:",
    "form-action 'self'",
    allowWebvisorFrames && yandexMetrikaEnabled
      ? `frame-ancestors 'self' ${yandexFrameAncestorSources}`
      : "frame-ancestors 'none'",
    ...(allowWebvisorFrames && yandexMetrikaEnabled
      ? [
          "child-src blob: https://mc.yandex.ru",
          "frame-src blob: https://mc.yandex.ru",
        ]
      : ["child-src 'none'", "frame-src 'none'"]),
    `img-src 'self' data: blob:${imageSources ? ` ${imageSources}` : ""}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${scriptSources ? ` ${scriptSources}` : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ].join("; ");
}

const sharedSecurityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isDevelopment
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const publicSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(true),
  },
  ...sharedSecurityHeaders,
];

const privateSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(false),
  },
  { key: "X-Frame-Options", value: "DENY" },
  ...sharedSecurityHeaders,
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: projectRoot,
  outputFileTracingExcludes: {
    "/*": [
      ".git/**/*",
      ".sites-runtime/**/*",
      "data/**/*",
      "tests/**/*",
    ],
    "/api/admin/photos": [
      ".git/**/*",
      ".sites-runtime/**/*",
      "app/**/*",
      "components/**/*",
      "content/**/*",
      "data/**/*",
      "db/**/*",
      "lib/**/*",
      "public/**/*",
      "tests/**/*",
      "*.md",
      "*.mjs",
      "*.ts",
      "Dockerfile",
      "docker-compose.yml",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: publicSecurityHeaders },
      { source: "/admin/:path*", headers: privateSecurityHeaders },
      { source: "/api/:path*", headers: privateSecurityHeaders },
    ];
  },
};

export default nextConfig;

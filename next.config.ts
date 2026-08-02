import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const isDevelopment = process.env.NODE_ENV === "development";
const googleAnalyticsEnabled = /^G-[A-Z0-9]+$/.test(
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "",
);
const yandexMetrikaEnabled = /^\d+$/.test(
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? "",
);
const analyticsScriptSources = [
  ...(googleAnalyticsEnabled ? ["https://www.googletagmanager.com"] : []),
  ...(yandexMetrikaEnabled ? ["https://mc.yandex.ru"] : []),
].join(" ");
const analyticsConnectSources = [
  ...(googleAnalyticsEnabled
    ? ["https://www.google-analytics.com", "https://region1.google-analytics.com"]
    : []),
  ...(yandexMetrikaEnabled ? ["https://mc.yandex.ru"] : []),
].join(" ");
const analyticsImageSources = [
  ...(googleAnalyticsEnabled ? ["https://www.google-analytics.com"] : []),
  ...(yandexMetrikaEnabled ? ["https://mc.yandex.ru"] : []),
].join(" ");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self'${analyticsConnectSources ? ` ${analyticsConnectSources}` : ""}`,
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  `img-src 'self' data: blob:${analyticsImageSources ? ` ${analyticsImageSources}` : ""}`,
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${analyticsScriptSources ? ` ${analyticsScriptSources}` : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
  ...(isDevelopment
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

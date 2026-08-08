import { getSiteContent } from "@/db";
import { renderRegistrationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function previewContentSecurityPolicy() {
  const imageSources = ["'self'", "data:"];
  const configuredLogo = process.env.EMAIL_LOGO_URL?.trim();
  if (configuredLogo) {
    try {
      const logoUrl = new URL(configuredLogo);
      if (logoUrl.protocol === "https:" || logoUrl.protocol === "http:") {
        imageSources.push(logoUrl.origin);
      }
    } catch {
      // Invalid logo URLs remain visible as broken images without weakening CSP.
    }
  }

  return [
    "default-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    `img-src ${imageSources.join(" ")}`,
    "style-src 'unsafe-inline'",
  ].join("; ");
}

export async function GET() {
  const content = await getSiteContent();
  const preview = renderRegistrationEmail(content, 2);

  return new Response(preview.html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": previewContentSecurityPolicy(),
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

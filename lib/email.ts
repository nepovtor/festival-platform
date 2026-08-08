import type { SiteContent } from "@/content/site-content";
import {
  beginBroadcastEmailAttempt,
  beginRegistrationEmailAttempt,
  completeEmailAttempt,
  getSiteContent,
} from "@/db";
import type {
  EmailCampaign,
  EmailDelivery,
  Registration,
} from "@/db/schema";
import { buildFestivalCalendarUrl } from "@/lib/festival-calendar";
import { generateRegistrationPdf } from "@/lib/registration-pdf";

type EmailEnvironment = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_LOGO_URL?: string;
  SITE_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  FESTIVAL_CALENDAR_START?: string;
  FESTIVAL_CALENDAR_END?: string;
};

export type EmailResult =
  | { ok: true; providerId: string | null }
  | {
      ok: false;
      reason:
        | "NOT_CONFIGURED"
        | "PROVIDER_ERROR"
        | "NETWORK_ERROR"
        | "ALREADY_IN_PROGRESS"
        | "PROCESSING_ERROR";
      errorMessage: string;
    };

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailAttachment = {
  filename: string;
  content: string;
};

type EmailOptions = {
  content?: SiteContent;
  idempotencyKey?: string;
};

type DeliveryOptions = {
  idempotencyKey?: string;
  attachments?: EmailAttachment[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function publicSiteUrl() {
  const emailEnv = process.env as EmailEnvironment;
  return (
    emailEnv.SITE_URL ??
    emailEnv.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function emailLogoUrl(siteUrl: string) {
  const emailEnv = process.env as EmailEnvironment;
  return emailEnv.EMAIL_LOGO_URL?.trim() || `${siteUrl}/favicon.png`;
}

export const buildCalendarUrl = buildFestivalCalendarUrl;

const registrationAttachmentMemo =
  "Во вложении мы собрали памятку со всей важной информацией о фестивале. Сохраните ее, чтобы в этот день ничего не пропустить.";

export function renderRegistrationEmail(
  content: SiteContent,
  guestsCount: number,
): RenderedEmail & { calendarUrl: string } {
  const { festival, program, registrationEmail } = content;
  const siteUrl = publicSiteUrl();
  const logoUrl = emailLogoUrl(siteUrl);
  const calendarUrl = buildCalendarUrl(content);
  const fullAddress = `${festival.place}, ${festival.address}`;
  const paragraphHtml = (value: string) =>
    escapeHtml(value).replaceAll("\n", "<br>");
  const programHtml = program
    .map(
      (item) => `
        <tr>
          <td style="width:108px;padding:16px 14px 16px 0;border-bottom:1px solid #e1be7e;vertical-align:top;color:#192b09;font-size:14px;font-weight:700;line-height:1.35">
            ${escapeHtml(item.time)}
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #e1be7e;vertical-align:top">
            <div style="color:#bc7a26;font-size:17px;font-weight:700;line-height:1.3;text-transform:uppercase">${escapeHtml(item.title)}</div>
            <div style="margin-top:6px;color:#192b09;font-size:14px;line-height:1.5">${escapeHtml(item.description)}</div>
          </td>
        </tr>
      `,
    )
    .join("");
  const programText = program
    .map(
      (item) =>
        `${item.time} — ${item.title}\n${item.description}`,
    )
    .join("\n\n");

  return {
    subject: registrationEmail.subject,
    calendarUrl,
    html: `
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${escapeHtml(registrationEmail.subject)}</title>
        </head>
        <body style="margin:0;background:#edcd92;color:#192b09;font-family:Arial,Helvetica,sans-serif">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(festival.date)} · ${escapeHtml(festival.time)} · регистрация подтверждена</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#edcd92" style="width:100%;background:#edcd92">
            <tr>
              <td align="center" style="padding:28px 12px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fff9ef" style="width:100%;max-width:640px;background:#fff9ef;border:1px solid #bc7a26;border-radius:20px">
                  <tr>
                    <td align="center" bgcolor="#ffe9be" style="padding:28px 32px 22px;background:#ffe9be;border-radius:20px 20px 0 0;text-align:center">
                      <img src="${escapeHtml(logoUrl)}" width="104" alt="Lay’s" style="display:block;width:104px;max-width:100%;height:auto;margin:0 auto;border:0">
                      <div style="margin-top:12px;color:#192b09;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(festival.name)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px">
                      <h1 style="margin:0;color:#bc7a26;font-size:32px;line-height:1.12;text-transform:uppercase">${escapeHtml(registrationEmail.heading)}</h1>
                      <p style="margin:16px 0 0;color:#192b09;font-size:17px;line-height:1.6">${paragraphHtml(registrationEmail.intro)}</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffe9be" style="width:100%;margin:24px 0;background:#ffe9be;border:1px solid #e1be7e;border-radius:16px">
                        <tr>
                          <td style="padding:20px;color:#192b09;font-size:16px;line-height:1.7">
                            <strong style="color:#bc7a26;text-transform:uppercase">${escapeHtml(festival.date)}</strong><br>
                            <strong>${escapeHtml(festival.time)}</strong><br><br>
                            <strong style="text-transform:uppercase">${escapeHtml(festival.place)}</strong><br>
                            ${escapeHtml(festival.address)}<br><br>
                            Количество посетителей: <strong>${guestsCount}</strong>
                          </td>
                        </tr>
                      </table>
                      <div style="text-align:center;padding:2px 0 6px">
                        <a href="${escapeHtml(calendarUrl)}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#bc7a26;color:#fff9ef;text-decoration:none;font-size:15px;font-weight:700;text-transform:uppercase">${escapeHtml(registrationEmail.calendarButtonLabel)}</a>
                      </div>
                      <h2 style="margin:34px 0 8px;color:#bc7a26;font-size:24px;text-transform:uppercase">Программа фестиваля</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${programHtml}</table>
                      <p style="margin:26px 0 0;color:#bc7a26;font-size:17px;font-weight:700;text-transform:uppercase">Вход бесплатный</p>
                      <p style="margin:22px 0 0;color:#192b09;font-size:17px;line-height:1.6">${escapeHtml(registrationAttachmentMemo)}</p>
                      <p style="margin:18px 0 0;color:#192b09;font-size:16px;line-height:1.6">${paragraphHtml(registrationEmail.closing)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `${festival.name}\n\n${registrationEmail.heading}\n\n${registrationEmail.intro}\n\n${festival.date}\n${festival.time}\n${fullAddress}\nКоличество посетителей: ${guestsCount}\n\n${registrationEmail.calendarButtonLabel}: ${calendarUrl}\n\nПРОГРАММА ФЕСТИВАЛЯ\n\n${programText}\n\nВход бесплатный\n\n${registrationAttachmentMemo}\n\n${registrationEmail.closing}`,
  };
}

export function renderBroadcastEmail(
  content: SiteContent,
  campaign: Pick<EmailCampaign, "subject" | "message" | "ctaLabel" | "ctaUrl">,
): RenderedEmail {
  const { festival } = content;
  const siteUrl = publicSiteUrl();
  const logoUrl = emailLogoUrl(siteUrl);
  const fullAddress = `${festival.place}, ${festival.address}`;
  const messageHtml = escapeHtml(campaign.message).replaceAll("\n", "<br>");
  const ctaHtml =
    campaign.ctaLabel && campaign.ctaUrl
      ? `<div style="margin-top:24px;text-align:center"><a href="${escapeHtml(campaign.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#b42619;color:#fff;text-decoration:none;font-size:15px;font-weight:700">${escapeHtml(campaign.ctaLabel)}</a></div>`
      : "";
  const ctaText =
    campaign.ctaLabel && campaign.ctaUrl
      ? `\n\n${campaign.ctaLabel}: ${campaign.ctaUrl}`
      : "";

  return {
    subject: campaign.subject,
    html: `
      <!doctype html>
      <html lang="ru">
        <body style="margin:0;background:#f2ead7;color:#2f291f;font-family:Arial,Helvetica,sans-serif">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2ead7">
            <tr><td align="center" style="padding:24px 12px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-radius:24px;background:#fffaf0;box-shadow:0 14px 34px rgba(62,45,17,.13)">
                <tr><td style="padding:26px 32px;background:#f6cc45;text-align:center">
                  <img src="${escapeHtml(logoUrl)}" width="104" alt="Lay’s" style="display:inline-block;width:104px;max-width:100%;height:auto;border:0">
                  <div style="margin-top:10px;color:#173f2b;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(festival.name)}</div>
                </td></tr>
                <tr><td style="padding:32px">
                  <h1 style="margin:0;color:#173f2b;font-size:30px;line-height:1.12">${escapeHtml(campaign.subject)}</h1>
                  <div style="margin-top:18px;font-size:16px;line-height:1.7">${messageHtml}</div>
                  ${ctaHtml}
                  <div style="margin-top:28px;padding:18px;border-radius:16px;background:#fff3ce;font-size:14px;line-height:1.65">
                    <strong>${escapeHtml(festival.date)}, ${escapeHtml(festival.time)}</strong><br>${escapeHtml(fullAddress)}
                  </div>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
    text: `${festival.name}\n\n${campaign.subject}\n\n${campaign.message}${ctaText}\n\n${festival.date}, ${festival.time}\n${fullAddress}`,
  };
}

async function sendEmail(
  recipient: string,
  rendered: RenderedEmail,
  options: DeliveryOptions = {},
): Promise<EmailResult> {
  const emailEnv = process.env as EmailEnvironment;
  if (!emailEnv.RESEND_API_KEY || !emailEnv.EMAIL_FROM) {
    console.warn("Email delivery is not configured");
    return {
      ok: false,
      reason: "NOT_CONFIGURED",
      errorMessage: "Email provider is not configured",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: emailEnv.EMAIL_FROM,
        to: [recipient],
        ...(emailEnv.EMAIL_REPLY_TO
          ? { reply_to: emailEnv.EMAIL_REPLY_TO }
          : {}),
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(options.attachments?.length
          ? { attachments: options.attachments }
          : {}),
      }),
    });

    const providerPayload = await response
      .json()
      .catch(() => ({})) as { id?: unknown; message?: unknown };
    if (!response.ok) {
      const providerMessage =
        typeof providerPayload.message === "string"
          ? providerPayload.message.slice(0, 500)
          : `Email provider returned HTTP ${response.status}`;
      console.error("Email provider rejected a message", response.status);
      return {
        ok: false,
        reason: "PROVIDER_ERROR",
        errorMessage: providerMessage,
      };
    }

    return {
      ok: true,
      providerId:
        typeof providerPayload.id === "string" ? providerPayload.id : null,
    };
  } catch (error) {
    console.error(
      "Email provider request failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return {
      ok: false,
      reason: "NETWORK_ERROR",
      errorMessage:
        error instanceof Error && error.name === "TimeoutError"
          ? "Email provider request timed out"
          : "Email provider request failed",
    };
  }
}

export async function sendRegistrationEmail(
  email: string,
  guestsCount: number,
  options: EmailOptions = {},
): Promise<EmailResult> {
  const content = options.content ?? (await getSiteContent());
  const pdf = await generateRegistrationPdf({
    content,
    registration: { guestsCount },
  });
  return sendEmail(
    email,
    renderRegistrationEmail(content, guestsCount),
    {
      idempotencyKey: options.idempotencyKey,
      attachments: [
        {
          filename: "lays-festival-registration.pdf",
          content: pdf.toString("base64"),
        },
      ],
    },
  );
}

export async function sendBroadcastEmail(
  email: string,
  campaign: EmailCampaign,
  options: EmailOptions = {},
): Promise<EmailResult> {
  const content = options.content ?? (await getSiteContent());
  return sendEmail(
    email,
    renderBroadcastEmail(content, campaign),
    { idempotencyKey: options.idempotencyKey },
  );
}

function completionResult(result: EmailResult) {
  return result.ok
    ? { ok: true as const, providerId: result.providerId }
    : { ok: false as const, errorMessage: result.errorMessage };
}

export async function deliverRegistrationConfirmation(
  registration: Registration,
): Promise<{ delivery: EmailDelivery; result: EmailResult }> {
  const claim = await beginRegistrationEmailAttempt(registration.id);
  const { delivery } = claim;
  if (!claim.created) {
    return {
      delivery,
      result: {
        ok: false,
        reason: "ALREADY_IN_PROGRESS",
        errorMessage: "Confirmation email delivery is already in progress",
      },
    };
  }
  let result: EmailResult;
  try {
    result = await sendRegistrationEmail(
      registration.email,
      registration.guestsCount,
      { idempotencyKey: delivery.id },
    );
  } catch (error) {
    console.error(
      "Confirmation email rendering failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    result = {
      ok: false,
      reason: "PROCESSING_ERROR",
      errorMessage: "Confirmation email processing failed",
    };
  }
  const completedDelivery = await completeEmailAttempt(
    delivery.id,
    completionResult(result),
  );
  return { delivery: completedDelivery, result };
}

export async function deliverBroadcastMessage(
  campaign: EmailCampaign,
  registration: Registration,
  content?: SiteContent,
): Promise<{ delivery: EmailDelivery; result: EmailResult }> {
  const delivery = await beginBroadcastEmailAttempt(
    campaign.id,
    registration.id,
  );
  let result: EmailResult;
  try {
    result = await sendBroadcastEmail(registration.email, campaign, {
      content,
      idempotencyKey: delivery.id,
    });
  } catch (error) {
    console.error(
      "Broadcast email rendering failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    result = {
      ok: false,
      reason: "PROCESSING_ERROR",
      errorMessage: "Broadcast email processing failed",
    };
  }
  const completedDelivery = await completeEmailAttempt(
    delivery.id,
    completionResult(result),
  );
  return { delivery: completedDelivery, result };
}

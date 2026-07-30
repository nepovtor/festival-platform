import { festival } from "@/content/festival";

type EmailEnvironment = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
};

type EmailResult =
  | { ok: true }
  | { ok: false; reason: "NOT_CONFIGURED" | "PROVIDER_ERROR" };

export async function sendRegistrationEmail(
  email: string,
  guestsCount: number,
): Promise<EmailResult> {
  const emailEnv = process.env as EmailEnvironment;

  if (!emailEnv.RESEND_API_KEY || !emailEnv.EMAIL_FROM) {
    console.warn("Confirmation email is not configured");
    return { ok: false, reason: "NOT_CONFIGURED" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailEnv.EMAIL_FROM,
      to: [email],
      reply_to: emailEnv.EMAIL_REPLY_TO,
      subject: `Вы зарегистрированы на фестиваль «${festival.name}»`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#2c2118">
          <p style="font-size:14px;text-transform:uppercase;letter-spacing:.12em;color:#8a6a42">
            ${festival.name}
          </p>
          <h1 style="font-size:34px;line-height:1.05">Спасибо за регистрацию!</h1>
          <p style="font-size:17px;line-height:1.65">
            Ждём вас на летнем городском фестивале.
          </p>
          <div style="padding:22px;border-radius:18px;background:#fff6df;line-height:1.8">
            <strong>${festival.date}, ${festival.time}</strong><br>
            ${festival.place}<br>
            Количество посетителей: ${guestsCount}
          </div>
          <p style="margin-top:24px;color:#6f6257">До встречи в парке!</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    console.error("Email provider rejected a confirmation email", response.status);
    return { ok: false, reason: "PROVIDER_ERROR" };
  }

  return { ok: true };
}

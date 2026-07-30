export type RegistrationStatus = "CONFIRMED" | "CANCELLED";
export type EmailStatus = "PENDING" | "SENT" | "FAILED";

export type Registration = {
  id: string;
  email: string;
  guestsCount: number;
  status: RegistrationStatus;
  consentAcceptedAt: string;
  emailStatus: EmailStatus;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RateLimit = {
  fingerprint: string;
  windowStart: number;
  requestCount: number;
};

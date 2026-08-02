export type RegistrationStatus = "CONFIRMED" | "CANCELLED";
export type EmailStatus = "PENDING" | "SENT" | "FAILED";
export type EmailDeliveryKind = "CONFIRMATION" | "BROADCAST";
export type EmailCampaignStatus =
  | "PENDING"
  | "SENDING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export type Registration = {
  id: string;
  email: string;
  guestsCount: number;
  status: RegistrationStatus;
  consentAcceptedAt: string;
  emailStatus: EmailStatus;
  emailSentAt: string | null;
  emailAttemptCount: number;
  emailLastAttemptAt: string | null;
  emailLastError: string | null;
  emailProviderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RateLimit = {
  fingerprint: string;
  windowStart: number;
  requestCount: number;
};

export type EmailDelivery = {
  id: string;
  registrationId: string;
  campaignId: string | null;
  kind: EmailDeliveryKind;
  recipientEmail: string;
  attemptNumber: number;
  status: EmailStatus;
  providerId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  updatedAt: string;
};

export type EmailCampaign = {
  id: string;
  subject: string;
  message: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  status: EmailCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
};

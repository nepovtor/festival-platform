export const analyticsEvents = [
  "registration_form_view",
  "registration_start",
  "registration_submit",
  "registration_success",
  "registration_error",
  "calendar_click",
] as const;

export type AnalyticsEventName = (typeof analyticsEvents)[number];
export type AnalyticsEventParameters = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "event",
      eventName: string,
      parameters?: AnalyticsEventParameters,
    ) => void;
    ym?: (
      counterId: number,
      command: "reachGoal",
      goalName: string,
      parameters?: AnalyticsEventParameters,
    ) => void;
  }
}

const defaultYandexMetrikaId = 111386192;

function yandexMetrikaId() {
  const configured = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : defaultYandexMetrikaId;
}

export function trackGoogleEvent(
  eventName: AnalyticsEventName,
  parameters?: AnalyticsEventParameters,
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, parameters);
}

export function trackYandexGoal(
  goalName: AnalyticsEventName,
  parameters?: AnalyticsEventParameters,
) {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return;
  }

  window.ym(yandexMetrikaId(), "reachGoal", goalName, parameters);
}

export function trackFestivalEvent(
  eventName: AnalyticsEventName,
  parameters?: AnalyticsEventParameters,
) {
  trackGoogleEvent(eventName, parameters);
  trackYandexGoal(eventName, parameters);
}

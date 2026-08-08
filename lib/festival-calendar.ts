import type { SiteContent } from "@/content/site-content";

const defaultCalendarStart = "20260816T090000Z";
const defaultCalendarEnd = "20260816T190000Z";

function calendarTimestamp(value: string | undefined, fallback: string) {
  return value && /^\d{8}T\d{6}Z$/.test(value) ? value : fallback;
}

function publicSiteUrl() {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildFestivalCalendarUrl(content: SiteContent): string {
  const { festival } = content;
  const fullAddress = `${festival.place}, ${festival.address}`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", festival.name);
  url.searchParams.set(
    "dates",
    `${calendarTimestamp(process.env.FESTIVAL_CALENDAR_START, defaultCalendarStart)}/${calendarTimestamp(process.env.FESTIVAL_CALENDAR_END, defaultCalendarEnd)}`,
  );
  url.searchParams.set("location", fullAddress);
  url.searchParams.set(
    "details",
    `${festival.description}\n\n${festival.date}, ${festival.time}\n${fullAddress}\n${publicSiteUrl()}`,
  );
  return url.toString();
}

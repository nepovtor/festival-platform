"use client";

import { trackFestivalEvent } from "@/lib/analytics";

type TrackedCalendarLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function TrackedCalendarLink({
  href,
  className,
  children,
}: TrackedCalendarLinkProps) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => trackFestivalEvent("calendar_click")}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

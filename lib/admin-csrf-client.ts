"use client";

import { adminCsrfCookie, adminCsrfHeader } from "@/lib/security-constants";

function readCookie(name: string) {
  for (const item of document.cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;
    if (item.slice(0, separator).trim() !== name) continue;

    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }

  return "";
}

export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = readCookie(adminCsrfCookie);
    if (csrfToken) headers.set(adminCsrfHeader, csrfToken);
  }

  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}

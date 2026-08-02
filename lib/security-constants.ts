export const adminCsrfCookie =
  process.env.NODE_ENV === "production"
    ? "__Host-festival_admin_csrf"
    : "festival_admin_csrf";

export const adminCsrfHeader = "x-csrf-token";

export const adminCookieLifetimeSeconds = 60 * 60 * 8;

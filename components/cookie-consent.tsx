"use client";

import { useSyncExternalStore } from "react";

const consentKey = "lays-festival-cookie-notice";
const consentEvent = "lays-festival-cookie-consent-change";
let dismissedWithoutStorage = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(consentEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(consentEvent, callback);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(consentKey) !== "accepted";
  } catch {
    return !dismissedWithoutStorage;
  }
}

export function CookieConsent() {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!isVisible) return null;

  function accept() {
    try {
      window.localStorage.setItem(consentKey, "accepted");
    } catch {
      dismissedWithoutStorage = true;
    }
    window.dispatchEvent(new Event(consentEvent));
  }

  return (
    <aside className="festival-cookie-notice" aria-label="Уведомление о cookie">
      <p>
        Сайт использует файлы cookie и сервисы аналитики для технической
        статистики. <a href="/privacy">Подробнее</a>
      </p>
      <button onClick={accept} type="button">ОК</button>
    </aside>
  );
}

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  trackFestivalEvent,
  trackGoogleEvent,
  trackYandexGoal,
} from "@/lib/analytics";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

describe("analytics helpers", () => {
  it("безопасно ничего не делает на сервере", () => {
    Reflect.deleteProperty(globalThis, "window");
    expect(() => trackGoogleEvent("registration_form_view")).not.toThrow();
    expect(() => trackYandexGoal("registration_form_view")).not.toThrow();
    expect(() => trackFestivalEvent("registration_form_view")).not.toThrow();
  });

  it("отправляет стабильное событие в оба доступных счётчика", () => {
    const gtag = vi.fn();
    const ym = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { gtag, ym },
    });

    trackFestivalEvent("registration_success", {
      email_delivered: true,
      guests_count: 2,
    });

    expect(gtag).toHaveBeenCalledWith("event", "registration_success", {
      email_delivered: true,
      guests_count: 2,
    });
    expect(ym).toHaveBeenCalledWith(
      111386192,
      "reachGoal",
      "registration_success",
      { email_delivered: true, guests_count: 2 },
    );
  });
});

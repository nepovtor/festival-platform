"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { href: "#about", label: "О фестивале" },
  { href: "#artists", label: "Артисты" },
  { href: "#zones", label: "Развлечения" },
  { href: "#program", label: "Программа" },
] as const;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 961px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);

    if (!isOpen) return () => document.body.classList.remove("menu-open");

    const backgroundElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main, footer, .festival-cookie-notice",
      ),
    );
    const previousInertValues = backgroundElements.map((element) => element.inert);
    backgroundElements.forEach((element) => {
      element.inert = true;
    });

    const firstLink = navigationRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    const handleMenuKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = [
        toggleRef.current,
        ...Array.from(
          navigationRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ??
            [],
        ),
      ].filter(
        (element): element is HTMLButtonElement | HTMLAnchorElement =>
          element !== null,
      );
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleMenuKeyboard);

    return () => {
      window.removeEventListener("keydown", handleMenuKeyboard);
      backgroundElements.forEach((element, index) => {
        element.inert = previousInertValues[index];
      });
      document.body.classList.remove("menu-open");
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);
  const headerClassName = [
    "site-header",
    isScrolled ? "is-scrolled" : "",
    isOpen ? "has-open-menu" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className="site-header-inner">
        <a
          className="header-brand"
          href="#top"
          aria-label="Грибной фестиваль Lay’s — наверх"
          onClick={closeMenu}
        >
          <Image
            alt="Lay’s"
            height={62}
            priority
            src="/images/lays-logo-pack-cutout.webp"
            width={62}
          />
        </a>

        <button
          aria-controls="site-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          className="menu-toggle"
          onClick={() => setIsOpen((current) => !current)}
          ref={toggleRef}
          type="button"
        >
          <span />
          <span />
        </button>

        <nav
          className={isOpen ? "site-navigation is-open" : "site-navigation"}
          id="site-navigation"
          aria-label="Навигация по странице"
          ref={navigationRef}
        >
          {navigation.map((item) => (
            <a href={item.href} key={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a className="header-register" href="#registration" onClick={closeMenu}>
            Зарегистрироваться
          </a>
        </nav>
      </div>
    </header>
  );
}

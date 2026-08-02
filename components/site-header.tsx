"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const navigation = [
  { href: "#about", label: "О фестивале" },
  { href: "#artists", label: "Артисты" },
  { href: "#zones", label: "Зоны" },
  { href: "#program", label: "Программа" },
] as const;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="header-brand" href="#top" aria-label="Грибной фестиваль Lay’s — наверх">
          <Image
            alt="Lay’s"
            height={48}
            priority
            src="/images/lays-logo-pack-cutout.webp"
            width={48}
          />
          <span>
            Грибной
            <small>фестиваль</small>
          </span>
        </a>

        <button
          aria-controls="site-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          className="menu-toggle"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
        </button>

        <nav
          className={isOpen ? "site-navigation is-open" : "site-navigation"}
          id="site-navigation"
          aria-label="Навигация по странице"
        >
          {navigation.map((item) => (
            <a href={item.href} key={item.href} onClick={() => setIsOpen(false)}>
              {item.label}
            </a>
          ))}
          <a
            className="header-register"
            href="#registration"
            onClick={() => setIsOpen(false)}
          >
            Зарегистрироваться
          </a>
        </nav>
      </div>
    </header>
  );
}

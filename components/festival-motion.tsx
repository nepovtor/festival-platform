"use client";

import { useEffect } from "react";

const motionClass = "festival-motion-ready";

export function FestivalMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const parallaxElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    root.classList.add(motionClass);

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return () => root.classList.remove(motionClass);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -9%", threshold: 0.1 },
    );
    revealElements.forEach((element) => observer.observe(element));

    const updateParallax = () => {
      animationFrame = 0;
      const viewportCenter = window.innerHeight / 2;
      parallaxElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > window.innerHeight + 120) return;
        const distance = (rect.top + rect.height / 2 - viewportCenter) / window.innerHeight;
        const speed = Number(element.dataset.parallaxSpeed ?? 10);
        const offset = Math.max(-1, Math.min(1, distance)) * speed;
        element.style.setProperty("--festival-parallax", `${offset.toFixed(2)}px`);
      });
    };

    const requestParallaxUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
    window.addEventListener("resize", requestParallaxUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestParallaxUpdate);
      window.removeEventListener("resize", requestParallaxUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      root.classList.remove(motionClass);
    };
  }, []);

  return null;
}

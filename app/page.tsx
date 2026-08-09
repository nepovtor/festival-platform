import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache, type CSSProperties } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { FestivalMotion } from "@/components/festival-motion";
import { FestivalTrophyIcon } from "@/components/festival-trophy-icon";
import { FestivalZoneIcon, festivalZoneIconNames } from "@/components/festival-zone-icon";
import { RegistrationForm } from "@/components/registration-form";
import { SocialIcon } from "@/components/social-icon";
import { TrackedCalendarLink } from "@/components/tracked-calendar-link";
import { VisitRules } from "@/components/visit-rules";
import {
  festival as campaignFestival,
  festivalRecord,
  zones,
} from "@/content/festival";
import { getSiteContent } from "@/db";
import { buildFestivalCalendarUrl } from "@/lib/festival-calendar";

export const dynamic = "force-dynamic";

const loadSiteContent = cache(getSiteContent);

const artistPosterItems = [
  {
    className: "artist-poster-police",
    name: "Police in Paris",
    src: "/images/artists/police-in-paris.jpg",
  },
  {
    className: "artist-poster-wasssup",
    name: "WASSSUP",
    src: "/images/artists/wasssup.jpg",
  },
  {
    className: "artist-poster-parade",
    name: "Parade of Planets",
    src: "/images/artists/parade-of-planets.jpg",
  },
  {
    className: "artist-poster-hurakan",
    name: "Кавер-группа «Хуракан»",
    src: "/images/artists/hurakan-real.webp",
  },
  {
    className: "artist-poster-dj",
    name: "DJ Antono Kostritsky",
    src: "/images/artists/dj-antono-kostritsky.jpg",
  },
  {
    className: "artist-poster-trakt",
    name: "Борисовский тракт",
    src: "/images/artists/borisovskiy-trakt.jpg",
  },
] as const;

function compactDate(value: string) {
  return value.replace(/\s+\d{4}\s*$/u, "").trim();
}

function compactPlace(value: string) {
  return value
    .replace(/^верхняя площадка\s+/iu, "")
    .replace(/^стадиона(?=\s|$)/iu, "Стадион")
    .trim();
}

function compactAddress(value: string) {
  return value
    .replace(/^минск,?\s*/iu, "")
    .replace(/,?\s*корпус\s*/iu, "/")
    .trim();
}

function revealStyle(index: number) {
  return {
    "--reveal-delay": `${Math.min(index, 6) * 70}ms`,
  } as CSSProperties;
}

export async function generateMetadata(): Promise<Metadata> {
  const { festival } = await loadSiteContent();
  const dateShort = compactDate(festival.date);
  const placeShort = compactPlace(festival.place);
  const description = `${festival.date}, ${festival.time}. ${festival.place}, ${festival.address}. ${campaignFestival.admission}.`;

  return {
    title: `${festival.name} — ${dateShort}, ${placeShort}`,
    description,
    openGraph: {
      title: festival.name,
      description,
      type: "website",
      locale: "ru_RU",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${festival.name} — ${dateShort}, ${placeShort}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: festival.name,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function Home() {
  const content = await loadSiteContent();
  const { festival, heroImage, program } = content;
  const dateShort = compactDate(festival.date);
  const placeShort = compactPlace(festival.place);
  const addressShort = compactAddress(festival.address);
  const city = festival.address.split(",")[0]?.trim() || "Минск";

  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <main className="festival-2026" id="main-content">
        <FestivalMotion />

        <section
          className="festival-poster-stage"
          id="top"
          aria-labelledby="festival-poster-title"
        >
          <h1 className="festival-poster-accessible-title" id="festival-poster-title">
            Грибной фестиваль Lay’s
          </h1>
          <Image
            alt="Афиша грибного фестиваля Lay’s: 16 августа, стадион «Динамо», вход бесплатный"
            className="festival-poster-image"
            height={1411}
            priority
            sizes="100vw"
            src="/images/festival-poster-reference-v2.png"
            width={1114}
          />

          <span className="festival-poster-date" aria-label={`Дата фестиваля: ${dateShort}`}>
            {dateShort}
          </span>

          <span className="festival-poster-anchor festival-poster-about-anchor" id="about" />

          <nav className="festival-poster-hotspots" aria-label="Навигация по афише">
            <a className="poster-hotspot poster-hotspot-about" href="#about">
              <span>О фестивале</span>
            </a>
            <a className="poster-hotspot poster-hotspot-artists" href="#artists">
              <span>Артисты</span>
            </a>
            <a className="poster-hotspot poster-hotspot-zones" href="#zones">
              <span>Развлечения</span>
            </a>
            <a className="poster-hotspot poster-hotspot-program" href="#program">
              <span>Программа</span>
            </a>
            <a className="poster-hotspot poster-hotspot-top-register" href="#registration">
              <span>Зарегистрироваться</span>
            </a>
            <a className="poster-hotspot poster-hotspot-main-register" href="#registration">
              <span>Зарегистрироваться</span>
            </a>
          </nav>
        </section>

        <section
          className="festival-artists festival-artists-continuation festival-section"
          id="artists"
          aria-labelledby="artists-title"
        >
          <div className="festival-shell">
            <header className="festival-heading festival-heading-centered" data-reveal>
              <div className="festival-heading-rule" aria-hidden="true" />
              <h2 id="artists-title">Тот самый вкус, та самая музыка</h2>
              <div className="festival-heading-rule" aria-hidden="true" />
            </header>

            <div className="festival-artist-poster" data-reveal aria-label="Артисты фестиваля">
              {artistPosterItems.map((artist, index) => (
                <article
                  className={`artist-poster-item ${artist.className}`}
                  key={artist.name}
                  style={revealStyle(index)}
                >
                  <div className="artist-poster-photo">
                    <Image
                      alt={artist.name}
                      fill
                      sizes="(max-width: 700px) 64vw, 30vw"
                      src={artist.src}
                    />
                  </div>
                  <h3>{artist.name}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="festival-zones festival-section" id="zones" aria-labelledby="zones-title">
          <div className="festival-shell">
            <header className="festival-heading festival-heading-centered" data-reveal>
              <p className="festival-section-index">03 / Развлечения</p>
              <div className="festival-heading-rule" aria-hidden="true" />
              <h2 id="zones-title">Тот самый вкус, те самые развлечения</h2>
              <div className="festival-heading-rule" aria-hidden="true" />
            </header>

            <article className="festival-record" id="record" data-reveal>
              <div className="festival-record-image">
                <Image
                  alt="Большая сковорода с картофелем и грибами возле стадиона «Динамо»"
                  fill
                  sizes="(max-width: 820px) 100vw, 1290px"
                  src="/images/mushroom-record.webp"
                />
              </div>
              <div className="festival-record-copy">
                <div>
                  <h3>{festivalRecord.title}</h3>
                  <p>{festivalRecord.description}</p>
                </div>
                <FestivalTrophyIcon />
              </div>
            </article>

            <div className="festival-zone-pills" aria-label="Фестивальные зоны">
              {zones.map((zone, index) => (
                <article data-reveal key={zone.title} style={revealStyle(index)}>
                  <h3>{zone.title}</h3>
                  <FestivalZoneIcon name={festivalZoneIconNames[index] ?? "activity"} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="festival-program festival-section" id="program" aria-labelledby="program-title">
          <div
            className="festival-program-pack festival-program-pack-left"
            aria-hidden="true"
            data-parallax
            data-parallax-speed="14"
          >
            <Image alt="" height={240} src={heroImage} width={180} />
          </div>
          <div
            className="festival-program-pack festival-program-pack-right"
            aria-hidden="true"
            data-parallax
            data-parallax-speed="-17"
          >
            <Image alt="" height={270} src={heroImage} width={203} />
          </div>

          <div className="festival-shell">
            <header className="festival-heading festival-heading-centered" data-reveal>
              <p className="festival-section-index">04 / Программа</p>
              <div className="festival-heading-rule" aria-hidden="true" />
              <h2 id="program-title">Найдите для себя то самое событие дня</h2>
              <div className="festival-heading-rule" aria-hidden="true" />
            </header>

            <div className="festival-program-meta" data-reveal>
              <strong>{dateShort}</strong>
              <span>{festival.time}</span>
              <span>{placeShort} · {city}</span>
            </div>

            <ol className="festival-timeline">
              {program.map((item, index) => (
                <li data-reveal key={`${item.time}-${item.title}`} style={revealStyle(index % 6)}>
                  <time>{item.time}</time>
                  <div className="festival-timeline-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <small>{item.venue}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="festival-registration festival-section" id="registration" aria-labelledby="registration-title">
          <div className="festival-shell festival-registration-grid">
            <div className="festival-registration-product" aria-hidden="true" data-reveal>
              <span className="festival-registration-rings" />
              <Image
                alt=""
                className="festival-floating-pack"
                height={768}
                sizes="(max-width: 820px) 68vw, 500px"
                src={heroImage}
                width={577}
              />
            </div>

            <div className="festival-registration-content" data-reveal>
              <p className="festival-section-index">05 / Регистрация</p>
              <h2 id="registration-title">
                Зарегистрируйтесь и приходите на «Грибной фестиваль Lay’s»!
              </h2>
              <p>
                Заполните форму, чтобы получить подтверждение регистрации и всю
                необходимую информацию о фестивале на электронную почту.
              </p>
              <div className="festival-registration-facts">
                <span>{dateShort}</span>
                <span>{festival.time}</span>
                <span>{placeShort}, {addressShort}</span>
              </div>
              <TrackedCalendarLink
                className="festival-calendar-link"
                href={buildFestivalCalendarUrl(content)}
              >
                Добавить в календарь <span aria-hidden="true">↗</span>
              </TrackedCalendarLink>
              <div className="festival-registration-form">
                <RegistrationForm />
              </div>
            </div>
          </div>
        </section>

        <VisitRules />
      </main>

      <footer className="festival-footer">
        <div className="festival-shell festival-footer-inner">
          <Image
            alt="Lay’s"
            height={90}
            src="/images/lays-logo-pack-cutout.webp"
            width={90}
          />
          <div className="festival-footer-socials" aria-label="Социальные сети Lay’s">
            <a href="https://www.instagram.com/lays/" rel="noreferrer" target="_blank" aria-label="Lay’s в Instagram"><SocialIcon name="instagram" /></a>
            <a href="https://www.tiktok.com/@lays" rel="noreferrer" target="_blank" aria-label="Lay’s в TikTok"><SocialIcon name="tiktok" /></a>
            <a href="https://vk.com/lays" rel="noreferrer" target="_blank" aria-label="Lay’s во ВКонтакте"><SocialIcon name="vk" /></a>
          </div>
          <div className="festival-footer-facts">
            <strong>{dateShort}, {festival.time}</strong>
            <span>{placeShort}, {addressShort}</span>
            <span>
              {campaignFestival.age} · {campaignFestival.admission.replace(/^Вход\s+/iu, "")}
            </span>
          </div>
          <p className="festival-footer-license">
            Удостоверение № 3614 от 05.08.2026 г. выдано Управлением культуры
            Минского городского исполнительного комитета. Организатор: ООО
            «Голоса Бай», УНП 693285991
          </p>
          <div className="festival-footer-links">
            <span>© 2026 Lay’s</span>
            <Link href="/privacy">Политика обработки данных</Link>
            <a href="mailto:festival@lays.by">festival@lays.by</a>
          </div>
        </div>
      </footer>
      <CookieConsent />
    </>
  );
}

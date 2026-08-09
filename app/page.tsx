import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache, type CSSProperties } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { FestivalFactIcon } from "@/components/festival-fact-icon";
import { FestivalMotion } from "@/components/festival-motion";
import { FestivalTrophyIcon } from "@/components/festival-trophy-icon";
import { FestivalZoneIcon, festivalZoneIconNames } from "@/components/festival-zone-icon";
import { RegistrationForm } from "@/components/registration-form";
import { SiteHeader } from "@/components/site-header";
import { SocialIcon } from "@/components/social-icon";
import { TrackedCalendarLink } from "@/components/tracked-calendar-link";
import { VisitRules } from "@/components/visit-rules";
import {
  artistImages,
  artists,
  festival as campaignFestival,
  festivalRecord,
  zones,
} from "@/content/festival";
import type { ProgramContentItem } from "@/content/site-content";
import { getSiteContent } from "@/db";
import { buildFestivalCalendarUrl } from "@/lib/festival-calendar";

export const dynamic = "force-dynamic";

const loadSiteContent = cache(getSiteContent);

const artistFallbackImages = [
  "/images/evening-concert.webp",
  "/images/hero-festival.webp",
  "/images/craft-workshop.webp",
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

function normalizeArtistName(value: string) {
  return value
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[«»“”„'’()]/gu, " ")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .trim();
}

function artistTime(artist: string, program: ProgramContentItem[]) {
  const ignored = new Set([
    "выступление",
    "группы",
    "группа",
    "кавер",
    "бэнд",
    "band",
  ]);
  const artistTokens = normalizeArtistName(artist)
    .split(" ")
    .filter((token) => token.length > 3 && !ignored.has(token));
  const matchingItem = program.find((item) => {
    const title = normalizeArtistName(item.title);
    return artistTokens.some((token) => title.includes(token));
  });

  return matchingItem?.time ?? "В течение дня";
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
  const { festival, gallery, heroImage, program, programImage } = content;
  const dateShort = compactDate(festival.date);
  const placeShort = compactPlace(festival.place);
  const addressShort = compactAddress(festival.address);
  const city = festival.address.split(",")[0]?.trim() || "Минск";
  const featureImage = gallery.at(-1);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <SiteHeader />

      <main className="festival-2026" id="main-content">
        <FestivalMotion />

        <section className="festival-hero" id="top" aria-labelledby="hero-title">
          <Image
            alt=""
            aria-hidden="true"
            className="festival-hero-background"
            fill
            priority
            sizes="100vw"
            src="/images/hero-festival.webp"
          />
          <div className="festival-hero-shade" aria-hidden="true" />
          <div
            className="festival-note festival-note-one"
            aria-hidden="true"
            data-parallax
            data-parallax-speed="18"
          >
            ♪
          </div>
          <div
            className="festival-note festival-note-two"
            aria-hidden="true"
            data-parallax
            data-parallax-speed="-12"
          >
            ♫
          </div>

          <div className="festival-shell festival-hero-inner">
            <div className="festival-hero-copy" data-hero-entrance>
              <p className="festival-eyebrow">Возвращение того самого вкуса</p>
              <div className="festival-hero-brand">
                <Image
                  alt="Lay’s"
                  className="festival-hero-logo"
                  height={190}
                  src="/images/lays-logo-pack-cutout.webp"
                  width={190}
                />
                <span>представляет</span>
              </div>
              <h1 id="hero-title">
                Грибной
                <span>фестиваль</span>
              </h1>
              <p className="festival-hero-lead">{festival.description}</p>
              <a className="festival-primary-button" href="#registration">
                Зарегистрироваться <span aria-hidden="true">↘</span>
              </a>
            </div>

            <div className="festival-hero-product" aria-hidden="true">
              <span className="festival-product-rings" />
              <Image
                alt=""
                className="festival-product-pack festival-floating-pack"
                height={768}
                priority
                sizes="(max-width: 720px) 72vw, (max-width: 1100px) 45vw, 490px"
                src={heroImage}
                width={577}
              />
              <span className="festival-return-label">
                <strong>Он вернулся!</strong>
                <small>тот самый вкус</small>
              </span>
            </div>
          </div>

          <dl className="festival-hero-facts" aria-label="Информация о фестивале">
            <div>
              <dt aria-label="Дата"><FestivalFactIcon name="calendar" /></dt>
              <dd>{dateShort}</dd>
            </div>
            <div>
              <dt aria-label="Время"><FestivalFactIcon name="clock" /></dt>
              <dd>{festival.time}</dd>
            </div>
            <div className="festival-hero-location">
              <dt aria-label="Место"><FestivalFactIcon name="pin" /></dt>
              <dd>{placeShort}, {addressShort}</dd>
            </div>
            <div className="festival-hero-admission">
              <dt>{campaignFestival.age}</dt>
              <dd>{campaignFestival.admission}</dd>
            </div>
          </dl>
        </section>

        <section className="festival-about festival-section" id="about" aria-labelledby="about-title">
          <div className="festival-shell">
            <div className="festival-about-grid">
              <div className="festival-about-copy" data-reveal>
                <p className="festival-section-index">01 / О фестивале</p>
                <h2 id="about-title">Главное грибное событие этого лета</h2>
                <p className="festival-about-intro">{festival.about}</p>
                <p>
                  Здесь встречаются любимый вкус, музыка, развлечения и атмосфера
                  яркого летнего отдыха. Приходите всей семьёй — вход свободный.
                </p>
                <div className="festival-about-location">
                  <span aria-hidden="true">●</span>
                  <p>
                    <strong>{placeShort}</strong>
                    {addressShort}
                  </p>
                </div>
              </div>

              <div className="festival-about-visual" data-reveal data-parallax data-parallax-speed="9">
                <Image
                  alt="Площадка грибного фестиваля Lay’s"
                  className="festival-about-still-life"
                  fill
                  sizes="(max-width: 820px) 100vw, 50vw"
                  src={programImage}
                />
                <div className="festival-about-product" aria-hidden="true">
                  <Image
                    alt=""
                    className="festival-floating-pack"
                    height={768}
                    sizes="(max-width: 560px) 62vw, 340px"
                    src={heroImage}
                    width={577}
                  />
                </div>
                <span className="festival-about-badge">Снова<br />с нами</span>
              </div>
            </div>

            <div className="festival-feature-grid" aria-label="Главное о фестивале">
              {festival.features.map((feature, index) => (
                <article data-reveal key={`${feature.title}-${index}`} style={revealStyle(index)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
              {featureImage && (
                <figure className="festival-feature-photo" data-reveal>
                  <Image
                    alt={featureImage.alt}
                    fill
                    sizes="(max-width: 820px) 100vw, 1296px"
                    src={featureImage.src}
                    style={{ objectPosition: featureImage.position }}
                  />
                  <figcaption>
                    <strong>{dateShort}, {festival.time}</strong>
                    <span>{campaignFestival.age} · {campaignFestival.admission}</span>
                  </figcaption>
                </figure>
              )}
            </div>

          </div>
        </section>

        <section className="festival-artists festival-section" id="artists" aria-labelledby="artists-title">
          <div className="festival-shell">
            <header className="festival-heading festival-heading-centered" data-reveal>
              <p className="festival-section-index">02 / Артисты</p>
              <div className="festival-heading-rule" aria-hidden="true" />
              <h2 id="artists-title">Тот самый вкус, та самая музыка</h2>
              <div className="festival-heading-rule" aria-hidden="true" />
            </header>

            <div className="festival-artist-grid">
              {artists.map((artist, index) => (
                <article
                  className={`festival-artist-card festival-artist-card-${(index % 5) + 1}`}
                  data-reveal
                  key={artist}
                  style={revealStyle(index)}
                >
                  <div className="festival-artist-image">
                    <Image
                      alt={artistImages[index]?.alt || `Выступление ${artist}`}
                      fill
                      sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 34vw"
                      src={artistImages[index]?.src ?? artistFallbackImages[index % artistFallbackImages.length]}
                      style={{ objectPosition: artistImages[index]?.position }}
                    />
                  </div>
                  <div className="festival-artist-name">
                    <h3>{artist}</h3>
                    <span>{artistTime(artist, program)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="festival-music-ribbon" aria-hidden="true">
            <span>МУЗЫКА • ЛЕТО • ТОТ САМЫЙ ВКУС • МУЗЫКА • ЛЕТО • ТОТ САМЫЙ ВКУС •</span>
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
                  <span className="festival-timeline-marker" aria-hidden="true">
                    <i />
                  </span>
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

import Image from "next/image";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { getSiteContent } from "@/db";

export const dynamic = "force-dynamic";

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default async function Home() {
  const { festival, program, heroImage, programImage, gallery } =
    await getSiteContent();

  return (
    <main className="festival-page" id="top">
      <section className="festival-card hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">
            Город
            <br />
            говорит
          </h1>
          <div className="event-facts" aria-label="Дата и место фестиваля">
            <p>
              <CalendarIcon />
              <span>{festival.date}</span>
            </p>
            <p>
              <PinIcon />
              <span>{festival.place}</span>
            </p>
          </div>
          <p className="hero-description">{festival.description}</p>
          <a className="button" href="#registration">
            Приду
          </a>
        </div>
        <div className="hero-image">
          <Image
            alt="Гости городского фестиваля отдыхают у музыкальной сцены в парке"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 62vw"
            src={heroImage}
            unoptimized
          />
        </div>
      </section>

      <section className="festival-card about" id="about" aria-labelledby="about-title">
        <div className="compact-copy">
          <h2 id="about-title">О фестивале</h2>
          <p>{festival.about}</p>
        </div>
        <div className="feature-grid">
          {festival.features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <Image
                alt=""
                fill
                sizes="(max-width: 700px) 30vw, 20vw"
                src={
                  index === 0
                    ? "/images/evening-concert.webp"
                    : index === 1
                      ? "/images/craft-workshop.webp"
                      : "/images/hero-festival.webp"
                }
              />
              <p>{feature.title}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="festival-card program-section"
        id="program"
        aria-labelledby="program-title"
      >
        <div className="program-copy">
          <h2 id="program-title">Программа</h2>
          <ol className="timeline">
            {program.map((item) => (
              <li key={item.time}>
                <time>{item.time}</time>
                <span>{item.title}</span>
              </li>
            ))}
          </ol>
        </div>
        <figure className="program-image">
          <Image
            alt="Вечерний концерт фестиваля под гирляндами"
            fill
            sizes="(max-width: 700px) 100vw, 48vw"
            src={programImage}
            unoptimized
          />
        </figure>
      </section>

      <section
        className="festival-card gallery-section"
        id="gallery"
        aria-labelledby="gallery-title"
      >
        <h2 id="gallery-title">Атмосфера фестиваля</h2>
        <div className="gallery-grid">
          {gallery.map((item, index) => (
            <figure className={item.className} key={`${item.alt}-${index}`}>
              <Image
                alt={item.alt}
                fill
                loading="lazy"
                sizes="(max-width: 700px) 50vw, 25vw"
                src={item.src}
                style={{ objectPosition: item.position }}
                unoptimized
              />
            </figure>
          ))}
        </div>
      </section>

      <section
        className="festival-card registration-section"
        id="registration"
        aria-labelledby="registration-title"
      >
        <div className="registration-copy">
          <h2 id="registration-title">Предварительная регистрация</h2>
          <p>
            Регистрация бесплатна и поможет нам подготовить комфортную
            инфраструктуру фестиваля.
          </p>
        </div>
        <RegistrationForm />
      </section>

      <footer className="site-footer">
        <span>© 2026 «Город говорит»</span>
        <Link href="/privacy">Политика данных</Link>
      </footer>
    </main>
  );
}

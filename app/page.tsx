import Image from "next/image";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { SiteHeader } from "@/components/site-header";
import {
  artists,
  festival as campaignFestival,
  zones,
} from "@/content/festival";
import { getSiteContent } from "@/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { festival, gallery, heroImage, program, programImage } =
    await getSiteContent();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <SiteHeader />

      <main className="campaign-page" id="main-content">
        <section className="campaign-hero" id="top" aria-labelledby="hero-title">
          <div className="hero-paper-texture" aria-hidden="true" />
          <div className="hero-content shell">
            <div className="hero-copy">
              <p className="campaign-kicker">
                Возвращение того самого вкуса
                <span aria-hidden="true">●</span>
                Минск
              </p>
              <div className="hero-brand-row">
                <Image
                  alt="Lay’s"
                  className="hero-logo"
                  height={104}
                  priority
                  src="/images/lays-logo-pack-cutout.webp"
                  width={104}
                />
                <span>представляет</span>
              </div>
              <h1 id="hero-title">
                Грибной
                <br />
                фестиваль
              </h1>
              <p className="hero-lead">{festival.description}</p>

              <div className="hero-actions">
                <a className="campaign-button campaign-button-red" href="#registration">
                  Зарегистрироваться <span aria-hidden="true">↘</span>
                </a>
                <span className="free-entry">Вход бесплатный</span>
              </div>
            </div>

            <div className="hero-product" aria-label="Lay’s Белые грибы со сметаной">
              <span className="hero-burst" aria-hidden="true" />
              <span className="decor-chip decor-chip-one" aria-hidden="true" />
              <span className="decor-chip decor-chip-two" aria-hidden="true" />
              <span className="decor-leaf decor-leaf-one" aria-hidden="true">◆</span>
              <span className="decor-leaf decor-leaf-two" aria-hidden="true">◆</span>
              <Image
                alt="Пачка Lay’s со вкусом «Белые грибы со сметаной»"
                className="product-pack"
                height={768}
                priority
                sizes="(max-width: 767px) 86vw, (max-width: 1100px) 46vw, 520px"
                src={heroImage}
                width={577}
              />
              <div className="return-sticker">
                <strong>Он вернулся!</strong>
                <span>Тот самый вкус</span>
              </div>
            </div>

            <dl className="hero-facts" aria-label="Главная информация о фестивале">
              <div>
                <dt>Когда</dt>
                <dd>{campaignFestival.dateShort}</dd>
              </div>
              <div>
                <dt>Время</dt>
                <dd>{festival.time}</dd>
              </div>
              <div className="hero-fact-location">
                <dt>Где</dt>
                <dd>
                  {festival.place}
                  <small>{festival.address}</small>
                </dd>
              </div>
              <div className="age-mark">
                <dt>Возраст</dt>
                <dd>{campaignFestival.age}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="about-section section-pad" id="about" aria-labelledby="about-title">
          <div className="shell">
            <div className="section-heading about-heading">
              <p className="section-number">01 / О фестивале</p>
              <h2 id="about-title">Главное грибное событие этого лета</h2>
            </div>

            <div className="about-layout">
              <div className="about-copy">
                <p className="about-intro">{festival.about}</p>
                <p>
                  Приходите всей семьёй: пробовать, слушать музыку, участвовать
                  в мастер-классах и отмечать возвращение вкуса, по которому мы
                  успели соскучиться.
                </p>
                <div className="flavour-note">
                  <span aria-hidden="true">✦</span>
                  <p>
                    <strong>Lay’s «Белые грибы со сметаной»</strong>
                    Снова хрустит. Снова влюбляет.
                  </p>
                </div>
              </div>

              <figure className="stadium-card">
                <Image
                  alt="Национальный олимпийский стадион «Динамо» в Минске"
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                  src={programImage}
                />
                <figcaption>
                  <span>Место встречи</span>
                  <strong>Верхняя площадка стадиона «Динамо»</strong>
                  <small>ул. Кирова, 8, корпус 6</small>
                </figcaption>
              </figure>
            </div>

            <div className="flavour-campaign-card">
              <Image
                alt="Белые грибы, молодой картофель, золотистые чипсы и лесные листья"
                fill
                sizes="(max-width: 767px) 100vw, 1200px"
                src="/images/mushroom-still-life-v2.webp"
              />
              <div className="flavour-campaign-copy">
                <span>Вкус снова с нами</span>
                <h3>Белые грибы<br />со сметаной</h3>
                <p>
                  Тот самый аромат леса и золотистый хруст — в пачке Lay’s и
                  в программе целого городского фестиваля.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="artists-section section-pad" id="artists" aria-labelledby="artists-title">
          <div className="shell">
            <div className="section-heading light-heading">
              <p className="section-number">02 / Артисты</p>
              <h2 id="artists-title">Музыка, которая звучит вкусно</h2>
              <p>Живые выступления с полудня до самого вечера.</p>
            </div>

            <div className="headliner-grid">
              {artists.slice(0, 2).map((artist, index) => (
                <article className="headliner-card" key={artist}>
                  <Image
                    alt={`Выступление ${artist} на фестивальной сцене`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    src={index === 0
                      ? "/images/evening-concert.webp"
                      : "/images/hero-festival.webp"}
                  />
                  <div>
                    <span>Хэдлайнер</span>
                    <h3>{artist}</h3>
                    <small>{index === 0 ? "15:40–16:40" : "20:30–22:00"}</small>
                  </div>
                </article>
              ))}
            </div>
            <div className="other-artists">
              <span>Также на сцене</span>
              <p>{artists.slice(2).join(" · ")}</p>
            </div>
          </div>
          <div className="artist-marquee" aria-hidden="true">
            <span>ХРУСТИМ • ТАНЦУЕМ • ВСТРЕЧАЕМ ТОТ САМЫЙ ВКУС • </span>
          </div>
        </section>

        <section className="zones-section section-pad" id="zones" aria-labelledby="zones-title">
          <div className="shell">
            <div className="section-heading zones-heading">
              <p className="section-number">03 / Фестивальные зоны</p>
              <h2 id="zones-title">Здесь есть чем заняться</h2>
              <p>
                Все зоны работают с 12:00 до 21:30. Отдельная регистрация нужна
                только на некоторые мастер-классы — записаться можно на месте.
              </p>
            </div>

            <div className="zones-grid">
              {zones.map((zone, index) => (
                <article className={`zone-card zone-${zone.tone}`} key={zone.title}>
                  <div className="zone-image" aria-hidden="true">
                    <Image
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      src={gallery[index]?.src ?? "/images/hero-festival.webp"}
                      style={{ objectPosition: gallery[index]?.position }}
                    />
                  </div>
                  <span className="zone-number">{zone.number}</span>
                  <div className="zone-copy">
                    <h3>{zone.title}</h3>
                    <p>{zone.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="program-section section-pad" id="program" aria-labelledby="program-title">
          <div className="shell program-layout">
            <div className="program-intro">
              <div className="section-heading">
                <p className="section-number">04 / Программа</p>
                <h2 id="program-title">Один день. Много поводов остаться до финала</h2>
              </div>
              <div className="program-date-card">
                <strong>16</strong>
                <span>августа<br />12:00–22:00</span>
              </div>
              <p>
                Программа может незначительно меняться. Следите за объявлениями
                ведущего на площадке.
              </p>
            </div>

            <ol className="campaign-timeline">
              {program.map((item, index) => (
                <li key={`${item.time}-${item.title}`}>
                  <div className="timeline-time">
                    <time>{item.time}</time>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="timeline-event">
                    <span className="timeline-category">{item.category}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <small>{item.venue}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="registration-section section-pad"
          id="registration"
          aria-labelledby="registration-title"
        >
          <div className="registration-decor" aria-hidden="true">
            <Image
              alt=""
              height={614}
              sizes="320px"
              src={heroImage}
              width={460}
            />
          </div>
          <div className="shell registration-layout">
            <div className="registration-copy">
              <p className="section-number">05 / Регистрация</p>
              <h2 id="registration-title">
                Зарегистрируйтесь и приходите на «Грибной фестиваль Lay’s»!
              </h2>
              <p>
                Заполните форму, чтобы получить подтверждение регистрации и всю
                необходимую информацию о фестивале на электронную почту.
              </p>
              <ul>
                <li>16 августа, 12:00–22:00</li>
                <li>Стадион «Динамо», ул. Кирова, 8/6</li>
                <li>0+ · бесплатно</li>
              </ul>
            </div>
            <div className="registration-form-card">
              <p className="form-kicker">Бесплатная регистрация</p>
              <RegistrationForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="campaign-footer">
        <div className="shell footer-grid">
          <div className="footer-brand">
            <Image
              alt="Lay’s"
              height={76}
              src="/images/lays-logo-pack-cutout.webp"
              width={76}
            />
            <strong>Грибной фестиваль Lay’s</strong>
            <span>Главное грибное событие этого лета.</span>
          </div>
          <div>
            <p>Когда и где</p>
            <strong>16 августа · 12:00–22:00</strong>
            <span>Стадион «Динамо»<br />ул. Кирова, 8, корпус 6</span>
          </div>
          <nav aria-label="Навигация в подвале">
            <p>Фестиваль</p>
            <a href="#artists">Артисты</a>
            <a href="#zones">Зоны</a>
            <a href="#program">Программа</a>
            <a href="#registration">Регистрация</a>
          </nav>
          <div className="footer-contacts">
            <p>Обратная связь</p>
            <a href="mailto:festival@lays.by">festival@lays.by</a>
            <div className="footer-socials" aria-label="Социальные сети Lay’s">
              <a href="https://www.instagram.com/lays/" rel="noreferrer" target="_blank" aria-label="Lay’s в Instagram">IG</a>
              <a href="https://www.tiktok.com/@lays" rel="noreferrer" target="_blank" aria-label="Lay’s в TikTok">TT</a>
              <a href="https://www.youtube.com/user/Lays" rel="noreferrer" target="_blank" aria-label="Lay’s на YouTube">YT</a>
            </div>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© 2026 Lay’s. Все права защищены.</span>
          <Link href="/privacy">Политика обработки данных</Link>
          <a
            href="https://commons.wikimedia.org/wiki/File:Dinamo-Stadium-Minsk-2019-01.jpg"
            rel="noreferrer"
            target="_blank"
          >
            Фото стадиона: Showmeheaven, CC BY-SA 4.0
          </a>
        </div>
      </footer>
    </>
  );
}

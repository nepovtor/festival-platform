# Грибной фестиваль Lay’s

Промо-платформа городского фестиваля к возвращению вкуса Lay’s «Белые грибы
со сметаной». Проект включает рекламный лендинг, регистрацию посетителей,
HTML-подтверждения по email и закрытую панель организатора.

## Что входит в проект

- адаптивный лендинг для 375, 768, 1024 и 1440 px;
- фиксированная навигация и мобильное меню;
- продуктовый первый экран, информация о фестивале, артисты и шесть зон;
- полная программа в виде вертикального таймлайна;
- форма регистрации на 1–10 человек с общей клиентской и серверной Zod-схемой;
- защита формы: ограничение размера запроса, honeypot, origin-проверка,
  SQLite rate limiting и уникальность email;
- SQLite-хранилище регистраций, статусов писем, попыток доставки, рассылок и
  редактируемого содержимого сайта;
- HTML- и text-письма через Resend с логотипом, датой, временем, адресом,
  количеством гостей, полной программой и ссылкой Google Calendar;
- A4 PDF с кириллицей и актуальной программой во вложении к каждому письму о
  регистрации, включая повторную отправку;
- сохранение заявки до отправки письма: сбой почты не удаляет регистрацию и
  записывается как `FAILED`;
- закрытая админка со статистикой, поиском, сортировкой, фильтром, повторной
  отправкой подтверждения, дополнительной рассылкой и экспортом XLSX;
- редактор текстов, программы и фотографий;
- CSP и security headers, same-origin API, CSRF double-submit token, безопасные
  cookies, bcrypt-пароль и ограничение попыток административного входа;
- Google Analytics и Яндекс Метрика с типизированными событиями регистрации и
  возможностью заменить публичные ID через переменные окружения;
- standalone production-сборка и Docker Compose с постоянным volume для данных.

## Архитектура

```text
app/
├── api/registrations/                  # публичная регистрация
├── api/admin/                          # вход, XLSX, письма, контент, фото
├── api/uploads/                        # выдача загруженных изображений
├── admin/                              # защищённая панель организатора
├── privacy/                            # политика обработки данных
├── globals.css                         # промо-дизайн и адаптив админки
├── layout.tsx                          # SEO и Open Graph
└── page.tsx                            # лендинг
components/                             # формы, меню и административный UI
content/                                # исходные данные фестиваля и программа
db/                                     # SQLite-схема, миграции и репозитории
lib/                                    # email, валидация, сессии, CSRF, rate limit
tests/                                  # Vitest-тесты данных, email и безопасности
public/images/                          # оптимизированные WebP-материалы кампании
```

Стек: Next.js 16, React 19, TypeScript, SQLite (`better-sqlite3`), Zod,
React Hook Form, Resend HTTP API, ExcelJS, Vitest и ESLint.

## DESIGN

Desktop-версия перенесена по приложенным screenshots и CSS-export нового
Figma-макета: фирменные песочный, кремовый, оранжевый и тёмно-зелёный цвета,
продуктовый hero, коллаж артистов, карточка рекорда и линейный таймлайн.
Исходный Figma-файл в окружении проекта не подключён, поэтому реализация
выполнена семантической React/CSS-вёрсткой по доступному desktop reference.

Основные диапазоны:

- `1181 px` и шире — полный desktop, эталонная проверка на `1440 px`;
- `821–1180 px` — компактный desktop и tablet landscape;
- `561–820 px` — tablet, двухколоночные карточки и мобильная навигация;
- `320–560 px` — самостоятельный phone layout: одна колонка, перестроенный
  таймлайн, форма и footer без горизонтального скролла.

Анимации ограничены появлением блоков, лёгким parallax, floating product pack и
бегущей строкой. При `prefers-reduced-motion: reduce` они отключаются.

## Локальный запуск

Нужен Node.js 22.13 или новее.

```bash
npm ci
cp .env.example .env
npm run dev
```

Сайт откроется на `http://localhost:3000`. SQLite-файл и загруженные фото по
умолчанию находятся в `data/`; каталог исключён из Git.

Для входа в `/admin` задайте уникальный логин, bcrypt-хеш и секрет сессии:

```bash
node -e "import('bcryptjs').then(({hash})=>hash('your-long-password',12).then(console.log))"
openssl rand -base64 48
```

Запишите результаты в `.env` как `ADMIN_PASSWORD_HASH` и
`ADMIN_SESSION_SECRET`. Готового администратора и стандартного пароля в проекте
нет. Bcrypt-хеш с символами `$` в `.env` для Docker Compose заключайте в
одинарные кавычки.

Без `RESEND_API_KEY` и `EMAIL_FROM` заявка всё равно сохраняется, а доставка
получает статус `FAILED` и остаётся доступной для retry из админки.

## QA

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

После production-сборки дополнительно проверьте в реальном браузере размеры
`320`, `360`, `768`, `1024` и `1440 px`, отсутствие horizontal overflow,
отправку событий в GA DebugView и Яндекс Метрике, а также письмо и PDF на
реальном почтовом ящике.

## DEPLOY

### Без Docker

```bash
npm ci
npm run build
npm run start
```

Перед запуском задайте все обязательные значения из `.env.example`, установите
`NEXT_PUBLIC_SITE_URL` и `SITE_ORIGIN` в один и тот же канонический HTTPS origin
и подключите постоянный диск для каталога `data/`.

### Docker Compose

```bash
cp .env.example .env
# заполните NEXT_PUBLIC_SITE_URL, SITE_ORIGIN, ADMIN_USERNAME,
# ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET и параметры Resend
docker compose up --build -d
docker compose logs -f festival
```

Контейнер слушает порт `3000`, работает от непривилегированного пользователя и
сохраняет базу и загрузки в volume `festival-data`. TLS должен завершаться на
reverse proxy или платформе хостинга. Для обновления:

```bash
docker compose build --pull
docker compose up -d
```

Public analytics IDs передаются и на этапе `docker compose build`, поскольку
Next.js включает `NEXT_PUBLIC_*` значения в клиентскую сборку. После деплоя
сделайте тестовую регистрацию: запись должна появиться в админке до попытки
отправки, а письмо должно содержать PDF-вложение.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Публичный канонический URL сайта |
| `SITE_ORIGIN` | Единственный разрешённый origin для POST/PUT/DELETE |
| `FESTIVAL_DB_FILE` | Путь к SQLite; необязателен при стандартном `data/` |
| `RESEND_API_KEY` | Ключ Resend |
| `EMAIL_FROM` | Подтверждённый отправитель |
| `EMAIL_REPLY_TO` | Адрес для ответов |
| `EMAIL_LOGO_URL` | Необязательный абсолютный URL логотипа в письме |
| `FESTIVAL_CALENDAR_START/END` | UTC-границы события для Google Calendar |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Публичный GA4 ID; по умолчанию `G-5TRMXGC4H8` |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Публичный ID Метрики; по умолчанию `111386192` |
| `ADMIN_USERNAME` | Уникальный логин организатора |
| `ADMIN_PASSWORD_HASH` | Bcrypt-хеш с cost 10–14, рекомендуется 12 |
| `ADMIN_SESSION_SECRET` | Случайный секрет не короче 32 символов |

## ANALYTICS

На публичных маршрутах один раз подключаются Google tag и Яндекс Метрика; из
`/admin/**` и `/api/**` аналитика полностью исключена вместе с её CSP-доменами.
Для Метрики включены `ssr`, Webvisor, clickmap, ecommerce `dataLayer`, точный
bounce tracking и trackLinks; также присутствует `noscript` pixel. Публичная CSP
разрешает только необходимые Google/Yandex script, connect, image и Webvisor
endpoints.

Через `lib/analytics.ts` в обе системы отправляются события
`registration_form_view`, `registration_start`, `registration_submit`,
`registration_success`, `registration_error` и `calendar_click`. Email и другие
персональные данные в параметры не передаются. Для production-проверки откройте
GA DebugView и отладчик Метрики, выполните регистрацию и убедитесь, что каждый
tag загружен один раз и цели приходят с указанными ID.

## EMAIL

Подтверждения отправляются server-side через Resend. Перед запуском:

1. Добавьте и подтвердите домен отправителя в Resend, включая выданные сервисом
   DNS-записи SPF/DKIM.
2. Задайте `RESEND_API_KEY` только в server environment.
3. Укажите подтверждённый sender в `EMAIL_FROM`.
4. Укажите реальный принимающий ответы адрес в `EMAIL_REPLY_TO`; Resend не
   создаёт для него почтовый ящик.
5. При необходимости задайте публичный PNG-логотип через `EMAIL_LOGO_URL`.

Сначала регистрация сохраняется в SQLite, затем создаются PDF и email attempt.
Ошибка рендера, PDF или Resend переводит доставку в `FAILED`, не удаляя заявку.
Retry из админки повторно берёт актуальные тексты и программу. Массовая рассылка
использует прежний поток и не получает registration PDF.

## PDF

`lib/registration-pdf.ts` генерирует настоящий A4 PDF через `pdf-lib` и
`@pdf-lib/fontkit`. Локальные Noto Sans Regular/Bold в `public/fonts/` встроены в
документ, поэтому русские тексты не зависят от шрифтов устройства. В PDF входят
дата, время, полное место, количество посетителей и программа из того же
`SiteContent`, что используются сайтом, письмом и админкой. Файл
`lays-festival-registration.pdf` кодируется в Base64 и передаётся в
`attachments` Resend confirmation email.

## API регистрации

`POST /api/registrations`, только same-origin JSON:

```json
{
  "email": "guest@example.com",
  "guestsCount": 3,
  "consent": true,
  "website": ""
}
```

Коды ответа: `201` — запись сохранена, `400` — валидация, `403` — неверный
origin, `409` — email уже зарегистрирован, `413` — большой запрос, `415` — не
JSON, `429` — превышен лимит, `500` — безопасная внутренняя ошибка.

## Перед публичным запуском

1. Согласуйте политику обработки данных и замените демонстрационный email.
2. Проверьте фактический год, программу, артистов и права на рекламные материалы.
3. Задайте production-секреты только в менеджере секретов платформы, не в Git.
4. Проверьте доставку писем, ссылку календаря, экспорт XLSX и резервное
   копирование `festival.sqlite`.
5. Размещайте один экземпляр приложения на один SQLite volume либо переходите
   на сетевую БД при горизонтальном масштабировании.

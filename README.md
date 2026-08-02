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
- сохранение заявки до отправки письма: сбой почты не удаляет регистрацию и
  записывается как `FAILED`;
- закрытая админка со статистикой, поиском, сортировкой, фильтром, повторной
  отправкой подтверждения, дополнительной рассылкой и экспортом XLSX;
- редактор текстов, программы и фотографий;
- CSP и security headers, same-origin API, CSRF double-submit token, безопасные
  cookies, bcrypt-пароль и ограничение попыток административного входа;
- опциональное подключение Google Analytics и Яндекс Метрики через переменные
  окружения, без изменения разметки страниц;
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
получает статус `FAILED`. Для реальной отправки подтвердите домен отправителя в
Resend и укажите публичный HTTPS URL.

## Проверка качества

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Production-запуск без Docker

```bash
npm ci
npm run build
npm run start
```

Перед запуском задайте все обязательные значения из `.env.example`, установите
`NEXT_PUBLIC_SITE_URL` и `SITE_ORIGIN` в один и тот же канонический HTTPS origin
и подключите постоянный диск для каталога `data/`.

## Деплой через Docker Compose

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
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Необязательный идентификатор GA4 формата `G-…` |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Необязательный числовой ID Яндекс Метрики |
| `ADMIN_USERNAME` | Уникальный логин организатора |
| `ADMIN_PASSWORD_HASH` | Bcrypt-хеш с cost 10–14, рекомендуется 12 |
| `ADMIN_SESSION_SECRET` | Случайный секрет не короче 32 символов |

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

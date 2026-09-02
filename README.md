# Email Panel — персональная панель email-рассылок с AI-уникализацией

Веб-панель для лидгена с собственного SMTP-ящика: уникализация каждого письма (Spintax + Claude Haiku), устойчивый импорт получателей, очередь с задержками, suppression list.

## Стек (строго по ТЗ)
- Next.js 15 (App Router), TypeScript
- Drizzle ORM + Neon Postgres
- bcryptjs + httpOnly cookie (jose JWT) — однопользовательская авторизация
- Nodemailer
- Inngest — фоновая очередь (с fallback на синхронный `/api/campaigns/[id]/run` для MVP)
- Anthropic Claude API (Haiku) — AI-перефразирование
- Tailwind CSS (v4) + shadcn/ui (ручные компоненты)
- Деплой: Vercel

## Быстрый старт — от нуля до первой рассылки (5 минут)

> Для человека, который открыл архив первый раз и идёт по шагам, без чтения кода.

### Шаг 1. Получить SMTP-данные ящика

Панель отправляет **с вашего** ящика. Выберите провайдера и создайте App Password (обычный пароль не подойдёт, если включена 2FA):

- **Gmail:** https://myaccount.google.com → Безопасность → 2-этапная аутентификация → **Пароли приложений** → создайте `Mail` → скопируйте 16-символьный код (без пробелов). Host `smtp.gmail.com`, порт `587` (TLS) или `465` (SSL). Логин = ваш Gmail.
- **Yandex:** https://id.yandex.ru → Безопасность → Пароли приложений → `Почта` → скопируйте пароль. Host `smtp.yandex.ru`, порт `465` SSL.
- **Mail.ru:** https://account.mail.ru → Пароли и безопасность → Пароли для внешних приложений → `Почта`. Host `smtp.mail.ru`, порт `465` SSL.
- **Outlook/Office365:** https://account.microsoft.com → Безопасность → Дополнительные параметры → Пароли приложений. Host `smtp.office365.com`, порт `587` TLS.
- **Свой домен (например, Timeweb/Beget):** возьмите host/port из панели хостинга (обычно `smtp.timeweb.ru:25` или `465`).

Сохраните: `host`, `port`, `login`, `app password`, `from email` (совпадает с логином), `from name` (как подписать письма).

### Шаг 2. Получить ANTHROPIC_API_KEY

1. Зарегистрируйтесь на https://console.anthropic.com → **API Keys** → Create Key → скопируйте `sk-ant-...`.
2. По умолчанию используется `claude-3-5-haiku-latest` (дешёвая быстрая модель для уникализации). Можно не менять.
3. Если ключа нет — панель всё равно работает: включится `mock` режим (добавляет `<!-- variant:N -->` и меняет тему), чтобы проверить, что тексты реально разные в логе кампании. Для продакшена ключ нужен.

### Шаг 3. Установка и запуск (всё бесплатно)

**Локально (Windows/Mac/Linux) — без Neon, без Gmail, без Claude ключа:**

```bash
# 1) Установите Node 20+ и pnpm: npm i -g pnpm
# 2) Распакуйте архив, перейдите в папку
pnpm install

# 3) База данных — 2 варианта, оба бесплатны:
#    Вариант A (0 настроек, для теста): оставьте DATABASE_URL пустым → используется in-memory pg-mem
#      Данные живут в памяти, пропадут после перезапуска, но для проверки шаблона/уникализации — идеально.
#    Вариант B (с сохранением, тоже бесплатно): https://console.neon.tech → New Project (Free 0.5GB) → скопируйте Connection String
#      или любой Postgres (DATABASE_URL=postgresql://user:pass@host/db)

cp .env.example .env
# Откройте .env блокнотом и заполните ТОЛЬКО:
# ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET, ENCRYPTION_KEY — обязательны всегда
# DATABASE_URL — оставьте пустым для in-memory (бесплатно) или вставьте Neon для сохранения
# ANTHROPIC_API_KEY — оставьте пустым для бесплатного mock, или вставьте sk-ant-... для реального AI

# 4) Создайте таблицы (только если DATABASE_URL задан, для Neon)
#    Для in-memory таблицы создаются автоматически, этот шаг можно пропустить!
if [ -n "$DATABASE_URL" ]; then pnpm db:push; fi   # Win: если DATABASE_URL задан → pnpm db:push

# 5) Запустите
pnpm dev            # http://localhost:3000
# Проверка сборки: pnpm build && pnpm start
# Дашборд покажет баннер "in-memory DB" если DATABASE_URL пустой — это нормально для теста.
```

**На Vercel (деплой):**

```bash
# 1) Залейте папку на GitHub, импортируйте в https://vercel.com/new
# 2) В Vercel → Settings → Environment Variables добавьте все переменные из .env.example
# 3) Подключите Neon через Vercel Marketplace → Neon → автоматически создаст DATABASE_URL
# 4) После первого деплоя локально выполните: DATABASE_URL=... pnpm db:push
# 5) Для Inngest (опционально): добавьте Inngest Integration и укажите https://ваш-домен.vercel.app/api/inngest
#    Без Inngest кампании работают через кнопку «Отправить батч (fallback)» — просто жмите её пока очередь не опустеет.
```

### Шаг 4. Отправить первое тестовое письмо себе (бесплатно — Ethereal)

**Вариант A — совсем без Gmail (рекомендуется для теста, 1 клик, бесплатно):**
1. Откройте `http://localhost:3000` → `/login` → `ADMIN_EMAIL`/`ADMIN_PASSWORD` → `/dashboard`.
2. Перейдите **Почтовый ящик** (`/dashboard/mailbox`) → нажмите **🆓 Создать бесплатный тест-ящик (Ethereal)** → автоматически создастся `smtp.ethereal.email` (Nodemailer test account, бесплатно, без регистрации).
3. Нажмите **Отправить тест** → в ответе появится `Ethereal preview: https://ethereal.email/message/...` → откройте ссылку — увидите письмо как в реальном inbox (но без спама, без Gmail). Идеально для проверки шаблона/уникализации.

**Вариант B — на свой реальный ящик (тоже бесплатно, но нужна настройка):**
1. В **Почтовый ящик** выберите пресет (Gmail/Yandex/Mail.ru) → автоподставится host/port → вставьте `login`, `app password`, `from email`, `from name` → **Сохранить**.
2. Ниже в блоке «Тестовое письмо себе» вставьте свой email → **Отправить тест** → должно прийти `Тестовое письмо — Email Panel` за 5-15 сек. Если ошибка — проверьте host/port/secure и app password (`Invalid login`/`ETIMEDOUT`/`535`).
3. Если не приходит — проверьте Спам, и что `ENCRYPTION_KEY` не менялся после сохранения ящика (иначе пересохраните пароль).

### Шаг 5. Загрузить список и запустить первую кампанию (3-5 адресов для проверки)

1. **Списки** (`/dashboard/lists`) → Название `Тест 3` → вставьте в textarea один из форматов и нажмите **Превью**:
   - Через запятую: `test1@gmail.com, test2@gmail.com, ваш_email@gmail.com`
   - Таблица из Excel/Google Sheets (скопируйте прямо из таблицы, с tab): `email	name	company` в первой строке + 2-3 строки данных, или без заголовка `test@gmail.com	Иван	ООО`.
   - Проверьте превью: валидных/невалидных/дубликатов — невалидные отсеются, дубли подсветятся.
2. Нажмите **Создать список**.
3. **Шаблоны** (`/dashboard/templates`) → **Новый шаблон** → Тема: `{Привет|Здравствуйте}, {{company}} — предложение` → Тело:
   ```
   {Привет|Добрый день}, {{name}}!

   Пишу от {{company}}. Предлагаю обсудить …
   Подробнее: https://example.com

   {{email}}
   ```
   → **Создать** → **Превью** с тестовыми данными `Иван/ООО Тест`.
4. **Кампании** (`/dashboard/campaigns`) → Название `Тест 1` → выберите список `Тест 3` и шаблон → Режим `Spintax` (для первого теста, без расхода на AI) → задержка `10`–`20` сек (для теста не ставьте 30-90, иначе долго ждать) → лимит `10` → **Создать**.
5. В списке кампаний нажмите **Запустить** → появится `Запущено, обработано N` → перейдите в карточку кампании (`/dashboard/campaigns/[id]`) → **Лог по получателям** должен показать разные темы/тела (за счёт spintax — варианты `{Привет|Здравствуйте}` рандомятся). Обновите страницу через 30 сек — статусы станут `sent` по очереди с задержкой (проверьте, что между письмами реально 10-20 сек, а не мгновенно).
6. Для проверки AI: создайте кампанию с режимом `AI-перефразирование` + `Средняя` → запустите на тех же 3 адресах → в логе тексты должны отличаться **формулировками**, а не только вариантом из скобок; проверьте, что `{{name}}`, `{{company}}` и `https://example.com` на месте (если пропали — сработает retry/fallback, в логе будет исходный шаблон).
7. Проверьте **отписку**: в любом полученном письме кликните `отписаться` внизу → адрес попадёт в **Отписки** (`/dashboard/suppression`) → создайте новую кампанию на тот же список → отписавшийся должен получить `skipped`.

Готово — можно запускать боевую рассылку, увеличив задержку до `30-90` сек и лимит `300/день`.

## Локальный запуск (кратко)

```bash
pnpm install
cp .env.example .env   # заполните
pnpm db:push           # создать таблицы в Neon (drizzle-kit push)
pnpm dev               # http://localhost:3000
```

Откройте `/login`, введите `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Если таблицы пустые и `DATABASE_URL` настроен, первый логин автоматически создаст пользователя.

### Переменные окружения (что бесплатно, что платно)

| Переменная | Обязат.? | Бесплатно? | Описание |
|---|---|---|---|
| `DATABASE_URL` | Нет | ✅ Бесплатно (Neon free 0.5GB) или in-memory если пусто | Neon: `postgresql://.../dbname?sslmode=require`. Если пусто → `pg-mem` in-memory (данные в памяти, для теста). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Да | ✅ | Начальный админ (создаётся при первом входе) |
| `AUTH_SECRET` | Да | ✅ | Секрет для JWT (32+ символа), `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Да | ✅ | Секрет для AES-256-GCM шифрования SMTP-пароля |
| `ANTHROPIC_API_KEY` | Нет | ✅ mock бесплатно | Claude Haiku. Если пусто → mock (бесплатно, `<!-- variant:N -->`). С trial $5 — реальный AI |
| `ANTHROPIC_MODEL` | Нет | ✅ | По умолчанию `claude-3-5-haiku-latest` |
| `NEXT_PUBLIC_APP_URL` | Нет | ✅ | Базовый URL для отписки (на Vercel — `VERCEL_URL`) |
| `FOOTER_ADDRESS` | Нет | ✅ | Адрес в футере писем |

Все секреты — только через env, `.env` не коммитить. Для **полностью бесплатного** локального теста достаточно `ADMIN_*`, `AUTH_SECRET`, `ENCRYPTION_KEY` — остальное имеет free fallback.

## Проверка сборки

```bash
pnpm build   # должен пройти без ошибок (проверено: 24 routes, middleware 36.5kB)
pnpm typecheck && pnpm lint   # оба зелёные
pnpm start   # или pnpm dev
```

С `DATABASE_URL` пустым — используется in-memory pg-mem (баннер в дашборде), всё работает без Neon. С Ethereal и mock-AI — всё бесплатно, без внешних ключей.

## Деплой на Vercel

1. `vercel` / `git push` к GitHub и импорт в Vercel.
2. В Settings → Environment Variables добавьте все переменные из `.env.example`.
3. В Build: `pnpm build` автоматически.
4. Для Inngest: добавьте Inngest integration или укажите `https://your-app.vercel.app/api/inngest` в Inngest Cloud. MVP может работать и без Inngest через кнопку «Отправить батч (fallback)» в кампании.

### DB на Vercel

Используйте Neon integration (Vercel Marketplace → Neon). Скопируйте `DATABASE_URL` в env, затем локально:

```bash
DATABASE_URL=... pnpm db:push
```

## Функции по ТЗ

### 1. Почтовый ящик — `/dashboard/mailbox`
- Пресеты Gmail/Yandex/Mail.ru/Outlook, шифрование пароля (AES-256-GCM), тестовая отправка себе.

### 2. Импорт получателей — `/dashboard/lists`
- Автоопределение формата: `a@x.com, b@y.com` или таблица (tab-separated из Excel/Google Sheets) с автоопределением заголовка.
- Превью: валидных/невалидных/дубликатов/в suppression.
- Именованные списки, ручное добавление/удаление, экспорт CSV. CSV импорт/экспорт через ту же textarea.

### 3. Шаблоны — `/dashboard/templates`
- CRUD, markdown→HTML, плейсхолдеры `{{name}}`, `{{company}}`, `{{email}}`, `{{custom}}`, превью с тестовыми данными, поддержка спинтакса `{A|B}`.

### 4. Уникализация
- **Spintax** — случайный выбор варианта для каждого получателя.
- **AI** — `paraphraseWithClaude` + `verifyPlaceholdersAndLinks` (regex-проверка `{{...}}` и ссылок, retry до 2 раз, fallback на исходный шаблон).
- Комбинация: спинтакс → AI.
- Слайдер лёгкая/средняя/сильная → параметр в промпте.

### 5. Кампании — `/dashboard/campaigns`
- Создание: список + шаблон + режим + задержки (мин/макс, рандом), дневной лимит, окно отправки, отложенный старт.
- Очередь на Inngest: генерация → отправка → статус → `sleep(delay)` → следующий. Retry exponential backoff, bounce → `error`.
- Пауза/отмена; ошибка одного получателя не останавливает кампанию.
- Логи по каждому получателю: что реально отправлено (см. `/dashboard/campaigns/[id]`), экспорт CSV.

### 6. Compliance
- Уникальная ссылка отписки в каждом письме → `suppression_list`, будущие кампании её пропускают (статус `skipped`).
- Глобальный стоп в `/dashboard/settings`.
- Футер с адресом.

### 7. Дашборд — `/dashboard`
- Статусы кампаний, прогресс sent/queued/error/unsubscribed, suppression list.

## API кратко

- `POST /api/auth/login|logout` — сессия
- `GET/POST /api/mailbox`, `POST /api/mailbox/test`
- `POST /api/lists/parse` — превью парсинга
- `GET/POST /api/lists`, `GET/DELETE /api/lists/[id]`
- `GET/POST /api/templates`
- `GET/POST /api/campaigns`, `POST /api/campaigns/[id]/control`, `POST /api/campaigns/[id]/run` (fallback без Inngest)
- `GET /api/unsubscribe?email=&c=&r=` — отписка (HTML ответ)
- `GET /api/inngest` — Inngest endpoint

## Что не входит в MVP
- Мультитенантность, WYSIWYG, A/B, несколько ящиков, трекинг открытий (pixel) — вынесены в «будущее».

## Модель данных
См. `src/lib/schema.ts` — `mailboxes`, `recipient_lists`, `recipients`, `templates`, `campaigns`, `campaign_recipients`, `suppression_list`, `users`, `global_settings`.

## CHANGES
См. `CHANGES.md`.

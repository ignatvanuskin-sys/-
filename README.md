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

## Локальный запуск

```bash
pnpm install
cp .env.example .env   # заполните
pnpm db:push           # создать таблицы в Neon (drizzle-kit push)
pnpm dev               # http://localhost:3000
```

Откройте `/login`, введите `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Если таблицы пустые и `DATABASE_URL` настроен, первый логин автоматически создаст пользователя.

### Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (`postgresql://.../dbname?sslmode=require`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Начальный админ (если DB пустая, создаётся при первом входе) |
| `AUTH_SECRET` | Секрет для подписи JWT сессии (минимум 32 символа) |
| `ENCRYPTION_KEY` | Секрет для AES-256-GCM шифрования SMTP-пароля |
| `ANTHROPIC_API_KEY` | Ключ Claude API (если пусто — используется mock-парафраз для теста уникализации) |
| `ANTHROPIC_MODEL` | По умолчанию `claude-3-5-haiku-latest` |
| `NEXT_PUBLIC_APP_URL` | Базовый URL для ссылок отписки (на Vercel подставится `VERCEL_URL`) |
| `FOOTER_ADDRESS` | Опционально: адрес в футере писем |

Все секреты — только через env, `.env` не коммитить.

## Проверка сборки

```bash
pnpm build   # должен пройти без ошибок
pnpm start
```

Без `DATABASE_URL` приложение собирается и показывает предупреждение в дашборде, но API вернёт ошибку до настройки БД.

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

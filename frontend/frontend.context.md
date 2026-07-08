# 🎨 FRONTEND — Общий контекст (базовая конфигурация)

> ⚠️ Пока присланы только `package.json` + `next.config.ts`.
> Это стартовый каркас контекста. Модули/страницы/компоненты — предстоит зафиксировать.

---

## Что за проект
Frontend для системы расчёта смет саун и бань (клиент к описанному ранее NestJS-бэкенду).
Стек: **Next.js 16 (App Router предположительно) + React 19 + TypeScript + Tailwind 4**.

---

## Технологический стек / пакеты

### Runtime (dependencies)
| Пакет                     | Версия    | Назначение                                    |
|---------------------------|-----------|-----------------------------------------------|
| `next`                    | 16.2.10   | фреймворк (SSR/роутинг)                        |
| `react` / `react-dom`     | 19.2.4    | UI-рантайм (React 19)                          |
| `@tanstack/react-query`   | ^5.101.2  | серверное состояние, кэш запросов к API        |
| `axios`                   | ^1.18.1   | HTTP-клиент (к бэкенду `/api`)                 |
| `zustand`                 | ^5.0.14   | клиентское состояние (auth/токены/UI)          |
| `react-hook-form`         | ^7.81.0   | формы                                          |
| `@hookform/resolvers`     | ^5.4.0    | связка RHF + zod                               |
| `zod`                     | ^4.4.3    | схемы валидации (формы + парсинг ответов)      |
| `lucide-react`            | ^1.23.0   | иконки                                         |
| `clsx`                    | ^2.1.1    | условные className                             |
| `tailwind-merge`          | ^3.6.0    | мерж Tailwind-классов (обычно хелпер `cn`)     |

### Dev
| Пакет                     | Версия    | Назначение                    |
|---------------------------|-----------|-------------------------------|
| `tailwindcss`             | ^4        | стили (v4 — через PostCSS)    |
| `@tailwindcss/postcss`    | ^4        | PostCSS-плагин Tailwind v4    |
| `eslint` + `eslint-config-next` | 9 / 16.2.10 | линт             |
| `typescript`              | ^5        | типизация                     |
| `@types/*`                | —         | типы node/react               |

---

## Скрипты (package.json)
| Скрипт  | Команда       | Назначение              |
|---------|---------------|-------------------------|
| `dev`   | `next dev`    | локальная разработка    |
| `build` | `next build`  | прод-сборка             |
| `start` | `next start`  | запуск прод-сборки      |
| `lint`  | `eslint`      | линт                    |

---

## Конфигурация Next (next.config.ts)
Пустая (`{}`) — дефолты Next 16.
> ⚠️ Пока НЕ настроено:
> - `rewrites/proxy` к бэкенду → значит запросы идут напрямую по absolute URL
>   (нужен `NEXT_PUBLIC_API_URL` в axios).
> - `images.domains`, заголовки, i18n — не заданы.

---

## Архитектурные ожидания (по набору пакетов — ГИПОТЕЗЫ, требуют подтверждения)
- **API-слой:** `axios`-инстанс с `baseURL = NEXT_PUBLIC_API_URL` (+ `/api`),
  интерцептор для `Authorization: Bearer <accessToken>` и refresh-флоу (бэкенд отдаёт
  accessToken+refreshToken; refresh НЕ ротируется).
- **Auth-состояние:** `zustand` (токены, текущий user, role ADMIN/MANAGER).
- **Данные:** `react-query` (кэш списков клиентов/проектов/справочников, инвалидация после мутаций).
- **Формы:** `react-hook-form` + `zod` (создание клиента/проекта/сметы, справочники).
- **UI:** Tailwind v4 + `cn()` (clsx + tailwind-merge) + иконки lucide.

---

## Связь с бэкендом (что нужно учесть фронту)
- Базовый префикс API: **`/api`** (глобальный на бэке).
- **CORS:** бэкенд разрешает origin `FRONTEND_URL` (деф. `http://localhost:3000`),
  `credentials: true`. Next dev по умолчанию на :3000, бэк — на :3001.
- **RBAC:** роли `ADMIN` / `MANAGER`. UI должен скрывать/блокировать:
  - справочники (nomenclature/markup/work-types/work-stages/ventilation) — правка только ADMIN;
  - удаление сметы — только ADMIN.
- **Auth-флоу:** login → {accessToken, refreshToken, user}; refresh по refreshToken;
  logout ревокает refresh. Деактивированный user (`isActive=false`) → 401 на защищённых.
- **Ошибки бэка:** невалидный ObjectId → 500 (нет глобального фильтра) — фронт должен
  устойчиво обрабатывать 500/валидационные 400 (ValidationPipe whitelist).

---

## ENV (ожидаемые — подтвердить в коде)
| Переменная            | Назначение                        |
|-----------------------|-----------------------------------|
| `NEXT_PUBLIC_API_URL` | базовый URL бэкенда (напр. http://localhost:3001) |

---

## Точки внимания (TODO / риски)
- [ ] 🟡 `next.config.ts` пуст — нет proxy/rewrites к бэку и настроек images/headers.
- [ ] Подтвердить структуру: App Router (`app/`) или Pages (`pages/`)?
- [ ] Как хранятся токены (zustand + localStorage? httpOnly cookie?) — влияет на XSS/refresh.
- [ ] Настроен ли axios-интерцептор refresh (учесть: refresh на бэке НЕ ротируется).
- [ ] RBAC-гейтинг на UI (скрытие действий ADMIN-only).
- [ ] Провайдеры (QueryClientProvider, тема) — где инициализируются.

---

## Чтобы продолжить фиксацию фронтенда — нужны:
1. Структура папок (`app/` или `pages/`, `components/`, `lib/`, `store/`, `hooks/`).
2. **API-слой** (`lib/api` / axios-инстанс + интерцепторы).
3. **Auth-store** (zustand) + провайдеры (`app/layout.tsx`, `providers.tsx`).
4. Страницы: login, clients, projects, estimate-конструктор, справочники.
5. Общие типы (DTO/ответы бэка) и zod-схемы форм.
6. `globals.css` / tailwind-конфиг (v4).
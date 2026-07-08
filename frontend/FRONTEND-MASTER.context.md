# 🎨 SAUNA CALC — FRONTEND · MASTER CONTEXT

> Единый сводный контекст фронтенда. Объединяет 6 слоёв: конфиг, типы, сторы,
> API, компоненты, страницы. Клиент к NestJS-бэкенду (расчёт смет/КП для бань).

---

## 0. СТЕК И КОНФИГ

**Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4.**

| Пакет | Версия | Роль | Реально используется? |
|-------|--------|------|----------------------|
| next | 16.2.10 | фреймворк | ✅ |
| react/react-dom | 19.2.4 | рантайм | ✅ |
| **@tanstack/react-query** | ^5.101 | серверный кэш | 🔴 **НЕ используется** (всё на Zustand) |
| axios | ^1.18 | HTTP | ✅ |
| zustand | ^5.0 | состояние (auth+данные) | ✅ (ведёт ВСЁ серверное состояние) |
| react-hook-form + zod | ^7.81 / ^4.4 | формы | ✅ (частично) |
| lucide-react, clsx, tailwind-merge | — | UI | ✅ |

- `next.config.ts` — **пустой** (нет rewrites/proxy → запросы по absolute URL из axios).
- ENV: `NEXT_PUBLIC_API_URL` — **должен включать `/api`** (бэк-префикс).
- Нет `middleware.ts` (guard только клиентский).
- Нет `QueryClientProvider` → подтверждает: **react-query — мёртвая зависимость**.

---

## 1. АРХИТЕКТУРНАЯ КАРТА (data flow)
Page (app/**/page.tsx)  ──useEffect──▶  Zustand store  ──▶  *Api (lib/api)  ──axios──▶  Backend /api
│  debounce-поиск                     │ refetch-all после мутаций         │ interceptor: Bearer + refresh
│  модалки форм                        │ error → строка                    │
▼                                      ▼                                    ▼
UI-kit (Button/Input/Modal/...)     Forms (RHF+zod | useState)          localStorage (токены ×2)



- **Паттерн страниц:** «толстый контейнер» (тулбар+таблица/карточки+модалка+пагинация).
- **Сторы:** по сущности; refetch-all после каждой мутации; ошибки → обезличенная строка.
- **Справочники markup/work-stages/ventilation:** без сторов (markup — прямой вызов в Settings; stages/ventilation — вообще не в UI).

---

## 2. СТРУКТУРА МАРШРУТОВ
app/
├─ layout.tsx          RootLayout (Inter, lang=ru)
├─ page.tsx            redirect → /login
├─ globals.css         Tailwind v4
├─ login/page.tsx      RHF+zod → POST /auth/login
└─ dashboard/
├─ layout.tsx       клиентский auth-guard + Sidebar
├─ page.tsx         DashboardPage (статистика) ⚠️ дубликат с самоredirect — проверить
├─ clients/         CRUD + пагинация
├─ projects/        карточки + ?clientId
├─ estimates/       EstimateBuilder (⚠️ игнорит ?projectId)
├─ nomenclature/    CRUD + импорт Excel (admin)
├─ work-types/      CRUD + формулы (admin)
├─ users/           create+deactivate (admin)
└─ settings/        наценки (markupApi напрямую)



**RBAC-навигация (Sidebar):**
- ADMIN+MANAGER: Дашборд, Клиенты, Проекты, Расчёты.
- ADMIN-only: Номенклатура, Виды работ, Пользователи, Настройки.

---

## 3. 🔴 ГЛАВНЫЙ ВЫВОД: «ПАРНАЯ v2» — МЁРТВЫЙ ЗАДЕЛ

Сквозь ВСЕ слои подтверждается: богатая доменная модель парной **не подключена к потоку**.

| Слой | Что есть | Что реально работает |
|------|----------|---------------------|
| Бэк-схема | sauna-поля есть | калькулятор их НЕ считает |
| Типы | `SaunaZone/FinishSpec/WoodenItem/Opening/LightingSpec/KpData` | — |
| API/сторы | методы есть | `saunaZones`/`kpData` никто не шлёт |
| **EstimateBuilder** | — | шлёт **ТОЛЬКО старую плоскую модель** `zones[]={name,zoneType,length,width,height,works[]}` |
| Страницы | — | **нет форм парной, нет экспорта КП/PDF** |

**→ Активна только СТАРАЯ модель зон/работ.** Все расхождения контракта парной
(ниже) пока НЕ проявляются в рантайме (некому слать), но выстрелят при разработке UI парной.

### Скрытые контрактные мины (парная) — сработают при реализации v2:
- 🔴 `finishStageIds` (фронт) vs `stageIds` (бэк DTO) — этапы не посчитаются.
- 🔴 `SaunaZone` вложенная (фронт) vs плоская `walls[]/ceiling/stages[]/sections[]` (бэк).
- 🔴 `VentilationVariant.laborPrice` (фронт) vs `laborCost` (бэк).
- 🔴 `kpData` — нет в бэк-схеме/DTO → ValidationPipe whitelist отрежет.

---

## 4. 🔴 БЛОКЕРЫ (сломано в рантайме СЕЙЧАС)

| # | Проблема | Слой | Эффект |
|---|----------|------|--------|
| B1 | `NEXT_PUBLIC_API_URL` без `/api` | API/ENV | все запросы 404 (если ENV не содержит `/api`) |
| B2 | `ventilationApi` → `/ventilation-variants` ≠ бэк `/ventilation` | API | вентиляция 404 |
| B3 | EstimatesPage **игнорирует `?projectId`** | Страницы | сметы не фильтруются по проекту |
| B4 | Дубликат `dashboard/page.tsx` (самоredirect) | Страницы | возможен бесконечный цикл |
| B5 | Импорт Excel: UI ждёт `{created,updated}`, бэк даёт `{skipped,noPrice[]}` | сквозной | «новых: undefined, обновлено: undefined» |
| B6 | Dashboard `status==='sent'` — статуса нет | Страницы | «КП отправлено» всегда 0 |

---

## 5. 🟡 AUTH / БЕЗОПАСНОСТЬ

- **Токены в localStorage** (XSS-риск) + **двойное хранение**:
  - persist-ключ `auth-storage` (весь authStore),
  - + ручные ключи `accessToken`/`refreshToken` (их читает интерцептор).
- **Refresh-флоу** (interceptor): 401 → `/auth/refresh` → новый accessToken.
  - ⚠️ обновляет только localStorage, НЕ authStore (persist) → рассинхрон;
  - ⚠️ нет очереди при параллельных 401 → пачка refresh;
  - ✅ refresh НЕ ротируется (совпадает с бэком).
- **logout** — только локально, НЕ дёргает `authApi.logout` → refresh на бэке жив.
- **Guard** клиентский (нет middleware): flash-рендер + возможен ложный редирект до гидрации persist; **роль в guard не проверяется** (прямой заход manager на admin-URL → 403 без UX).
- **Две модели юзера:** `User.id` (auth) vs `AppUser._id` (админка) — разные ключи id.

---

## 6. ФОРМЫ (сводка)

| Форма | Движок | Ошибки бэка | Не редактирует (есть в типе) |
|-------|--------|-------------|------------------------------|
| ClientForm | RHF+zod | ❌ глотает | — |
| NomenclatureForm | RHF+zod | ❌ | `packageLogic`, `markup` |
| ProjectForm | RHF+zod | ❌ | — (⚠️ клиент может пропасть из select при поиске) |
| **UserForm** | useState | ✅ **разбирает** | — |
| WorkTypeForm | useState | ❌ | `applicableTo`, `zoneTypes` |
| MarkupForm (в Settings) | RHF+zod | ❌ | — (⚠️ тип `worktype` бэк игнорит) |

- 🟡 Разнобой: RHF+zod vs useState. Только `UserForm` показывает `e.response.data.message`.
- EstimateBuilder: `zoneType` — свободный текст (не enum) → риск для бэк-калькулятора.

---

## 7. UI-KIT ✅ (аккуратный, консистентный)

`Button` (variant/size/loading), `Input`, `Select` (forwardRef, RHF-совместимы),
`Modal` (Esc/scroll-lock/overlay), `Badge` (5 цветов), `ConfirmDialog`.
Все на `cn()` (clsx+tailwind-merge).

---

## 8. globals.css — проблемы

- 🟡 Определены `--font-geist-*`, но подключён **Inter** → мёртвые переменные.
- 🟡 Тёмная тема сломана: `body` захардкожен `color: var(--black)` (#111).
- 🟡 `body { font-family: Arial }` перебивает `inter.className`.

---

## 9. СВОДНЫЙ TODO (по приоритету)

### 🔴 Критично (чинить первым)
- [ ] B1: `NEXT_PUBLIC_API_URL` = `http://host:3001/api`.
- [ ] B2: выровнять URL вентиляции (фронт `/ventilation` или бэк `/ventilation-variants`).
- [ ] B3: EstimatesPage читать `?projectId` (`useSearchParams` → `fetchItems(projectId)`).
- [ ] B4: проверить физически `dashboard/page.tsx` (убрать самоredirect).
- [ ] B5: выровнять контракт импорта Excel (фронт-тип ↔ бэк-ответ).
- [ ] Убрать/подключить react-query (сейчас мёртвая зависимость).
- [ ] Проверить физические дубли ВСЕХ файлов (присланы задвоенными).

### 🟡 Важно
- [ ] B6: убрать/исправить `status==='sent'` на дашборде.
- [ ] Auth: middleware-guard + проверка роли; синхронизация authStore после refresh;
      очередь refresh; `logout` → `authApi.logout`.
- [ ] Единый разбор ошибок бэка (нормализатор) для всех форм/сторов.
- [ ] Токены: обдумать httpOnly-cookie ИЛИ хотя бы убрать двойное хранение.
- [ ] Вынести пагинацию в компонент (copy-paste в 3 страницах).
- [ ] Вывести в UI справочники work-stages / ventilation (если нужны).
- [ ] globals.css: починить тему/шрифт.

### 🟢 Задел на будущее (парная v2 — когда возьмётесь)
- [ ] Маппер `SaunaZone` (вложенная фронт ↔ плоская бэк).
- [ ] `finishStageIds` → `stageIds`; `laborPrice` → `laborCost`.
- [ ] `kpData` — добавить в бэк-DTO/схему ИЛИ убрать с фронта.
- [ ] Форма парной + экспорт КП/PDF (ключевая фича продукта — отсутствует).

---

## 10. КАРТА ЭНДПОИНТОВ (фронт → бэк)

| Api | URL | Примечание |
|-----|-----|-----------|
| auth | POST `/auth/login`, `/auth/refresh` | logout не вызывается |
| nomenclature | `/nomenclature` (+`/categories`, `/import/excel`) | ✅ |
| work-types | `/work-types?applicableTo&zoneType` | ✅ |
| work-stages | `/work-stages` (+`/templates`) | не в UI |
| ventilation | `/ventilation-variants` | 🔴 бэк `/ventilation` |
| markup | `/markup` | только в Settings |
| clients / projects | `/clients`, `/projects` (+query) | ✅ |
| estimates | `/estimates` (+`/preview`, `?projectId`) | ✅ (но страница не шлёт projectId) |
| users | `/users` (+PATCH `/:id/deactivate`) | ✅ |

---

## 11. СТАТУС ФИКСАЦИИ

| Слой | Файл | Статус |
|------|------|--------|
| Конфиг/стек | §0 | ✅ |
| Типы | §3 (+types.context) | ✅ |
| Сторы | §1 | ✅ |
| API | §10 | ✅ |
| Компоненты/формы | §6–7 | ✅ |
| Страницы | §2 | ✅ |

**Не хватает для 100%:** `middleware.ts` (подтвердить отсутствие), физическая проверка дубликатов, `.env` (подтвердить `/api`).
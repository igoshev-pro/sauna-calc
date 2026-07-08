# 🎨 FRONTEND — Страницы (Next.js App Router)

> ⚠️ Блок прислан с **множественными дубликатами** (layout/login/globals/страницы
> повторяются по нескольку раз). Проверить физически структуру `app/`.

## Назначение
Next.js App Router. Страницы дашборда = «толстые контейнеры»: тулбар + таблица/карточки
+ модалки форм + пагинация. Данные из Zustand-сторов (или прямой `*Api`).

---

## Структура маршрутов
app/
├─ layout.tsx            RootLayout (Inter, lang=ru, metadata)
├─ page.tsx              redirect → /login
├─ globals.css          Tailwind v4 (@import "tailwindcss")
├─ login/page.tsx        Вход (RHF+zod, POST /auth/login)
└─ dashboard/
├─ layout.tsx         auth-guard + Sidebar
├─ page.tsx           (⚠️ redirect → /dashboard — см. риск ниже)
├─ (dashboard root)   DashboardPage — статистика
├─ clients/page.tsx
├─ projects/page.tsx
├─ estimates/page.tsx
├─ nomenclature/page.tsx
├─ work-types/page.tsx
├─ users/page.tsx
└─ settings/page.tsx  (наценки)



> 🔴 **Конфликт `dashboard/page.tsx`:** прислан ДВА разных файла с путём
> `dashboard/page.tsx` — один `redirect('/dashboard')` (саморедирект → бесконечный цикл!),
> другой `DashboardPage` со статистикой. Нужно понять, какой реально в `dashboard/`, а
> какой — артефакт дубликата. Если самоredirect лежит в `dashboard/page.tsx` → **луп**.

---

## Auth-guard (dashboard/layout.tsx)
- `useEffect`: если `!isAuthenticated` → `router.push('/login')`.
- `if (!isAuthenticated) return null`.
- 🔴 **Клиентский guard** (не middleware). Проблемы:
  - Защита только на клиенте (контент рендерится, потом редирект).
  - `isAuthenticated` из **persist** — при жёсткой перезагрузке возможен «мигающий»
    рендер до гидрации Zustand (флаг может быть `false` первый тик → ложный редирект).
  - Нет `next/middleware` — прямой заход на URL всегда сначала грузит клиент.
- ⚠️ Не проверяет **роль** на уровне guard — только Sidebar прячет пункты. Прямой переход
  на `/dashboard/users` (manager) → страница отрендерится, а бэк вернёт 403 → «Ошибка загрузки».

---

## Login (login/page.tsx)
- RHF+zod (email, password≥6). `POST /auth/login` (голый `api`).
- Успех → `setAuth(user, accessToken, refreshToken)` → `/dashboard`.
- Ошибка → «Неверный email или пароль» (обезличено).

---

## Страницы (обзор)

### DashboardPage — статистика
- `Promise.all([clients{limit:1}, projects{limit:1}, estimates.getAll()])`.
- 🔴 **`sent = estimates.filter(status==='sent')`** — но у смет статус НЕ включает `'sent'`
  (в типах статус свободный/старый). «КП отправлено» вероятно всегда 0.
- ⚠️ estimates грузятся целиком ради `.length` (нет count-эндпоинта).

### ClientsPage / ProjectsPage / NomenclaturePage
- Полный паттерн: debounce-поиск (400ms), фильтры, таблица/карточки, пагинация
  (умная с «…»), модалка формы, ConfirmDialog.
- Projects — карточки + чтение `?clientId` из URL (фильтр из карточки клиента).
- Nomenclature — импорт Excel (admin), фильтры category/inStock.
  🔴 **Результат импорта показывает `created`/`updated`** — бэк их НЕ возвращает
  (вернёт `undefined`) → в UI «новых: undefined, обновлено: undefined».

### EstimatesPage
- Таблица смет (name, zones.length, laborTotal, materialsTotal, grandTotal).
- Открывает `EstimateBuilder` в модалке (создание/редактирование).
- ⚠️ **Игнорирует `?projectId`**: карточка проекта ведёт на
  `/dashboard/estimates?projectId=...`, но страница НЕ читает этот параметр
  (`fetchItems()` без projectId) → показываются ВСЕ сметы, не по проекту. 🔴
- Нет экспорта КП/PDF, нет отправки — только CRUD.

### SettingsPage — наценки
- Прямые вызовы `markupApi` (без стора, локальный стейт) — подтверждает «нет markup-стора».
- `MarkupForm` (RHF+zod), тип global/category/worktype.
- ⚠️ Тип `'worktype'` в форме есть, но бэк его не обрабатывает (мёртвая ветка).
- 🟡 **Здесь НЕТ** блоков work-stages и ventilation — только наценки.
  → Справочники этапов/вентиляции **не выведены в UI вообще** (ни стора, ни страницы, ни навигации).

### UsersPage — админка
- Таблица AppUser, создание (UserForm), деактивация (только `isActive`).
- Нет edit/delete (совпадает с бэком).

### WorkTypesPage
- Таблица WorkType + WorkTypeForm (грузит номенклатуру для формул).
- admin-گейт на действия.

---

## Общие паттерны страниц
- `useEffect(fetch, [])` при монтировании (eslint-варнинги на deps — везде).
- Debounce-поиск на уровне страницы (useState + setTimeout → setQuery).
- Пагинация — переиспользуемый inline-блок (дублируется copy-paste в 3 страницах;
  не вынесен в компонент).
- Ошибки: показывают `error` из стора (обезличенный текст) ИЛИ ничего.

---

## globals.css (Tailwind v4)
- `@import "tailwindcss"` + `@theme inline` (CSS-переменные).
- ⚠️ Определены `--font-geist-sans/mono`, но подключён шрифт **Inter** (не Geist) → мёртвые переменные.
- ⚠️ `@media (prefers-color-scheme: dark)` меняет `--background/--foreground`, НО
  `body` захардкожен `color: var(--black)` (#111) — тёмная тема фактически сломана/не применяется.
- ⚠️ `body { font-family: Arial }` перебивает `inter.className` из layout.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Дубликат `dashboard/page.tsx`: возможен **самоredirect-цикл** — проверить.
- [ ] 🔴 EstimatesPage **игнорирует `?projectId`** → сметы не фильтруются по проекту.
- [ ] 🔴 Nomenclature import UI показывает `created/undefined` (контракт ≠ бэк).
- [ ] 🔴 Dashboard `status==='sent'` — статуса нет → «КП отправлено» всегда 0.
- [ ] 🔴 Auth-guard клиентский (нет middleware) + возможен flash/ложный редирект до гидрации persist.
- [ ] 🟡 Нет проверки роли в guard → прямой заход manager на admin-страницу = 403 без UX.
- [ ] 🟡 work-stages / ventilation НЕ выведены в UI (даже в Settings). Парная-задел не управляется.
- [ ] 🟡 `MarkupType.worktype` — форма шлёт, бэк игнорирует.
- [ ] 🟡 Пагинация дублируется copy-paste (вынести в компонент).
- [ ] 🟡 globals.css: тёмная тема сломана, Geist-переменные мёртвые, Arial перебивает Inter.
- [ ] 🟡 Нет экспорта КП/PDF нигде (хотя весь продукт — «расчёт КП»). Ключевая фича отсутствует.
- [ ] Множественные дубликаты файлов в присланном коде — проверить физически.
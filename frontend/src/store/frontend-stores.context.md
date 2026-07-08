# 🎨 FRONTEND — Zustand-сторы (state layer)

> ⚠️ Весь блок сторов прислан **продублированным дважды** (полное повторение).
> Проверить физически.

## Назначение
Слой состояния на **Zustand**. Каждая доменная сущность — свой стор.
Паттерн: стор инкапсулирует загрузку/CRUD через `*Api` из `@/lib/api`.

> ⚠️ **АРХИТЕКТУРНОЕ НАБЛЮДЕНИЕ:** несмотря на наличие `@tanstack/react-query`
> в зависимостях, **серверные данные ведутся через Zustand** (ручной fetch + refetch),
> НЕ через React Query. React Query, похоже, не используется для CRUD-сущностей.
> Возможно дублирование подходов. Проверить, где реально применяется react-query.

---

## Сторы (8 шт.)

### 1. authStore (`useAuthStore`) — с `persist`
- Состояние: `user, accessToken, refreshToken, isAuthenticated`.
- `setAuth(user, at, rt)` / `logout()`.
- **Двойное хранение токенов:**
  - `persist` → localStorage ключ `auth-storage` (весь стейт, включая токены).
  - + **вручную** `localStorage.setItem('accessToken'/'refreshToken')`.
  > ⚠️ Токены лежат в localStorage **дважды** (в `auth-storage` и отдельными ключами).
  > `lib/api` интерцептор, вероятно, читает отдельные ключи. Рассинхрон-риск.
- 🔴 **Безопасность:** токены в localStorage → уязвимость к XSS.
- ⚠️ `logout` — только локально; **НЕ дёргает** `authApi.logout` (refresh на бэке НЕ ревокается).

### 2. clientsStore — CRUD + пагинация
- `items,total,pages,currentPage,query{page:1,limit:20},loading,error`.
- `setQuery` (мержит + сразу `fetchItems`), `fetchItems/create/update/remove`.
- После любой мутации → полный `fetchItems` (refetch-all).

### 3. projectsStore — идентичен clientsStore (limit:20).

### 4. nomenclatureStore — CRUD + пагинация + категории + импорт
- limit:50, `categories[]`, `fetchCategories` (тихо глотает ошибку).
- create/update → refetch items **и** categories.
- `importExcel(file)` → возвращает `{ imported, created, updated }`.
  > 🔴 **Контракт импорта не сходится с бэком!** Бэк возвращает
  > `{ imported, skipped, noPriceCount, noPrice[] }` (`deleteMany`+`insertMany`),
  > а фронт-тип ждёт `{ imported, created, updated }` (как upsert).
  > → `created/updated` будут `undefined`. Расхождение контракта импорта.

### 5. estimateStore — CRUD + preview (без пагинации)
- `fetchItems(projectId?)` → `set({ items: data })` (плоский массив).
- `createItem/updateItem` возвращают `Estimate`.
- `preview(data)` → `EstimatePreview` (расчёт без сохранения).

### 6. userStore (админка) — `AppUser[]`
- `fetchItems/createItem(CreateUserInput)/deactivateItem`.
- Нет update/remove (совпадает с бэком: только create/deactivate).

### 7. workTypeStore — CRUD без пагинации (`WorkType[]`).

### 8. (нет отдельных сторов для: markup, work-stages, ventilation)
> ⚠️ Справочники **markup / work-stages / ventilation** НЕ имеют сторов здесь.
> Либо они грузятся напрямую в компонентах через `lib/api`, либо через react-query,
> либо ещё не реализованы в UI. Проверить.

---

## Общие паттерны сторов
- **Refetch-all после мутаций** (нет оптимистичных апдейтов). Просто, но неэффективно.
- **Ошибки глотаются** в строку `error` (`catch { set({error:'...'}) }`) —
  теряется статус/сообщение бэка (400 валидация, 500 CastError не различимы).
- `setQuery` вызывает `fetchItems` синхронно после `set` → возможна гонка при быстрых вводах
  (нет debounce на уровне стора).
- CRUD-сторы принимают `Partial<Entity>` (не строгий Input-тип) → слабая типизация payload.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Блок сторов **продублирован** — проверить физически.
- [ ] 🔴 Токены в **localStorage** (XSS) + **двойное** хранение (persist + ручные ключи).
- [ ] 🔴 `importExcel` контракт `{imported,created,updated}` ≠ бэк `{imported,skipped,noPriceCount,noPrice[]}`.
- [ ] 🔴 `logout` не вызывает `authApi.logout` → refresh-токен на бэке живёт до истечения.
- [ ] 🟡 **React Query не используется** для CRUD (всё на Zustand) — мёртвая зависимость?
- [ ] 🟡 Нет сторов для markup/work-stages/ventilation — как грузятся справочники в UI?
- [ ] 🟡 Refetch-all вместо оптимистичных обновлений (лишние запросы).
- [ ] 🟡 Ошибки обезличены (нет кода/текста бэка) → плохой UX на 400/500.
- [ ] 🟡 `setQuery`→`fetchItems` без debounce (гонки при поиске).
- [ ] `Partial<Entity>` в create/update — слабая типизация (можно отправить лишние/битые поля).
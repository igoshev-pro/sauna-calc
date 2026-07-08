# 🎨 FRONTEND — API-слой (lib/api.ts + lib/utils.ts)

> ⚠️ Файл прислан **продублированным дважды** (api.ts + cn повторены). Проверить физически.

## Назначение
Единый axios-инстанс + типизированные `*Api`-объекты по каждой сущности.
Плюс хелпер `cn()` (clsx + tailwind-merge).

---

## Axios-инстанс
- `baseURL = process.env.NEXT_PUBLIC_API_URL`.
  > 🔴 **ВАЖНО:** baseURL — БЕЗ `/api`. А бэкенд имеет глобальный префикс `/api`!
  > Значит либо `NEXT_PUBLIC_API_URL` уже включает `/api`
  > (напр. `http://localhost:3001/api`), либо ВСЕ запросы 404.
  > → В ENV обязательно `NEXT_PUBLIC_API_URL=http://localhost:3001/api`.
- `Content-Type: application/json` по умолчанию.

### Request-интерцептор
- Читает `localStorage.getItem('accessToken')` (SSR-safe: `typeof window`).
- Ставит `Authorization: Bearer <token>`.
  > ⚠️ Читает **отдельный ключ** `accessToken`, НЕ persist-стор `auth-storage`.
  > Подтверждает двойное хранение из authStore (ключи держать синхронно!).

### Response-интерцептор (refresh-флоу)
- На `401` + `!original._retry`:
  1. `_retry = true` (защита от цикла).
  2. `refreshToken` из localStorage → POST `/auth/refresh`.
  3. Успех → сохраняет новый `accessToken`, повторяет исходный запрос.
  4. Провал → чистит токены + `window.location.href = '/login'`.
- Использует **голый `axios.post`** (не инстанс) для refresh — корректно (без интерцептора).
- ⚠️ Обновляет ТОЛЬКО `accessToken` в localStorage, **НЕ обновляет authStore** (`persist`).
  → Стор и localStorage расходятся после refresh (user видит старый токен в сторе).
- ⚠️ Нет **очереди запросов**: при параллельных 401 будет несколько refresh одновременно.
- ✅ Совпадает с бэком: refresh НЕ ротируется (тот же refreshToken остаётся).

---

## 🔴 РАСХОЖДЕНИЯ URL ФРОНТ ↔ БЭК

| Ресурс      | Фронт (lib/api)          | Бэк (контроллер)      | Статус |
|-------------|--------------------------|-----------------------|--------|
| Вентиляция  | `/ventilation-variants`  | **`/ventilation`**    | 🔴 НЕ СОВПАДАЕТ → 404 |
| Сметы       | `/estimates`             | `/estimates` (в бэк-доке `/estimates`) | ✅ |
| остальные   | совпадают                | —                     | ✅ |

> 🔴 **`ventilationApi` бьёт в `/ventilation-variants`, а бэк слушает `/ventilation`.**
> ВСЕ операции с вентиляцией → 404. Либо переименовать на фронте, либо роут на бэке.

> ⚠️ Уточнить бэк-префикс смет: в Estimate-доке контроллер описан как `/estimates`,
> в app.context упоминался `/estimate`. Свериться (сейчас фронт шлёт `/estimates`).

---

## Карта эндпоинтов (фронт)

| Api           | Метод/URL                                      |
|---------------|------------------------------------------------|
| nomenclature  | GET `/nomenclature` `?query`; GET `/nomenclature/:id`; GET `/nomenclature/categories`; POST/PUT/DELETE; POST `/nomenclature/import/excel` (multipart) |
| workTypes     | GET `/work-types?applicableTo&zoneType`; POST/PUT/DELETE |
| workStages    | GET `/work-stages`; GET `/work-stages/templates`; GET/POST/PUT/DELETE `/:id` |
| ventilation   | 🔴 `/ventilation-variants` (× бэк `/ventilation`) |
| markup        | GET `/markup`; POST/PUT/DELETE                 |
| clients       | GET `/clients?query`; GET/POST/PUT/DELETE `/:id` |
| projects      | GET `/projects?query`; GET/POST/PUT/DELETE `/:id` |
| estimates     | GET `/estimates?projectId`; GET `/:id`; POST `/preview`; POST/PUT/DELETE |
| users         | GET `/users`; GET `/:id`; POST; PATCH `/:id/deactivate` |

---

## Соответствие ролям (RBAC — фронт вызывает, бэк ограничивает)
- Справочники (nomenclature/work-types/work-stages/ventilation/markup): POST/PUT/DELETE → бэк требует **ADMIN**.
  → UI должен прятать эти действия у MANAGER (иначе 403).
- users: всё → ADMIN. estimates DELETE → ADMIN.
- Остальное CRUD → ADMIN+MANAGER.

---

## lib/utils.ts
- `cn(...inputs)` = `twMerge(clsx(inputs))` — стандартный Tailwind-хелпер.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 `NEXT_PUBLIC_API_URL` ДОЛЖЕН включать `/api` (иначе все запросы 404).
- [ ] 🔴 `ventilationApi` → `/ventilation-variants` ≠ бэк `/ventilation` (404).
- [ ] 🔴 `importExcel` тип `{imported,created,updated}` ≠ бэк `{imported,skipped,noPriceCount,noPrice[]}`.
- [ ] 🟡 refresh обновляет только localStorage, НЕ authStore (persist) → рассинхрон стора.
- [ ] 🟡 Нет очереди при параллельных 401 → множественные refresh.
- [ ] 🟡 Двойное хранение токенов (persist `auth-storage` + ключи `accessToken/refreshToken`);
      интерцептор завязан на ключи — при чистке одного места второе устаревает.
- [ ] 🟡 Свериться с бэк-префиксом смет (`/estimates` vs `/estimate`).
- [ ] `Partial<Entity>` в create/update — совпадает со сторами (слабая типизация).
- [ ] Ошибки не нормализуются (нет единого разбора 400/500) — сторы получают «сырой» reject.
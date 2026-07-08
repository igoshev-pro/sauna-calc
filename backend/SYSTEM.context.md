# 🏗️ СИСТЕМА: Backend расчёта смет для саун и бань — ПОЛНЫЙ КОНТЕКСТ

> Сводный документ. Все 10 модулей проанализированы. Дата сборки: финальная.
> Стек: NestJS 11 + MongoDB (Mongoose 9), TypeScript. Префикс API: `/api`.

---

## 1. НАЗНАЧЕНИЕ СИСТЕМЫ

CRM + калькулятор смет для строительства/отделки **саун и бань**.
Логическая цепочка:
Клиент → Проект → Смета (расчёт по зонам)
├─ обычные зоны → WorkType (виды работ)
└─ зоны парной → WorkStage (этапы) [+ будущие блоки 2–7]
Справочники: Nomenclature (материалы), Markup (наценки), Ventilation (вентиляция)



---

## 2. КАРТА МОДУЛЕЙ (все 10 — ✅ зафиксированы)

| # | Модуль        | Роль                                   | Экспорт            | Потребители             |
|---|---------------|----------------------------------------|--------------------|-------------------------|
| 1 | **Auth**      | JWT login/refresh/logout, guards, RBAC | guards, decorators | ВСЕ модули              |
| 2 | **Users**     | пользователи, роли, `UserRole`         | UsersService       | Auth, Projects, Estimate|
| 3 | **Nomenclature**| материалы + Excel-импорт (МойСклад)  | Service + Model    | Estimate 🔴             |
| 4 | **Markup**    | настройки наценок (global/category)    | MarkupService*     | Estimate (через Model)  |
| 5 | **Clients**   | клиенты CRM + projectsCount            | ClientsService     | Projects                |
| 6 | **Projects**  | проекты (воронка) + estimatesCount     | ProjectsService    | Estimate (по projectId) |
| 7 | **WorkType**  | атомарные работы (формулы, `area`)     | WorkTypeService    | Estimate                |
| 8 | **WorkStages**| этапы-шаблоны парной (`S`/`perimeter`) | WorkStagesService  | Estimate                |
| 9 | **Ventilation**| комплекты вентиляции (фикс.)          | VentilationService | Estimate (план, блок 5) |
| 10| **Estimate**  | 🎯 ЯДРО РАСЧЁТА + движок формул        | EstimateService    | —                       |

\* MarkupService экспортируется, но Estimate читает `MarkupSettings` через Model напрямую.

---

## 3. ГРАФ ЗАВИСИМОСТЕЙ
Auth ──(guards/UserRole)──> ВСЕ контроллеры
Users ──> Auth (findByEmail/findById)
Clients <── Projects (incrementProjectsCount)
Projects ──ref──> Clients, Users
Estimate ──forFeature──> WorkType, WorkStage, Nomenclature, MarkupSettings, Estimate
──ref──────────> Project, Client, User
Nomenclature <──nomenclatureId── WorkType, WorkStage, Ventilation, Estimate(snapshot)



**Ключевой узел:** `Nomenclature._id` — на него ссылаются WorkType, WorkStage,
Ventilation. Любая пересборка коллекции рвёт всю систему.

---

## 4. МОДЕЛЬ РАСЧЁТА (Estimate — сердце)

### Два контура расчёта:
| Контур        | Источник работ | Наценка               | Переменные формул         | Статус         |
|---------------|----------------|------------------------|---------------------------|----------------|
| Обычные зоны  | WorkType       | `WorkType.markupPercent`| `area, length, width, height, perimeter, quantity` | ✅ работает |
| Зоны парной   | WorkStage      | `MarkupSettings` (loadMarkups) | `S, surfaceArea, wallArea, ceilArea, volume, perimeter...` | ⚠️ только stageIds (блок 1) |

### Формульный движок (formula-engine.ts)
- tokenize → Shunting-Yard (RPN) → eval.
- Операторы `+ - * /`; функции `ceil/floor/round/abs` (1 арг), `min/max` (2 арг).
- Неизвестная переменная → 0; деление на 0 → 0; пустая формула → 0.
- ⚠️ Недопустимый символ → **throw** (нет try/catch вокруг вызовов → риск падения расчёта).

### Формула итога:
- Обычные зоны: `total = (labor + materials) * (1 + markupPercent/100)`; `grandTotal += zonesMarkup`.
- Парная: наценка «зашита» в цену материала/работы, отдельной строки нет.
- ⚠️ **Разная механика суммирования наценки** в двух контурах.

---

## 5. СИСТЕМА НАЦЕНОК (двойная — источник путаницы)

| Где                | Что применяет                          | В каком контуре |
|--------------------|----------------------------------------|-----------------|
| `WorkType.markupPercent` | наценка на весь work (labor+mat) | обычные зоны    |
| `MarkupSettings` (Markup)| материал: custom→category→global; работа: global | парная |
| `Nomenclature.markup`    | customMarkup (если useGroupMarkup=false) | парная (приоритет 1) |

- `MarkupType.WORKTYPE` — объявлен, **нигде не используется**.
- `MarkupService.getMarkupForCategory` — **не вызывается** (Estimate дублирует логику в loadMarkups).

---

## 6. СКВОЗНЫЕ СОГЛАШЕНИЯ (паттерны кода)

- **Auth:** `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` везде.
  - Чтение справочников: ADMIN + MANAGER.
  - Запись/удаление справочников: только ADMIN.
  - Users: полностью только ADMIN. Clients/Projects/Estimate(CRUD): ADMIN+MANAGER, DELETE Estimate — ADMIN.
- **Update-DTO** через `PartialType(...)` объявлены **внутри service.ts** (кроме Clients/Projects/Nomenclature — там в dto/). PUT-контроллеры справочников часто принимают полный Create-DTO.
- `.lean()` в read-запросах справочников.
- `// @ts-ignore` в `create` справочников с nested-массивами (WorkType/WorkStage/Ventilation).
- Пагинация справочников/CRM: `{ items, total, page, pages }`.
- `remove` = hard delete везде, кроме Users (soft `isActive=false`).

---

## 7. ENV (полный список)

| Переменная                | Модуль    | Назначение              | Default              |
|---------------------------|-----------|-------------------------|----------------------|
| `MONGO_URI`               | app       | подключение MongoDB     | — (обяз.)            |
| `FRONTEND_URL`            | app       | CORS origin             | http://localhost:3000|
| `PORT`                    | app       | порт                    | 3001                 |
| `JWT_SECRET`              | Auth      | секрет access           | ⚠️ fallback 'fallback-secret' |
| `JWT_EXPIRES_IN`          | Auth      | TTL access              | —                    |
| `JWT_REFRESH_SECRET`      | Auth      | секрет refresh          | —                    |
| `JWT_REFRESH_EXPIRES_IN`  | Auth      | TTL refresh (в JWT)     | — (⚠️ в БД хардкод +7d)|

---

## 8. 🔴 КРИТИЧЕСКИЕ РИСКИ (приоритет исправления)

### 🔴 R1. Импорт номенклатуры рвёт ВСЮ систему ссылок
`Nomenclature.importFromExcel` → `deleteMany({})` + `insertMany` →
**новые `_id`** → битые `nomenclatureId` в WorkType / WorkStage / Ventilation.
> **Фикс:** upsert по стабильному ключу (`msUuid` / `article`), без удаления коллекции.

### 🔴 R2. Импорт теряет поля и ручные правки
- Поля `msUuid/itemType/categoryPath/purchasePrice` не описаны в схеме → отбрасываются.
- Ручные `markup/packageLogic/wasteFactor` затираются при каждом импорте.
> **Фикс:** добавить поля в схему + upsert, сохраняющий пользовательские настройки.

### 🔴 R3. Блоки 2–7 парной не реализованы
DTO + схема (`sections[]`) готовы для finish/wooden/openings/ventilation/lighting/equipment,
но `computeSauna` считает **только `stageIds`**. Ventilation-модуль в расчёт не подключён.
> **Фикс:** реализовать секции или явно отметить как WIP для фронта.

### 🔴 R4. Формулы могут уронить расчёт
`evalFormula` кидает Error на недопустимый символ; вызовы не обёрнуты в try/catch.
Битую формулу можно сохранить (нет валидации синтаксиса при записи WorkType/WorkStage).
> **Фикс:** валидация формулы при сохранении + try/catch в расчёте.

---

## 9. 🟡 СРЕДНИЕ РИСКИ

| # | Риск                                                              | Модуль(и)          |
|---|-------------------------------------------------------------------|--------------------|
| M1| Двойная система наценок (WorkType vs Markup) — риск путаницы/двойного начисления | Estimate, WorkType, Markup |
| M2| Разная механика суммирования наценки (обычные зоны vs парная)     | Estimate           |
| M3| `estimatesCount` в Project никогда не инкрементится (Estimate ⊥ Projects) | Projects, Estimate |
| M4| Смена `clientId` в Project не пересчитывает счётчики клиентов     | Projects           |
| M5| Каскады удаления отсутствуют (Client→Projects→Estimates остаются битыми) | Clients, Projects |
| M6| Нет глобального фильтра ошибок → невалидный ObjectId = **500** везде | ВСЕ                |
| M7| Auth: fallback-секрет, нет ротации refresh, хардкод +7d, нет TTL-индекса | Auth           |
| M8| `create` в Users возвращает `passwordHash` (утечка в ответе)     | Users              |
| M9| «Магические строки» `applicableTo`/`zoneTypes` без enum          | WorkType           |
| M10| MaterialFormula (WorkType) без `_id:false` — несогласованность subschema | WorkType     |
| M11| Markup: `WORKTYPE` не используется; несколько GLOBAL возможны; PUT без PartialType | Markup |
| M12| `email` в Client через `@IsString` (не `@IsEmail`)               | Clients            |
| M13| PUT справочников без частичной валидации (полный Create-DTO)      | WorkType/Stage/Ventilation |

---

## 10. ЗАМЕЧЕННЫЕ ДУБЛИ В ПРИСЛАННОМ КОДЕ (проверить физически)
- Markup, Nomenclature, Projects — блоки файлов приходили **продублированными**
  в сообщениях. Убедиться, что в репозитории файлы не задвоены.

---

## 11. МАТРИЦА ДОСТУПА (RBAC)

| Ресурс          | GET (чтение)   | POST/PUT       | DELETE   |
|-----------------|----------------|----------------|----------|
| /users          | ADMIN          | ADMIN          | — (deactivate: ADMIN) |
| /clients        | ADMIN, MANAGER | ADMIN, MANAGER | ADMIN, MANAGER |
| /projects       | ADMIN, MANAGER | ADMIN, MANAGER | ADMIN, MANAGER |
| /estimates      | ADMIN, MANAGER | ADMIN, MANAGER | **ADMIN**|
| /nomenclature   | ADMIN, MANAGER | ADMIN          | ADMIN    |
| /markup         | ADMIN, MANAGER | ADMIN          | ADMIN    |
| /work-types     | ADMIN, MANAGER | ADMIN          | ADMIN    |
| /work-stages    | ADMIN, MANAGER | ADMIN          | ADMIN    |
| /ventilation    | ADMIN, MANAGER | ADMIN          | ADMIN    |

Паттерн: **справочники правит только ADMIN**, CRM (клиенты/проекты/сметы) — ADMIN+MANAGER.

---

## 12. РЕКОМЕНДОВАННЫЙ ПОРЯДОК РАБОТ (roadmap)

1. 🔴 Переписать импорт номенклатуры на **upsert** (R1+R2) — снимает системный риск ссылок.
2. 🔴 Обернуть формулы в try/catch + валидация при сохранении (R4).
3. 🔴 Доработать `computeSauna`: блоки 2–7 + подключить Ventilation (R3).
4. 🟡 Унифицировать наценки (M1, M2) — единый источник/механика.
5. 🟡 Глобальный ExceptionFilter (CastError → 400) (M6).
6. 🟡 Связать Estimate ↔ Projects (`estimatesCount`) (M3).
7. 🟡 Auth hardening: убрать fallback-секрет, ротация refresh, TTL-индекс (M7).
8. 🟡 Убрать `passwordHash` из ответа create (M8).
Готово. Полный системный контекст собран: все 10 модулей, граф зависимостей, модель расчёта, система наценок, RBAC-матрица, ENV, и приоритизированный список рисков с roadmap.

Главные выводы по всей системе:

🔴 Единая точка отказа — Nomenclature._id. Импорт из Excel (deleteMany) рвёт ссылки во всех справочниках. Это риск №1.
🔴 Расчёт парной реализован на ~15% — только stageIds (блок 1). Блоки 2–7 и Ventilation в computeSauna не подключены, хотя DTO/схема готовы.
🟡 Двойная система наценок (WorkType vs Markup) с разной механикой суммирования — главный источник расхождений в цифрах смет.
Теперь у меня есть цельная карта. Перед любыми правками — как ты и просил — буду запрашивать актуальную версию конкретных файлов, чтобы не сломать связи (особенно вокруг Nomenclature ↔ справочники и Estimate).
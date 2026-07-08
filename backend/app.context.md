Зафиксировал корневой контекст приложения. Вот app.context.md:

Markdown

# Общий контекст приложения (Backend)

## Что за проект
Backend для системы расчёта смет по строительству/отделке **саун и бань**.
Стек: **NestJS 11 + MongoDB (Mongoose 9)**. Язык: TypeScript.
Сущность-домен: справочники материалов/работ → расчёт смет по проектам клиентов.

---

## Технологический стек / пакеты

### Runtime (dependencies)
| Пакет                     | Версия   | Назначение                              |
|---------------------------|----------|-----------------------------------------|
| `@nestjs/common/core`     | ^11.0.1  | ядро NestJS                             |
| `@nestjs/config`          | ^4.0.4   | ENV-конфиг (глобальный)                 |
| `@nestjs/mongoose`        | ^11.0.4  | ODM-интеграция                          |
| `mongoose`                | ^9.7.3   | MongoDB драйвер/ODM                     |
| `@nestjs/jwt`             | ^11.0.2  | JWT-токены (Auth)                       |
| `@nestjs/passport`        | ^11.0.5  | стратегии аутентификации                |
| `passport-jwt`            | ^4.0.1   | JWT-стратегия                           |
| `passport-local`          | ^1.0.0   | local-стратегия (login по email/pass)   |
| `bcryptjs`                | ^3.0.3   | хэш паролей                             |
| `class-validator`         | ^0.15.1  | валидация DTO                           |
| `class-transformer`       | ^0.5.1   | трансформация DTO (@Type nested)        |
| `@nestjs/mapped-types`    | ^2.1.1   | PartialType для Update-DTO              |
| `multer` + `@types`       | ^2.2.0   | загрузка файлов (Excel-импорт)          |
| `xlsx`                    | ^0.18.5  | парсинг Excel (Nomenclature import)     |
| `@nestjs/platform-express`| ^11.1.27 | HTTP-слой                               |
| `rxjs`                    | ^7.8.1   | реактивность (базово)                   |

### Dev / тесты
Jest 30 + ts-jest, ESLint 9 + Prettier, ts-node (seed), supertest (e2e).
Тесты: `*.spec.ts`, rootDir=`src`. Пока есть только заглушка `app.controller.spec.ts`.

---

## Точка входа (main.ts)
- **Глобальный префикс:** `/api` → все роуты идут как `/api/...`.
  ⚠️ Значит реально: `/api/users`, `/api/estimate`, `/api/work-types` и т.д.
- **Глобальный ValidationPipe:** `{ whitelist: true, transform: true }`
  → лишние поля отсекаются, типы приводятся (важно для nested DTO).
- **CORS:** origin = `FRONTEND_URL` или `http://localhost:3000`, `credentials: true`.
- **Порт:** `PORT` или `3001`.

## Конфиг / ENV
| Переменная     | Назначение                    | Default                 |
|----------------|-------------------------------|-------------------------|
| `MONGO_URI`    | строка подключения MongoDB    | — (обяз.)               |
| `FRONTEND_URL` | CORS origin                   | http://localhost:3000   |
| `PORT`         | порт бэкенда                  | 3001                    |
| `JWT_SECRET`*  | секрет JWT (см. AuthModule)   | — (проверить в Auth)    |

`ConfigModule.forRoot({ isGlobal: true })` — доступен везде без импорта.

---

## Карта модулей (порядок в AppModule)
| Модуль             | Путь                | Роль в системе                              | Статус фиксации |
|--------------------|---------------------|---------------------------------------------|-----------------|
| **AuthModule**     | `src/auth`          | JWT/login, guards, стратегии                | ⬜ не прислан    |
| **UsersModule**    | `src/users`         | пользователи, роли (ADMIN/MANAGER)          | ✅ зафиксирован  |
| **NomenclatureModule**| `src/nomenclature`| материалы + Excel-импорт (`deleteMany` ⚠️) | ⬜ не прислан    |
| **MarkupModule**   | `src/markup`        | наценки                                     | ⬜ не прислан    |
| **ClientsModule**  | `src/clients`       | клиенты (+ projectsCount)                   | ⬜ не прислан    |
| **ProjectsModule** | `src/projects`      | проекты (managerId, clientId)               | ⬜ не прислан    |
| **WorkTypeModule** | `src/work-type`     | атомарные виды работ (формулы, `area`)      | ✅ зафиксирован  |
| **WorkStagesModule**| `src/work-stages`  | этапы-шаблоны (формулы, `S`/`perimeter`)    | ✅ зафиксирован  |
| **VentilationModule**| `src/ventilation` | комплекты вентиляции (фикс.)                | ✅ зафиксирован  |
| **EstimateModule** | `src/estimate`      | РАСЧЁТ СМЕТ (ядро, движок формул)           | ⬜ не прислан 🔴 |

> `EstimateModule` подключён **последним** — потребитель всех справочников.

---

## Структура папок (соглашение)
Каждый модуль однотипен:
src/<module>/
dto/create-.dto.ts        # Create-DTO (+ nested классы)
schemas/.schema.ts        # Mongoose-схема (+ subschemas)
*.controller.ts            # роуты + guards + @Roles
*.service.ts               # бизнес-логика (+ Update-DTO через PartialType внутри)
*.module.ts                # MongooseModule.forFeature + exports Service



---

## Сквозные соглашения / паттерны
- **Авторизация:** везде `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
  Обычно: чтение — ADMIN+MANAGER, запись/удаление справочников — только ADMIN.
- **Update-DTO** объявляются **внутри service.ts** через `PartialType(...)`,
  но PUT-контроллеры принимают полный Create-DTO (частичной валидации на PUT нет).
- `.lean()` в справочниках (read-модели).
- `// @ts-ignore` в `create` справочников с nested-массивами (расхождение DTO ↔ схема).

---

## Seed (seed.ts, `npm run seed`)
Создаёт админа: `admin@sauna.ru` / `admin123` (role ADMIN).
Идемпотентно (ConflictException → «уже существует»). ⚠️ Дефолтный пароль — сменить в проде.

---

## Сквозные РИСКИ уровня приложения
- [ ] 🔴 **Импорт номенклатуры делает `deleteMany({})`** → пересоздаёт `_id` материалов
      ⇒ рвутся ВСЕ `nomenclatureId`-ссылки в WorkType / WorkStage / Ventilation.
      Самый опасный сквозной баг. Проверить/переписать импорт на upsert по коду.
- [ ] 🔴 **Движок формул** (`formula`, `laborFormula`) — где и как вычисляется,
      безопасность, набор переменных. Разнобой имён: WorkType=`area`, WorkStage=`S`/`perimeter`.
      → живёт в EstimateService (не прислан).
- [ ] 🟡 **Наценка**: `markupPercent` в WorkType + отдельный MarkupModule + возможно Nomenclature.
      Риск двойного начисления — свериться в Estimate.
- [ ] 🟡 «Магические строки» (`applicableTo`, `zoneTypes`) без общих enum.
- [ ] 🟡 Нет глобального фильтра ошибок → невалидный ObjectId в `:id` = 500 (CastError) везде.
- [ ] 🟡 JWT-секрет/срок жизни — проверить в AuthModule.

---

## Чтобы завершить карту приложения — не хватает:
1. 🔴 **EstimateModule** (service + schema) — ядро расчёта, движок формул, применение наценок.
2. **NomenclatureModule** — материалы + импорт Excel (`deleteMany` риск).
3. **AuthModule** — guards, стратегии, JWT, проверка `isActive`.
4. **MarkupModule** — как устроены наценки.
5. **ClientsModule** + **ProjectsModule** — связки clientId/managerId/projectsCount.
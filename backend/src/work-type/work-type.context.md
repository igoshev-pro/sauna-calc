# Модуль: WorkType (Виды работ)

## Назначение
Справочник видов работ с привязкой к зонам/поверхностям. Каждый вид работы =
расценка на труд (за единицу) + набор формул расхода материалов + собственная наценка.
Используется в расчёте сметы при подборе работ по типу поверхности и зоне помещения.

## Зависимости
- `MongooseModule` — коллекция `WorkType`.
- Auth guards/decorators + `UserRole`.

## Экспорт
`WorkTypeService` экспортируется → используется в **EstimateModule** (расчёт).

---

## Схема (schemas/work-type.schema.ts)
Коллекция `WorkType` (timestamps: true):
| Поле               | Тип                | Default | Описание                              |
|--------------------|--------------------|---------|---------------------------------------|
| `name`            | string (req)       | —       | название вида работ                   |
| `unit`            | string (req)       | —       | ед. изм. работы                       |
| `laborCostPerUnit`| number (req)       | `0`     | стоимость труда за единицу            |
| `materialFormulas`| MaterialFormula[]  | `[]`    | формулы расхода материалов            |
| `applicableTo`    | string[]           | `[]`    | к чему применимо (см. ниже)           |
| `zoneTypes`       | string[]           | `[]`    | типы зон (см. ниже)                   |
| `markupPercent`   | number             | `0`     | наценка % (на уровне вида работ)      |

### MaterialFormula (subschema — ⚠️ БЕЗ `_id: false`, генерится `_id`)
| Поле            | Тип                          | Default | Описание             |
|-----------------|------------------------------|---------|----------------------|
| `nomenclatureId`| ObjectId ref NomenclatureItem| —      | материал             |
| `formula`       | string (req)                 | —       | напр. `"area * 1.1"` |
| `description`   | string                       | `''`    | описание             |

### Словари значений
- `applicableTo`: `wall` / `ceiling` / `floor` / `opening` / `equipment` / `lighting`.
- `zoneTypes`: `steam_room` / `hallway` / `rest_room` / `bathroom` / `terrace`.

> Это строковые enum-подобные значения (в коде НЕ enum — просто string[]).
> Фронт/Estimate должны использовать те же строки. Риск рассинхрона написания.

---

## DTO

### CreateWorkTypeDto
- `name` — string (обяз.).
- `unit` — string (обяз.).
- `laborCostPerUnit` — number ≥ 0 (обяз.).
- `materialFormulas?` — MaterialFormulaDto[] (nested):
  - `nomenclatureId` — string (обяз. в DTO).
  - `formula` — string (обяз.).
  - `description?` — string.
- `applicableTo?`, `zoneTypes?` — string[].
- `markupPercent?` — number ≥ 0.

### UpdateWorkTypeDto
`PartialType(CreateWorkTypeDto)` — **объявлен внутри service.ts**.
PUT-контроллер принимает полный `CreateWorkTypeDto` (нет частичной валидации на PUT).

---

## Контроллер (/work-types)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут              | Роли           | Действие                          |
|-------|-------------------|----------------|-----------------------------------|
| GET   | `/work-types`     | ADMIN, MANAGER | список (?applicableTo=&zoneType=) |
| GET   | `/work-types/:id` | ADMIN, MANAGER | один                              |
| POST  | `/work-types`     | **ADMIN**      | создать                           |
| PUT   | `/work-types/:id` | **ADMIN**      | обновить                          |
| DELETE| `/work-types/:id` | **ADMIN**      | удалить                           |

- Фильтры: `applicableTo` → матч по элементу массива; `zoneType` → матч в `zoneTypes`.

---

## Сервис (work-type.service.ts)
Стандартный CRUD, `.lean()`. `remove` — hard delete.
- `create` помечен `// @ts-ignore` (расхождение типа DTO ↔ create-payload).

---

## WorkType vs WorkStage — в чём разница (важно!)
| Аспект            | WorkType                          | WorkStage                              |
|-------------------|-----------------------------------|----------------------------------------|
| Смысл             | атомарный вид работы по зоне/пов-ти| составной шаблон-этап (сборка)         |
| Материалы         | `materialFormulas[]` (формула)    | `items[]` (formula ИЛИ fixed)          |
| Работа            | `laborCostPerUnit` (за unit)      | `laborFormula` × `laborPricePerUnit`   |
| Наценка           | `markupPercent` (своя)            | нет своей наценки                      |
| Фильтрация        | `applicableTo` + `zoneTypes`      | `isTemplate`                           |
| Переменные формул | `area`, ...                       | `S`, `perimeter`, ...                  |

> ⚠️ Переменные формул различаются по именованию: WorkType использует `area`,
> WorkStage — `S`/`perimeter`. Нужно свериться в EstimateService, какой набор
> переменных реально подставляется и совпадают ли имена.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 `nomenclatureId` в `materialFormulas[]` завязан на `_id` номенклатуры.
      Импорт Excel (`deleteMany({})`) → **все ссылки битые**.
- [ ] 🔴 `formula` — строка, вычисляется в Estimate. Критично: движок вычисления,
      набор переменных (`area` и т.д.), обработка ошибок/деления на 0.
- [ ] 🟡 MaterialFormula-subschema **без `_id: false`** → Mongo генерит `_id`
      каждой формуле (в отличие от StageItem/VentilationItem). Несогласованность схем.
- [ ] 🟡 Двойная наценка? `markupPercent` есть и здесь, и (возможно) в Nomenclature/Estimate.
      Проверить в EstimateService, чтобы наценка не применялась дважды.
- [ ] 🟡 `applicableTo`/`zoneTypes` — «магические строки» без enum → риск опечаток
      и рассинхрона с фронтом и Estimate.
- [ ] 🟡 На PUT нет частичной валидации (принимается полный Create DTO).
- [ ] 🟡 `// @ts-ignore` в `create` маскирует расхождение типов.
- [ ] Нет валидации синтаксиса формулы при сохранении.
- [ ] `remove` — hard delete.
- [ ] Невалидный ObjectId в `:id` → CastError 500.
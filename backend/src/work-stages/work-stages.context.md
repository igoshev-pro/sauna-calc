# Модуль: WorkStages (Этапы работ)

## Назначение
Справочник этапов работ (шаблоны для сборки сметы, напр. отделка парной).
Каждый этап = набор материалов (с формулой/фикс. количеством) + расценка на работу
(формула объёма × цена за единицу). Ключевой строительный блок расчёта смет.

## Зависимости
- `MongooseModule` — коллекция `WorkStage`.
- Auth guards/decorators + `UserRole`.

## Экспорт
`WorkStagesService` экспортируется → используется в **EstimateModule** (расчёт).

---

## Схема (schemas/work-stage.schema.ts)
Коллекция `WorkStage` (timestamps: true):
| Поле               | Тип           | Default | Описание                         |
|--------------------|---------------|---------|----------------------------------|
| `name`            | string (req)  | —       | название этапа                   |
| `sortOrder`       | number        | `0`     | порядок                          |
| `isTemplate`      | boolean       | `true`  | шаблон (для быстрого добавления) |
| `items`           | StageItem[]   | `[]`    | материалы этапа                  |
| `laborFormula`    | string        | `'S'`   | формула объёма работ (напр. S=площадь)|
| `laborPricePerUnit`| number       | `0`     | цена работы за единицу           |
| `laborUnit`       | string        | `'м²'`  | ед. изм. работы                  |

### StageItem (subschema, `_id: false`)
| Поле            | Тип                          | Default | Описание                       |
|-----------------|------------------------------|---------|--------------------------------|
| `nomenclatureId`| ObjectId ref NomenclatureItem| —      | материал                       |
| `formula`       | string                       | `''`    | формула кол-ва, напр. "(perimeter / 0.5) + 2" |
| `isFixed`       | boolean                      | `false` | фиксированное количество?      |
| `fixedQty`      | number                       | `0`     | значение при isFixed           |
| `unit`          | string                       | `''`    | ед. изм.                       |
| `comment`       | string                       | `''`    | комментарий                    |

> Логика количества: если `isFixed` → `fixedQty`, иначе → вычисление `formula`.
> Переменные формул (perimeter, S и др.) приходят из параметров помещения в Estimate.

---

## DTO

### CreateWorkStageDto
- `name` — string (обяз.).
- `sortOrder?` — number.
- `isTemplate?` — boolean.
- `items?` — StageItemDto[] (nested):
  - `nomenclatureId?`, `formula?`, `unit?`, `comment?` — string.
  - `isFixed?` — boolean; `fixedQty?` — number ≥ 0.
- `laborFormula?` — string.
- `laborPricePerUnit?` — number ≥ 0.
- `laborUnit?` — string.

### UpdateWorkStageDto
`PartialType(CreateWorkStageDto)` — **объявлен внутри service.ts**.
PUT-контроллер принимает полный `CreateWorkStageDto` (нет частичной валидации на PUT).

---

## Контроллер (/work-stages)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут                    | Роли           | Действие              |
|-------|-------------------------|----------------|-----------------------|
| GET   | `/work-stages`          | ADMIN, MANAGER | список (sort sortOrder)|
| GET   | `/work-stages/templates`| ADMIN, MANAGER | только isTemplate=true |
| GET   | `/work-stages/:id`      | ADMIN, MANAGER | один                  |
| POST  | `/work-stages`          | **ADMIN**      | создать               |
| PUT   | `/work-stages/:id`      | **ADMIN**      | обновить              |
| DELETE| `/work-stages/:id`      | **ADMIN**      | удалить               |

> Порядок роутов: `templates` до `:id` — корректно.

---

## Сервис (work-stages.service.ts)

### findAll() / findTemplates()
Сортировка `sortOrder: 1`, `.lean()`. `findTemplates` фильтрует `isTemplate: true`.

### findOne / create / update / remove — стандартный CRUD.
- `create` помечен `// @ts-ignore` (расхождение типа DTO ↔ create-payload из-за nested items).
- `remove` — hard delete.

---

## Связь с расчётом смет (EstimateService)
Ожидаемая логика на этап:
- **Материалы**: для каждого `StageItem` количество =
  `isFixed ? fixedQty : eval(formula, переменные_помещения)`,
  далее × `waste/markup` из Nomenclature по `nomenclatureId` → цена.
- **Работа**: объём = `eval(laborFormula)` × `laborPricePerUnit`.
- Переменные (S, perimeter, height, …) — из параметров помещения/объекта в Estimate.

> ⚠️ Нужно свериться с EstimateService: какой парсер формул используется,
> список допустимых переменных, как обрабатываются ошибки формул.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 `nomenclatureId` в `items[]` завязан на `_id` номенклатуры.
      Импорт Excel (Nomenclature) делает `deleteMany({})` → **все ссылки битые**.
- [ ] 🔴 Формулы (`formula`, `laborFormula`) — строки, вычисляются в Estimate.
      Критично: движок вычисления (eval/безопасный парсер), валидация переменных,
      поведение при делении на 0 / неизвестной переменной. Проверить в EstimateService.
- [ ] 🟡 На PUT нет частичной валидации (принимается полный Create DTO).
- [ ] 🟡 `// @ts-ignore` в `create` маскирует расхождение типов.
- [ ] Нет валидации синтаксиса формулы при сохранении → битую формулу можно записать,
      ошибка всплывёт только при расчёте сметы.
- [ ] `remove` — hard delete (живые ссылки в шаблонах смет теряются; снапшоты — ок).
- [ ] Невалидный ObjectId в `:id` → CastError 500.
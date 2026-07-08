# Модуль: Ventilation (Варианты вентиляции)

## Назначение
Справочник готовых вариантов схем вентиляции. Каждый вариант — это набор
позиций номенклатуры с фиксированным количеством + фиксированная стоимость работ.
Используется при формировании сметы (выбор варианта вентиляции для объекта).

## Зависимости
- `MongooseModule` — коллекция `VentilationVariant`.
- Auth guards/decorators + `UserRole`.

## Экспорт
`VentilationService` экспортируется (для использования в расчёте смет / EstimateModule).

---

## Схема (schemas/ventilation-variant.schema.ts)
Коллекция `VentilationVariant` (timestamps: true):
| Поле         | Тип                | Default | Описание                          |
|--------------|--------------------|---------|-----------------------------------|
| `name`      | string (req)       | —       | напр. "Базовая приточно-вытяжная" |
| `description`| string            | `''`    | описание                          |
| `schemeType`| string             | `''`    | тип схемы (basic/залповая/принуд.)|
| `sortOrder` | number             | `0`     | порядок сортировки                |
| `isActive`  | boolean            | `true`  | активен                           |
| `items`     | VentilationItem[]  | `[]`    | состав (материалы)                |
| `laborCost` | number             | `0`     | фикс. стоимость работ за вариант   |

### VentilationItem (subschema, `_id: false`)
| Поле           | Тип                          | Default | Описание                |
|----------------|------------------------------|---------|-------------------------|
| `nomenclatureId`| ObjectId ref NomenclatureItem| —      | ссылка на материал      |
| `name`         | string                       | `''`    | наименование (снапшот)  |
| `unit`         | string                       | `''`    | ед. изм.                |
| `quantity`     | number                       | `1`     | фикс. количество        |
| `comment`      | string                       | `''`    | комментарий             |

> Отличие от WorkType: количество **фиксированное** (не формула),
> работа — **фиксированная сумма** `laborCost` (не через объём/расценку).

---

## DTO

### CreateVentilationVariantDto
- `name` — string (обяз.).
- `description?`, `schemeType?` — string.
- `sortOrder?` — number.
- `isActive?` — boolean.
- `items?` — VentilationItemDto[] (nested):
  - `nomenclatureId?`, `name?`, `unit?` — string.
  - `quantity?` — number ≥ 0.
  - `comment?` — string.
- `laborCost?` — number ≥ 0.

### UpdateVentilationVariantDto
`PartialType(CreateVentilationVariantDto)` — **объявлен внутри service.ts**
(не в отдельном файле dto). Контроллер на PUT принимает `CreateVentilationVariantDto`.

---

## Контроллер (/ventilation)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут              | Роли           | Действие              |
|-------|-------------------|----------------|-----------------------|
| GET   | `/ventilation`    | ADMIN, MANAGER | список (?active=true) |
| GET   | `/ventilation/:id`| ADMIN, MANAGER | один                  |
| POST  | `/ventilation`    | **ADMIN**      | создать               |
| PUT   | `/ventilation/:id`| **ADMIN**      | обновить              |
| DELETE| `/ventilation/:id`| **ADMIN**      | удалить               |

- `GET` с `?active=true` → только активные; иначе все.

---

## Сервис (ventilation.service.ts)

### findAll(onlyActive?)
Фильтр `isActive: true` при `onlyActive`. Сортировка `sortOrder: 1`. `.lean()`.

### findOne / create / update / remove — стандартный CRUD.
- `create` помечен `// @ts-ignore` (несовпадение типа DTO с create-payload из-за nested).
- `remove` — hard delete.

---

## Связь с расчётом смет (EstimateService)
При выборе варианта вентиляции ожидается:
- материалы `items[]` → цена берётся по `nomenclatureId` из Nomenclature,
  количество = `item.quantity` (фиксированное, без wasteFactor/формул — уточнить в Estimate).
- работа = `laborCost` (фикс. сумма).

> ⚠️ Нужно свериться с EstimateService, применяется ли к этим материалам наценка
> (markup) и wasteFactor, или берётся «как есть».

---

## Точки внимания (TODO / риски)
- [ ] 🔴 `importFromExcel` в Nomenclature делает `deleteMany({})` → пересоздаёт `_id`
      материалов ⇒ `nomenclatureId` в `items[]` вариантов вентиляции **становятся битыми**.
      (Тот же риск, что для WorkType/WorkStage.)
- [ ] 🟡 `UpdateVentilationVariantDto` объявлен внутри service.ts, а PUT-контроллер
      принимает полный `CreateVentilationVariantDto` (нет частичной валидации на PUT).
- [ ] 🟡 `// @ts-ignore` в `create` — маскирует расхождение типов DTO ↔ схема.
- [ ] `remove` — hard delete: если вариант уже использован в сохранённой смете —
      смета-снапшот не пострадает, но ссылка «живого» варианта потеряется.
- [ ] Невалидный ObjectId в `:id` → CastError 500.
- [ ] Нет валидации существования `nomenclatureId` (можно сохранить битую ссылку).
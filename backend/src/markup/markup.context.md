# Модуль: Markup (Настройки наценок)

## Назначение
CRUD-управление настройками наценок на материалы и работы.
Наценки применяются при расчёте смет (в основном — в парной зоне EstimateService).

## Зависимости
- `MongooseModule` — коллекция `MarkupSettings`.
- Auth guards/decorators (`JwtAuthGuard`, `RolesGuard`, `@Roles`).
- `UserRole` (из UsersModule).

## Экспорт
`MarkupService` экспортируется (но напрямую **не инжектится** в EstimateService —
там читается через `MarkupSettings` модель напрямую; см. риски).

---

## Схема (schemas/markup-settings.schema.ts)
Коллекция `MarkupSettings` (timestamps: true):
| Поле            | Тип        | Default | Описание                        |
|-----------------|------------|---------|---------------------------------|
| `type`         | MarkupType | required| уровень применения наценки      |
| `categoryName` | string     | `''`    | имя категории (для type=category)|
| `materialMarkup`| number    | `0`     | наценка на материал, %          |
| `laborMarkup`  | number     | `0`     | наценка на работу, %            |
| `isActive`     | boolean    | `true`  | активна ли настройка            |

### enum MarkupType
- `GLOBAL = 'global'` — глобальная наценка (fallback).
- `CATEGORY = 'category'` — по категории номенклатуры (`categoryName`).
- `WORKTYPE = 'worktype'` — по типу работ.

> ⚠️ `WORKTYPE` объявлен в enum, но **нигде не используется** в расчёте
> (ни в MarkupService.getMarkupForCategory, ни в EstimateService.loadMarkups).

---

## DTO (CreateMarkupDto)
- `type` — enum MarkupType (обяз.).
- `categoryName?` — string.
- `materialMarkup` — number ≥ 0 (обяз.).
- `laborMarkup` — number ≥ 0 (обяз.).
- `isActive?` — boolean.

> ⚠️ `update` использует тот же `CreateMarkupDto` (не PartialType),
> т.е. на PUT формально требуются обязательные поля.
> В сервисе сигнатура `update(id, dto: Partial<CreateMarkupDto>)` — расхождение
> с контроллером (там полный DTO).

---

## Контроллер (/markup)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут          | Роли           | Действие          |
|-------|---------------|----------------|-------------------|
| GET   | `/markup`     | ADMIN, MANAGER | список активных   |
| POST  | `/markup`     | **ADMIN**      | создать           |
| PUT   | `/markup/:id` | **ADMIN**      | обновить          |
| DELETE| `/markup/:id` | **ADMIN**      | удалить (hard)    |

---

## Сервис (markup.service.ts)

### findAll()
Возвращает только `isActive: true`.

### findOne(id) / create(dto) / update(id, dto) / remove(id)
Стандартный CRUD. `remove` — жёсткое удаление (`findByIdAndDelete`).

### getMarkupForCategory(category)
Приоритет:
1. Настройка `type=CATEGORY` + `categoryName=category` + активная.
2. Fallback → `type=GLOBAL` активная.

> ⚠️ Метод `getMarkupForCategory` **не вызывается** из EstimateService —
> там своя реализация `loadMarkups()` с более сложным приоритетом
> (учитывает ещё кастомную наценку самой номенклатуры `nom.markup.customMarkup`).

---

## Связь с расчётом смет (EstimateService)
`EstimateService.loadMarkups()` читает `markupModel.find({ isActive: true })` напрямую:
- **Материал**: кастомная позиции → категория → глобальная.
- **Работа**: только глобальная (`global.laborMarkup`).

Используется ТОЛЬКО в расчёте **парной** (`computeSauna`).
Обычные зоны берут наценку из `WorkType.markupPercent`, а не отсюда.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 В присланном коде модуль **продублирован дважды** (весь блок файлов повторён).
      Проверить, что физически файлы не задвоены.
- [ ] 🟡 `MarkupType.WORKTYPE` объявлен, но нигде не обрабатывается.
- [ ] 🟡 `getMarkupForCategory` не используется (дублирует логику EstimateService).
      Возможна рассинхронизация правил наценок.
- [ ] 🟡 `update` в контроллере принимает полный `CreateMarkupDto` (нет PartialType) —
      частичное обновление невалидно на уровне валидации.
- [ ] Нет ограничения на кол-во `GLOBAL`-записей (может быть несколько активных;
      EstimateService берёт первую через `.find()`).
- [ ] Невалидный ObjectId → CastError 500.
- [ ] `hard delete` наценки может «сломать» историю расчётов (но сметы — snapshot, ОК).
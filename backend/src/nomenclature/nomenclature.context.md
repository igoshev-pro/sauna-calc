# Модуль: Nomenclature (Справочник номенклатуры/материалов)

## Назначение
CRUD-справочник материалов: цены, единицы, категории, логика упаковки,
запас (waste), индивидуальная наценка. Импорт из МойСклад (Excel).
**Источник цен и параметров материалов для расчёта смет (EstimateService).**

## Зависимости
- `MongooseModule` — коллекция `NomenclatureItem`.
- `MulterModule` — загрузка файла (лимит 10 MB).
- `xlsx` — парсинг Excel.
- Auth guards/decorators + `UserRole`.

## Экспорт
`NomenclatureService` экспортируется.
Модель `NomenclatureItem` используется в **EstimateModule** напрямую (forFeature).

---

## Схема (schemas/nomenclature.schema.ts)
Коллекция `NomenclatureItem` (timestamps: true):
| Поле           | Тип              | Default | Описание                     |
|----------------|------------------|---------|------------------------------|
| `name`        | string (required)| —       | наименование                 |
| `article`     | string           | `''`    | артикул (или EAN13 при импорте)|
| `category`    | string           | `''`    | категория (корень дерева)    |
| `subCategory` | string           | `''`    | подкатегория                 |
| `unit`        | string (required)| —       | ед. изм. (шт/м/м²/м³/кг/л)   |
| `pricePerUnit`| number (required)| `0`     | цена за единицу              |
| `packageLogic`| PackageLogic     | `{}`    | логика упаковки              |
| `wasteFactor` | number           | `10`    | запас, % (по умолч. 10%)     |
| `supplier`    | string           | `''`    | поставщик                    |
| `inStock`     | boolean          | `true`  | в наличии                    |
| `markup`      | NomenclatureMarkup| `{}`   | индивидуальная наценка       |

### PackageLogic (subschema)
- `enabled` (boolean, def false) — включена ли упаковка.
- `packageSize` (number, def 1) — размер упаковки.
- `packageUnit` (string, def '') — ед. упаковки.

### NomenclatureMarkup (subschema)
- `useGroupMarkup` (boolean, def true) — использовать групповую наценку.
- `customMarkup?` (number) — кастомная наценка (если `useGroupMarkup=false`).

### Индексы
- Text: `name`, `article`.
- `category: 1`, `inStock: 1`.

> ⚠️ Импорт из Excel записывает поля `msUuid`, `itemType`, `categoryPath`,
> `purchasePrice`, которых **НЕТ в схеме** (schema не strict-обрезает?
> зависит от глобального `strict` — по умолчанию Mongoose режет их).
> Проверить: эти поля либо теряются, либо нужно добавить в схему.

---

## DTO

### CreateNomenclatureDto
- `name` (обяз.), `unit` (обяз.), `pricePerUnit` ≥ 0 (обяз.).
- `article?`, `category?`, `subCategory?`, `supplier?` — string.
- `wasteFactor?` — number.
- `inStock?` — boolean.
- `packageLogic?` (PackageLogicDto), `markup?` (NomenclatureMarkupDto) — nested.

### UpdateNomenclatureDto
`PartialType(CreateNomenclatureDto)`.

### QueryNomenclatureDto
- `search?`, `category?` — string.
- `inStock?` — string `'true'/'false'` (из query).
- `page?` (def 1, ≥1), `limit?` (def 50, ≥1) — number (`@Type(() => Number)`).

---

## Контроллер (/nomenclature)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут                       | Роли           | Действие                 |
|-------|----------------------------|----------------|--------------------------|
| GET   | `/nomenclature`            | ADMIN, MANAGER | список + пагинация       |
| GET   | `/nomenclature/categories` | ADMIN, MANAGER | список категорий (distinct)|
| GET   | `/nomenclature/:id`        | ADMIN, MANAGER | один                     |
| POST  | `/nomenclature`            | **ADMIN**      | создать                  |
| PUT   | `/nomenclature/:id`        | **ADMIN**      | обновить                 |
| DELETE| `/nomenclature/:id`        | **ADMIN**      | удалить                  |
| POST  | `/nomenclature/import/excel`| **ADMIN**     | импорт из МойСклад       |

> ⚠️ Порядок роутов: `categories` объявлен до `:id` — корректно (не перехватится).

---

## Сервис (nomenclature.service.ts)

### findAll(query)
Фильтр: `$text` (search), `category`, `inStock` (сравнение строки `=== 'true'`).
Пагинация. Возвращает `{ items, total, page, pages }`.

### findOne / create / update / remove — стандартный CRUD.

### getCategories()
`distinct('category')`.

### importFromExcel(buffer) — ПОЛНАЯ ЗАМЕНА
1. Читает первый лист XLSX → JSON.
2. Хелперы:
   - `parseNum` — "440,00" / "1 234,50" → число (пробелы → '', запятая → точка).
   - `isYes` — 'да' → true.
3. По строкам:
   - Пропуск без `Наименование`.
   - Пропуск `Архивный = да` (→ `skipped`).
   - Цена: `Цена: Цена продажи`, если ≤0 → `Закупочная цена` (→ `noPrice`).
   - Категории: `Группы` split по `/` → `categoryPath[]`.
   - `msUuid` из `UUID` (дедуп внутри файла через `seenUuid`).
   - `article`: `Артикул` или `Штрихкод EAN13`.
4. 🔴 **`deleteMany({})` — удаляет ВСЮ коллекцию**, затем `insertMany`.
5. Возвращает `{ imported, skipped, noPriceCount, noPrice[] }`.

**Ожидаемые колонки Excel (МойСклад):**
`Наименование, Архивный, Цена: Цена продажи, Закупочная цена, Группы,
UUID, Артикул, Штрихкод EAN13, Тип, Единица измерения, Поставщик`.

---

## Связь с расчётом смет (EstimateService)
EstimateService читает у номенклатуры:
`pricePerUnit`, `wasteFactor`, `packageLogic` (computeMaterialQty),
`markup` (customMarkup/useGroupMarkup), `category`, `unit`, `name`.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Модуль в сообщении снова **продублирован** — проверить реальные файлы.
- [ ] 🔴 `importFromExcel` делает **полную замену** (`deleteMany({})`):
      - при повторных импортах теряются ручные правки (наценки, packageLogic, wasteFactor);
      - **обнуляет `_id` материалов** → битые ссылки `nomenclatureId` в WorkType/WorkStage!
      Это критично для расчёта смет — после импорта формулы могут ссылаться на несуществующие id.
- [ ] 🔴 Поля импорта (`msUuid`, `itemType`, `categoryPath`, `purchasePrice`)
      не описаны в схеме → скорее всего отбрасываются Mongoose.
- [ ] 🟡 Импорт не выставляет `wasteFactor`/`packageLogic`/`markup` → берутся дефолты схемы.
- [ ] `insertMany({ ordered: false })` — молча пропустит ошибочные строки.
- [ ] Невалидный ObjectId → CastError 500.
- [ ] Нет проверки `file` на undefined (если файл не пришёл → `file.buffer` упадёт).
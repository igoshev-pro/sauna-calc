# Модуль: Estimate (Сметы) — ЯДРО РАСЧЁТА

## Назначение
Расчёт строительных смет из входных данных зон. Два типа зон:
1. **Обычные зоны** (`zones`) — работы (`WorkType`) с формулами материалов.
2. **Зоны парной** (`saunaZones`) — детализация по этапам (`WorkStage`),
   snapshot-модель v2 с секциями (финиш/столярка/проёмы/вентиляция/освещение/оборудование).

Считает трудозатраты, материалы (с учётом запаса и упаковки), наценки → итог.
Результат сохраняется как **snapshot** (цены/названия «замораживаются» в момент расчёта).

## Зависимости (MongooseModule.forFeature)
- `Estimate` — своя коллекция.
- `WorkType` — работы + `materialFormulas`, `laborCostPerUnit`, `markupPercent`.
- `NomenclatureItem` — материалы: `pricePerUnit`, `wasteFactor`, `packageLogic`, `markup`, `category`, `unit`.
- `WorkStage` — этапы парной: `laborFormula`, `laborPricePerUnit`, `items[]`.
- `MarkupSettings` — наценки (global / category).
- `formula-engine.ts` — кастомный вычислитель формул.

## Guards
`@UseGuards(JwtAuthGuard, RolesGuard)` на весь контроллер.

## Экспорт
`EstimateService` экспортируется из модуля.

---

## Формульный движок (formula-engine.ts)

`evalFormula(formula: string, vars: Record<string, number>): number`

- Реализация: **tokenize → Shunting-Yard (toRPN) → evalRPN**.
- Операторы: `+ - * /` (приоритет: `*/` = 2, `+-` = 1).
- Функции: `ceil, floor, round, abs` (арность 1), `min, max` (арность 2).
- Переменные: подставляются из `vars`; неизвестная/нечисловая → `0`.
- Деление на 0 → `0`. Нечисловой результат → `0`.
- Пустая формула → `0`.
- ⚠️ Недопустимый символ → `throw Error`.

> ⚠️ `min/max` имеют фиксированную арность 2 (нельзя `max(a,b,c)`).

---

## Доступные переменные в формулах

### Обычные зоны (vars для work + materialFormulas)
`area, length, width, height, perimeter, quantity`
- `area` = задано или `length*width`.
- `perimeter` = `2*(length+width)`.
- `quantity` = `wIn.quantity` или `area`.

### Зоны парной (vars для laborFormula и items.formula)
`length, width, height, area, perimeter, wallArea, ceilArea,`
`ceilingLen, ceilingWidth, floorArea, surfaceArea, S, volume`
- `perimeter` = сумма длин стен А/Б/В/Г, иначе `2*(L+W)`.
- `ceilArea` = `ceilW*ceilL` (или площадь зоны).
- `wallArea` = `perimeter*height`.
- `S` = `surfaceArea` = `wallArea + ceilArea` (**главная переменная**).
- `volume` = `area*height`.

---

## Схема Estimate (snapshot)

### Estimate (timestamps)
| Поле            | Тип                | Описание               |
|-----------------|--------------------|------------------------|
| `name`         | string (required)  | название сметы         |
| `projectId`    | ObjectId ref Project | проект               |
| `clientId`     | ObjectId ref Client  | клиент               |
| `zones`        | Zone[]             | обычные зоны           |
| `saunaZones`   | SaunaZone[]        | зоны парной (v2)       |
| `laborTotal`   | number             | итог по работам        |
| `materialsTotal`| number            | итог по материалам     |
| `grandTotal`   | number             | итог с наценками       |
| `status`       | string ('draft')   | статус                 |
| `createdBy`    | ObjectId ref User  | автор                  |

### Zone → ZoneWork → ComputedMaterial
- `ZoneWork`: `workTypeId`, `name`, `unit`, `quantity`, `laborCostPerUnit`,
  `laborTotal`, `markupPercent`, `materials[]`, `materialsTotal`, `total`.
- `ComputedMaterial`: `nomenclatureId`, `name`, `unit`, `quantity`, `pricePerUnit`, `total`.

### SaunaZone → SaunaStage / SaunaSection → SaunaMaterial
- `SaunaZone`: размеры, `walls[]` (SaunaWallDim), `ceiling {width,length}|null`,
  `stages[]`, `sections[]`, `laborTotal`, `materialsTotal`, `total`.
- `SaunaStage`: `stageId`, `name`, `laborTotal`, `materials[]`, `materialsTotal`, `total`.
- `SaunaSection`: `type` (`'stage'|'finish'|'wooden'|'opening'|'ventilation'|'lighting'|'equipment'`),
  `name`, `refId`, `laborTotal`, `materials[]`, `materialsTotal`, `total`.
- `SaunaMaterial`: `nomenclatureId`, `name`, `unit`, `needed`, `withWaste`, `toOrder`,
  `pricePerUnit`, `total`, `comment`.

> ⚠️ **ВАЖНО:** DTO принимает богатый ввод для парной (finish, woodenItems, openings,
> ventilationVariantId, lighting, equipment), но **сервис (computeSauna) считает
> ТОЛЬКО `stageIds`**. Секции `sections[]` в схеме есть, но НЕ заполняются.
> Блоки 2–7 парной пока НЕ реализованы в расчёте.

---

## DTO (CreateEstimateDto)
`name` (обяз.), `projectId?`, `clientId?`, `status?`, `zones?`, `saunaZones?`.

### ZoneInputDto → ZoneWorkInputDto
- Зона: `name`, `zoneType?`, `length?`, `width?`, `height?`, `area?`, `works?`.
- Работа: `workTypeId`, `quantity?`.

### SaunaZoneInputDto (v2, богатый ввод)
- Размеры: `name`, `length?`, `width?`, `height?`, `area?`.
- БЛОК 0: `walls[]` (WallDim: name, length), `ceiling` (CeilingDim: width, length).
- БЛОК 1: `stageIds[]` — **единственное, что реально считается**.
- БЛОК 2: `finish` (walls[], ceiling) — FinishSurface (пока не считается).
- БЛОК 3: `woodenItems[]` (пока не считается).
- БЛОК 4: `openings[]` (door/window + откосы + наличники, пока не считается).
- БЛОК 5: `ventilationVariantId?` (пока не считается).
- БЛОК 6: `lighting.segments[]` (пока не считается).
- БЛОК 7: `equipment[]` (пока не считается).

---

## Контроллер (/estimates)

| Метод | Роут               | Роли          | Действие                    |
|-------|--------------------|---------------|-----------------------------|
| GET   | `/estimates?projectId=` | ADMIN, MANAGER | список (фильтр по проекту) |
| GET   | `/estimates/:id`   | ADMIN, MANAGER| один                        |
| POST  | `/estimates/preview` | ADMIN, MANAGER | расчёт БЕЗ сохранения      |
| POST  | `/estimates`       | ADMIN, MANAGER| создать (compute + save)    |
| PUT   | `/estimates/:id`   | ADMIN, MANAGER| обновить (пересчёт)         |
| DELETE| `/estimates/:id`   | **ADMIN**     | удалить                     |

- `create` берёт userId из `req.user._id ?? req.user.id`.

---

## Логика расчёта (EstimateService)

### compute(dto)
1. Собирает `workTypeId` → грузит WorkType → собирает `nomenclatureId` из
   их `materialFormulas` → грузит Nomenclature (батчами, `$in`).
2. По каждой зоне:
   - `laborTotalWork` = `laborCostPerUnit * quantity`.
   - материалы: `qty = evalFormula(mf.formula, vars)`, `total = qty * price`.
   - `workTotal = (labor + materials) * (1 + markupPercent/100)`.
3. `zonesMarkup` = сумма наценочных «дельт» по зонам.
4. Прибавляет результат `computeSauna`.
5. `grandTotal = labor + materials + zonesMarkup`.

> ⚠️ В обычных зонах наценка `markupPercent` берётся из **WorkType**
> (НЕ из MarkupSettings). MarkupSettings используется только в парной.

### computeSauna(dto)
1. Грузит `MarkupSettings` (loadMarkups) → функции `materialMarkup(nom)`, `laborMarkup()`.
2. Собирает `stageIds` → грузит WorkStage → номенклатуру их `items`.
3. По каждой зоне и этапу:
   - `stageLabor = laborQty * laborPricePerUnit * (1 + laborMarkup%)`.
   - материал: `needed` (fixedQty или формула) → `computeMaterialQty` (запас+упаковка).
   - цена материала: `basePrice * (1 + materialMarkup%)` (наценка зашита в цену).
   - `total = toOrder * price`.

### loadMarkups()
Приоритет наценки материала:
1. Кастомная позиции (`nom.markup.useGroupMarkup === false` + `customMarkup`).
2. По категории (`byCategory[nom.category]`).
3. Глобальная.
Наценка работы — только глобальная (`global.laborMarkup`).

### computeMaterialQty(nom, needed)
- `withWaste = needed * (1 + wasteFactor/100)`.
- `toOrder` — округление вверх по `packageLogic.packageSize` (если enabled).

### round(n)
Округление до 2 знаков (`Math.round((n + EPSILON) * 100) / 100`).

---

## Точки внимания (TODO / риски)
- [ ] 🔴 **Блоки 2–7 парной (finish/wooden/openings/ventilation/lighting/equipment)
      не реализованы** в `computeSauna`. DTO и схема (`sections[]`) готовы, расчёта нет.
- [ ] 🟡 Двойная система наценок: WorkType.markupPercent (обычные зоны) vs
      MarkupSettings (парная). Возможна путаница.
- [ ] 🟡 `grandTotal` парной = labor+materials БЕЗ отдельной строки наценок
      (наценка уже «зашита» внутрь), а у обычных зон — плюс `zonesMarkup`.
      Разная механика суммирования.
- [ ] `create/update` не валидируют существование projectId/clientId.
- [ ] Нет связи с `ProjectsService.incrementProjectsCount` / актуализацией проекта.
- [ ] Невалидный ObjectId в id/projectId → CastError 500.
- [ ] `filter: any`, `nom: any`, `saunaZones: any[]` — потеря типизации.
- [ ] `evalFormula` кидает Error на недопустимый символ → может уронить весь расчёт
      (нет try/catch вокруг формул).
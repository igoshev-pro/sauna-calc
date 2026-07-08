# 🎨 FRONTEND — Типы данных (types.ts)

> ⚠️ Файл прислан **продублированным дважды** (полное повторение всех типов).
> Проверить, что физически файл не задвоен.

## Назначение
Единый файл типов фронта: модели сущностей (совпадают с бэком), input-типы для
отправки, ответы API. Основа типобезопасности для API-слоя, форм (RHF+zod), React Query.

---

## 🔴 ГЛАВНОЕ РАСХОЖДЕНИЕ ФРОНТ ↔ БЭК (парная)

Фронт описывает **богатую доменную модель парной**, которую бэк **НЕ считает и НЕ хранит**
в таком виде. Это ключевой разрыв контракта:

| Аспект           | Фронт (types.ts)                          | Бэк (Estimate schema/service)                |
|------------------|-------------------------------------------|----------------------------------------------|
| `SaunaZone`      | вложенная модель (dimensions/finish/...) | плоская: `walls[]`, `ceiling`, `stages[]`, `sections[]` |
| Размеры          | `dimensions.{walls,height,ceiling,stoveCorner}` | размеры на верхнем уровне зоны        |
| Финиш            | `finish: FinishSpec` (детально)           | `sections[]` type='finish' (НЕ заполняется)  |
| Столярка         | `woodenItems[]`                           | НЕ считается                                 |
| Проёмы           | `openings[]`                              | НЕ считается                                 |
| Вентиляция       | `ventilationVariantId`                    | НЕ считается                                 |
| Освещение        | `lighting: LightingSpec`                  | НЕ считается                                 |
| Этапы            | `finishStageIds[]`                        | бэк ждёт `stageIds[]` (⚠️ разное имя поля!)  |

> 🔴 **`finishStageIds` (фронт) vs `stageIds` (бэк DTO)** — расхождение имён.
> Реально считается только этот блок. Если фронт шлёт `finishStageIds`, а бэк
> читает `stageIds` — **этапы парной не посчитаются**. КРИТИЧНО проверить маппинг.

> 🔴 Бэк `VentilationVariant` имеет `laborCost`, фронт-тип — `laborPrice`.
> **Разные имена поля стоимости работ** → рассинхрон.

---

## Разделы типов

### Auth
- `UserRole` = `'admin' | 'manager'`.
- `User` (⚠️ `id`, НЕ `_id` — единственная сущность с `id`).
- `AuthTokens` = `{ accessToken, refreshToken, user }` — ответ login.

### Nomenclature
- `PackageLogic`, `NomenclatureMarkup`, `NomenclatureItem` (`_id`), `NomenclatureListResponse`, `NomenclatureQuery`.
- Полностью совпадает с бэк-схемой. ✅

### WorkType
- `MaterialFormula`, `WorkType`. Совпадает с бэком. ✅
- (нет отдельного `WorkTypeListResponse` — вероятно, возвращается массив).

### Markup
- `MarkupType` = `'global' | 'category' | 'worktype'` (⚠️ `worktype` не используется на бэке).
- `MarkupSettings`.

### Clients
- `ClientStatus`, `Client`, `ClientListResponse`, `ClientQuery`. ✅ совпадает.

### Projects
- `ProjectStatus` (8 статусов воронки), `Project` (+ `client?`, `manager?` populated).
- `ProjectListResponse`, `ProjectQuery`. ✅ совпадает.
- ⚠️ `estimatesCount` есть в типе, но на бэке никогда не инкрементится → всегда 0.

### Estimate (СТАРАЯ структура — «скрыта в UI, не удаляем»)
- `EstimateComputedMaterial`, `EstimateZoneWork`, `EstimateZone`.
- `Estimate` (расширен аддитивно: `kpData?`, `saunaZones?`).
- Input: `ZoneWorkInput`, `ZoneInput`, `EstimateInput`, `EstimatePreview`.

### КП (`KpData`)
- Форма коммерческого предложения (данные клиента/расчётчика/организации).
- ⚠️ На бэке `Estimate` схема — **нет поля `kpData`**. Фронт шлёт → whitelist ValidationPipe
  **отрежет** (или не сохранится). Проверить, есть ли kpData в бэк-DTO/схеме. 🔴

### Доменная модель парной (фронт-only, богатая)
- `StageItem`, `WorkStage` — совпадает с бэком. ✅
- `WallName` (`'А'|'Б'|'В'|'Г'`), `WallDim`, `StoveCorner`, `CeilingDim`.
- `WoodenItemType`, `WoodenItem` (полки/спинки/панно/трап).
- `Opening` (door/window + откосы/наличники).
- `VentilationVariant` (⚠️ `laborPrice` vs бэк `laborCost`; ⚠️ нет полей description/schemeType/sortOrder).
- `LightingBlock`, `LightingSpec` (stoveCorner/shelves).
- `FinishType`, `LiningParams`, `WallFinish`, `FinishSpec`.
- `SaunaZone` — вложенная (не совпадает с плоской бэк-схемой). 🔴

### Users (админка)
- `AppUser` (`_id`, `isActive`), `CreateUserInput`.
- ⚠️ Две модели пользователя: `User` (auth, `id`) и `AppUser` (админка, `_id`). Разные ключи id!

---

## 🟡 Соглашения по id (важно для API/React Query)
- Все сущности используют **`_id`** (Mongo), КРОМЕ `User` (auth) — там **`id`**.
- `AppUser` (админка) — снова `_id`.
> ⚠️ Несогласованность: `User.id` vs `AppUser._id`. Легко ошибиться при работе с текущим юзером.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Файл `types.ts` **продублирован** — проверить физически.
- [ ] 🔴 `SaunaZone` фронта ≠ бэк-схеме (вложенная vs плоская). Нужен маппер при отправке/чтении.
- [ ] 🔴 `finishStageIds` (фронт) vs `stageIds` (бэк DTO) — этапы могут не посчитаться.
- [ ] 🔴 `VentilationVariant.laborPrice` (фронт) vs `laborCost` (бэк) — рассинхрон поля.
- [ ] 🔴 `kpData` — есть на фронте, проверить наличие в бэк-DTO/схеме (иначе теряется при whitelist).
- [ ] 🔴 Блоки парной 2–7 (finish/wooden/openings/ventilation/lighting) — типы есть,
      бэк НЕ считает. UI может собирать данные «в никуда».
- [ ] 🟡 `User.id` vs `_id` во всех остальных — источник багов.
- [ ] 🟡 `MarkupType.worktype` — тип есть, бэк игнорирует.
- [ ] 🟡 `estimatesCount` всегда 0 (бэк не инкрементит).
- [ ] 🟡 `EstimatePreview` не содержит `saunaZones` в ответе (preview парной не вернётся?).
- [ ] Комментарий «СТАРАЯ структура, скрыта в UI» → идёт миграция v1→v2 сметы;
      важно понимать, что реально активно в интерфейсе.
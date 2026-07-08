# 🎨 FRONTEND — Компоненты (формы, layout, UI-kit)

> ⚠️ Весь блок прислан **продублированным дважды**. Проверить физически.

## Назначение
Формы сущностей (RHF+zod или useState), layout (Sidebar/Header) и переиспользуемый
UI-kit (Button/Input/Select/Modal/Badge/ConfirmDialog).

---

## 🔴 ГЛАВНОЕ: EstimateBuilder считает ТОЛЬКО СТАРУЮ модель (парной нет!)

`EstimateBuilder` — активный конструктор смет. Он работает **исключительно** со
**СТАРОЙ** плоской моделью:
- Собирает `zones[]` = `{ name, zoneType, length, width, height, works[] }`.
- `works[]` = `{ workTypeId, quantity? }`.
- Шлёт через `buildInput()` → `EstimateInput` **БЕЗ** `kpData` и `saunaZones`.

> 🔴 Это ЗАКРЫВАЕТ интригу из types.context:
> **Богатая доменная модель парной (SaunaZone/finish/wooden/openings/ventilation/lighting)
> НИГДЕ в UI не собирается.** Нет ни формы парной, ни отправки `saunaZones`/`kpData`.
> → Типы парной + бэк-поля sauna существуют «в вакууме»: фронт их не заполняет,
>   бэк их не считает. Вся ветка «Термос/парная» — задел, НЕ включённый в поток.

- ⚠️ `zoneType` — свободный текстовый инпут (placeholder «парная»), НЕ enum.
  → Бэк-калькулятор ждёт конкретные типы? Свериться (в бэке zoneType влиял на расчёт).
- ✅ Live-preview с debounce 500ms → POST `/estimates/preview` (совпадает с бэком).
- ⚠️ `useEffect(fetchWT, [])` без зависимости `fetchWT` (eslint-warn, ок функционально).
- `workTypes` грузятся без фильтра (`applicableTo/zoneType` не передаются).

---

## Формы

### ClientForm (RHF + zod) ✅
- Поля: fullName*, phone*, email(или ''), city, source(enum-список), status(enum), notes.
- Совпадает с `Client`/бэком. Reset по `initial`.

### NomenclatureForm (RHF + zod) ✅
- name*, article, category*(datalist из categories), subCategory, unit(select),
  pricePerUnit*, wasteFactor(0..100, деф.10), supplier, inStock.
- `z.coerce.number()` для чисел. `pricePerUnit` min 0.
- ⚠️ **НЕ редактирует** `packageLogic` и `markup` (есть в типе/схеме, но форма их не шлёт).
  → При создании эти поля уйдут в дефолты бэка.

### ProjectForm (RHF + zod) ✅
- name*, clientId*(поиск клиентов debounce 300ms через `clientsApi.getAll`),
  status(8 статусов), address, area, budget, description.
- ⚠️ Поиск клиента и `register('clientId')` — select перерисовывается при загрузке;
  выбранный клиент может пропасть из списка при новом поиске (нет «залипания» текущего).
- `defaultClientId` поддержан (создание проекта из карточки клиента).

### UserForm (useState, НЕ zod) 
- fullName, email(→lowercase), password(min 6), role(manager/admin).
- ✅ **Единственная форма, которая разбирает ошибку бэка** (`e.response.data.message`,
  массив/строка). Хороший паттерн — стоит распространить на остальные.

### WorkTypeForm (useState, НЕ zod)
- name, unit(select), laborCostPerUnit, markupPercent, materialFormulas[]
  (nomenclatureId + formula + description).
- Подсказка переменных формул: `area, length, width, height, perimeter, quantity`
  — ✅ совпадает с бэк-калькулятором (scope формул).
- ⚠️ **НЕ редактирует** `applicableTo` и `zoneTypes` (есть в типе/схеме).
  → Фильтрация видов работ по зоне не настраивается через UI.

---

## Layout

### Sidebar — RBAC-навигация ✅
- `navigation[]` с `roles[]`; фильтр по `user.role`.
- ADMIN-only пункты: Номенклатура, Виды работ, Пользователи, Настройки.
- ADMIN+MANAGER: Дашборд, Клиенты, Проекты, Расчёты.
- `logout` из authStore (⚠️ напоминание: не ревокает refresh на бэке).
- ⚠️ Нет пунктов для: **Наценки (markup), Этапы (work-stages), Вентиляция** —
  подтверждает, что эти справочники в UI не выведены (нет сторов + нет навигации).
  Возможно, спрятаны внутри «Настройки».

### Header ✅
- Показывает `user.fullName` + `role` (badge).

---

## UI-kit (переиспользуемый) ✅
- **Button** — variant(primary/secondary/danger/ghost)+size+loading(spinner). forwardRef.
- **Input** / **Select** — label+error, forwardRef, совместимы с RHF `register`.
- **Modal** — Escape-закрытие, блок скролла body, size sm/md/lg, клик по оверлею.
- **Badge** — 5 цветовых вариантов.
- **ConfirmDialog** — обёртка Modal для подтверждения удаления.
- Все на `cn()` + Tailwind. Аккуратный, консистентный kit.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Блок компонентов **продублирован** — проверить физически.
- [ ] 🔴 **Парная (v2) не реализована в UI**: EstimateBuilder шлёт только старую модель
      (нет `saunaZones`/`kpData`). Вся доменная модель парной — мёртвый задел.
- [ ] 🟡 `zoneType` — свободный текст, не enum → риск неверного расчёта на бэке.
- [ ] 🟡 NomenclatureForm не редактирует `packageLogic`/`markup`.
- [ ] 🟡 WorkTypeForm не редактирует `applicableTo`/`zoneTypes` (фильтр работ по зоне не задаётся).
- [ ] 🟡 markup/work-stages/ventilation — нет форм, нет навигации (не выведены в UI).
- [ ] 🟡 Разнобой стиля форм: RHF+zod (Client/Nomenclature/Project) vs useState (User/WorkType).
- [ ] 🟡 Только UserForm разбирает ошибки бэка; остальные молча глотают (см. сторы).
- [ ] 🟡 ProjectForm: выбранный клиент может исчезать из select при новом поиске.
- [ ] `workTypes` в EstimateBuilder грузятся без `applicableTo/zoneType`.
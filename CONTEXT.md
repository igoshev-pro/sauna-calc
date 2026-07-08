# Система расчёта КП для отделки бань

## Стек
| Слой | Технология |
|------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| База данных | MongoDB + Mongoose |
| Auth | JWT + Refresh Token |
| PDF | Puppeteer |
| Номенклатура | Excel импорт из 1С |

## Роли
| Роль | Возможности |
|------|------------|
| Admin | Всё + пользователи + наценки + справочники |
| Manager | Клиенты + Проекты + Расчёты + КП |

## Поля формы КП (ТЗ.xlsx)
- ФИО → ручной ввод
- Телефон → +7(999)999-99-99
- Почта → почта@домен
- Адрес объекта → ручной ввод
- Расчет выполнил → авто (кто залогинен)
- Наименование организации → ручной ввод
- Дата составления → авто + редактируемая
- Комментарий → ручной ввод

## Бизнес-логика

### Общее
- Отделка готовых помещений (не строительство)
- Конструктор по зонам
- Запас 10% на каждую позицию везде
- Логика упаковок: продаётся по 5м → нужно 3м → заказываем 5м

### Зоны
- steam_room → Парная
- hallway → Предбанник
- rest_room → Комната отдыха
- bathroom → Санузел
- terrace → Терраса

### Состав зоны
- Стены (до 4х, каждая отдельно)
- Потолок
- Пол
- Окна/Двери (проём + установка + откосы + наличники)
- Оборудование (печь, камни и тд + монтаж)
- Подсветка (периметр / точечная / лента)

### Типы отделки
- Вагонка обычная → предбанник, комната отдыха
- Вагонка термо → парная (+ термолента, вентзазор)
- Плитка → санузел, пол
- Доска → пол

## Расчёты

### Вагонка горизонталь
rows = ceil(высота / ширина_доски_мм)
утилизация обрезков:
  доска 6м + стена 3м = 1 доска → 2 отрезка
  доска 6м + стена 4м = 1 доска → 1 отрезок + 2м отход
toOrder = boardsNeeded × 1.10

### Вагонка вертикаль
cols = ceil(ширина_стены / ширина_доски_мм)
boardLength >= высота → 1 доска = 1 отрезок
toOrder = cols × 1.10

### Плитка
area = ширина × высота
count = ceil(area / tileArea) × 1.10
клей = area × 5кг/м² × 1.10
фуга = расчёт по периметру швов

### Упаковки
if packageLogic.enabled:
  packages = ceil(needed / packageSize)
  toOrder = packages × packageSize
else:
  toOrder = needed

### Наценка
1. % из MarkupSettings по категории
2. customMarkup у позиции → перекрывает групповую
3. gross = net × (1 + markup/100)
4. Наценка на работу — отдельный %

## Номенклатура
- Источник: 1С (мой склад)
- Позиций: ~1200
- Интеграция: Excel импорт на старте
- Обновление: ручной импорт из 1С

## PDF
- Логотип: да (PNG)
- Водяной знак: да
- summary → итог по зонам
- detailed → каждая позиция
- Клиент получает только PDF

## Схемы MongoDB

### User
{
  _id, fullName, email, passwordHash,
  role: 'manager'|'admin',
  isActive, createdAt
}

### Client
{
  _id, fullName, phone, email,
  objectAddress, organizationName,
  comment, managerId, createdAt, updatedAt
}

### Project
{
  _id, clientId, name,
  status: 'draft'|'calculated'|'sent'|'approved'|'rejected',
  zones: [ObjectId],
  createdBy, createdAt, updatedAt
}

### Zone
{
  _id, projectId,
  type: 'steam_room'|'hallway'|'rest_room'|'bathroom'|'terrace',
  name, sortOrder,
  dimensions: { width, length, height },
  walls: [Wall],
  ceiling: { finishType, liningParams? },
  floor: { finishType, tileParams?, boardParams? },
  openings: [Opening],
  equipment: [EquipmentItem],
  lighting: [LightingItem]
}

### Wall
{
  name, width, height,
  finishType: 'lining'|'thermo_lining'|'tile'|'none',
  liningParams?: LiningParams,
  tileParams?: TileParams
}

### LiningParams
{
  direction: 'horizontal'|'vertical',
  boardWidth: number,  // мм
  boardLength: number, // м
  nomenclatureId,
  hasVentGap: boolean,
  ventGapMaterialId?
}

### TileParams
{
  tileWidth, tileHeight, // мм
  nomenclatureId,
  groutNomenclatureId,
  adhesiveNomenclatureId,
  wasteFactor: 10
}

### Opening
{
  type: 'door'|'window',
  width, height, wallIndex,
  productNomenclatureId,
  installWorkTypeId,
  hasSlopes, slopeNomenclatureId?,
  hasFraming, framingNomenclatureId?
}

### EquipmentItem
{
  nomenclatureId, workTypeId,
  quantity, comment
}

### LightingItem
{
  type: 'perimeter'|'point'|'strip',
  nomenclatureId, quantity, workTypeId
}

### NomenclatureItem
{
  _id, name, article,
  category, subCategory,
  unit, // шт/м/м²/м³/кг/л
  pricePerUnit,
  packageLogic: {
    enabled, packageSize, packageUnit
  },
  wasteFactor: 10,
  supplier, inStock,
  markup: {
    useGroupMarkup: boolean,
    customMarkup?: number
  },
  createdAt, updatedAt
}

### WorkType
{
  _id, name, unit,
  laborCostPerUnit,
  materialFormulas: [{
    nomenclatureId,
    formula, // "area * 1.1"
    description
  }],
  applicableTo: [], // wall/ceiling/floor/opening/equipment/lighting
  zoneTypes: [],
  markupPercent
}

### MarkupSettings
{
  _id,
  type: 'global'|'category'|'worktype',
  categoryName?,
  materialMarkup,
  laborMarkup,
  isActive
}

### Estimate
{
  _id, projectId, clientId,
  kpData: {
    clientFullName, phone, email,
    objectAddress, organizationName,
    calculatedBy, calculatedById,
    date, comment
  },
  zones: [EstimateZone],
  totals: {
    materialsNet, materialsGross,
    laborNet, laborGross, total
  },
  status: 'draft'|'final',
  detailLevel: 'summary'|'detailed',
  createdBy, createdAt
}

### EstimateZone
{
  zoneName, zoneType,
  works: [EstimateWork],
  zoneTotals: { materials, labor, total }
}

### EstimateWork
{
  workTypeName, surface,
  quantity, unit, laborCost,
  materials: [{
    nomenclatureName, unit,
    needed,  // нужно 3м
    toOrder, // заказать 5м
    pricePerUnit, priceWithMarkup,
    totalNet, totalGross
  }],
  lineTotals: { materials, labor, total }
}

## Этапы
1. Фундамент — NestJS + MongoDB + Auth + Next.js 16
2. Справочники — Номенклатура + WorkTypes + Наценки
3. CRM — Клиенты + Проекты
4. Конструктор зон — UI пошаговый
5. Движок расчёта — вагонка + плитка + упаковки + наценки
6. PDF + КП — генерация + история

## Структура монорепо
sauna-calc/
├── apps/
│   ├── backend/   # NestJS
│   └── frontend/  # Next.js 16
├── package.json
└── docker-compose.yml



Разбор формул (то, что критично)

Сначала расшифрую ссылки на лист «Размеры помещения» (по прошлому скриншоту):

Ячейка	Что это
A3, B3, C3, D3	Стены А, Б, В, Г (длины в м)
G3	Высота стен (общая)
H3, I3	Потолок: ширина × длина
A16, B16, D16, F16, G16, H16	Полки / спинки (ширина/длина)
Теперь формулы вкладки «Термос»:

Этап 1 — Силовой каркас


Брус на стены (D3):   =((A+B+C+D)/0,5)+2
  → (сумма периметра стен / шаг_бруса 0,5м) + 2 запасных
Огнебиозащита (D4):   1 (фикс)
Брус на потолок (D5): =((H_потолок/0,5)*2)+2
Расходники (D6):      =(периметр × высота) + (потолок_площадь)  ← это ПЛОЩАДЬ стен+потолка (S)
Работа (D7):          =D6  → м² = площадь стен+потолка
Ключевой вывод: D6 = общая площадь стен + потолка (S). На неё завязано почти всё:

утеплитель = S / 4,8 (4,8 м² в упаковке)
работа каркаса = S × 1000₽
работа фольги = S × 1000₽
работа утеплителя = S × 1000₽
Этап 2 — Утеплитель


Утеплитель (D10): =D6/4,8   (S / 4,8м² в упаковке)
Расходники (D11): =D6
Работа (D12):     =D11 → площадь
Этап 3 — Фольга


Фольга (D15):  =S/35   (S / 35м² в рулоне)
Скобы (D16):   =D15*2
Скотч (D18):   =D15*2
Работа (D19):  =S
Этап 4 — Контр-рейка


Рейка стены (D23):   =((S)*5)/3)+4   ← 5 реек на м²? делить на 3м длину + 4 запас
Рейка потолок (D24): =(H_потолок/0,5)+2
Сверло (D25):        2 (фикс)
Саморез (D26):       0,5 (фикс, кг)
Работа (D27):        =D19 → площадь
ИТОГО


ИТОГО работа   = F27+F19+F12+F7   (сумма стоимостей работ 4 этапов)
ИТОГО материал = F26+F25+F24+F23+F18+...  (сумма материалов)
Вкладка «Инженерные сети»


Вентиляция вариант 1 (принудительная с вкл/выкл): 6 позиций + работа 20000
Вентиляция вариант 2 (подключение к системе):      3 позиции + работа 20000
Освещение печного угла: лента = (G3*2)/5, кабель, диммер, работа = D19*5
Освещение полков: лента верхние/нижние по формуле от размеров полков
Ключевые открытия для архитектуры

Формулы завязаны на переменные из размеров, а не константы. Значит нужен движок формул: каждая позиция WorkType хранит формулу-строку, а расчёт подставляет переменные (S, perimeter, wallHeight, ceilingArea, packageSize...).

Общая площадь S = периметр×высота + потолок — базовая переменная, от неё зависит 80% этапов.

Этапы термоса — это шаблон из WorkType'ов, каждый со своей формулой и своими материалами. Ты подтвердил: этапы должны быть редактируемыми/расширяемыми. → это WorkStage (этап) с массивом позиций.

Вентиляция = выбор варианта (radio), каждый вариант — набор позиций.

Освещение = 2 подсистемы (печной угол / полки), лента считается по погонажу от размеров.

Переработанный контекст (v2)

Заменяю разделы «Бизнес-логика», «Расчёты» и схемы MongoDB. Остальное (стек, роли, PDF, монорепо) — оставляю.

Бизнес-логика v2

Общее

Отделка готовых помещений (не строительство)
MVP: только зона «Парная» (термос). Архитектура — с заделом на другие зоны
Запас 10% + логика упаковок (packageSize)
Движок формул: позиции считаются по формулам-строкам с переменными
Структура расчёта парной


Парная
├── Размеры (стены А/Б/В/Г, высота, потолок, окна, дверь, панно, полки, спинки, трап)
├── Конструктив «Термос» (этапы, редактируемые)
│   ├── Этап 1: Силовой каркас (брус + огнебиозащита + расходники + работа)
│   ├── Этап 2: Утеплитель (Роквул + расходники + работа)
│   ├── Этап 3: Фольга (Изоспан + скобы + скотч + работа)
│   ├── Этап 4: Контр-рейка (рейка + сверло + саморез + работа)
│   └── + возможность добавить свои этапы
├── Финишная отделка (вагонка/термо-вагонка — по стенам/потолку)
├── Столярные изделия (полки, спинки, панно, трап)
├── Проёмы (окна/дверь: проём + установка + откосы по глубине)
├── Инженерия
│   ├── Вентиляция (выбор варианта: принудительная / к системе заказчика)
│   └── Освещение (печной угол + полки)
└── Оборудование (печь, камни — опционально)
Базовые переменные расчёта (вычисляются из размеров)


perimeter    = A + B + C + D              // периметр стен, м
wallArea     = perimeter × height          // площадь стен, м²
ceilingArea  = ceilW × ceilL               // площадь потолка, м²
S            = wallArea + ceilingArea       // общая площадь (главная переменная)
ceilingLen   = ceilL                       // для расчёта бруса потолка
Движок формул


Каждая StageItem/WorkItem хранит:
  formula: string   // "S / 4.8", "(perimeter / 0.5) + 2", "S * 5 / 3 + 4"
  
При расчёте:
  1. Собираем контекст переменных { S, perimeter, wallArea, ceilingArea, ceilingLen, height, packageSize... }
  2. needed = eval(formula, context)
  3. если packageLogic → toOrder = ceil(needed / pkg) × pkg, иначе toOrder = ceil(needed) или needed×1.1
  4. total = toOrder × pricePerUnit
  5. применяем наценку
Схемы MongoDB v2

Zone (парная)


{
  _id, projectId,
  type: 'steam_room',
  name, sortOrder,
  dimensions: {
    walls: [{ name: 'А'|'Б'|'В'|'Г', length }],  // длины стен, м
    height,
    ceiling: { width, length },
    stoveCorner: { size1, size2, height },        // печной угол
  },
  finishStages: [ObjectId],   // → WorkStage (термос-этапы)
  finish: FinishSpec,          // финишная отделка стен/потолка
  woodenItems: [WoodenItem],   // полки, спинки, панно, трап
  openings: [Opening],
  ventilation: VentilationSpec,
  lighting: LightingSpec,
  equipment: [EquipmentItem],
}
WorkStage (этап конструктива — редактируемый шаблон)


{
  _id,
  name,               // "Монтаж силового каркаса..."
  sortOrder,
  isTemplate: bool,   // шаблонный (для новых проектов) / проектный
  items: [StageItem],
  laborFormula,       // формула кол-ва работы: "S"
  laborPricePerUnit,  // 1000 ₽/м²
  laborUnit,          // "м²"
}
StageItem (позиция внутри этапа)


{
  nomenclatureId,        // Брус 50×40×3000 / Роквул / Изоспан...
  formula: string,       // "(perimeter / 0.5) + 2"
  isFixed: bool,         // фикс. кол-во (огнебиозащита = 1)
  fixedQty?: number,
  unit,
  comment,
}
FinishSpec (финишная отделка)


{
  walls: [{ wallName, finishType: 'lining'|'thermo_lining'|'none', liningParams }],
  ceiling: { finishType, liningParams },
}
// LiningParams — как в v1 (direction, boardWidth, boardLength, nomenclatureId, ventGap...)
WoodenItem (столярка)


{
  type: 'polok'|'spinka'|'panno'|'trap',
  name,               // "Полок 1"
  width, length,      // м
  nomenclatureId,
  workTypeId,
  quantity,
}
Opening (проём) — уточнён


{
  type: 'door'|'window',
  name,               // "Окно 1"
  width, height,
  depth,              // глубина = для расчёта откосов
  wallName,           // на какой стене (А/Б/В/Г)
  productNomenclatureId,
  installWorkTypeId,
  hasSlopes, slopeNomenclatureId?,   // откосы = периметр × глубина
  hasFraming, framingNomenclatureId?,
}
VentilationSpec


{
  variantId,          // выбранный вариант
}

// отдельная сущность:
VentilationVariant {
  _id, name,          // "Принудительная с вкл/выкл" / "К системе заказчика"
  items: [{ nomenclatureId, formula|fixedQty, unit }],
  laborPrice,         // 20000 комплект
  isActive,
}
LightingSpec


{
  stoveCorner: {
    enabled,
    items: [{ nomenclatureId, formula, unit }],  // лента = (height*2)/5, кабель, диммер...
    laborFormula, laborPrice,
  },
  shelves: {
    enabled,
    items: [...],  // лента верхние/нижние полки по размерам
    laborFormula, laborPrice,
  }
}
NomenclatureItem — без изменений (v1 подходит)

Наполнить реальными позициями из Excel:
Брус 50×40×3000 (450), NEOMID 450-1 (2385), Роквул сауна батс 50×600×1000 (3100), Изоспан FB 35м² (3800), Рейка 20×90×3000 (350), Термолента 5м (12450), Кубасту (13800), Вентилятор m-motors (12500) и т.д.

Estimate / EstimateZone / EstimateWork

Структура v1 подходит, но EstimateZone.works теперь группируется по этапам:


EstimateZone {
  zoneName, zoneType,
  stages: [{                    // этапы термоса + отделка + инженерия
    stageName,
    works: [EstimateWork],
    stageTotals: { materials, labor, total }
  }],
  zoneTotals: { materialsNet, materialsGross, laborNet, laborGross, total }
}
План работ

Этап 0 — Актуализация контекста и типов ⚠️ первым

 Утвердить контекст v2 (этот документ)
 Обновить types/index.ts под новые сущности (WorkStage, StageItem, WoodenItem, VentilationVariant, LightingSpec, обновлённый Zone, Opening)
 Обновить Estimate.kpData во фронт-типах (сейчас отстают от бэка)
Этап 1 — Фундамент (частично есть)

 NestJS + Mongoose + JWT + refresh
 Next.js 16 каркас, auth-flow, layout, Header/Input/Select (есть)
Этап 2 — Справочники

 Nomenclature CRUD + Excel-импорт из 1С (~1200 позиций)
 Наполнить позициями из Excel (термос/вентиляция/освещение)
 WorkStage CRUD с формулами (шаблоны этапов термоса)
 VentilationVariant CRUD (2 варианта из файла + возможность добавлять)
 MarkupSettings (глобальная/категория/работа)
Этап 3 — CRM (есть базово)

 Клиенты CRUD (есть)
 Проекты CRUD + статусы (есть)
 Привязка менеджера
Этап 4 — Конструктор парной (пошаговый UI)

 Шаг 1: Размеры (стены А/Б/В/Г + высота + потолок + печной угол + чертёж-схема)
 Шаг 2: Термос (выбор/редактирование этапов, материалы каждого этапа)
 Шаг 3: Финишная отделка (вагонка по стенам/потолку)
 Шаг 4: Столярка (полки/спинки/панно/трап — динамический список)
 Шаг 5: Проёмы (окна/дверь + глубина/откосы)
 Шаг 6: Инженерия (выбор варианта вентиляции + освещение угол/полки)
 Шаг 7: Оборудование (опц.)
Этап 5 — Движок расчёта (ядро) 🔥

 Парсер/эвалюатор формул (безопасный, без eval — через math-expression парсер)
 Вычисление базовых переменных (S, perimeter, wallArea, ceilingArea)
 Расчёт этапов термоса (4 этапа по формулам из файла)
 Расчёт финишной отделки (вагонка гориз/верт — есть логика в v1)
 Расчёт столярки
 Расчёт проёмов (откосы по глубине)
 Расчёт вентиляции (по варианту)
 Расчёт освещения
 Упаковки + запас 10% + наценки
 Сборка Estimate с разбивкой ИТОГО работа / ИТОГО материал
Этап 6 — PDF + КП

 Форма КП (8 полей из вкладки «Клиент»)
 Puppeteer: логотип, водяной знак
 summary / detailed
 Разбивка «ИТОГО работа» / «ИТОГО материал» (как в Excel)
 История КП
Что мне нужно подтвердить перед стартом кодинга (3 пункта)

Формула контр-рейки ((S)*5)/3)+4 — я прочитал как «5 реек на м² / длина рейки 3м + 4 запас». Но 5 может быть шагом. Уточни: это S × 5 / 3 + 4 где 5 = кол-во реек на м²? Или другое?

Расходники каркаса D6 = периметр×высота + потолок — это точно площадь S (просто переиспользована как «комплект расходников = 1 на каждый м²»)? Цена 200 → значит расходники считаются 200₽ × S. Подтверди.

Библиотека для формул: предлагаю expr-eval или mathjs на бэке (безопасный парсинг, без произвольного JS). Ок?

После твоих ответов на эти 3 пункта — начинаю с Этапа 0 (обновлю types/index.ts, покажу тебе на согласование, потом двигаемся дальше). Файлы буду запрашивать перед каждым изменением.
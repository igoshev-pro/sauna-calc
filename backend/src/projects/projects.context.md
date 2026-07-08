# Модуль: Projects (Проекты)

## Назначение
CRUD-управление проектами. Проект привязан к клиенту и менеджеру,
имеет статус (воронка), бюджет, площадь. Ведёт счётчик смет.
Синхронизирует счётчик проектов у клиента.

## Зависимости
- `MongooseModule` — коллекция `Project`.
- `ClientsModule` → `ClientsService.incrementProjectsCount` (инжектится в сервис).
- Auth guards/decorators + `UserRole`.

## Экспорт
`ProjectsService` экспортируется (используется, напр., в Estimate — по projectId).

---

## Схема (schemas/project.schema.ts)
Коллекция `Project` (timestamps: true):
| Поле            | Тип           | Default          | Описание              |
|-----------------|---------------|------------------|-----------------------|
| `name`         | string (req)  | —                | название проекта      |
| `clientId`     | ObjectId ref Client (req) | —    | клиент                |
| `status`       | ProjectStatus | `NEW`            | этап воронки          |
| `address`      | string        | `''`             | адрес объекта         |
| `area`         | number        | `0`              | площадь               |
| `budget`       | number        | `0`              | бюджет                |
| `description`  | string        | `''`             | описание              |
| `managerId`    | ObjectId ref User | —            | менеджер (автор)      |
| `estimatesCount`| number       | `0`              | кол-во смет           |

### enum ProjectStatus (воронка)
`new → measuring → estimate → negotiation → production → installation → done`
+ `cancelled`.

### Индексы
- Text: `name`, `address`.
- `clientId: 1`, `status: 1`, `managerId: 1`.

---

## DTO

### CreateProjectDto
- `name` — string (обяз.).
- `clientId` — **@IsMongoId** (обяз.).
- `status?` — enum ProjectStatus.
- `address?` — string.
- `area?`, `budget?` — number (`@Type(() => Number)`).
- `description?` — string.

### UpdateProjectDto
`PartialType(CreateProjectDto)`.

### QueryProjectDto
- `search?`, `status?` — string.
- `clientId?` — @IsMongoId.
- `page?`, `limit?` — @IsNumberString.

---

## Контроллер (/projects)
`@UseGuards(JwtAuthGuard, RolesGuard)`

| Метод | Роут           | Роли           | Действие              |
|-------|----------------|----------------|-----------------------|
| GET   | `/projects`    | ADMIN, MANAGER | список + пагинация    |
| GET   | `/projects/:id`| ADMIN, MANAGER | один (populate client)|
| POST  | `/projects`    | ADMIN, MANAGER | создать               |
| PUT   | `/projects/:id`| ADMIN, MANAGER | обновить              |
| DELETE| `/projects/:id`| ADMIN, MANAGER | удалить               |

- `create` берёт managerId из `req.user._id ?? req.user.id`.

---

## Сервис (projects.service.ts)

### findAll(query)
- Фильтры: `$text` (search), `status`, `clientId`.
- Пагинация (page деф.1, limit деф.20), сортировка `createdAt: -1`.
- `populate('clientId', 'fullName phone email')`.
- **Маппинг для фронта**: `client` = populated объект, `clientId` = чистый id.
- Возвращает `{ items, total, page, pages }`.

### findOne(id)
`findById().populate(clientId).lean()` → 404.

### create(dto, managerId)
1. `create({ ...dto, managerId })`.
2. `clientsService.incrementProjectsCount(dto.clientId, +1)`.

### update(id, dto)
`findByIdAndUpdate({ new: true })` → 404.
> ⚠️ Если меняется `clientId` — счётчики проектов у старого/нового клиента
> НЕ пересчитываются (рассинхрон).

### remove(id)
1. `findByIdAndDelete` → 404.
2. `incrementProjectsCount(clientId, -1)`.
> ⚠️ Не каскадирует удаление связанных **смет** (Estimate.projectId остаётся битым).
> `estimatesCount` нигде не инкрементится (Estimate не трогает Project).

---

## Связи с другими модулями
- **Clients** → `incrementProjectsCount` (+1 при создании, -1 при удалении).
- **Estimate** → ссылается на `projectId` (но Estimate НЕ обновляет `estimatesCount`).
- **Users** → `managerId`, роли.

---

## Точки внимания (TODO / риски)
- [ ] 🔴 Модуль в сообщении **продублирован дважды** — проверить реальные файлы.
- [ ] 🟡 `estimatesCount` объявлен, но **никогда не инкрементится**
      (EstimateService не связан с ProjectsService). Поле всегда 0.
- [ ] 🟡 Смена `clientId` в `update` не пересчитывает счётчики у клиентов.
- [ ] 🟡 `remove` не каскадирует удаление смет проекта → битые `Estimate.projectId`.
- [ ] `create`/`remove`: если `incrementProjectsCount` упадёт — счётчик рассинхронится
      (нет транзакции).
- [ ] Невалидный ObjectId в `:id` → CastError 500 (в `create` `clientId` защищён @IsMongoId).
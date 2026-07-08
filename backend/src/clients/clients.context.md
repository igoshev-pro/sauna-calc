# Модуль: Clients (Клиенты)

## Назначение
CRUD-управление клиентами CRM: создание, поиск с пагинацией и фильтрами,
просмотр, обновление, удаление. Ведёт счётчик проектов клиента.

## Зависимости
- `MongooseModule` — коллекция `Client`.
- `AuthModule` (через guards/decorators):
  - `JwtAuthGuard` — защита всех роутов.
  - `RolesGuard` — проверка ролей.
  - `@Roles()` — ограничение доступа.
- `UsersModule` → `UserRole` enum (для ролей).

## Экспорт
`ClientsService` экспортируется → используется в `ProjectsService`
(метод `incrementProjectsCount`).

---

## Схема (schemas/client.schema.ts)
Коллекция `Client` (timestamps: true):
| Поле            | Тип          | Default          | Описание              |
|-----------------|--------------|------------------|-----------------------|
| `fullName`     | string       | — (required)     | ФИО клиента           |
| `phone`        | string       | `''`             | Телефон               |
| `email`        | string       | `''`             | Email                 |
| `city`         | string       | `''`             | Город                 |
| `source`       | string       | `''`             | Источник привлечения  |
| `status`       | ClientStatus | `ACTIVE`         | Статус клиента        |
| `notes`        | string       | `''`             | Заметки               |
| `projectsCount`| number       | `0`              | Кол-во проектов       |

### enum ClientStatus
- `ACTIVE = 'active'`
- `INACTIVE = 'inactive'`
- `VIP = 'vip'`

### Индексы
- Text-индекс: `fullName`, `phone`, `email` (для `$text` поиска).
- `status: 1`.

---

## DTO

### CreateClientDto
- `fullName` — string (обязательно).
- `phone?`, `email?`, `city?`, `source?`, `notes?` — string, опционально.
- `status?` — enum `ClientStatus`, опционально.

> ⚠️ `email` валидируется как `@IsString`, а не `@IsEmail`.

### UpdateClientDto
`PartialType(CreateClientDto)` — все поля опциональны.

### QueryClientDto
- `search?` — string (текстовый поиск).
- `status?` — string (фильтр по статусу).
- `page?` — number (`@IsNumberString`, по факту строка → приводится `Number()`).
- `limit?` — number (аналогично).

---

## Контроллер (clients.controller.ts)
Базовый путь: `/clients`
Глобально: `@UseGuards(JwtAuthGuard, RolesGuard)`
Доступ ко всем роутам: `@Roles(ADMIN, MANAGER)`

| Метод | Роут            | Body / Query        | Действие              |
|-------|-----------------|---------------------|-----------------------|
| GET   | `/clients`      | `QueryClientDto`    | список + пагинация    |
| GET   | `/clients/:id`  | —                   | один клиент           |
| POST  | `/clients`      | `CreateClientDto`   | создать               |
| PUT   | `/clients/:id`  | `UpdateClientDto`   | обновить              |
| DELETE| `/clients/:id`  | —                   | удалить               |

---

## Сервис (clients.service.ts)

### findAll(query)
- Фильтр по `$text` (если `search`) и `status`.
- Пагинация: `page` (деф. 1), `limit` (деф. 20).
- Сортировка: `createdAt: -1`.
- Возвращает: `{ items, total, page, pages }`.

### findOne(id)
`findById().lean()` → `NotFoundException('Клиент не найден')` если нет.

### create(dto)
`clientModel.create(dto)`. ⚠️ Возвращает Document (не `.lean()`).

### update(id, dto)
`findByIdAndUpdate(id, dto, { new: true }).lean()` → 404 если нет.

### remove(id)
`findByIdAndDelete` → `{ success: true }` / 404.

### incrementProjectsCount(clientId, delta: 1 | -1)
`$inc` поля `projectsCount`. Вызывается из `ProjectsService`
при создании/удалении проекта.

---

## Связи с другими модулями
- **Projects** → вызывает `incrementProjectsCount` (создание/удаление проекта).
- **Auth/Users** → роли доступа.

## Точки внимания (TODO / риски)
- [ ] `email` не валидируется как email (`@IsString` вместо `@IsEmail`).
- [ ] `incrementProjectsCount` не защищён: удаление клиента с проектами
      не каскадируется (проекты могут остаться с битым `clientId`).
- [ ] Нет валидации `id` как MongoId (`findById` с невалидным id → CastError 500).
- [ ] `filter: any` — теряется типизация.
- [ ] `viewer`-роль (если есть) не имеет доступа даже на чтение.
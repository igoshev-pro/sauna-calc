# Модуль: Users (Пользователи)

## Назначение
Управление пользователями системы: создание, список, деактивация.
Хранит хэш пароля (bcrypt), роль. Источник `UserRole` для всей системы (guards/@Roles).

## Зависимости
- `MongooseModule` — коллекция `User`.
- `bcryptjs` — хэширование паролей.
- Auth guards/decorators (`JwtAuthGuard`, `RolesGuard`, `@Roles`).

## Экспорт
`UsersService` экспортируется → используется в **AuthModule**
(`findByEmail` для логина, `findById` для валидации JWT).

---

## Схема (schemas/user.schema.ts)
Коллекция `User` (timestamps: true):
| Поле           | Тип      | Default        | Описание                |
|----------------|----------|----------------|-------------------------|
| `fullName`    | string (req) | —          | ФИО                     |
| `email`       | string (req, unique, lowercase) | — | email (логин) |
| `passwordHash`| string (req) | —          | bcrypt-хэш              |
| `role`        | UserRole | `MANAGER`      | роль                    |
| `isActive`    | boolean  | `true`         | активен ли              |

### enum UserRole
- `ADMIN = 'admin'`
- `MANAGER = 'manager'`

> Роли используются во ВСЕХ модулях через `@Roles(...)` + `RolesGuard`.
> Типовое разделение: ADMIN — CRUD справочников/удаление; MANAGER — работа с проектами/сметами.

---

## DTO (CreateUserDto)
- `fullName` — string (не пустой).
- `email` — @IsEmail.
- `password` — string, min 6.
- `role` — @IsEnum(UserRole).

> Обновление пользователя (кроме deactivate) отсутствует —
> нет UpdateUserDto, нет смены пароля/роли через API.

---

## Контроллер (/users)
`@UseGuards(JwtAuthGuard, RolesGuard)` — **все роуты только ADMIN**.

| Метод | Роут                     | Роли  | Действие              |
|-------|--------------------------|-------|-----------------------|
| POST  | `/users`                 | ADMIN | создать               |
| GET   | `/users`                 | ADMIN | список (без passwordHash)|
| GET   | `/users/:id`             | ADMIN | один (без passwordHash)|
| PATCH | `/users/:id/deactivate`  | ADMIN | деактивировать        |

---

## Сервис (users.service.ts)

### create(dto)
1. Проверка уникальности email → `ConflictException`.
2. `bcrypt.hash(password, 10)` → `passwordHash`.
3. Сохранение.
> ⚠️ Возвращает документ **с** `passwordHash` (в отличие от findAll/findById).

### findAll() / findById(id)
`.select('-passwordHash')`. `findById` → 404 если нет.

### findByEmail(email)
Возвращает документ **с** `passwordHash` (для проверки пароля в Auth). Может вернуть `null`.

### deactivate(id)
`isActive = false` (soft-delete). `.select('-passwordHash')` → 404.
> Нет hard-delete пользователя.

---

## Связи с другими модулями
- **Auth** → `findByEmail` (login), `findById` (JWT validate), `UserRole`.
- **Projects** → `managerId` ref User.
- **Estimate** → `createdBy` ref User.
- Все контроллеры → `UserRole` + guards.

---

## Точки внимания (TODO / риски)
- [ ] 🟡 `create` возвращает объект с `passwordHash` (утечка хэша в ответе POST /users).
- [ ] 🟡 Нет проверки `isActive` при аутентификации на уровне Users
      (нужно смотреть в Auth — деактивированный юзер может ещё иметь валидный JWT).
- [ ] Нет обновления пользователя (смена роли/пароля/имени) через API.
- [ ] Нет реактивации (`isActive = true`).
- [ ] Невалидный ObjectId в `:id` → CastError 500.
- [ ] Нет пагинации в `findAll` (для малого числа юзеров ОК).
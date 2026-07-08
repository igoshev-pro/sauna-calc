# Модуль: Auth (Аутентификация и авторизация)

## Назначение
Отвечает за вход в систему, выдачу и обновление JWT-токенов, выход,
защиту роутов (JWT-guard) и проверку ролей (RBAC).

## Зависимости
- `UsersModule` — получение пользователей (`findByEmail`, `findById`).
- `JwtModule` (@nestjs/jwt) — подпись/верификация токенов.
- `PassportModule` + `passport-jwt` — стратегия JWT.
- `MongooseModule` — хранение refresh-токенов.
- `bcryptjs` — сверка паролей.
- `ConfigService` — секреты и сроки жизни токенов из ENV.

## Переменные окружения (ENV)
| Переменная                | Назначение                        |
|---------------------------|-----------------------------------|
| `JWT_SECRET`              | Секрет для access-токена          |
| `JWT_EXPIRES_IN`         | Срок жизни access-токена          |
| `JWT_REFRESH_SECRET`     | Секрет для refresh-токена         |
| `JWT_REFRESH_EXPIRES_IN` | Срок жизни refresh-токена (JWT)   |

> ⚠️ Есть fallback `'fallback-secret'` в `JwtStrategy`, если `JWT_SECRET` не задан.

---

## Структура файлов

### decorators/current-user.decorator.ts
`@CurrentUser()` — извлекает `request.user` (объект пользователя из JwtStrategy)
в параметр метода контроллера.

### decorators/roles.decorator.ts
`@Roles(...roles)` — навешивает метаданные `ROLES_KEY = 'roles'`.
Принимает enum `UserRole`. Используется совместно с `RolesGuard`.

### dto/login.dto.ts
`LoginDto`:
- `email` — валидный email.
- `password` — строка, минимум 6 символов.

### guards/jwt-auth.guard.ts
`JwtAuthGuard extends AuthGuard('jwt')` — защита роутов по access-токену.

### guards/roles.guard.ts
`RolesGuard` — читает метаданные `ROLES_KEY`.
- Если ролей нет → доступ разрешён (`true`).
- Иначе проверяет `required.includes(user.role)`.
- ⚠️ Требует, чтобы перед ним отработал `JwtAuthGuard` (нужен `user` в request).

### schemas/refresh-token.schema.ts
Коллекция `RefreshToken` (timestamps: true):
| Поле        | Тип        | Описание                       |
|-------------|------------|--------------------------------|
| `userId`   | ObjectId ref User | владелец токена       |
| `token`    | string     | сам refresh-токен (JWT)        |
| `expiresAt`| Date       | дата истечения                 |
| `revoked`  | boolean    | отозван ли (по умолчанию false)|

### strategies/jwt.strategy.ts
`JwtStrategy`:
- Извлекает токен из заголовка `Authorization: Bearer`.
- `validate(payload)` → ищет пользователя по `payload.sub`.
- Кидает `UnauthorizedException`, если юзер не найден или `isActive === false`.
- Возвращает `user` → попадает в `request.user`.

---

## Контроллер (auth.controller.ts)
Базовый путь: `/auth`

| Метод | Роут            | Body                    | Возвращает                     |
|-------|-----------------|-------------------------|--------------------------------|
| POST  | `/auth/login`   | `LoginDto`              | accessToken, refreshToken, user|
| POST  | `/auth/refresh` | `{ refreshToken }`      | `{ accessToken }`              |
| POST  | `/auth/logout`  | `{ refreshToken }`      | `{ message }`                  |

Все — `@HttpCode(200)`.

---

## Сервис (auth.service.ts)

### login(dto)
1. Ищет пользователя по email (`findByEmail`).
2. Проверяет `isActive` и пароль через `bcrypt.compare`.
3. Формирует payload: `{ sub, email, role }`.
4. Подписывает `accessToken` (JWT_SECRET) и `refreshToken` (JWT_REFRESH_SECRET).
5. Сохраняет refresh-токен в БД с `expiresAt` = +7 дней.
6. Возвращает токены + краткие данные пользователя.

> ⚠️ Замечание: срок в БД жёстко +7 дней, а в JWT — из `JWT_REFRESH_EXPIRES_IN`.
> Возможно рассинхрон, если ENV != 7d.

### refresh(token)
1. Верифицирует refresh-токен (JWT_REFRESH_SECRET).
2. Проверяет наличие в БД + `revoked: false` + не истёк по `expiresAt`.
3. Находит пользователя, генерирует новый accessToken.
4. Ошибка → `UnauthorizedException('Refresh token недействителен')`.

> ⚠️ Refresh НЕ ротируется (старый refresh остаётся валидным).

### logout(token)
Помечает refresh-токен `revoked: true` в БД.

---

## Ошибки / статусы
- `401 UnauthorizedException` — неверные креды, неактивный юзер,
  невалидный/истёкший refresh.

## Точки внимания (TODO / риски)
- [ ] Fallback-секрет `'fallback-secret'` — небезопасно для прода.
- [ ] Нет ротации refresh-токена при `refresh`.
- [ ] `expiresAt` в БД захардкожен (+7d), не связан с ENV.
- [ ] Нет TTL-индекса на `expiresAt` (старые токены копятся в БД).
- [ ] `RolesGuard` бесполезен без `JwtAuthGuard` перед ним.
# kt03 — REST API блог-платформы (Express + Prisma + SQLite)

## Запуск
```bash
npm install
npx prisma migrate dev     # создаст prisma/dev.db и применит миграцию
npm start                  # http://localhost:3000
```
Файл `.env` уже есть (`.env.example` — шаблон).

## Маршруты
| Метод | URL | Описание |
|---|---|---|
| GET | /api/users | Список с пагинацией (`page`, `limit`) |
| GET | /api/users/:id | Пользователь с постами (новые сверху) |
| POST | /api/users | Создать пользователя |
| PATCH | /api/users/:id | Обновить пользователя |
| DELETE | /api/users/:id | Удалить пользователя (вместе с его постами) |
| GET | /api/posts | Список: `search`, `published`, `authorId`, `page`, `limit` |
| GET | /api/posts/:id | Пост с автором и тегами |
| POST | /api/posts | Создать пост (теги через `connectOrCreate`) |
| PATCH | /api/posts/:id | Обновить пост (`tags` заменяют весь набор тегов) |
| DELETE | /api/posts/:id | Удалить пост |

Ответ списков: `{ "data": [...], "meta": { "total", "page", "limit", "pages" } }`.

## Примеры
```bash
curl -X POST localhost:3000/api/users -H "Content-Type: application/json" \
  -d '{"email":"anna@example.com","name":"Anna"}'

curl -X POST localhost:3000/api/posts -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"Text","published":true,"authorId":1,"tags":["js","node"]}'

curl "localhost:3000/api/posts?search=hello&published=true&authorId=1&page=1&limit=10"
```

## Коды ответов
200 — успех, 201 — создано, 204 — удалено, 400 — ошибка валидации (массив `details`),
404 — не найдено, 409 — email уже занят.

## PostgreSQL вместо SQLite
1. В `prisma/schema.prisma` заменить `provider = "sqlite"` на `provider = "postgresql"`.
2. В `.env`: `DATABASE_URL="postgresql://user:password@localhost:5432/blog"`.
3. Удалить папку `prisma/migrations` и выполнить `npx prisma migrate dev --name init`.

Поиск по заголовку на PostgreSQL использует `mode: 'insensitive'`. В SQLite поиск не учитывает регистр только для латиницы.

# Бэкенд комментариев

Комментарии под проектами хранит маленький API. GitHub Pages статический,
поэтому нужен отдельный хостинг — здесь вариант на **Cloudflare Workers + D1**:
бесплатно, без сервера, который надо держать живым, своя база рядом.

Фронтенд уже всё умеет: `assets/comments.js` работает и с этим бэкендом,
и без него (кладёт комментарии в localStorage браузера). Адрес бэкенда
вписывается в одну строку в начале файла.

## 1. Создать базу

Нужен аккаунт Cloudflare (бесплатный) и Node 18+.

```sh
cd backend
npm i -g wrangler
wrangler login

wrangler d1 create comments-db
# выведет database_id — впиши его в wrangler.toml
```

Применить схему:

```sh
wrangler d1 execute comments-db --file=./schema.sql
```

## 2. Задеплоить

```sh
wrangler secret put ADMIN_TOKEN     # токен для удаления комментариев
wrangler deploy
```

Проверка:

```sh
curl https://enotcoder-comments.<твой-поддомен>.workers.dev/health
```

## 3. Вписать адрес на сайт

`assets/comments.js`, самое начало:

```js
const CONFIG = {
  api: 'https://enotcoder-comments.<твой-поддомен>.workers.dev',
  ...
```

Пока `api` пустая, комментарии работают в режиме localStorage: интерфейс
полный, но записи не уходят никуда. В этом режиме у кнопки «Комментарии»
показывается плашка `local`, а если API был настроен, но не отвечает, вместо
плашки — жёлтая подсказка.

## Контракт API

| Запрос | Ответ |
|---|---|
| `GET /comments?project=<ключ>` | `{"items":[{"id","project","name","text","at"}]}` |
| `POST /comments` `{project,name,text}` | `201 {"item":{...}}` |
| `DELETE /comments?id=<id>` | `204`, требует `Authorization: Bearer <ADMIN_TOKEN>` |
| `GET /health` | `{"ok":true}` |

Ошибки — `{"error":"текст"}` с кодом 400/401/404/429/500.

`project` — ключ репозитория в нижнем регистре (`cys`, `pixesh`, `gomit`…),
то есть то, что лежит в `data-project` у карточки.

Если захочешь другой хостинг (Supabase, Firebase, VPS, Deno Deploy) —
достаточно реализовать эти же четыре метода и вписать адрес в `CONFIG.api`.
Клиенту всё равно, что на той стороне.

## Защита от мусора

- **honeypot** — скрытое поле `site` в форме; бот его заполнит, человек нет
- **лимит** — 6 комментариев в час с одного IP (`RATE_PER_HOUR` в `worker.js`)
- **санитайзер** — вырезаются управляющие символы и `<` `>`, длина ограничена
- **экранирование** — фронтенд экранирует всё перед выводом
- **модерация** — спрятать спам без удаления:
  `wrangler d1 execute comments-db --command "UPDATE posts SET hidden = 1 WHERE id = 42"`
  удалить совсем:
  `wrangler d1 execute comments-db --command "DELETE FROM posts WHERE id = 42"`

## Хочу другой бэкенд

Напиши, какой — переделаю `worker.js` под него. Фронтенд трогать не придётся:
он общается только через `CONFIG.api`.

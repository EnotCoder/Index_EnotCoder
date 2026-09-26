# Бэкенд комментариев

Комментарии под проектами хранит маленький API. GitHub Pages статический,
поэтому нужен отдельный хостинг — здесь вариант на **Cloudflare Workers + D1**:
бесплатно, без сервера, который надо держать живым, своя база рядом.

Фронтенд уже всё умеет: `assets/comments.js` работает и с этим бэкендом,
и без него (кладёт комментарии в localStorage). Адрес бэкенда вписывается
в одну строку в начале файла.

## Нужно от тебя (5 минут, один раз)

Node ставить не надо — деплой идёт на `curl`.

1. Зарегайся на <https://dash.cloudflare.com/sign-up> (бесплатно).
2. Создай токен: **My Profile → API Tokens → Create Token** →
   шаблон **Edit Cloudflare Workers** (он уже включает право на D1) →
   **Use template**.
3. Скопируй **Account ID**: там же, **My Profile → Account → Account ID**
   (это не токен, это 32 hex-символа).

## Дальше — либо я, либо ты

Дай мне эти три значения (токен можно выкинуть после деплоя):

```sh
export CLOUDFLARE_TOKEN=…      # токен из шага 2
export CLOUDFLARE_ACCOUNT_ID=… # id из шага 3
export ADMIN_TOKEN=…           # любой свой пароль для удаления комментариев
```

и я выполню:

```sh
cd backend
./deploy.sh
```

Скрипт сам создаст базу `comments-db`, применит `schema.sql`, задеплоит
воркер и напечатает адрес вида `https://enotcoder-comments.<поддомен>.workers.dev`.
Если запускаешь сам — вывод будет тот же.

## Что сделать после деплоя

Впиши адрес в `assets/comments.js`, самое начало:

```js
const CONFIG = {
  api: 'https://enotcoder-comments.<поддомен>.workers.dev',
  ...
}
```

Пока `api` пустая, комментарии работают в режиме localStorage: интерфейс
полный, но записи не уходят никуда. В этом режиме у кнопки «Комментарии»
показывается плашка `local`, а если API был настроен, но не отвечает,
вместо плашки — жёлтая подсказка.

Проверить, что бэкенд живой:

```sh
curl https://enotcoder-comments.<поддомен>.workers.dev/health
# {"ok":true,...}
```

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

`at` отдаётся в секундах (unixepoch) — так же, как его ждёт клиент.

Если захочешь другой хостинг (Supabase, Firebase, VPS, Deno Deploy) —
достаточно реализовать эти же четыре метода и вписать адрес в `CONFIG.api`.
Клиенту всё равно, что на той стороне.

## Защита от мусора

- **honeypot** — скрытое поле `site` в форме; бот его заполнит, человек нет
- **лимит** — 6 комментариев в час с одного IP (`RATE_PER_HOUR` в `worker.js`)
- **санитайзер** — вырезаются управляющие символы и `<` `>`, длина ограничена
- **экранирование** — фронтенд экранирует всё перед выводом
- **модерация** — спрятать спам без удаления:
  ```sh
  curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database/$DB_ID/query" \
    -H "Authorization: Bearer $CLOUDFLARE_TOKEN" -H "Content-Type: application/json" \
    -d '{"sql":"UPDATE posts SET hidden = 1 WHERE id = 42"}'
  ```
  удалить совсем — то же с `DELETE FROM posts WHERE id = 42`.
  `DB_ID` печатает `deploy.sh` (и лежит в `backend/.deployed-url` рядом с адресом).

## Файлы

```
worker.js      обработчик запросов, ~120 строк
schema.sql     таблицы posts и hits
deploy.sh      деплой на curl: база + схема + воркер
wrangler.toml  конфиг для тех, кто предпочитает wrangler
```

В `wrangler.toml` вписывается `database_id` из шага с базой — он нужен
только для варианта через wrangler, `deploy.sh` берёт id сам.

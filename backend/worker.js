/* ═══════════════════════════════════════════════════════════════
   Комментарии под проектами — бэкенд для Cloudflare Workers + D1
   ───────────────────────────────────────────────────────────────
   GET    /comments?project=cys   → { items: [ {id, project, name, text, at} ] }
   POST   /comments { project, name, text }
                                   → 201 { item: {...} }
   DELETE /comments?id=42         → 204   (нужен токен, см. ADMIN_TOKEN)

   Настройки (wrangler.toml или переменные окружения):
     DB            — биндинг D1
     ADMIN_TOKEN   — токен для удаления комментариев (секрет)
   ═══════════════════════════════════════════════════════════════ */

const NAME_MAX = 32;
const TEXT_MAX = 600;
const RATE_PER_HOUR = 6;          // комментариев с одного IP в час
const MAX_PER_PROJECT = 500;

/* какой Origin отдавать в CORS: '*' или конкретный домен из ALLOWED_ORIGIN */
let ALLOW = '*';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOW,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  },
});

const fail = (error, status) => json({ error }, status);

/* ── санитайзер: убираем управляющие символы и HTML-скобки ── */
function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')   /* управляющие символы */
    .replace(/[<>]/g, '')                              /* HTML не принимаем */
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const slugOk = s => /^[a-z0-9][a-z0-9._-]{0,39}$/i.test(s);

/* ── IP для лимитов ── */
function ipOf(request) {
  return request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || '0.0.0.0';
}

async function rateLimited(db, ip) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS n FROM posts
      WHERE ip = ?1 AND created_at > (unixepoch() - 3600)`
  ).bind(ip).first();
  return (row && row.n >= RATE_PER_HOUR) === true;
}

async function touchIp(db, ip) {
  await db.prepare(`INSERT OR IGNORE INTO hits (ip, hour) VALUES (?1, ?2)`)
    .bind(ip, Math.floor(Date.now() / 3600000)).run();
}

/* ── публичное чтение ── */
async function list(request, env, url) {
  const project = clean(url.searchParams.get('project') || '', 40);
  if (!slugOk(project)) return fail('bad project', 400);

  const { results } = await env.DB.prepare(
    `SELECT id, project, name, text, created_at AS at
       FROM posts
      WHERE project = ?1 AND hidden = 0
      ORDER BY created_at ASC
      LIMIT ${MAX_PER_PROJECT}`
  ).bind(project).all();

  return json({ items: results || [] });
}

/* ── публичная запись ── */
async function create(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return fail('нужен json', 400); }

  const project = clean(body.project, 40);
  const name    = clean(body.name, NAME_MAX);
  const text    = clean(body.text, TEXT_MAX);

  if (!slugOk(project))   return fail('bad project', 400);
  if (name.length < 2)    return fail('слишком короткое имя', 400);
  if (text.length < 3)    return fail('слишком короткий комментарий', 400);
  if (text.length > TEXT_MAX) return fail('слишком длинный комментарий', 400);

  const ip = ipOf(request);
  if (await rateLimited(env.DB, ip)) {
    return fail('слишком много комментариев, попробуй позже', 429);
  }
  await touchIp(env.DB, ip);

  const res = await env.DB.prepare(
    `INSERT INTO posts (project, name, text, ip, created_at)
     VALUES (?1, ?2, ?3, ?4, unixepoch())
     RETURNING id, project, name, text, created_at AS at`
  ).bind(project, name, text, ip).first();

  return json({ item: res }, 201);
}

/* ── удаление (модерация) ── */
async function remove(request, env, url) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return fail('нет доступа', 401);

  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return fail('bad id', 400);

  await env.DB.prepare(`DELETE FROM posts WHERE id = ?1`).bind(id).run();
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': ALLOW } });
}

export default {
  /* ежедневная подчистка счётчика (cron из wrangler.toml) */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      env.DB.prepare('DELETE FROM hits WHERE hour < unixepoch() / 3600 - 24').run()
    );
  },

  async fetch(request, env) {
    ALLOW = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') return json({}, 204);
    if (!env.DB) return fail('нет привязки D1 (DB)', 500);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/comments' && request.method === 'GET')  return await list(request, env, url);
      if (path === '/comments' && request.method === 'POST') return await create(request, env);
      if (path === '/comments' && request.method === 'DELETE') return await remove(request, env, url);
      if (path === '/health') return json({ ok: true, ts: Date.now() });
      return fail('not found', 404);
    } catch (e) {
      console.error('comments api error:', e);
      return fail('внутренняя ошибка', 500);
    }
  },
};

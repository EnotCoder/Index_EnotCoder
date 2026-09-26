/* ═══════════════════════════════════════════════════════════════
   EnotCoder — комментарии под проектами
   Без зависимостей. Работает с бэкендом (см. backend/README.md),
   а если он не настроен — кладёт комментарии в localStorage,
   чтобы интерфейс можно было потрогать локально.
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─────────── НАСТРОЙКИ (единственное место, которое нужно менять) ───────────
   api: адрес бэкенда. Пока он пустой или недоступен — работает
   локальное хранилище браузера.
   Например: api: 'https://comments.example.workers.dev' */
const CONFIG = {
  api: '',                 // ← URL бэкенда
  limit: 200,              // максимум символов в комментарии
  nameLimit: 32,           // максимум символов в имени
  storageKey: 'enotcoder:comments:v1',
  storageTTL: 30 * 24 * 3600 * 1000,   // локальные комментарии живут 30 дней
};

/* ─────────── утилиты ─────────── */
const escHtml = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* API отдаёт at в секундах (unixepoch), локальное хранилище тоже.
   На всякий случай принимаем и миллисекунды. */
const toMs = ts => (Number(ts) > 1e11 ? Number(ts) : Number(ts) * 1000);

const ago = ts => {
  const s = Math.max(0, (Date.now() - toMs(ts)) / 1000);
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  if (s < 2592000) return `${Math.floor(s / 86400)} дн назад`;
  return new Date(toMs(ts)).toLocaleDateString('ru-RU');
};

/* цветной кружок вместо аватара: цвет из имени, чтобы не тянуть картинки */
function hueOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
function initial(name) {
  return (name.trim()[0] || '?').toUpperCase();
}

/* ─────────── хранилище ─────────── */
const local = {
  read() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return {};
      const all = JSON.parse(raw) || {};
      const now = Date.now();
      for (const k of Object.keys(all)) {
        all[k] = (all[k] || []).filter(c => now - c.at < CONFIG.storageTTL);
        if (!all[k].length) delete all[k];
      }
      return all;
    } catch (e) { return {}; }
  },
  write(all) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(all)); }
    catch (e) { /* приватный режим — молча продолжаем без сохранения */ }
  },
};

/* ─────────── бэкенд ─────────── */
/* Контракт:
     GET  <api>/comments?project=<ключ>   → { items: [{id,project,name,text,at}] }
     POST <api>/comments  { project, name, text }  → 201 { item: {...} }
   Ответ об ошибке: { error: '...' } с кодом 4xx/5xx. */
async function api_get(project) {
  if (!CONFIG.api) return null;
  const r = await fetch(`${CONFIG.api}/comments?project=${encodeURIComponent(project)}`,
    { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.items || []);
}

async function api_post(project, name, text) {
  if (!CONFIG.api) return null;
  const r = await fetch(`${CONFIG.api}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ project, name, text }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data.item || null;
}

async function load(project) {
  try {
    const items = await api_get(project);
    if (items) return { items, mode: 'server' };
  } catch (e) {
    console.warn('[comments] бэкенд недоступен, показываю локальные:', e.message);
  }
  return { items: (local.read()[project] || []), mode: 'local' };
}

async function save(project, name, text) {
  try {
    const item = await api_post(project, name, text);
    if (item) return { item, mode: 'server' };
    if (CONFIG.api) throw new Error('empty response');
  } catch (e) {
    if (CONFIG.api) { console.warn('[comments] отправка не прошла:', e.message); throw e; }
  }
  // локальный режим
  const all = local.read();
  const item = { id: 'l' + Date.now(), project, name, text, at: Math.floor(Date.now() / 1000) };
  (all[project] = all[project] || []).push(item);
  local.write(all);
  return { item, mode: 'local' };
}

/* ─────────── отрисовка ─────────── */
function itemHTML(c) {
  const hue = hueOf(c.name);
  return `
    <li class="cm-item">
      <span class="cm-ava" style="--h:${hue}" aria-hidden="true">${escHtml(initial(c.name))}</span>
      <div class="cm-body">
        <div class="cm-head">
          <b>${escHtml(c.name)}</b>
          <time datetime="${new Date(toMs(c.at)).toISOString()}">${ago(c.at)}</time>
        </div>
        <p>${escHtml(c.text)}</p>
      </div>
    </li>`;
}

function panelHTML(project, title) {
  return `
    <button class="cm-toggle" type="button" aria-expanded="false"
            aria-label="Комментарии к проекту ${escHtml(title)}">
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M3 5.5h14v9H3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 5.5 10 11l7-5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      <span>Комментарии</span>
      <b class="cm-count">…</b>
      <i class="cm-chevron" aria-hidden="true"></i>
    </button>

    <div class="cm-panel" hidden>
      <ul class="cm-list"></ul>
      <p class="cm-empty" hidden>Пока никто не написал. Будь первым.</p>

      <form class="cm-form" novalidate>
        <div class="cm-row">
          <label class="cm-field">
            <span class="cm-label">Имя</span>
            <input class="cm-input" name="name" type="text" maxlength="${CONFIG.nameLimit}"
                   placeholder="как тебя подписать" autocomplete="nickname" required>
          </label>
          <label class="cm-field cm-grow">
            <span class="cm-label">Комментарий</span>
            <textarea class="cm-input" name="text" rows="2" maxlength="${CONFIG.limit}"
                      placeholder="что думаешь про проект?" required></textarea>
          </label>
        </div>
        <input class="cm-trap" name="site" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="cm-actions">
          <span class="cm-hint" aria-live="polite"></span>
          <button class="btn btn-outline cm-send" type="submit">Отправить</button>
        </div>
      </form>
    </div>`;
}

function mount(box) {
  const project = box.dataset.project;
  const title = box.dataset.title || project;
  if (box.dataset.mounted) return;
  box.dataset.mounted = '1';

  box.innerHTML = panelHTML(project, title);
  const toggle = box.querySelector('.cm-toggle');
  const panel  = box.querySelector('.cm-panel');
  const list   = box.querySelector('.cm-list');
  const empty  = box.querySelector('.cm-empty');
  const count  = box.querySelector('.cm-count');
  const form   = box.querySelector('.cm-form');
  const hint   = box.querySelector('.cm-hint');
  const send   = box.querySelector('.cm-send');
  const nameI  = form.querySelector('[name=name]');
  const textI  = form.querySelector('[name=text]');
  const trap   = form.querySelector('[name=site]');
  let mode = 'local';

  const say = (msg, kind) => {
    hint.textContent = msg || '';
    hint.className = 'cm-hint' + (kind ? ' ' + kind : '');
  };

  const paint = items => {
    items = (items || []).slice().sort((a, b) => toMs(a.at) - toMs(b.at));
    list.innerHTML = items.map(itemHTML).join('');
    empty.hidden = items.length > 0;
    count.textContent = items.length;
  };

  const refresh = async () => {
    const r = await load(project);
    mode = r.mode;
    paint(r.items);
    box.dataset.mode = mode;
    if (mode === 'local' && CONFIG.api) {
      say('бэкенд недоступен — комментарий сохранится только в этом браузере', 'warn');
    }
  };

  toggle.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!on));
    panel.hidden = on;
    box.classList.toggle('open', !on);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (trap.value) return;                     // honeypot: бот заполнил скрытое поле

    const name = nameI.value.trim();
    const text = textI.value.trim();
    if (name.length < 2)        return say('имя слишком короткое', 'err');
    if (text.length < 3)        return say('напиши хотя бы пару слов', 'err');
    if (text.length > CONFIG.limit) return say('слишком длинно', 'err');

    send.disabled = true;
    say('отправляю…');
    try {
      await save(project, name, text);
      const r = await load(project);
      paint(r.items);
      textI.value = '';
      say(r.mode === 'server' ? 'готово' : 'сохранено локально', 'ok');
      setTimeout(() => say(''), 2600);
    } catch (err) {
      say(err.message || 'не получилось', 'err');
    } finally {
      send.disabled = false;
    }
  });

  // Ctrl+Enter — отправить не выходя из textarea
  textI.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') form.requestSubmit();
  });

  refresh();
}

/* публичный API: script.js дёргает это после перерисовки карточек */
function mountAll(grid) {
  $$all(grid || document).forEach(mount);
}
function $$all(root) {
  return Array.from(root.querySelectorAll('.card-comments'));
}

window.Comments = { mountAll, mount, CONFIG };

/* если script.js загрузился раньше — смонтируем сразу */
document.addEventListener('cards:rendered', () => mountAll());

})();

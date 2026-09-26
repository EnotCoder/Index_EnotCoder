/* ═══════════════════════════════════════════════════════════════
   EnotCoder — интерактив
   Без зависимостей. Каждая секция — отдельный модуль.
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─────────── утилиты ─────────── */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a, b) => a + Math.random() * (b - a);
const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;

const GITHUB_USER = 'EnotCoder';
const API_URL     = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;

/* Репозиторий с самим сайтом не показываем в портфолио.
   Имя вычисляется из адреса страницы — работает и после переименования,
   и при переносе на свой домен. Список ниже — запасной вариант
   при запуске index.html локально. */
const SITE_REPOS = ['index_enotcoder'];

function isSiteRepo(name) {
  const n = String(name).toLowerCase();
  if (SITE_REPOS.includes(n)) return true;
  const host = location.hostname.toLowerCase();
  if (host === 'github.io' || host.endsWith('.github.io')) {
    const first = location.pathname.split('/').filter(Boolean)[0];
    if (first && first.toLowerCase() === n) return true;
  }
  return false;
}

const GLYPHS = '█▓▒░<>/\\{}[]()=+*#@$%&!?~^|01';

/* ─────────── цвета языков ─────────── */
const LANG_COLORS = {
  'Rust':     '#ff7a45',
  'C++':      '#6ea8fe',
  'GDScript': '#4ecdc4',
  'Python':   '#ffd93d',
  'Rasi':     '#a78bfa',
  'Makefile': '#a3e635',
  'C':        '#4cc9f0',
  'Shell':    '#89e051',
  'Lua':      '#8b7cf6',
  'HTML':     '#e34c26',
};
const PRIMARY_LANGS = ['Rust', 'C++', 'GDScript', 'Python'];
const langColor = l => LANG_COLORS[l] || '#a78bfa';
const bucketOf  = l => PRIMARY_LANGS.includes(l) ? l : 'other';

/* ═══════════════════════════════════════════════════════════
   1. ДАННЫЕ ПРОЕКТОВ (статический снимок GitHub)
   Описания сверены с README каждого репозитория.
   При открытии сайта данные подтягиваются свежими через API.
   ═══════════════════════════════════════════════════════════ */
const SNAPSHOT = [
  {
    name: 'CYS', full: 'Create your Shop',
    lang: 'Rust', short: 'rs', bucket: 'Rust',
    stars: 2, forks: 0, license: 'GPL-3.0', pushed: '2026-09-25', beta: true,
    desc: '2D-песочница про свой магазин на Rust + wgpu: укладываешь полы, стены и декор, закупаешь стеллажи, обслуживаешь NPC-покупателей и следишь, чтобы бизнес не разорился. ECS на specs, балансировка на Lua.',
    tags: ['wgpu', 'specs', 'winit', 'mlua', 'sandbox'],
    shot: 'cys', icon: 'cys',
  },
  {
    name: 'pixesh', full: null,
    lang: 'Rust', short: 'rs', bucket: 'Rust',
    stars: 3, forks: 0, license: 'MIT', pushed: '2026-09-12',
    desc: 'Минималистичный редактор пиксель-арта на Rust + egui: кисти, заливка, пипетка, слои, HSV-палитра, обрезка по выделению, зеркало, undo/redo на 50 шагов, вкладки с несколькими файлами и экспорт PNG с масштабом ×1–×16.',
    tags: ['egui', 'tool', 'editor', 'export'],
    shot: 'pixesh', icon: 'pixesh',
  },
  {
    name: 'gomit', full: 'Gomit Engine',
    lang: 'C++', short: 'c++', bucket: 'C++',
    stars: 1, forks: 0, license: 'MIT', pushed: '2026-09-24',
    desc: 'Gomit Engine — форк Godot: кроссплатформенный движок для 2D и 3D игр с единым интерфейсом. Собирается через SCons, тянет GLM и работает поверх X11/Wayland.',
    tags: ['gamedev', 'engine', 'fork', 'scons'],
    icon: 'gomit',
  },
  {
    name: 'ryng', full: null,
    lang: 'Rust', short: 'rs', bucket: 'Rust',
    stars: 0, forks: 0, license: null, pushed: '2026-09-25',
    desc: 'Прототип игры на проверку реакции: Bevy 0.19 и Rust 2024. Главное меню, переходы между сценами через States, анимации кнопок, масштабируемый спрайтовый фон и автоматический деспавн сущностей при выходе из сцены.',
    tags: ['bevy', 'prototype', 'states', 'gamedev'],
    icon: 'ryng',
  },
  {
    name: 'Granny-clicker', full: null,
    lang: 'GDScript', short: 'gd', bucket: 'GDScript',
    stars: 1, forks: 0, license: 'MIT', pushed: '2026-09-23',
    desc: '2D-кликер для Яндекс Игр на Godot 4.7: клики, апгрейды, престиж и достижения. Плюс мини-игры — паутина ×2, бешеный дедушка ×2.5 и казино-медвежонок. Облачные сейвы через Player API, rewarded-реклама, офлайн-фолбэк на ПК.',
    tags: ['godot', 'clicker', 'yandex', 'monetize'],
    shot: 'granny', icon: 'granny',
  },
  {
    name: 'game_wgpu', full: 'TMV Alpha',
    lang: 'Rust', short: 'rs', bucket: 'Rust',
    stars: 2, forks: 0, license: null, pushed: '2026-08-02',
    desc: 'Просмотрщик 3D-моделей на wgpu: OBJ, glTF/glb и бинарный STL с автоопределением по расширению. Орбитальная камера, тёмный UI в стиле Blender с FPS, сетка на плоскости XZ, вращение и перенос моделей.',
    tags: ['wgpu', '3d', 'viewer', 'gltf'],
  },
  {
    name: 'BadCheff', full: null,
    lang: 'GDScript', short: 'gd', bucket: 'GDScript',
    stars: 1, forks: 0, license: 'MIT', pushed: '2026-09-19',
    desc: 'Декомпилированные исходники Android-игры BadCheff на Godot: ресурсы, манифест и smali из Apktool, восстановленные Java-источники из jadx. Логика игры лежит в Godot-проекте внутри res/assets.',
    tags: ['reverse-engineering', 'apktool', 'jadx', 'godot'],
    shot: 'badcheff', icon: 'badcheff',
  },
  {
    name: 'MyArch', full: 'Rofi launcher',
    lang: 'Rasi', short: 'ra', bucket: 'other',
    stars: 0, forks: 0, license: null, pushed: '2026-09-18',
    desc: 'Лаунчер для Super+D в связке bspwm + sxhkd: тема rofi в палитре Catppuccin Mocha, сетка 4×4 с иконками Papirus, fuzzy-поиск с историей и переключатель режимов drun / run / window.',
    tags: ['linux', 'bspwm', 'sxhkd', 'rofi'],
  },
  {
    name: 'ltm_list', full: null,
    lang: 'Python', short: 'py', bucket: 'Python',
    stars: 2, forks: 0, license: null, pushed: '2026-07-23',
    desc: 'Набор CLI-утилит для повседневных задач. dvi качает видео и картинки с YouTube, VK, TikTok, Instagram и 1800+ площадок прямо в ~/Videos, dins рекурсивно ищет файл по имени. Ставится одним install.sh.',
    tags: ['cli', 'python', 'yt-dlp', 'scripts'],
    shot: 'ltm_list',
  },
  {
    name: 'Flappy-GL', full: null,
    lang: 'C++', short: 'c++', bucket: 'C++',
    stars: 1, forks: 0, license: null, pushed: '2026-02-15',
    desc: 'Клон Flappy Bird на голом OpenGL: свой шейдер, класс спрайта на stb_image, текст и прямоугольники отрисовываются вручную. Вендорнутый GLM, сборка через Makefile.',
    tags: ['opengl', 'game', 'glfw', 'glm'],
  },
];

const TECH_MARQUEE = [
  'Rust', 'wgpu', 'Bevy', 'winit', 'specs', 'egui', 'mlua', 'Lua',
  'Godot', 'GDScript', 'C++', 'OpenGL', 'GLM', 'SCons', 'Python', 'yt-dlp',
  'bspwm', 'sxhkd', 'rofi', 'Catppuccin', 'Vulkan', 'Apktool',
];

/* состояние */
let projects = SNAPSHOT.slice();
let activeBucket = 'all';
let searchQuery = '';

/* ═══════════════════════════════════════════════════════════
   2. ЛОГОТИП — запасной источник, если файл не нашёлся
   ═══════════════════════════════════════════════════════════ */
$$('img[data-fallback]').forEach(img => {
  const remote = img.dataset.fallback;
  img.addEventListener('error', function handler() {
    img.removeEventListener('error', handler);
    img.src = remote;
  }, { once: true });
});

/* ═══════════════════════════════════════════════════════════
   3. ФОНОВЫЕ ЧАСТИЦЫ НА CANVAS
   ═══════════════════════════════════════════════════════════ */
(function particles() {
  const cv = $('#fx');
  if (!cv || reduceMotion) { if (cv) cv.style.display = 'none'; return; }

  const ctx = cv.getContext('2d', { alpha: true });
  let W = 0, H = 0, dpr = 1;
  let nodes = [];
  let mx = -9999, my = -9999;   // указатель в CSS-пикселях
  let tx = 0, ty = 0;          // сглаженное смещение параллакса
  let sx = 0, sy = 0;          // прокрутка
  let running = true;

  const PALETTE = ['34,211,238', '168,85,247', '103,232,249', '225,29,72'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width  = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const area = W * H;
    const count = Math.round(clamp(area / 17000, 34, 96));
    nodes = new Array(count).fill(0).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: rand(-0.22, 0.22),
      vy: rand(-0.22, 0.22),
      r: rand(0.9, 2.5),
      c: PALETTE[(Math.random() * PALETTE.length) | 0],
      a: rand(0.28, 0.8),
      ph: rand(0, Math.PI * 2),
    }));
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // параллакс: мышь + скролл
    tx = lerp(tx, clamp((mx / W - 0.5) * 2, -1, 1), 0.05);
    ty = lerp(ty, clamp((my / H - 0.5) * 2, -1, 1), 0.05);
    const px = tx * 16, py = ty * 16 + sy * 0.06;

    const LINK = 138;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      n.ph += 0.012;

      // отталкивание от курсора
      const ddx = n.x - mx, ddy = n.y - my;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < 30000 && d2 > 1) {
        const f = (1 - d2 / 30000) * 0.55;
        const d = Math.sqrt(d2);
        n.x += (ddx / d) * f;
        n.y += (ddy / d) * f;
      }

      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;

      const y2 = n.y + Math.sin(n.ph) * 5;

      // связи
      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const ax = n.x - m.x, ay = (y2 - m.y) * 0.86;
        const dist = Math.hypot(ax, ay);
        if (dist < LINK) {
          const alpha = (1 - dist / LINK) * 0.24;
          ctx.strokeStyle = `rgba(120,170,255,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(n.x, y2);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      // узел
      const boost = d2 < 14400 ? 1 + (1 - d2 / 14400) * 1.1 : 1;
      ctx.beginPath();
      ctx.arc(n.x, y2 + py * 0.4, n.r * boost, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.c},${n.a})`;
      ctx.fill();

      if (n.r > 1.8) {
        ctx.beginPath();
        ctx.arc(n.x, y2 + py * 0.4, n.r * 3.6 * boost, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.c},${(n.a * 0.07).toFixed(3)})`;
        ctx.fill();
      }
    }

    // линии от курсора к ближайшим узлам
    for (const n of nodes) {
      const d = Math.hypot(n.x - mx, n.y - my);
      if (d < 180) {
        ctx.strokeStyle = `rgba(34,211,238,${((1 - d / 180) * 0.3).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
    }

    requestAnimationFrame(frame);
  }

  /* ввод */
  window.addEventListener('pointermove', e => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { mx = my = -9999; });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 160); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(frame); }
  });

  /* лёгкое «дыхание» плотности от прокрутки */
  window.addEventListener('scroll', () => { sy = window.scrollY; }, { passive: true });

  resize();
  requestAnimationFrame(frame);
})();

/* ═══════════════════════════════════════════════════════════
   4. СВЕЧЕНИЕ ЗА КУРСОРОМ
   ═══════════════════════════════════════════════════════════ */
(function cursorGlow() {
  const el = $('.cursor-glow');
  if (!el || reduceMotion || isTouch) return;
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, active = false;

  window.addEventListener('pointermove', e => {
    if (!active) { active = true; document.body.classList.add('has-cursor'); }
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  (function loop() {
    cx = lerp(cx, mx, 0.12);
    cy = lerp(cy, my, 0.12);
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();
})();

/* ═══════════════════════════════════════════════════════════
   5. ПРОКРУТКА: прогресс, шапка, кнопка «наверх», активная ссылка
   ═══════════════════════════════════════════════════════════ */
(function scroll() {
  const nav = $('#nav');
  const bar = $('.scroll-progress i');
  const navBar = $('#navProgress');
  const toTop = $('#toTop');
  const toTopBar = $('#toTopBar');
  const CIRC = 2 * Math.PI * 18;

  if (toTopBar) toTopBar.style.strokeDasharray = CIRC.toFixed(1);

  let ticking = false;

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;

    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    if (navBar) navBar.style.width = (p * 100).toFixed(2) + '%';
    if (toTopBar) toTopBar.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(1);

    if (nav) nav.classList.toggle('stuck', y > 40);
    if (toTop) toTop.classList.toggle('show', y > 620);

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* подсветка активного раздела */
  const links = $$('.nav-link');
  const map = new Map(links.map(l => [l.getAttribute('href').slice(1), l]));
  const sections = Array.from(map.keys())
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.remove('active'));
        const l = map.get(en.target.id);
        if (l) l.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }
})();

/* ═══════════════════════════════════════════════════════════
   6. МАГНИТНЫЕ КНОПКИ
   ═══════════════════════════════════════════════════════════ */
(function magnetic() {
  if (isTouch || reduceMotion) return;

  let pulled = null;

  function release() {
    if (pulled) { pulled.style.transform = ''; pulled = null; }
  }

  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('[data-magnetic]') : null;
    if (el !== pulled) release();
    if (!el) return;
    pulled = el;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px)`;
  }, { passive: true });

  window.addEventListener('blur', release);
  document.addEventListener('scroll', release, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   7. НАКЛОН ЛОГОТИПА ЗА КУРСОРОМ
   ═══════════════════════════════════════════════════════════ */
(function logoTilt() {
  if (isTouch || reduceMotion) return;
  const wrap = $('[data-tilt]');
  const img = $('#heroLogo');
  if (!wrap || !img) return;

  // прямоугольник кэшируем — иначе каждый pointermove вызывает layout
  let rect = wrap.getBoundingClientRect();
  const refresh = () => { rect = wrap.getBoundingClientRect(); };
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  setTimeout(refresh, 400);

  window.addEventListener('pointermove', e => {
    // за пределами блока — сбрасываем наклон
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom) {
      if (img.style.transform) img.style.transform = '';
      return;
    }
    const px = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const py = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    img.style.transform =
      `rotateY(${(px * 13).toFixed(2)}deg) rotateX(${(-py * 13).toFixed(2)}deg) translateZ(24px) scale(1.03)`;
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   8. ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ ПРИ СКРОЛЛЕ
   ═══════════════════════════════════════════════════════════ */
(function reveal() {
  const items = $$('[data-reveal]');
  items.forEach(el => {
    if (el.dataset.delay) el.style.setProperty('--rd', el.dataset.delay);
  });

  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach(el => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      obs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  items.forEach(el => io.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   9. СЧЁТЧИКИ
   ═══════════════════════════════════════════════════════════ */
/* разделитель разрядов нужен только для крупных чисел (год — без него) */
const fmtNum = n => (Math.abs(n) >= 10000 ? n.toLocaleString('ru-RU') : String(n));

const counters = (function () {
  const list = $$('.count');
  const run = el => {
    const to = parseFloat(el.dataset.to || '0');
    if (reduceMotion) { el.textContent = fmtNum(to); return; }
    const dur = 1500;
    const t0 = performance.now();
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmtNum(Math.round(easeOutExpo(p) * to));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };

  if (!('IntersectionObserver' in window)) { list.forEach(run); return { set(){} }; }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      run(en.target);
      obs.unobserve(en.target);
    });
  }, { threshold: 0.6 });

  list.forEach(el => io.observe(el));

  return {
    /* пересчёт при обновлении данных с GitHub */
    set(map) {
      list.forEach(el => {
        const key = el.dataset.stat;
        if (key && map[key] != null) el.dataset.to = map[key];
        el.textContent = fmtNum(Number(el.dataset.to || 0));
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) run(el);
      });
    }
  };
})();

/* ═══════════════════════════════════════════════════════════
   10. ЭФФЕКТ «РАСШИФРОВКИ» В ЗАГОЛОВКАХ
   Разбирает текстовые узлы, сохраняя вложенные <span>.
   ═══════════════════════════════════════════════════════════ */
(function scramble() {
  const targets = $$('[data-scramble]');
  if (!targets.length) return;

  /* Текстовые узлы рекурсивно — вложенные <span> сохраняются */
  function textNodes(node, out = []) {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) {
        if (n.nodeValue.trim()) out.push(n);
      } else if (n.nodeType === 1) {
        textNodes(n, out);
      }
    }
    return out;
  }

  const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

  /* Прогресс привязан к ВРЕМЕНИ, а не к числу кадров:
     на слабом FPS эффект всё равно отработает полностью. */
  function run(el) {
    const specs = textNodes(el).map(node => {
      const final = node.nodeValue;
      const chars = Array.from(final);   // безопасно для surrogate-пар
      return { node, final, chars, w: Math.max(chars.length, 1) };
    });
    if (!specs.length) return;

    const finish = () => specs.forEach(s => { s.node.nodeValue = s.final; });
    if (reduceMotion) { finish(); return; }

    const total = specs.reduce((s, x) => s + x.w, 0);
    const dur = Math.min(1400, 300 + total * 22);
    const t0 = performance.now();

    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      let cursor = 0;
      for (const s of specs) {
        const n = Math.max(0, Math.min(s.w, Math.round(p * total) - cursor));
        cursor += s.w;
        s.node.nodeValue = s.chars
          .map((c, i) => (i < n ? c : (c.trim() === '' ? ' ' : glyph())))
          .join('');
      }
      if (p < 1) requestAnimationFrame(frame);
      else finish();                       // финальный текст гарантирован
    })(performance.now());
  }

  if (!('IntersectionObserver' in window)) { targets.forEach(run); return; }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      run(en.target);
      obs.unobserve(en.target);
    });
  }, { threshold: 0.3 });

  targets.forEach(el => io.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   11. ПЕЧАТАЮЩИЙСЯ ТЕКСТ
   ═══════════════════════════════════════════════════════════ */
(function typewriter() {
  const el = $('#typed');
  if (!el) return;

  const lines = [
    'Rust / wgpu — свой рендер',
    'Bevy · egui · winit',
    'Godot / GDScript',
    'C++ / OpenGL / GLM',
    'Lua · Python · Shell',
  ];

  if (reduceMotion) { el.textContent = lines[0]; return; }

  let li = 0, ci = 0, deleting = false;

  function tick() {
    const line = lines[li];
    ci += deleting ? -1 : 1;
    el.textContent = line.slice(0, ci);

    let wait = deleting ? 34 : 78;
    if (!deleting && ci === line.length) { wait = 1700; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; wait = 320; }
    setTimeout(tick, wait);
  }
  setTimeout(tick, 500);
})();

/* ═══════════════════════════════════════════════════════════
   12. БЕГУЩАЯ СТРОКА СТЕКА
   ═══════════════════════════════════════════════════════════ */
(function marquee() {
  const track = $('#marqueeTrack');
  if (!track) return;

  const html = TECH_MARQUEE
    .map(t => `<span class="mq-item">${t}</span>`)
    .join('');
  // дублируем список для бесшовной прокрутки
  track.innerHTML = html + html;
})();

/* ═══════════════════════════════════════════════════════════
   13. ФОРМАТИРОВАНИЕ ДАТ
   ═══════════════════════════════════════════════════════════ */
function relativeDate(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} мес. назад`;
  const years = Math.floor(days / 365);
  return `${years} г. назад`;
}

const shortDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ═══════════════════════════════════════════════════════════
   14. КАРТОЧКИ ПРОЕКТОВ
   ═══════════════════════════════════════════════════════════ */
const ICON_STAR = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M8 .25l2.06 4.42 4.69.64-3.4 3.4.83 4.79L8 11.2l-4.18 2.3.83-4.79-3.4-3.4 4.69-.64L8 .25z"/></svg>';
const ICON_FORK = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M5 3.25a1.75 1.75 0 1 0-2.5 1.58v1.5a2.75 2.75 0 0 0 2.75 2.75h.5v1.92a1.75 1.75 0 1 0 1.5 0V9.08h.5A2.75 2.75 0 0 0 11 6.33v-1.5a1.75 1.75 0 1 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-2.5C5.56 7.58 5 7.02 5 6.33v-1.5c.57-.29.95-.86.95-1.53 0-.9-.66-1.64-1.5-1.8z" opacity=".85"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M13 5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
const ICON_EXT  = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M7 13 13 7M8 7h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function cardHTML(p, index) {
  const color = langColor(p.lang);
  const title = p.full ? `${p.name} <span>${esc(p.full)}</span>` : `<span>${esc(p.name)}</span>`;
  const license = p.license ? p.license.replace('GPL-', 'GPL ').replace('MIT', 'MIT') : null;

  // фон — скрин из самой игры/программы, в боксе — её настоящая иконка
  const icon = p.icon
    ? `<img src="assets/picons/${esc(p.icon)}.webp" alt="" width="52" height="52" loading="lazy" decoding="async">`
    : esc(p.short || p.lang.slice(0, 2));
  return `
  <article class="card${p.shot ? ' has-shot' : ''}" style="--lang:${color};--rd:${index % 3}"
           data-name="${esc(p.name.toLowerCase())}"
           data-bucket="${esc(p.bucket)}"
           data-desc="${esc((p.desc + ' ' + (p.tags || []).join(' ')).toLowerCase())}">
    ${p.shot ? `<div class="card-shot"><img src="assets/shots/${esc(p.shot)}.webp" alt=""
       loading="lazy" decoding="async"></div>` : ''}

    <div class="card-main">
      <div class="card-side">
        <div class="card-icon">${icon}</div>
      </div>

      <div class="card-col">
        <div class="card-head">
          <div class="card-headtext">
            <h3 class="card-name">${title}</h3>
            <div class="card-sub">
              <em>${esc(p.lang)}</em>
              ${p.beta ? '<span class="badge-beta">BETA</span>' : ''}
              ${license ? `<span class="lic">${esc(license)}</span>` : ''}
            </div>
          </div>

          <div class="card-stats">
            <span class="${p.stars ? 'hot' : ''}">${ICON_STAR} ${p.stars}</span>
            <i class="dot-sep"></i>
            <span>${ICON_FORK} ${p.forks}</span>
            <i class="dot-sep"></i>
            <span title="${esc(shortDate(p.pushed))}">обновлён ${relativeDate(p.pushed)}</span>
          </div>
        </div>

        <p class="card-desc">${esc(p.desc)}</p>

        <div class="card-foot">
          <div class="card-tags">${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>

          <div class="card-actions">
            <a class="btn btn-outline" href="${esc(p.url)}" target="_blank" rel="noopener">
              ${ICON_EXT} На GitHub
            </a>
            <button class="icon-btn" data-copy="git clone ${esc(p.url)}.git"
                    aria-label="Скопировать git clone ${esc(p.name)}" title="Скопировать git clone">
              ${ICON_COPY}
            </button>
          </div>
        </div>
      </div>
    </div>

    <a class="card-link" href="${esc(p.url)}" target="_blank" rel="noopener"
       aria-label="Открыть ${esc(p.name)} на GitHub" tabindex="-1"></a>
  </article>`;
}

function renderProjects() {
  const grid = $('#projectsGrid');
  if (!grid) return;

  const list = projects.slice().sort((a, b) => {
    const rank = p => (p.full === 'Gomit Engine' || p.name === 'CYS' || p.name === 'pixesh' ? 0 : 1);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return new Date(b.pushed || 0) - new Date(a.pushed || 0);
  });

  grid.innerHTML = list.map(cardHTML).join('');

  // карточки появляются каскадом
  if (!reduceMotion) {
    grid.querySelectorAll('.card').forEach(c => c.classList.add('in'));
  }

  applyFilter();
}

/* фильтрация + поиск */
function applyFilter() {
  const cards = $$('#projectsGrid .card');
  let shown = 0;

  cards.forEach((card, i) => {
    const okBucket = activeBucket === 'all' || card.dataset.bucket === activeBucket;
    const okQuery  = !searchQuery
      || card.dataset.desc.includes(searchQuery)
      || card.dataset.name.includes(searchQuery);
    const ok = okBucket && okQuery;

    card.classList.toggle('card-hide', !ok);
    if (!ok) { card.style.animation = ''; return; }

    shown++;
    if (reduceMotion || !card.animate) return;
    // fill backwards — удерживает стартовый кадр только на задержке,
    // чтобы не блокировать hover-наклон после завершения
    card.style.animation = `none`;
    void card.offsetWidth;
    card.style.animation = `cardIn .45s var(--ease) ${(i % 6) * 45}ms backwards`;
  });

  const empty = $('#emptyState');
  if (empty) empty.hidden = shown !== 0;

  $$('#filterChips .fchip').forEach(c => {
    const on = c.dataset.bucket === activeBucket;
    c.classList.toggle('active', on);
    c.setAttribute('aria-selected', String(on));
  });
}

/* фильтр-чипы */
function buildChips() {
  const box = $('#filterChips');
  if (!box) return;

  // канонический порядок вкладок, а не порядок появления в API
  const ORDER = ['all', 'Rust', 'C++', 'GDScript', 'Python', 'other'];
  const buckets = ORDER.filter(b =>
    b === 'all' || projects.some(p => p.bucket === b)
  );
  // на случай новых языков — дописываем в конец
  projects.forEach(p => { if (!buckets.includes(p.bucket)) buckets.push(p.bucket); });

  const names = {
    all: 'Все', Rust: 'Rust', 'C++': 'C++', GDScript: 'GDScript',
    Python: 'Python', other: 'Прочее',
  };
  const colors = {
    all: '#22d3ee', Rust: '#ff7a45', 'C++': '#6ea8fe',
    GDScript: '#4ecdc4', Python: '#ffd93d', other: '#a78bfa',
  };

  const count = b => (b === 'all' ? projects.length : projects.filter(p => p.bucket === b).length);

  box.innerHTML = buckets.map(b => `
    <button class="fchip${b === activeBucket ? ' active' : ''}" data-bucket="${esc(b)}"
            style="--fc:${colors[b] || '#a78bfa'}" role="tab"
            aria-selected="${b === activeBucket}">
      <i></i>${esc(names[b] || b)}<span class="fchip-n">${count(b)}</span>
    </button>`).join('');
}

/* один делегированный обработчик на всё время жизни страницы */
(function wireChips() {
  const box = $('#filterChips');
  if (!box) return;
  box.addEventListener('click', e => {
    const chip = e.target.closest('.fchip');
    if (!chip) return;
    activeBucket = chip.dataset.bucket;
    applyFilter();
  });
})();

/* поиск */
(function search() {
  const input = $('#searchInput');
  if (!input) return;

  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      searchQuery = input.value.trim().toLowerCase();
      applyFilter();
    }, 140);
  });

  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); }
    if (e.key === 'Escape' && document.activeElement === input) { input.blur(); }
  });
})();

/* ═══════════════════════════════════════════════════════════
   15. НАКЛОН КАРТОЧЕК + БЛИК (делегирование)
   ═══════════════════════════════════════════════════════════ */
(function cardTilt() {
  const grid = $('#projectsGrid');
  if (!grid) return;
  if (isTouch || reduceMotion) return;

  grid.addEventListener('pointermove', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    card.style.transform =
      `perspective(900px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg) rotateY(${((px - 0.5) * 5).toFixed(2)}deg) translateY(-7px)`;
  }, { passive: true });

  grid.addEventListener('pointerout', e => {
    const card = e.target.closest('.card');
    if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   16. КОПИРОВАНИЕ + ТОСТ
   ═══════════════════════════════════════════════════════════ */
(function copy() {
  const toast = $('#toast');
  let t;

  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(t);
    t = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  async function toClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fallback ниже */ }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();

    const ok = await toClipboard(btn.dataset.copy);
    if (ok) {
      const original = btn.innerHTML;
      btn.classList.add('done');
      btn.innerHTML = ICON_COPY;
      say('Скопировано: ' + btn.dataset.copy);
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = original; }, 1700);
    } else {
      say('Не удалось скопировать — выдели текст вручную');
    }
  });
})();

/* ═══════════════════════════════════════════════════════════
   17. МОБИЛЬНОЕ МЕНЮ
   ═══════════════════════════════════════════════════════════ */
(function mobileMenu() {
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  if (!burger || !menu) return;

  function set(open) {
    burger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
  }

  burger.addEventListener('click', () => {
    set(burger.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });

  window.addEventListener('resize', () => { if (innerWidth > 880) set(false); });
})();

/* ═══════════════════════════════════════════════════════════
   18. ЧИПЫ «О СЕБЕ»
   ═══════════════════════════════════════════════════════════ */
function buildAboutChips() {
  const box = $('#aboutChips');
  if (!box) return;

  const counts = new Map();
  projects.forEach(p => counts.set(p.lang, (counts.get(p.lang) || 0) + 1));

  const extra = [
    { name: 'wgpu', color: '#22d3ee' },
    { name: 'Bevy', color: '#a855f7' },
    { name: 'egui', color: '#4ecdc4' },
    { name: 'Lua', color: '#8b7cf6' },
    { name: 'bspwm', color: '#a3e635' },
    { name: 'Linux', color: '#6ea8fe' },
  ];

  const langs = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, color: langColor(name), n }));

  box.innerHTML = langs.concat(extra)
    .map(c => `<span class="chip" style="--chip:${c.color}"><i></i>${esc(c.name)}${c.n ? ` <b>${c.n}</b>` : ''}</span>`)
    .join('');
}

/* ═══════════════════════════════════════════════════════════
   19. ПАСХУШКА: 5 кликов по логотипу
   ═══════════════════════════════════════════════════════════ */
(function easterEgg() {
  const logo = $('#heroLogo');
  if (!logo || reduceMotion) return;

  let count = 0, last = 0;

  logo.style.pointerEvents = 'auto';

  logo.addEventListener('click', () => {
    const now = Date.now();
    count = (now - last < 900) ? count + 1 : 1;
    last = now;

    logo.classList.remove('pop');
    void logo.offsetWidth;
    logo.classList.add('pop');

    if (count >= 5) {
      count = 0;
      burst(logo);
      const toast = $('#toast');
      if (toast) {
        toast.textContent = '🦝 Пять кликов. Енот в восторге.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
      }
    }
  });

  function burst(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const colors = ['#22d3ee', '#a855f7', '#e11d48', '#fbbf24', '#34d399', '#67e8f9'];
    const n = 46;

    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const size = rand(5, 11);
      p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
        border-radius:${Math.random() < 0.35 ? '50%' : '2px'};z-index:180;pointer-events:none;
        background:${colors[(Math.random() * colors.length) | 0]};`;

      if (i % 3 === 0) p.textContent = ['🦝', '★', '{ }', '</>', '#'][i % 5];
      p.style.color = colors[(Math.random() * colors.length) | 0];
      p.style.fontSize = size + 'px';
      p.style.lineHeight = '1';

      document.body.appendChild(p);

      const angle = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const dist = rand(90, 300);

      p.animate([
        { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 },
        {
          transform:
            `translate(${Math.cos(angle) * dist - 50}%, ${Math.sin(angle) * dist - 50}%) ` +
            `scale(${rand(0.5, 1.3).toFixed(2)}) rotate(${rand(-420, 420).toFixed(0)}deg)`,
          opacity: 0,
        },
      ], {
        duration: rand(900, 1500),
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'forwards',
      }).onfinish = () => p.remove();
    }
  }
})();

/* ═══════════════════════════════════════════════════════════
   20. ЗАГРУЗКА СВЕЖИХ ДАННЫХ С GITHUB
   При неудаче остаётся статический снимок — сайт работает офлайн.
   ═══════════════════════════════════════════════════════════ */
async function loadFromGitHub() {
  const note = $('#statsNote');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);

  try {
    const res = await fetch(API_URL, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const repos = (await res.json()).filter(r => !r.fork && !isSiteRepo(r.name));
    if (!Array.isArray(repos) || !repos.length) throw new Error('empty');

    const curated = new Map(SNAPSHOT.map(p => [p.name.toLowerCase(), p]));

    projects = repos.map(r => {
      const c = curated.get(r.name.toLowerCase());
      return {
        name: r.name,
        full: c ? c.full : null,
        url: r.html_url,
        // курируемые поля остаются, если репозиторий уже описан
        lang: c ? c.lang : (r.language || 'Прочее'),
        short: c ? c.short : null,
        bucket: c ? c.bucket : bucketOf(r.language),
        desc: c ? c.desc : (r.description || 'Репозиторий на GitHub — загляните внутрь.'),
        tags: c ? c.tags : [],
        beta: c ? c.beta : false,
        // скрин и иконка живут только в курируемом снимке
        shot: c ? c.shot : null,
        icon: c ? c.icon : null,
        stars: r.stargazers_count,
        forks: r.forks_count,
        license: r.license ? r.license.spdx_id : null,
        pushed: r.pushed_at,
        created: r.created_at,
      };
    });

    renderAll();

    if (note) {
      note.className = 'stats-note ok';
      note.textContent = `● Данные обновлены с GitHub · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
  } catch (err) {
    clearTimeout(timer);
    if (note) {
      note.className = 'stats-note off';
      note.textContent = '○ Показан локальный снимок — GitHub API недоступен';
    }
  }
}

/* пересчёт статистики */
function updateStats() {
  const stars = projects.reduce((s, p) => s + (p.stars || 0), 0);
  const langs = new Set(projects.map(p => p.lang)).size;
  counters.set({ repos: projects.length, stars, langs });
}

/* ═══════════════════════════════════════════════════════════
   ФИНАЛ
   ═══════════════════════════════════════════════════════════ */
function renderAll() {
  buildChips();
  renderProjects();
  buildAboutChips();
  updateStats();
}

function year() {
  const el = $('#year');
  if (el) el.textContent = new Date().getFullYear();
}

renderAll();
year();
loadFromGitHub();

})();

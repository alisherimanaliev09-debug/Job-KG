/* ==========================================================================
   JobKG — ядро приложения
   • утилиты DOM (без innerHTML для пользовательских данных)
   • иконки SVG, форматирование, localStorage, toast
   • загрузка данных, избранное, шапка/футер, мобильное меню
   • запуск страничных модулей: JobKG.pages[<data-page>] = function () {...}
   Подключается после i18n.js и до страничных модулей.
   ========================================================================== */
(function () {
  'use strict';

  const JobKG = (window.JobKG = window.JobKG || {});
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);

  /* ---------- DOM-хелперы ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Создаёт элемент. Текст всегда вставляется как текст (безопасно). */
  function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  }

  /** Элемент с переводимым текстом (обновляется при смене языка). */
  function tEl(tag, key, props = {}, ...kids) {
    return el(tag, Object.assign({ 'data-i18n': key }, props), t(key), ...kids);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /* ---------- Иконки (статичные строки — безопасно) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    heart: '<path d="M12 20s-7-4.5-9-9.2C1.8 7.5 3.9 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.1 0 5.2 3 4 6.3C19 15.5 12 20 12 20z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.6 4 2.2 4 5"/>',
    code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    pen: '<path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="m14 7 3 3"/>',
    megaphone: '<path d="M4 10v4h3l8 4V6L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="m8 15 4-4 3 3 5-6"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    plane: '<path d="M3 11l18-7-6 16-3-7z"/><path d="m12 13 9-9"/>',
    truck: '<rect x="2" y="7" width="12" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    hardhat: '<path d="M3 17h18v2H3zM5 17a7 7 0 0 1 14 0M12 6v5"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M2 19h20"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  };
  const CATEGORY_ICON = {
    it: 'laptop', programming: 'code', webdev: 'globe', design: 'pen', marketing: 'megaphone', smm: 'users',
    sales: 'chart', education: 'cap', accounting: 'calc', admin: 'briefcase', 'customer-service': 'headset',
    tourism: 'plane', logistics: 'truck', construction: 'hardhat', students: 'book',
  };

  function icon(name, cls) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (cls) svg.setAttribute('class', cls);
    svg.innerHTML = ICONS[name] || ''; // только статичные строки из ICONS
    return svg;
  }

  /* ---------- localStorage (безопасные обёртки) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  };

  /* ---------- Форматирование ---------- */
  const locale = () => (i18n.lang() === 'kg' ? 'ky-KG' : 'ru-RU');
  function fmtNumber(n) {
    try { return new Intl.NumberFormat('ru-RU').format(n); } catch (e) { return String(n); }
  }
  function fmtSalary(job) {
    const { salaryFrom: a, salaryTo: b } = job;
    if (!a && !b) return t('salary.negotiable');
    const unit = t('salary.unit');
    if (a && b && a !== b) return t('salary.range', { from: fmtNumber(a), to: fmtNumber(b), unit });
    if (a && !b) return t('salary.from', { v: fmtNumber(a), unit });
    if (!a && b) return t('salary.to', { v: fmtNumber(b), unit });
    return `${fmtNumber(a)} ${unit}`;
  }
  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    try { return new Intl.DateTimeFormat(locale(), opts).format(d); }
    catch (e) { return new Intl.DateTimeFormat('ru-RU', opts).format(d); }
  }
  function daysSince(iso) {
    return Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  }
  const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

  /* ---------- Toast ---------- */
  function toast(message) {
    let host = $('.toast-host');
    if (!host) {
      host = el('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
      document.body.append(host);
    }
    const node = el('div', { class: 'toast', text: message });
    host.append(node);
    setTimeout(() => node.remove(), 3600);
  }

  /* ---------- Данные ---------- */
  const cache = {};
  async function loadJSON(name) {
    if (!cache[name]) {
      cache[name] = fetch(`data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
        return r.json();
      });
    }
    return cache[name];
  }
  const data = {
    jobs: () => loadJSON('jobs'),
    companies: () => loadJSON('companies'),
    articles: () => loadJSON('articles'),
    /** Загружает всё сразу и строит индекс компаний. */
    async all() {
      const [jobs, companies, articles] = await Promise.all([loadJSON('jobs'), loadJSON('companies'), loadJSON('articles')]);
      const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));
      return { jobs, companies, articles, companyById };
    },
  };
  /** Показывает понятную ошибку, если данные не загрузились (например, при открытии через file://). */
  function showLoadError(container) {
    clear(container).append(
      el('div', { class: 'notice notice-err', role: 'alert' }, icon('alert'),
        el('div', {}, tEl('p', 'err.load', {}), tEl('p', 'err.load.hint', { class: 'text-sm' }))
      )
    );
  }

  /* ---------- Избранное (LocalStorage, только на этом устройстве) ---------- */
  const FAV_KEY = 'jobkg.favorites';
  const favorites = {
    ids: () => store.get(FAV_KEY, []).filter((x) => typeof x === 'string'),
    has: (id) => favorites.ids().includes(id),
    toggle(id) {
      const ids = favorites.ids();
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.push(id);
      store.set(FAV_KEY, ids);
      syncFavorites();
      document.dispatchEvent(new CustomEvent('jobkg:favchange', { detail: { id, active: i < 0 } }));
      return i < 0;
    },
  };
  function syncFavorites() {
    const ids = favorites.ids();
    const badge = $('#fav-count');
    if (badge) { badge.textContent = ids.length; badge.hidden = ids.length === 0; }
    $$('.fav-btn[data-job]').forEach((b) => {
      const on = ids.includes(b.dataset.job);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', t(on ? 'fav.remove' : 'fav.add'));
      b.title = t(on ? 'fav.remove' : 'fav.add');
    });
  }
  /** Кнопка «в избранное» для вакансии. */
  function favButton(jobId, extraClass = '') {
    const b = el('button', { type: 'button', class: `icon-btn fav-btn ${extraClass}`.trim(), dataset: { job: jobId }, 'aria-pressed': 'false' }, icon('heart'));
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const on = favorites.toggle(jobId);
      toast(t(on ? 'fav.added' : 'fav.removed'));
    });
    b.setAttribute('aria-pressed', favorites.has(jobId) ? 'true' : 'false');
    return b;
  }

  /* ---------- Шапка и футер ---------- */
  const NAV = [
    ['home', 'index.html', 'nav.home'],
    ['jobs', 'jobs.html', 'nav.jobs'],
    ['companies', 'companies.html', 'nav.companies'],
    ['advice', 'career-advice.html', 'nav.advice'],
    ['about', 'about.html', 'nav.about'],
  ];

  function langSwitch() {
    const wrap = el('div', { class: 'lang-switch', role: 'group', 'data-i18n-aria-label': 'nav.language', 'aria-label': t('nav.language') });
    i18n.supported.forEach((code) => {
      wrap.append(el('button', {
        type: 'button', dataset: { lang: code }, 'aria-pressed': code === i18n.lang() ? 'true' : 'false',
        lang: code === 'kg' ? 'ky' : code, onclick: () => i18n.setLang(code),
      }, code.toUpperCase()));
    });
    return wrap;
  }

  function renderHeader(host) {
    const current = document.body.dataset.nav || '';
    const nav = el('nav', { class: 'nav', id: 'site-nav', 'data-i18n-aria-label': 'nav.main', 'aria-label': t('nav.main') });
    NAV.forEach(([id, href, key]) => {
      const a = el('a', { href, 'data-i18n': key }, t(key));
      if (id === current) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
    nav.append(el('div', { class: 'header-actions__mobile' },
      langSwitch(),
      el('a', { class: 'btn', href: 'login.html', 'data-i18n': 'nav.login' }, t('nav.login')),
      el('a', { class: 'btn btn-primary', href: 'post-job.html', 'data-i18n': 'nav.post' }, t('nav.post'))
    ));

    const toggle = el('button', {
      type: 'button', class: 'icon-btn menu-toggle', 'aria-expanded': 'false', 'aria-controls': 'site-nav',
      'data-i18n-aria-label': 'nav.menu', 'aria-label': t('nav.menu'),
    }, icon('menu'));

    const favLink = el('a', { class: 'icon-btn fav-link', href: 'favorites.html', 'data-i18n-aria-label': 'nav.favorites', 'aria-label': t('nav.favorites'), 'data-i18n-title': 'nav.favorites', title: t('nav.favorites') },
      icon('heart'), el('span', { class: 'fav-count', id: 'fav-count', hidden: true }, '0'));

    const header = el('header', { class: 'site-header' },
      el('div', { class: 'container header-inner' },
        el('a', { class: 'brand', href: 'index.html', 'data-i18n-aria-label': 'nav.brand', 'aria-label': t('nav.brand') },
          el('img', { src: 'assets/images/logo-full-sm.png', alt: 'JobKG', width: 380, height: 143 })),
        nav,
        el('div', { class: 'header-actions' },
          el('div', { class: 'header-actions header-actions__desktop' },
            langSwitch(),
            el('a', { class: 'btn btn-ghost', href: 'login.html', 'data-i18n': 'nav.login' }, t('nav.login')),
            el('a', { class: 'btn btn-primary', href: 'post-job.html', 'data-i18n': 'nav.post' }, t('nav.post'))),
          favLink, toggle)
      )
    );
    const banner = el('div', { class: 'demo-banner', role: 'note', 'data-i18n': 'demo.banner' }, t('demo.banner'));
    clear(host).append(header, banner);

    // мобильное меню
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.replaceChildren(icon(open ? 'x' : 'menu'));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
    document.addEventListener('click', (e) => { if (nav.classList.contains('is-open') && !header.contains(e.target)) setOpen(false); });
    window.matchMedia('(min-width: 1201px)').addEventListener('change', () => setOpen(false));
  }

  function renderFooter(host) {
    const col = (titleKey, links) => el('div', {},
      tEl('h3', titleKey),
      el('ul', {}, links.map(([href, key]) => el('li', {}, el('a', { href, 'data-i18n': key }, t(key))))));
    clear(host).append(
      el('footer', { class: 'site-footer' },
        el('div', { class: 'container' },
          el('div', { class: 'footer-grid' },
            el('div', { class: 'footer-brand' },
              el('img', { src: 'assets/images/logo-full-sm.png', alt: 'JobKG', width: 380, height: 143, loading: 'lazy' }),
              tEl('p', 'foot.about')),
            col('foot.seekers', [['jobs.html', 'nav.jobs'], ['students.html', 'foot.students'], ['favorites.html', 'nav.favorites'], ['career-advice.html', 'nav.advice']]),
            col('foot.employers', [['post-job.html', 'nav.post'], ['employers.html', 'foot.forEmployers'], ['companies.html', 'nav.companies']]),
            col('foot.project', [['about.html', 'nav.about'], ['contact.html', 'foot.contacts'], ['login.html', 'nav.login'], ['register.html', 'nav.register']])
          ),
          el('div', { class: 'footer-bottom' },
            el('span', { 'data-i18n': 'foot.copy' }, t('foot.copy')),
            el('span', { class: 'ph' },
              el('span', { 'data-i18n': 'foot.privacy' }, t('foot.privacy')), ' · ',
              el('span', { 'data-i18n': 'foot.terms' }, t('foot.terms'))))
        )
      )
    );
  }

  /* ---------- Общие элементы интерфейса ---------- */
  function badge(text, cls = '') { return el('span', { class: `badge ${cls}`.trim(), text }); }
  function demoBadge() { return el('span', { class: 'badge badge-warn', 'data-i18n': 'demo.badge' }, t('demo.badge')); }
  function logoPlaceholder(company, size = '') {
    return el('span', { class: `logo-ph ${size}`.trim(), 'aria-hidden': 'true', style: `--logo-fg:${company.logoFg};--logo-bg:${company.logoBg}` }, initial(company.name));
  }
  function emptyState(titleKey, textKey, actionNode) {
    return el('div', { class: 'empty' }, icon('search'), tEl('h3', titleKey), tEl('p', textKey), actionNode);
  }
  function noticeNode(kind, key, iconName = 'info') {
    return el('div', { class: `notice notice-${kind}`, role: kind === 'err' ? 'alert' : 'note' }, icon(iconName), tEl('p', key));
  }
  function showNotice(host, kind, key) { clear(host).append(noticeNode(kind, key, kind === 'ok' ? 'checkCircle' : kind === 'err' ? 'alert' : 'info')); }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  /** Валидация поля: показывает сообщение об ошибке рядом с полем. */
  function setFieldError(input, messageKey) {
    const field = input.closest('.field');
    const err = field && field.querySelector('.error');
    input.classList.toggle('is-invalid', !!messageKey);
    if (messageKey) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (err) { err.textContent = messageKey ? t(messageKey) : ''; if (messageKey) err.setAttribute('data-i18n', messageKey); else err.removeAttribute('data-i18n'); }
  }

  /** Строка формы: подпись + поле + подсказка + место для ошибки. */
  function fieldRow(id, labelKey, input, opts = {}) {
    input.setAttribute('aria-describedby', `${id}-err`);
    if (opts.required) input.setAttribute('aria-required', 'true');
    return el('div', { class: `field${opts.full ? ' full' : ''}` },
      el('label', { for: id }, el('span', { 'data-i18n': labelKey }, t(labelKey)), opts.required ? el('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null),
      input,
      opts.hintKey ? el('span', { class: 'hint', 'data-i18n': opts.hintKey }, t(opts.hintKey)) : null,
      el('span', { class: 'error', id: `${id}-err`, 'aria-live': 'polite' }));
  }
  /** Заполняет <select> значениями справочника (первый пункт — «любой»/placeholder). */
  function fillSelect(sel, type, ids, placeholderKey) {
    const cur = sel.value;
    clear(sel);
    if (placeholderKey) sel.append(el('option', { value: '', text: t(placeholderKey) }));
    ids.forEach((id) => sel.append(el('option', { value: id, text: JobKG.label(type, id) })));
    sel.value = cur;
  }

  /* ---------- Запуск ---------- */
  JobKG.pages = JobKG.pages || {};
  JobKG.renderers = [];
  Object.assign(JobKG, {
    $, $$, el, tEl, clear, icon, ICONS, CATEGORY_ICON, store, fmtNumber, fmtSalary, fmtDate, daysSince, initial,
    toast, data, showLoadError, favorites, syncFavorites, favButton, badge, demoBadge, logoPlaceholder, emptyState,
    noticeNode, showNotice, setFieldError, EMAIL_RE, fieldRow, fillSelect,
    /** Страничный модуль регистрирует функцию перерисовки (вызывается при смене языка). */
    onRender(fn) { JobKG.renderers.push(fn); },
  });

  function boot() {
    const h = $('#site-header'); const f = $('#site-footer');
    if (h) renderHeader(h);
    if (f) renderFooter(f);
    i18n.apply(document);
    syncFavorites();
    const page = document.body.dataset.page;
    if (page && typeof JobKG.pages[page] === 'function') {
      try { JobKG.pages[page](); } catch (e) { console.error(`[JobKG] ошибка страницы «${page}»:`, e); }
    }
    document.addEventListener('jobkg:langchange', () => {
      $$('.lang-switch button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === i18n.lang() ? 'true' : 'false'));
      JobKG.renderers.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      i18n.apply(document);
      syncFavorites();
    });
  }
  // Скрипты подключены с defer: к моменту их выполнения readyState уже «interactive»,
  // но DOMContentLoaded ещё не наступил — ждём его, чтобы все страничные модули успели загрузиться.
  if (document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();

/* ==========================================================================
   JobKG — перечисления, поиск, фильтры, сортировка и страница каталога
   Страница: jobs.html  (data-page="jobs")
   Состояние фильтров хранится в адресной строке (?q=&city=&cat=...), поэтому
   ссылки на поиск можно копировать и открывать повторно.
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, $$, el, tEl, clear, icon } = JobKG;
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);

  /* ---------- Справочники (id → перевод по ключам city.*, cat.*, etype.*, fmt.*, exp.*) ---------- */
  const enums = {
    // Чтобы добавить город, достаточно добавить id сюда и ключ city.<id> в i18n.js
    city: ['bishkek', 'osh', 'jalal-abad', 'karakol', 'tokmok', 'balykchy', 'naryn', 'talas', 'batken', 'kant'],
    category: ['it', 'programming', 'webdev', 'design', 'marketing', 'smm', 'sales', 'education', 'accounting', 'admin', 'customer-service', 'tourism', 'logistics', 'construction', 'students'],
    employment: ['full', 'part', 'internship', 'temporary', 'project', 'remote'],
    format: ['office', 'remote', 'hybrid'],
    experience: ['none', 'lt1', '1to3', '3to5', '5plus'],
  };
  const PREFIX = { city: 'city', category: 'cat', employment: 'etype', format: 'fmt', experience: 'exp' };
  const label = (type, id) => t(`${PREFIX[type]}.${id}`);

  /* ---------- Подборки для студентов ---------- */
  const collections = {
    'first-job': { icon: 'briefcase', test: (j) => j.experience === 'none' },
    internships: { icon: 'cap', test: (j) => j.employment === 'internship' },
    'student-parttime': { icon: 'book', test: (j) => j.category === 'students' || j.tags.includes('student-parttime') },
    'it-start': { icon: 'code', test: (j) => j.tags.includes('it-start') },
    remote: { icon: 'laptop', test: (j) => j.format === 'remote' || j.employment === 'remote' },
    flexible: { icon: 'clock', test: (j) => j.tags.includes('flexible') },
  };

  /* ---------- Поиск ---------- */
  const norm = (s) => String(s || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
  // группы синонимов: запрос «программист» найдёт и «разработчик»
  const SYNONYMS = [
    ['программист', 'разработчик', 'developer', 'программир'],
    ['дизайнер', 'designer'],
    ['менеджер', 'manager'],
  ];
  const tokenGroup = (tok) => {
    for (const g of SYNONYMS) {
      if (g.some((w) => (tok.length >= 3 && w.startsWith(tok)) || tok.startsWith(w))) return [tok, ...g].map(norm);
    }
    return [tok];
  };

  const haystackCache = new Map();
  function haystack(job, company) {
    const key = job.id + i18n.lang();
    if (!haystackCache.has(key)) {
      const ru = i18n.dict.ru;
      const parts = [job.title, company ? company.name : '', job.skills.join(' '), job.summary,
        label('category', job.category), ru[`cat.${job.category}`], label('city', job.city), ru[`city.${job.city}`]];
      haystackCache.set(key, norm(parts.join(' ')));
    }
    return haystackCache.get(key);
  }

  const salaryOf = (j) => j.salaryTo || j.salaryFrom || 0;

  /** Применяет фильтры. f: {q, city, cat, emp, fmt, exp, min, collection} */
  function applyFilters(jobs, f, companyById) {
    const tokens = norm(f.q).split(/\s+/).filter(Boolean).map(tokenGroup);
    const min = Number(f.min) || 0;
    const col = f.collection && collections[f.collection];
    return jobs.filter((j) => {
      if (f.city && j.city !== f.city) return false;
      if (f.cat && j.category !== f.cat) return false;
      if (f.emp && j.employment !== f.emp) return false;
      if (f.fmt && j.format !== f.fmt) return false;
      if (f.exp && j.experience !== f.exp) return false;
      if (min > 0 && salaryOf(j) < min) return false; // без указанной зарплаты — не подходит под фильтр
      if (col && !col.test(j)) return false;
      if (tokens.length) {
        const h = haystack(j, companyById[j.companyId]);
        if (!tokens.every((group) => group.some((w) => h.includes(w)))) return false;
      }
      return true;
    });
  }

  function sortJobs(list, sort) {
    const arr = list.slice();
    if (sort === 'salary-desc') arr.sort((a, b) => (salaryOf(b) || -1) - (salaryOf(a) || -1) || b.postedAt.localeCompare(a.postedAt));
    else if (sort === 'salary-asc') arr.sort((a, b) => (salaryOf(a) || Infinity) - (salaryOf(b) || Infinity) || b.postedAt.localeCompare(a.postedAt));
    else arr.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    return arr;
  }

  JobKG.enums = enums;
  JobKG.label = label;
  JobKG.collections = collections;
  JobKG.filters = { applyFilters, sortJobs, norm };

  /* ---------- Страница каталога ---------- */
  const FIELDS = ['q', 'city', 'cat', 'emp', 'fmt', 'exp', 'min', 'sort', 'collection'];
  const FILTER_LABEL = { city: 'jobs.f.city', cat: 'jobs.f.category', emp: 'jobs.f.employment', fmt: 'jobs.f.format', exp: 'jobs.f.experience' };
  const FILTER_TYPE = { city: 'city', cat: 'category', emp: 'employment', fmt: 'format', exp: 'experience' };

  JobKG.pages.jobs = async function () {
    const form = $('#filters-form');
    const listHost = $('#job-list');
    const countHost = $('#results-count');
    const activeHost = $('#active-filters');
    const panel = $('#filters-panel');
    const backdrop = $('#filters-backdrop');
    const toggleBtn = $('#filters-toggle');

    const state = Object.fromEntries(FIELDS.map((k) => [k, '']));
    const params = new URLSearchParams(location.search);
    FIELDS.forEach((k) => { if (params.has(k)) state[k] = params.get(k); });
    if (!state.sort) state.sort = 'date';
    if (state.collection && !collections[state.collection]) state.collection = '';

    // выпадающие списки
    const selects = { city: $('#f-city'), cat: $('#f-cat'), emp: $('#f-emp'), fmt: $('#f-fmt'), exp: $('#f-exp') };
    function fillSelects() {
      for (const [key, sel] of Object.entries(selects)) {
        const type = FILTER_TYPE[key];
        clear(sel).append(el('option', { value: '', text: t('jobs.any') }));
        enums[type].forEach((id) => sel.append(el('option', { value: id, text: label(type, id) })));
        sel.value = state[key];
      }
      const sort = $('#f-sort');
      clear(sort);
      [['date', 'jobs.sort.date'], ['salary-desc', 'jobs.sort.salaryDesc'], ['salary-asc', 'jobs.sort.salaryAsc']]
        .forEach(([v, k]) => sort.append(el('option', { value: v, text: t(k) })));
      sort.value = state.sort;
    }
    fillSelects();
    $('#f-q').value = state.q;
    $('#f-min').value = state.min;

    let ctx = null;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(listHost); countHost.textContent = ''; return; }

    function syncUrl() {
      const p = new URLSearchParams();
      FIELDS.forEach((k) => { if (state[k] && !(k === 'sort' && state[k] === 'date')) p.set(k, state[k]); });
      const qs = p.toString();
      history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function renderActive() {
      clear(activeHost);
      const chip = (text, onRemove) => el('button', { type: 'button', class: 'chip', 'aria-label': `${t('jobs.removeFilter')}: ${text}`, onclick: onRemove }, text, ' ', icon('x'));
      if (state.collection) {
        activeHost.append(chip(t(`col.${state.collection}.title`), () => { state.collection = ''; run(); }));
      }
      Object.keys(FILTER_LABEL).forEach((k) => {
        if (state[k]) activeHost.append(chip(label(FILTER_TYPE[k], state[k]), () => { state[k] = ''; selects[k].value = ''; run(); }));
      });
      if (state.min) activeHost.append(chip(t('jobs.f.minChip', { v: JobKG.fmtNumber(Number(state.min)) }), () => { state.min = ''; $('#f-min').value = ''; run(); }));
    }
    // чипы с иконкой: небольшая правка размера
    function render() {
      const found = sortJobs(applyFilters(ctx.jobs, state, ctx.companyById), state.sort);
      countHost.textContent = i18n.tn('jobs.found', found.length);
      clear(listHost);
      if (!found.length) {
        listHost.classList.add('job-list--1');
        listHost.append(JobKG.emptyState('jobs.empty.title', 'jobs.empty.text',
          el('button', { type: 'button', class: 'btn btn-primary', 'data-i18n': 'jobs.reset', onclick: reset }, t('jobs.reset'))));
      } else {
        listHost.classList.remove('job-list--1');
        found.forEach((j) => listHost.append(JobKG.ui.jobCard(j, ctx.companyById[j.companyId])));
      }
      renderActive();
      JobKG.syncFavorites();
    }
    function run() { syncUrl(); render(); }
    function reset() {
      FIELDS.forEach((k) => { state[k] = ''; });
      state.sort = 'date';
      form.reset();
      fillSelects();
      $('#f-q').value = ''; $('#f-min').value = '';
      run();
    }

    // события
    let timer;
    $('#f-q').addEventListener('input', (e) => { state.q = e.target.value; clearTimeout(timer); timer = setTimeout(run, 160); });
    $('#f-min').addEventListener('input', (e) => { state.min = e.target.value.replace(/[^\d]/g, ''); clearTimeout(timer); timer = setTimeout(run, 200); });
    Object.entries(selects).forEach(([k, sel]) => sel.addEventListener('change', () => { state[k] = sel.value; run(); }));
    $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; run(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); run(); closePanel(); });
    $('#filters-reset').addEventListener('click', reset);

    // мобильная панель фильтров
    function openPanel() { panel.classList.add('is-open'); backdrop.hidden = false; document.body.classList.add('no-scroll'); toggleBtn.setAttribute('aria-expanded', 'true'); $('#f-q').focus(); }
    function closePanel() { panel.classList.remove('is-open'); backdrop.hidden = true; document.body.classList.remove('no-scroll'); toggleBtn.setAttribute('aria-expanded', 'false'); }
    toggleBtn.addEventListener('click', openPanel);
    backdrop.addEventListener('click', closePanel);
    $('#filters-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    JobKG.onRender(() => { fillSelects(); render(); });
    render();
  };
})();

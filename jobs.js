/* ==========================================================================
   JobKG — вакансии: карточки, главная, страница вакансии, избранное,
   раздел «Работа без опыта», форма отклика (демо)
   Страницы: index.html (home), job-details.html (job), favorites.html,
   students.html (students)
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, $$, el, tEl, clear, icon, store } = JobKG;
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);
  const label = (type, id) => JobKG.label(type, id);
  const jobUrl = (id) => `job-details.html?id=${encodeURIComponent(id)}`;

  JobKG.ui = JobKG.ui || {};

  /* ---------- Карточка вакансии ---------- */
  function jobCard(job, company) {
    const isNew = JobKG.daysSince(job.postedAt) <= 3;
    return el('article', { class: 'card card-hover job-card' },
      el('div', { class: 'job-card__top' },
        company ? JobKG.logoPlaceholder(company) : null,
        el('div', { class: 'job-card__body' },
          el('h3', { class: 'job-card__title' }, el('a', { href: jobUrl(job.id), text: job.title })),
          el('p', { class: 'job-card__company', text: company ? company.name : '' }))),
      el('p', { class: 'job-card__salary', text: JobKG.fmtSalary(job) }),
      el('div', { class: 'job-card__meta' },
        JobKG.badge(label('city', job.city)),
        JobKG.badge(label('employment', job.employment), 'badge-blue'),
        JobKG.badge(label('format', job.format)),
        JobKG.badge(label('experience', job.experience)),
        isNew ? el('span', { class: 'badge badge-green', 'data-i18n': 'job.new' }, t('job.new')) : null,
        JobKG.demoBadge()),
      el('p', { class: 'job-card__summary', text: job.summary }),
      el('div', { class: 'job-card__foot' },
        el('span', { class: 'job-card__date', text: JobKG.fmtDate(job.postedAt) }),
        el('div', { class: 'job-card__actions' },
          JobKG.favButton(job.id),
          el('a', { class: 'btn btn-soft btn-sm', href: jobUrl(job.id), 'data-i18n': 'job.more' }, t('job.more'))))
    );
  }
  JobKG.ui.jobCard = jobCard;
  JobKG.ui.jobUrl = jobUrl;

  const countBy = (jobs, fn) => jobs.reduce((m, j) => { const k = fn(j); m[k] = (m[k] || 0) + 1; return m; }, {});

  /* ---------- Главная ---------- */
  JobKG.pages.home = async function () {
    const form = $('#hero-search');
    const citySel = $('#hero-city');
    function fillCities() {
      const cur = citySel.value;
      clear(citySel).append(el('option', { value: '', text: t('jobs.allCities') }));
      JobKG.enums.city.forEach((id) => citySel.append(el('option', { value: id, text: label('city', id) })));
      citySel.value = cur;
    }
    fillCities();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      const q = $('#hero-q').value.trim();
      if (q) p.set('q', q);
      if (citySel.value) p.set('city', citySel.value);
      location.href = `jobs.html${p.toString() ? `?${p}` : ''}`;
    });

    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); ['#home-popular', '#home-new', '#home-categories', '#home-collections', '#home-articles'].forEach((s) => JobKG.showLoadError($(s))); return; }

    function render() {
      fillCities();
      const { jobs, companyById } = ctx;
      // категории с вакансиями (реальные счётчики по демо-данным)
      const counts = countBy(jobs, (j) => j.category);
      const cats = JobKG.enums.category.filter((c) => counts[c]).sort((a, b) => counts[b] - counts[a]).slice(0, 8);
      const catHost = clear($('#home-categories'));
      cats.forEach((c) => catHost.append(
        el('a', { class: 'card card-hover cat-card', href: `jobs.html?cat=${c}` },
          el('span', { class: 'cat-card__icon' }, icon(JobKG.CATEGORY_ICON[c] || 'briefcase')),
          el('span', {}, el('strong', { text: label('category', c) }), el('span', { class: 'count', text: i18n.tn('home.vacancies', counts[c]) })))));

      const popular = jobs.filter((j) => j.salaryTo).sort((a, b) => b.salaryTo - a.salaryTo).slice(0, 6);
      const fresh = jobs.slice().sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, 6);
      const fill = (sel, list) => { const h = clear($(sel)); list.forEach((j) => h.append(jobCard(j, companyById[j.companyId]))); };
      fill('#home-popular', popular);
      fill('#home-new', fresh);

      const colHost = clear($('#home-collections'));
      Object.entries(JobKG.collections).forEach(([id, c]) => {
        const n = jobs.filter(c.test).length;
        colHost.append(el('a', { class: 'card card-hover collection', href: `jobs.html?collection=${id}` },
          el('span', { class: 'cat-card__icon' }, icon(c.icon)),
          el('h3', { text: t(`col.${id}.title`) }),
          el('p', { text: t(`col.${id}.text`) }),
          el('span', { class: 'count', text: i18n.tn('home.vacancies', n) })));
      });

      const artHost = clear($('#home-articles'));
      ctx.articles.slice(0, 3).forEach((a) => artHost.append(JobKG.ui.articleCard(a)));
      JobKG.syncFavorites();
    }
    JobKG.onRender(render);
    render();
  };

  /* ---------- Форма отклика (демонстрационная) ---------- */
  const APPL_KEY = 'jobkg.demo.applications';
  function buildApplyForm(job) {
    const field = (id, labelKey, input, opts = {}) => el('div', { class: 'field' },
      el('label', { for: id }, el('span', { 'data-i18n': labelKey }, t(labelKey)), opts.required ? el('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null),
      input,
      opts.hintKey ? el('span', { class: 'hint', 'data-i18n': opts.hintKey }, t(opts.hintKey)) : null,
      el('span', { class: 'error', id: `${id}-err`, 'aria-live': 'polite' }));

    const name = el('input', { class: 'input', id: 'ap-name', name: 'name', type: 'text', autocomplete: 'name', required: true, maxlength: 100 });
    const email = el('input', { class: 'input', id: 'ap-email', name: 'email', type: 'email', autocomplete: 'email', required: true, maxlength: 120 });
    const phone = el('input', { class: 'input', id: 'ap-phone', name: 'phone', type: 'tel', autocomplete: 'tel', maxlength: 30 });
    const letter = el('textarea', { class: 'textarea', id: 'ap-letter', name: 'letter', maxlength: 2000, rows: 5 });
    const result = el('div', { id: 'ap-result', tabindex: '-1' });

    const form = el('form', { class: 'apply-form', novalidate: true },
      el('div', { class: 'notice notice-warn mb-4' }, icon('alert'), tEl('p', 'apply.demoNotice')),
      field('ap-name', 'apply.name', name, { required: true }),
      field('ap-email', 'apply.email', email, { required: true }),
      field('ap-phone', 'apply.phone', phone, { hintKey: 'apply.phoneHint' }),
      field('ap-letter', 'apply.letter', letter, { hintKey: 'apply.letterHint' }),
      el('button', { class: 'btn btn-primary btn-block', type: 'submit', 'data-i18n': 'apply.submit' }, t('apply.submit')),
      result);

    function validate() {
      let ok = true;
      const v = (input, key) => { JobKG.setFieldError(input, key); if (key) ok = false; };
      v(name, name.value.trim().length < 2 ? 'form.required' : '');
      v(email, !email.value.trim() ? 'form.required' : (!JobKG.EMAIL_RE.test(email.value.trim()) ? 'form.email' : ''));
      v(phone, phone.value.trim() && !/^\+?[\d\s()\-]{7,20}$/.test(phone.value.trim()) ? 'form.phone' : '');
      v(letter, letter.value.length > 2000 ? 'form.tooLong' : '');
      return ok;
    }
    [name, email, phone, letter].forEach((i) => i.addEventListener('blur', validate));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) { const bad = $('.is-invalid', form); if (bad) bad.focus(); return; }
      // В демо-режиме данные НЕ передаются на сервер и НЕ сохраняются. Запоминаем только факт демо-отклика (id вакансии и дату).
      const list = store.get(APPL_KEY, []);
      list.unshift({ jobId: job.id, at: new Date().toISOString() });
      store.set(APPL_KEY, list.slice(0, 50));
      form.reset();
      clear(result).append(JobKG.noticeNode('info', 'apply.demoDone', 'info'));
      result.firstChild.classList.add('mt-4');
      result.focus();
    });
    return form;
  }

  /* ---------- Страница вакансии ---------- */
  JobKG.pages.job = async function () {
    const root = $('#job-root');
    const id = new URLSearchParams(location.search).get('id');
    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(root); return; }
    const job = ctx.jobs.find((j) => j.id === id);
    const notFound = () => clear(root).append(el('div', { class: 'container section' },
      JobKG.emptyState('job.notFound.title', 'job.notFound.text', el('a', { class: 'btn btn-primary', href: 'jobs.html', 'data-i18n': 'job.backToList' }, t('job.backToList')))));
    if (!job) { document.title = `${t('job.notFound.title')} — JobKG`; notFound(); return; }
    const company = ctx.companyById[job.companyId];
    document.title = `${job.title} — JobKG`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', `${job.title}, ${company.name}. ${job.summary}`);

    const applyForm = buildApplyForm(job); // создаётся один раз, чтобы смена языка не стирала ввод

    const section = (titleKey, content) => el('section', { class: 'card job-section' }, tEl('h2', titleKey), content);
    const list = (items) => el('ul', { class: 'bullets' }, items.map((x) => el('li', { text: x })));

    function render() {
      const similar = ctx.jobs.filter((j) => j.id !== job.id)
        .map((j) => ({ j, score: (j.category === job.category ? 2 : 0) + (j.companyId === job.companyId ? 1 : 0) + (j.city === job.city ? 0.5 : 0) }))
        .filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.j.postedAt.localeCompare(a.j.postedAt)).slice(0, 3).map((x) => x.j);

      clear(root).append(
        el('div', { class: 'page-head' }, el('div', { class: 'container' },
          el('ol', { class: 'breadcrumbs' },
            el('li', {}, el('a', { href: 'index.html', 'data-i18n': 'nav.home' }, t('nav.home'))),
            el('li', {}, el('a', { href: 'jobs.html', 'data-i18n': 'nav.jobs' }, t('nav.jobs'))),
            el('li', { 'aria-current': 'page', text: job.title })))),
        el('div', { class: 'container job-layout' },
          el('div', {},
            el('section', { class: 'card job-hero' },
              el('div', { class: 'job-hero__top' },
                JobKG.logoPlaceholder(company, 'lg'),
                el('div', {},
                  el('h1', { text: job.title }),
                  el('p', { class: 'text-muted mb-0' }, el('a', { href: `company-details.html?id=${company.id}`, text: company.name }), ` · ${label('city', job.city)}`))),
              el('p', { class: 'job-hero__salary', text: JobKG.fmtSalary(job) }),
              el('div', { class: 'job-card__meta' },
                JobKG.badge(label('employment', job.employment), 'badge-blue'), JobKG.badge(label('format', job.format)),
                JobKG.badge(label('experience', job.experience)), JobKG.demoBadge()),
              el('div', { class: 'job-hero__actions' },
                el('a', { class: 'btn btn-primary btn-lg', href: '#apply', 'data-i18n': 'job.apply' }, t('job.apply')),
                (() => { const b = JobKG.favButton(job.id, ''); b.classList.add('btn-lg'); b.style.width = '52px'; b.style.height = '52px'; return b; })())),
            section('job.description', el('p', { class: 'mb-0', text: job.summary })),
            section('job.responsibilities', list(job.responsibilities)),
            section('job.requirements', list(job.requirements)),
            section('job.conditions', list(job.conditions)),
            section('job.schedule', el('p', { class: 'mb-0', text: job.schedule })),
            section('job.skills', el('div', { class: 'chips' }, job.skills.map((s) => el('span', { class: 'badge badge-blue', text: s })))),
            section('job.aboutCompany', el('div', {},
              el('div', { class: 'row mb-4' }, JobKG.logoPlaceholder(company), el('strong', { text: company.name }), JobKG.demoBadge()),
              el('p', { text: company.description }),
              el('a', { class: 'link-arrow', href: `company-details.html?id=${company.id}` }, el('span', { 'data-i18n': 'job.allCompanyJobs' }, t('job.allCompanyJobs')), icon('arrow'))))),
          el('aside', { class: 'side-stack' },
            el('section', { class: 'card side-card' },
              tEl('h2', 'job.summaryTitle', { class: 'h4' }),
              el('dl', { class: 'facts' },
                fact('job.f.city', label('city', job.city)),
                fact('job.f.employment', label('employment', job.employment)),
                fact('job.f.format', label('format', job.format)),
                fact('job.f.experience', label('experience', job.experience)),
                fact('job.f.posted', JobKG.fmtDate(job.postedAt)))),
            el('section', { class: 'card side-card apply-card', id: 'apply' }, tEl('h2', 'apply.title'), applyForm))),
        el('section', { class: 'section section-alt' }, el('div', { class: 'container' },
          el('div', { class: 'section-head' }, tEl('h2', 'job.similar')),
          similar.length
            ? el('div', { class: 'grid grid-3' }, similar.map((j) => jobCard(j, ctx.companyById[j.companyId])))
            : tEl('p', 'job.noSimilar', { class: 'text-muted' })))
      );
      JobKG.syncFavorites();
    }
    function fact(key, value) { return el('div', {}, el('dt', { 'data-i18n': key }, t(key)), el('dd', { text: value })); }
    JobKG.onRender(render);
    render();
  };

  /* ---------- Избранное ---------- */
  JobKG.pages.favorites = async function () {
    const host = $('#fav-list');
    const countHost = $('#fav-total');
    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(host); return; }
    function render() {
      const ids = JobKG.favorites.ids();
      const jobs = ids.map((id) => ctx.jobs.find((j) => j.id === id)).filter(Boolean);
      countHost.textContent = i18n.tn('fav.count', jobs.length);
      clear(host);
      if (!jobs.length) {
        host.classList.add('job-list--1');
        host.append(JobKG.emptyState('fav.empty.title', 'fav.empty.text', el('a', { class: 'btn btn-primary', href: 'jobs.html', 'data-i18n': 'nav.jobs' }, t('nav.jobs'))));
      } else {
        host.classList.remove('job-list--1');
        jobs.forEach((j) => host.append(jobCard(j, ctx.companyById[j.companyId])));
      }
      JobKG.syncFavorites();
    }
    JobKG.onRender(render);
    document.addEventListener('jobkg:favchange', render);
    render();
  };

  /* ---------- Работа без опыта (для студентов) ---------- */
  JobKG.pages.students = async function () {
    const host = $('#students-collections');
    const artHost = $('#students-articles');
    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(host); return; }
    function render() {
      clear(host);
      Object.entries(JobKG.collections).forEach(([id, c]) => {
        const all = ctx.jobs.filter(c.test).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
        host.append(el('section', { class: 'section', id: `col-${id}` }, el('div', { class: 'container' },
          el('div', { class: 'section-head' },
            el('div', {}, el('h2', { text: t(`col.${id}.title`) }), el('p', { text: t(`col.${id}.text`) })),
            el('a', { class: 'link-arrow', href: `jobs.html?collection=${id}` }, el('span', { text: `${t('students.showAll')} (${all.length})` }), icon('arrow'))),
          all.length
            ? el('div', { class: 'grid grid-3' }, all.slice(0, 3).map((j) => jobCard(j, ctx.companyById[j.companyId])))
            : tEl('p', 'students.none', { class: 'text-muted' }))));
      });
      clear(artHost);
      ['first-resume', 'interview-prep', 'portfolio', 'find-internship'].forEach((aid) => {
        const a = ctx.articles.find((x) => x.id === aid);
        if (a) artHost.append(JobKG.ui.articleCard(a));
      });
      JobKG.syncFavorites();
    }
    JobKG.onRender(render);
    render();
  };
})();

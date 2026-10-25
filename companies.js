/* ==========================================================================
   JobKG — каталог компаний и страница компании
   Страницы: companies.html (companies), company-details.html (company-details)
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, el, tEl, clear, icon } = JobKG;
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);
  const norm = (s) => JobKG.filters.norm(s);

  function companyCard(c, jobCount) {
    return el('a', { class: 'card card-hover company-card', href: `company-details.html?id=${encodeURIComponent(c.id)}` },
      el('div', { class: 'company-card__top' },
        JobKG.logoPlaceholder(c),
        el('div', {}, el('h3', { text: c.name }),
          el('span', { class: 'text-xs text-muted', text: `${JobKG.label('category', c.industry)} · ${JobKG.label('city', c.city)}` }))),
      el('p', { text: c.description }),
      el('div', { class: 'company-card__foot' },
        el('strong', { text: i18n.tn('home.vacancies', jobCount) }),
        JobKG.demoBadge()));
  }

  JobKG.pages.companies = async function () {
    const host = $('#company-grid');
    const countHost = $('#company-count');
    const q = $('#c-q'); const citySel = $('#c-city'); const indSel = $('#c-ind');
    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(host); return; }
    const jobCounts = ctx.jobs.reduce((m, j) => { m[j.companyId] = (m[j.companyId] || 0) + 1; return m; }, {});

    function fillSelects() {
      const fill = (sel, type, ids) => {
        const cur = sel.value;
        clear(sel).append(el('option', { value: '', text: t('jobs.any') }));
        ids.forEach((id) => sel.append(el('option', { value: id, text: JobKG.label(type, id) })));
        sel.value = cur;
      };
      fill(citySel, 'city', JobKG.enums.city);
      fill(indSel, 'category', JobKG.enums.category);
    }
    function render() {
      fillSelects();
      const query = norm(q.value);
      const list = ctx.companies.filter((c) =>
        (!citySel.value || c.city === citySel.value) &&
        (!indSel.value || c.industry === indSel.value) &&
        (!query || norm(`${c.name} ${c.description} ${i18n.dict.ru['cat.' + c.industry]} ${JobKG.label('category', c.industry)}`).includes(query)));
      countHost.textContent = i18n.tn('companies.found', list.length);
      clear(host);
      if (!list.length) {
        host.classList.add('grid-1');
        host.append(JobKG.emptyState('companies.empty.title', 'companies.empty.text',
          el('button', { class: 'btn btn-primary', type: 'button', 'data-i18n': 'jobs.reset', onclick: () => { q.value = ''; citySel.value = ''; indSel.value = ''; render(); } }, t('jobs.reset'))));
      } else {
        host.classList.remove('grid-1');
        list.forEach((c) => host.append(companyCard(c, jobCounts[c.id] || 0)));
      }
    }
    let timer;
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 150); });
    citySel.addEventListener('change', render);
    indSel.addEventListener('change', render);
    $('#c-reset').addEventListener('click', () => { q.value = ''; citySel.value = ''; indSel.value = ''; render(); });
    JobKG.onRender(render);
    render();
  };

  JobKG.pages['company-details'] = async function () {
    const root = $('#company-root');
    const id = new URLSearchParams(location.search).get('id');
    let ctx;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); JobKG.showLoadError(root); return; }
    const c = ctx.companyById[id];
    if (!c) {
      document.title = `${t('company.notFound.title')} — JobKG`;
      clear(root).append(el('div', { class: 'container section' },
        JobKG.emptyState('company.notFound.title', 'company.notFound.text', el('a', { class: 'btn btn-primary', href: 'companies.html', 'data-i18n': 'company.back' }, t('company.back')))));
      return;
    }
    document.title = `${c.name} — JobKG`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', c.description);
    const jobs = ctx.jobs.filter((j) => j.companyId === c.id).sort((a, b) => b.postedAt.localeCompare(a.postedAt));

    function render() {
      clear(root).append(
        el('div', { class: 'page-head' }, el('div', { class: 'container' },
          el('ol', { class: 'breadcrumbs' },
            el('li', {}, el('a', { href: 'index.html', 'data-i18n': 'nav.home' }, t('nav.home'))),
            el('li', {}, el('a', { href: 'companies.html', 'data-i18n': 'nav.companies' }, t('nav.companies'))),
            el('li', { 'aria-current': 'page', text: c.name })),
          el('div', { class: 'row' }, JobKG.logoPlaceholder(c, 'lg'),
            el('div', {}, el('h1', { text: c.name }),
              el('div', { class: 'job-card__meta' }, JobKG.badge(JobKG.label('category', c.industry), 'badge-blue'), JobKG.badge(JobKG.label('city', c.city)), JobKG.demoBadge()))))),
        el('div', { class: 'container section' },
          el('div', { class: 'grid', style: 'grid-template-columns:minmax(0,1fr)' },
            el('section', { class: 'card job-section mt-0' }, tEl('h2', 'company.about'), el('p', { class: 'mb-0', text: c.description }),
              el('div', { class: 'notice notice-warn mt-4' }, icon('alert'), tEl('p', 'company.demoNotice')))),
          el('div', { class: 'section-head mt-6' }, el('h2', { text: `${t('company.openJobs')}: ${jobs.length}` })),
          jobs.length
            ? el('div', { class: 'job-list' }, jobs.map((j) => JobKG.ui.jobCard(j, c)))
            : tEl('p', 'company.noJobs', { class: 'text-muted' }))
      );
      JobKG.syncFavorites();
    }
    JobKG.onRender(render);
    render();
  };
})();

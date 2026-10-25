/* ==========================================================================
   JobKG — вход, регистрация и демонстрационные кабинеты
   Страницы: login.html, register.html, profile.html

   ВАЖНО: настоящей авторизации здесь НЕТ намеренно. Безопасный вход, пароли,
   роли и хранение персональных данных требуют серверной части (см. README).
   Формы проверяют ввод, но ничего не отправляют и не сохраняют; пароли
   не попадают ни в LocalStorage, ни в какие-либо переменные после проверки.
   Кабинеты — демонстрационный интерфейс: данные остаются только в браузере.
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, $$, el, tEl, clear, icon, store } = JobKG;
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);
  const row = JobKG.fieldRow;

  const input = (id, attrs = {}) => el('input', Object.assign({ class: 'input', id, name: id }, attrs));

  /* ---------- Вход ---------- */
  JobKG.pages.login = function () {
    const form = $('#login-form');
    const email = $('#l-email'); const pass = $('#l-pass'); const result = $('#login-result');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const e1 = !email.value.trim() ? 'form.required' : (!JobKG.EMAIL_RE.test(email.value.trim()) ? 'form.email' : '');
      const e2 = !pass.value ? 'form.required' : '';
      JobKG.setFieldError(email, e1); JobKG.setFieldError(pass, e2);
      if (e1 || e2) ok = false;
      if (!ok) { (e1 ? email : pass).focus(); return; }
      pass.value = ''; // пароль нигде не сохраняется и не передаётся
      clear(result).append(JobKG.noticeNode('warn', 'auth.notAvailable', 'alert'));
      result.firstChild.classList.add('mt-4');
    });
  };

  /* ---------- Регистрация ---------- */
  JobKG.pages.register = function () {
    const form = $('#register-form');
    const name = $('#r-name'); const email = $('#r-email'); const pass = $('#r-pass'); const pass2 = $('#r-pass2');
    const agree = $('#r-agree'); const result = $('#register-result');
    const roleFromUrl = new URLSearchParams(location.search).get('role');
    if (roleFromUrl === 'employer') $('#role-employer').checked = true;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errs = {
        name: name.value.trim().length < 2 ? 'form.required' : '',
        email: !email.value.trim() ? 'form.required' : (!JobKG.EMAIL_RE.test(email.value.trim()) ? 'form.email' : ''),
        pass: !pass.value ? 'form.required' : (pass.value.length < 8 ? 'auth.passShort' : ''),
        pass2: pass2.value !== pass.value ? 'auth.passMismatch' : '',
      };
      JobKG.setFieldError(name, errs.name); JobKG.setFieldError(email, errs.email);
      JobKG.setFieldError(pass, errs.pass); JobKG.setFieldError(pass2, errs.pass2);
      const agreeErr = $('#r-agree-err');
      agreeErr.textContent = agree.checked ? '' : t('auth.agreeRequired');
      if (agree.checked) agreeErr.removeAttribute('data-i18n'); else agreeErr.setAttribute('data-i18n', 'auth.agreeRequired');
      const firstBad = [[name, errs.name], [email, errs.email], [pass, errs.pass], [pass2, errs.pass2]].find(([, m]) => m);
      if (firstBad) { firstBad[0].focus(); return; }
      if (!agree.checked) { agree.focus(); return; }
      pass.value = ''; pass2.value = '';
      clear(result).append(JobKG.noticeNode('warn', 'auth.notAvailableReg', 'alert'));
      result.firstChild.classList.add('mt-4');
    });
  };

  /* ---------- Кабинеты (демо) ---------- */
  const PROFILE_KEY = 'jobkg.demo.profile';
  const COMPANY_KEY = 'jobkg.demo.company';
  const APPL_KEY = 'jobkg.demo.applications';
  const LOCAL_KEYS = [PROFILE_KEY, COMPANY_KEY, APPL_KEY, 'jobkg.demo.drafts', 'jobkg.favorites'];

  const TABS = {
    seeker: ['profile', 'resume', 'skills', 'education', 'saved', 'history', 'settings'],
    employer: ['company', 'create', 'edit', 'responses', 'manage', 'moderation'],
  };

  JobKG.pages.profile = async function () {
    const params = new URLSearchParams(location.search);
    let role = params.get('role') === 'employer' ? 'employer' : 'seeker';
    let tab = (location.hash || '').replace('#', '');
    if (!TABS[role].includes(tab)) tab = TABS[role][0];

    const nav = $('#cabinet-nav'); const panelHost = $('#cabinet-panel'); const roleHost = $('#cabinet-role');
    let ctx = null;
    try { ctx = await JobKG.data.all(); } catch (e) { console.error(e); }

    const getProfile = () => store.get(PROFILE_KEY, { name: '', city: '', about: '', position: '', experience: '', summary: '', skills: [], education: [] });
    const saveProfile = (p) => store.set(PROFILE_KEY, p);
    const saved = () => toast('cab.saved');
    const toast = (key) => JobKG.toast(t(key));

    /* — смена роли — */
    function renderRole() {
      clear(roleHost).append(
        el('div', { class: 'role-switch', role: 'radiogroup', 'data-i18n-aria-label': 'cab.role', 'aria-label': t('cab.role') },
          ['seeker', 'employer'].map((r) => el('label', {},
            el('input', { type: 'radio', name: 'cab-role', value: r, checked: r === role, onchange: () => { role = r; tab = TABS[r][0]; history.replaceState(null, '', `?role=${r}`); render(); } }),
            el('span', { 'data-i18n': `cab.role.${r}` }, t(`cab.role.${r}`))))));
    }

    /* — вкладки (ARIA tabs со стрелками) — */
    function renderTabs() {
      const list = el('div', { role: 'tablist', 'aria-orientation': 'vertical', 'data-i18n-aria-label': 'cab.sections', 'aria-label': t('cab.sections') });
      TABS[role].forEach((id) => {
        const b = el('button', { type: 'button', class: 'tab', role: 'tab', id: `tab-${id}`, 'aria-selected': id === tab ? 'true' : 'false', 'aria-controls': 'cabinet-panel', tabindex: id === tab ? '0' : '-1' },
          el('span', { 'data-i18n': `cab.tab.${id}` }, t(`cab.tab.${id}`)));
        b.addEventListener('click', () => { tab = id; history.replaceState(null, '', `?role=${role}#${id}`); render(); });
        b.addEventListener('keydown', (e) => {
          const ids = TABS[role]; let i = ids.indexOf(tab);
          if (['ArrowDown', 'ArrowRight'].includes(e.key)) i = (i + 1) % ids.length;
          else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) i = (i - 1 + ids.length) % ids.length;
          else return;
          e.preventDefault(); tab = ids[i]; render(); $(`#tab-${tab}`).focus();
        });
        list.append(b);
      });
      clear(nav).append(list);
    }

    /* — панели — */
    const head = (key) => el('h2', { 'data-i18n': `cab.tab.${key}` }, t(`cab.tab.${key}`));
    const demoNote = () => el('div', { class: 'notice notice-info mb-4' }, icon('info'), tEl('p', 'cab.demoNote'));
    const saveBtn = () => el('button', { class: 'btn btn-primary', type: 'submit', 'data-i18n': 'cab.save' }, t('cab.save'));
    const textarea = (id, v, rows = 4) => { const x = el('textarea', { class: 'textarea', id, name: id, rows, maxlength: 1500 }); x.value = v || ''; return x; };
    const text = (id, v, max = 100) => { const x = input(id, { type: 'text', maxlength: max }); x.value = v || ''; return x; };

    const panels = {
      /* соискатель */
      profile() {
        const p = getProfile();
        const name = text('p-name', p.name); const city = el('select', { class: 'select', id: 'p-city' });
        JobKG.fillSelect(city, 'city', JobKG.enums.city, 'post.choose'); city.value = p.city || '';
        const about = textarea('p-about', p.about);
        return el('form', { onsubmit: (e) => { e.preventDefault(); const n = getProfile(); Object.assign(n, { name: name.value.trim(), city: city.value, about: about.value.trim() }); saveProfile(n); saved(); } },
          head('profile'), demoNote(),
          el('div', { class: 'form-grid' }, row('p-name', 'cab.name', name), row('p-city', 'post.city', city), row('p-about', 'cab.about', about, { full: true })), saveBtn());
      },
      resume() {
        const p = getProfile();
        const pos = text('rs-pos', p.position); const exp = el('select', { class: 'select', id: 'rs-exp' });
        JobKG.fillSelect(exp, 'experience', JobKG.enums.experience, 'post.choose'); exp.value = p.experience || '';
        const sum = textarea('rs-sum', p.summary, 6);
        return el('form', { onsubmit: (e) => { e.preventDefault(); const n = getProfile(); Object.assign(n, { position: pos.value.trim(), experience: exp.value, summary: sum.value.trim() }); saveProfile(n); saved(); } },
          head('resume'), demoNote(),
          el('div', { class: 'form-grid' }, row('rs-pos', 'cab.position', pos), row('rs-exp', 'post.experience', exp), row('rs-sum', 'cab.summary', sum, { full: true })),
          el('p', { class: 'text-sm text-muted', 'data-i18n': 'cab.noUpload' }, t('cab.noUpload')), saveBtn());
      },
      skills() {
        const p = getProfile(); const add = text('sk-new', '', 40);
        const list = el('div', { class: 'chips mt-4', 'aria-live': 'polite' });
        const draw = () => {
          clear(list); const cur = getProfile();
          if (!cur.skills.length) list.append(tEl('p', 'cab.noSkills', { class: 'text-muted' }));
          cur.skills.forEach((s, i) => list.append(el('button', { type: 'button', class: 'chip', 'aria-label': `${t('cab.remove')}: ${s}`, onclick: () => { const n = getProfile(); n.skills.splice(i, 1); saveProfile(n); draw(); } }, s, ' ', icon('x'))));
        };
        const submit = (e) => { e.preventDefault(); const v = add.value.trim(); if (!v) return; const n = getProfile(); if (!n.skills.includes(v) && n.skills.length < 30) n.skills.push(v); saveProfile(n); add.value = ''; draw(); add.focus(); };
        draw();
        return el('div', {}, head('skills'), demoNote(),
          el('form', { class: 'row', onsubmit: submit }, el('div', { class: 'field mb-0', style: 'flex:1;min-width:200px;margin:0' }, el('label', { for: 'sk-new', class: 'visually-hidden', 'data-i18n': 'cab.skillName' }, t('cab.skillName')), add),
            el('button', { class: 'btn btn-primary', type: 'submit', 'data-i18n': 'cab.add' }, t('cab.add'))), list);
      },
      education() {
        const inst = text('ed-inst', ''); const spec = text('ed-spec', ''); const years = text('ed-years', '', 20);
        const list = el('ul', { class: 'list-plain mt-5' });
        const draw = () => {
          clear(list); const cur = getProfile();
          if (!cur.education.length) list.append(el('li', {}, tEl('p', 'cab.noEducation', { class: 'text-muted' })));
          cur.education.forEach((x, i) => list.append(el('li', { class: 'list-row' },
            el('div', {}, el('strong', { text: x.inst }), el('span', { class: 'text-sm text-muted', text: `${x.spec}${x.years ? ` · ${x.years}` : ''}` })),
            el('button', { class: 'btn btn-sm', type: 'button', 'data-i18n': 'cab.remove', onclick: () => { const n = getProfile(); n.education.splice(i, 1); saveProfile(n); draw(); } }, t('cab.remove')))));
        };
        draw();
        return el('div', {}, head('education'), demoNote(),
          el('form', { onsubmit: (e) => { e.preventDefault(); if (!inst.value.trim()) { JobKG.setFieldError(inst, 'form.required'); inst.focus(); return; } JobKG.setFieldError(inst, ''); const n = getProfile(); if (n.education.length < 10) n.education.push({ inst: inst.value.trim(), spec: spec.value.trim(), years: years.value.trim() }); saveProfile(n); inst.value = spec.value = years.value = ''; draw(); } },
            el('div', { class: 'form-grid' }, row('ed-inst', 'cab.institution', inst, { required: true }), row('ed-spec', 'cab.specialty', spec), row('ed-years', 'cab.years', years)),
            el('button', { class: 'btn btn-primary', type: 'submit', 'data-i18n': 'cab.add' }, t('cab.add'))), list);
      },
      saved() {
        const ids = JobKG.favorites.ids(); const jobs = ctx ? ids.map((id) => ctx.jobs.find((j) => j.id === id)).filter(Boolean) : [];
        return el('div', {}, head('saved'),
          jobs.length ? el('ul', { class: 'list-plain' }, jobs.map((j) => el('li', { class: 'list-row' },
            el('div', {}, el('strong', { text: j.title }), el('span', { class: 'text-sm text-muted', text: `${ctx.companyById[j.companyId].name} · ${JobKG.label('city', j.city)}` })),
            el('a', { class: 'btn btn-soft btn-sm', href: JobKG.ui.jobUrl(j.id), 'data-i18n': 'job.more' }, t('job.more')))))
            : JobKG.emptyState('fav.empty.title', 'fav.empty.text', el('a', { class: 'btn btn-primary', href: 'jobs.html', 'data-i18n': 'nav.jobs' }, t('nav.jobs'))));
      },
      history() {
        const apps = store.get(APPL_KEY, []);
        return el('div', {}, head('history'),
          el('div', { class: 'notice notice-warn mb-4' }, icon('alert'), tEl('p', 'cab.historyNote')),
          apps.length ? el('ul', { class: 'list-plain' }, apps.map((a) => { const j = ctx && ctx.jobs.find((x) => x.id === a.jobId); return el('li', { class: 'list-row' },
            el('div', {}, el('strong', { text: j ? j.title : a.jobId }), el('span', { class: 'text-sm text-muted', text: new Date(a.at).toLocaleString(i18n.lang() === 'kg' ? 'ky-KG' : 'ru-RU') })),
            el('span', { class: 'status-pill draft', 'data-i18n': 'cab.status.demo' }, t('cab.status.demo'))); }))
            : tEl('p', 'cab.noHistory', { class: 'text-muted' }));
      },
      settings() {
        return el('div', {}, head('settings'),
          el('div', { class: 'field' }, el('span', { class: 'label', 'data-i18n': 'cab.language' }, t('cab.language')), el('div', {}, (() => { const s = el('div', { class: 'lang-switch' }); i18n.supported.forEach((c) => s.append(el('button', { type: 'button', 'aria-pressed': c === i18n.lang() ? 'true' : 'false', 'data-lang': c, onclick: () => i18n.setLang(c) }, c.toUpperCase()))); return s; })())),
          el('h3', { class: 'mt-6', 'data-i18n': 'cab.localData' }, t('cab.localData')),
          tEl('p', 'cab.localDataText', { class: 'text-muted' }),
          el('button', { class: 'btn', type: 'button', 'data-i18n': 'cab.clear', onclick: () => { if (confirm(t('cab.clearConfirm'))) { LOCAL_KEYS.forEach((k) => store.remove(k)); JobKG.syncFavorites(); JobKG.toast(t('cab.cleared')); render(); } } }, t('cab.clear')));
      },

      /* работодатель */
      company() {
        const c = store.get(COMPANY_KEY, { name: '', industry: '', city: '', description: '' });
        const name = text('co-name', c.name); const ind = el('select', { class: 'select', id: 'co-ind' }); const city = el('select', { class: 'select', id: 'co-city' });
        JobKG.fillSelect(ind, 'category', JobKG.enums.category, 'post.choose'); ind.value = c.industry || '';
        JobKG.fillSelect(city, 'city', JobKG.enums.city, 'post.choose'); city.value = c.city || '';
        const desc = textarea('co-desc', c.description, 5);
        return el('form', { onsubmit: (e) => { e.preventDefault(); store.set(COMPANY_KEY, { name: name.value.trim(), industry: ind.value, city: city.value, description: desc.value.trim() }); saved(); } },
          head('company'), demoNote(),
          el('div', { class: 'form-grid' }, row('co-name', 'post.company', name), row('co-ind', 'cab.industry', ind), row('co-city', 'post.city', city), row('co-desc', 'cab.companyDesc', desc, { full: true })), saveBtn());
      },
      create() {
        return el('div', {}, head('create'), tEl('p', 'cab.createText', { class: 'text-muted' }),
          el('a', { class: 'btn btn-primary btn-lg', href: 'post-job.html', 'data-i18n': 'nav.post' }, t('nav.post')));
      },
      edit() {
        const drafts = JobKG.drafts.all();
        return el('div', {}, head('edit'), demoNote(),
          drafts.length ? el('ul', { class: 'list-plain' }, drafts.map((d) => el('li', { class: 'list-row' },
            el('div', {}, el('strong', { text: d.title }), el('span', { class: 'text-sm text-muted', text: `${d.company} · ${JobKG.label('city', d.city)}` })),
            el('a', { class: 'btn btn-soft btn-sm', href: `post-job.html?draft=${encodeURIComponent(d.id)}`, 'data-i18n': 'cab.edit' }, t('cab.edit')))))
            : tEl('p', 'cab.noDrafts', { class: 'text-muted' }));
      },
      responses() {
        return el('div', {}, head('responses'),
          JobKG.emptyState('cab.noResponses.title', 'cab.noResponses.text', el('span', { class: 'badge badge-warn', 'data-i18n': 'cab.needsBackend' }, t('cab.needsBackend'))));
      },
      manage() {
        const drafts = JobKG.drafts.all();
        const draw = () => clear(panelHost).append(panels.manage());
        return el('div', {}, head('manage'), demoNote(),
          drafts.length ? el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, ['cab.col.title', 'cab.col.status', 'cab.col.date', 'cab.col.actions'].map((k) => el('th', { scope: 'col', 'data-i18n': k }, t(k))))),
            el('tbody', {}, drafts.map((d) => el('tr', {},
              el('td', { text: d.title }),
              el('td', {}, el('span', { class: 'status-pill draft', 'data-i18n': 'cab.status.local' }, t('cab.status.local'))),
              el('td', { text: new Date(d.at).toLocaleDateString(i18n.lang() === 'kg' ? 'ky-KG' : 'ru-RU') }),
              el('td', {}, el('button', { class: 'btn btn-sm', type: 'button', 'data-i18n': 'cab.remove', onclick: () => { JobKG.drafts.save(JobKG.drafts.all().filter((x) => x.id !== d.id)); draw(); } }, t('cab.remove'))))))))
            : tEl('p', 'cab.noDrafts', { class: 'text-muted' }));
      },
      moderation() {
        const col = (cls, k) => el('section', { class: 'card status-col' }, el('h3', {}, el('span', { class: `status-pill ${cls}`, 'data-i18n': `cab.status.${k}` }, t(`cab.status.${k}`))),
          el('p', { class: 'text-sm text-muted', 'data-i18n': `cab.mod.${k}` }, t(`cab.mod.${k}`)));
        return el('div', {}, head('moderation'), tEl('p', 'cab.modIntro', { class: 'text-muted' }),
          el('div', { class: 'status-grid' }, col('draft', 'local'), col('pending', 'pending'), col('ok', 'published')),
          el('div', { class: 'notice notice-warn mt-5' }, icon('alert'), tEl('p', 'cab.needsBackendText')));
      },
    };

    function render() {
      renderRole(); renderTabs();
      clear(panelHost).append(panels[tab]());
      panelHost.setAttribute('aria-labelledby', `tab-${tab}`);
      i18n.apply(document);
    }
    JobKG.onRender(render);
    document.addEventListener('jobkg:favchange', () => { if (tab === 'saved') render(); });
    render();
  };
})();

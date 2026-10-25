/* ==========================================================================
   JobKG — интерфейс работодателя: добавление вакансии (демо)
   Страница: post-job.html (data-page="post-job")
   Без backend вакансия НЕ публикуется и НЕ уходит на модерацию — сохраняется
   только локальный черновик в браузере (без контактных данных).
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, el, tEl, clear, icon, store } = JobKG;
  const t = (k, p) => JobKG.i18n.t(k, p);

  const DRAFTS_KEY = 'jobkg.demo.drafts';
  JobKG.drafts = {
    all: () => store.get(DRAFTS_KEY, []),
    save(list) { return store.set(DRAFTS_KEY, list); },
  };

  JobKG.pages['post-job'] = function () {
    const host = $('#post-form-host');
    const draftId = new URLSearchParams(location.search).get('draft');
    const existing = draftId ? JobKG.drafts.all().find((d) => d.id === draftId) : null;

    const mk = (tag, id, attrs = {}) => el(tag, Object.assign({ id, name: id, class: tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'input' }, attrs));
    const f = {
      title: mk('input', 'pj-title', { type: 'text', maxlength: 100, required: true }),
      company: mk('input', 'pj-company', { type: 'text', maxlength: 100, required: true }),
      city: mk('select', 'pj-city', { required: true }),
      category: mk('select', 'pj-category', { required: true }),
      salaryFrom: mk('input', 'pj-from', { type: 'number', min: 0, step: 1000, inputmode: 'numeric' }),
      salaryTo: mk('input', 'pj-to', { type: 'number', min: 0, step: 1000, inputmode: 'numeric' }),
      employment: mk('select', 'pj-employment', { required: true }),
      format: mk('select', 'pj-format', { required: true }),
      experience: mk('select', 'pj-experience'),
      description: mk('textarea', 'pj-description', { rows: 5, maxlength: 3000, required: true }),
      responsibilities: mk('textarea', 'pj-resp', { rows: 4, maxlength: 2000, required: true }),
      requirements: mk('textarea', 'pj-req', { rows: 4, maxlength: 2000, required: true }),
      contact: mk('input', 'pj-contact', { type: 'text', maxlength: 120, required: true, autocomplete: 'off' }),
    };
    const result = el('div', { id: 'pj-result', tabindex: '-1', 'aria-live': 'polite' });
    const row = JobKG.fieldRow;

    const form = el('form', { class: 'form-card', novalidate: true },
      el('div', { class: 'notice notice-warn mb-4' }, icon('alert'), tEl('p', 'post.demoNotice')),
      el('div', { class: 'form-grid' },
        row('pj-title', 'post.title', f.title, { required: true, full: true }),
        row('pj-company', 'post.company', f.company, { required: true }),
        row('pj-city', 'post.city', f.city, { required: true }),
        row('pj-category', 'post.category', f.category, { required: true }),
        row('pj-employment', 'post.employment', f.employment, { required: true }),
        row('pj-format', 'post.format', f.format, { required: true }),
        row('pj-experience', 'post.experience', f.experience),
        row('pj-from', 'post.salaryFrom', f.salaryFrom, { hintKey: 'post.salaryHint' }),
        row('pj-to', 'post.salaryTo', f.salaryTo),
        row('pj-description', 'post.description', f.description, { required: true, full: true }),
        row('pj-resp', 'post.responsibilities', f.responsibilities, { required: true, full: true, hintKey: 'post.linesHint' }),
        row('pj-req', 'post.requirements', f.requirements, { required: true, full: true, hintKey: 'post.linesHint' }),
        row('pj-contact', 'post.contact', f.contact, { required: true, full: true, hintKey: 'post.contactHint' })),
      el('div', { class: 'row mt-4' },
        el('button', { class: 'btn btn-primary btn-lg', type: 'submit', 'data-i18n': 'post.submit' }, t('post.submit')),
        el('a', { class: 'btn btn-lg', href: 'profile.html?role=employer#manage', 'data-i18n': 'post.myDrafts' }, t('post.myDrafts'))),
      result);

    function fillSelects() {
      JobKG.fillSelect(f.city, 'city', JobKG.enums.city, 'post.choose');
      JobKG.fillSelect(f.category, 'category', JobKG.enums.category, 'post.choose');
      JobKG.fillSelect(f.employment, 'employment', JobKG.enums.employment, 'post.choose');
      JobKG.fillSelect(f.format, 'format', JobKG.enums.format, 'post.choose');
      JobKG.fillSelect(f.experience, 'experience', JobKG.enums.experience, 'post.choose');
    }
    fillSelects();
    clear(host).append(form);

    if (existing) {
      f.title.value = existing.title; f.company.value = existing.company; f.city.value = existing.city; f.category.value = existing.category;
      f.employment.value = existing.employment; f.format.value = existing.format; f.experience.value = existing.experience || '';
      f.salaryFrom.value = existing.salaryFrom || ''; f.salaryTo.value = existing.salaryTo || '';
      f.description.value = existing.description; f.responsibilities.value = existing.responsibilities; f.requirements.value = existing.requirements;
    }

    function validate() {
      let ok = true;
      const need = (input, min = 1) => { const bad = input.value.trim().length < min; JobKG.setFieldError(input, bad ? (min > 1 ? 'form.tooShort' : 'form.required') : ''); if (bad) ok = false; };
      need(f.title, 3); need(f.company, 2);
      ['city', 'category', 'employment', 'format'].forEach((k) => need(f[k]));
      need(f.description, 30); need(f.responsibilities, 10); need(f.requirements, 10);
      const a = Number(f.salaryFrom.value) || 0; const b = Number(f.salaryTo.value) || 0;
      const salaryBad = a < 0 || b < 0 || (a && b && a > b);
      JobKG.setFieldError(f.salaryTo, salaryBad ? 'post.salaryError' : ''); if (salaryBad) ok = false;
      const c = f.contact.value.trim();
      const contactOk = JobKG.EMAIL_RE.test(c) || /^\+?[\d\s()\-]{7,20}$/.test(c);
      JobKG.setFieldError(f.contact, !c ? 'form.required' : (contactOk ? '' : 'post.contactError')); if (!c || !contactOk) ok = false;
      return ok;
    }
    Object.values(f).forEach((i) => i.addEventListener('blur', validate));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) { const bad = $('.is-invalid', form); if (bad) bad.focus(); return; }
      const list = JobKG.drafts.all();
      const record = {
        id: existing ? existing.id : `d${Date.now()}`,
        title: f.title.value.trim(), company: f.company.value.trim(), city: f.city.value, category: f.category.value,
        employment: f.employment.value, format: f.format.value, experience: f.experience.value,
        salaryFrom: Number(f.salaryFrom.value) || null, salaryTo: Number(f.salaryTo.value) || null,
        description: f.description.value.trim(), responsibilities: f.responsibilities.value.trim(), requirements: f.requirements.value.trim(),
        // контакт для отклика намеренно НЕ сохраняется в браузере
        status: 'local', at: new Date().toISOString(),
      };
      const i = list.findIndex((d) => d.id === record.id);
      if (i >= 0) list[i] = record; else list.unshift(record);
      JobKG.drafts.save(list.slice(0, 30));
      f.contact.value = '';
      clear(result).append(JobKG.noticeNode('info', 'post.demoDone', 'info'));
      result.firstChild.classList.add('mt-4');
      result.focus();
    });
    JobKG.onRender(fillSelects);
  };
})();

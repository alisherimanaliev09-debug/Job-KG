/* ==========================================================================
   JobKG — контентные страницы: карьерные советы и статьи
   Страницы: career-advice.html (advice), article.html (article)
   Тексты статей лежат в data/articles.json (пока только на русском —
   на кыргызском показывается пометка, см. README).
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, el, tEl, clear, icon } = JobKG;
  const i18n = JobKG.i18n;
  const t = (k, p) => i18n.t(k, p);

  const articleUrl = (id) => `article.html?id=${encodeURIComponent(id)}`;

  function articleCard(a) {
    return el('a', { class: 'card card-hover article-card', href: articleUrl(a.id) },
      el('div', { class: 'article-card__cover' }, icon('file')),
      el('div', { class: 'article-card__body' },
        el('h3', { text: a.title }),
        el('p', { text: a.excerpt }),
        el('span', { class: 'meta', text: `${JobKG.fmtDate(a.date)} · ${t('advice.readMin', { n: a.readMin })}` })));
  }
  JobKG.ui = JobKG.ui || {};
  JobKG.ui.articleCard = articleCard;

  function ruOnlyNotice() {
    return i18n.lang() === 'ru' ? null : el('div', { class: 'notice notice-info mb-4', role: 'note' }, icon('info'), tEl('p', 'advice.ruOnly'));
  }

  JobKG.pages.advice = async function () {
    const host = $('#articles-grid');
    const noticeHost = $('#articles-notice');
    let articles;
    try { articles = await JobKG.data.articles(); } catch (e) { console.error(e); JobKG.showLoadError(host); return; }
    function render() {
      clear(noticeHost).append(ruOnlyNotice() || '');
      clear(host);
      articles.forEach((a) => host.append(articleCard(a)));
    }
    JobKG.onRender(render);
    render();
  };

  JobKG.pages.article = async function () {
    const host = $('#article-root');
    const id = new URLSearchParams(location.search).get('id');
    let articles;
    try { articles = await JobKG.data.articles(); } catch (e) { console.error(e); JobKG.showLoadError(host); return; }
    const a = articles.find((x) => x.id === id);
    if (!a) {
      document.title = `${t('article.notFound.title')} — JobKG`;
      clear(host).append(el('div', { class: 'container section' },
        JobKG.emptyState('article.notFound.title', 'article.notFound.text', el('a', { class: 'btn btn-primary', href: 'career-advice.html', 'data-i18n': 'article.back' }, t('article.back')))));
      return;
    }
    document.title = `${a.title} — JobKG`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', a.excerpt);

    function body() {
      return a.body.map((b) => {
        if (b.type === 'h') return el('h2', { text: b.text });
        if (b.type === 'ul') return el('ul', {}, b.items.map((x) => el('li', { text: x })));
        return el('p', { text: b.text });
      });
    }
    function render() {
      const more = articles.filter((x) => x.id !== a.id).slice(0, 3);
      clear(host).append(
        el('div', { class: 'container' },
          el('article', { class: 'article' },
            el('ol', { class: 'breadcrumbs' },
              el('li', {}, el('a', { href: 'index.html', 'data-i18n': 'nav.home' }, t('nav.home'))),
              el('li', {}, el('a', { href: 'career-advice.html', 'data-i18n': 'nav.advice' }, t('nav.advice'))),
              el('li', { 'aria-current': 'page', text: a.title })),
            el('h1', { text: a.title }),
            el('div', { class: 'article-meta' },
              el('span', { text: JobKG.fmtDate(a.date) }), el('span', { text: `· ${t('advice.readMin', { n: a.readMin })}` })),
            ruOnlyNotice() || '',
            ...body(),
            el('div', { class: 'notice notice-info mt-6' }, icon('info'), tEl('p', 'advice.disclaimer')))),
        el('section', { class: 'section section-alt' }, el('div', { class: 'container' },
          el('div', { class: 'section-head' }, tEl('h2', 'article.more')),
          el('div', { class: 'grid grid-3' }, more.map(articleCard))))
      );
    }
    JobKG.onRender(render);
    render();
  };
})();

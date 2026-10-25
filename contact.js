/* ==========================================================================
   JobKG — контактная форма (демо)
   Страница: contact.html (data-page="contact")
   Сообщение НЕ отправляется и НЕ сохраняется: для этого нужен backend.
   ========================================================================== */
(function () {
  'use strict';
  const JobKG = window.JobKG;
  const { $, clear } = JobKG;

  JobKG.pages.contact = function () {
    const form = $('#contact-form');
    const name = $('#ct-name'); const email = $('#ct-email'); const msg = $('#ct-message');
    const result = $('#contact-result');

    function validate() {
      const e1 = name.value.trim().length < 2 ? 'form.required' : '';
      const e2 = !email.value.trim() ? 'form.required' : (!JobKG.EMAIL_RE.test(email.value.trim()) ? 'form.email' : '');
      const e3 = msg.value.trim().length < 10 ? 'form.tooShort' : (msg.value.length > 2000 ? 'form.tooLong' : '');
      JobKG.setFieldError(name, e1); JobKG.setFieldError(email, e2); JobKG.setFieldError(msg, e3);
      return [[name, e1], [email, e2], [msg, e3]].find(([, m]) => m);
    }
    [name, email, msg].forEach((i) => i.addEventListener('blur', validate));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = validate();
      if (bad) { bad[0].focus(); return; }
      form.reset();
      clear(result).append(JobKG.noticeNode('info', 'contact.demoDone', 'info'));
      result.firstChild.classList.add('mt-4');
    });
  };
})();

(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* Hamburger menu */
  const burger = $('#hamburger');
  const drawer = $('#drawer');
  const setDrawer = open => {
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', !open);
    document.body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
  addEventListener('resize', () => { if (innerWidth > 1100) setDrawer(false); });

  /* Scroll reveal (staggered) */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', (sib.indexOf(el) * 0.08) + 's');
    io.observe(el);
  });

  /* Modal */
  const modal = $('#modal');
  const dialog = $('.modal__dialog', modal);
  const content = $('#modalContent');
  let lastFocus = null;

  function openModal(node, trigger, topic) {
    lastFocus = trigger || document.activeElement;
    content.innerHTML = '';
    content.append(node);
    if (topic) {
      const sel = $('select[name="type"]', content);
      if (sel) sel.value = topic;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    setTimeout(() => (dialog.querySelector('input,select,textarea,button:not(.modal__close)') || dialog).focus({ preventScroll: true }), 80);
    bindForm();
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!drawer.classList.contains('is-open')) document.body.classList.remove('is-locked');
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      if (drawer.classList.contains('is-open')) setDrawer(false);
      const tpl = $('#tpl-' + opener.dataset.modalOpen);
      if (tpl) openModal(tpl.content.cloneNode(true), opener, opener.dataset.topic);
      return;
    }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false);
      return;
    }
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = $$('a[href],button:not([disabled]),input,select,textarea', dialog);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Contact form validation */
  function bindForm() {
    const form = $('#contactForm', content);
    if (!form) return;
    const err = $('.form__error', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach(f => {
        const bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      err.hidden = ok;
      if (!ok) { err.textContent = '未入力または形式の誤りがあります。ご確認ください。'; return; }
      content.innerHTML = `
        <div class="thanks">
          <div class="thanks__icon">✓</div>
          <h2 id="modalTitle" class="modal__title">送信が完了しました</h2>
          <p class="modal__lead">お問い合わせありがとうございます。担当者より1営業日以内にご連絡いたします。</p>
          <button type="button" class="btn btn--gold" data-modal-close>閉じる</button>
        </div>`;
    });
  }
})();

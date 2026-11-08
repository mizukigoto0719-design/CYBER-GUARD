(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     1. Typography animation — split text into characters
     ========================================================= */
  $$('.split-text').forEach(el => {
    const html = el.dataset.text;
    el.setAttribute('aria-label', html.replace(/<br\s*\/?>/g, ''));
    let i = 0;
    el.innerHTML = html.split(/(<br\s*\/?>)/).map(part => {
      if (/^<br/.test(part)) return '<br>';
      return [...part].map(ch => `<span class="char" aria-hidden="true" style="--i:${i++}">${ch}</span>`).join('');
    }).join('');
  });

  /* =========================================================
     2. Header: scroll state
     ========================================================= */
  const header = $('#header');
  const onHeaderScroll = () => header.classList.toggle('is-scrolled', scrollY > 40);

  /* =========================================================
     3. Hamburger menu
     ========================================================= */
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

  /* =========================================================
     4. Hero slideshow (fade / autoplay / dots / arrows / swipe)
     ========================================================= */
  const slides = $$('.slide');
  const copies = $$('.hero__copy');
  const dotsWrap = $('#heroDots');
  const bar = $('#heroProgress');
  const hero = $('#hero');
  const INTERVAL = 6500;
  let cur = 0, timer = null, startTime = 0, raf = null, paused = false, elapsedBeforePause = 0;

  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `スライド${i + 1}`);
    b.addEventListener('click', () => { go(i); });
    dotsWrap.appendChild(b);
  });
  const dots = $$('button', dotsWrap);

  function tickBar(ts) {
    if (paused) return;
    const t = elapsedBeforePause + (ts - startTime);
    bar.style.width = Math.min(t / INTERVAL * 100, 100) + '%';
    if (t >= INTERVAL) { go(cur + 1); return; }
    raf = requestAnimationFrame(tickBar);
  }
  function startAuto() {
    cancelAnimationFrame(raf);
    paused = false;
    startTime = performance.now();
    raf = requestAnimationFrame(ts => { startTime = ts; tickBar(ts); });
  }
  function go(n) {
    cancelAnimationFrame(raf);
    const next = (n + slides.length) % slides.length;
    [slides[cur], copies[cur], dots[cur]].forEach(e => e.classList.remove('is-active'));
    cur = next;
    // restart char animations by forcing reflow
    copies[cur].classList.remove('is-active');
    void copies[cur].offsetWidth;
    [slides[cur], copies[cur], dots[cur]].forEach(e => e.classList.add('is-active'));
    dots.forEach((d, i) => d.setAttribute('aria-selected', i === cur));
    elapsedBeforePause = 0;
    bar.style.width = '0%';
    if (!reduceMotion) startAuto();
  }
  $('#prevSlide').addEventListener('click', () => go(cur - 1));
  $('#nextSlide').addEventListener('click', () => go(cur + 1));

  hero.addEventListener('mouseenter', () => {
    paused = true; cancelAnimationFrame(raf);
    elapsedBeforePause = parseFloat(bar.style.width || 0) / 100 * INTERVAL;
  });
  hero.addEventListener('mouseleave', () => {
    if (reduceMotion) return;
    paused = false; startTime = performance.now();
    raf = requestAnimationFrame(ts => { startTime = ts; tickBar(ts); });
  });
  let sx = 0;
  hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { paused = true; cancelAnimationFrame(raf); elapsedBeforePause = parseFloat(bar.style.width || 0) / 100 * INTERVAL; }
    else if (!reduceMotion) { paused = false; startTime = performance.now(); raf = requestAnimationFrame(ts => { startTime = ts; tickBar(ts); }); }
  });
  go(0);

  /* =========================================================
     5. Parallax effect
     ========================================================= */
  const pEls = $$('[data-parallax]');
  let ticking = false;
  function parallax() {
    const vh = innerHeight;
    pEls.forEach(el => {
      const speed = parseFloat(el.dataset.parallax);
      const host = el.closest('section') || el.parentElement;
      const r = host.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      // distance of the section centre from viewport centre
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.transform = `translate3d(0,${(-offset).toFixed(1)}px,0)`;
    });
    ticking = false;
  }
  function onScroll() {
    onHeaderScroll();
    if (!reduceMotion && !ticking) { ticking = true; requestAnimationFrame(parallax); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', parallax);
  onScroll();

  /* =========================================================
     6. Scroll reveal (staggered)
     ========================================================= */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', (sib.indexOf(el) * 0.1) + 's');
    io.observe(el);
  });

  /* =========================================================
     7. Accordion (FAQ)
     ========================================================= */
  const accBtns = $$('.acc-btn');
  accBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !open);
    });
  });
  const toggleAll = $('#faqToggleAll');
  let allOpen = false;
  toggleAll.addEventListener('click', () => {
    allOpen = !allOpen;
    accBtns.forEach(b => b.setAttribute('aria-expanded', allOpen));
    toggleAll.firstChild.textContent = allOpen ? 'すべて閉じる ' : '一覧を見る ';
  });

  /* =========================================================
     8. Modal
     ========================================================= */
  const modal = $('#modal');
  const dialog = $('.modal__dialog', modal);
  const content = $('#modalContent');
  let lastFocus = null;

  const services = {
    sns:       { t: 'SNS・ネット誹謗中傷', d: 'SNSや匿名掲示板での悪質な書き込みに対し、削除から責任追及までトータルに対応します。', l: ['投稿の削除請求・仮処分', '発信者情報開示請求', '損害賠償請求・刑事告訴のサポート'] },
    fuhyo:     { t: 'ネット風評被害・炎上対策', d: '事実無根の口コミや拡散された炎上により受けた信用毀損を、法的手段で最小限に抑えます。', l: ['悪質な口コミ・レビューの削除', '炎上時の初動対応・声明文のリーガルチェック', '再発防止のためのモニタリング体制づくり'] },
    privacy:   { t: '個人情報漏洩・プライバシー侵害', d: '個人情報の無断公開や拡散を止め、被害の拡大を防ぎます。', l: ['住所・電話番号・画像の削除請求', 'リベンジポルノ・晒し行為への対応', '情報漏洩時の企業側の対応支援'] },
    copyright: { t: '著作権・知的財産権侵害', d: '画像・動画・文章などの無断使用に対する対応を行います。', l: ['無断転載・盗用コンテンツの削除', '侵害者への警告書送付・損害賠償請求', '権利侵害を指摘された場合の対応'] },
    fraud:     { t: 'ネット詐欺・オンライン犯罪', d: 'フィッシングやSNS型投資詐欺など、ネット犯罪の被害回復を目指します。', l: ['被害回復に向けた交渉・訴訟', '警察への被害届・告訴のサポート', '証拠保全のアドバイス'] },
    it:        { t: 'IT・インターネット関連法務', d: 'Webサービスの運営やIT企業の事業活動に必要な法務を支援します。', l: ['利用規約・プライバシーポリシー作成', 'システム開発・SaaS契約のレビュー', '個人情報保護法・特商法などのコンプライアンス'] }
  };

  function openModal(html, trigger) {
    lastFocus = trigger || document.activeElement;
    content.innerHTML = '';
    content.append(html);
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
  function fromTemplate(name) {
    const tpl = $('#tpl-' + name);
    return tpl ? tpl.content.cloneNode(true) : null;
  }
  function serviceNode(key) {
    const s = services[key];
    const div = document.createElement('div');
    div.innerHTML = `
      <span class="modal__tag">取扱業務</span>
      <h2 id="modalTitle" class="modal__title">${s.t}</h2>
      <p class="modal__lead">${s.d}</p>
      <ul class="modal__list">${s.l.map(x => `<li>${x}</li>`).join('')}</ul>
      <button type="button" class="btn btn--gold btn--block" data-modal-open="contact">この内容で無料相談する</button>`;
    return div;
  }

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      if (drawer.classList.contains('is-open')) setDrawer(false);
      const node = fromTemplate(opener.dataset.modalOpen);
      if (node) { openModal(node, opener.closest('#modal') ? lastFocus : opener); }
      return;
    }
    const card = e.target.closest('[data-service]');
    if (card) { openModal(serviceNode(card.dataset.service), card); return; }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false);
      return;
    }
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {              // focus trap
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

  /* Smooth anchor offset for in-page links handled by CSS scroll-padding-top */
})();

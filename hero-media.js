(() => {
  const FALLBACK = [{ id: 'default-world-checkin', src: '/assets/hero-world-checkin.svg', title: '', enabled: true, position: 'center' }];

  function ensureStyle() {
    if (document.querySelector('link[data-hero-media-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/hero-media.css?v=web41';
    link.dataset.heroMediaStyle = 'true';
    document.head.append(link);
  }

  function makeSlide(item, index) {
    const article = document.createElement('article');
    article.className = `hero-slide${index === 0 ? ' is-active' : ''}`;
    article.dataset.slide = String(index);
    article.setAttribute('aria-label', item.title || `Ảnh ${index + 1}`);
    article.setAttribute('aria-hidden', String(index !== 0));

    const image = document.createElement('img');
    image.className = 'slide-media';
    image.src = item.src;
    image.alt = item.title || `Ảnh nổi bật TÔI LÀ AI ${index + 1}`;
    image.decoding = 'async';
    image.draggable = false;
    image.loading = index === 0 ? 'eager' : 'lazy';
    if (index === 0) image.fetchPriority = 'high';
    image.style.objectPosition = item.position === 'left' ? '25% center' : item.position === 'right' ? '75% center' : 'center';
    article.append(image);

    if (item.title) {
      const caption = document.createElement('div');
      caption.className = 'slide-caption web41-caption';
      const dot = document.createElement('span');
      dot.className = 'status-dot';
      const text = document.createElement('b');
      text.textContent = item.title;
      caption.append(dot, text);
      article.append(caption);
    }
    return article;
  }

  function renderSlides(input) {
    const slides = (Array.isArray(input) ? input : []).filter(item => item && item.enabled !== false && item.src).slice(0, 8);
    const active = slides.length ? slides : FALLBACK;
    const track = document.querySelector('.hero-slides');
    const dots = document.querySelector('.slider-dots');
    if (!track || !dots) return;

    track.replaceChildren(...active.map(makeSlide));
    dots.replaceChildren(...active.map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.slideTo = String(index);
      button.setAttribute('aria-label', `Ảnh ${index + 1}`);
      if (index === 0) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'true');
      }
      return button;
    }));

    document.querySelectorAll('[data-slider]').forEach(button => { button.hidden = active.length < 2; });
    dots.hidden = active.length < 2;
    if (typeof window.showHeroSlide === 'function') window.showHeroSlide(0);
    if (typeof window.scheduleHeroSlide === 'function') window.scheduleHeroSlide();
  }

  async function loadSlides() {
    try {
      const response = await fetch('/api/hero-slides', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.ok && Array.isArray(payload?.slides)) return payload.slides;
    } catch {}
    return FALLBACK;
  }

  async function exposeOwnerControls() {
    try {
      const response = await fetch('/api/hero-slides?admin=1', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;

      const actions = document.querySelector('.nav-actions');
      if (actions && !actions.querySelector('[data-hero-admin-link]')) {
        const link = document.createElement('a');
        link.href = '/hero-admin';
        link.className = 'login-link web41-admin-link';
        link.dataset.heroAdminLink = 'true';
        link.textContent = 'Ảnh trang chủ';
        actions.insertBefore(link, actions.firstChild);
      }

      const workspaceNav = document.querySelector('#workspace-nav');
      if (workspaceNav && !workspaceNav.querySelector('[data-hero-admin-link]')) {
        const link = document.createElement('a');
        link.href = '/hero-admin';
        link.dataset.heroAdminLink = 'true';
        link.className = 'web41-workspace-admin';
        link.textContent = '▣ Ảnh trang chủ';
        workspaceNav.append(link);
      }
    } catch {}
  }

  async function mount() {
    ensureStyle();
    renderSlides(await loadSlides());
    exposeOwnerControls();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

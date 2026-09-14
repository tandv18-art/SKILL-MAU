(() => {
  const MEDIA = [
    { src: '/assets/hero-world-checkin.svg', alt: 'World Check-in — giữ nhận diện và thay đổi bối cảnh du lịch' },
    { src: '/assets/hero-product-photo.svg', alt: 'Product Photo — ảnh sản phẩm thương mại do AI hỗ trợ' },
    { src: '/assets/hero-premium-portrait.svg', alt: 'Premium Portrait — chân dung AI giữ nét khuôn mặt' },
    { src: '/assets/hero-content-ai.svg', alt: 'Content AI — quy trình nội dung từ ý tưởng đến lịch đăng' }
  ];

  function ensureStyle() {
    if (document.querySelector('link[data-hero-media-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/hero-media.css?v=web22-hero-media';
    link.dataset.heroMediaStyle = 'true';
    document.head.append(link);
  }

  function mountMedia() {
    ensureStyle();
    const slides = [...document.querySelectorAll('.hero-slide')];
    slides.forEach((slide, index) => {
      const media = MEDIA[index];
      if (!media || slide.querySelector('.slide-media')) return;
      const image = document.createElement('img');
      image.className = 'slide-media';
      image.src = media.src;
      image.alt = media.alt;
      image.decoding = 'async';
      image.draggable = false;
      image.loading = index === 0 ? 'eager' : 'lazy';
      if (index === 0) image.fetchPriority = 'high';
      const caption = slide.querySelector('.slide-caption');
      if (caption) slide.insertBefore(image, caption);
      else slide.append(image);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountMedia, { once: true });
  else mountMedia();
})();

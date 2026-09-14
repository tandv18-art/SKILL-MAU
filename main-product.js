(() => {
  const PRODUCT_URL = 'https://ai-social-post-kit.vercel.app';

  if (!document.querySelector('link[data-main-product-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/main-product.css?v=web21-main-product';
    style.dataset.mainProductStyle = 'true';
    document.head.append(style);
  }

  if (!document.querySelector('[data-main-product-nav]')) {
    const nav = document.querySelector('.nav-links');
    if (nav) {
      const link = document.createElement('a');
      link.href = '#main-product';
      link.textContent = 'Web App';
      link.dataset.mainProductNav = 'true';
      nav.prepend(link);
    }
  }

  if (document.getElementById('main-product')) return;
  const anchor = document.getElementById('use-cases');
  if (!anchor) return;

  const section = document.createElement('section');
  section.id = 'main-product';
  section.className = 'main-product-section';
  section.setAttribute('aria-labelledby', 'main-product-title');
  section.innerHTML = `
    <div class="container">
      <article class="main-product-card">
        <div class="main-product-copy">
          <span class="main-product-kicker">SẢN PHẨM CHÍNH · WEB APP</span>
          <h2 id="main-product-title">AI Social Post Kit</h2>
          <p>Biến một yêu cầu thành kế hoạch nội dung, bài đăng, hình ảnh/video, lịch và quy trình đăng mạng xã hội trong một không gian làm việc thống nhất.</p>
          <div class="main-product-flow" aria-label="Quy trình AI Social Post Kit">
            <span>Ý tưởng</span><i>→</i><span>Kế hoạch</span><i>→</i><span>Nội dung</span><i>→</i><span>Ảnh / Video</span><i>→</i><span>Lịch</span><i>→</i><span>Đăng</span>
          </div>
          <ul class="main-product-points">
            <li>Một lệnh có thể tạo cả kế hoạch nhiều bài thay vì làm thủ công từng bước.</li>
            <li>Nội dung và media đi cùng một workflow, dễ xem lại và quản lý trạng thái.</li>
            <li>Lịch đăng và bước duyệt được tách rõ để giữ quyền kiểm soát trước khi publish.</li>
          </ul>
          <div class="main-product-actions">
            <a class="button" href="${PRODUCT_URL}" target="_blank" rel="noopener noreferrer">Mở Web App ↗</a>
            <a class="button button-ghost" href="#skills">Khám phá công cụ AI</a>
          </div>
          <small class="main-product-note">Web App vận hành độc lập; TÔI LÀ AI là cửa vào sản phẩm và hệ sinh thái công cụ.</small>
        </div>

        <div class="main-product-preview" aria-label="Mô phỏng giao diện AI Social Post Kit">
          <div class="app-preview-shell">
            <div class="app-preview-topbar">
              <div class="app-preview-brand"><b>AI</b><span>Social Post Kit</span></div>
              <div class="app-preview-live">WORKSPACE READY</div>
            </div>
            <div class="app-preview-body">
              <aside class="app-preview-sidebar" aria-hidden="true">
                <div class="app-preview-nav">
                  <span class="active"><i>✦</i>Create</span>
                  <span><i>▤</i>Plan</span>
                  <span><i>▦</i>Posts</span>
                  <span><i>□</i>Calendar</span>
                </div>
              </aside>
              <div class="app-preview-workspace">
                <div class="app-preview-heading">
                  <div><b>Tạo chiến dịch mới</b><small>Từ một yêu cầu đến nội dung sẵn sàng lên lịch</small></div>
                  <em>AI WORKFLOW</em>
                </div>
                <div class="app-command-card">
                  <div class="app-command-label">YÊU CẦU CỦA BẠN</div>
                  <div class="app-command-input"><span>Lập kế hoạch 7 ngày và tạo nội dung cho Facebook + TikTok…</span><b>Tạo</b></div>
                </div>
                <div class="app-pipeline" aria-hidden="true">
                  <div class="app-stage ready"><strong>PLAN</strong><small>7 bài</small></div>
                  <div class="app-stage ready"><strong>CONTENT</strong><small>Sẵn sàng</small></div>
                  <div class="app-stage ready"><strong>MEDIA</strong><small>Ảnh / Video</small></div>
                  <div class="app-stage"><strong>SCHEDULE</strong><small>Đang duyệt</small></div>
                  <div class="app-stage"><strong>PUBLISH</strong><small>Kiểm soát</small></div>
                </div>
                <div class="app-preview-grid" aria-hidden="true">
                  <div class="app-mini-panel">
                    <small>BÀI ĐĂNG</small>
                    <div class="app-post-list">
                      <div class="app-post-row"><i></i><span></span><b>READY</b></div>
                      <div class="app-post-row"><i></i><span></span><b>READY</b></div>
                      <div class="app-post-row"><i></i><span></span><b>PLAN</b></div>
                    </div>
                  </div>
                  <div class="app-mini-panel">
                    <small>LỊCH NỘI DUNG</small>
                    <div class="app-calendar">
                      <span></span><span class="has-post"></span><span></span><span></span><span class="has-post"></span><span></span><span></span>
                      <span></span><span></span><span class="has-post"></span><span></span><span></span><span class="has-post"></span><span></span>
                    </div>
                  </div>
                </div>
                <div class="app-preview-footer"><span>Facebook · TikTok</span><b>Approval before publish</b></div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>`;

  anchor.before(section);
})();

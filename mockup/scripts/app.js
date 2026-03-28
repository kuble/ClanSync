/**
 * ClanSync 목업 공통 스크립트
 * 네비게이션 액티브 상태, 공통 인터랙션 처리
 */

// 현재 페이지 파일명으로 nav 액티브 처리
(function markActiveNav() {
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item, .sidebar-item').forEach(item => {
    const href = item.closest('a')?.getAttribute('href') || '';
    if (href && href.includes(currentFile)) {
      item.classList.add('active');
    }
  });
})();

// 스크롤 시 네비게이션 배경 강화
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  if (window.scrollY > 20) {
    navbar.style.background = 'rgba(10, 10, 15, 0.97)';
  } else {
    navbar.style.background = 'rgba(10, 10, 15, 0.85)';
  }
});

// 페이드인 초기화
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-in').forEach(el => {
    el.style.opacity = '1';
  });
});

// 모달 외부 클릭 닫기
document.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('[id$="Modal"]');
  modals.forEach(modal => {
    if (modal.style.display !== 'none' && e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// ── 프로필 드롭다운 ──
function toggleProfileMenu() {
  const btn = document.querySelector('.profile-btn');
  const dropdown = document.getElementById('profileDropdown');
  if (!btn || !dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    dropdown.classList.remove('open');
    btn.classList.remove('open');
  } else {
    dropdown.classList.add('open');
    btn.classList.add('open');
  }
}

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const menu = document.getElementById('profileMenu');
  if (menu && !menu.contains(e.target)) {
    const dropdown = document.getElementById('profileDropdown');
    const btn = document.querySelector('.profile-btn');
    if (dropdown) dropdown.classList.remove('open');
    if (btn) btn.classList.remove('open');
  }
});

// 테마 토글 (목업: 시각 효과만)
function toggleTheme() {
  const toggle = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!toggle) return;
  toggle.classList.toggle('on');
  const isDark = toggle.classList.contains('on');
  if (icon) icon.textContent = isDark ? '🌙' : '☀️';
}

// 언어 변경
function setLang(el, code) {
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // 목업: 실제 언어 변경 없음
}

// ── 모바일 사이드 드로어 (768px 이하) ──
const SIDEBAR_DRAWER_MQ = window.matchMedia('(max-width: 768px)');

function isSidebarDrawerMode() {
  return SIDEBAR_DRAWER_MQ.matches;
}

function toggleSidebarDrawer() {
  if (!isSidebarDrawerMode()) return;
  const open = document.body.classList.toggle('app-sidebar-drawer-open');
  syncSidebarDrawerAria(open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function closeSidebarDrawer() {
  if (!document.body.classList.contains('app-sidebar-drawer-open')) return;
  document.body.classList.remove('app-sidebar-drawer-open');
  syncSidebarDrawerAria(false);
  document.body.style.overflow = '';
}

function syncSidebarDrawerAria(open) {
  const btn = document.getElementById('mobileMenuBtn');
  if (!btn) return;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
}

function onSidebarDrawerResize() {
  if (window.innerWidth > 768) {
    closeSidebarDrawer();
  }
}

window.addEventListener('resize', onSidebarDrawerResize);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebarDrawer();
    const bcm = document.getElementById('mock-badge-case-modal');
    if (bcm && !bcm.hasAttribute('hidden')) {
      mockBadgeCaseModalClose();
      return;
    }
    const ppm = document.getElementById('mock-player-profile-modal');
    if (ppm && !ppm.hasAttribute('hidden')) {
      mockPlayerProfileModalClose();
    }
  }
});

document.addEventListener('click', (e) => {
  if (!document.body.classList.contains('app-sidebar-drawer-open')) return;
  if (!isSidebarDrawerMode()) return;
  if (e.target.closest('.mobile-menu-btn')) return;
  const side = e.target.closest('.sidebar');
  if (!side) return;
  if (e.target.closest('a, .sidebar-item, button')) {
    closeSidebarDrawer();
  }
});

// ── 플레이어 프로필 모달 (partials 주입) ──
function mockPlayerProfileModalInject() {
  if (document.getElementById('mock-player-profile-modal')) {
    return Promise.resolve();
  }
  const sc = document.querySelector('script[src*="app.js"]');
  if (!sc || !sc.src) {
    return Promise.reject(new Error('app.js src not found'));
  }
  const url = new URL('../partials/player-profile-modal.html', sc.src);
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML('beforeend', html);
    });
}

function mockPlayerProfileModalOpen() {
  mockPlayerProfileModalInject()
    .then(() => {
      const d = document.getElementById('profileDropdown');
      const b = document.querySelector('.profile-btn');
      if (d) d.classList.remove('open');
      if (b) b.classList.remove('open');
      const m = document.getElementById('mock-player-profile-modal');
      if (!m) return;
      m.removeAttribute('hidden');
      m.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    })
    .catch(() => {
      window.location.href = 'profile.html';
    });
}

function mockPlayerProfileModalClose() {
  const m = document.getElementById('mock-player-profile-modal');
  if (!m) return;
  m.setAttribute('hidden', '');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function mockPlayerProfileTab(el, name) {
  const root = el.closest('.mock-player-profile-root');
  if (!root) return;
  root.querySelectorAll('[data-profile-tab]').forEach((t) => {
    const on = t.getAttribute('data-profile-tab') === name;
    t.classList.toggle('mock-profile-tab--active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  root.querySelectorAll('[data-profile-panel]').forEach((p) => {
    const show = p.getAttribute('data-profile-panel') === name;
    if (show) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });
}

function mockPlayerProfileGameSelect(el, gameKey) {
  const root = el.closest('.mock-player-profile-root');
  if (!root) return;
  root.querySelectorAll('[data-profile-game-chip]').forEach((c) => {
    if (c.disabled) return;
    const on = c.getAttribute('data-profile-game-chip') === gameKey;
    c.classList.toggle('mock-profile-game-chip--active', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  root.querySelectorAll('[data-profile-game-panel]').forEach((p) => {
    const show = p.getAttribute('data-profile-game-panel') === gameKey;
    if (show) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });
}

// ── 뱃지 케이스 모달 (게임별 partial 주입) ──
function mockBadgeCaseModalInject() {
  if (document.getElementById('mock-badge-case-modal')) {
    return Promise.resolve();
  }
  const sc = document.querySelector('script[src*="app.js"]');
  if (!sc || !sc.src) {
    return Promise.reject(new Error('app.js src not found'));
  }
  const url = new URL('../partials/badge-case-modal.html', sc.src);
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML('beforeend', html);
    });
}

function mockBadgeCaseTab(el, tabId) {
  const variant = el.closest('.mock-badge-case-variant');
  if (!variant) return;
  variant.querySelectorAll('[data-bc-tab]').forEach((btn) => {
    const on = btn.getAttribute('data-bc-tab') === tabId;
    btn.classList.toggle('mock-badge-case-tab--active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  variant.querySelectorAll('[data-bc-panel]').forEach((panel) => {
    const show = panel.getAttribute('data-bc-panel') === tabId;
    if (show) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });
}

function mockBadgeCaseModalApplyGame(gameKey) {
  const root = document.getElementById('mock-badge-case-modal');
  if (!root) return;
  const titles = {
    ow2: '오버워치 2 뱃지 케이스',
    val: '발로란트 뱃지 케이스',
  };
  const t = root.querySelector('#mock-badge-case-title');
  if (t) t.textContent = titles[gameKey] || '뱃지 케이스';
  root.querySelectorAll('[data-badge-case-for]').forEach((el) => {
    const match = el.getAttribute('data-badge-case-for') === gameKey;
    if (match) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  });
  const variant = root.querySelector(`[data-badge-case-for="${gameKey}"]`);
  if (variant) {
    const firstBtn = variant.querySelector('[data-bc-tab]');
    if (firstBtn) {
      const tid = firstBtn.getAttribute('data-bc-tab');
      mockBadgeCaseTab(firstBtn, tid);
    }
  }
}

function mockBadgeCaseModalOpen(gameKey) {
  const key = gameKey === 'val' ? 'val' : 'ow2';
  mockBadgeCaseModalInject()
    .then(() => {
      mockBadgeCaseModalApplyGame(key);
      const m = document.getElementById('mock-badge-case-modal');
      if (!m) return;
      m.removeAttribute('hidden');
      m.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    })
    .catch(() => {
      alert('목업: 뱃지 케이스 UI를 불러오지 못했습니다.');
    });
}

function mockBadgeCaseModalClose() {
  const m = document.getElementById('mock-badge-case-modal');
  if (!m) return;
  m.setAttribute('hidden', '');
  m.setAttribute('aria-hidden', 'true');
  const ppm = document.getElementById('mock-player-profile-modal');
  if (!ppm || ppm.hasAttribute('hidden')) {
    document.body.style.overflow = '';
  }
}

window.mockPlayerProfileModalOpen = mockPlayerProfileModalOpen;
window.mockPlayerProfileModalClose = mockPlayerProfileModalClose;
window.mockPlayerProfileTab = mockPlayerProfileTab;
window.mockPlayerProfileGameSelect = mockPlayerProfileGameSelect;
window.mockBadgeCaseModalOpen = mockBadgeCaseModalOpen;
window.mockBadgeCaseModalClose = mockBadgeCaseModalClose;
window.mockBadgeCaseTab = mockBadgeCaseTab;

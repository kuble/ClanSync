/**
 * ClanSync 목업 공통 스크립트
 * 네비게이션 액티브 상태, 공통 인터랙션 처리
 */

// ── 테마 스코프/모드 적용 (Hub sessionStorage + URL 쿼리 우선) ──
(function applyMockThemeFromContext() {
  const THEME_SCOPE_KEY = "clansync-hub-theme-scope";
  const THEME_MODE_KEY = "clansync-hub-theme-mode";
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  const landingFiles = new Set(['index.html', 'sign-in.html', 'sign-up.html']);
  const fallbackScope = landingFiles.has(currentFile) ? 'landing' : 'dashboard';
  const params = new URLSearchParams(location.search);

  const paramScope = (params.get('themeScope') || '').toLowerCase();
  const paramMode = (params.get('themeMode') || '').toLowerCase();

  let scope = (paramScope === 'landing' || paramScope === 'dashboard') ? paramScope : '';
  let mode = (paramMode === 'light' || paramMode === 'dark') ? paramMode : '';

  if (!scope) {
    try {
      const storedScope = (sessionStorage.getItem(THEME_SCOPE_KEY) || '').toLowerCase();
      if (storedScope === 'landing' || storedScope === 'dashboard') scope = storedScope;
    } catch (e) {}
  }
  if (!mode) {
    try {
      const storedMode = (sessionStorage.getItem(THEME_MODE_KEY) || '').toLowerCase();
      if (storedMode === 'light' || storedMode === 'dark') mode = storedMode;
    } catch (e) {}
  }

  scope = scope || fallbackScope;
  mode = mode || 'dark';

  document.body.setAttribute('data-theme-scope', scope);
  document.body.setAttribute('data-theme-mode', mode);
})();

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

// 페이드인 초기화
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-in').forEach((el) => {
    el.style.opacity = '1';
  });
  mockNameplateApplyPreview('ow');
  mockNameplateApplyPreview('val');
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
    const npm = document.getElementById('mock-nameplate-case-modal');
    if (npm && !npm.hasAttribute('hidden')) {
      mockNameplateCaseModalClose();
      return;
    }
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
    btn.classList.toggle('mock-profile-tab--active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  variant.querySelectorAll('[data-bc-panel]').forEach((panel) => {
    const show = panel.getAttribute('data-bc-panel') === tabId;
    if (show) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });
}

/** 밸런스 슬롯·프로필 네임카드 공통: 표시 뱃지 상한(목업) */
const MOCK_BADGE_NAMEPLATE_MAX = 5;

/** 목업: 게임별 네임카드에 올릴 뱃지 id 배열(최대 MOCK_BADGE_NAMEPLATE_MAX) */
function mockBadgeCaseGetPicks() {
  if (!window.__mockBadgeCasePicks) {
    window.__mockBadgeCasePicks = { ow: [], val: [] };
  }
  return window.__mockBadgeCasePicks;
}

function mockBadgeCaseInitDefaultPicks(gameKey) {
  const picks = mockBadgeCaseGetPicks();
  if (!picks[gameKey]) picks[gameKey] = [];
  if (!window.__mockBadgeCasePicksSeeded) window.__mockBadgeCasePicksSeeded = {};
  if (window.__mockBadgeCasePicksSeeded[gameKey]) return;
  window.__mockBadgeCasePicksSeeded[gameKey] = true;
  if (gameKey === 'ow') {
    picks.ow = ['ow-battle-1', 'ow-join-1', 'ow-battle-3', 'ow-clan-1', 'ow-sync-1'];
  } else if (gameKey === 'val') {
    picks.val = ['val-battle-1', 'val-battle-2', 'val-battle-3', 'val-clan-1', 'val-sync-1'];
  }
}

function mockBadgeCaseTogglePick(btn) {
  const id = btn.getAttribute('data-badge-id');
  const game = btn.getAttribute('data-game');
  if (!id || !game) return;
  const picks = mockBadgeCaseGetPicks();
  if (!picks[game]) picks[game] = [];
  const arr = picks[game];
  const idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else if (arr.length >= MOCK_BADGE_NAMEPLATE_MAX) {
    alert(`네임카드에는 최대 ${MOCK_BADGE_NAMEPLATE_MAX}개까지 표시할 수 있습니다.`);
    return;
  } else {
    arr.push(id);
  }
  mockBadgeCaseApplyPicksUI(game);
}

function mockBadgeCaseApplyPicksUI(game) {
  const root = document.getElementById('mock-badge-case-modal');
  if (!root) return;
  const variant = root.querySelector(`[data-badge-case-for="${game}"]`);
  if (!variant) return;
  const picks = mockBadgeCaseGetPicks()[game] || [];
  variant.querySelectorAll('[data-badge-id]').forEach((b) => {
    const on = picks.includes(b.getAttribute('data-badge-id'));
    b.classList.toggle('mock-badge-case-slot--pick', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const ol = variant.querySelector('[data-badge-pick-list]');
  if (!ol) return;
  ol.innerHTML = '';
  for (let i = 0; i < MOCK_BADGE_NAMEPLATE_MAX; i += 1) {
    const bid = picks[i];
    const li = document.createElement('li');
    if (bid) {
      const el = variant.querySelector(`[data-badge-id="${bid}"]`);
      const ico = el ? el.getAttribute('data-badge-ico') : '·';
      const name = el ? el.getAttribute('data-badge-name') : '';
      li.innerHTML = `<span class="mock-badge-case-pick-ord">${i + 1}</span> <span class="mock-badge-case-pick-ico">${ico}</span> <span class="mock-badge-case-pick-name">${name}</span>`;
    } else {
      li.className = 'mock-badge-case-pick-row--empty';
      li.innerHTML = `<span class="mock-badge-case-pick-ord">${i + 1}</span> <span class="mock-badge-case-pick-empty">비어 있음</span>`;
    }
    ol.appendChild(li);
  }
}

function mockBadgeCaseModalApplyGame(gameKey) {
  const root = document.getElementById('mock-badge-case-modal');
  if (!root) return;
  const titles = {
    ow: '오버워치 뱃지 케이스',
    val: '발로란트 뱃지 케이스',
  };
  const t = root.querySelector('#mock-badge-case-title');
  if (t) t.textContent = titles[gameKey] || '뱃지 케이스';
  root.querySelectorAll('[data-badge-case-for]').forEach((el) => {
    const match = el.getAttribute('data-badge-case-for') === gameKey;
    if (match) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  });
  mockBadgeCaseInitDefaultPicks(gameKey);
  mockBadgeCaseApplyPicksUI(gameKey);
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
  const key = gameKey === 'val' ? 'val' : 'ow';
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
  const npm = document.getElementById('mock-nameplate-case-modal');
  const keepScrollLock =
    (ppm && !ppm.hasAttribute('hidden')) || (npm && !npm.hasAttribute('hidden'));
  if (!keepScrollLock) {
    document.body.style.overflow = '';
  }
}

// ── 네임카드 · 밸런스 슬롯 꾸미기 (partial 주입) ──
const MOCK_NAMEPLATE_META = {
  ow: {
    emblem: { 'ow-e1': '🏆', 'ow-e2': '⚔️', 'ow-e3': '🛡️' },
    namebar: { 'ow-nb1': '', 'ow-nb2': 'mock-profile-np-namebar--gold', 'ow-nb3': 'mock-profile-np-namebar--cyan' },
    sub: {
      'ow-s1': { ico: '🔔', text: '시즌 칭호 · 뉴비 · 프레임: 녹색 러너' },
      'ow-s2': { ico: '⭐', text: '플레이스먼트 · 다이아 목표' },
      'ow-s3': { ico: '🏅', text: '클랜 내전 MVP' },
    },
    frame: { 'ow-f1': '', 'ow-f2': 'mock-profile-np-preview--ow-f2', 'ow-f3': 'mock-profile-np-preview--ow-f3' },
  },
  val: {
    emblem: { 'val-e1': '🎯', 'val-e2': '💀', 'val-e3': '✨' },
    namebar: {
      'val-nb1': '',
      'val-nb2': 'mock-profile-np-namebar--val-neon',
      'val-nb3': 'mock-profile-np-namebar--val-dark',
    },
    sub: {
      'val-s1': { ico: '✦', text: '타격대 · 붉은 테두리 프레임' },
      'val-s2': { ico: '💣', text: '스파이크 캐리 · 레디언트 도전' },
      'val-s3': { ico: '🎮', text: '듀오 큐 · 페이드 메인' },
    },
    frame: { 'val-f1': '', 'val-f2': 'mock-profile-np-preview--val-f2', 'val-f3': 'mock-profile-np-preview--val-f3' },
  },
};

function mockNameplateGetState() {
  if (!window.__mockNameplateState) {
    window.__mockNameplateState = {
      ow: { emblem: 'ow-e1', namebar: 'ow-nb1', sub: 'ow-s1', frame: 'ow-f1' },
      val: { emblem: 'val-e1', namebar: 'val-nb1', sub: 'val-s1', frame: 'val-f1' },
    };
  }
  return window.__mockNameplateState;
}

function stripNameplateNamebarClasses(el, game) {
  const all =
    game === 'ow'
      ? ['mock-profile-np-namebar--gold', 'mock-profile-np-namebar--cyan']
      : ['mock-profile-np-namebar--val-neon', 'mock-profile-np-namebar--val-dark'];
  all.forEach((c) => el.classList.remove(c));
}

function stripNameplateFrameClasses(preview, game) {
  const all =
    game === 'ow'
      ? ['mock-profile-np-preview--ow-f2', 'mock-profile-np-preview--ow-f3']
      : ['mock-profile-np-preview--val-f2', 'mock-profile-np-preview--val-f3'];
  all.forEach((c) => preview.classList.remove(c));
}

function mockNameplateApplyPreview(game) {
  const st = mockNameplateGetState()[game];
  if (!st) return;
  const meta = MOCK_NAMEPLATE_META[game];
  if (!meta) return;
  document.querySelectorAll(`[data-nameplate-preview="${game}"]`).forEach((preview) => {
    const em = preview.querySelector('.mock-profile-np-emblem');
    if (em && meta.emblem[st.emblem]) em.textContent = meta.emblem[st.emblem];
    const nb = preview.querySelector('.mock-profile-np-namebar');
    if (nb) {
      stripNameplateNamebarClasses(nb, game);
      const cls = meta.namebar[st.namebar];
      if (cls) nb.classList.add(cls);
    }
    const sub = preview.querySelector('.mock-profile-np-sub');
    if (sub && meta.sub[st.sub]) {
      const { ico, text } = meta.sub[st.sub];
      sub.innerHTML = `<span class="mock-profile-np-sub-ico">${ico}</span> ${text}`;
    }
    stripNameplateFrameClasses(preview, game);
    const fc = meta.frame[st.frame];
    if (fc) preview.classList.add(fc);
  });
}

function mockNameplateCaseModalInject() {
  if (document.getElementById('mock-nameplate-case-modal')) {
    return Promise.resolve();
  }
  const sc = document.querySelector('script[src*="app.js"]');
  if (!sc || !sc.src) {
    return Promise.reject(new Error('app.js src not found'));
  }
  const url = new URL('../partials/nameplate-case-modal.html', sc.src);
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML('beforeend', html);
    });
}

function mockNameplateCaseTab(el, tabId) {
  const variant = el.closest('.mock-nameplate-case-variant');
  if (!variant) return;
  variant.querySelectorAll('[data-np-tab]').forEach((btn) => {
    const on = btn.getAttribute('data-np-tab') === tabId;
    btn.classList.toggle('mock-profile-tab--active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  variant.querySelectorAll('[data-np-panel]').forEach((panel) => {
    const show = panel.getAttribute('data-np-panel') === tabId;
    if (show) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });
}

function mockNameplateCaseSyncModalUI(game) {
  const st = mockNameplateGetState()[game];
  if (!st) return;
  const root = document.getElementById('mock-nameplate-case-modal');
  if (!root) return;
  const variant = root.querySelector(`[data-nameplate-case-for="${game}"]`);
  if (!variant) return;
  variant.querySelectorAll('[data-np-opt]').forEach((btn) => {
    const cat = btn.getAttribute('data-np-cat');
    const opt = btn.getAttribute('data-np-opt');
    const on = st[cat] === opt;
    btn.classList.toggle('mock-nameplate-case-opt--on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function mockNameplateCaseSelect(btn) {
  const game = btn.getAttribute('data-game');
  const cat = btn.getAttribute('data-np-cat');
  const opt = btn.getAttribute('data-np-opt');
  if (!game || !cat || !opt) return;
  const st = mockNameplateGetState();
  if (!st[game]) st[game] = {};
  st[game][cat] = opt;
  mockNameplateApplyPreview(game);
  mockNameplateCaseSyncModalUI(game);
}

function mockNameplateCaseModalApplyGame(gameKey) {
  const root = document.getElementById('mock-nameplate-case-modal');
  if (!root) return;
  const titles = {
    ow: '오버워치 · 네임카드',
    val: '발로란트 · 네임카드',
  };
  const t = root.querySelector('#mock-nameplate-case-title');
  if (t) t.textContent = titles[gameKey] || '네임카드 · 밸런스 슬롯';
  root.querySelectorAll('[data-nameplate-case-for]').forEach((el) => {
    const match = el.getAttribute('data-nameplate-case-for') === gameKey;
    if (match) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  });
  mockNameplateApplyPreview(gameKey);
  mockNameplateCaseSyncModalUI(gameKey);
  const variant = root.querySelector(`[data-nameplate-case-for="${gameKey}"]`);
  if (variant) {
    const firstBtn = variant.querySelector('[data-np-tab]');
    if (firstBtn) {
      const tid = firstBtn.getAttribute('data-np-tab');
      mockNameplateCaseTab(firstBtn, tid);
    }
  }
}

function mockNameplateCaseModalOpen(gameKey) {
  const key = gameKey === 'val' ? 'val' : 'ow';
  mockNameplateCaseModalInject()
    .then(() => {
      mockNameplateCaseModalApplyGame(key);
      const m = document.getElementById('mock-nameplate-case-modal');
      if (!m) return;
      m.removeAttribute('hidden');
      m.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    })
    .catch(() => {
      alert('목업: 네임카드 꾸미기 UI를 불러오지 못했습니다.');
    });
}

function mockNameplateCaseModalClose() {
  const m = document.getElementById('mock-nameplate-case-modal');
  if (!m) return;
  m.setAttribute('hidden', '');
  m.setAttribute('aria-hidden', 'true');
  const ppm = document.getElementById('mock-player-profile-modal');
  const bcm = document.getElementById('mock-badge-case-modal');
  const keepScrollLock =
    (ppm && !ppm.hasAttribute('hidden')) || (bcm && !bcm.hasAttribute('hidden'));
  if (!keepScrollLock) {
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
window.mockBadgeCaseTogglePick = mockBadgeCaseTogglePick;
window.mockNameplateCaseModalOpen = mockNameplateCaseModalOpen;
window.mockNameplateCaseModalClose = mockNameplateCaseModalClose;
window.mockNameplateCaseTab = mockNameplateCaseTab;
window.mockNameplateCaseSelect = mockNameplateCaseSelect;
window.mockNameplateApplyPreview = mockNameplateApplyPreview;

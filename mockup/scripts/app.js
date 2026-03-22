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

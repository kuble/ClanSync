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

/**
 * 클랜 메인 정적 목업 — 뷰 전환·권한 목업(?role=)·이벤트 모달
 * (app.js 와 분리해 전역 충돌 최소화)
 */
(function () {
  var CLAN_VIEW_MAP = {
    dash: "view-dash",
    balance: "view-balance",
    stats: "view-stats",
    events: "view-events",
    manage: "view-manage",
    store: "view-store",
  };

  var OFFICER_VIEWS = { balance: true, manage: true };

  window.mockClanCurrentRole = function () {
    try {
      var p = new URLSearchParams(window.location.search);
      var r = (p.get("role") || "leader").toLowerCase();
      if (r === "member" || r === "officer" || r === "leader") return r;
    } catch (e) {}
    return "leader";
  };

  function applyRoleBodyClass() {
    var role = window.mockClanCurrentRole();
    document.body.classList.remove(
      "mock-role-leader",
      "mock-role-officer",
      "mock-role-member",
    );
    document.body.classList.add("mock-role-" + role);

    var label = { leader: "클랜장", officer: "운영진", member: "구성원" }[role];
    var el = document.getElementById("mock-clan-role-label");
    if (el) el.textContent = label;

    document.querySelectorAll("[data-officer-nav]").forEach(function (a) {
      if (role === "member") {
        a.style.opacity = "0.45";
        a.style.pointerEvents = "none";
        a.setAttribute("aria-disabled", "true");
        a.title = "운영진 이상만 이용 (목업)";
      } else {
        a.style.opacity = "";
        a.style.pointerEvents = "";
        a.removeAttribute("aria-disabled");
        a.removeAttribute("title");
      }
    });
  }

  window.clanGo = function (view, anchorEl) {
    if (!CLAN_VIEW_MAP[view]) view = "dash";

    var role = window.mockClanCurrentRole();
    if (role === "member" && OFFICER_VIEWS[view]) {
      window.alert("목업: 구성원은 이 영역에 접근할 수 없습니다. (운영진+ 전용)");
      return false;
    }

    document.querySelectorAll(".clan-view").forEach(function (el) {
      el.classList.toggle("is-active", el.id === CLAN_VIEW_MAP[view]);
    });
    document.querySelectorAll("a.clan-nav .sidebar-item").forEach(function (si) {
      si.classList.remove("active");
    });
    if (anchorEl) {
      var item = anchorEl.querySelector(".sidebar-item");
      if (item) item.classList.add("active");
    }

    try {
      if (view === "dash") {
        if (location.hash) {
          history.replaceState(null, "", location.pathname + location.search);
        }
      } else {
        location.hash = view;
      }
    } catch (e) {}

    return false;
  };

  function syncFromHash() {
    var h = (location.hash || "").replace(/^#/, "");
    var v = CLAN_VIEW_MAP[h] ? h : "dash";
    if (window.mockClanCurrentRole() === "member" && OFFICER_VIEWS[v]) {
      v = "dash";
    }
    var link = document.querySelector('a.clan-nav[href="#' + v + '"]');
    window.clanGo(v, link || document.querySelector("a.clan-nav"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* 일정 모달: 초기에는 반드시 닫힘 (CSS·hidden 동기화) */
    var modal = document.getElementById("mock-event-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    applyRoleBodyClass();
    syncFromHash();
  });
  window.addEventListener("hashchange", syncFromHash);

  /* 이벤트: 일정 등록 모달 */
  window.mockEventOpenModal = function () {
    var m = document.getElementById("mock-event-modal");
    if (m) {
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
    }
  };
  window.mockEventCloseModal = function () {
    var m = document.getElementById("mock-event-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
  };

  /* 통계: 기간 탭 목업 */
  window.mockStatsSetPeriod = function (btn, name) {
    document.querySelectorAll("[data-stats-period]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-stats-period-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-stats-period-panel") === name ? "" : "none";
    });
  };

  /* 이벤트: 목록 / 캘린더 서브탭 */
  window.mockEventsSetTab = function (btn, name) {
    document.querySelectorAll("[data-events-subtab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-events-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-events-panel") === name ? "" : "none";
    });
  };

  /* 스토어: 클랜 / 개인 */
  window.mockStoreSetTab = function (btn, name) {
    document.querySelectorAll("[data-store-tab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-store-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-store-panel") === name ? "" : "none";
    });
  };

  /* 밸런스: 경기 탭 목업 */
  window.mockBalanceSetMatch = function (btn, id) {
    document.querySelectorAll("[data-balance-match-tab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-balance-match-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-balance-match-panel") === id ? "" : "none";
    });
  };

  /** 배너「내전 시작」— 구성원이면 안내 */
  window.clanBannerBalanceClick = function () {
    if (window.mockClanCurrentRole() === "member") {
      window.alert("목업: 구성원은 밸런스메이커를 열 수 없습니다.");
      return;
    }
    var link = document.querySelector('a.clan-nav[href="#balance"]');
    window.clanGo("balance", link);
  };
})();

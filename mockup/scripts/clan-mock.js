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

    if (view === "stats" && typeof window.mockStatsRender === "function") {
      window.mockStatsRender();
    }

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

  /* ── 클랜 통계 (클랜 단위 집계 · clan-stats-plan §9) ── */
  window.__mockStatsState = { period: "30d", type: "all" };

  var CLAN_STATS_ANCHOR = new Date("2026-03-23T12:00:00.000Z");
  var CLAN_STATS_MS_DAY = 86400000;
  /** @type {{ at: string, type: string, map: string, mapType: string, won: boolean, score: string }[]} */
  var CLAN_STATS_MATCHES = [
    { at: "2026-03-22T18:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", won: true, score: "3-2" },
    { at: "2026-03-20T19:30:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", won: false, score: "2-3" },
    { at: "2026-03-18T21:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", won: true, score: "3-1" },
    { at: "2026-03-15T20:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", won: true, score: "3-0" },
    { at: "2026-03-12T21:00:00.000Z", type: "scrim", map: "서킷 로얄", mapType: "클래시", won: true, score: "3-1" },
    { at: "2026-03-08T20:00:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", won: false, score: "1-3" },
    { at: "2026-03-05T21:30:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", won: true, score: "2-0" },
    { at: "2026-03-01T19:00:00.000Z", type: "intra", map: "할리우드", mapType: "호위", won: true, score: "3-2" },
    { at: "2026-02-25T20:00:00.000Z", type: "scrim", map: "스리아", mapType: "돌격", won: false, score: "2-3" },
    { at: "2026-02-20T21:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", won: true, score: "3-1" },
    { at: "2026-02-14T18:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", won: false, score: "1-3" },
    { at: "2026-02-08T20:00:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", won: true, score: "3-2" },
    { at: "2026-02-01T21:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", won: true, score: "3-0" },
    { at: "2026-01-28T19:30:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", won: true, score: "3-2" },
    { at: "2026-01-20T20:00:00.000Z", type: "scrim", map: "할리우드", mapType: "호위", won: false, score: "1-3" },
    { at: "2026-01-12T21:00:00.000Z", type: "intra", map: "스리아", mapType: "돌격", won: true, score: "3-1" },
    { at: "2026-01-05T18:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", won: true, score: "3-2" },
    { at: "2025-12-22T20:00:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", won: true, score: "2-1" },
    { at: "2025-12-10T19:00:00.000Z", type: "scrim", map: "뉴 정크 시티", mapType: "제어", won: false, score: "0-3" },
    { at: "2025-11-28T21:00:00.000Z", type: "intra", map: "파라이소", mapType: "호위", won: true, score: "3-2" },
  ];

  function mockStatsFiltered() {
    var st = window.__mockStatsState;
    var days =
      st.period === "90d" ? 90 : st.period === "all" ? null : 30;
    var start =
      days === null
        ? null
        : new Date(CLAN_STATS_ANCHOR.getTime() - days * CLAN_STATS_MS_DAY);
    return CLAN_STATS_MATCHES.filter(function (m) {
      var d = new Date(m.at);
      if (start && d < start) return false;
      if (st.type === "all") return true;
      return m.type === st.type;
    });
  }

  function mockStatsTypeLabel(t) {
    if (t === "intra") return "내전";
    if (t === "scrim") return "스크림";
    return "이벤트";
  }

  function mockStatsTypeBadgeClass(t) {
    if (t === "intra") return "badge badge-brand";
    if (t === "scrim") return "badge badge-success";
    return "badge badge-pro";
  }

  function mockStatsFormatDate(iso) {
    var d = new Date(iso);
    var w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return d.getMonth() + 1 + "/" + d.getDate() + " (" + w + ")";
  }

  /** 상단 탭: 요약 / 경기 기록 / 순위·맵 */
  window.mockStatsSetSection = function (btn, name) {
    document.querySelectorAll("[data-stats-section-tab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-stats-section-panel]").forEach(function (p) {
      p.style.display =
        p.getAttribute("data-stats-section-panel") === name ? "" : "none";
    });
    return false;
  };

  window.mockStatsPickPeriod = function (btn, v) {
    window.__mockStatsState.period = v;
    document.querySelectorAll("[data-stats-period]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b.getAttribute("data-stats-period") === v);
    });
    window.mockStatsRender();
    return false;
  };

  window.mockStatsPickType = function (btn, v) {
    window.__mockStatsState.type = v;
    document.querySelectorAll("[data-stats-type]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b.getAttribute("data-stats-type") === v);
    });
    window.mockStatsRender();
    return false;
  };

  window.mockStatsRender = function () {
    var list = mockStatsFiltered();
    var n = list.length;
    var wins = 0;
    var intra = 0;
    var scrim = 0;
    var ev = 0;
    list.forEach(function (m) {
      if (m.won) wins++;
      if (m.type === "intra") intra++;
      else if (m.type === "scrim") scrim++;
      else ev++;
    });
    var losses = n - wins;
    var wr = n === 0 ? null : Math.round((wins / n) * 1000) / 10;
    var intraPct =
      n === 0 ? null : Math.round((intra / n) * 1000) / 10;

    var elTotal = document.getElementById("mock-stats-kpi-total");
    var elSplit = document.getElementById("mock-stats-kpi-split");
    var elWr = document.getElementById("mock-stats-kpi-winrate");
    var elRec = document.getElementById("mock-stats-kpi-record");
    var elIntraPct = document.getElementById("mock-stats-kpi-intra-pct");
    if (elTotal) elTotal.textContent = String(n);
    if (elSplit) {
      elSplit.textContent =
        "내전 " + intra + " · 스크림 " + scrim + " · 이벤트 " + ev;
    }
    if (elWr) elWr.textContent = wr === null ? "—" : wr + "%";
    if (elRec) elRec.textContent = wins + "승 " + losses + "패";
    if (elIntraPct) {
      elIntraPct.textContent = intraPct === null ? "—" : intraPct + "%";
    }

    var tb = document.getElementById("mock-stats-archive-tbody");
    if (tb) {
      if (n === 0) {
        tb.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">이 조건에 해당하는 경기가 없습니다.</td></tr>';
      } else {
        var sorted = list.slice().sort(function (a, b) {
          return new Date(b.at) - new Date(a.at);
        });
        tb.innerHTML = sorted
          .map(function (m) {
            var wl = m.won ? "승" : "패";
            var wc = m.won ? "#34d399" : "#fb7185";
            return (
              "<tr><td style=\"color:var(--text-muted)\">" +
              mockStatsFormatDate(m.at) +
              '</td><td><span class="' +
              mockStatsTypeBadgeClass(m.type) +
              '" style="font-size:10px">' +
              mockStatsTypeLabel(m.type) +
              "</span></td><td>" +
              m.map +
              '</td><td><span style="color:' +
              wc +
              ';font-weight:700">' +
              wl +
              "</span> <span style=\"color:var(--text-muted);font-size:12px\">" +
              m.score +
              "</span></td></tr>"
            );
          })
          .join("");
      }
    }

    var mapWrap = document.getElementById("mock-stats-map-wrap");
    if (mapWrap) {
      var agg = {};
      list.forEach(function (m) {
        var k = m.map + "\t" + m.mapType;
        if (!agg[k]) agg[k] = { map: m.map, mapType: m.mapType, g: 0, w: 0 };
        agg[k].g++;
        if (m.won) agg[k].w++;
      });
      var rows = Object.keys(agg)
        .map(function (k) {
          return agg[k];
        })
        .sort(function (a, b) {
          return b.g - a.g;
        })
        .slice(0, 8);
      if (rows.length === 0) {
        mapWrap.innerHTML =
          '<p style="font-size:13px;color:var(--text-muted);margin:0">집계할 경기가 없습니다.</p>';
      } else {
        mapWrap.innerHTML = rows
          .map(function (r) {
            var pct = r.g === 0 ? 0 : Math.round((r.w / r.g) * 1000) / 10;
            var barW = pct;
            return (
              '<div class="mock-stats-map-row">' +
              '<div class="mock-stats-map-meta"><span><strong>' +
              r.map +
              '</strong> <span style="color:var(--text-muted);font-weight:400">· ' +
              r.mapType +
              '</span></span><span style="color:var(--text-muted);white-space:nowrap">' +
              r.g +
              "경기 · 승률 " +
              pct +
              "%</span></div>" +
              '<div class="mock-stats-map-bar"><i style="width:' +
              barW +
              '%"></i></div></div>'
            );
          })
          .join("");
      }
    }
  };
})();

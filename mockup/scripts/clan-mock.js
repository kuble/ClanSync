/**
 * 클랜 메인 정적 목업 — 뷰 전환·권한(?role=)·플랜(?plan=)·이벤트 모달
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

  /** 목업 허브 `?plan=free|premium` — PRO·Premium UI 전환용 */
  window.mockClanCurrentPlan = function () {
    try {
      var p = new URLSearchParams(window.location.search);
      var pl = (p.get("plan") || "free").toLowerCase();
      if (pl === "premium" || pl === "pro") return "premium";
    } catch (e) {}
    return "free";
  };

  function applyPlanBodyClass() {
    var plan = window.mockClanCurrentPlan();
    document.body.classList.remove("mock-plan-free", "mock-plan-premium");
    document.body.classList.add(plan === "premium" ? "mock-plan-premium" : "mock-plan-free");
  }

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
    applyPlanBodyClass();
    try {
      if (document.getElementById("mock-balance-map-pick-btn")) {
        mockBalanceSyncMapPickCluster();
      }
      if (document.getElementById("mock-balance-weight-tank")) {
        window.mockBalanceApplyRoleWeightsToUI();
      }
      var vsBoardInit = document.getElementById("mock-balance-vs-board");
      if (vsBoardInit && typeof window.mockBalanceApplySlotOptsToBoard === "function") {
        window.mockBalanceApplySlotOptsToBoard();
      }
      if (
        vsBoardInit &&
        typeof mockBalanceRecomputeTagsForBoard === "function" &&
        window.mockClanCurrentPlan() === "premium"
      ) {
        mockBalanceRecomputeTagsForBoard(vsBoardInit);
      }
    } catch (eBalance) {}
    /* 구성원이 경기 기록 패널만 열린 상태면 요약으로 되돌림 */
    if (window.mockClanCurrentRole() === "member") {
      var ap = document.getElementById("stats-panel-archive");
      var sb = document.getElementById("statsTabSummary");
      if (ap && sb && !ap.hidden && typeof window.mockStatsSetSection === "function") {
        window.mockStatsSetSection(sb, "summary");
      }
    }
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

  /* 밸런스: 구 경기 탭 목업(제거됨) — 호출 잔존 시 무해 */
  window.mockBalanceSetMatch = function () {
    return false;
  };

  /** 편집 VS 보드(목업) 슬롯 — 역할별 가중 자동점수 합산용 */
  var MOCK_BALANCE_SCORE_SLOTS = {
    blue: [
      { s: 2.5, r: "dps" },
      { s: 0.5, r: "dps" },
      { s: -0.5, r: "tank" },
      { s: 0.2, r: "heal" },
      { s: -0.7, r: "heal" },
    ],
    red: [
      { s: -1.0, r: "dps" },
      { s: 1.2, r: "dps" },
      { s: 1.8, r: "tank" },
      { s: 0.8, r: "heal" },
      { s: 0.4, r: "heal" },
    ],
  };

  var MOCK_BALANCE_SLOT_OPTS_KEY = "clansync_mock_balance_slot_opts";

  function mockBalanceDefaultSlotOpts() {
    return { wlt: true, m: true, a: true, tags: true, mic: false };
  }

  function mockBalanceLoadSlotOpts() {
    var d = mockBalanceDefaultSlotOpts();
    try {
      var raw = localStorage.getItem(MOCK_BALANCE_SLOT_OPTS_KEY);
      if (!raw) return d;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return d;
      return {
        wlt: o.wlt !== false,
        m: o.m !== false,
        a: o.a !== false,
        tags: o.tags !== false,
        mic: o.mic === true,
      };
    } catch (eSo) {
      return d;
    }
  }

  function mockBalanceReadSlotOptsFromModal() {
    var ids = {
      wlt: "mock-balance-slotopt-wlt",
      m: "mock-balance-slotopt-m",
      a: "mock-balance-slotopt-a",
      tags: "mock-balance-slotopt-tags",
      mic: "mock-balance-slotopt-mic",
    };
    var out = {};
    var k;
    for (k in ids) {
      if (!Object.prototype.hasOwnProperty.call(ids, k)) continue;
      var b = document.getElementById(ids[k]);
      out[k] = !!(b && b.getAttribute("aria-checked") === "true");
    }
    return out;
  }

  function mockBalanceSyncSlotOptModalFromStorage() {
    var v = mockBalanceLoadSlotOpts();
    var ids = {
      wlt: "mock-balance-slotopt-wlt",
      m: "mock-balance-slotopt-m",
      a: "mock-balance-slotopt-a",
      tags: "mock-balance-slotopt-tags",
      mic: "mock-balance-slotopt-mic",
    };
    var k;
    for (k in ids) {
      if (!Object.prototype.hasOwnProperty.call(ids, k)) continue;
      var btn = document.getElementById(ids[k]);
      if (btn) btn.setAttribute("aria-checked", v[k] ? "true" : "false");
    }
  }

  /** 편집 VS 보드: 설정에 따른 슬롯 항목 표시/숨김 */
  window.mockBalanceApplySlotOptsToBoard = function () {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    var v = mockBalanceLoadSlotOpts();
    board.classList.toggle("mock-balance-slotopt--hide-wlt", !v.wlt);
    board.classList.toggle("mock-balance-slotopt--hide-m", !v.m);
    board.classList.toggle("mock-balance-slotopt--hide-a", !v.a);
    board.classList.toggle("mock-balance-slotopt--hide-tags", !v.tags);
    board.classList.toggle("mock-balance-slotopt--hide-mic", !v.mic);
  };

  /** 설정 모달 슬롯 표시 스위치 토글 */
  window.mockBalanceToggleSlotOpt = function (btn) {
    if (!btn) return false;
    var on = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", on ? "true" : "false");
    return false;
  };

  function mockBalanceParseRoleWeight(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var n = parseInt(String(el.value).trim(), 10);
    if (isNaN(n) || n < 0) return fallback;
    if (n > 200) return 200;
    return n;
  }

  function mockBalanceWeightedSumForTeam(team, wt, wd, wh) {
    var k = { tank: wt / 100, dps: wd / 100, heal: wh / 100 };
    var slots = MOCK_BALANCE_SCORE_SLOTS[team];
    if (!slots) return 0;
    var sum = 0;
    var i;
    for (i = 0; i < slots.length; i++) {
      sum += slots[i].s * k[slots[i].r];
    }
    return sum;
  }

  /** 설정 모달의 탱·딜·힐 %를 반영해 참고 패널 합계·막대 갱신 */
  window.mockBalanceApplyRoleWeightsToUI = function () {
    var wt = mockBalanceParseRoleWeight("mock-balance-weight-tank", 100);
    var wd = mockBalanceParseRoleWeight("mock-balance-weight-dps", 100);
    var wh = mockBalanceParseRoleWeight("mock-balance-weight-heal", 100);
    var blue = mockBalanceWeightedSumForTeam("blue", wt, wd, wh);
    var red = mockBalanceWeightedSumForTeam("red", wt, wd, wh);
    var bTxt = document.getElementById("mock-balance-strength-blue");
    var rTxt = document.getElementById("mock-balance-strength-red");
    var barA = document.getElementById("mock-balance-strength-bar-a");
    var barB = document.getElementById("mock-balance-strength-bar-b");
    if (bTxt) bTxt.textContent = "블루 " + blue.toFixed(2);
    if (rTxt) rTxt.textContent = "레드 " + red.toFixed(2);
    if (barA && barB) {
      var ab = Math.abs(blue);
      var ar = Math.abs(red);
      var sumAbs = ab + ar;
      if (sumAbs < 1e-9) {
        barA.style.flex = "1 1 0%";
        barB.style.flex = "1 1 0%";
      } else {
        var pb = (ab / sumAbs) * 100;
        var pr = (ar / sumAbs) * 100;
        barA.style.flex = Math.max(pb, 1) + " 1 0%";
        barB.style.flex = Math.max(pr, 1) + " 1 0%";
      }
    }
  };

  /** 편집 보드 A(자동 추정) 표시 기준값(목업). 갱신 시 맵·시퀀스로 소폭 보정만 한다. */
  var MOCK_BALANCE_AI_BASE = {
    b0: 2.14,
    b1: 0.48,
    b2: -0.41,
    b3: 0.18,
    b4: -0.65,
    r0: -0.92,
    r1: 1.35,
    r2: 1.62,
    r3: 0.76,
    r4: 0.38,
  };
  var _mockBalanceAiRefreshSeq = 0;

  function mockBalanceMapBanIsOn() {
    var b = document.getElementById("mock-balance-toggle-map-ban");
    return !!(b && b.getAttribute("aria-checked") === "true");
  }

  function mockBalanceParseWltFromPlate(plate) {
    var nums = plate.querySelectorAll(".mock-balance-slot-wlt .mock-balance-wlt-n");
    if (nums.length < 3) {
      return { w: 0, t: 0, l: 0 };
    }
    return {
      w: parseInt(nums[0].textContent, 10) || 0,
      t: parseInt(nums[1].textContent, 10) || 0,
      l: parseInt(nums[2].textContent, 10) || 0,
    };
  }

  /** 태그 문구 → 목업 톤(good/bad/neutral). 서버는 tone 필드로 내려줄 수 있음. */
  function mockBalanceTagToneFromLabel(t) {
    if (t.indexOf("연승") !== -1) return "good";
    if (t.indexOf("연패") !== -1 || t === "슬럼프") return "bad";
    return "neutral";
  }

  /** 목업: 전적 숫자로 태그 규칙 시뮬(실서버는 스냅샷). 최대 2개. 오른쪽 세로 레일에 색 구분 클래스 부여. */
  function mockBalanceRecomputeTagsForBoard(board) {
    board.querySelectorAll(".mock-balance-nameplate--rich[data-slot-id]").forEach(function (plate) {
      /* 레퍼런스 목업 슬롯: HTML 태그를 전적 규칙으로 덮어쓰지 않음 */
      if (plate.getAttribute("data-mock-skip-tag-recompute") === "1") return;
      var wrap = plate.querySelector(".mock-balance-slot-tags");
      if (!wrap) return;
      var o = mockBalanceParseWltFromPlate(plate);
      var total = o.w + o.t + o.l;
      var rate = total > 0 ? o.w / total : 0;
      var parts = [];
      if (total === 0) {
        wrap.innerHTML = "";
        return;
      }
      if (o.w === 0 && o.t === 0 && o.l >= 3) {
        parts.push(String(o.l) + "연패");
      }
      if (total >= 3 && rate <= 0.35) {
        parts.push("슬럼프");
      }
      if (o.l === 0 && o.t === 0 && o.w >= 3) {
        parts.push(String(o.w) + "연승");
      }
      wrap.innerHTML = parts
        .slice(0, 2)
        .map(function (t) {
          var tone = mockBalanceTagToneFromLabel(t);
          return (
            '<span class="mock-balance-tag mock-balance-tag--' + tone + '">' + t + "</span>"
          );
        })
        .join("");
    });
  }

  /**
   * Premium 전용: A 숫자·태그 목업 갱신. ~85ms 비동기 + 짧은 refreshing 클래스.
   * Free는 즉시 반환(노출 없음).
   */
  window.mockBalanceRefreshAiSnapshotMock = function () {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    if (typeof window.mockClanCurrentPlan === "function" && window.mockClanCurrentPlan() !== "premium") {
      return;
    }
    _mockBalanceAiRefreshSeq++;
    board.classList.add("mock-balance-ai-refreshing");
    window.setTimeout(function () {
      var mapLabel = "";
      var lbl = document.getElementById("mock-balance-map-label");
      if (lbl) mapLabel = (lbl.textContent || "").trim();
      var mapBump =
        !mockBalanceMapBanIsOn() && mapLabel
          ? ((mapLabel.length % 7) + 1) * 0.015
          : 0;
      var nudge = (_mockBalanceAiRefreshSeq % 5) * 0.008;
      Object.keys(MOCK_BALANCE_AI_BASE).forEach(function (id) {
        var el = board.querySelector('.mock-balance-slot-a-value[data-slot-id="' + id + '"]');
        if (!el) return;
        var base = MOCK_BALANCE_AI_BASE[id];
        var v = base + mapBump + nudge;
        el.textContent = v.toFixed(2);
      });
      mockBalanceRecomputeTagsForBoard(board);
      board.classList.remove("mock-balance-ai-refreshing");
    }, 85);
  };

  /** 맵 밴 ON이면 맵 라벨·선택 버튼·모드 문구를 숨김(밴픽 세션에서 맵 확정) */
  function mockBalanceSyncMapPickCluster() {
    var mapBan = document.getElementById("mock-balance-toggle-map-ban");
    var cluster = document.getElementById("mock-balance-map-pick-cluster");
    var on = mapBan && mapBan.getAttribute("aria-checked") === "true";
    if (cluster) {
      cluster.hidden = !!on;
      cluster.setAttribute("aria-hidden", on ? "true" : "false");
    }
  }

  /** 맵 밴 토글 — 슬롯은 ② 밴픽 세션에서만 사용 */
  window.mockBalanceToggleMapBan = function (btn) {
    if (!btn) return false;
    var on = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", on ? "true" : "false");
    mockBalanceSyncMapPickCluster();
    return false;
  };

  /** 영웅 밴 토글 — 슬롯은 ② 밴픽 세션에서만 사용 */
  window.mockBalanceToggleHeroBan = function (btn) {
    if (!btn) return false;
    var on = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", on ? "true" : "false");
    return false;
  };

  /** 밸런스: 워크플로 탭(편집 / 밴픽 / 5v5 / 관전자 예측) */
  window.mockBalanceSetWorkflow = function (btn, id) {
    document.querySelectorAll("[data-balance-wf-tab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-balance-wf-panel]").forEach(function (p) {
      var pid = p.getAttribute("data-balance-wf-panel");
      p.hidden = pid !== id;
    });
    return false;
  };

  window.mockBalancePlacementDone = function () {
    if (typeof window.mockBalanceRefreshAiSnapshotMock === "function") {
      window.mockBalanceRefreshAiSnapshotMock();
    }
    var tab = document.querySelector('[data-balance-wf-id="lineup"]');
    if (tab) {
      window.mockBalanceSetWorkflow(tab, "lineup");
    }
    window.alert(
      "목업: 배치가 확정되었습니다. 실제 플로우는 docs/01-plan/balance-maker-ui-notes.md 참고.",
    );
    return false;
  };

  window.mockBalancePremiumSettingsClick = function () {
    var m = document.getElementById("mock-balance-settings-modal");
    if (m) {
      mockBalanceSyncSlotOptModalFromStorage();
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
    }
    return false;
  };

  window.mockBalanceCloseSettingsModal = function () {
    var m = document.getElementById("mock-balance-settings-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockBalanceSaveSettingsModal = function () {
    ["mock-balance-weight-tank", "mock-balance-weight-dps", "mock-balance-weight-heal"].forEach(function (id) {
      var v = mockBalanceParseRoleWeight(id, 100);
      var el = document.getElementById(id);
      if (el) el.value = String(v);
    });
    window.mockBalanceApplyRoleWeightsToUI();
    try {
      localStorage.setItem(MOCK_BALANCE_SLOT_OPTS_KEY, JSON.stringify(mockBalanceReadSlotOptsFromModal()));
    } catch (eSlotSave) {}
    window.mockBalanceApplySlotOptsToBoard();
    return window.mockBalanceCloseSettingsModal();
  };

  window.mockBalanceOpenMapModal = function () {
    var mapBan = document.getElementById("mock-balance-toggle-map-ban");
    if (mapBan && mapBan.getAttribute("aria-checked") === "true") {
      window.alert(
        "목업: 맵 밴이 켜져 있어 이 단계에서는 맵 선택이 없습니다. ② 맵·영웅 밴픽 세션에서 맵이 정해집니다.",
      );
      return false;
    }
    var m = document.getElementById("mock-balance-map-modal");
    if (m) {
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
    }
    return false;
  };

  window.mockBalanceCloseMapModal = function () {
    var m = document.getElementById("mock-balance-map-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  function mockBalanceOcrResetPreview() {
    var img = document.getElementById("mock-balance-ocr-preview");
    var wrap = document.getElementById("mock-balance-ocr-preview-wrap");
    var fin = document.getElementById("mock-balance-ocr-file");
    if (img && img._revUrl) {
      try {
        URL.revokeObjectURL(img._revUrl);
      } catch (eRev) {}
      img._revUrl = null;
    }
    if (img) img.removeAttribute("src");
    if (wrap) wrap.hidden = true;
    if (fin) fin.value = "";
  }

  function mockBalanceOcrShowPreviewFromFile(file) {
    if (!file || !file.type || file.type.indexOf("image") !== 0) {
      window.alert("목업: 이미지 파일만 사용할 수 있습니다.");
      return;
    }
    var img = document.getElementById("mock-balance-ocr-preview");
    var wrap = document.getElementById("mock-balance-ocr-preview-wrap");
    if (!img || !wrap) return;
    mockBalanceOcrResetPreview();
    var url = URL.createObjectURL(file);
    img._revUrl = url;
    img.src = url;
    wrap.hidden = false;
  }

  window.mockBalanceOpenOcrModal = function () {
    mockBalanceOcrResetPreview();
    var m = document.getElementById("mock-balance-ocr-modal");
    if (m) {
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
      var z = document.getElementById("mock-balance-ocr-paste-focus");
      if (z) {
        setTimeout(function () {
          try {
            z.focus();
          } catch (eF) {}
        }, 80);
      }
    }
    return false;
  };

  window.mockBalanceCloseOcrModal = function () {
    mockBalanceOcrResetPreview();
    var m = document.getElementById("mock-balance-ocr-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockBalanceOcrTriggerFile = function () {
    var i = document.getElementById("mock-balance-ocr-file");
    if (i) i.click();
    return false;
  };

  window.mockBalanceOcrFilePicked = function (input) {
    var f = input && input.files && input.files[0];
    if (f) mockBalanceOcrShowPreviewFromFile(f);
  };

  window.mockBalanceOcrRunMock = function () {
    var wrap = document.getElementById("mock-balance-ocr-preview-wrap");
    if (!wrap || wrap.hidden) {
      window.alert("목업: 먼저 이미지를 붙여넣거나 파일을 선택하세요.");
      return false;
    }
    window.alert(
      "목업: OCR로 닉네임을 추출해 명단에 반영합니다. 실제 엔진·API 연동은 구현 단계에서 연결합니다.",
    );
    return false;
  };

  document.addEventListener("paste", function (e) {
    var m = document.getElementById("mock-balance-ocr-modal");
    if (!m || m.hasAttribute("hidden")) return;
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image/") === 0) {
        var f = items[i].getAsFile();
        if (f) {
          mockBalanceOcrShowPreviewFromFile(f);
          e.preventDefault();
        }
        break;
      }
    }
  });

  window.mockBalancePickMap = function (cell) {
    if (!cell) return false;
    var name = cell.getAttribute("data-map-name") || (cell.textContent || "").trim();
    var label = document.getElementById("mock-balance-map-label");
    if (label) label.textContent = name;
    var lineupMap = document.getElementById("mock-balance-lineup-map");
    if (lineupMap) lineupMap.textContent = name;
    window.mockBalanceCloseMapModal();
    var mapBan = document.getElementById("mock-balance-toggle-map-ban");
    var banOn = mapBan && mapBan.getAttribute("aria-checked") === "true";
    if (!banOn && typeof window.mockBalanceRefreshAiSnapshotMock === "function") {
      window.mockBalanceRefreshAiSnapshotMock();
    }
    return false;
  };

  window.mockBalanceMapGridFilter = function (input) {
    var q = (input && input.value ? input.value : "").trim().toLowerCase();
    document.querySelectorAll("#mock-balance-map-grid .mock-balance-map-cell").forEach(function (c) {
      var n = (c.getAttribute("data-map-name") || "").toLowerCase();
      c.hidden = !!(q && n.indexOf(q) === -1);
    });
  };

  window.mockBalancePoolFilter = function (input) {
    var q = (input && input.value ? input.value : "").trim().toLowerCase();
    document.querySelectorAll(".mock-balance-pool-chip").forEach(function (c) {
      var n = (c.getAttribute("data-name") || "").toLowerCase();
      var t = (c.textContent || "").trim().toLowerCase();
      c.hidden = !!(q && n.indexOf(q) === -1 && t.indexOf(q) === -1);
    });
  };

  window.mockBalancePoolChipClick = function (btn) {
    if (!btn || btn.getAttribute("data-on-roster") === "true") return false;
    window.alert(
      "목업: 슬롯에 올리는 동작(드래그·탭)은 구현 단계에서 연결합니다. (" +
        (btn.textContent || "").trim() +
        ")",
    );
    return false;
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

  /* ── 클랜 통계 (clan-stats-plan) — 내전=블루/레드 팀승 · 스크림=승패 미집계 · 이벤트=팀승 목업 ── */
  /** @type {{ at: string, type: string, map: string, mapType: string, winner: 'blue'|'red'|null, score: string }[]} */
  var CLAN_STATS_MATCHES = [
    { at: "2026-03-22T18:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", winner: "blue", score: "3-2" },
    { at: "2026-03-22T14:00:00.000Z", type: "intra", map: "할리우드", mapType: "호위", winner: "red", score: "2-3" },
    { at: "2026-03-20T19:30:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", winner: null, score: "—" },
    { at: "2026-03-18T21:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", winner: "blue", score: "3-1" },
    { at: "2026-03-15T20:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue", score: "3-0" },
    { at: "2026-03-12T21:00:00.000Z", type: "scrim", map: "서킷 로얄", mapType: "클래시", winner: null, score: "—" },
    { at: "2026-03-08T20:00:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", winner: "red", score: "1-3" },
    { at: "2026-03-05T21:30:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", winner: "blue", score: "2-0" },
    { at: "2026-03-01T19:00:00.000Z", type: "intra", map: "할리우드", mapType: "호위", winner: "blue", score: "3-2" },
    { at: "2026-02-25T20:00:00.000Z", type: "scrim", map: "스리아", mapType: "돌격", winner: null, score: "—" },
    { at: "2026-02-20T21:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue", score: "3-1" },
    { at: "2026-02-14T18:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", winner: "red", score: "1-3" },
    { at: "2026-02-08T20:00:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", winner: null, score: "—" },
    { at: "2026-02-01T21:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", winner: "blue", score: "3-0" },
    { at: "2026-01-28T19:30:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", winner: "blue", score: "3-2" },
    { at: "2026-01-20T20:00:00.000Z", type: "scrim", map: "할리우드", mapType: "호위", winner: null, score: "—" },
    { at: "2026-01-12T21:00:00.000Z", type: "intra", map: "스리아", mapType: "돌격", winner: "blue", score: "3-1" },
    { at: "2026-01-05T18:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue", score: "3-2" },
    { at: "2025-12-22T20:00:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", winner: "blue", score: "2-1" },
    { at: "2025-12-10T19:00:00.000Z", type: "scrim", map: "뉴 정크 시티", mapType: "제어", winner: null, score: "—" },
    { at: "2025-11-28T21:00:00.000Z", type: "intra", map: "파라이소", mapType: "호위", winner: "blue", score: "3-2" },
  ];

  function mockStatsEscapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /** 내전·이벤트에 5인 로스터·표시용 ID 부여(목업) */
  function mockStatsFillRosters(arr) {
    var nb = ["IronWall", "Mender", "Pulse", "Violet", "Anchor"];
    var nr = ["Bloom", "Rift", "NovaKid", "Spark", "Safeguard"];
    /* 슬롯 순서: 탱 · 딜 · 딜 · 힐 · 힐 (경기 기록 카드 UI) */
    var roles = ["tank", "dps", "dps", "sup", "sup"];
    arr.forEach(function (m, i) {
      if (m.type === "scrim") return;
      var ob = i % nb.length;
      var or = i % nr.length;
      m.blueRoster = roles.map(function (r, j) {
        return { n: nb[(ob + j) % nb.length], r: r };
      });
      m.redRoster = roles.map(function (r, j) {
        return { n: nr[(or + j) % nr.length], r: r };
      });
      m.displayId = String(8620 - i);
    });
  }
  mockStatsFillRosters(CLAN_STATS_MATCHES);

  function mockStatsFiltered() {
    return CLAN_STATS_MATCHES.slice();
  }

  /** 요약 탭: 구성원 수·설립일 (실연동 시 clans / clan_members) */
  var CLAN_STATS_CLAN_META = {
    memberCount: 28,
    foundedAt: "2024-06-12T00:00:00.000Z",
  };

  function mockStatsFormatFoundedLong(iso) {
    var d = new Date(iso);
    var wk = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return (
      d.getFullYear() +
      "년 " +
      (d.getMonth() + 1) +
      "월 " +
      d.getDate() +
      "일 (" +
      wk +
      ")"
    );
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

  /** 클랜 통계 집계일 키: Asia/Seoul, 당일 06:00~익일 06:00(미포함) → 해당 달력일 YYYY-MM-DD */
  var MOCK_STATS_STATS_TZ = "Asia/Seoul";
  var MOCK_STATS_DAY_BOUNDARY_HOUR = 6;

  function mockStatsPartsInTz(ms, timeZone) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    var o = {};
    fmt.formatToParts(new Date(ms)).forEach(function (p) {
      if (p.type !== "literal") o[p.type] = p.value;
    });
    return {
      y: parseInt(o.year, 10),
      mo: parseInt(o.month, 10),
      d: parseInt(o.day, 10),
      h: parseInt(o.hour, 10),
    };
  }

  function mockStatsCalendarAddDays(y, mo, d, delta) {
    var dt = new Date(Date.UTC(y, mo - 1, d + delta));
    return {
      y: dt.getUTCFullYear(),
      mo: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    };
  }

  function mockStatsDayKey(iso) {
    var ms = new Date(iso).getTime();
    if (isNaN(ms)) return String(iso).slice(0, 10);
    var p = mockStatsPartsInTz(ms, MOCK_STATS_STATS_TZ);
    var cy = p.y;
    var cmo = p.mo;
    var cd = p.d;
    if (p.h < MOCK_STATS_DAY_BOUNDARY_HOUR) {
      var prev = mockStatsCalendarAddDays(cy, cmo, cd, -1);
      cy = prev.y;
      cmo = prev.mo;
      cd = prev.d;
    }
    return mockStatsUtcDayKeyFromParts(cy, cmo - 1, cd);
  }

  function mockStatsTodayStatsDayKey() {
    return mockStatsDayKey(new Date().toISOString());
  }

  function mockStatsPad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function mockStatsUtcDayKeyFromParts(y, month0, day) {
    return y + "-" + mockStatsPad2(month0 + 1) + "-" + mockStatsPad2(day);
  }

  function mockStatsFormatTimeUtc(iso) {
    var d = new Date(iso);
    return mockStatsPad2(d.getUTCHours()) + ":" + mockStatsPad2(d.getUTCMinutes());
  }

  /** 행 중앙 역할 아이콘 (딜=탄환 열 · 탱=방패 · 힐=십자) */
  function mockStatsRoleIconHtml(role) {
    if (role === "tank") {
      return (
        '<span class="mock-stats-roster-role" title="탱커" aria-label="탱커">' +
        '<svg class="mock-stats-role-ico" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 L12 3 Z" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>' +
        "</svg></span>"
      );
    }
    if (role === "sup") {
      return (
        '<span class="mock-stats-roster-role" title="지원" aria-label="지원">' +
        '<svg class="mock-stats-role-ico" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.35" stroke-linecap="round"/>' +
        "</svg></span>"
      );
    }
    return (
      '<span class="mock-stats-roster-role" title="공격" aria-label="공격">' +
      '<svg class="mock-stats-role-ico mock-stats-role-ico--dps" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="4" y="7" width="3" height="10" rx="1.4" fill="currentColor"/>' +
      '<rect x="10.5" y="5" width="3" height="14" rx="1.4" fill="currentColor"/>' +
      '<rect x="17" y="8" width="3" height="8" rx="1.4" fill="currentColor"/>' +
      "</svg></span>"
    );
  }

  /** 경기 기록 탭: 내전 카드만(스크림·이벤트 미표시) */
  function mockStatsIntraMatchCardHtml(m, cardIdx) {
    var winB = m.winner === "blue";
    var winR = m.winner === "red";
    var br = m.blueRoster || [];
    var rr = m.redRoster || [];
    var slots = Math.max(5, br.length, rr.length);
    var rowsHtml = "";
    var si;
    for (si = 0; si < slots; si++) {
      var bp = br[si];
      var rp = rr[si];
      var role = (bp && bp.r) || (rp && rp.r) || "dps";
      var leftName = bp ? mockStatsEscapeHtml(bp.n) : "—";
      var rightName = rp ? mockStatsEscapeHtml(rp.n) : "—";
      rowsHtml +=
        '<div class="mock-stats-roster-row">' +
        '<div class="mock-stats-roster-cell mock-stats-roster-cell--blue">' +
        '<div class="mock-stats-pill mock-stats-pill--blue">' +
        leftName +
        "</div></div>" +
        mockStatsRoleIconHtml(role) +
        '<div class="mock-stats-roster-cell mock-stats-roster-cell--red">' +
        '<div class="mock-stats-pill mock-stats-pill--red">' +
        rightName +
        "</div></div>" +
        "</div>";
    }
    var dispId = mockStatsEscapeHtml(
      m.displayId != null ? m.displayId : "#" + cardIdx,
    );
    return (
      '<article class="mock-stats-match-card">' +
      '<div class="mock-stats-match-card-head">' +
      "<strong>" +
      mockStatsEscapeHtml(m.map) +
      "</strong>" +
      '<span style="color:var(--text-muted)"> · ' +
      mockStatsEscapeHtml(m.mapType) +
      "</span>" +
      '<span style="color:var(--text-muted);font-size:11px;margin-left:4px">' +
      mockStatsFormatTimeUtc(m.at) +
      " UTC</span>" +
      "</div>" +
      '<div class="mock-stats-match-teams mock-stats-match-teams--roster">' +
      '<div class="mock-stats-roster-top">' +
      '<div class="mock-stats-roster-crown-slot">' +
      (winB ? "👑" : "") +
      "</div>" +
      '<div class="mock-stats-roster-top-mid">' +
      dispId +
      "</div>" +
      '<div class="mock-stats-roster-crown-slot">' +
      (winR ? "👑" : "") +
      "</div>" +
      "</div>" +
      '<div class="mock-stats-roster-grid">' +
      rowsHtml +
      "</div></div></article>"
    );
  }

  function mockStatsWinratePctStr(w, d, l) {
    var t = w + l + d;
    if (t === 0) return "0.0%";
    return (Math.round((w / t) * 1000) / 10).toFixed(1) + "%";
  }

  function mockStatsStreakFromSeq(seq) {
    if (!seq.length) return 0;
    var last = seq[seq.length - 1];
    if (last === 0) return 0;
    var n = 0;
    var i;
    for (i = seq.length - 1; i >= 0 && seq[i] === last; i--) n++;
    return last * n;
  }

  function mockStatsWinrateTdColor(wrNum) {
    if (wrNum >= 1) return "#4ade80";
    if (wrNum >= 0.7) return "#2dd4bf";
    if (wrNum >= 0.5) return "#facc15";
    if (wrNum > 0) return "#fb923c";
    return "#f87171";
  }

  /** 시간순 내전(·이벤트) 경기 배열 → 승률 순위 행 (경기 기록·명예의 전당 공통) */
  function mockStatsLeaderboardRowsFromMatches(matchesAsc) {
    var st = {};
    function ensure(n) {
      if (!st[n]) st[n] = { w: 0, d: 0, l: 0, seq: [] };
    }
    function applyRoster(roster, code) {
      (roster || []).forEach(function (p) {
        ensure(p.n);
        if (code === 0) st[p.n].d++;
        else if (code === 1) st[p.n].w++;
        else st[p.n].l++;
        st[p.n].seq.push(code);
      });
    }
    matchesAsc.forEach(function (m) {
      var bW = m.winner === "blue";
      var rW = m.winner === "red";
      var dr = !bW && !rW;
      if (dr) {
        applyRoster(m.blueRoster, 0);
        applyRoster(m.redRoster, 0);
      } else {
        applyRoster(m.blueRoster, bW ? 1 : -1);
        applyRoster(m.redRoster, rW ? 1 : -1);
      }
    });
    return Object.keys(st)
      .map(function (nick) {
        var o = st[nick];
        var t = o.w + o.d + o.l;
        var wrN = t > 0 ? o.w / t : 0;
        return {
          nick: nick,
          winDiff: o.w - o.l,
          streak: mockStatsStreakFromSeq(o.seq),
          w: o.w,
          d: o.d,
          l: o.l,
          wr: mockStatsWinratePctStr(o.w, o.d, o.l),
          wrNum: wrN,
        };
      })
      .sort(function (a, b) {
        if (b.wrNum !== a.wrNum) return b.wrNum - a.wrNum;
        if (b.w !== a.w) return b.w - a.w;
        return a.nick.localeCompare(b.nick, "ko");
      });
  }

  /** 선택한 집계일의 내전만 집계해 승률 순위 행 생성 */
  function mockStatsLeaderboardRowsFromDay(dayMatches) {
    var asc = dayMatches.slice().sort(function (a, b) {
      return new Date(a.at) - new Date(b.at);
    });
    return mockStatsLeaderboardRowsFromMatches(asc);
  }

  function mockStatsWinrateSortedCopy(st) {
    var rows = st.rows.slice();
    var key = st.sortKey;
    var dir = st.sortDir;
    function val(r) {
      if (key === "winDiff") return r.winDiff;
      if (key === "streak") return r.streak;
      return r.wrNum;
    }
    rows.sort(function (a, b) {
      var va = val(a);
      var vb = val(b);
      if (va !== vb) {
        return dir === "desc" ? vb - va : va - vb;
      }
      var c = a.nick.localeCompare(b.nick, "ko");
      return dir === "desc" ? -c : c;
    });
    return rows;
  }

  function mockStatsWinrateSortTh(label, sortKey, st) {
    var active = st.sortKey === sortKey;
    var arrow = active ? (st.sortDir === "desc" ? "▼" : "▲") : "";
    var cls = "mock-stats-wr-sort";
    if (active) cls += " mock-stats-wr-sort--active";
    return (
      '<th class="mock-stats-wr-th--sort" style="text-align:right">' +
      '<button type="button" class="' +
      cls +
      '" onclick="return window.mockStatsWinrateSort(\'' +
      sortKey +
      "')\">" +
      mockStatsEscapeHtml(label) +
      (arrow ? '<span aria-hidden="true">' + arrow + "</span>" : "") +
      "</button></th>"
    );
  }

  /** `window.__mockStatsWinrateState` 기준으로 우측 승률 패널 HTML */
  function mockStatsWinrateBuildAsideHtml() {
    var st = window.__mockStatsWinrateState;
    if (!st) {
      return '<div class="mock-stats-winrate-title">승률 순위</div>';
    }
    var dateLabel = st.dateLabel;
    var sorted = mockStatsWinrateSortedCopy(st);
    var cnt = st.rows.length;
    var body;
    if (cnt === 0) {
      body =
        '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px 8px">' +
        (dateLabel
          ? "선택한 날짜(" +
            mockStatsEscapeHtml(dateLabel) +
            ")에 내전이 없어 집계할 수 없습니다."
          : "내전 기록이 없습니다.") +
        "</td></tr>";
    } else {
      body = sorted
        .map(function (r, i) {
          var cls = "mock-stats-wr-row";
          if (i < 3) cls += " mock-stats-wr-row--top";
          else if (i % 2 === 1) cls += " mock-stats-wr-row--alt";
          var col = mockStatsWinrateTdColor(r.wrNum);
          return (
            '<tr class="' +
            cls +
            '"><td>' +
            mockStatsEscapeHtml(r.nick) +
            '</td><td style="text-align:right">' +
            r.winDiff +
            '</td><td style="text-align:right">' +
            r.streak +
            '</td><td style="text-align:right">' +
            r.w +
            "/" +
            r.d +
            "/" +
            r.l +
            '</td><td style="text-align:right;color:' +
            col +
            '">' +
            mockStatsEscapeHtml(r.wr) +
            "</td></tr>"
          );
        })
        .join("");
    }
    return (
      '<div class="mock-stats-winrate-title">승률 순위</div>' +
      '<div class="mock-stats-winrate-scroll">' +
      '<table class="mock-stats-winrate-table">' +
      "<thead><tr>" +
      "<th>닉네임</th>" +
      mockStatsWinrateSortTh("승차", "winDiff", st) +
      mockStatsWinrateSortTh("연승", "streak", st) +
      '<th style="text-align:right">결과(승/무/패)</th>' +
      mockStatsWinrateSortTh("승률", "wrNum", st) +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  window.mockStatsWinrateSort = function (key) {
    if (key !== "winDiff" && key !== "streak" && key !== "wrNum") return false;
    var st = window.__mockStatsWinrateState;
    if (!st || !st.rows || st.rows.length === 0) return false;
    if (st.sortKey === key) {
      st.sortDir = st.sortDir === "desc" ? "asc" : "desc";
    } else {
      st.sortKey = key;
      st.sortDir = "desc";
    }
    var el = document.getElementById("mock-stats-archive-winrate");
    if (el) el.innerHTML = mockStatsWinrateBuildAsideHtml();
    return false;
  };

  function mockStatsFormatDayHeadingFromKey(key) {
    if (!key) return "";
    var p = key.split("-");
    var y = parseInt(p[0], 10);
    var mo = parseInt(p[1], 10);
    var day = parseInt(p[2], 10);
    var wk =
      ["일", "월", "화", "수", "목", "금", "토"][
        new Date(Date.UTC(y, mo - 1, day)).getUTCDay()
      ];
    return y + "년 " + mo + "월 " + day + "일 (" + wk + ")";
  }

  /** 집계일 키(달력 Y-M-D)가 속한 ISO 주: 그 주의 월요일 00:00 UTC(ms). 셀 라벨은 mockStatsUtcMsToDayKey로 연속 달력일 */
  function mockStatsUtcMondayMs(utcMidnightMs) {
    var dow = new Date(utcMidnightMs).getUTCDay();
    var monOff = (dow + 6) % 7;
    return utcMidnightMs - monOff * 86400000;
  }

  function mockStatsUtcMondayMsFromDayKey(key) {
    var p = key.split("-");
    var t = Date.UTC(
      parseInt(p[0], 10),
      parseInt(p[1], 10) - 1,
      parseInt(p[2], 10),
    );
    return mockStatsUtcMondayMs(t);
  }

  function mockStatsUtcMsToDayKey(ms) {
    var d = new Date(ms);
    return mockStatsUtcDayKeyFromParts(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    );
  }

  /** 표시 주의 월요일(UTC)이 속한 달 기준 N째주 (1일~7일→1째주) */
  function mockStatsWeekOrdinalLabel(weekStartMs) {
    var a = new Date(weekStartMs);
    var y = a.getUTCFullYear();
    var mo = a.getUTCMonth() + 1;
    var dMon = a.getUTCDate();
    var n = Math.ceil(dMon / 7);
    return y + "년 " + mo + "월 " + n + "째주";
  }

  function mockStatsArchiveEnsureCal(intra) {
    if (window.__mockStatsArchiveCal) return;
    if (intra.length === 0) {
      window.__mockStatsArchiveCal = {
        weekStartUtcMs: mockStatsUtcMondayMsFromDayKey(
          mockStatsTodayStatsDayKey(),
        ),
        selectedKey: null,
      };
      return;
    }
    var sorted = intra.slice().sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });
    var key0 = mockStatsDayKey(sorted[0].at);
    window.__mockStatsArchiveCal = {
      weekStartUtcMs: mockStatsUtcMondayMsFromDayKey(key0),
      selectedKey: key0,
    };
  }

  function mockStatsArchiveNormalizeSelection(intra) {
    var cal = window.__mockStatsArchiveCal;
    if (!cal) return;
    if (intra.length === 0) {
      cal.selectedKey = null;
      return;
    }
    var byKey = {};
    intra.forEach(function (m) {
      byKey[mockStatsDayKey(m.at)] = true;
    });
    if (cal.selectedKey && byKey[cal.selectedKey]) {
      cal.weekStartUtcMs = mockStatsUtcMondayMsFromDayKey(cal.selectedKey);
      return;
    }
    var off;
    for (off = 6; off >= 0; off--) {
      var msTry = cal.weekStartUtcMs + off * 86400000;
      var kTry = mockStatsUtcMsToDayKey(msTry);
      if (byKey[kTry]) {
        cal.selectedKey = kTry;
        return;
      }
    }
    var sorted = intra.slice().sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });
    var keyLatest = mockStatsDayKey(sorted[0].at);
    cal.weekStartUtcMs = mockStatsUtcMondayMsFromDayKey(keyLatest);
    cal.selectedKey = keyLatest;
  }

  function mockStatsArchivePrepareState(intra) {
    if (
      window.__mockStatsArchiveCal &&
      typeof window.__mockStatsArchiveCal.weekStartUtcMs !== "number"
    ) {
      window.__mockStatsArchiveCal = null;
    }
    mockStatsArchiveEnsureCal(intra);
    mockStatsArchiveNormalizeSelection(intra);
  }

  /** 상단: 주간 캘린더만 */
  function mockStatsArchiveBuildCalHtml(intra) {
    var cal = window.__mockStatsArchiveCal;
    var weekStart = cal.weekStartUtcMs;
    var daysWith = {};
    intra.forEach(function (m) {
      daysWith[mockStatsDayKey(m.at)] = true;
    });
    var dowLabels = ["월", "화", "수", "목", "금", "토", "일"];
    var dowRow = dowLabels
      .map(function (w) {
        return '<div class="mock-stats-archive-cal-dow">' + w + "</div>";
      })
      .join("");
    var wEnd = new Date(weekStart + 6 * 86400000);
    var wStartD = new Date(weekStart);
    var crossWeek =
      wStartD.getUTCMonth() !== wEnd.getUTCMonth() ||
      wStartD.getUTCFullYear() !== wEnd.getUTCFullYear();
    var cells = "";
    var off;
    for (off = 0; off < 7; off++) {
      var ms = weekStart + off * 86400000;
      var dayKey = mockStatsUtcMsToDayKey(ms);
      var dCell = new Date(ms);
      var label = crossWeek
        ? dCell.getUTCMonth() + 1 + "/" + dCell.getUTCDate()
        : String(dCell.getUTCDate());
      var has = !!daysWith[dayKey];
      var sel = cal.selectedKey === dayKey;
      var base = "mock-stats-archive-cal-cell";
      if (!has) {
        cells +=
          '<div class="' +
          base +
          ' mock-stats-archive-cal-cell--muted">' +
          label +
          "</div>";
      } else {
        var cls =
          base +
          " mock-stats-archive-cal-cell--has mock-stats-archive-cal-cell--dot";
        if (sel) cls += " mock-stats-archive-cal-cell--selected";
        cells +=
          '<button type="button" class="' +
          cls +
          '" onclick="return window.mockStatsArchivePickDay(\'' +
          dayKey +
          "')\">" +
          label +
          "</button>";
      }
    }
    return (
      '<div class="mock-stats-archive-cal-wrap">' +
      '<div class="mock-stats-archive-cal-head">' +
      "<strong>" +
      mockStatsWeekOrdinalLabel(weekStart) +
      "</strong>" +
      '<div class="mock-stats-archive-cal-nav">' +
      '<button type="button" aria-label="이전 주" onclick="return window.mockStatsArchiveShiftWeek(-1)">‹</button>' +
      '<button type="button" aria-label="다음 주" onclick="return window.mockStatsArchiveShiftWeek(1)">›</button>' +
      "</div></div>" +
      '<div class="mock-stats-archive-cal-grid mock-stats-archive-cal-grid--week">' +
      dowRow +
      cells +
      "</div>" +
      '<p class="mock-stats-footnote" style="margin:10px 0 0;font-size:11px;color:var(--text-muted)">' +
      "일자는 한국시간 기준 당일 06:00~익일 06:00를 한 날로 묶습니다." +
      "</p>" +
      "</div>"
    );
  }

  function mockStatsArchiveWrapRecordBody(innerHtml, isEmpty) {
    var cls = "mock-stats-archive-record-body";
    if (isEmpty) cls += " mock-stats-archive-record-body--empty";
    return '<div class="' + cls + '">' + innerHtml + "</div>";
  }

  function mockStatsArchiveRecordPanelPrefix() {
    return '<div class="mock-stats-archive-record-label">경기 기록</div>';
  }

  /** 하단 좌측: 선택일 경기 슬라이더(날짜 머리글은 별도 #mock-stats-archive-day-heading) */
  function mockStatsArchiveBuildRecordHtml(intra) {
    var cal = window.__mockStatsArchiveCal;
    var prefix = mockStatsArchiveRecordPanelPrefix();
    if (intra.length === 0) {
      return (
        prefix +
        mockStatsArchiveWrapRecordBody(
          '<p class="mock-stats-footnote" style="margin:0">이 조건에서 내전 기록이 없습니다.</p>',
          true,
        )
      );
    }
    var arr = intra
      .filter(function (m) {
        return mockStatsDayKey(m.at) === cal.selectedKey;
      })
      .sort(function (a, b) {
        return new Date(b.at) - new Date(a.at);
      });
    if (arr.length === 0) {
      return (
        prefix +
        mockStatsArchiveWrapRecordBody(
          '<p class="mock-stats-footnote" style="margin:0">선택한 날짜에 내전이 없습니다.</p>',
          true,
        )
      );
    }
    return (
      prefix +
      mockStatsArchiveWrapRecordBody(
      '<div class="mock-stats-archive-slider-row">' +
        '<button type="button" class="mock-stats-archive-slider-btn" aria-label="이전 경기" onclick="return window.mockStatsArchiveSliderStep(-1)">‹</button>' +
        '<div id="mock-stats-archive-slider" class="mock-stats-archive-slider" tabindex="0">' +
        arr
          .map(function (m, idx) {
            return mockStatsIntraMatchCardHtml(m, idx);
          })
          .join("") +
        "</div>" +
        '<button type="button" class="mock-stats-archive-slider-btn" aria-label="다음 경기" onclick="return window.mockStatsArchiveSliderStep(1)">›</button>' +
        "</div>",
        false,
      )
    );
  }

  window.mockStatsArchivePickDay = function (key) {
    if (!window.__mockStatsArchiveCal) return false;
    window.__mockStatsArchiveCal.selectedKey = key;
    window.__mockStatsArchiveCal.weekStartUtcMs =
      mockStatsUtcMondayMsFromDayKey(key);
    window.mockStatsRender();
    return false;
  };

  window.mockStatsArchiveShiftWeek = function (delta) {
    var c = window.__mockStatsArchiveCal;
    if (!c || typeof c.weekStartUtcMs !== "number") {
      window.__mockStatsArchiveCal = {
        weekStartUtcMs: mockStatsUtcMondayMsFromDayKey(
          mockStatsTodayStatsDayKey(),
        ),
        selectedKey: null,
      };
      c = window.__mockStatsArchiveCal;
    }
    c.weekStartUtcMs += delta * 7 * 86400000;
    c.selectedKey = null;
    window.mockStatsRender();
    return false;
  };

  window.mockStatsArchiveSliderStep = function (dir) {
    var el = document.getElementById("mock-stats-archive-slider");
    if (!el) return false;
    el.scrollBy({ left: el.clientWidth * dir, behavior: "smooth" });
    return false;
  };

  function mockStatsHofYearsDescending(intra) {
    var set = {};
    intra.forEach(function (m) {
      var p = mockStatsPartsInTz(new Date(m.at).getTime(), MOCK_STATS_STATS_TZ);
      set[p.y] = true;
    });
    return Object.keys(set)
      .map(function (x) {
        return parseInt(x, 10);
      })
      .sort(function (a, b) {
        return b - a;
      });
  }

  /** 전체 데이터에서 등장하는 YYYY-MM 내림차순 (월별 탭 선택용) */
  function mockStatsHofAllMonthKeysDescending(intra) {
    var set = {};
    intra.forEach(function (m) {
      var p = mockStatsPartsInTz(new Date(m.at).getTime(), MOCK_STATS_STATS_TZ);
      set[p.y + "-" + mockStatsPad2(p.mo)] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return b.localeCompare(a, "en");
    });
  }

  function mockStatsHofMatchesInYear(intra, y) {
    return intra.filter(function (m) {
      var p = mockStatsPartsInTz(new Date(m.at).getTime(), MOCK_STATS_STATS_TZ);
      return p.y === y;
    });
  }

  function mockStatsHofMatchesInMonthKey(intra, monthKey) {
    var p = monthKey.split("-");
    var y = parseInt(p[0], 10);
    var mo = parseInt(p[1], 10);
    return intra.filter(function (m) {
      var pt = mockStatsPartsInTz(new Date(m.at).getTime(), MOCK_STATS_STATS_TZ);
      return pt.y === y && pt.mo === mo;
    });
  }

  /** YYYY-MM 달력 기준 전달 */
  function mockStatsHofPrevMonthKey(monthKey) {
    var p = monthKey.split("-");
    var y = parseInt(p[0], 10);
    var mo = parseInt(p[1], 10);
    var d = new Date(Date.UTC(y, mo - 1, 1));
    d.setUTCMonth(d.getUTCMonth() - 1);
    return (
      d.getUTCFullYear() + "-" + mockStatsPad2(d.getUTCMonth() + 1)
    );
  }

  /** 월별 탭·구성원: KST 매월 1일=선택 월 집계, 그 외=전달 월 (승률·참여율 공통) */
  function mockStatsHofMonthAggregateKey(selKey, vis, hofSt) {
    if (!mockStatsHofMemberViewing()) return selKey;
    if (!hofSt || hofSt.subtab !== "month") return selKey;
    if (!vis || vis.monthReveal !== "monthly_1st_prev") return selKey;
    var p = mockStatsPartsInTz(Date.now(), MOCK_STATS_STATS_TZ);
    if (p.d === 1) return selKey;
    return mockStatsHofPrevMonthKey(selKey);
  }

  /** 연도별 탭·구성원: KST 매년 1월 1일=선택 연도 집계, 그 외=전년도 (승률·참여율 공통) */
  function mockStatsHofYearAggregateYear(selY, vis, hofSt) {
    if (!mockStatsHofMemberViewing()) return selY;
    if (!hofSt || hofSt.subtab !== "year") return selY;
    if (!vis || vis.yearReveal !== "year_jan1_prev") return selY;
    var p = mockStatsPartsInTz(Date.now(), MOCK_STATS_STATS_TZ);
    if (p.mo === 1 && p.d === 1) return selY;
    var py = selY - 1;
    return py < 1970 ? selY : py;
  }

  function mockStatsHofMonthRollNote(vis, aggKey, selKey) {
    if (!mockStatsHofMemberViewing()) return null;
    if (!vis || vis.monthReveal !== "monthly_1st_prev" || aggKey === selKey) {
      return null;
    }
    return (
      mockStatsHofMonthLabel(selKey) +
      " 당월 순위(승률·참여율)는 매월 1일(한국시간)부터 공개됩니다. 지금은 전달(" +
      mockStatsHofMonthLabel(aggKey) +
      ") 기준입니다."
    );
  }

  function mockStatsHofYearRollNote(vis, aggYear, selYear) {
    if (!mockStatsHofMemberViewing()) return null;
    if (!vis || vis.yearReveal !== "year_jan1_prev" || aggYear === selYear) {
      return null;
    }
    return (
      selYear +
      "년 당해 순위(승률·참여율)는 매년 1월 1일(한국시간)부터 공개됩니다. 지금은 전년도(" +
      aggYear +
      "년) 기준입니다."
    );
  }

  function mockStatsHofEnsureState(intra) {
    if (window.__mockStatsHofState) {
      if (!window.__mockStatsHofState.subtab) {
        window.__mockStatsHofState.subtab = "year";
      }
      return;
    }
    var y = new Date().getUTCFullYear();
    var mk = y + "-" + mockStatsPad2(new Date().getUTCMonth() + 1);
    if (intra.length) {
      var sorted = intra.slice().sort(function (a, b) {
        return new Date(b.at) - new Date(a.at);
      });
      var p = mockStatsPartsInTz(
        new Date(sorted[0].at).getTime(),
        MOCK_STATS_STATS_TZ,
      );
      y = p.y;
      mk = p.y + "-" + mockStatsPad2(p.mo);
    }
    window.__mockStatsHofState = { year: y, monthKey: mk, subtab: "year" };
  }

  function mockStatsHofClampYear(intra) {
    var st = window.__mockStatsHofState;
    if (!st) return;
    var years = mockStatsHofYearsDescending(intra);
    if (!years.length) return;
    if (years.indexOf(st.year) < 0) st.year = years[0];
  }

  function mockStatsHofClampMonthKey(intra) {
    var st = window.__mockStatsHofState;
    if (!st) return;
    var months = mockStatsHofAllMonthKeysDescending(intra);
    if (!months.length) {
      st.monthKey = st.year + "-01";
      return;
    }
    if (months.indexOf(st.monthKey) < 0) st.monthKey = months[0];
  }

  function mockStatsHofParticipationRowsForMatches(matches) {
    var n = matches.length;
    var counts = {};
    matches.forEach(function (m) {
      var seen = {};
      (m.blueRoster || []).concat(m.redRoster || []).forEach(function (p) {
        if (seen[p.n]) return;
        seen[p.n] = true;
        counts[p.n] = (counts[p.n] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(function (nick) {
        var played = counts[nick];
        return {
          nick: nick,
          played: played,
          pct: n ? Math.round((played / n) * 1000) / 10 : 0,
        };
      })
      .sort(function (a, b) {
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.played !== a.played) return b.played - a.played;
        return a.nick.localeCompare(b.nick, "ko");
      });
  }

  /** 명예의 전당 등재: 집계 기간 총 경기 수 기준점(이하·동일 → 비율, 초과 → 절대 최소 출전) */
  function mockStatsHofSanitizeVolumeBreakpoint(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 1) return 100;
    if (n > 5000) return 5000;
    return n;
  }

  function mockStatsHofSanitizeParticipationPct(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 1) return 30;
    if (n > 100) return 100;
    return n;
  }

  function mockStatsHofSanitizeMinPlayedAbsolute(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 1) return 30;
    if (n > 2000) return 2000;
    return n;
  }

  function mockStatsHofMinPlayedToQualify(totalMatches, vis) {
    if (totalMatches <= 0) return 0;
    var bp = vis.hofVolumeBreakpoint;
    var pct = vis.hofMinParticipationPct;
    var abs = vis.hofMinPlayedAbsolute;
    if (totalMatches <= bp) {
      return Math.max(1, Math.ceil((totalMatches * pct) / 100));
    }
    return Math.max(1, abs);
  }

  function mockStatsHofEligibilityFootnote(totalMatches, minPlayed, vis) {
    if (totalMatches <= 0 || minPlayed <= 0) return null;
    var bp = vis.hofVolumeBreakpoint;
    var pct = vis.hofMinParticipationPct;
    var abs = vis.hofMinPlayedAbsolute;
    return (
      "등재 최소 출전: 이번 집계 기간 " +
      minPlayed +
      "경 이상. (규칙: 기간 총 내전 T≤" +
      bp +
      "이면 T의 " +
      pct +
      "% 이상 올림, T>" +
      bp +
      "이면 " +
      abs +
      "경 이상 · 현재 T=" +
      totalMatches +
      ")"
    );
  }

  function mockStatsHofFilterWinrateRowsMinPlayed(rows, minPlayed) {
    if (minPlayed <= 0) return rows;
    return rows.filter(function (r) {
      return r.w + r.d + r.l >= minPlayed;
    });
  }

  function mockStatsHofFilterPartRowsMinPlayed(rows, minPlayed) {
    if (minPlayed <= 0) return rows;
    return rows.filter(function (r) {
      return r.played >= minPlayed;
    });
  }

  var MOCK_STATS_HOF_VIS_KEY = "clansync-mock-hof-visibility";

  function mockStatsHofVisibilityDefaults() {
    return {
      winRateRankLimit: 10,
      participationRankLimit: 10,
      monthReveal: "always",
      yearReveal: "always",
      hofVolumeBreakpoint: 100,
      hofMinParticipationPct: 30,
      hofMinPlayedAbsolute: 30,
    };
  }

  function mockStatsHofSanitizeLimit(n) {
    var allowed = [0, 3, 5, 10, 20];
    if (isNaN(n) || n < 0) return 10;
    if (allowed.indexOf(n) >= 0) return n;
    return 10;
  }

  function mockStatsHofVisibilityGet() {
    var d = mockStatsHofVisibilityDefaults();
    try {
      var raw = localStorage.getItem(MOCK_STATS_HOF_VIS_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        d.winRateRankLimit = mockStatsHofSanitizeLimit(
          parseInt(o.winRateRankLimit, 10),
        );
        d.participationRankLimit = mockStatsHofSanitizeLimit(
          parseInt(o.participationRankLimit, 10),
        );
        if (o.monthReveal === "monthly_1st_prev") {
          d.monthReveal = "monthly_1st_prev";
        } else if (
          o.winRateReveal === "monthly_1st_prev" ||
          o.winRateReveal === "monthly_kst_1"
        ) {
          d.monthReveal = "monthly_1st_prev";
        } else {
          d.monthReveal = "always";
        }
        d.yearReveal =
          o.yearReveal === "year_jan1_prev" ? "year_jan1_prev" : "always";
        d.hofVolumeBreakpoint = mockStatsHofSanitizeVolumeBreakpoint(
          o.hofVolumeBreakpoint,
        );
        d.hofMinParticipationPct = mockStatsHofSanitizeParticipationPct(
          o.hofMinParticipationPct,
        );
        d.hofMinPlayedAbsolute = mockStatsHofSanitizeMinPlayedAbsolute(
          o.hofMinPlayedAbsolute,
        );
      }
    } catch (e) {}
    return d;
  }

  function mockStatsHofVisibilitySet(obj) {
    try {
      localStorage.setItem(MOCK_STATS_HOF_VIS_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function mockStatsHofMemberViewing() {
    return window.mockClanCurrentRole() === "member";
  }

  /** 구성원일 때 승률 표 행·상한 안내(전달 월 데이터는 빌드 단계에서 rows에 반영) */
  function mockStatsHofWinrateTableDisplay(rows, vis) {
    if (!mockStatsHofMemberViewing()) {
      return {
        rows: rows,
        limitNote: null,
        rollNote: null,
        eligibilityNote: null,
        noEligibleRows: false,
      };
    }
    var lim = vis.winRateRankLimit;
    if (lim > 0 && rows.length > lim) {
      return {
        rows: rows.slice(0, lim),
        limitNote:
          "구성원에게는 상위 " + lim + "위까지만 공개됩니다 (클랜 설정).",
        rollNote: null,
        eligibilityNote: null,
        noEligibleRows: false,
      };
    }
    return {
      rows: rows,
      limitNote: null,
      rollNote: null,
      eligibilityNote: null,
      noEligibleRows: false,
    };
  }

  function mockStatsHofParticipationDisplay(rows, vis) {
    if (!mockStatsHofMemberViewing()) {
      return {
        rows: rows,
        limitNote: null,
        rollNote: null,
        eligibilityNote: null,
        noEligibleRows: false,
      };
    }
    var lim = vis.participationRankLimit;
    if (lim > 0 && rows.length > lim) {
      return {
        rows: rows.slice(0, lim),
        limitNote:
          "구성원에게는 참여율 순위 상위 " +
          lim +
          "위까지만 공개됩니다 (클랜 설정).",
        rollNote: null,
        eligibilityNote: null,
        noEligibleRows: false,
      };
    }
    return {
      rows: rows,
      limitNote: null,
      rollNote: null,
      eligibilityNote: null,
      noEligibleRows: false,
    };
  }

  window.mockStatsHofOpenSettingsModal = function () {
    if (window.mockClanCurrentRole() === "member") return false;
    var m = document.getElementById("mock-hof-settings-modal");
    if (!m) return false;
    var v = mockStatsHofVisibilityGet();
    var selWr = document.getElementById("mhof-wr-top");
    var selPart = document.getElementById("mhof-part-top");
    if (selWr) selWr.value = String(v.winRateRankLimit);
    if (selPart) selPart.value = String(v.participationRankLimit);
    var selMonthRev = document.getElementById("mhof-month-reveal");
    var selYearRev = document.getElementById("mhof-year-reveal");
    if (selMonthRev) {
      selMonthRev.value =
        v.monthReveal === "monthly_1st_prev" ? "monthly_1st_prev" : "always";
    }
    if (selYearRev) {
      selYearRev.value =
        v.yearReveal === "year_jan1_prev" ? "year_jan1_prev" : "always";
    }
    var inpBp = document.getElementById("mhof-hof-bp");
    var inpPct = document.getElementById("mhof-hof-pct");
    var inpAbs = document.getElementById("mhof-hof-abs");
    if (inpBp) inpBp.value = String(v.hofVolumeBreakpoint);
    if (inpPct) inpPct.value = String(v.hofMinParticipationPct);
    if (inpAbs) inpAbs.value = String(v.hofMinPlayedAbsolute);
    m.removeAttribute("hidden");
    m.setAttribute("aria-hidden", "false");
    return false;
  };

  window.mockStatsHofCloseSettingsModal = function () {
    var m = document.getElementById("mock-hof-settings-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
  };

  window.mockStatsHofSaveSettingsModal = function () {
    var selWr = document.getElementById("mhof-wr-top");
    var selPart = document.getElementById("mhof-part-top");
    var selMonthRev = document.getElementById("mhof-month-reveal");
    var selYearRev = document.getElementById("mhof-year-reveal");
    var monthRev =
      selMonthRev && selMonthRev.value === "monthly_1st_prev"
        ? "monthly_1st_prev"
        : "always";
    var yearRev =
      selYearRev && selYearRev.value === "year_jan1_prev"
        ? "year_jan1_prev"
        : "always";
    var wr = selWr ? mockStatsHofSanitizeLimit(parseInt(selWr.value, 10)) : 10;
    var pr = selPart
      ? mockStatsHofSanitizeLimit(parseInt(selPart.value, 10))
      : 10;
    var inpBp = document.getElementById("mhof-hof-bp");
    var inpPct = document.getElementById("mhof-hof-pct");
    var inpAbs = document.getElementById("mhof-hof-abs");
    var hofBp = inpBp
      ? mockStatsHofSanitizeVolumeBreakpoint(inpBp.value)
      : mockStatsHofVisibilityDefaults().hofVolumeBreakpoint;
    var hofPct = inpPct
      ? mockStatsHofSanitizeParticipationPct(inpPct.value)
      : mockStatsHofVisibilityDefaults().hofMinParticipationPct;
    var hofAbs = inpAbs
      ? mockStatsHofSanitizeMinPlayedAbsolute(inpAbs.value)
      : mockStatsHofVisibilityDefaults().hofMinPlayedAbsolute;
    mockStatsHofVisibilitySet({
      winRateRankLimit: wr,
      participationRankLimit: pr,
      monthReveal: monthRev,
      yearReveal: yearRev,
      hofVolumeBreakpoint: hofBp,
      hofMinParticipationPct: hofPct,
      hofMinPlayedAbsolute: hofAbs,
    });
    window.mockStatsHofCloseSettingsModal();
    if (typeof window.mockStatsRender === "function") window.mockStatsRender();
  };

  function mockStatsHofWinrateTableHtml(title, rows, tableDisplay) {
    tableDisplay = tableDisplay || {};
    if (!rows.length) {
      var emptyMsg = tableDisplay.noEligibleRows
        ? "등재 기준(최소 출전 경기 수)을 충족한 구성원이 없습니다."
        : "해당 기간에 내전 기록이 없습니다.";
      var eligEmpty = tableDisplay.eligibilityNote
        ? '<p class="mock-stats-footnote" style="margin-top:10px;margin-bottom:0">' +
          mockStatsEscapeHtml(tableDisplay.eligibilityNote) +
          "</p>"
        : "";
      return (
        '<div class="d-card d-card-full mock-stats-hof-card">' +
        '<div class="d-card-label">' +
        mockStatsEscapeHtml(title) +
        "</div>" +
        '<p style="font-size:13px;color:var(--text-muted);margin:0">' +
        mockStatsEscapeHtml(emptyMsg) +
        "</p>" +
        eligEmpty +
        (tableDisplay.rollNote
          ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
            mockStatsEscapeHtml(tableDisplay.rollNote) +
            "</p>"
          : "") +
        "</div>"
      );
    }
    var body = rows
      .map(function (r, i) {
        var cls = "mock-stats-wr-row";
        if (i < 3) cls += " mock-stats-wr-row--top";
        else if (i % 2 === 1) cls += " mock-stats-wr-row--alt";
        var col = mockStatsWinrateTdColor(r.wrNum);
        return (
          '<tr class="' +
          cls +
          '"><td>' +
          mockStatsEscapeHtml(r.nick) +
          '</td><td style="text-align:right">' +
          r.winDiff +
          '</td><td style="text-align:right">' +
          r.streak +
          '</td><td style="text-align:right">' +
          r.w +
          "/" +
          r.d +
          "/" +
          r.l +
          '</td><td style="text-align:right;color:' +
          col +
          '">' +
          mockStatsEscapeHtml(r.wr) +
          "</td></tr>"
        );
      })
      .join("");
    var limitFoot = tableDisplay.limitNote
      ? '<p class="mock-stats-footnote" style="margin-top:10px;margin-bottom:0">' +
        mockStatsEscapeHtml(tableDisplay.limitNote) +
        "</p>"
      : "";
    var rollFoot = tableDisplay.rollNote
      ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
        mockStatsEscapeHtml(tableDisplay.rollNote) +
        "</p>"
      : "";
    var eligFoot = tableDisplay.eligibilityNote
      ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
        mockStatsEscapeHtml(tableDisplay.eligibilityNote) +
        "</p>"
      : "";
    return (
      '<div class="d-card d-card-full mock-stats-hof-card">' +
      '<div class="d-card-label">' +
      mockStatsEscapeHtml(title) +
      "</div>" +
      '<div class="mock-stats-winrate-scroll">' +
      '<table class="mock-stats-winrate-table">' +
      "<thead><tr>" +
      "<th>닉네임</th>" +
      '<th style="text-align:right">승차</th>' +
      '<th style="text-align:right">연승</th>' +
      '<th style="text-align:right">결과(승/무/패)</th>' +
      '<th style="text-align:right">승률</th>' +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>" +
      limitFoot +
      eligFoot +
      rollFoot +
      "</div>"
    );
  }

  function mockStatsHofMonthLabel(monthKey) {
    var p = monthKey.split("-");
    return p[0] + "년 " + parseInt(p[1], 10) + "월";
  }

  function mockStatsHofParticipationOneTableHtml(
    rows,
    totalN,
    periodFootnote,
    partDisplay,
  ) {
    partDisplay = partDisplay || {};
    var dispRows = partDisplay.rows != null ? partDisplay.rows : rows;
    if (totalN === 0) {
      return (
        '<div class="d-card d-card-full">' +
        '<div class="d-card-label">내전 경기 참여율</div>' +
        '<p style="font-size:13px;color:var(--text-muted);margin:0">해당 기간에 집계할 내전이 없습니다.</p></div>'
      );
    }
    if (!dispRows.length) {
      var partEmptyMsg = partDisplay.noEligibleRows
        ? "등재 기준(최소 출전 경기 수)을 충족한 구성원이 없습니다."
        : "로스터 데이터가 없어 참여율을 표시할 수 없습니다.";
      var eligPart = partDisplay.eligibilityNote
        ? '<p class="mock-stats-footnote" style="margin-top:10px;margin-bottom:0">' +
          mockStatsEscapeHtml(partDisplay.eligibilityNote) +
          "</p>"
        : "";
      return (
        '<div class="d-card d-card-full">' +
        '<div class="d-card-label">내전 경기 참여율</div>' +
        '<p style="font-size:13px;color:var(--text-muted);margin:0">' +
        mockStatsEscapeHtml(partEmptyMsg) +
        "</p>" +
        eligPart +
        (partDisplay.rollNote
          ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
            mockStatsEscapeHtml(partDisplay.rollNote) +
            "</p>"
          : "") +
        "</div>"
      );
    }
    var body = dispRows
      .map(function (r, i) {
        var cls = "mock-stats-wr-row";
        if (i < 3) cls += " mock-stats-wr-row--top";
        else if (i % 2 === 1) cls += " mock-stats-wr-row--alt";
        return (
          '<tr class="' +
          cls +
          '"><td>' +
          mockStatsEscapeHtml(r.nick) +
          '</td><td style="text-align:right">' +
          r.played +
          "/" +
          totalN +
          '</td><td style="text-align:right;font-weight:700;color:#a5b4fc">' +
          r.pct +
          "%</td></tr>"
        );
      })
      .join("");
    var limitFoot = partDisplay.limitNote
      ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
        mockStatsEscapeHtml(partDisplay.limitNote) +
        "</p>"
      : "";
    var rollFootPart = partDisplay.rollNote
      ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
        mockStatsEscapeHtml(partDisplay.rollNote) +
        "</p>"
      : "";
    var eligFootPart = partDisplay.eligibilityNote
      ? '<p class="mock-stats-footnote" style="margin-top:8px;margin-bottom:0">' +
        mockStatsEscapeHtml(partDisplay.eligibilityNote) +
        "</p>"
      : "";
    return (
      '<div class="d-card d-card-full">' +
      '<div class="d-card-label">내전 경기 참여율</div>' +
      '<div class="mock-stats-winrate-scroll">' +
      '<table class="mock-stats-winrate-table mock-stats-hof-part-table">' +
      "<thead><tr>" +
      "<th>닉네임</th>" +
      '<th style="text-align:right">출전(경기)</th>' +
      '<th style="text-align:right">참여율</th>' +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>" +
      '<p class="mock-stats-footnote" style="margin-top:10px;margin-bottom:0">' +
      mockStatsEscapeHtml(periodFootnote) +
      "</p>" +
      limitFoot +
      eligFootPart +
      rollFootPart +
      "</div>"
    );
  }

  function mockStatsHofBuildRootHtml(intra) {
    var st = window.__mockStatsHofState;
    if (!st) return "";
    var sub = st.subtab === "month" ? "month" : "year";
    var yOn = sub === "year" ? " mock-tab-active" : "";
    var mOn = sub === "month" ? " mock-tab-active" : "";
    var subBar =
      '<div class="mock-tab-row mock-stats-hof-subtabs" role="tablist" aria-label="명예의 전당 구분">' +
      '<button type="button" class="mock-tab' +
      yOn +
      '" role="tab" aria-selected="' +
      (sub === "year" ? "true" : "false") +
      '" data-hof-subtab onclick="return window.mockStatsHofSetSubtab(\'year\')">연도별</button>' +
      '<button type="button" class="mock-tab' +
      mOn +
      '" role="tab" aria-selected="' +
      (sub === "month" ? "true" : "false") +
      '" data-hof-subtab onclick="return window.mockStatsHofSetSubtab(\'month\')">월별</button>' +
      "</div>";

    if (sub === "year") {
      var years = mockStatsHofYearsDescending(intra);
      if (!years.length) years = [st.year];
      var ySel = years
        .map(function (y) {
          return (
            "<option value=\"" +
            y +
            '"' +
            (y === st.year ? " selected" : "") +
            ">" +
            y +
            "년</option>"
          );
        })
        .join("");
      var visY = mockStatsHofVisibilityGet();
      var yAgg = mockStatsHofYearAggregateYear(st.year, visY, st);
      var yIntraAgg = mockStatsHofMatchesInYear(intra, yAgg);
      var yAsc = yIntraAgg.slice().sort(function (a, b) {
        return new Date(a.at) - new Date(b.at);
      });
      var minY = mockStatsHofMinPlayedToQualify(yIntraAgg.length, visY);
      var rowsYAll = mockStatsLeaderboardRowsFromMatches(yAsc);
      var partYAll = mockStatsHofParticipationRowsForMatches(yIntraAgg);
      var rowsY = mockStatsHofFilterWinrateRowsMinPlayed(rowsYAll, minY);
      var partY = mockStatsHofFilterPartRowsMinPlayed(partYAll, minY);
      var eligY = mockStatsHofEligibilityFootnote(yIntraAgg.length, minY, visY);
      var wrDispY = mockStatsHofWinrateTableDisplay(rowsY, visY);
      var partDispY = mockStatsHofParticipationDisplay(partY, visY);
      var rollY = mockStatsHofYearRollNote(visY, yAgg, st.year);
      wrDispY.rollNote = rollY;
      wrDispY.eligibilityNote = eligY;
      wrDispY.noEligibleRows =
        yIntraAgg.length > 0 &&
        rowsY.length === 0 &&
        rowsYAll.length > 0;
      partDispY.rollNote = rollY;
      partDispY.eligibilityNote = eligY;
      partDispY.noEligibleRows =
        yIntraAgg.length > 0 &&
        partY.length === 0 &&
        partYAll.length > 0;
      return (
        subBar +
        '<div class="mock-stats-hof-toolbar">' +
        "<label>집계 연도 " +
        '<select id="mock-stats-hof-year" class="mock-stats-hof-select" onchange="return window.mockStatsHofOnYear(this)">' +
        ySel +
        "</select></label></div>" +
        '<div class="mock-stats-hof-split">' +
        mockStatsHofWinrateTableHtml(
          yAgg + "년 내전 승률 순위",
          wrDispY.rows,
          wrDispY,
        ) +
        mockStatsHofParticipationOneTableHtml(
          partY,
          yIntraAgg.length,
          "한국시간 기준 " +
            yAgg +
            "년 · 내전 " +
            yIntraAgg.length +
            "경기",
          partDispY,
        ) +
        "</div>"
      );
    }

    var allMonths = mockStatsHofAllMonthKeysDescending(intra);
    var mSel = allMonths
      .map(function (mk) {
        return (
          "<option value=\"" +
          mockStatsEscapeHtml(mk) +
          '"' +
          (mk === st.monthKey ? " selected" : "") +
          ">" +
          mockStatsEscapeHtml(mockStatsHofMonthLabel(mk)) +
          "</option>"
        );
      })
      .join("");
    if (!mSel) {
      mSel =
        "<option value=\"" +
        st.year +
        "-01\">" +
        st.year +
        "년 (내전 없음)</option>";
    }
    var visM = mockStatsHofVisibilityGet();
    var mKeyAgg = mockStatsHofMonthAggregateKey(st.monthKey, visM, st);
    var mIntraAgg = mockStatsHofMatchesInMonthKey(intra, mKeyAgg);
    var mAscWr = mIntraAgg.slice().sort(function (a, b) {
      return new Date(a.at) - new Date(b.at);
    });
    var minM = mockStatsHofMinPlayedToQualify(mIntraAgg.length, visM);
    var rowsMAll = mockStatsLeaderboardRowsFromMatches(mAscWr);
    var partMAll = mockStatsHofParticipationRowsForMatches(mIntraAgg);
    var rowsM = mockStatsHofFilterWinrateRowsMinPlayed(rowsMAll, minM);
    var partM = mockStatsHofFilterPartRowsMinPlayed(partMAll, minM);
    var eligM = mockStatsHofEligibilityFootnote(mIntraAgg.length, minM, visM);
    var wrDispM = mockStatsHofWinrateTableDisplay(rowsM, visM);
    var partDispM = mockStatsHofParticipationDisplay(partM, visM);
    var rollM = mockStatsHofMonthRollNote(visM, mKeyAgg, st.monthKey);
    wrDispM.rollNote = rollM;
    wrDispM.eligibilityNote = eligM;
    wrDispM.noEligibleRows =
      mIntraAgg.length > 0 && rowsM.length === 0 && rowsMAll.length > 0;
    partDispM.rollNote = rollM;
    partDispM.eligibilityNote = eligM;
    partDispM.noEligibleRows =
      mIntraAgg.length > 0 && partM.length === 0 && partMAll.length > 0;
    var titleM = mockStatsHofMonthLabel(mKeyAgg) + " 내전 승률 순위";
    return (
      subBar +
      '<div class="mock-stats-hof-toolbar">' +
      "<label>집계 월 " +
      '<select id="mock-stats-hof-month" class="mock-stats-hof-select" onchange="return window.mockStatsHofOnMonth(this)">' +
      mSel +
      "</select></label></div>" +
      '<div class="mock-stats-hof-split">' +
      mockStatsHofWinrateTableHtml(titleM, wrDispM.rows, wrDispM) +
      mockStatsHofParticipationOneTableHtml(
        partM,
        mIntraAgg.length,
        "한국시간 기준 " +
          mockStatsHofMonthLabel(mKeyAgg) +
          " · 내전 " +
          mIntraAgg.length +
          "경기",
        partDispM,
      ) +
      "</div>"
    );
  }

  window.mockStatsHofSetSubtab = function (name) {
    window.__mockStatsHofState = window.__mockStatsHofState || {};
    window.__mockStatsHofState.subtab = name === "month" ? "month" : "year";
    window.mockStatsRender();
    return false;
  };

  window.mockStatsHofOnYear = function (sel) {
    var y = parseInt(sel.value, 10);
    if (isNaN(y)) return false;
    window.__mockStatsHofState = window.__mockStatsHofState || {};
    window.__mockStatsHofState.year = y;
    window.mockStatsRender();
    return false;
  };

  window.mockStatsHofOnMonth = function (sel) {
    window.__mockStatsHofState = window.__mockStatsHofState || {};
    window.__mockStatsHofState.monthKey = sel.value;
    window.mockStatsRender();
    return false;
  };

  /** 상단 탭: 요약 / 경기 기록(운영진+) / 명예의 전당 / 맵·클랜 활동 — main-game 클랜 순위 탭과 동일 패턴(hidden + .on) */
  window.mockStatsSetSection = function (btn, name) {
    if (name === "archive" && window.mockClanCurrentRole() === "member") {
      var sumBtn = document.getElementById("statsTabSummary");
      if (sumBtn && btn !== sumBtn) {
        window.mockStatsSetSection(sumBtn, "summary");
      }
      return false;
    }
    var summary = document.getElementById("stats-panel-summary");
    var archive = document.getElementById("stats-panel-archive");
    var rankmap = document.getElementById("stats-panel-rankmap");
    var hof = document.getElementById("stats-panel-hof");
    if (!summary) return false;
    summary.hidden = name !== "summary";
    if (archive) archive.hidden = name !== "archive";
    if (rankmap) rankmap.hidden = name !== "rankmap";
    if (hof) hof.hidden = name !== "hof";
    var root = document.getElementById("view-stats");
    if (root) {
      root.querySelectorAll("[data-stats-section-tab]").forEach(function (b) {
        var on = b.getAttribute("data-stats-section-tab") === name;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    return false;
  };

  window.mockStatsRender = function () {
    var list = mockStatsFiltered();
    var n = list.length;
    var intra = 0;
    var scrim = 0;
    var ev = 0;
    list.forEach(function (m) {
      if (m.type === "intra") intra++;
      else if (m.type === "scrim") scrim++;
      else ev++;
    });

    var elTotal = document.getElementById("mock-stats-kpi-total");
    var elSplit = document.getElementById("mock-stats-kpi-split");
    var elMembers = document.getElementById("mock-stats-kpi-members");
    var elFounded = document.getElementById("mock-stats-kpi-founded");

    if (elTotal) elTotal.textContent = String(n);
    if (elSplit) {
      elSplit.textContent =
        "내전 " + intra + " · 스크림 " + scrim + (ev ? " · 이벤트 " + ev : "");
    }
    if (elMembers) elMembers.textContent = String(CLAN_STATS_CLAN_META.memberCount);
    if (elFounded) {
      elFounded.textContent = mockStatsFormatFoundedLong(
        CLAN_STATS_CLAN_META.foundedAt,
      );
    }

    var blueN = 0;
    var redN = 0;
    list.forEach(function (m) {
      if (m.type !== "intra") return;
      if (m.winner === "blue") blueN++;
      else if (m.winner === "red") redN++;
    });
    var elBr = document.getElementById("mock-stats-clan-br-panel");
    if (elBr) {
      var intraTotal = blueN + redN;
      if (intraTotal === 0) {
        elBr.innerHTML =
          '<p style="font-size:13px;color:var(--text-muted);margin:0">내전 기록이 없습니다.</p>';
      } else {
        var pctB = Math.round((blueN / intraTotal) * 1000) / 10;
        var pctR = Math.round((redN / intraTotal) * 1000) / 10;
        elBr.innerHTML =
          '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">' +
          '<div><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">블루 승</div>' +
          '<div style="font-size:32px;font-weight:800;color:#38bdf8;line-height:1">' +
          blueN +
          "</div>" +
          '<div style="font-size:12px;color:var(--text-muted)">' +
          pctB +
          "%</div></div>" +
          '<div><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">레드 승</div>' +
          '<div style="font-size:32px;font-weight:800;color:#fb7185;line-height:1">' +
          redN +
          "</div>" +
          '<div style="font-size:12px;color:var(--text-muted)">' +
          pctR +
          "%</div></div>" +
          '<div style="font-size:12px;color:var(--text-muted);align-self:center;max-width:220px">내전 ' +
          intraTotal +
          "경기 중 팀 승 분포 (클랜 대외 전적 아님)</div></div>" +
          '<div style="display:flex;height:12px;border-radius:99px;overflow:hidden;background:var(--bg-overlay)">' +
          '<div style="width:' +
          pctB +
          '%;min-width:0;background:linear-gradient(90deg,#38bdf8,#6366f1)"></div>' +
          '<div style="flex:1;min-width:0;background:linear-gradient(90deg,#fb7185,#f43f5e);opacity:0.9"></div></div>';
      }
    }

    var elCal = document.getElementById("mock-stats-archive-cal-root");
    var elRec = document.getElementById("mock-stats-archive-slider-root");
    var elDayHeading = document.getElementById("mock-stats-archive-day-heading");
    var elWrAside = document.getElementById("mock-stats-archive-winrate");
    var intraList = list.filter(function (m) {
      return m.type === "intra";
    });
    if (window.mockClanCurrentRole() !== "member") {
      mockStatsArchivePrepareState(intraList);
      if (elCal) elCal.innerHTML = mockStatsArchiveBuildCalHtml(intraList);
      if (elRec) elRec.innerHTML = mockStatsArchiveBuildRecordHtml(intraList);
      var calSt = window.__mockStatsArchiveCal;
      if (elDayHeading) {
        if (calSt && calSt.selectedKey) {
          elDayHeading.textContent = mockStatsFormatDayHeadingFromKey(
            calSt.selectedKey,
          );
          elDayHeading.removeAttribute("hidden");
        } else {
          elDayHeading.textContent = "";
          elDayHeading.setAttribute("hidden", "");
        }
      }
      var dayMatches = [];
      var dateLbl = "";
      if (calSt && calSt.selectedKey) {
        dateLbl = mockStatsFormatDayHeadingFromKey(calSt.selectedKey);
        dayMatches = intraList.filter(function (m) {
          return mockStatsDayKey(m.at) === calSt.selectedKey;
        });
      }
      window.__mockStatsWinrateState = {
        rows: mockStatsLeaderboardRowsFromDay(dayMatches),
        sortKey: "wrNum",
        sortDir: "desc",
        dateLabel: dateLbl,
      };
      if (elWrAside) elWrAside.innerHTML = mockStatsWinrateBuildAsideHtml();
    } else {
      window.__mockStatsWinrateState = null;
      if (elCal) elCal.innerHTML = "";
      if (elRec) elRec.innerHTML = "";
      if (elDayHeading) {
        elDayHeading.textContent = "";
        elDayHeading.setAttribute("hidden", "");
      }
      if (elWrAside) elWrAside.innerHTML = "";
    }

    var mapWrap = document.getElementById("mock-stats-map-wrap");
    if (mapWrap) {
      var agg = {};
      list.forEach(function (m) {
        var k = m.map + "\t" + m.mapType;
        if (!agg[k]) {
          agg[k] = {
            map: m.map,
            mapType: m.mapType,
            g: 0,
            blue: 0,
            red: 0,
            scrim: 0,
            event: 0,
          };
        }
        agg[k].g++;
        if (m.type === "intra") {
          if (m.winner === "blue") agg[k].blue++;
          else if (m.winner === "red") agg[k].red++;
        } else if (m.type === "scrim") agg[k].scrim++;
        else if (m.type === "event") agg[k].event++;
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
        var maxG = 1;
        rows.forEach(function (r) {
          if (r.g > maxG) maxG = r.g;
        });
        mapWrap.innerHTML = rows
          .map(function (r) {
            var metaParts = [r.g + "경기"];
            if (r.blue + r.red > 0) {
              metaParts.push("내전 B" + r.blue + "/R" + r.red);
            }
            if (r.scrim) metaParts.push("스크림 " + r.scrim);
            if (r.event) metaParts.push("이벤트 " + r.event);
            var barW = Math.round((r.g / maxG) * 1000) / 10;
            return (
              '<div class="mock-stats-map-row">' +
              '<div class="mock-stats-map-meta"><span><strong>' +
              r.map +
              '</strong> <span style="color:var(--text-muted);font-weight:400">· ' +
              r.mapType +
              '</span></span><span style="color:var(--text-muted);white-space:nowrap">' +
              metaParts.join(" · ") +
              "</span></div>" +
              '<div class="mock-stats-map-bar"><i style="width:' +
              barW +
              '%"></i></div></div>'
            );
          })
          .join("");
      }
    }

    var elHof = document.getElementById("mock-stats-hof-root");
    if (elHof) {
      mockStatsHofEnsureState(intraList);
      mockStatsHofClampYear(intraList);
      mockStatsHofClampMonthKey(intraList);
      elHof.innerHTML = mockStatsHofBuildRootHtml(intraList);
    }
  };
})();

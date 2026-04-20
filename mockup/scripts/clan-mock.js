/**
 * 클랜 메인 정적 목업 — 뷰 전환·권한(?role=)·플랜(URL ?plan= 또는 구독 localStorage)·이벤트 모달
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
  var CLAN_BANNER_HIDE_VIEWS = {
    balance: true,
    stats: true,
    events: true,
    manage: true,
  };

  /** 구성원도 밸런스 메뉴 진입 가능(세션 대기/실시간 합류). 운영진+ 전용은 관리만 */
  var OFFICER_VIEWS = { manage: true };

  /** 클랜 관리 구독 목업 — 플랜은 밸런스 Premium UI·body.mock-plan-* 와 동기 */
  var MOCK_SUBSCRIBE_STORAGE_KEY = "clansync-mock-subscribe-v1";

  function mockSubscribeStorageGetEffectivePlan() {
    try {
      var raw = localStorage.getItem(MOCK_SUBSCRIBE_STORAGE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return null;
      if (o.plan === "premium" || o.plan === "free") return o.plan;
      if (Array.isArray(o.payments) && o.payments.length > 0) return "premium";
    } catch (e) {}
    return null;
  }

  window.mockClanCurrentRole = function () {
    try {
      var p = new URLSearchParams(window.location.search);
      var r = (p.get("role") || "leader").toLowerCase();
      if (r === "member" || r === "officer" || r === "leader") return r;
    } catch (e) {}
    return "leader";
  };

  /**
   * 목업 플랜: URL `?plan=free|premium|pro` 가 있으면 최우선(허브·스크린샷용).
   * 없으면 localStorage 구독 상태(`clansync-mock-subscribe-v1`.plan 또는 결제 기록) 사용.
   */
  window.mockClanCurrentPlan = function () {
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.has("plan")) {
        var pl = (p.get("plan") || "free").toLowerCase();
        if (pl === "premium" || pl === "pro") return "premium";
        return "free";
      }
    } catch (e) {}
    var stored = mockSubscribeStorageGetEffectivePlan();
    if (stored === "premium" || stored === "free") return stored;
    return "free";
  };

  /** 목업 허브 `_hub.html` 전용: `?hubDebug=1` 이면 구성원도 관리 화면 진입 가능(미리보기) */
  window.mockClanHubDebug = function () {
    try {
      return new URLSearchParams(window.location.search).get("hubDebug") === "1";
    } catch (e) {}
    return false;
  };

  /**
   * 구성원: 밸런스 세션 미시작 → body.mock-balance-no-session(대기 카드).
   * `?balanceSession=1` 또는 sessionStorage clansync-mock-balance-session=1 이면 라이브 UI.
   */
  window.mockApplyBalanceSessionGate = function () {
    var role = window.mockClanCurrentRole();
    document.body.classList.remove("mock-balance-no-session", "mock-balance-session-active");
    if (role !== "member") {
      document.body.classList.add("mock-balance-session-active");
      return;
    }
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get("balanceSession") === "1") {
        document.body.classList.add("mock-balance-session-active");
        return;
      }
      if (sessionStorage.getItem("clansync-mock-balance-session") === "1") {
        document.body.classList.add("mock-balance-session-active");
        return;
      }
    } catch (e) {}
    document.body.classList.add("mock-balance-no-session");
  };

  window.mockBalanceMemberMockSessionStart = function () {
    try {
      sessionStorage.setItem("clansync-mock-balance-session", "1");
    } catch (e) {}
    document.body.classList.remove("mock-balance-no-session");
    document.body.classList.add("mock-balance-session-active");
    if (typeof window.mockSidebarNotifySet === "function") {
      window.mockSidebarNotifySet("balance", true);
    }
    return false;
  };

  window.mockBalanceMemberMockSessionReset = function () {
    try {
      sessionStorage.removeItem("clansync-mock-balance-session");
    } catch (e) {}
    if (window.mockClanCurrentRole() === "member") {
      document.body.classList.add("mock-balance-no-session");
      document.body.classList.remove("mock-balance-session-active");
    }
    return false;
  };

  var MOCK_SIDEBAR_NOTIFY_KEY = "clansync-mock-sidebar-notify-v1";
  /** 목업: 사이드바 알림 점을 항상 표시(디버그). 끄려면 false 또는 URL `?sidebarNotifyDebug=0` */
  var MOCK_SIDEBAR_NOTIFY_DEBUG = true;

  function mockSidebarNotifyDebugActive() {
    try {
      var q = new URLSearchParams(window.location.search);
      var p = q.get("sidebarNotifyDebug");
      if (p === "0" || p === "false") return false;
      if (p === "1" || p === "true") return true;
    } catch (e) {}
    return MOCK_SIDEBAR_NOTIFY_DEBUG;
  }
  var MOCK_CLAN_BANNER_IMG_KEY = "clansync-mock-clan-banner-image";
  var MOCK_CLAN_ICON_IMG_KEY = "clansync-mock-clan-icon-image";
  var MOCK_CLAN_NOTICE_KEY = "clansync-mock-clan-notice";
  var MOCK_CLAN_NOTICE_POSTS_KEY = "clansync-mock-clan-notice-posts-v1";
  var MOCK_CLAN_RULES_KEY = "clansync-mock-clan-rules";
  /** 목업 기본 클랜 규칙(저장소가 비어 있을 때만 주입) */
  var MOCK_CLAN_RULES_DEFAULT_TEXT =
    "1. 정기 내전은 월 6경기 이상 참여를 권장합니다. 미달 시 순위 집계에서 제외됩니다.\n" +
    "2. 경기 중 비매너 언행은 경고 3회 누적 시 자동 퇴출 처리됩니다.\n" +
    "3. 가입 후 2주 이내 첫 내전 참여를 완료해야 정식 멤버로 승인됩니다.\n" +
    "4. 장기 미접속(30일 이상) 시 사전 공지 없으면 비활성 처리될 수 있습니다.";

  var __mockClanImageKind = "banner";
  var __mockClanImagePendingDataUrl = null;

  function mockSidebarNotifyReadState() {
    try {
      var raw = localStorage.getItem(MOCK_SIDEBAR_NOTIFY_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        return { balance: !!o.balance, events: !!o.events };
      }
    } catch (e) {}
    return { balance: false, events: false };
  }

  window.mockSidebarNotifySet = function (kind, on) {
    var st = mockSidebarNotifyReadState();
    if (kind === "balance" || kind === "events") st[kind] = !!on;
    try {
      localStorage.setItem(MOCK_SIDEBAR_NOTIFY_KEY, JSON.stringify(st));
    } catch (e) {}
    window.mockSidebarNotifyRefresh();
  };

  /**
   * D-SHELL-03 — 사이드바 알림 점 운영 트리거 규칙
   *   #dash    : 없음 (허브 뷰 중복 방지)
   *   #balance : 내가 속한 진행 중 내전 세션 수. 정보성 → #balance 진입 시 자동 clear.
   *              (Phase 1 목업: localStorage boolean state로 근사, DEBUG 플래그로 강제 표시 가능)
   *   #events  : (24h 내 RSVP 미응답 일정 수) + (진행 중 투표 미응답 수). 정보성 → #events 진입 시 자동 clear.
   *              (Phase 1 목업: 실데이터 없음, 디버그 표시 또는 이벤트 등록 후 일시 켜짐)
   *   #manage  : 가입 요청 pending 수 + 신규 휴면 진입 미처리 수 (D-CLAN-02·07). 행동성 → 실제 처리로만 clear.
   *   #stats / #store : 없음 (조회형).
   */
  window.mockSidebarNotifyRefresh = function () {
    var st = mockSidebarNotifyReadState();
    var dbg = mockSidebarNotifyDebugActive();
    var showBalance = dbg || st.balance;
    var showEvents = dbg || st.events;
    var b = document.getElementById("sidebar-notify-balance");
    var ev = document.getElementById("sidebar-notify-events");
    if (b) {
      if (showBalance) b.removeAttribute("hidden");
      else b.setAttribute("hidden", "");
      b.setAttribute("aria-hidden", showBalance ? "false" : "true");
    }
    if (ev) {
      if (showEvents) ev.removeAttribute("hidden");
      else ev.setAttribute("hidden", "");
      ev.setAttribute("aria-hidden", showEvents ? "false" : "true");
    }
    var m = document.getElementById("sidebar-notify-manage");
    if (m) {
      var reqCount = 0;
      var reqTbody = document.getElementById("mock-manage-requests-tbody");
      if (reqTbody) reqCount = reqTbody.querySelectorAll("tr").length;
      var newDormant = 0;
      if (typeof mockManageMembersStats === "function") {
        try {
          var s = mockManageMembersStats();
          newDormant = (s && s.newDormant) || 0;
        } catch (e) {}
      }
      var manageCount = reqCount + newDormant;
      var showManage = dbg || manageCount > 0;
      m.textContent = dbg && manageCount === 0 ? "N" : String(manageCount);
      if (showManage) m.removeAttribute("hidden");
      else m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", showManage ? "false" : "true");
    }
  };

  window.mockSidebarNotifyClearView = function (view) {
    if (view === "balance") window.mockSidebarNotifySet("balance", false);
    if (view === "events") window.mockSidebarNotifySet("events", false);
  };

  window.mockClanApplyStoredImages = function () {
    var bannerData = null;
    var iconData = null;
    try {
      bannerData = localStorage.getItem(MOCK_CLAN_BANNER_IMG_KEY);
    } catch (e) {}
    try {
      iconData = localStorage.getItem(MOCK_CLAN_ICON_IMG_KEY);
    } catch (e) {}

    var bannerRoot = document.getElementById("mock-clan-banner-root");
    if (bannerRoot) {
      if (bannerData) {
        bannerRoot.style.backgroundImage =
          "linear-gradient(120deg, rgba(10,10,18,0.88), rgba(30,20,50,0.85)), url(" +
          JSON.stringify(bannerData) +
          ")";
        bannerRoot.style.backgroundSize = "cover";
        bannerRoot.style.backgroundPosition = "center";
      } else {
        bannerRoot.style.backgroundImage = "";
        bannerRoot.style.backgroundSize = "";
        bannerRoot.style.backgroundPosition = "";
      }
    }

    var sidebarLogo = document.getElementById("mock-clan-sidebar-logo");
    if (sidebarLogo) {
      sidebarLogo.innerHTML = "";
      if (iconData) {
        var im = document.createElement("img");
        im.src = iconData;
        im.alt = "";
        im.style.cssText =
          "width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block";
        sidebarLogo.appendChild(im);
      } else {
        sidebarLogo.textContent = "🔥";
      }
    }

    var bannerEmoji = document.getElementById("mock-clan-banner-logo-emoji");
    if (bannerEmoji) {
      bannerEmoji.innerHTML = "";
      if (iconData) {
        var im2 = document.createElement("img");
        im2.src = iconData;
        im2.alt = "";
        im2.style.cssText =
          "width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block";
        bannerEmoji.appendChild(im2);
      } else {
        bannerEmoji.textContent = "🔥";
      }
    }
  };

  // D-MANAGE-04 업로드 제약 상수
  var MOCK_CLAN_MEDIA_MIME_ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  var MOCK_CLAN_MEDIA_LIMITS = {
    banner: {
      maxBytes: 3 * 1024 * 1024, // 3 MB
      maxLabel: "3 MB",
      ratio: "4:1",
      recommendedPx: "1600×400",
      minPx: "1200×300",
    },
    icon: {
      maxBytes: 2 * 1024 * 1024, // 2 MB
      maxLabel: "2 MB",
      ratio: "1:1",
      recommendedPx: "512×512",
      minPx: "256×256",
    },
  };

  window.mockClanImageValidate = function (file, kind) {
    if (!file) return { ok: false, error: "파일이 선택되지 않았습니다." };
    var limit = MOCK_CLAN_MEDIA_LIMITS[kind === "icon" ? "icon" : "banner"];
    if (MOCK_CLAN_MEDIA_MIME_ALLOWED.indexOf(file.type) === -1) {
      return {
        ok: false,
        error:
          "허용되지 않는 형식입니다. (" +
          (file.type || "알 수 없음") +
          ") · JPEG · PNG · WebP만 가능합니다.",
      };
    }
    if (file.size > limit.maxBytes) {
      var mb = (file.size / (1024 * 1024)).toFixed(2);
      return {
        ok: false,
        error:
          "용량이 " +
          limit.maxLabel +
          " 를 초과했습니다. (현재 " +
          mb +
          " MB) · 리사이즈 후 다시 업로드하세요.",
      };
    }
    return { ok: true };
  };

  function mockClanImageSetError(msg) {
    var el = document.getElementById("mock-clan-image-modal-error");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.removeAttribute("hidden");
    } else {
      el.textContent = "";
      el.setAttribute("hidden", "");
    }
  }

  window.mockClanImageModalOpen = function (kind) {
    __mockClanImageKind = kind === "icon" ? "icon" : "banner";
    __mockClanImagePendingDataUrl = null;
    var modal = document.getElementById("mock-clan-image-modal");
    var hint = document.getElementById("mock-clan-image-modal-hint");
    var spec = document.getElementById("mock-clan-image-modal-spec");
    var title = document.getElementById("mock-clan-image-modal-title");
    var file = document.getElementById("mock-clan-image-file");
    var preview = document.getElementById("mock-clan-image-preview");
    var limit = MOCK_CLAN_MEDIA_LIMITS[__mockClanImageKind];
    if (title) {
      title.textContent =
        __mockClanImageKind === "banner" ? "배너 이미지 적용" : "클랜 아이콘 편집";
    }
    if (hint) {
      hint.textContent =
        __mockClanImageKind === "banner"
          ? "배너 영역에 표시될 이미지를 선택합니다. (목업·로컬 저장)"
          : "사이드바·배너 로고에 표시됩니다. (목업·로컬 저장)";
    }
    if (spec && limit) {
      spec.innerHTML =
        "형식: <strong>JPEG · PNG · WebP</strong> · 최대 <strong>" +
        limit.maxLabel +
        "</strong> · 비율 <strong>" +
        limit.ratio +
        "</strong> · 권장 " +
        limit.recommendedPx +
        " (최소 " +
        limit.minPx +
        ") · 정적 이미지만 (D-MANAGE-04)";
    }
    mockClanImageSetError("");
    if (file) file.value = "";
    if (preview) {
      preview.setAttribute("hidden", "");
      preview.removeAttribute("src");
    }
    if (modal) {
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
    }
    return false;
  };

  window.mockClanImageModalClose = function () {
    var modal = document.getElementById("mock-clan-image-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockClanImageFileChange = function (input) {
    var f = input.files && input.files[0];
    if (!f) return false;
    var check = window.mockClanImageValidate(f, __mockClanImageKind);
    if (!check.ok) {
      mockClanImageSetError(check.error);
      __mockClanImagePendingDataUrl = null;
      input.value = "";
      var preview0 = document.getElementById("mock-clan-image-preview");
      if (preview0) {
        preview0.setAttribute("hidden", "");
        preview0.removeAttribute("src");
      }
      return false;
    }
    mockClanImageSetError("");
    var reader = new FileReader();
    reader.onload = function () {
      __mockClanImagePendingDataUrl = reader.result;
      var preview = document.getElementById("mock-clan-image-preview");
      if (preview && reader.result) {
        preview.src = reader.result;
        preview.removeAttribute("hidden");
      }
    };
    reader.readAsDataURL(f);
    return false;
  };

  window.mockClanImageModalApply = function () {
    var dataUrl = __mockClanImagePendingDataUrl;
    if (!dataUrl) {
      window.alert("먼저 이미지 파일을 선택하세요.");
      return false;
    }
    try {
      if (__mockClanImageKind === "banner") {
        localStorage.setItem(MOCK_CLAN_BANNER_IMG_KEY, dataUrl);
      } else {
        localStorage.setItem(MOCK_CLAN_ICON_IMG_KEY, dataUrl);
      }
    } catch (e) {
      window.alert("저장에 실패했습니다.");
      return false;
    }
    window.mockClanApplyStoredImages();
    window.mockClanImageModalClose();
    return false;
  };

  function mockClanNoticePostsMigrate() {
    try {
      var raw = localStorage.getItem(MOCK_CLAN_NOTICE_POSTS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return;
      }
    } catch (e) {}
    try {
      var legacy = localStorage.getItem(MOCK_CLAN_NOTICE_KEY);
      if (legacy && String(legacy).trim()) {
        var now = new Date().toISOString();
        var one = {
          id: "migrated-" + Date.now(),
          title: "이전 공지",
          body: String(legacy),
          createdAt: now,
          updatedAt: now,
        };
        localStorage.setItem(MOCK_CLAN_NOTICE_POSTS_KEY, JSON.stringify([one]));
      }
    } catch (e) {}
  }

  /** localStorage에 공지·규칙이 없을 때만 임시 목업 데이터를 넣는다(사용자 저장분은 덮어쓰지 않음). */
  function mockClanSeedNoticeRulesDefaultsIfEmpty() {
    mockClanNoticePostsMigrate();
    try {
      var rawP = localStorage.getItem(MOCK_CLAN_NOTICE_POSTS_KEY);
      var emptyPosts = true;
      if (rawP) {
        var arr = JSON.parse(rawP);
        if (Array.isArray(arr) && arr.length) emptyPosts = false;
      }
      if (emptyPosts) {
        var t0 = new Date().toISOString();
        localStorage.setItem(
          MOCK_CLAN_NOTICE_POSTS_KEY,
          JSON.stringify([
            {
              id: "mock-seed-notice-1",
              title: "3월 정기 내전 일정 안내",
              body: "3/22(토) 21:00 정기 내전이 예정되어 있습니다. 참여 가능 여부를 Discord에 미리 알려주세요.",
              createdAt: t0,
              updatedAt: t0,
            },
            {
              id: "mock-seed-notice-2",
              title: "비매너 행위 경고 규정 업데이트",
              body: "3회 경고 시 자동 퇴출로 규정이 강화되었습니다. 클랜 규칙을 다시 한번 확인해주세요.",
              createdAt: t0,
              updatedAt: t0,
            },
          ]),
        );
      }
    } catch (eSeedP) {}
    try {
      var rawR = localStorage.getItem(MOCK_CLAN_RULES_KEY);
      if (rawR == null || !String(rawR).trim()) {
        localStorage.setItem(MOCK_CLAN_RULES_KEY, MOCK_CLAN_RULES_DEFAULT_TEXT);
      }
    } catch (eSeedR) {}
  }

  function mockClanNoticePostsGetAll() {
    mockClanNoticePostsMigrate();
    try {
      var raw = localStorage.getItem(MOCK_CLAN_NOTICE_POSTS_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }

  function mockClanNoticePostsSetAll(posts) {
    localStorage.setItem(MOCK_CLAN_NOTICE_POSTS_KEY, JSON.stringify(posts));
  }

  window.mockClanNoticePostsRender = function () {
    var container = document.getElementById("mock-manage-notice-posts-list");
    if (!container) {
      mockDashDashboardHydrate();
      return;
    }
    var posts = mockClanNoticePostsGetAll();
    container.innerHTML = "";
    if (!posts.length) {
      var empty = document.createElement("p");
      empty.className = "mock-manage-posts-empty";
      empty.textContent = "등록된 공지가 없습니다. 「공지 작성」으로 추가하세요.";
      container.appendChild(empty);
      mockDashDashboardHydrate();
      return;
    }
    var sorted = posts.slice().sort(function (a, b) {
      var tb = (b.updatedAt || b.createdAt || "").toString();
      var ta = (a.updatedAt || a.createdAt || "").toString();
      return tb.localeCompare(ta);
    });
    sorted.forEach(function (post) {
      var card = document.createElement("article");
      card.className = "mock-manage-post-card";
      card.setAttribute("data-post-id", post.id);
      var head = document.createElement("div");
      head.className = "mock-manage-post-card-head";
      var h4 = document.createElement("h4");
      h4.textContent = post.title || "(제목 없음)";
      var meta = document.createElement("span");
      meta.className = "mock-manage-post-meta";
      var d = post.updatedAt || post.createdAt || "";
      try {
        meta.textContent = d ? new Date(d).toLocaleString("ko-KR") : "";
      } catch (e2) {
        meta.textContent = "";
      }
      head.appendChild(h4);
      head.appendChild(meta);
      var bodyEl = document.createElement("p");
      bodyEl.className = "mock-manage-post-body";
      var bodyText = post.body || "";
      bodyEl.textContent = bodyText.length > 220 ? bodyText.slice(0, 220) + "…" : bodyText;
      var actions = document.createElement("div");
      actions.className = "mock-manage-post-actions";
      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-secondary btn-sm";
      btnEdit.textContent = "편집";
      (function (pid) {
        btnEdit.onclick = function () {
          window.mockClanNoticePostModalOpen(pid);
        };
      })(post.id);
      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-secondary btn-sm";
      btnDel.textContent = "삭제";
      (function (pid) {
        btnDel.onclick = function () {
          window.mockClanNoticePostDelete(pid);
        };
      })(post.id);
      actions.appendChild(btnEdit);
      actions.appendChild(btnDel);
      card.appendChild(head);
      card.appendChild(bodyEl);
      card.appendChild(actions);
      container.appendChild(card);
    });
    mockDashDashboardHydrate();
  };

  /** 대시보드(#view-dash): 공지 목록·클랜 규칙 미리보기 (localStorage 연동) */
  function mockDashDashboardHydrate() {
    var noticeHost = document.getElementById("dash-notice-posts");
    if (noticeHost) {
      var posts = mockClanNoticePostsGetAll();
      noticeHost.innerHTML = "";
      if (!posts.length) {
        var empty = document.createElement("p");
        empty.className = "dash-notice-empty";
        empty.style.cssText = "font-size:13px;color:var(--text-muted);margin:0";
        empty.textContent = "등록된 공지가 없습니다. 클랜 관리에서 공지를 작성하세요.";
        noticeHost.appendChild(empty);
      } else {
        var sorted = posts.slice().sort(function (a, b) {
          var tb = (b.updatedAt || b.createdAt || "").toString();
          var ta = (a.updatedAt || a.createdAt || "").toString();
          return tb.localeCompare(ta);
        });
        sorted.slice(0, 5).forEach(function (post) {
          var pin = document.createElement("div");
          pin.className = "notice-pin dash-notice-pin--clickable";
          pin.setAttribute("role", "button");
          pin.setAttribute("tabindex", "0");
          pin.setAttribute("aria-label", (post.title || "공지") + " 전체 보기");
          (function (pid) {
            pin.onclick = function () {
              window.mockDashOpenNoticeReadModal(pid);
            };
            pin.onkeydown = function (ev) {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                window.mockDashOpenNoticeReadModal(pid);
              }
            };
          })(post.id);
          var icon = document.createElement("div");
          icon.className = "notice-pin-icon";
          icon.textContent = "🔔";
          var body = document.createElement("div");
          body.className = "notice-pin-body";
          var title = document.createElement("div");
          title.className = "notice-pin-title";
          title.textContent = post.title || "(제목 없음)";
          var snippet = document.createElement("div");
          snippet.style.cssText = "font-size:12px;color:var(--text-secondary);margin-bottom:3px";
          var bodyText = post.body || "";
          snippet.textContent =
            bodyText.length > 160 ? bodyText.slice(0, 160) + "…" : bodyText;
          var time = document.createElement("div");
          time.className = "notice-pin-time";
          var d = post.updatedAt || post.createdAt || "";
          try {
            time.textContent = d ? new Date(d).toLocaleString("ko-KR") : "";
          } catch (eT) {
            time.textContent = "";
          }
          body.appendChild(title);
          body.appendChild(snippet);
          body.appendChild(time);
          pin.appendChild(icon);
          pin.appendChild(body);
          noticeHost.appendChild(pin);
        });
      }
    }
    var rulesEl = document.getElementById("dash-rules-body");
    if (rulesEl) {
      try {
        var rv = localStorage.getItem(MOCK_CLAN_RULES_KEY);
        var t = rv != null ? String(rv).trim() : "";
        rulesEl.textContent = t || "아직 등록된 규칙이 없습니다. 클랜 관리에서 규칙을 등록하세요.";
      } catch (eR) {
        rulesEl.textContent = "규칙을 불러오지 못했습니다.";
      }
      rulesEl.onclick = function () {
        if (typeof window.mockDashOpenRulesReadModal === "function") {
          window.mockDashOpenRulesReadModal();
        }
      };
      rulesEl.onkeydown = function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          if (typeof window.mockDashOpenRulesReadModal === "function") {
            window.mockDashOpenRulesReadModal();
          }
        }
      };
    }
  }

  window.mockDashNoticeReadModalClose = function () {
    var modal = document.getElementById("mock-dash-notice-read-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockDashOpenNoticeReadModal = function (postId) {
    if (!postId) return false;
    var posts = mockClanNoticePostsGetAll();
    var post = null;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].id === postId) {
        post = posts[i];
        break;
      }
    }
    var modal = document.getElementById("mock-dash-notice-read-modal");
    var titleEl = document.getElementById("mock-dash-notice-read-title");
    var metaEl = document.getElementById("mock-dash-notice-read-meta");
    var bodyEl = document.getElementById("mock-dash-notice-read-body");
    if (!modal || !titleEl || !bodyEl) return false;
    if (!post) {
      titleEl.textContent = "공지를 찾을 수 없습니다";
      if (metaEl) metaEl.textContent = "";
      bodyEl.textContent = "";
    } else {
      titleEl.textContent = post.title || "(제목 없음)";
      var d = post.updatedAt || post.createdAt || "";
      try {
        if (metaEl) metaEl.textContent = d ? "게시: " + new Date(d).toLocaleString("ko-KR") : "";
      } catch (eM) {
        if (metaEl) metaEl.textContent = "";
      }
      bodyEl.textContent = post.body || "";
    }
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    return false;
  };

  window.mockDashRulesReadModalClose = function () {
    var modal = document.getElementById("mock-dash-rules-read-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockDashOpenRulesReadModal = function () {
    var modal = document.getElementById("mock-dash-rules-read-modal");
    var bodyEl = document.getElementById("mock-dash-rules-read-body");
    if (!modal || !bodyEl) return false;
    var t = "";
    try {
      var rv = localStorage.getItem(MOCK_CLAN_RULES_KEY);
      t = rv != null ? String(rv).trim() : "";
    } catch (eR2) {}
    bodyEl.textContent = t || "아직 등록된 규칙이 없습니다.";
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    return false;
  };

  window.mockClanNoticePostModalOpen = function (id) {
    var modal = document.getElementById("mock-clan-notice-post-modal");
    var titleEl = document.getElementById("mock-clan-notice-post-modal-title");
    var idInput = document.getElementById("mnp-id");
    var titleInput = document.getElementById("mnp-title");
    var bodyInput = document.getElementById("mnp-body");
    var delBtn = document.getElementById("mnp-delete-btn");
    if (!modal || !titleInput || !bodyInput || !idInput) return false;
    if (id) {
      var posts = mockClanNoticePostsGetAll();
      var post = null;
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].id === id) {
          post = posts[i];
          break;
        }
      }
      if (!post) return false;
      idInput.value = post.id;
      titleInput.value = post.title || "";
      bodyInput.value = post.body || "";
      if (titleEl) titleEl.textContent = "공지 편집";
      if (delBtn) delBtn.removeAttribute("hidden");
    } else {
      idInput.value = "";
      titleInput.value = "";
      bodyInput.value = "";
      if (titleEl) titleEl.textContent = "공지 작성";
      if (delBtn) delBtn.setAttribute("hidden", "");
    }
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    window.setTimeout(function () {
      titleInput.focus();
    }, 0);
    return false;
  };

  window.mockClanNoticePostModalClose = function () {
    var modal = document.getElementById("mock-clan-notice-post-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    return false;
  };

  window.mockClanNoticePostModalSave = function () {
    var idInput = document.getElementById("mnp-id");
    var titleInput = document.getElementById("mnp-title");
    var bodyInput = document.getElementById("mnp-body");
    if (!titleInput || !bodyInput) return false;
    var title = (titleInput.value || "").trim();
    var body = (bodyInput.value || "").trim();
    if (!title) {
      window.alert("제목을 입력하세요.");
      return false;
    }
    var posts = mockClanNoticePostsGetAll();
    var now = new Date().toISOString();
    var id = idInput && idInput.value;
    if (id) {
      posts = posts.map(function (p) {
        if (p.id !== id) return p;
        return {
          id: p.id,
          title: title,
          body: body,
          createdAt: p.createdAt || now,
          updatedAt: now,
        };
      });
    } else {
      var newId = "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      posts.push({
        id: newId,
        title: title,
        body: body,
        createdAt: now,
        updatedAt: now,
      });
    }
    try {
      mockClanNoticePostsSetAll(posts);
    } catch (e) {
      window.alert("저장에 실패했습니다.");
      return false;
    }
    window.mockClanNoticePostsRender();
    window.mockClanNoticePostModalClose();
    return false;
  };

  window.mockClanNoticePostDelete = function (postId) {
    if (!postId || !window.confirm("이 공지를 삭제할까요?")) return false;
    var posts = mockClanNoticePostsGetAll().filter(function (p) {
      return p.id !== postId;
    });
    try {
      mockClanNoticePostsSetAll(posts);
    } catch (e) {
      window.alert("삭제에 실패했습니다.");
      return false;
    }
    window.mockClanNoticePostsRender();
    return false;
  };

  window.mockClanNoticePostDeleteFromModal = function () {
    var idInput = document.getElementById("mnp-id");
    var id = idInput && idInput.value;
    if (!id) return false;
    if (!window.confirm("이 공지를 삭제할까요?")) return false;
    var posts = mockClanNoticePostsGetAll().filter(function (p) {
      return p.id !== id;
    });
    try {
      mockClanNoticePostsSetAll(posts);
    } catch (e) {
      window.alert("삭제에 실패했습니다.");
      return false;
    }
    window.mockClanNoticePostsRender();
    window.mockClanNoticePostModalClose();
    return false;
  };

  window.mockManageSetTab = function (btn, name) {
    document.querySelectorAll("[data-manage-tab]").forEach(function (b) {
      var on = b.getAttribute("data-manage-tab") === name;
      b.classList.toggle("mock-tab-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-manage-panel]").forEach(function (p) {
      var on = p.getAttribute("data-manage-panel") === name;
      if (on) {
        p.removeAttribute("hidden");
        p.style.display = "";
      } else {
        p.setAttribute("hidden", "");
      }
    });
    if (name === "subscribe" && typeof window.mockManageSubscribeRender === "function") {
      window.mockManageSubscribeRender();
    }
    if (name === "members" && typeof window.mockManageMembersRender === "function") {
      window.mockManageMembersRender();
    }
    if (name === "requests" && typeof window.mockManageRequestsRender === "function") {
      window.mockManageRequestsRender();
    }
    if (name === "overview" && typeof window.mockClanSettingsSyncUi === "function") {
      window.mockClanSettingsSyncUi();
    }
    return false;
  };

  window.mockManageInitTabState = function () {
    var first = document.querySelector('[data-manage-tab="overview"]');
    if (first) window.mockManageSetTab(first, "overview");
  };

  window.mockClanManageLoadRules = function () {
    var r = document.getElementById("mock-manage-clan-rules");
    try {
      var rv = localStorage.getItem(MOCK_CLAN_RULES_KEY);
      if (r && rv != null) r.value = rv;
    } catch (e) {}
  };

  window.mockClanManageSaveRules = function () {
    var r = document.getElementById("mock-manage-clan-rules");
    var saved = document.getElementById("mock-manage-clan-rules-saved");
    try {
      if (r) localStorage.setItem(MOCK_CLAN_RULES_KEY, r.value);
    } catch (e) {
      window.alert("저장에 실패했습니다.");
      return false;
    }
    if (saved) {
      saved.removeAttribute("hidden");
      window.setTimeout(function () {
        saved.setAttribute("hidden", "");
      }, 2000);
    }
    mockDashDashboardHydrate();
    return false;
  };

  /*
   * ── 클랜 운영 권한 설정 (D-MANAGE-02 / D-MANAGE-03) ───────────────────
   * localStorage 키 하나에 JSON으로 저장. leader만 쓰기 가능.
   *
   *   allowOfficerEditMscore: boolean (기본 false) — M점수 편집 officer 허용 여부
   *   altAccountsVisibility : 'officers' | 'clan_members' (기본 'officers')
   *
   * 영향 화면:
   *  - 개요 탭 "운영 권한 설정" 카드 (본인 입력/표시)
   *  - 구성원 개인 상세 모달의 M점수 입력 disabled/enabled
   *  - 구성원 개인 상세 모달의 부계정 공개 범위 라벨 (mock-mmgr-detail-sub-visibility-label)
   */
  var MOCK_CLAN_SETTINGS_KEY = "clansync-mock-clan-settings-v1";
  var MOCK_CLAN_SETTINGS_DEFAULT = {
    allowOfficerEditMscore: false,
    altAccountsVisibility: "officers",
  };

  window.mockClanSettingsGet = function () {
    try {
      var raw = localStorage.getItem(MOCK_CLAN_SETTINGS_KEY);
      if (!raw) return Object.assign({}, MOCK_CLAN_SETTINGS_DEFAULT);
      var parsed = JSON.parse(raw);
      return {
        allowOfficerEditMscore:
          parsed && parsed.allowOfficerEditMscore === true,
        altAccountsVisibility:
          parsed && parsed.altAccountsVisibility === "clan_members"
            ? "clan_members"
            : "officers",
      };
    } catch (e) {
      return Object.assign({}, MOCK_CLAN_SETTINGS_DEFAULT);
    }
  };

  window.mockClanSettingsSet = function (partial) {
    var cur = window.mockClanSettingsGet();
    var next = Object.assign({}, cur, partial || {});
    try {
      localStorage.setItem(MOCK_CLAN_SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {}
    window.mockClanSettingsSyncUi();
    return next;
  };

  window.mockClanSettingsSyncUi = function () {
    var s = window.mockClanSettingsGet();
    var role = window.mockClanCurrentRole();
    var isLeader = role === "leader";

    // 토글 1: M점수 편집 officer 허용
    var mscoreCbx = document.getElementById("mock-clan-setting-officer-mscore");
    if (mscoreCbx) {
      mscoreCbx.checked = !!s.allowOfficerEditMscore;
      mscoreCbx.disabled = !isLeader;
    }

    // 라디오: 부계정 공개 범위
    var radios = document.querySelectorAll(
      'input[name="mock-clan-setting-alt-visibility"]',
    );
    Array.prototype.forEach.call(radios, function (r) {
      r.checked = r.value === s.altAccountsVisibility;
      r.disabled = !isLeader;
    });

    // leader 전용 disabled 안내 캡션 표시
    var card = document.getElementById("mock-manage-clan-settings-card");
    if (card) {
      var notes = card.querySelectorAll(".mock-leader-only-disabled-note");
      Array.prototype.forEach.call(notes, function (n) {
        if (isLeader) n.setAttribute("hidden", "");
        else n.removeAttribute("hidden");
      });
    }

    // 개인 상세 모달의 부계정 공개 범위 라벨 동기화
    var subLabel = document.getElementById(
      "mock-mmgr-detail-sub-visibility-label",
    );
    if (subLabel) {
      subLabel.textContent =
        s.altAccountsVisibility === "clan_members" ? "클랜 전체" : "운영진만";
    }

    // 개인 상세 모달이 열려 있을 때 M점수 입력 게이팅도 재적용
    window.mockMmgrSyncMscoreGate();
  };

  window.mockClanSettingsOnToggleMscore = function (cbx) {
    if (!cbx) return false;
    var role = window.mockClanCurrentRole();
    if (role !== "leader") {
      cbx.checked = !cbx.checked; // rollback
      window.alert("클랜장만 변경할 수 있습니다.");
      return false;
    }
    var next = cbx.checked;
    if (next) {
      if (
        !window.confirm(
          "운영진도 M점수를 즉시 편집할 수 있게 됩니다. 감사 로그에 변경 이력이 기록됩니다.\n계속하시겠습니까?",
        )
      ) {
        cbx.checked = false;
        return false;
      }
    }
    window.mockClanSettingsSet({ allowOfficerEditMscore: !!next });
    return false;
  };

  window.mockClanSettingsOnAltVisibility = function (radio) {
    if (!radio || !radio.checked) return false;
    var role = window.mockClanCurrentRole();
    if (role !== "leader") {
      window.mockClanSettingsSyncUi(); // 원복
      window.alert("클랜장만 변경할 수 있습니다.");
      return false;
    }
    var val = radio.value === "clan_members" ? "clan_members" : "officers";
    if (val === "clan_members") {
      if (
        !window.confirm(
          "모든 구성원이 서로의 부계정을 볼 수 있게 됩니다.\n계속하시겠습니까?",
        )
      ) {
        window.mockClanSettingsSyncUi();
        return false;
      }
    }
    window.mockClanSettingsSet({ altAccountsVisibility: val });
    return false;
  };

  /**
   * M점수 입력 게이팅 (개인 상세 모달이 열려 있을 때만 동작):
   *   leader: 항상 편집 가능
   *   officer: clanSettings.allowOfficerEditMscore === true 일 때만 편집 가능
   *   member: 비허용
   */
  window.mockMmgrSyncMscoreGate = function () {
    var modal = document.getElementById("mock-manage-member-detail-modal");
    if (!modal || modal.hasAttribute("hidden")) return;
    var role = window.mockClanCurrentRole();
    var s = window.mockClanSettingsGet();
    var canEdit =
      role === "leader" || (role === "officer" && !!s.allowOfficerEditMscore);
    var ids = [
      "mock-mmgr-mscore-tank",
      "mock-mmgr-mscore-dps",
      "mock-mmgr-mscore-heal",
    ];
    ids.forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.disabled = !canEdit;
      input.title = canEdit
        ? ""
        : role === "officer"
          ? "M점수 편집이 운영진에게 허용되지 않았습니다. 개요 탭의 '운영 권한 설정'에서 클랜장이 허용할 수 있습니다."
          : "M점수 편집은 운영진 이상만 가능합니다.";
    });
    // 역할 select: leader만 변경 가능
    var roleSelect = document.getElementById("mock-mmgr-detail-clan-role");
    if (roleSelect) {
      roleSelect.disabled = role !== "leader";
      roleSelect.title =
        role !== "leader"
          ? "역할 변경은 클랜장만 수행할 수 있습니다 (D-MANAGE-02)."
          : "";
    }
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
        if (window.mockClanHubDebug && window.mockClanHubDebug()) {
          a.style.opacity = "";
          a.style.pointerEvents = "";
          a.removeAttribute("aria-disabled");
          a.title = "허브 디버그: 구성원 미리보기";
        } else {
          a.style.opacity = "0.45";
          a.style.pointerEvents = "none";
          a.setAttribute("aria-disabled", "true");
          a.title = "운영진 이상만 이용 (목업)";
        }
      } else {
        a.style.opacity = "";
        a.style.pointerEvents = "";
        a.removeAttribute("aria-disabled");
        a.removeAttribute("title");
      }
    });

    // D-MANAGE-01/02/04 · 역할이 바뀌면 운영 권한 설정 카드·개인 상세 모달 게이팅을 재적용
    try {
      window.mockClanSettingsSyncUi();
    } catch (e) {}
  }

  window.clanGo = function (view, anchorEl) {
    if (!CLAN_VIEW_MAP[view]) view = "dash";

    var role = window.mockClanCurrentRole();
    if (role === "member" && OFFICER_VIEWS[view]) {
      if (!window.mockClanHubDebug || !window.mockClanHubDebug()) {
        window.alert("목업: 클랜 관리는 운영진 이상만 이용할 수 있습니다.");
        return false;
      }
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
    var bannerEl = document.getElementById("mock-clan-banner-root");
    if (bannerEl) {
      bannerEl.hidden = !!CLAN_BANNER_HIDE_VIEWS[view];
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

    if (view === "balance" && typeof window.mockBalancePredictLiveStart === "function") {
      window.mockBalancePredictLiveStart();
    } else if (typeof window.mockBalancePredictLiveStop === "function") {
      window.mockBalancePredictLiveStop();
    }

    if (typeof window.mockSidebarNotifyClearView === "function") {
      window.mockSidebarNotifyClearView(view);
    }

    return false;
  };

  function syncFromHash() {
    var h = (location.hash || "").replace(/^#/, "");
    var v = CLAN_VIEW_MAP[h] ? h : "dash";
    if (window.mockClanCurrentRole() === "member" && OFFICER_VIEWS[v]) {
      if (!window.mockClanHubDebug || !window.mockClanHubDebug()) {
        v = "dash";
      }
    }
    var link = document.querySelector('a.clan-nav[href="#' + v + '"]');
    window.clanGo(v, link || document.querySelector("a.clan-nav"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    mockClanSeedNoticeRulesDefaultsIfEmpty();
    /* 일정 모달: 초기에는 반드시 닫힘 (CSS·hidden 동기화) */
    var modal = document.getElementById("mock-event-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    var imgModal = document.getElementById("mock-clan-image-modal");
    if (imgModal) {
      imgModal.setAttribute("hidden", "");
      imgModal.setAttribute("aria-hidden", "true");
    }
    var noticePostModal = document.getElementById("mock-clan-notice-post-modal");
    if (noticePostModal) {
      noticePostModal.setAttribute("hidden", "");
      noticePostModal.setAttribute("aria-hidden", "true");
    }
    if (typeof window.mockClanApplyStoredImages === "function") {
      window.mockClanApplyStoredImages();
    }
    if (typeof window.mockClanManageLoadRules === "function") {
      window.mockClanManageLoadRules();
    }
    if (typeof window.mockClanNoticePostsRender === "function") {
      window.mockClanNoticePostsRender();
    } else {
      mockDashDashboardHydrate();
    }
    if (typeof window.mockManageInitTabState === "function") {
      window.mockManageInitTabState();
    }
    if (typeof window.mockSidebarNotifyRefresh === "function") {
      window.mockSidebarNotifyRefresh();
    }
    try {
      if (
        typeof localStorage !== "undefined" &&
        !localStorage.getItem(MOCK_SUBSCRIBE_STORAGE_KEY)
      ) {
        localStorage.setItem(
          MOCK_SUBSCRIBE_STORAGE_KEY,
          JSON.stringify(mockManageSubscribeDefaultState()),
        );
      }
    } catch (eSeed) {}
    applyRoleBodyClass();
    applyPlanBodyClass();
    if (typeof window.mockManageMembersInit === "function") {
      window.mockManageMembersInit();
    }
    if (typeof window.mockManageRequestsRender === "function") {
      window.mockManageRequestsRender();
    }
    if (typeof window.mockApplyBalanceSessionGate === "function") {
      window.mockApplyBalanceSessionGate();
    }
    var hubDbgBanner = document.getElementById("mock-hub-debug-banner");
    if (hubDbgBanner && window.mockClanHubDebug && window.mockClanHubDebug()) {
      hubDbgBanner.removeAttribute("hidden");
    }
    try {
      if (document.getElementById("mock-balance-map-pick-btn")) {
        mockBalanceSyncMapPickCluster();
        if (typeof mockBalanceSyncMapPoolRow === "function") {
          mockBalanceSyncMapPoolRow();
        }
      }
      var vsBoardInit = document.getElementById("mock-balance-vs-board");
      if (vsBoardInit) {
        mockBalanceSyncMockScoresFromDom();
      }
      if (document.getElementById("mock-balance-weight-tank")) {
        window.mockBalanceApplyRoleWeightsToUI();
      }
      if (vsBoardInit && typeof window.mockBalanceApplySlotOptsToBoard === "function") {
        window.mockBalanceApplySlotOptsToBoard();
      }
      if (vsBoardInit && typeof window.mockBalanceApplyManualScoreModeFromStorage === "function") {
        window.mockBalanceApplyManualScoreModeFromStorage();
      }
      if (
        vsBoardInit &&
        typeof mockBalanceRecomputeTagsForBoard === "function" &&
        window.mockClanCurrentPlan() === "premium"
      ) {
        mockBalanceRecomputeTagsForBoard(vsBoardInit);
      }
      if (typeof window.mockBalancePoolSyncFromVsBoard === "function") {
        window.mockBalancePoolSyncFromVsBoard();
      }
      if (typeof window.mockBalanceSyncLineupFromVsBoard === "function") {
        window.mockBalanceSyncLineupFromVsBoard();
      }
      if (typeof mockBalanceAttachVsBoardInteractions === "function") {
        mockBalanceAttachVsBoardInteractions();
      }
      if (typeof mockBalanceSyncPlacementDoneButton === "function") {
        mockBalanceSyncPlacementDoneButton();
      }
      if (vsBoardInit && typeof mockBalanceApplyRoleScoresToAllFilledSlots === "function") {
        mockBalanceApplyRoleScoresToAllFilledSlots();
        mockBalanceSyncMockScoresFromDom();
      }
      mockBalancePredictApplyTablePagination();
    } catch (eBalance) {}
    /* 구성원이 경기 기록 패널만 열린 상태면 요약으로 되돌림 */
    if (window.mockClanCurrentRole() === "member") {
      var ap = document.getElementById("stats-panel-archive");
      var sb = document.getElementById("statsTabSummary");
      if (ap && sb && !ap.hidden && typeof window.mockStatsSetSection === "function") {
        window.mockStatsSetSection(sb, "summary");
      }
    }
    try {
      if (typeof mockBracketAttachPreviewInteractions === "function") {
        mockBracketAttachPreviewInteractions();
      }
      var seedEl = document.getElementById("mock-bracket-seed");
      if (seedEl && typeof window.mockBracketSeedSync === "function") {
        window.mockBracketSeedSync(seedEl);
      }
      if (typeof window.mockBracketSeedOrderRender === "function") {
        window.mockBracketSeedOrderRender();
      }
      if (typeof window.mockBracketSelectTeamCard === "function") {
        window.mockBracketSelectTeamCard(1);
      }
      var fmtEl = document.getElementById("mock-bracket-format");
      if (fmtEl && typeof window.mockBracketFormatHintSync === "function") {
        window.mockBracketFormatHintSync(fmtEl);
      }
    } catch (eBracketHint) {}
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

  /* D-EVENTS-02: 반복 종료 조건 필드 토글 */
  window.mockEventRepeatChange = function (selectEl) {
    var fields = document.getElementById("mev-repeat-end-fields");
    if (!fields) return;
    var repeat = selectEl && selectEl.value ? selectEl.value : "none";
    if (repeat === "none") {
      fields.setAttribute("hidden", "");
    } else {
      fields.removeAttribute("hidden");
    }
    mockEventRepeatEndValidate();
  };
  window.mockEventRepeatEndChange = function (radio) {
    var countInput = document.getElementById("mev-repeat-end-count");
    var atInput = document.getElementById("mev-repeat-end-at");
    var mode = radio && radio.value;
    if (countInput) countInput.disabled = mode !== "count";
    if (atInput) atInput.disabled = mode !== "until";
    mockEventRepeatEndValidate();
  };
  function mockEventRepeatEndValidate() {
    var warn = document.getElementById("mev-repeat-end-warn");
    if (!warn) return;
    var countInput = document.getElementById("mev-repeat-end-count");
    var mode = document.querySelector('input[name="mev-repeat-end"]:checked');
    var overflow = false;
    if (mode && mode.value === "count" && countInput && countInput.value) {
      var n = parseInt(countInput.value, 10);
      if (!isNaN(n) && (n < 1 || n > 52)) overflow = true;
    }
    if (overflow) warn.removeAttribute("hidden");
    else warn.setAttribute("hidden", "");
  }
  document.addEventListener("input", function (e) {
    if (e.target && (e.target.id === "mev-repeat-end-count" || e.target.id === "mev-repeat-end-at")) {
      mockEventRepeatEndValidate();
    }
  });

  window.mockEventSaveMock = function () {
    var repeat = (document.getElementById("mev-repeat") || {}).value || "none";
    if (repeat !== "none") {
      var mode = document.querySelector('input[name="mev-repeat-end"]:checked');
      if (!mode) {
        window.alert("반복 종료 조건을 선택해 주세요 (D-EVENTS-02).");
        return false;
      }
      if (mode.value === "count") {
        var cn = parseInt((document.getElementById("mev-repeat-end-count") || {}).value, 10);
        if (isNaN(cn) || cn < 1 || cn > 52) {
          window.alert("반복 횟수는 1~52 사이여야 합니다 (D-EVENTS-02 인스턴스 상한 52).");
          return false;
        }
      } else if (mode.value === "until") {
        if (!(document.getElementById("mev-repeat-end-at") || {}).value) {
          window.alert("종료 날짜를 선택해 주세요.");
          return false;
        }
      }
    }
    window.alert("목업: 일정이 등록되었습니다.");
    window.mockEventCloseModal();
    if (typeof window.mockSidebarNotifySet === "function") {
      window.mockSidebarNotifySet("events", true);
    }
    return false;
  };

  /* 이벤트: 캘린더 / 대진표 / 투표 */
  window.mockEventsSetTab = function (btn, name) {
    document.querySelectorAll("[data-events-subtab]").forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("mock-tab-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-events-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-events-panel") === name ? "" : "none";
    });
    if (name === "bracket") {
      if (typeof mockBracketAttachPreviewInteractions === "function") {
        mockBracketAttachPreviewInteractions();
      }
      var seedEl = document.getElementById("mock-bracket-seed");
      if (seedEl && typeof window.mockBracketSeedSync === "function") {
        window.mockBracketSeedSync(seedEl);
      }
      if (typeof window.mockBracketSeedOrderRender === "function") {
        window.mockBracketSeedOrderRender();
      }
    }
  };

  function mockEventPollOptionRowCount() {
    var list = document.getElementById("mep-options-list");
    return list ? list.querySelectorAll("[data-mep-option-row]").length : 0;
  }

  function mockEventPollSyncOptionRemoveButtons() {
    var list = document.getElementById("mep-options-list");
    if (!list) return;
    var rows = list.querySelectorAll("[data-mep-option-row]");
    rows.forEach(function (row) {
      var rm = row.querySelector(".mep-option-remove");
      if (rows.length > 1) {
        if (!rm) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "btn btn-secondary btn-sm mep-option-remove";
          b.textContent = "삭제";
          b.setAttribute("aria-label", "이 선택지 입력란 삭제");
          b.onclick = function () {
            window.mockEventPollRemoveOptionRow(row);
          };
          row.appendChild(b);
        }
      } else if (rm) {
        rm.remove();
      }
    });
  }

  /** 투표 만들기: 선택지 입력란 추가 (목업) */
  window.mockEventPollAddOption = function () {
    var list = document.getElementById("mep-options-list");
    if (!list) return false;
    var n = mockEventPollOptionRowCount() + 1;
    var row = document.createElement("div");
    row.className = "mock-poll-form-option-row";
    row.setAttribute("data-mep-option-row", "");
    var inp = document.createElement("input");
    inp.type = "text";
    inp.className = "mep-option-input";
    inp.placeholder = "선택지 " + n;
    inp.setAttribute("aria-label", "선택지 " + n);
    row.appendChild(inp);
    list.appendChild(row);
    mockEventPollSyncOptionRemoveButtons();
    inp.focus();
    return false;
  };

  window.mockEventPollRemoveOptionRow = function (row) {
    var list = document.getElementById("mep-options-list");
    if (!list || !row) return;
    if (mockEventPollOptionRowCount() <= 1) return;
    row.remove();
    mockEventPollSyncOptionRemoveButtons();
  };

  /** 반복 유형에 맞춰 일시 입력란(날짜+시간 / 시각만 / 요일+시각) 전환 */
  window.mockEventPollNotifyRepeatChange = function () {
    var sel = document.getElementById("mep-notify-repeat");
    var v = sel ? sel.value : "none";
    document.querySelectorAll("#mep-notify-schedule .mep-notify-row").forEach(function (row) {
      var match = row.getAttribute("data-mep-repeat");
      if (match === v) {
        row.removeAttribute("hidden");
      } else {
        row.setAttribute("hidden", "");
      }
    });
    mockEventPollValidateDeadline();
  };

  /* D-EVENTS-04: 반복×마감 하한 일관성 인라인 검증 */
  function mockEventPollValidateDeadline() {
    var warn = document.getElementById("mep-notify-warn");
    if (!warn) return { ok: true };
    var dl = document.getElementById("mep-deadline");
    var repeatSel = document.getElementById("mep-notify-repeat");
    var notifyCb = document.getElementById("mep-notify");
    var notifyOn = !!(notifyCb && notifyCb.checked);
    var raw = dl ? (dl.value || "").trim() : "";
    warn.style.display = "none";
    warn.textContent = "";
    if (!notifyOn || !raw) return { ok: true };
    // "YYYY-MM-DD HH:mm" 또는 "YYYY-MM-DDTHH:mm" 허용
    var norm = raw.replace(" ", "T");
    var deadline = new Date(norm);
    if (isNaN(deadline.getTime())) return { ok: true };
    var now = new Date();
    var diffH = (deadline.getTime() - now.getTime()) / 36e5;
    var repeat = repeatSel ? repeatSel.value : "none";
    var msg = "";
    if (diffH < 1) {
      msg = "마감은 지금보다 최소 1시간 이후여야 합니다.";
    } else if (repeat === "daily" && diffH < 48) {
      msg = "48시간 이내 마감에는 '매일' 반복 알림을 사용할 수 없습니다. '한 번' 또는 '마감 전까지 매일'을 선택하세요.";
    } else if (repeat === "weekly" && diffH < 14 * 24) {
      msg = "14일 이내 마감에는 '매주' 반복 알림을 사용할 수 없습니다.";
    } else if (repeat === "until-deadline" && diffH < 24) {
      msg = "24시간 이내 마감에는 '마감 전까지 매일'을 사용할 수 없습니다. '한 번'을 권장합니다.";
    } else if (diffH > 60 * 24) {
      msg = "마감이 60일 이상 남았습니다. 반복 알림이 과도할 수 있습니다(경고).";
      warn.style.color = "var(--state-warn, #c78a00)";
      warn.style.display = "block";
      warn.textContent = "D-EVENTS-04: " + msg;
      return { ok: true, warning: true };
    }
    if (msg) {
      warn.style.color = "var(--state-danger, #d44)";
      warn.style.display = "block";
      warn.textContent = "D-EVENTS-04: " + msg;
      return { ok: false, message: msg };
    }
    return { ok: true };
  }
  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "mep-deadline") mockEventPollValidateDeadline();
  });

  /** 투표 알림 켜면 일시·반복 필드 표시 */
  window.mockEventPollNotifyToggle = function (cb) {
    var wrap = document.getElementById("mep-notify-fields");
    if (!wrap) return;
    var on = !!(cb && cb.checked);
    wrap.hidden = !on;
    wrap.disabled = !on;
    if (on) {
      window.mockEventPollNotifyRepeatChange();
    }
  };

  window.mockEventPollResetForm = function () {
    var title = document.getElementById("mep-title");
    if (title) title.value = "";
    var dl = document.getElementById("mep-deadline");
    if (dl) dl.value = "";
    var list = document.getElementById("mep-options-list");
    if (list) {
      list.innerHTML =
        '<div class="mock-poll-form-option-row" data-mep-option-row>' +
        '<input type="text" class="mep-option-input" placeholder="선택지를 입력한 뒤 아래 버튼으로 추가" aria-label="선택지 1" />' +
        "</div>";
    }
    mockEventPollSyncOptionRemoveButtons();
    var anon = document.getElementById("mep-anon");
    if (anon) anon.checked = false;
    var multi = document.getElementById("mep-multi");
    if (multi) multi.checked = false;
    var notify = document.getElementById("mep-notify");
    if (notify) {
      notify.checked = false;
      window.mockEventPollNotifyToggle(notify);
    }
    var nat = document.getElementById("mep-notify-at");
    if (nat) nat.value = "";
    var tDaily = document.getElementById("mep-notify-time-daily");
    if (tDaily) tDaily.value = "";
    var tWeekly = document.getElementById("mep-notify-time-weekly");
    if (tWeekly) tWeekly.value = "";
    var tUntil = document.getElementById("mep-notify-time-until");
    if (tUntil) tUntil.value = "";
    var wday = document.getElementById("mep-notify-weekday");
    if (wday) wday.selectedIndex = 0;
    var nrep = document.getElementById("mep-notify-repeat");
    if (nrep) nrep.selectedIndex = 0;
    window.mockEventPollNotifyRepeatChange();
    var ann = document.getElementById("mep-announce");
    if (ann) ann.checked = false;
  };

  window.mockEventPollSubmit = function () {
    var lines = [];
    document.querySelectorAll("#mep-options-list .mep-option-input").forEach(function (inp) {
      var t = (inp.value || "").trim();
      if (t) lines.push(t);
    });
    var titleEl = document.getElementById("mep-title");
    var title = titleEl ? (titleEl.value || "").trim() : "";
    if (!title) {
      alert("목업: 제목을 입력해 주세요.");
      return false;
    }
    if (lines.length < 1) {
      alert("목업: 선택지를 하나 이상 입력해 주세요.");
      return false;
    }
    var v = mockEventPollValidateDeadline();
    if (v && v.ok === false) {
      alert("D-EVENTS-04 위반: " + v.message);
      return false;
    }
    var bits = ["선택지 " + lines.length + "개"];
    var a = document.getElementById("mep-anon");
    if (a && a.checked) bits.push("익명");
    var mu = document.getElementById("mep-multi");
    if (mu && mu.checked) bits.push("다중선택");
    var n = document.getElementById("mep-notify");
    if (n && n.checked) bits.push("알림");
    var an = document.getElementById("mep-announce");
    if (an && an.checked) bits.push("공지");
    alert("목업: 투표가 게시되었습니다.\n(" + bits.join(" · ") + ")");
    window.mockEventPollCloseModal();
    return false;
  };

  window.mockEventPollOpenModal = function () {
    var m = document.getElementById("mock-event-poll-modal");
    if (m) {
      window.mockEventPollResetForm();
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
    }
  };
  window.mockEventPollCloseModal = function () {
    var m = document.getElementById("mock-event-poll-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
  };

  /** 대진표: 참가 팀 수(목업은 최대 4팀 카드) */
  window.mockBracketSetTeamCount = function (sel) {
    var n = parseInt(sel.value, 10) || 4;
    if (n > 4) {
      alert("목업은 최대 4팀 카드만 표시합니다. 8·16팀은 동일 UI 패턴으로 확장됩니다.");
    }
    var cap = Math.min(n, 4);
    for (var i = 1; i <= 4; i++) {
      var el = document.getElementById("mock-bracket-team-wrap-" + i);
      if (el) el.style.display = i <= cap ? "" : "none";
    }
    var act = window.mockBracketActiveTeam;
    if (act != null && act > cap && typeof window.mockBracketSelectTeamCard === "function") {
      window.mockBracketSelectTeamCard(1);
    }
    var o = window.mockBracketSeedOrderState;
    if (!o) o = window.mockBracketSeedOrderState = [0, 1, 2, 3];
    while (o.length < cap) o.push(o.length);
    while (o.length > cap) o.pop();
    if (typeof window.mockBracketSeedOrderRender === "function") {
      window.mockBracketSeedOrderRender();
    }
    if (typeof window.mockBracketLiveSync === "function") {
      window.mockBracketLiveSync();
    }
  };

  function mockBracketEnsureRosterHint(roster) {
    if (!roster || roster.querySelector(".mock-tag")) return;
    if (roster.querySelector(".mock-bracket-roster-hint")) return;
    var hint = document.createElement("span");
    hint.className = "mock-bracket-roster-hint";
    hint.style.fontSize = "11px";
    hint.style.color = "var(--text-muted)";
    hint.textContent = "팀 카드 선택 후 아래 플레이어 풀에서 추가";
    roster.appendChild(hint);
  }

  /**
   * 대진표: 공용 풀 칩 — 선택된 팀 카드( mockBracketActiveTeam ) 로스터에 반영.
   * 같은 팀에서 재클릭 시 제거. 다른 팀에 있으면 이쪽으로 이동(한 사람 1팀).
   */
  window.mockBracketPoolChipClick = function (btn) {
    var name = btn.getAttribute("data-name") || (btn.textContent || "").trim();
    if (!name) return false;
    var teamIdx = window.mockBracketActiveTeam;
    if (teamIdx == null || teamIdx < 1) teamIdx = 1;
    var capEl = document.getElementById("mock-bracket-team-count");
    var cap = Math.min(parseInt(capEl && capEl.value, 10) || 4, 4);
    if (teamIdx > cap) teamIdx = 1;

    var roster = document.getElementById("mock-bracket-roster-" + teamIdx);
    if (!roster) return false;

    var inActive = null;
    roster.querySelectorAll("[data-bracket-pname]").forEach(function (el) {
      if (el.getAttribute("data-bracket-pname") === name) inActive = el;
    });
    if (inActive) {
      inActive.remove();
      mockBracketEnsureRosterHint(roster);
      return false;
    }

    var t;
    for (t = 1; t <= 4; t++) {
      if (t === teamIdx) continue;
      var r = document.getElementById("mock-bracket-roster-" + t);
      if (!r) continue;
      r.querySelectorAll("[data-bracket-pname]").forEach(function (el) {
        if (el.getAttribute("data-bracket-pname") === name) el.remove();
      });
      mockBracketEnsureRosterHint(r);
    }

    var hintEl = roster.querySelector(".mock-bracket-roster-hint");
    if (hintEl) hintEl.remove();
    var tag = document.createElement("span");
    tag.className = "mock-tag";
    tag.setAttribute("data-bracket-pname", name);
    tag.textContent = btn.textContent.trim() || name;
    roster.appendChild(tag);
    return false;
  };

  /** 대진표: 시드 방식 — 힌트 + 미리보기 슬롯 드래그 가능 여부 */
  window.mockBracketSeedSync = function (sel) {
    var hint = document.getElementById("mock-bracket-seed-hint");
    if (!sel) return;
    var v = sel.value;
    if (hint) {
      if (v === "manual") {
        hint.textContent =
          "수동 배치: 아래 대진 미리보기 1라운드 팀 칸에서 드래그하거나, 한 칸을 누른 뒤 다른 칸을 눌러 순위를 맞바꿉니다.";
      } else if (v === "random") {
        hint.textContent =
          "「대진표 생성」 클릭 시 시드 순서를 무작위로 섞습니다. 수동 배치에서는 미리보기 칸으로 대진을 바꿀 수 있습니다(목업).";
      } else if (v === "mmr") {
        hint.textContent =
          "팀별 멤버 MMR 합으로 순위가 정해집니다. 대진표 생성 시 반영됩니다(목업).";
      }
    }
    if (typeof mockBracketPreviewApplyInteractState === "function") {
      mockBracketPreviewApplyInteractState();
    }
  };

  function mockBracketPreviewClearSelection() {
    window.mockBracketPreviewSelectedOIdx = null;
    document.querySelectorAll(".mock-bracket-seed-slot-selected").forEach(function (el) {
      el.classList.remove("mock-bracket-seed-slot-selected");
    });
  }

  /** 시드 배열 o에서 순위 두 칸 맞바꿈 (미리보기 슬롯 연동) */
  window.mockBracketSeedSwapOIndices = function (ia, ib) {
    var o = window.mockBracketSeedOrderState;
    if (!o || ia === ib || ia < 0 || ib < 0 || ia >= o.length || ib >= o.length) return;
    var t = o[ia];
    o[ia] = o[ib];
    o[ib] = t;
    if (typeof window.mockBracketSeedOrderRender === "function") {
      window.mockBracketSeedOrderRender();
    }
  };

  function mockBracketPreviewApplyInteractState() {
    var sel = document.getElementById("mock-bracket-seed");
    var manual = sel && sel.value === "manual";
    var board = document.querySelector(".mock-bracket-board");
    if (board) board.setAttribute("data-seed-manual", manual ? "1" : "0");
    document.querySelectorAll(".mock-bracket-teamline--seed-slot").forEach(function (line) {
      line.draggable = manual;
    });
  }

  function mockBracketUpdateSeedSlotIndices(cap) {
    var sfa = document.getElementById("mock-bracket-seed-slot-qfa");
    var sfb = document.getElementById("mock-bracket-seed-slot-qfb");
    var sfc = document.getElementById("mock-bracket-seed-slot-qfc");
    var sfd = document.getElementById("mock-bracket-seed-slot-qfd");
    if (cap === 2) {
      if (sfa) sfa.setAttribute("data-seed-o-idx", "0");
      if (sfb) sfb.setAttribute("data-seed-o-idx", "1");
    } else {
      if (sfa) sfa.setAttribute("data-seed-o-idx", "0");
      if (sfb) sfb.setAttribute("data-seed-o-idx", "3");
      if (sfc) sfc.setAttribute("data-seed-o-idx", "1");
      if (sfd) sfd.setAttribute("data-seed-o-idx", "2");
    }
  }

  function mockBracketAttachPreviewInteractions() {
    var board = document.querySelector(".mock-bracket-board");
    if (!board || board.getAttribute("data-preview-interact-init") === "1") return;
    board.setAttribute("data-preview-interact-init", "1");

    board.addEventListener("click", function (e) {
      var line = e.target.closest(".mock-bracket-teamline--seed-slot");
      if (!line) return;
      var sEl = document.getElementById("mock-bracket-seed");
      if (!sEl || sEl.value !== "manual") return;
      var oi = parseInt(line.getAttribute("data-seed-o-idx"), 10);
      if (isNaN(oi)) return;
      var o = window.mockBracketSeedOrderState;
      if (!o || oi < 0 || oi >= o.length) return;

      var prev = window.mockBracketPreviewSelectedOIdx;
      if (prev === null || prev === undefined) {
        window.mockBracketPreviewSelectedOIdx = oi;
        line.classList.add("mock-bracket-seed-slot-selected");
        return;
      }
      if (prev === oi) {
        mockBracketPreviewClearSelection();
        return;
      }
      mockBracketPreviewClearSelection();
      window.mockBracketSeedSwapOIndices(prev, oi);
    });

    board.addEventListener("dragstart", function (e) {
      var line = e.target.closest(".mock-bracket-teamline--seed-slot");
      if (!line) return;
      var sEl = document.getElementById("mock-bracket-seed");
      if (!sEl || sEl.value !== "manual" || !line.draggable) {
        e.preventDefault();
        return;
      }
      var oi = parseInt(line.getAttribute("data-seed-o-idx"), 10);
      line.classList.add("mock-bracket-seed-slot-dragging");
      try {
        e.dataTransfer.setData("text/plain", String(oi));
        e.dataTransfer.effectAllowed = "move";
      } catch (err) {}
    });

    board.addEventListener("dragend", function (e) {
      var line = e.target.closest(".mock-bracket-teamline--seed-slot");
      if (line) line.classList.remove("mock-bracket-seed-slot-dragging");
    });

    board.addEventListener("dragover", function (e) {
      var sEl = document.getElementById("mock-bracket-seed");
      if (sEl && sEl.value === "manual") e.preventDefault();
    });

    board.addEventListener("drop", function (e) {
      e.preventDefault();
      var line = e.target.closest(".mock-bracket-teamline--seed-slot");
      if (!line) return;
      var from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      var to = parseInt(line.getAttribute("data-seed-o-idx"), 10);
      if (isNaN(from) || isNaN(to)) return;
      mockBracketPreviewClearSelection();
      window.mockBracketSeedSwapOIndices(from, to);
    });
  }

  window.mockBracketSeedOrderState = [0, 1, 2, 3];

  var MOCK_BRACKET_DEFAULT_TEAM_NAMES = ["파란 팀", "빨간 팀", "초록 팀", "노랑 팀"];

  function mockBracketGetTeamName(teamIdx0) {
    var inp = document.getElementById("mock-bracket-name-" + (teamIdx0 + 1));
    if (inp && inp.value && inp.value.trim()) return inp.value.trim();
    var fallback = MOCK_BRACKET_DEFAULT_TEAM_NAMES[teamIdx0];
    return fallback != null ? fallback : "팀 " + (teamIdx0 + 1);
  }

  window.mockBracketGetTeamName = mockBracketGetTeamName;

  /** 플레이어 풀 상단: 현재 멤버가 들어갈 팀 이름 표시 */
  window.mockBracketPoolTargetLabelSync = function () {
    var t = window.mockBracketActiveTeam || 1;
    var line = document.getElementById("mock-bracket-pool-target-name");
    if (!line) return;
    line.textContent = mockBracketGetTeamName(t - 1);
  };

  /** 팀 카드 클릭 — 이후 풀 칩이 이 팀 로스터로 감 */
  window.mockBracketSelectTeamCard = function (teamIdx) {
    var capEl = document.getElementById("mock-bracket-team-count");
    var cap = Math.min(parseInt(capEl && capEl.value, 10) || 4, 4);
    if (teamIdx < 1 || teamIdx > cap) return false;
    window.mockBracketActiveTeam = teamIdx;
    var i;
    for (i = 1; i <= 4; i++) {
      var w = document.getElementById("mock-bracket-team-wrap-" + i);
      if (!w) continue;
      var on = i === teamIdx;
      w.classList.toggle("mock-bracket-team-card-selected", on);
      w.setAttribute("aria-pressed", on ? "true" : "false");
      w.setAttribute("aria-label", on ? "팀 " + i + " 선택됨, 멤버 추가 대상" : "팀 " + i + " 선택");
    }
    window.mockBracketPoolTargetLabelSync();
    return false;
  };

  /** 마법사: 다음 단계 패널 표시 */
  window.mockBracketWizardGo = function (stepNum) {
    var el = document.getElementById("mock-bracket-wizard-step-" + stepNum);
    if (el) {
      el.hidden = false;
      el.setAttribute("aria-hidden", "false");
    }
    if (stepNum === 3 && typeof window.mockBracketSeedOrderRender === "function") {
      window.mockBracketSeedOrderRender();
    }
    if (stepNum === 4 && typeof window.mockBracketLiveSync === "function") {
      window.mockBracketLiveSync();
    }
    return false;
  };

  /** 경기 결과: 이전 경기 확정 후 다음 블록 표시·결승 옵션 구성 */
  window.mockBracketLiveSync = function () {
    function fillWinSelect(sel, a, b) {
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = "";
      var z = document.createElement("option");
      z.value = "";
      z.textContent = "— 선택 —";
      sel.appendChild(z);
      var x = document.createElement("option");
      x.value = a;
      x.textContent = a;
      sel.appendChild(x);
      var y = document.createElement("option");
      y.value = b;
      y.textContent = b;
      sel.appendChild(y);
      if (cur === a || cur === b) sel.value = cur;
    }

    var capEl = document.getElementById("mock-bracket-team-count");
    var cap = Math.min(parseInt(capEl && capEl.value, 10) || 4, 4);
    var o = window.mockBracketSeedOrderState;
    if (!o || !o.length) o = window.mockBracketSeedOrderState = [0, 1, 2, 3];

    var w1 = document.getElementById("mock-bracket-live-wrap-1");
    var w2 = document.getElementById("mock-bracket-live-wrap-2");
    var wf = document.getElementById("mock-bracket-live-wrap-final");
    var m1 = document.getElementById("mock-bracket-win-m1");
    var m2 = document.getElementById("mock-bracket-win-m2");
    var finalSel = document.getElementById("mock-bracket-win-final");
    var t1 = w1 ? w1.querySelector(".mock-bracket-live-match-title") : null;
    var t2 = w2 ? w2.querySelector(".mock-bracket-live-match-title") : null;

    if (cap === 2) {
      if (w2) w2.hidden = true;
      if (wf) wf.hidden = true;
      if (m2) m2.value = "";
      var n0 = mockBracketGetTeamName(o[0]);
      var n1 = mockBracketGetTeamName(o[1]);
      if (t1) t1.textContent = "결승 · " + n0 + " vs " + n1;
      fillWinSelect(m1, n0, n1);
      if (finalSel) {
        finalSel.innerHTML = '<option value="">— 선택 —</option>';
        finalSel.disabled = true;
      }
      return;
    }

    if (cap >= 4 && o.length >= 4) {
      var p03 = mockBracketGetTeamName(o[0]);
      var p12 = mockBracketGetTeamName(o[1]);
      var p21 = mockBracketGetTeamName(o[2]);
      var p30 = mockBracketGetTeamName(o[3]);
      if (t1) t1.textContent = "준결승 1 · " + p03 + " vs " + p30;
      if (t2) t2.textContent = "준결승 2 · " + p12 + " vs " + p21;
      fillWinSelect(m1, p03, p30);
      fillWinSelect(m2, p12, p21);
    }

    var v1 = m1 && m1.value;
    var v2 = m2 && m2.value;

    if (w2) w2.hidden = !v1;
    if (wf) wf.hidden = !v1 || !v2;

    if (!v1 && m2) m2.value = "";
    if (!v1 && finalSel) finalSel.value = "";
    if (v1 && !v2 && finalSel) finalSel.value = "";

    if (finalSel) {
      if (v1 && v2) {
        finalSel.disabled = false;
        finalSel.removeAttribute("title");
        finalSel.innerHTML = "";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "— 선택 —";
        finalSel.appendChild(opt0);
        var opt1 = document.createElement("option");
        opt1.value = v1;
        opt1.textContent = v1;
        finalSel.appendChild(opt1);
        var opt2 = document.createElement("option");
        opt2.value = v2;
        opt2.textContent = v2;
        finalSel.appendChild(opt2);
      } else {
        finalSel.disabled = true;
        finalSel.setAttribute("title", "준결승 결과 입력 후(목업)");
        finalSel.innerHTML = '<option value="">— 준결승 후 선택 —</option>';
      }
    }
  };

  /** 대진 미리보기·2단계 팀명 연동 (시드 순서는 o 배열) */
  window.mockBracketSeedOrderRender = function () {
    mockBracketPreviewClearSelection();

    var capEl = document.getElementById("mock-bracket-team-count");
    var cap = Math.min(parseInt(capEl && capEl.value, 10) || 4, 4);
    if (cap < 2) cap = 2;
    var o = window.mockBracketSeedOrderState;
    if (!o || !o.length) o = window.mockBracketSeedOrderState = [0, 1, 2, 3];
    while (o.length < cap) o.push(o.length);
    while (o.length > cap) o.pop();

    mockBracketUpdateSeedSlotIndices(cap);

    var m2 = document.getElementById("mock-bracket-prev-m2-wrap");
    var modeLab = document.getElementById("mock-bracket-prev-mode-label");
    var qa = document.getElementById("mock-bracket-prev-qf-a");
    var qb = document.getElementById("mock-bracket-prev-qf-b");
    var qc = document.getElementById("mock-bracket-prev-qf-c");
    var qd = document.getElementById("mock-bracket-prev-qf-d");

    var board = document.querySelector(".mock-bracket-board");
    if (board) board.classList.toggle("mock-bracket-board--twoteam", cap === 2);

    if (cap === 2) {
      if (m2) m2.style.display = "none";
      if (modeLab) modeLab.textContent = "(2팀 · 단판)";
      if (qa) qa.textContent = mockBracketGetTeamName(o[0]);
      if (qb) qb.textContent = mockBracketGetTeamName(o[1]);
    } else {
      if (m2) m2.style.display = "";
      if (modeLab) modeLab.textContent = "(4강)";
      if (qa) qa.textContent = mockBracketGetTeamName(o[0]);
      if (qb) qb.textContent = mockBracketGetTeamName(o[3]);
      if (qc) qc.textContent = mockBracketGetTeamName(o[1]);
      if (qd) qd.textContent = mockBracketGetTeamName(o[2]);
    }

    mockBracketPreviewApplyInteractState();
    if (typeof window.mockBracketPoolTargetLabelSync === "function") {
      window.mockBracketPoolTargetLabelSync();
    }
    var s4 = document.getElementById("mock-bracket-wizard-step-4");
    if (s4 && !s4.hidden && typeof window.mockBracketLiveSync === "function") {
      window.mockBracketLiveSync();
    }
  };

  window.mockBracketGenerateClick = function () {
    var sel = document.getElementById("mock-bracket-seed");
    if (sel && sel.value === "random") {
      var o = window.mockBracketSeedOrderState;
      var cap = o.length;
      var i;
      for (i = cap - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = o[i];
        o[i] = o[j];
        o[j] = tmp;
      }
      window.mockBracketSeedOrderRender();
    }
    alert("목업: 대진표가 생성되었습니다. 아래 미리보기·경기 결과 입력이 활성화됩니다.");
    if (typeof window.mockBracketWizardGo === "function") {
      window.mockBracketWizardGo(4);
    }
  };

  /** 대진표: 1단계 대회 형식 — 미리보기 하단 문구와 연동 */
  window.mockBracketFormatHintSync = function (sel) {
    var foot = document.getElementById("mock-bracket-format-footnote");
    if (!foot || !sel) return;
    var v = sel.value;
    if (v === "single") {
      foot.textContent = "싱글 엘리: 패자 탈락. 더블·리그는 형식에 따라 동일 영역에 확장(목업).";
    } else if (v === "double") {
      foot.textContent = "더블 엘리: 패자조·승자조가 같은 영역에 확장됩니다(목업).";
    } else if (v === "rr") {
      foot.textContent = "라운드 로빈: 순위표·대진이 리그 형식으로 표시됩니다(목업).";
    }
  };

  /* 스토어: 클랜 / 개인 · 잔액 풀 강조 · 개인 탭 게임 필터 */
  window.mockStoreSetGameFilter = function (btn, key) {
    var row = document.getElementById("mock-store-game-filter");
    if (key == null && btn && btn.getAttribute) {
      key = btn.getAttribute("data-store-game-chip") || "all";
    }
    key = key || "all";
    if (row) {
      row.querySelectorAll("[data-store-game-chip]").forEach(function (chipEl) {
        var on = chipEl.getAttribute("data-store-game-chip") === key;
        chipEl.classList.toggle("mock-profile-game-chip--active", on);
        chipEl.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    document.querySelectorAll("[data-store-panel='personal'] [data-store-item-game]").forEach(function (card) {
      var g = card.getAttribute("data-store-item-game");
      var show = key === "all" || key === g || g === "all";
      card.style.display = show ? "" : "none";
    });
  };

  window.mockStorePurchaseMock = function (btn) {
    var card = btn && btn.closest ? btn.closest(".mock-store-card") : null;
    var title = "";
    if (card) {
      title = card.getAttribute("data-store-title") || "";
      if (!title) {
        var strong = card.querySelector("strong");
        title = strong ? strong.textContent.trim() : "";
      }
    }
    // D-STORE-03: 구매 후 환불은 지원되지 않음을 사전 고지(목업)
    var ok = window.confirm(
      "[" + (title || "항목") + "]\n\n" +
      "구매 후 환불은 지원되지 않습니다(D-STORE-03).\n" +
      "· 시스템 오류는 자동 롤백됩니다.\n" +
      "· 그 외 정정은 운영자 재량입니다(계정 탈취·아이템 결함 등).\n\n" +
      "계속하시겠습니까?"
    );
    if (!ok) return;
    var toast = document.getElementById("mock-store-toast");
    if (toast) {
      toast.textContent = "구매 완료(목업): " + (title || "항목");
      toast.hidden = false;
      toast.classList.add("mock-store-toast--show");
      if (window._mockStoreToastTimer) clearTimeout(window._mockStoreToastTimer);
      window._mockStoreToastTimer = setTimeout(function () {
        toast.classList.remove("mock-store-toast--show");
        toast.hidden = true;
      }, 2600);
    }
  };

  // D-STORE-02: Free 플랜 클랜의 Premium 카드 클릭 시 안내.
  // 역할별 카피는 body.mock-role-* 클래스 기준으로 분기(목업 역할 전환 시뮬).
  window.mockStorePremiumInfoMock = function (btn) {
    var card = btn && btn.closest ? btn.closest(".mock-store-card") : null;
    var title = "";
    if (card) {
      title = card.getAttribute("data-store-title") || "";
      if (!title) {
        var strong = card.querySelector("strong");
        title = strong ? strong.textContent.trim() : "";
      }
    }
    var body = document.body;
    var isLeader = body && body.classList.contains("mock-role-leader");
    var isOfficer = body && body.classList.contains("mock-role-officer");
    var lines = [
      "[" + (title || "Premium 전용 항목") + "]",
      "",
      "이 항목은 클랜이 Premium 플랜일 때 이용할 수 있습니다.",
      "",
      "[플랜 비교 요약]",
      "· 자동 팀 밸런스 / A 점수 / 맵 밴 / 디스코드 알림",
      "· 대진표 / 승부예측 / 클랜 태그 글로우",
      ""
    ];
    if (isLeader) {
      lines.push("클랜장님 — 구독·결제 탭에서 Premium으로 업그레이드할 수 있습니다.");
    } else if (isOfficer) {
      lines.push("운영진 — 구독·결제 탭에서 플랜 내용을 열람할 수 있습니다. 플랜 변경은 클랜장만 가능합니다.");
    } else {
      lines.push("Premium 전용 항목입니다. 클랜장에게 문의하세요.");
    }
    lines.push("", "(D-STORE-02 목업)");
    alert(lines.join("\n"));
  };

  window.mockStoreSetTab = function (btn, name) {
    document.querySelectorAll("[data-store-tab]").forEach(function (b) {
      b.classList.toggle("mock-tab-active", b === btn);
    });
    document.querySelectorAll("[data-store-panel]").forEach(function (p) {
      p.style.display = p.getAttribute("data-store-panel") === name ? "" : "none";
    });
    var bal = document.querySelector("[data-store-balance-row]");
    if (bal) {
      bal.setAttribute("data-active-pool", name === "clan" ? "clan" : "personal");
    }
    if (name === "personal") {
      var activeChip = document.querySelector("#mock-store-game-filter [data-store-game-chip].mock-profile-game-chip--active");
      var k = activeChip ? activeChip.getAttribute("data-store-game-chip") || "all" : "all";
      window.mockStoreSetGameFilter(null, k);
    }
  };

  /* 밸런스: 구 경기 탭 목업(제거됨) — 호출 잔존 시 무해 */
  window.mockBalanceSetMatch = function () {
    return false;
  };

  /** 편집 VS 보드(목업) 슬롯 — 역할별 가중 자동점수 합산용 */
  var MOCK_BALANCE_SCORE_SLOTS = {
    blue: [
      { s: 0, r: "dps" },
      { s: 0, r: "dps" },
      { s: 0, r: "tank" },
      { s: 0, r: "heal" },
      { s: 0, r: "heal" },
    ],
    red: [
      { s: 0, r: "dps" },
      { s: 0, r: "dps" },
      { s: 0, r: "tank" },
      { s: 0, r: "heal" },
      { s: 0, r: "heal" },
    ],
  };

  /** 풀 칩 data-name → 목업 전적·역할별 M점수·태그 (행: 딜·딜·탱·힐·힐) */
  var MOCK_BALANCE_PLAYER_PRESETS = {
    하지: {
      w: 2,
      t: 1,
      l: 0,
      scores: { dps: "2.5", tank: "1.0", heal: "0.6" },
      tags: [{ cls: "neutral", text: "딜 라인" }],
    },
    crystal: {
      w: 1,
      t: 0,
      l: 2,
      scores: { dps: "0.5", tank: "-0.4", heal: "0.1" },
      tags: [{ cls: "blue-streak", text: "3연승" }],
    },
    dorae: { w: 0, t: 0, l: 0, scores: { dps: "-0.5", tank: "0.8", heal: "-0.2" }, tags: [] },
    edward: {
      w: 3,
      t: 1,
      l: 0,
      scores: { dps: "3.0", tank: "1.5", heal: "2.2" },
      tags: [{ cls: "blue-streak", text: "3연승" }],
    },
    abel: {
      w: 0,
      t: 0,
      l: 3,
      scores: { dps: "-2.0", tank: "0.3", heal: "-1.0" },
      tags: [
        { cls: "bad", text: "3연패" },
        { cls: "bad", text: "슬럼프" },
      ],
    },
    cafemocha: {
      w: 1,
      t: 0,
      l: 3,
      scores: { dps: "2.5", tank: "1.8", heal: "0.4" },
      tags: [
        { cls: "bad", text: "3연패" },
        { cls: "bad", text: "슬럼프" },
      ],
    },
    nyang: {
      w: 4,
      t: 0,
      l: 0,
      scores: { dps: "1.2", tank: "0.5", heal: "0.9" },
      tags: [{ cls: "good", text: "4연승" }],
    },
    sura: {
      w: 3,
      t: 1,
      l: 0,
      scores: { dps: "1.8", tank: "2.2", heal: "1.0" },
      tags: [{ cls: "bad", text: "슬럼프" }],
    },
    sori: { w: 2, t: 2, l: 0, scores: { dps: "4.0", tank: "2.5", heal: "3.5" }, tags: [] },
    ddung: { w: 1, t: 0, l: 0, scores: { dps: "0.4", tank: "0.6", heal: "0.5" }, tags: [] },
    ajae: { w: 0, t: 0, l: 0, scores: { dps: "0", tank: "0", heal: "0" }, tags: [] },
    kri: { w: 0, t: 0, l: 0, scores: { dps: "0", tank: "0", heal: "0" }, tags: [] },
    emilia: { w: 0, t: 0, l: 0, scores: { dps: "0", tank: "0", heal: "0" }, tags: [] },
    roniel: { w: 0, t: 0, l: 0, scores: { dps: "0", tank: "0", heal: "0" }, tags: [] },
  };

  var MOCK_BALANCE_SLOT_FILL_ORDER = ["b0", "b1", "b2", "b3", "b4", "r0", "r1", "r2", "r3", "r4"];

  function mockBalanceAllSlotsFilled() {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) {
      return false;
    }
    var i;
    for (i = 0; i < MOCK_BALANCE_SLOT_FILL_ORDER.length; i++) {
      var sid = MOCK_BALANCE_SLOT_FILL_ORDER[i];
      var plate = board.querySelector('[data-slot-id="' + sid + '"]');
      if (!plate || plate.getAttribute("data-empty") === "true") {
        return false;
      }
    }
    return true;
  }

  function mockBalanceSyncPlacementDoneButton() {
    var btn = document.getElementById("mock-balance-btn-placement-done");
    if (!btn) {
      return;
    }
    var ok = mockBalanceAllSlotsFilled();
    btn.disabled = !ok;
    btn.setAttribute("aria-disabled", ok ? "false" : "true");
    btn.title = ok ? "" : "10명 슬롯이 모두 찼을 때만 배치를 완료할 수 있습니다.";
  }

  /** 행 인덱스 0~4 → VS 고정 포지션 (탱1·딜2·힐2) */
  var MOCK_BALANCE_ROW_ROLES = ["dps", "dps", "tank", "heal", "heal"];

  function mockBalanceRoleForRowIndex(rowIdx) {
    return MOCK_BALANCE_ROW_ROLES[rowIdx] || "dps";
  }

  function mockBalanceRowIndexFromSlotId(slotId) {
    if (!slotId || slotId.length < 2) return 0;
    var n = parseInt(slotId.slice(1), 10);
    return isNaN(n) ? 0 : n;
  }

  function mockBalanceScoreFromPreset(pr, role) {
    if (!pr) return "0";
    if (pr.scores && pr.scores[role] != null && String(pr.scores[role]).length) {
      return String(pr.scores[role]);
    }
    if (pr.score != null) return String(pr.score);
    return "0";
  }

  /** 슬롯 행(딜/탱/힐)에 맞는 프리셋 M점수를 표시 영역에 반영 */
  function mockBalanceApplyRoleScoreToPlate(plate) {
    if (!plate || plate.getAttribute("data-empty") === "true") return;
    var slug = plate.getAttribute("data-pool-slug");
    if (!slug) return;
    var sid = plate.getAttribute("data-slot-id") || "";
    var rowIdx = mockBalanceRowIndexFromSlotId(sid);
    var role = mockBalanceRoleForRowIndex(rowIdx);
    var pr = MOCK_BALANCE_PLAYER_PRESETS[slug];
    var sc = mockBalanceScoreFromPreset(pr, role);
    var scoreEl = plate.querySelector(".mock-balance-manual-score");
    var nickEl = plate.querySelector(".mock-balance-slot-nick");
    if (scoreEl) {
      scoreEl.textContent = sc;
      var nm = nickEl ? (nickEl.textContent || "").trim() : "";
      scoreEl.setAttribute("aria-label", (nm || "플레이어") + " M 점수");
    }
  }

  function mockBalanceApplyRoleScoresToAllFilledSlots() {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    board.querySelectorAll(".mock-balance-nameplate--rich[data-slot-id]").forEach(function (p) {
      mockBalanceApplyRoleScoreToPlate(p);
    });
  }

  function mockBalanceTagClassFromPresetCls(cls) {
    if (cls === "blue-streak") return "mock-balance-tag mock-balance-tag--blue-streak";
    return "mock-balance-tag mock-balance-tag--" + (cls || "neutral");
  }

  function mockBalancePresetTagsHtml(tags) {
    if (!tags || !tags.length) return "";
    return tags
      .map(function (x) {
        return '<span class="' + mockBalanceTagClassFromPresetCls(x.cls) + '">' + x.text + "</span>";
      })
      .join("");
  }

  /** VS 보드에 표시된 M 점수로 MOCK_BALANCE_SCORE_SLOTS 갱신 (참고 패널 합계용) */
  function mockBalanceSyncMockScoresFromDom() {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    var roles = ["dps", "dps", "tank", "heal", "heal"];
    var ti;
    for (ti = 0; ti < 5; ti++) {
      var pb = board.querySelector('[data-slot-id="b' + ti + '"] .mock-balance-manual-score');
      var pr = board.querySelector('[data-slot-id="r' + ti + '"] .mock-balance-manual-score');
      var sb = pb ? parseFloat(String(pb.textContent).trim()) : 0;
      var sr = pr ? parseFloat(String(pr.textContent).trim()) : 0;
      if (isNaN(sb)) sb = 0;
      if (isNaN(sr)) sr = 0;
      MOCK_BALANCE_SCORE_SLOTS.blue[ti] = { s: sb, r: roles[ti] };
      MOCK_BALANCE_SCORE_SLOTS.red[ti] = { s: sr, r: roles[ti] };
    }
  }

  function mockBalanceReadSlotPayload(plate) {
    var empty = plate.getAttribute("data-empty") === "true";
    var nickEl = plate.querySelector(".mock-balance-slot-nick");
    var nums = plate.querySelectorAll(".mock-balance-slot-wlt .mock-balance-wlt-n");
    var scoreEl = plate.querySelector(".mock-balance-manual-score");
    var tags = plate.querySelector(".mock-balance-slot-tags-rail");
    var display = nickEl ? (nickEl.textContent || "").trim() : "";
    return {
      empty: empty,
      slug: plate.getAttribute("data-pool-slug") || "",
      display: display,
      w: empty || nums.length < 3 ? 0 : parseInt(nums[0].textContent, 10) || 0,
      t: empty || nums.length < 3 ? 0 : parseInt(nums[1].textContent, 10) || 0,
      l: empty || nums.length < 3 ? 0 : parseInt(nums[2].textContent, 10) || 0,
      score: scoreEl ? String(scoreEl.textContent).trim() : "0",
      tagsHtml: tags ? tags.innerHTML : "",
    };
  }

  function mockBalanceClearSlotPlate(plate) {
    var nickEl = plate.querySelector(".mock-balance-slot-nick");
    var nums = plate.querySelectorAll(".mock-balance-slot-wlt .mock-balance-wlt-n");
    var scoreEl = plate.querySelector(".mock-balance-manual-score");
    var tags = plate.querySelector(".mock-balance-slot-tags-rail");
    if (nickEl) {
      nickEl.textContent = "—";
      nickEl.classList.add("mock-balance-slot-nick--placeholder");
    }
    if (nums.length >= 3) {
      nums[0].textContent = "0";
      nums[1].textContent = "0";
      nums[2].textContent = "0";
    }
    if (scoreEl) {
      scoreEl.textContent = "0";
      scoreEl.setAttribute("aria-label", "빈 슬롯 M 점수");
    }
    if (tags) tags.innerHTML = "";
    plate.setAttribute("data-empty", "true");
    plate.setAttribute("data-pool-slug", "");
    plate.setAttribute("draggable", "false");
    plate.classList.add("mock-balance-slot--empty");
  }

  function mockBalanceWriteSlotPayload(plate, p) {
    if (!p || p.empty || !p.display || p.display === "—") {
      mockBalanceClearSlotPlate(plate);
      return;
    }
    var nickEl = plate.querySelector(".mock-balance-slot-nick");
    var nums = plate.querySelectorAll(".mock-balance-slot-wlt .mock-balance-wlt-n");
    var scoreEl = plate.querySelector(".mock-balance-manual-score");
    var tags = plate.querySelector(".mock-balance-slot-tags-rail");
    plate.setAttribute("data-empty", "false");
    plate.setAttribute("data-pool-slug", p.slug || "");
    plate.setAttribute("draggable", "true");
    plate.classList.remove("mock-balance-slot--empty");
    if (nickEl) {
      nickEl.textContent = p.display;
      nickEl.classList.remove("mock-balance-slot-nick--placeholder");
    }
    if (nums.length >= 3) {
      nums[0].textContent = String(p.w);
      nums[1].textContent = String(p.t);
      nums[2].textContent = String(p.l);
    }
    if (scoreEl) {
      scoreEl.textContent = String(p.score);
      scoreEl.setAttribute("aria-label", p.display + " M 점수");
    }
    if (tags) tags.innerHTML = p.tagsHtml || "";
  }

  function mockBalanceFillSlotFromPreset(plate, slug, displayName) {
    var pr = MOCK_BALANCE_PLAYER_PRESETS[slug] || {
      w: 0,
      t: 0,
      l: 0,
      scores: { dps: "0", tank: "0", heal: "0" },
      tags: [],
    };
    mockBalanceWriteSlotPayload(plate, {
      empty: false,
      slug: slug,
      display: displayName,
      w: pr.w,
      t: pr.t,
      l: pr.l,
      score: "0",
      tagsHtml: mockBalancePresetTagsHtml(pr.tags),
    });
    mockBalanceApplyRoleScoreToPlate(plate);
  }

  function mockBalanceRefreshAfterSlotChange() {
    mockBalanceApplyRoleScoresToAllFilledSlots();
    mockBalanceSyncMockScoresFromDom();
    if (typeof window.mockBalanceApplyRoleWeightsToUI === "function") {
      window.mockBalanceApplyRoleWeightsToUI();
    }
    if (typeof window.mockBalancePoolSyncFromVsBoard === "function") {
      window.mockBalancePoolSyncFromVsBoard();
    }
    if (typeof window.mockBalanceSyncLineupFromVsBoard === "function") {
      window.mockBalanceSyncLineupFromVsBoard();
    }
    var board = document.getElementById("mock-balance-vs-board");
    if (
      board &&
      typeof mockBalanceRecomputeTagsForBoard === "function" &&
      window.mockClanCurrentPlan() === "premium"
    ) {
      mockBalanceRecomputeTagsForBoard(board);
    }
    mockBalanceSyncPlacementDoneButton();
  }

  var _mockBalanceDragSlotId = null;
  /** 드롭 직후 브라우저가 보내는 click으로 슬롯이 비워지지 않도록 1회 무시 */
  var _mockBalanceSuppressNextBoardClick = false;

  function mockBalanceVsBoardClick(e) {
    if (_mockBalanceSuppressNextBoardClick) {
      _mockBalanceSuppressNextBoardClick = false;
      return;
    }
    if (e.target.closest(".mock-balance-manual-score") || e.target.closest(".mock-balance-slot-manual-cell")) {
      return;
    }
    var plate = e.target.closest(".mock-balance-nameplate--rich");
    if (!plate || plate.getAttribute("data-empty") === "true") return;
    mockBalanceClearSlotPlate(plate);
    mockBalanceRefreshAfterSlotChange();
  }

  function mockBalanceSlotDragStart(e) {
    var plate = e.target.closest(".mock-balance-nameplate--rich");
    if (!plate || plate.getAttribute("data-empty") === "true") {
      e.preventDefault();
      return;
    }
    _mockBalanceDragSlotId = plate.getAttribute("data-slot-id") || "";
    plate.classList.add("mock-balance-slot--dragging");
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", _mockBalanceDragSlotId);
    } catch (eDt) {}
  }

  function mockBalanceSlotDragEnd(e) {
    var plate = e.target.closest(".mock-balance-nameplate--rich");
    if (plate) plate.classList.remove("mock-balance-slot--dragging");
    document.querySelectorAll("#mock-balance-vs-board .mock-balance-slot--dragging").forEach(function (p) {
      p.classList.remove("mock-balance-slot--dragging");
    });
    _mockBalanceDragSlotId = null;
  }

  function mockBalanceSlotDragOver(e) {
    var plate = e.target.closest(".mock-balance-nameplate--rich");
    if (!plate) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch (eDe) {}
  }

  function mockBalanceSlotDrop(e) {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    e.preventDefault();
    var targetPlate = e.target.closest(".mock-balance-nameplate--rich");
    if (!targetPlate) return;
    var fromId = "";
    try {
      fromId = e.dataTransfer.getData("text/plain") || _mockBalanceDragSlotId || "";
    } catch (eG) {
      fromId = _mockBalanceDragSlotId || "";
    }
    if (!fromId) return;
    var sourcePlate = board.querySelector('[data-slot-id="' + fromId + '"]');
    if (!sourcePlate || sourcePlate === targetPlate) return;
    var pa = mockBalanceReadSlotPayload(sourcePlate);
    var pb = mockBalanceReadSlotPayload(targetPlate);
    if (pa.empty) return;
    if (pb.empty) {
      mockBalanceWriteSlotPayload(targetPlate, pa);
      mockBalanceClearSlotPlate(sourcePlate);
    } else {
      mockBalanceWriteSlotPayload(sourcePlate, pb);
      mockBalanceWriteSlotPayload(targetPlate, pa);
    }
    _mockBalanceSuppressNextBoardClick = true;
    mockBalanceRefreshAfterSlotChange();
  }

  function mockBalanceAttachVsBoardInteractions() {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board || board.getAttribute("data-mock-balance-dnd-bound") === "1") return;
    board.setAttribute("data-mock-balance-dnd-bound", "1");
    board.addEventListener("click", mockBalanceVsBoardClick);
    board.addEventListener("dragstart", mockBalanceSlotDragStart);
    board.addEventListener("dragend", mockBalanceSlotDragEnd);
    board.addEventListener("dragover", mockBalanceSlotDragOver);
    board.addEventListener("drop", mockBalanceSlotDrop);
  }

  /** ③ 라인업 보드: 편집 보드 닉네임 미러 */
  window.mockBalanceSyncLineupFromVsBoard = function () {
    var vs = document.getElementById("mock-balance-vs-board");
    var lineup = document.getElementById("mock-balance-lineup-board");
    if (!vs || !lineup) return;
    var rows = lineup.querySelectorAll(".mock-balance-vs-row");
    var i;
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      var bEl = row.querySelector(".mock-balance-nameplate--blue");
      var rEl = row.querySelector(".mock-balance-nameplate--red");
      var bn = vs.querySelector('[data-slot-id="b' + i + '"] .mock-balance-slot-nick');
      var rn = vs.querySelector('[data-slot-id="r' + i + '"] .mock-balance-slot-nick');
      var bt = bn ? (bn.textContent || "").trim() : "—";
      var rt = rn ? (rn.textContent || "").trim() : "—";
      if (bEl) bEl.textContent = bt || "—";
      if (rEl) rEl.textContent = rt || "—";
    }
  };

  var _mockBalanceLiveWinner = null;
  var _mockBalanceResultModalKeyHandler = null;

  function mockBalanceGetLineupRosterNicks() {
    var lineup = document.getElementById("mock-balance-lineup-board");
    var blue = [];
    var red = [];
    if (!lineup) {
      return { blue: blue, red: red };
    }
    lineup.querySelectorAll(".mock-balance-vs-row").forEach(function (row) {
      var bEl = row.querySelector(".mock-balance-nameplate--blue");
      var rEl = row.querySelector(".mock-balance-nameplate--red");
      var bt = bEl ? (bEl.textContent || "").trim() : "—";
      var rt = rEl ? (rEl.textContent || "").trim() : "—";
      blue.push(bt || "—");
      red.push(rt || "—");
    });
    return { blue: blue, red: red };
  }

  function mockBalanceRenderLiveCrowns() {
    var cb = document.getElementById("mock-balance-live-crown-blue");
    var cr = document.getElementById("mock-balance-live-crown-red");
    var bb = document.getElementById("mock-balance-live-pick-blue");
    var rb = document.getElementById("mock-balance-live-pick-red");
    if (cb) {
      cb.classList.toggle("is-winner", _mockBalanceLiveWinner === "blue");
    }
    if (cr) {
      cr.classList.toggle("is-winner", _mockBalanceLiveWinner === "red");
    }
    if (bb) {
      bb.classList.toggle("mock-balance-live-team-btn--selected", _mockBalanceLiveWinner === "blue");
    }
    if (rb) {
      rb.classList.toggle("mock-balance-live-team-btn--selected", _mockBalanceLiveWinner === "red");
    }
  }

  window.mockBalanceLivePickTeam = function (side) {
    if (side === "clear") {
      _mockBalanceLiveWinner = null;
    } else if (side === "blue") {
      _mockBalanceLiveWinner = _mockBalanceLiveWinner === "blue" ? null : "blue";
    } else if (side === "red") {
      _mockBalanceLiveWinner = _mockBalanceLiveWinner === "red" ? null : "red";
    }
    mockBalanceRenderLiveCrowns();
    return false;
  };

  window.mockBalanceGoLiveLineupTab = function () {
    var t = document.querySelector('[data-balance-wf-id="lineup"]');
    if (t) {
      window.mockBalanceSetWorkflow(t, "lineup");
    }
    return false;
  };

  function mockBalanceCloseResultConfirmModal() {
    var m = document.getElementById("mock-balance-result-confirm-modal");
    if (m) {
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    if (_mockBalanceResultModalKeyHandler) {
      document.removeEventListener("keydown", _mockBalanceResultModalKeyHandler);
      _mockBalanceResultModalKeyHandler = null;
    }
  }

  window.mockBalanceConfirmResultSave = function () {
    mockBalanceCloseResultConfirmModal();
    window.alert(
      "목업: 결과가 DB에 저장되었습니다. 승부예측이 진행 중이었다면 배당·정산을 수행합니다(구현 시).",
    );
    return false;
  };

  window.mockBalanceCancelResultModal = function () {
    mockBalanceCloseResultConfirmModal();
    return false;
  };

  window.mockBalanceOpenResultConfirmModal = function () {
    if (_mockBalanceResultModalKeyHandler) {
      document.removeEventListener("keydown", _mockBalanceResultModalKeyHandler);
      _mockBalanceResultModalKeyHandler = null;
    }
    var roster = mockBalanceGetLineupRosterNicks();
    var body = document.getElementById("mock-balance-result-confirm-body");
    var titleEl = document.getElementById("mock-balance-result-confirm-title");
    if (!body || !titleEl) {
      return false;
    }
    body.innerHTML = "";
    var p1 = document.createElement("p");
    p1.style.margin = "0";
    p1.style.fontSize = "11px";
    p1.style.color = "var(--text-muted)";
    if (_mockBalanceLiveWinner === "blue" || _mockBalanceLiveWinner === "red") {
      var winSide = _mockBalanceLiveWinner;
      var outcomeText =
        winSide === "blue" ? "블루 팀 승으로 기록합니다." : "레드 팀 승으로 기록합니다.";
      titleEl.textContent = winSide === "blue" ? "결과 확인 — 블루 승" : "결과 확인 — 레드 승";
      var p0 = document.createElement("p");
      p0.style.margin = "0 0 12px";
      p0.style.fontSize = "13px";
      p0.style.fontWeight = "600";
      p0.textContent = outcomeText;
      body.appendChild(p0);
      var names = winSide === "blue" ? roster.blue : roster.red;
      var hW = document.createElement("p");
      hW.style.margin = "0 0 4px";
      hW.style.fontSize = "12px";
      hW.style.fontWeight = "600";
      hW.style.color = winSide === "blue" ? "#7dd3fc" : "#fb7185";
      hW.textContent = winSide === "blue" ? "블루 팀 (5명)" : "레드 팀 (5명)";
      body.appendChild(hW);
      var ul = document.createElement("ul");
      ul.style.margin = "0 0 12px";
      ul.style.paddingLeft = "18px";
      ul.style.fontSize = "12px";
      ul.style.lineHeight = "1.55";
      names.forEach(function (name, i) {
        var li = document.createElement("li");
        li.textContent = String(i + 1) + ". " + name;
        ul.appendChild(li);
      });
      body.appendChild(ul);
      p1.textContent = "승자 팀 구성이 맞으면 확인 또는 Enter로 저장합니다.";
    } else {
      titleEl.textContent = "결과 확인 — 무승부";
      var pDraw = document.createElement("p");
      pDraw.style.margin = "0 0 8px";
      pDraw.style.fontSize = "13px";
      pDraw.style.fontWeight = "600";
      pDraw.style.color = "var(--text-secondary)";
      pDraw.textContent = "무승부로 저장합니다. 맞습니까?";
      body.appendChild(pDraw);
      p1.textContent = "맞으면 확인 또는 Enter로 저장합니다.";
    }
    body.appendChild(p1);
    var modal = document.getElementById("mock-balance-result-confirm-modal");
    if (modal) {
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
    }
    var okBtn = document.getElementById("mock-balance-result-confirm-ok");
    if (okBtn) {
      window.setTimeout(function () {
        try {
          okBtn.focus();
        } catch (eF) {}
      }, 0);
    }
    _mockBalanceResultModalKeyHandler = function (e) {
      var m = document.getElementById("mock-balance-result-confirm-modal");
      if (!m || m.hasAttribute("hidden")) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        window.mockBalanceConfirmResultSave();
      }
    };
    document.addEventListener("keydown", _mockBalanceResultModalKeyHandler);
    return false;
  };

  /** 승부예측: 예측 결과 표 행 → 코인·인원 집계 + 실시간 우세 미터(목업) */
  var _mockBalancePredictLiveTimer = null;
  var _mockBalancePredictLiveSim = { b: 0, r: 0 };
  var MOCK_BALANCE_PREDICT_VOTE_MINUTES_KEY = "clansync_mock_balance_predict_vote_minutes";
  var _mockPredictVoteDeadlineMs = null;
  var _mockPredictVoteDeadlineTickerId = null;

  function mockBalanceGetPredictVoteMinutes() {
    try {
      var v = parseInt(localStorage.getItem(MOCK_BALANCE_PREDICT_VOTE_MINUTES_KEY), 10);
      if (isFinite(v) && v >= 1 && v <= 120) return v;
    } catch (eMins) {}
    return 5;
  }

  function mockBalanceSyncPredictVoteMinutesToModal() {
    var el = document.getElementById("mock-balance-predict-vote-minutes");
    if (el) el.value = String(mockBalanceGetPredictVoteMinutes());
  }

  var MOCK_BALANCE_MAP_BAN_DEADLINE_SEC_KEY = "clansync_mock_balance_map_ban_deadline_sec";
  var MOCK_BALANCE_HERO_BAN_DEADLINE_SEC_KEY = "clansync_mock_balance_hero_ban_deadline_sec";

  function mockBalanceGetMapBanDeadlineSeconds() {
    try {
      var v = parseInt(localStorage.getItem(MOCK_BALANCE_MAP_BAN_DEADLINE_SEC_KEY), 10);
      if (isFinite(v) && v >= 5 && v <= 600) return v;
    } catch (eMapSec) {}
    return 15;
  }

  function mockBalanceGetHeroBanDeadlineSeconds() {
    try {
      var v = parseInt(localStorage.getItem(MOCK_BALANCE_HERO_BAN_DEADLINE_SEC_KEY), 10);
      if (isFinite(v) && v >= 5 && v <= 600) return v;
    } catch (eHeroSec) {}
    return 20;
  }

  function mockBalanceSyncBanDeadlinesToModal() {
    var mEl = document.getElementById("mock-balance-map-ban-deadline-seconds");
    if (mEl) mEl.value = String(mockBalanceGetMapBanDeadlineSeconds());
    var hEl = document.getElementById("mock-balance-hero-ban-deadline-seconds");
    if (hEl) hEl.value = String(mockBalanceGetHeroBanDeadlineSeconds());
  }

  function mockBalanceSyncBanDeadlineRowsVisibility() {
    var mapBtn = document.getElementById("mock-balance-toggle-map-ban");
    var mapWrap = document.getElementById("mock-balance-map-ban-deadline-wrap");
    if (mapWrap) mapWrap.hidden = !(mapBtn && mapBtn.getAttribute("aria-checked") === "true");
    var heroBtn = document.getElementById("mock-balance-toggle-hero-ban");
    var heroWrap = document.getElementById("mock-balance-hero-ban-deadline-wrap");
    if (heroWrap) heroWrap.hidden = !(heroBtn && heroBtn.getAttribute("aria-checked") === "true");
  }

  var MOCK_BALANCE_PREDICT_TABLE_PAGE_SIZE = 5;
  var _mockPredictTablePage = 0;

  function mockBalancePredictRenderVoteDeadline() {
    var el = document.getElementById("mock-balance-predict-vote-deadline");
    if (!el) return;
    var lineup = document.getElementById("mock-balance-wf-lineup");
    if (!lineup || lineup.hidden) return;
    el.classList.remove("mock-balance-predict-vote-timer--muted", "mock-balance-predict-vote-timer--ended");
    if (!_mockPredictVoteDeadlineMs) {
      el.textContent = "마감까지 —";
      el.classList.add("mock-balance-predict-vote-timer--muted");
      return;
    }
    var end = _mockPredictVoteDeadlineMs;
    var now = Date.now();
    if (now >= end) {
      el.textContent = "마감됨";
      el.classList.add("mock-balance-predict-vote-timer--ended");
      return;
    }
    var left = end - now;
    var totalSec = Math.max(0, Math.floor(left / 1000));
    var mm = Math.floor(totalSec / 60);
    var ss = totalSec % 60;
    var pad2 = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    el.textContent = "마감까지 " + mm + ":" + pad2(ss);
  }

  function mockBalancePredictApplyTablePagination() {
    var tb = document.getElementById("mock-balance-predict-tbody");
    var pager = document.getElementById("mock-balance-predict-pager");
    if (!tb || !pager) return;
    var rows = tb.querySelectorAll("tr[data-mock-predict-side]");
    var n = rows.length;
    var pageSize = MOCK_BALANCE_PREDICT_TABLE_PAGE_SIZE;
    var totalPages = Math.max(1, Math.ceil(n / pageSize));
    if (n <= pageSize) {
      pager.hidden = true;
      rows.forEach(function (tr) {
        tr.style.display = "";
      });
      return;
    }
    pager.hidden = false;
    if (_mockPredictTablePage >= totalPages) {
      _mockPredictTablePage = totalPages - 1;
    }
    if (_mockPredictTablePage < 0) {
      _mockPredictTablePage = 0;
    }
    var start = _mockPredictTablePage * pageSize;
    rows.forEach(function (tr, i) {
      tr.style.display = i >= start && i < start + pageSize ? "" : "none";
    });
    var label = document.getElementById("mock-balance-predict-pager-label");
    if (label) {
      label.textContent = _mockPredictTablePage + 1 + " / " + totalPages;
    }
    var prev = document.getElementById("mock-balance-predict-pager-prev");
    var next = document.getElementById("mock-balance-predict-pager-next");
    if (prev) prev.disabled = _mockPredictTablePage <= 0;
    if (next) next.disabled = _mockPredictTablePage >= totalPages - 1;
  }

  window.mockBalancePredictPagerPrev = function () {
    _mockPredictTablePage--;
    mockBalancePredictApplyTablePagination();
    return false;
  };

  window.mockBalancePredictPagerNext = function () {
    _mockPredictTablePage++;
    mockBalancePredictApplyTablePagination();
    return false;
  };

  function mockBalancePredictSyncVoteUiState() {
    var lineup = document.getElementById("mock-balance-wf-lineup");
    if (!lineup || lineup.hidden) return;
    if (window.mockClanCurrentPlan && window.mockClanCurrentPlan() !== "premium") return;
    /* 배치 완료 전에는 마감 시각이 없음 → 비활성화하지 않음(목업 탐색). 마감 시각이 있고 지난 경우만 잠금 */
    var voteClosed =
      _mockPredictVoteDeadlineMs && Date.now() >= _mockPredictVoteDeadlineMs;
    var open = !voteClosed;
    document.querySelectorAll(".mock-balance-predict-vote-btn").forEach(function (b) {
      b.disabled = !open;
    });
    var inp = document.getElementById("mock-balance-predict-coin-input");
    if (!inp) inp = document.querySelector(".mock-balance-predict-vote-input");
    if (inp) inp.disabled = !open;
  }

  function mockBalancePredictEnsureVoteDeadlineTicker() {
    if (_mockPredictVoteDeadlineTickerId) return;
    _mockPredictVoteDeadlineTickerId = window.setInterval(function () {
      mockBalancePredictRenderVoteDeadline();
      mockBalancePredictSyncVoteUiState();
    }, 1000);
  }

  /** 배치 완료 시점부터 설정된 분만큼 승부예측 투표 가능(목업) */
  function mockBalanceStartPredictVoteWindow() {
    var mins = mockBalanceGetPredictVoteMinutes();
    _mockPredictVoteDeadlineMs = Date.now() + mins * 60 * 1000;
    mockBalancePredictEnsureVoteDeadlineTicker();
    mockBalancePredictRenderVoteDeadline();
    mockBalancePredictSyncVoteUiState();
  }

  function mockBalancePredictParseTableBase() {
    var tb = document.getElementById("mock-balance-predict-tbody");
    if (!tb) {
      return { bC: 0, rC: 0, bN: 0, rN: 0 };
    }
    var bC = 0;
    var rC = 0;
    var bN = 0;
    var rN = 0;
    tb.querySelectorAll("tr[data-mock-predict-side]").forEach(function (tr) {
      var side = (tr.getAttribute("data-mock-predict-side") || "").toLowerCase();
      var coins = parseInt(tr.getAttribute("data-mock-coins") || "0", 10) || 0;
      if (side === "blue") {
        bC += coins;
        bN += 1;
      } else if (side === "red") {
        rC += coins;
        rN += 1;
      }
    });
    return { bC: bC, rC: rC, bN: bN, rN: rN };
  }

  function mockBalancePredictRenderLiveMeter() {
    var meter = document.getElementById("mock-balance-predict-live-meter");
    if (!meter) {
      return;
    }
    var base = mockBalancePredictParseTableBase();
    var bC = base.bC + _mockBalancePredictLiveSim.b;
    var rC = base.rC + _mockBalancePredictLiveSim.r;
    var bN = base.bN;
    var rN = base.rN;
    var totalC = bC + rC;
    var wB = totalC > 0 ? (bC / totalC) * 100 : bN + rN === 0 ? 50 : 50;
    var wR = totalC > 0 ? (rC / totalC) * 100 : bN + rN === 0 ? 50 : 50;
    var barB = document.getElementById("mock-balance-predict-bar-blue");
    var barR = document.getElementById("mock-balance-predict-bar-red");
    if (barB && barR) {
      barB.style.width = wB + "%";
      barR.style.width = wR + "%";
    }
    var rb = Math.round(wB);
    var rr = 100 - rb;
    var pctElB = document.getElementById("mock-balance-predict-pct-blue");
    var pctElR = document.getElementById("mock-balance-predict-pct-red");
    if (pctElB) {
      pctElB.textContent = rb + "%";
    }
    if (pctElR) {
      pctElR.textContent = rr + "%";
    }
    var statB = document.getElementById("mock-balance-predict-stat-blue");
    var statR = document.getElementById("mock-balance-predict-stat-red");
    if (statB) {
      statB.textContent = "블루 " + bC + "코인 · " + bN + "명";
    }
    if (statR) {
      statR.textContent = "레드 " + rC + "코인 · " + rN + "명";
    }
  }

  function mockBalancePredictLiveTick() {
    var view = document.getElementById("view-balance");
    var meter = document.getElementById("mock-balance-predict-live-meter");
    if (!view || !view.classList.contains("is-active") || !meter) {
      return;
    }
    if (window.mockClanCurrentPlan && window.mockClanCurrentPlan() !== "premium") {
      return;
    }
    if (_mockPredictVoteDeadlineMs && Date.now() >= _mockPredictVoteDeadlineMs) {
      return;
    }
    if (Math.random() < 0.52) {
      _mockBalancePredictLiveSim.b += Math.floor(Math.random() * 5);
    } else {
      _mockBalancePredictLiveSim.r += Math.floor(Math.random() * 5);
    }
    var cap = 120;
    if (_mockBalancePredictLiveSim.b + _mockBalancePredictLiveSim.r > cap) {
      _mockBalancePredictLiveSim.b = Math.floor(_mockBalancePredictLiveSim.b * 0.65);
      _mockBalancePredictLiveSim.r = Math.floor(_mockBalancePredictLiveSim.r * 0.65);
    }
    mockBalancePredictRenderLiveMeter();
  }

  window.mockBalancePredictLiveStart = function () {
    if (window.mockClanCurrentPlan && window.mockClanCurrentPlan() !== "premium") {
      window.mockBalancePredictLiveStop();
      return;
    }
    if (_mockBalancePredictLiveTimer) {
      return;
    }
    mockBalancePredictRenderLiveMeter();
    _mockBalancePredictLiveTimer = window.setInterval(mockBalancePredictLiveTick, 2600);
  };

  window.mockBalancePredictLiveStop = function () {
    if (_mockBalancePredictLiveTimer) {
      window.clearInterval(_mockBalancePredictLiveTimer);
      _mockBalancePredictLiveTimer = null;
    }
  };

  var MOCK_BALANCE_SLOT_OPTS_KEY = "clansync_mock_balance_slot_opts";

  function mockBalanceDefaultSlotOpts() {
    return { wlt: true, m: true, tags: true, mic: false };
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
    board.classList.toggle("mock-balance-slotopt--hide-tags", !v.tags);
    board.classList.toggle("mock-balance-slotopt--hide-mic", !v.mic);
  };

  var MOCK_BALANCE_MANUAL_SCORE_MODE_KEY = "mockBalanceManualScoreMode";

  function mockBalanceUpdateStrengthLabel(mode) {
    var label = document.getElementById("mock-balance-strength-label");
    if (!label) return;
    label.textContent = mode === "a" ? "A점수 차이" : "M점수 차이";
  }

  /** 참고 패널: 슬롯 첫 점수 행 라벨 M ↔ A 표기 (Premium만, Free는 M 고정·저장 안 함) */
  window.mockBalanceSetManualScoreMode = function (mode) {
    var board = document.getElementById("mock-balance-vs-board");
    var m = mode === "a" ? "a" : "m";
    var isPremium =
      typeof window.mockClanCurrentPlan !== "function" || window.mockClanCurrentPlan() === "premium";
    if (!isPremium) {
      m = "m";
    }
    if (isPremium) {
      try {
        localStorage.setItem(MOCK_BALANCE_MANUAL_SCORE_MODE_KEY, m);
      } catch (e) {}
    }
    if (board) {
      board.classList.toggle("mock-balance-vs-board--manual-score-a", m === "a");
    }
    var btnM = document.getElementById("mock-balance-manual-score-m");
    var btnA = document.getElementById("mock-balance-manual-score-a");
    if (btnM) btnM.setAttribute("aria-pressed", m === "m" ? "true" : "false");
    if (btnA) btnA.setAttribute("aria-pressed", m === "a" ? "true" : "false");
    var switchBtn = document.getElementById("mock-balance-manual-score-switch");
    if (switchBtn) {
      switchBtn.setAttribute("aria-checked", m === "a" ? "true" : "false");
      switchBtn.setAttribute("data-mode", m);
      switchBtn.setAttribute("aria-label", m === "a" ? "A 점수 모드 (켜짐)" : "M 점수 모드 (켜짐)");
      switchBtn.setAttribute("title", "클릭하여 M/A 점수 전환");
    }
    mockBalanceUpdateStrengthLabel(m);
    return false;
  };

  window.mockBalanceToggleManualScoreMode = function () {
    var switchBtn = document.getElementById("mock-balance-manual-score-switch");
    var curr = switchBtn && switchBtn.getAttribute("data-mode") === "a" ? "a" : "m";
    var next = curr === "a" ? "m" : "a";
    return window.mockBalanceSetManualScoreMode(next);
  };

  window.mockBalanceApplyManualScoreModeFromStorage = function () {
    if (typeof window.mockClanCurrentPlan === "function" && window.mockClanCurrentPlan() !== "premium") {
      window.mockBalanceSetManualScoreMode("m");
      return;
    }
    var m = "m";
    try {
      var s = localStorage.getItem(MOCK_BALANCE_MANUAL_SCORE_MODE_KEY);
      /* 예전 I 점수 토글 값 호환 */
      if (s === "i") s = "a";
      if (s === "a" || s === "m") m = s;
    } catch (e) {}
    window.mockBalanceSetManualScoreMode(m);
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
    if (bTxt) bTxt.textContent = blue.toFixed(2);
    if (rTxt) rTxt.textContent = red.toFixed(2);
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
      if (plate.getAttribute("data-empty") === "true") return;
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
   * Premium 전용: 태그 목업 갱신. ~85ms 비동기 + 짧은 refreshing 클래스.
   * (슬롯 A 숫자 행은 M/A 토글로 통합되어 제거됨.)
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

  /** 맵 밴 ON일 때만 배치 카드에 맵 풀 분류 드롭다운 표시 */
  function mockBalanceSyncMapPoolRow() {
    var mapBan = document.getElementById("mock-balance-toggle-map-ban");
    var row = document.getElementById("mock-balance-map-pool-row");
    var on = mapBan && mapBan.getAttribute("aria-checked") === "true";
    if (row) {
      row.hidden = !on;
    }
  }

  /**
   * 목업: 분류별 맵 풀(실서버는 DB·게임별 동기).
   * 각 분류는 최소 3개 이상.
   */
  var MOCK_BALANCE_MAP_POOLS = {
    all: [
      "하나오카",
      "아누비스 왕좌",
      "남극 반도",
      "부산",
      "일리오스",
      "리장 타워",
      "네팔",
      "오아시스",
      "사모아",
      "서킷 로얄",
      "도라도",
      "하바나",
      "정크타운",
      "리알토",
      "66번 국도",
      "샴발라 수도원",
      "감시 기지: 지브롤터",
      "뉴 정크 시티",
      "수라바사",
      "블리자드 월드",
      "아이헨발데",
      "할리우드",
      "킹스 로우",
      "미드타운",
    ],
    clash: ["서킷 로얄", "일리오스", "네팔", "부산", "리장 타워", "오아시스", "사모아", "미드타운"],
    escort: ["하나오카", "도라도", "하바나", "정크타운", "리알토", "66번 국도", "감시 기지: 지브롤터", "뉴 정크 시티", "수라바사", "아이헨발데"],
    push: ["킹스 로우", "뉴 정크 시티", "수라바사", "아이헨발데", "블리자드 월드", "미드타운"],
    hybrid: ["아누비스 왕좌", "남극 반도", "샴발라 수도원", "할리우드", "킹스 로우", "부산"],
    flashpoint: ["서킷 로얄", "일리오스", "네팔", "미드타운", "오아시스", "사모아"],
  };

  /** 목업: 맵명 → 모드 라벨(표시용) */
  var MOCK_BALANCE_MAP_MODE_LABEL = {
    하나오카: "호위",
    "아누비스 왕좌": "혼합",
    "남극 반도": "혼합",
    부산: "쟁탈",
    일리오스: "쟁탈",
    "리장 타워": "쟁탈",
    네팔: "쟁탈",
    오아시스: "쟁탈",
    사모아: "쟁탈",
    "서킷 로얄": "쟁탈",
    도라도: "호위",
    하바나: "호위",
    정크타운: "호위",
    리알토: "호위",
    "66번 국도": "호위",
    "샴발라 수도원": "혼합",
    "감시 기지: 지브롤터": "호위",
    "뉴 정크 시티": "호위",
    수라바사: "호위",
    "블리자드 월드": "밀기",
    아이헨발데: "호위",
    할리우드: "혼합",
    "킹스 로우": "밀기",
    미드타운: "플래시 포인트",
  };

  var _mockMapVoteTimerId = null;
  var _mockMapVoteSecondsLeft = 15;
  var _mockMapVoteCounts = [0, 0, 0];
  var _mockMapVoteNames = ["", "", ""];
  var _mockMapVoteEnded = true;
  /** 룰렛 연출 세대 — 새 세션 시 증가해 이전 타임아웃 무효화 */
  var _mockMapRouletteSeq = 0;

  function mockBalanceShufflePickThree(pool) {
    var copy = pool.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy.slice(0, 3);
  }

  /** 동률(전부 동일 득표)이면 균등 1/3, 아니면 득표 가중 무작위 */
  function mockBalanceWeightedMapPick(names, votes) {
    var allEq = true;
    var a;
    for (a = 1; a < votes.length; a++) {
      if (votes[a] !== votes[0]) {
        allEq = false;
        break;
      }
    }
    if (allEq) {
      return names[Math.floor(Math.random() * names.length)];
    }
    var sum = 0;
    for (a = 0; a < votes.length; a++) {
      sum += Math.max(0, votes[a]);
    }
    if (sum <= 0) {
      return names[Math.floor(Math.random() * names.length)];
    }
    var r = Math.random() * sum;
    var acc = 0;
    for (a = 0; a < names.length; a++) {
      acc += Math.max(0, votes[a]);
      if (r < acc) {
        return names[a];
      }
    }
    return names[names.length - 1];
  }

  function mockBalanceClearMapVoteTimer() {
    if (_mockMapVoteTimerId !== null) {
      window.clearInterval(_mockMapVoteTimerId);
      _mockMapVoteTimerId = null;
    }
  }

  function mockBalanceMapVoteSetTimerLabel(sec) {
    var el = document.getElementById("mock-mapvote-timer");
    if (!el) return;
    var s = Math.max(0, sec | 0);
    el.textContent = "0:" + (s < 10 ? "0" : "") + s;
  }

  function mockBalanceMapVoteClearRouletteHighlight() {
    var i;
    for (i = 0; i < 3; i++) {
      var card = document.querySelector('.mock-mapvote-card[data-mapvote-idx="' + i + '"]');
      if (card) {
        card.classList.remove("mock-mapvote-card--roulette-active");
      }
    }
  }

  /**
   * OW 스타일: 룰렛이 세 맵을 순환하다 득표가 많은 쪽에 더 머무는 느낌(가중 랜덤 인덱스).
   * 0표 동률이면 max(득표,1)로 균등에 가깝게.
   */
  function mockBalanceMapVoteRouletteWeightedIndex(votes) {
    var w0 = Math.max(votes[0] || 0, 1);
    var w1 = Math.max(votes[1] || 0, 1);
    var w2 = Math.max(votes[2] || 0, 1);
    var sum = w0 + w1 + w2;
    var r = Math.random() * sum;
    var acc = 0;
    acc += w0;
    if (r < acc) {
      return 0;
    }
    acc += w1;
    if (r < acc) {
      return 1;
    }
    return 2;
  }

  /**
   * OW 맵 투표: roll-through 룰렛 연출 후 이미 결정된 winner에 정지.
   * (실제 게임은 가중 랜덤과 동기화된 시각 효과 — 목업은 서버 결과 winner를 애니메이션으로 보여줌.)
   */
  function mockBalancePlayMapRouletteReveal(winner, votes, names) {
    _mockMapRouletteSeq++;
    var mySeq = _mockMapRouletteSeq;
    var winnerIdx = names.indexOf(winner);
    if (winnerIdx < 0) {
      winnerIdx = 0;
    }
    var maxTicks = 22;
    var tick = 0;

    var hint = document.getElementById("mock-mapvote-roulette-hint");
    if (hint) {
      hint.style.display = "block";
      hint.textContent = "맵 확정 중… (세 후보를 순환하는 룰렛 연출 · OW 맵 투표와 유사)";
    }
    var panel = document.getElementById("mock-mapvote-panel");
    if (panel) {
      panel.classList.add("mock-mapvote-panel--roulette");
    }

    function step() {
      if (mySeq !== _mockMapRouletteSeq) {
        return;
      }
      mockBalanceMapVoteClearRouletteHighlight();
      if (tick >= maxTicks) {
        mockBalanceMapVoteRevealDone(winner);
        return;
      }
      var idx;
      if (tick < 9) {
        idx = tick % 3;
      } else if (tick < maxTicks - 4) {
        idx = mockBalanceMapVoteRouletteWeightedIndex(votes);
      } else {
        idx = winnerIdx;
      }
      var card = document.querySelector('.mock-mapvote-card[data-mapvote-idx="' + idx + '"]');
      if (card) {
        card.classList.add("mock-mapvote-card--roulette-active");
      }
      tick++;
      var delay;
      if (tick <= 9) {
        delay = 62;
      } else if (tick <= 17) {
        delay = 95 + (tick - 9) * 22;
      } else {
        delay = 320 + (tick - 18) * 130;
      }
      window.setTimeout(step, Math.min(delay, 720));
    }
    step();
  }

  function mockBalanceMapVoteRevealDone(winner) {
    var hintDone = document.getElementById("mock-mapvote-roulette-hint");
    if (hintDone) {
      hintDone.style.display = "none";
      hintDone.textContent = "";
    }
    var panel = document.getElementById("mock-mapvote-panel");
    if (panel) {
      panel.classList.remove("mock-mapvote-panel--roulette");
      panel.classList.add("mock-mapvote-ended");
    }
    mockBalanceMapVoteClearRouletteHighlight();
    var i;
    for (i = 0; i < 3; i++) {
      var card = document.querySelector('.mock-mapvote-card[data-mapvote-idx="' + i + '"]');
      if (card) {
        card.classList.toggle("mock-mapvote-card--picked", _mockMapVoteNames[i] === winner);
      }
    }
    var res = document.getElementById("mock-mapvote-result");
    if (res) {
      res.hidden = false;
      res.textContent =
        "확정 맵: " +
        winner +
        " (득표 " +
        _mockMapVoteCounts.join(" / ") +
        " · 가중 랜덤 · 동률 시 1:1:1 · 룰렛 연출은 OW 맵 투표 roll-through 스타일 목업)";
    }
    mockBalanceMapVoteSetTimerLabel(0);
    var label = document.getElementById("mock-balance-map-label");
    if (label) {
      label.textContent = winner;
    }
    var lineupMap = document.getElementById("mock-balance-lineup-map");
    if (lineupMap) {
      lineupMap.textContent = winner;
    }
    if (typeof window.mockBalanceRefreshAiSnapshotMock === "function") {
      window.mockBalanceRefreshAiSnapshotMock();
    }
    mockBalanceAfterMapVoteDone();
  }

  function mockBalanceHeroBanIsOn() {
    var b = document.getElementById("mock-balance-toggle-hero-ban");
    return !!(b && b.getAttribute("aria-checked") === "true");
  }

  function mockBalanceGoToLineupAfterBanpick() {
    var tab = document.querySelector('[data-balance-wf-id="lineup"]');
    if (tab) {
      window.mockBalanceSetWorkflow(tab, "lineup");
    }
  }

  function mockBalanceClearLineupBansDisplay() {
    var wrap = document.getElementById("mock-balance-lineup-bans-wrap");
    var bansEl = document.getElementById("mock-balance-lineup-bans");
    if (wrap) {
      wrap.style.display = "none";
    }
    if (bansEl) {
      bansEl.textContent = "—";
    }
  }

  function mockBalanceAfterMapVoteDone() {
    if (mockBalanceHeroBanIsOn()) {
      window.mockBalanceStartHeroBanSession();
    } else {
      mockBalanceClearLineupBansDisplay();
      mockBalanceGoToLineupAfterBanpick();
    }
  }

  /** OW 스타일: 영웅명 → 역할 (목업 풀) */
  var MOCK_HERO_ROLES = {
    라인하르트: "tank",
    오리사: "tank",
    윈스턴: "tank",
    자리야: "tank",
    트레이서: "dps",
    "솔저: 76": "dps",
    메이: "dps",
    리퍼: "dps",
    겐지: "dps",
    루시우: "support",
    키리코: "support",
    메르시: "support",
    아나: "support",
  };

  var _mockHeroBanTimerId = null;
  var _mockHeroBanSecondsLeft = 20;
  var _mockHeroBanTotals = {};
  var _mockHeroBanOrder = [];
  var _mockHeroBanEnded = true;
  var _mockHeroBanSeq = 0;

  function mockBalanceHeroBanSetTimerLabel(sec) {
    var el = document.getElementById("mock-heroban-timer");
    if (!el) {
      return;
    }
    var s = Math.max(0, sec | 0);
    el.textContent = "0:" + (s < 10 ? "0" : "") + s;
  }

  function mockBalanceHeroBanClearTimer() {
    if (_mockHeroBanTimerId !== null) {
      window.clearInterval(_mockHeroBanTimerId);
      _mockHeroBanTimerId = null;
    }
  }

  function mockBalanceHeroBanRefreshTotalsDisplay() {
    var el = document.getElementById("mock-heroban-totals");
    if (!el) {
      return;
    }
    var keys = Object.keys(_mockHeroBanTotals);
    if (keys.length === 0) {
      el.textContent = "—";
      return;
    }
    keys.sort(function (a, b) {
      return (_mockHeroBanTotals[b] || 0) - (_mockHeroBanTotals[a] || 0) || a.localeCompare(b, "ko");
    });
    el.textContent = keys
      .map(function (k) {
        return k + " " + _mockHeroBanTotals[k] + "점";
      })
      .join(" · ");
  }

  function mockBalanceHeroBanUpdateChipStyles() {
    document.querySelectorAll(".mock-heroban-chip").forEach(function (chip) {
      chip.classList.remove(
        "mock-heroban-chip--in-order",
        "mock-heroban-chip--order-1",
        "mock-heroban-chip--order-2",
        "mock-heroban-chip--order-3",
      );
    });
    _mockHeroBanOrder.forEach(function (name, idx) {
      document.querySelectorAll('.mock-heroban-chip[data-hero-name="' + name + '"]').forEach(function (chip) {
        chip.classList.add("mock-heroban-chip--in-order");
        chip.classList.add("mock-heroban-chip--order-" + String(idx + 1));
      });
    });
  }

  function mockBalanceHeroBanUpdateOrderLabel() {
    var el = document.getElementById("mock-heroban-order");
    if (!el) {
      return;
    }
    if (_mockHeroBanOrder.length === 0) {
      el.textContent = "—";
      return;
    }
    var w = [7, 5, 3];
    el.textContent = _mockHeroBanOrder
      .map(function (name, i) {
        return String(i + 1) + "순(" + w[i] + "): " + name;
      })
      .join(" → ");
  }

  function mockBalanceHeroBanAddBallot(names) {
    var weights = [7, 5, 3];
    var i;
    for (i = 0; i < 3; i++) {
      var n = names[i];
      if (!n) {
        continue;
      }
      _mockHeroBanTotals[n] = (_mockHeroBanTotals[n] || 0) + weights[i];
    }
  }

  function mockBalanceHeroBanPickThreeRandom(allNames) {
    var copy = allNames.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy.slice(0, 3);
  }

  /** 점수 순, 역할당 최대 2명, 전체 최대 4명 */
  function mockBalanceHeroBanResolveBans(totals, roleMap) {
    var entries = Object.keys(totals).map(function (name) {
      return {
        name: name,
        score: totals[name] || 0,
        role: roleMap[name] || "dps",
      };
    });
    entries.sort(function (a, b) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.name.localeCompare(b.name, "ko");
    });
    var banned = [];
    var roleCount = { tank: 0, dps: 0, support: 0 };
    var maxPer = 2;
    var maxTotal = 4;
    var i;
    for (i = 0; i < entries.length && banned.length < maxTotal; i++) {
      var r = entries[i].role;
      if (roleCount[r] >= maxPer) {
        continue;
      }
      banned.push(entries[i].name);
      roleCount[r]++;
    }
    return banned;
  }

  window.mockBalanceHeroBanPick = function (btn) {
    if (!btn || _mockHeroBanEnded) {
      return false;
    }
    var name = btn.getAttribute("data-hero-name") || "";
    if (!name || _mockHeroBanOrder.length >= 3) {
      return false;
    }
    if (_mockHeroBanOrder.indexOf(name) !== -1) {
      return false;
    }
    _mockHeroBanOrder.push(name);
    mockBalanceHeroBanUpdateOrderLabel();
    mockBalanceHeroBanUpdateChipStyles();
    return false;
  };

  window.mockBalanceHeroBanResetPick = function () {
    if (_mockHeroBanEnded) {
      return false;
    }
    _mockHeroBanOrder = [];
    mockBalanceHeroBanUpdateOrderLabel();
    mockBalanceHeroBanUpdateChipStyles();
    return false;
  };

  window.mockBalanceHeroBanApplyBallot = function () {
    if (_mockHeroBanEnded) {
      return false;
    }
    if (_mockHeroBanOrder.length !== 3) {
      window.alert("목업: 서로 다른 영웅 3명을 순서대로 선택한 뒤 반영하세요.");
      return false;
    }
    mockBalanceHeroBanAddBallot(_mockHeroBanOrder.slice());
    _mockHeroBanOrder = [];
    mockBalanceHeroBanUpdateOrderLabel();
    mockBalanceHeroBanUpdateChipStyles();
    mockBalanceHeroBanRefreshTotalsDisplay();
    return false;
  };

  window.mockBalanceHeroBanRandomSimulate = function () {
    if (_mockHeroBanEnded) {
      return false;
    }
    var all = Object.keys(MOCK_HERO_ROLES);
    var b;
    for (b = 0; b < 8; b++) {
      mockBalanceHeroBanAddBallot(mockBalanceHeroBanPickThreeRandom(all));
    }
    mockBalanceHeroBanRefreshTotalsDisplay();
    return false;
  };

  function mockBalanceHeroBanFinalize() {
    mockBalanceHeroBanClearTimer();
    _mockHeroBanEnded = true;
    if (_mockHeroBanOrder.length === 3) {
      mockBalanceHeroBanAddBallot(_mockHeroBanOrder.slice());
      _mockHeroBanOrder = [];
    }
    mockBalanceHeroBanRefreshTotalsDisplay();
    mockBalanceHeroBanUpdateOrderLabel();
    mockBalanceHeroBanUpdateChipStyles();
    var banned = mockBalanceHeroBanResolveBans(_mockHeroBanTotals, MOCK_HERO_ROLES);
    var res = document.getElementById("mock-heroban-result");
    if (res) {
      res.hidden = false;
      res.textContent =
        "밴 확정: " +
        (banned.length ? banned.join(", ") : "없음") +
        " (최대 4명 · 역할당 최대 2명 · OW식 가중 합산 목업)";
    }
    var hp = document.getElementById("mock-heroban-panel");
    if (hp) {
      hp.classList.add("mock-heroban-ended");
    }
    var wrap = document.getElementById("mock-balance-lineup-bans-wrap");
    var bansEl = document.getElementById("mock-balance-lineup-bans");
    if (banned.length && wrap && bansEl) {
      bansEl.textContent = banned.join(", ");
      wrap.style.display = "flex";
    } else if (wrap) {
      wrap.style.display = "none";
    }
    mockBalanceGoToLineupAfterBanpick();
  }

  window.mockBalanceStartHeroBanSession = function () {
    _mockHeroBanSeq++;
    var mySeq = _mockHeroBanSeq;
    mockBalanceHeroBanClearTimer();
    _mockHeroBanTotals = {};
    _mockHeroBanOrder = [];
    _mockHeroBanEnded = false;
    _mockHeroBanSecondsLeft = mockBalanceGetHeroBanDeadlineSeconds();
    mockBalanceHeroBanSetTimerLabel(_mockHeroBanSecondsLeft);
    mockBalanceHeroBanRefreshTotalsDisplay();
    mockBalanceHeroBanUpdateOrderLabel();
    mockBalanceHeroBanUpdateChipStyles();
    var res = document.getElementById("mock-heroban-result");
    if (res) {
      res.hidden = true;
      res.textContent = "";
    }
    var hp = document.getElementById("mock-heroban-panel");
    if (hp) {
      hp.hidden = false;
      hp.classList.remove("mock-heroban-ended");
    }
    try {
      if (hp) {
        hp.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } catch (eScroll) {}
    _mockHeroBanTimerId = window.setInterval(function () {
      if (mySeq !== _mockHeroBanSeq) {
        return;
      }
      _mockHeroBanSecondsLeft--;
      mockBalanceHeroBanSetTimerLabel(_mockHeroBanSecondsLeft);
      if (_mockHeroBanSecondsLeft <= 0) {
        mockBalanceHeroBanFinalize();
      }
    }, 1000);
  };

  function mockBalanceFinalizeMapVote() {
    mockBalanceClearMapVoteTimer();
    _mockMapVoteEnded = true;
    var winner = mockBalanceWeightedMapPick(_mockMapVoteNames, _mockMapVoteCounts);
    var i;
    for (i = 0; i < 3; i++) {
      var btn = document.getElementById("mock-mapvote-btn-" + i);
      if (btn) {
        btn.disabled = true;
      }
    }
    mockBalancePlayMapRouletteReveal(winner, _mockMapVoteCounts, _mockMapVoteNames);
  }

  /** 맵 밴 ON + 배치 완료 시 호출 */
  window.mockBalanceStartMapVoteSession = function () {
    _mockMapRouletteSeq++;
    _mockHeroBanSeq++;
    mockBalanceHeroBanClearTimer();
    var hpHide = document.getElementById("mock-heroban-panel");
    if (hpHide) {
      hpHide.hidden = true;
    }
    mockBalanceMapVoteClearRouletteHighlight();
    var hintPre = document.getElementById("mock-mapvote-roulette-hint");
    if (hintPre) {
      hintPre.style.display = "none";
      hintPre.textContent = "";
    }
    var panelPre = document.getElementById("mock-mapvote-panel");
    if (panelPre) {
      panelPre.classList.remove("mock-mapvote-panel--roulette");
    }
    var sel = document.getElementById("mock-balance-map-pool-category");
    var key = (sel && sel.value) || "all";
    var pool = MOCK_BALANCE_MAP_POOLS[key] || MOCK_BALANCE_MAP_POOLS.all;
    if (!pool || pool.length < 3) {
      window.alert("목업: 이 분류에 맵이 3개 미만입니다. 다른 분류를 선택하세요.");
      return;
    }
    var msec = document.getElementById("mock-mapvote-section");
    if (msec) {
      msec.hidden = false;
    }
    var labelEl = document.getElementById("mock-mapvote-pool-label");
    if (labelEl && sel) {
      labelEl.textContent = sel.options[sel.selectedIndex].text;
    }
    var three = mockBalanceShufflePickThree(pool);
    _mockMapVoteNames = three;
    _mockMapVoteCounts = [0, 0, 0];
    _mockMapVoteEnded = false;
    var res = document.getElementById("mock-mapvote-result");
    if (res) {
      res.hidden = true;
      res.textContent = "";
    }
    var panel = document.getElementById("mock-mapvote-panel");
    if (panel) {
      panel.classList.remove("mock-mapvote-ended");
    }
    var j;
    for (j = 0; j < 3; j++) {
      var nm = document.getElementById("mock-mapvote-name-" + j);
      var meta = document.getElementById("mock-mapvote-meta-" + j);
      var vt = document.getElementById("mock-mapvote-votes-" + j);
      var bt = document.getElementById("mock-mapvote-btn-" + j);
      if (nm) {
        nm.textContent = three[j];
      }
      if (meta) {
        var mode = MOCK_BALANCE_MAP_MODE_LABEL[three[j]];
        meta.textContent = mode ? "· " + mode : "";
      }
      if (vt) {
        vt.textContent = "0";
      }
      if (bt) {
        bt.disabled = false;
      }
      var card = document.querySelector('.mock-mapvote-card[data-mapvote-idx="' + j + '"]');
      if (card) {
        card.classList.remove("mock-mapvote-card--picked");
      }
    }
    _mockMapVoteSecondsLeft = mockBalanceGetMapBanDeadlineSeconds();
    mockBalanceMapVoteSetTimerLabel(_mockMapVoteSecondsLeft);
    mockBalanceClearMapVoteTimer();
    _mockMapVoteTimerId = window.setInterval(function () {
      _mockMapVoteSecondsLeft--;
      mockBalanceMapVoteSetTimerLabel(_mockMapVoteSecondsLeft);
      if (_mockMapVoteSecondsLeft <= 0) {
        mockBalanceFinalizeMapVote();
      }
    }, 1000);
  };

  window.mockBalanceMapVoteClick = function (idx) {
    if (_mockMapVoteEnded || idx < 0 || idx > 2) {
      return false;
    }
    _mockMapVoteCounts[idx] = (_mockMapVoteCounts[idx] || 0) + 1;
    var vt = document.getElementById("mock-mapvote-votes-" + idx);
    if (vt) {
      vt.textContent = String(_mockMapVoteCounts[idx]);
    }
    return false;
  };

  /** 맵 밴 토글 — 슬롯은 ② 밴픽 세션에서만 사용 */
  window.mockBalanceToggleMapBan = function (btn) {
    if (!btn) return false;
    var on = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", on ? "true" : "false");
    mockBalanceSyncMapPickCluster();
    mockBalanceSyncMapPoolRow();
    mockBalanceSyncBanDeadlineRowsVisibility();
    return false;
  };

  /** 영웅 밴 토글 — 슬롯은 ② 밴픽 세션에서만 사용 */
  window.mockBalanceToggleHeroBan = function (btn) {
    if (!btn) return false;
    var on = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", on ? "true" : "false");
    mockBalanceSyncBanDeadlineRowsVisibility();
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
    if (id === "lineup") {
      if (typeof window.mockBalanceSyncLineupFromVsBoard === "function") {
        window.mockBalanceSyncLineupFromVsBoard();
      }
      mockBalanceRenderLiveCrowns();
      _mockPredictTablePage = 0;
      mockBalancePredictApplyTablePagination();
      mockBalancePredictRenderVoteDeadline();
      mockBalancePredictSyncVoteUiState();
      mockBalancePredictRenderLiveMeter();
    }
    return false;
  };

  window.mockBalancePlacementDone = function () {
    if (!mockBalanceAllSlotsFilled()) {
      window.alert("10명 슬롯이 모두 찼을 때만 배치를 완료할 수 있습니다.");
      return false;
    }
    var mapBanOn =
      document.getElementById("mock-balance-toggle-map-ban") &&
      document.getElementById("mock-balance-toggle-map-ban").getAttribute("aria-checked") === "true";
    var heroBanOn = mockBalanceHeroBanIsOn();
    if (typeof window.mockBalanceRefreshAiSnapshotMock === "function") {
      window.mockBalanceRefreshAiSnapshotMock();
    }
    if (mapBanOn) {
      var tabBp = document.querySelector('[data-balance-wf-id="banpick"]');
      if (tabBp) {
        window.mockBalanceSetWorkflow(tabBp, "banpick");
      }
      var mapBanSec = mockBalanceGetMapBanDeadlineSeconds();
      window.alert(
        "목업: 배치 확정 — 참가자에게 디스코드 알림이 발송됩니다.\n밴픽 세션 URL(예시): https://clansync.app/map-vote?session=mock-…\n실제 연동은 구현 단계에서 연결합니다.\n\n확인 후 " +
          mapBanSec +
          "초 맵 밴픽 세션이 시작됩니다.",
      );
      if (typeof window.mockBalanceStartMapVoteSession === "function") {
        window.mockBalanceStartMapVoteSession();
      }
      mockBalanceStartPredictVoteWindow();
      return false;
    }
    if (heroBanOn) {
      var tabBpH = document.querySelector('[data-balance-wf-id="banpick"]');
      if (tabBpH) {
        window.mockBalanceSetWorkflow(tabBpH, "banpick");
      }
      var msec = document.getElementById("mock-mapvote-section");
      if (msec) {
        msec.hidden = true;
      }
      var heroBanSec = mockBalanceGetHeroBanDeadlineSeconds();
      window.alert(
        "목업: 맵 밴 OFF · 영웅 밴 ON — 배치 확정 후 영웅 밴픽(" +
          heroBanSec +
          "초)만 진행합니다.\nOW식 1·2·3순(7/5/3) 가중 합산 · 최대 4명 · 역할당 2명까지.",
      );
      if (typeof window.mockBalanceStartHeroBanSession === "function") {
        window.mockBalanceStartHeroBanSession();
      }
      mockBalanceStartPredictVoteWindow();
      return false;
    }
    mockBalanceClearLineupBansDisplay();
    mockBalanceStartPredictVoteWindow();
    var tab = document.querySelector('[data-balance-wf-id="lineup"]');
    if (tab) {
      window.mockBalanceSetWorkflow(tab, "lineup");
    }
    window.alert(
      "목업: 배치가 확정되었습니다. 맵·영웅 밴이 모두 꺼져 있어 ③ 5vs5로 전환했습니다. 실제 플로우는 docs/01-plan/pages/09-BalanceMaker.md 참고.",
    );
    return false;
  };

  window.mockBalanceSettingsSetTab = function (btn, which) {
    var gen = document.getElementById("mock-balance-settings-panel-general");
    var prem = document.getElementById("mock-balance-settings-panel-premium");
    var btnG = document.getElementById("mock-balance-settings-tabbtn-general");
    var btnP = document.getElementById("mock-balance-settings-tabbtn-premium");
    if (!gen || !prem || !btnG || !btnP) return false;
    var isGen = which === "general";
    gen.hidden = !isGen;
    prem.hidden = isGen;
    btnG.setAttribute("aria-selected", isGen ? "true" : "false");
    btnP.setAttribute("aria-selected", isGen ? "false" : "true");
    btnG.classList.toggle("mock-tab-active", isGen);
    btnP.classList.toggle("mock-tab-active", !isGen);
    if (!isGen) {
      mockBalanceSyncBanDeadlinesToModal();
      mockBalanceSyncBanDeadlineRowsVisibility();
    }
    return false;
  };

  window.mockBalancePremiumSettingsClick = function () {
    var m = document.getElementById("mock-balance-settings-modal");
    if (m) {
      mockBalanceSyncSlotOptModalFromStorage();
      mockBalanceSyncPredictVoteMinutesToModal();
      mockBalanceSyncBanDeadlinesToModal();
      mockBalanceSyncBanDeadlineRowsVisibility();
      m.removeAttribute("hidden");
      m.setAttribute("aria-hidden", "false");
      var btnG = document.getElementById("mock-balance-settings-tabbtn-general");
      if (btnG) window.mockBalanceSettingsSetTab(btnG, "general");
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
    if (typeof window.mockClanCurrentPlan === "function" && window.mockClanCurrentPlan() === "premium") {
      var mvEl = document.getElementById("mock-balance-predict-vote-minutes");
      if (mvEl) {
        var mv = parseInt(mvEl.value, 10);
        if (!isFinite(mv) || mv < 1) mv = 5;
        if (mv > 120) mv = 120;
        mvEl.value = String(mv);
        try {
          localStorage.setItem(MOCK_BALANCE_PREDICT_VOTE_MINUTES_KEY, String(mv));
        } catch (eMvSave) {}
      }
      var mapSecEl = document.getElementById("mock-balance-map-ban-deadline-seconds");
      if (mapSecEl) {
        var ms = parseInt(mapSecEl.value, 10);
        if (!isFinite(ms) || ms < 5) ms = 5;
        if (ms > 600) ms = 600;
        mapSecEl.value = String(ms);
        try {
          localStorage.setItem(MOCK_BALANCE_MAP_BAN_DEADLINE_SEC_KEY, String(ms));
        } catch (eMapSecSave) {}
      }
      var heroSecEl = document.getElementById("mock-balance-hero-ban-deadline-seconds");
      if (heroSecEl) {
        var hs = parseInt(heroSecEl.value, 10);
        if (!isFinite(hs) || hs < 5) hs = 5;
        if (hs > 600) hs = 600;
        heroSecEl.value = String(hs);
        try {
          localStorage.setItem(MOCK_BALANCE_HERO_BAN_DEADLINE_SEC_KEY, String(hs));
        } catch (eHeroSecSave) {}
      }
    }
    window.mockBalanceApplySlotOptsToBoard();
    return window.mockBalanceCloseSettingsModal();
  };

  window.mockBalanceOpenMapModal = function () {
    var mapBan = document.getElementById("mock-balance-toggle-map-ban");
    if (mapBan && mapBan.getAttribute("aria-checked") === "true") {
      window.alert(
        "목업: 맵 밴이 켜져 있어 이 단계에서는 맵 선택이 없습니다. ② 맵 밴픽 세션에서 맵이 정해집니다.",
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

  /** VS 보드 배치된 슬롯(data-pool-slug)과 풀 칩 동기화 후 검색 필터 재적용 */
  window.mockBalancePoolSyncFromVsBoard = function () {
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return;
    var rosterSlugs = new Set();
    board.querySelectorAll(".mock-balance-nameplate--rich[data-slot-id]").forEach(function (plate) {
      if (plate.getAttribute("data-empty") === "true") return;
      var slug = plate.getAttribute("data-pool-slug");
      if (slug) rosterSlugs.add(slug);
    });
    document.querySelectorAll(".mock-balance-pool-chip").forEach(function (c) {
      var slug = c.getAttribute("data-name") || "";
      c.setAttribute("data-on-roster", rosterSlugs.has(slug) ? "true" : "false");
    });
    var search = document.getElementById("mock-balance-pool-search");
    if (search) {
      window.mockBalancePoolFilter(search);
    }
  };

  window.mockBalancePoolFilter = function (input) {
    var q = (input && input.value ? input.value : "").trim().toLowerCase();
    document.querySelectorAll(".mock-balance-pool-chip").forEach(function (c) {
      var onRoster = c.getAttribute("data-on-roster") === "true";
      var n = (c.getAttribute("data-name") || "").toLowerCase();
      var t = (c.textContent || "").trim().toLowerCase();
      var noSearchMatch = !!(q && n.indexOf(q) === -1 && t.indexOf(q) === -1);
      c.hidden = onRoster || noSearchMatch;
    });
  };

  window.mockBalancePoolChipClick = function (btn) {
    if (!btn || btn.getAttribute("data-on-roster") === "true") return false;
    var slug = btn.getAttribute("data-name") || "";
    var displayName = (btn.textContent || "").trim();
    if (!slug || !displayName) return false;
    var board = document.getElementById("mock-balance-vs-board");
    if (!board) return false;
    var target = null;
    var i;
    for (i = 0; i < MOCK_BALANCE_SLOT_FILL_ORDER.length; i++) {
      var sid = MOCK_BALANCE_SLOT_FILL_ORDER[i];
      var plate = board.querySelector('[data-slot-id="' + sid + '"]');
      if (plate && plate.getAttribute("data-empty") === "true") {
        target = plate;
        break;
      }
    }
    if (!target) {
      window.alert("목업: 블루·레드 슬롯이 모두 찼습니다.");
      return false;
    }
    mockBalanceFillSlotFromPreset(target, slug, displayName);
    mockBalanceRefreshAfterSlotChange();
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

  /* ── 클랜 통계 (pages/10-Clan-Stats.md) — 내전=블루/레드 팀승 · 스크림=승패 미집계 · 이벤트=팀승 목업 ── */
  /** @type {{ at: string, type: string, map: string, mapType: string, winner: 'blue'|'red'|null }[]} — intra 무승부는 null, 스크림 미정도 null */
  var CLAN_STATS_MATCHES = [
    { at: "2026-03-22T18:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", winner: "blue" },
    { at: "2026-03-22T14:00:00.000Z", type: "intra", map: "할리우드", mapType: "호위", winner: "red" },
    { at: "2026-03-20T19:30:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", winner: null },
    { at: "2026-03-18T21:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", winner: "blue" },
    { at: "2026-03-15T20:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue" },
    { at: "2026-03-12T21:00:00.000Z", type: "scrim", map: "서킷 로얄", mapType: "클래시", winner: null },
    { at: "2026-03-08T20:00:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", winner: "red" },
    { at: "2026-03-05T21:30:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", winner: "blue" },
    { at: "2026-03-01T19:00:00.000Z", type: "intra", map: "할리우드", mapType: "호위", winner: "blue" },
    { at: "2026-02-25T20:00:00.000Z", type: "scrim", map: "스리아", mapType: "돌격", winner: null },
    { at: "2026-02-20T21:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue" },
    { at: "2026-02-14T18:00:00.000Z", type: "intra", map: "뉴 정크 시티", mapType: "제어", winner: "red" },
    { at: "2026-02-08T20:00:00.000Z", type: "scrim", map: "파라이소", mapType: "호위", winner: null },
    { at: "2026-02-01T21:00:00.000Z", type: "intra", map: "서킷 로얄", mapType: "클래시", winner: "blue" },
    { at: "2026-01-28T19:30:00.000Z", type: "intra", map: "엔터테인먼트", mapType: "돌격", winner: "blue" },
    { at: "2026-01-20T20:00:00.000Z", type: "scrim", map: "할리우드", mapType: "호위", winner: null },
    { at: "2026-01-12T21:00:00.000Z", type: "intra", map: "스리아", mapType: "돌격", winner: "blue" },
    { at: "2026-01-05T18:00:00.000Z", type: "intra", map: "부산", mapType: "밀기", winner: "blue" },
    { at: "2025-12-22T20:00:00.000Z", type: "event", map: "감시 기지: 지브롤터", mapType: "제어", winner: "blue" },
    { at: "2025-12-10T19:00:00.000Z", type: "scrim", map: "뉴 정크 시티", mapType: "제어", winner: null },
    { at: "2025-11-28T21:00:00.000Z", type: "intra", map: "파라이소", mapType: "호위", winner: "blue" },
  ];
  /** 시드 경기 개수 — 표시 ID 최댓값(8620+)이 추가 시 하나씩 올라가도록 기준 */
  var MOCK_STATS_INITIAL_MATCH_COUNT = CLAN_STATS_MATCHES.length;

  function mockStatsEscapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /** 밸런스 메이커·경기 기록 모달 공통 풀 (목업) */
  var MOCK_STATS_POOL_BLUE = [
    "IronWall",
    "Mender",
    "Pulse",
    "Violet",
    "Anchor",
  ];
  var MOCK_STATS_POOL_RED = [
    "Bloom",
    "Rift",
    "NovaKid",
    "Spark",
    "Safeguard",
  ];
  /** 맵 이름 → 게임 모드(호위·제어 등). 실서비스에서는 맵 마스터 데이터에서 조회 */
  var MOCK_STATS_MAP_META = {
    "서킷 로얄": "클래시",
    할리우드: "호위",
    "뉴 정크 시티": "제어",
    부산: "밀기",
    엔터테인먼트: "돌격",
    파라이소: "호위",
    스리아: "돌격",
    "감시 기지: 지브롤터": "제어",
  };
  var MOCK_STATS_MAP_OPTIONS = Object.keys(MOCK_STATS_MAP_META);

  function mockStatsMapTypeForMap(mapName) {
    var t = MOCK_STATS_MAP_META[mapName];
    return t != null ? t : "제어";
  }

  /** 경기 시각(at) 기준 최신이 앞 — 목록·슬라이더·내부 배열 일관 */
  function mockStatsSortMatchesDescending() {
    CLAN_STATS_MATCHES.sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });
  }

  /** 내전·이벤트에 5인 로스터·표시용 ID 부여(목업) */
  function mockStatsFillRosters(arr) {
    var nb = MOCK_STATS_POOL_BLUE;
    var nr = MOCK_STATS_POOL_RED;
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
      /* 최신(i=0)이 항상 8620이 되지 않도록: 경기 추가분만큼 최댓값 상승 */
      m.displayId = String(
        8620 + (arr.length - MOCK_STATS_INITIAL_MATCH_COUNT) - i,
      );
    });
  }
  mockStatsSortMatchesDescending();
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

  /** 경기 일시 표시: 저장값은 ISO(UTC)이나, UI는 집계와 동일하게 Asia/Seoul YYYY-MM-DD HH:mm */
  function mockStatsFormatDateTimeInStatsTz(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: MOCK_STATS_STATS_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    var parts = {};
    fmt.formatToParts(d).forEach(function (p) {
      if (p.type !== "literal") parts[p.type] = p.value;
    });
    if (
      parts.year &&
      parts.month &&
      parts.day &&
      parts.hour != null &&
      parts.minute != null
    ) {
      return (
        parts.year +
        "-" +
        parts.month +
        "-" +
        parts.day +
        " " +
        parts.hour +
        ":" +
        parts.minute
      );
    }
    return "—";
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

  /** 경기 기록 탭: 내전 카드만(스크림·이벤트 미표시) · selectedAt=슬라이드 포커스(히스토리 기준) */
  function mockStatsIntraMatchCardHtml(m, cardIdx, selectedAt) {
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
    var cardCls = "mock-stats-match-card";
    if (selectedAt && m.at === selectedAt) {
      cardCls += " mock-stats-match-card--selected";
    }
    return (
      '<article class="' +
      cardCls +
      '" data-mock-at="' +
      mockStatsEscapeHtml(m.at) +
      '" onclick="return window.mockStatsArchiveSelectAsOfFromCard(this)">' +
      '<div class="mock-stats-match-card-head">' +
      "<strong>" +
      mockStatsEscapeHtml(m.map) +
      "</strong>" +
      '<span style="color:var(--text-muted)"> · ' +
      mockStatsEscapeHtml(m.mapType) +
      "</span>" +
      '<span style="color:var(--text-muted);font-size:11px;margin-left:4px">' +
      mockStatsFormatDateTimeInStatsTz(m.at) +
      " KST</span>" +
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
    var asOfHtml = st.asOfNote
      ? '<p class="mock-stats-winrate-asof">' +
        mockStatsEscapeHtml(st.asOfNote) +
        "</p>"
      : "";
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
      asOfHtml +
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

  /**
   * 추가·삽입·삭제 후 캘린더가 예전 주/날짜에 고정되면 새 경기가 안 보이고 승률도 안 바뀜 → 최신 내전 날짜로 스냅
   */
  function mockStatsArchiveSnapToLatestIntraDay(intra) {
    if (!intra || intra.length === 0) {
      window.__mockStatsArchiveCal = null;
      window.__mockStatsArchiveAsOfAt = null;
      return;
    }
    var sorted = intra.slice().sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });
    var keyLatest = mockStatsDayKey(sorted[0].at);
    if (!window.__mockStatsArchiveCal) {
      window.__mockStatsArchiveCal = {};
    }
    window.__mockStatsArchiveCal.weekStartUtcMs =
      mockStatsUtcMondayMsFromDayKey(keyLatest);
    window.__mockStatsArchiveCal.selectedKey = keyLatest;
    window.__mockStatsArchiveAsOfAt = null;
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

  /** 클랜장만: 경기 추가·수정·삭제 */
  function mockStatsArchiveLeaderToolbarHtml() {
    if (window.mockClanCurrentRole() !== "leader") return "";
    return (
      '<div class="mock-stats-archive-leader-toolbar">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="return window.mockStatsMatchModalOpen(\'add\')">추가</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="return window.mockStatsMatchModalOpen(\'edit\')">수정</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="return window.mockStatsLeaderIntraDelete()">삭제</button>' +
      '<span class="mock-stats-archive-leader-hint">승률 순위: 슬라이드에 보이는 경기 <strong>시점까지</strong> 누적 집계(히스토리). 카드 클릭 시 해당 경기로 슬라이드가 이동합니다. 추가·삭제 후에는 최신 내전이 있는 날짜로 캘린더가 맞춰집니다(목업).</span>' +
      "</div>"
    );
  }

  function mockStatsArchiveResolveSelMatchForDay(calSt, intraAsc, dayMatches, selAt) {
    var selMatch = null;
    if (dayMatches.length) {
      if (selAt) {
        selMatch = intraAsc.find(function (m) {
          return (
            m.at === selAt &&
            mockStatsDayKey(m.at) === calSt.selectedKey
          );
        });
      }
      if (!selMatch) {
        selMatch = dayMatches
          .slice()
          .sort(function (a, b) {
            return new Date(b.at) - new Date(a.at);
          })[0];
        window.__mockStatsArchiveAsOfAt = selMatch ? selMatch.at : null;
      }
    } else {
      window.__mockStatsArchiveAsOfAt = null;
    }
    return selMatch;
  }

  function mockStatsArchiveApplyWinrateState(selMatch, intraAsc, dateLbl) {
    var prefix = [];
    if (selMatch) {
      var ix = intraAsc.indexOf(selMatch);
      if (ix >= 0) prefix = intraAsc.slice(0, ix + 1);
    }
    var asOfNote = "";
    if (selMatch && selMatch.displayId != null) {
      asOfNote =
        "전체 내전 시간순 · " +
        String(selMatch.displayId) +
        "번째 경기까지 반영된 승률(히스토리)";
    }
    window.__mockStatsWinrateState = {
      rows: mockStatsLeaderboardRowsFromMatches(prefix),
      sortKey: "wrNum",
      sortDir: "desc",
      dateLabel: dateLbl,
      asOfNote: asOfNote,
    };
    var elWrAside = document.getElementById("mock-stats-archive-winrate");
    if (elWrAside) elWrAside.innerHTML = mockStatsWinrateBuildAsideHtml();
  }

  function mockStatsArchiveReadVisibleSliderAt() {
    var slider = document.getElementById("mock-stats-archive-slider");
    if (!slider) return null;
    var cards = slider.querySelectorAll(".mock-stats-match-card");
    if (!cards.length) return null;
    var w = slider.clientWidth;
    if (!w) return null;
    var idx = Math.round(slider.scrollLeft / w);
    if (idx < 0) idx = 0;
    if (idx >= cards.length) idx = cards.length - 1;
    var at = cards[idx].getAttribute("data-mock-at");
    return at || null;
  }

  function mockStatsArchiveApplyCardSelectionUi(at) {
    var slider = document.getElementById("mock-stats-archive-slider");
    if (!slider) return;
    var cards = slider.querySelectorAll(".mock-stats-match-card");
    Array.prototype.forEach.call(cards, function (c) {
      var cardAt = c.getAttribute("data-mock-at");
      if (at && cardAt === at) {
        c.classList.add("mock-stats-match-card--selected");
      } else {
        c.classList.remove("mock-stats-match-card--selected");
      }
    });
  }

  function mockStatsArchiveSyncAsOfFromSlider() {
    var at = mockStatsArchiveReadVisibleSliderAt();
    if (!at) return;
    if (at === window.__mockStatsArchiveAsOfAt) {
      mockStatsArchiveApplyCardSelectionUi(at);
      return;
    }
    window.__mockStatsArchiveAsOfAt = at;
    var list = mockStatsFiltered();
    var intraList = list.filter(function (m) {
      return m.type === "intra";
    });
    var calSt = window.__mockStatsArchiveCal;
    var intraAsc = intraList
      .slice()
      .sort(function (a, b) {
        return new Date(a.at) - new Date(b.at);
      });
    var selMatch = intraAsc.find(function (m) {
      return m.at === at;
    });
    var dateLbl = "";
    if (calSt && calSt.selectedKey) {
      dateLbl = mockStatsFormatDayHeadingFromKey(calSt.selectedKey);
    }
    mockStatsArchiveApplyWinrateState(selMatch, intraAsc, dateLbl);
    mockStatsArchiveApplyCardSelectionUi(at);
  }

  function mockStatsArchiveEnsureSliderScroll() {
    var el = document.getElementById("mock-stats-archive-slider");
    if (!el) return;
    var at = window.__mockStatsArchiveAsOfAt;
    var cards = el.querySelectorAll(".mock-stats-match-card");
    if (!cards.length) return;
    var w = el.clientWidth;
    if (!w) return;
    var idx = 0;
    if (at) {
      var i;
      for (i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute("data-mock-at") === at) {
          idx = i;
          break;
        }
      }
    }
    el.scrollLeft = idx * w;
  }

  function mockStatsArchiveBindSliderScroll() {
    var el = document.getElementById("mock-stats-archive-slider");
    if (!el) return;
    if (window.__mockStatsArchiveSliderScrollHandler) {
      el.removeEventListener(
        "scroll",
        window.__mockStatsArchiveSliderScrollHandler,
      );
    }
    var t = null;
    window.__mockStatsArchiveSliderScrollHandler = function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        mockStatsArchiveSyncAsOfFromSlider();
      }, 60);
    };
    el.addEventListener(
      "scroll",
      window.__mockStatsArchiveSliderScrollHandler,
      { passive: true },
    );
    requestAnimationFrame(function () {
      mockStatsArchiveSyncAsOfFromSlider();
    });
  }

  /** 하단 좌측: 선택일 경기 슬라이더(날짜 머리글은 별도 #mock-stats-archive-day-heading) */
  function mockStatsArchiveBuildRecordHtml(intra) {
    var cal = window.__mockStatsArchiveCal;
    var prefix = mockStatsArchiveRecordPanelPrefix();
    if (intra.length === 0) {
      return (
        prefix +
        mockStatsArchiveLeaderToolbarHtml() +
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
        mockStatsArchiveLeaderToolbarHtml() +
        mockStatsArchiveWrapRecordBody(
          '<p class="mock-stats-footnote" style="margin:0">선택한 날짜에 내전이 없습니다.</p>',
          true,
        )
      );
    }
    var selAt = window.__mockStatsArchiveAsOfAt;
    return (
      prefix +
      mockStatsArchiveLeaderToolbarHtml() +
      mockStatsArchiveWrapRecordBody(
      '<div class="mock-stats-archive-slider-row">' +
        '<button type="button" class="mock-stats-archive-slider-btn" aria-label="이전 경기" onclick="return window.mockStatsArchiveSliderStep(-1)">‹</button>' +
        '<div id="mock-stats-archive-slider" class="mock-stats-archive-slider" tabindex="0">' +
        arr
          .map(function (m, idx) {
            return mockStatsIntraMatchCardHtml(m, idx, selAt);
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
    window.__mockStatsArchiveAsOfAt = null;
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
    window.__mockStatsArchiveAsOfAt = null;
    window.mockStatsRender();
    return false;
  };

  /** 카드 클릭: 해당 경기로 슬라이드 이동 → 스크롤 동기화로 히스토리·강조 반영 */
  window.mockStatsArchiveSelectAsOfFromCard = function (el) {
    var at = el && el.getAttribute("data-mock-at");
    if (!at) return false;
    var slider = document.getElementById("mock-stats-archive-slider");
    if (!slider) return false;
    var cards = slider.querySelectorAll(".mock-stats-match-card");
    var i;
    for (i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-mock-at") === at) {
        slider.scrollTo({
          left: i * slider.clientWidth,
          behavior: "smooth",
        });
        break;
      }
    }
    return false;
  };

  function mockStatsLeaderGuardOrAlert() {
    if (window.mockClanCurrentRole() !== "leader") {
      window.alert(
        "목업: 경기 추가·삽입·수정·삭제는 클랜장만 가능합니다. URL에 ?role=leader 를 넣거나 허브에서 역할을 클랜장으로 바꿔 주세요.",
      );
      return false;
    }
    return true;
  }

  function mockStatsMatchModalLocalPartsFromIso(iso) {
    var d = new Date(iso);
    return {
      date:
        d.getFullYear() +
        "-" +
        mockStatsPad2(d.getMonth() + 1) +
        "-" +
        mockStatsPad2(d.getDate()),
      time: mockStatsPad2(d.getHours()) + ":" + mockStatsPad2(d.getMinutes()),
    };
  }

  function mockStatsMatchModalLocalToIso(dateStr, timeStr) {
    var d = new Date(dateStr + "T" + timeStr + ":00");
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function mockStatsPatchRostersFromForm(m, bNames, rNames) {
    var roles = ["tank", "dps", "dps", "sup", "sup"];
    m.blueRoster = roles.map(function (r, j) {
      return { n: bNames[j], r: r };
    });
    m.redRoster = roles.map(function (r, j) {
      return { n: rNames[j], r: r };
    });
  }

  function mockStatsMatchModalEnsureOption(sel, value) {
    if (!sel || value == null || value === "") return;
    var ok = false;
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value === value) ok = true;
    });
    if (!ok) {
      var o = document.createElement("option");
      o.value = value;
      o.textContent = value;
      sel.appendChild(o);
    }
    sel.value = value;
  }

  /** 경기 모달 플레이어 풀(중복 제거) */
  function mockStatsMmPoolNamesUnique() {
    var seen = {};
    var out = [];
    function add(n) {
      if (!n || seen[n]) return;
      seen[n] = true;
      out.push(n);
    }
    MOCK_STATS_POOL_BLUE.forEach(add);
    MOCK_STATS_POOL_RED.forEach(add);
    [
      "하지",
      "크리스탈",
      "DORAE",
      "ABEL",
      "카페못간카페모카",
      "냥이의비행",
      "수라",
    ].forEach(add);
    return out;
  }

  function mockStatsMatchModalBuildPoolGrid() {
    var grid = document.getElementById("msm-pool-grid");
    if (!grid) return;
    var names = mockStatsMmPoolNamesUnique();
    grid.innerHTML = "";
    names.forEach(function (name, order) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mock-balance-pool-chip";
      btn.setAttribute("data-name", name);
      btn.setAttribute("data-order", String(order));
      btn.textContent = name;
      btn.onclick = function () {
        return window.mockStatsMmChipClick(btn);
      };
      grid.appendChild(btn);
    });
    var sortEl = document.getElementById("msm-pool-sort");
    if (sortEl) sortEl.value = "recent";
    var searchEl = document.getElementById("msm-pool-search");
    if (searchEl) searchEl.value = "";
    mockStatsMmApplyPoolChipVisibility();
  }

  /** 슬롯에 올라간 닉(표시 문자열) 집합 — 풀 칩 숨김에 사용 */
  function mockStatsMmGetAssignedNicks() {
    var assigned = {};
    var sides = ["b", "r"];
    var si, sj;
    for (si = 0; si < sides.length; si++) {
      for (sj = 0; sj < 5; sj++) {
        var el = document.getElementById("msm-nick-" + sides[si] + sj);
        if (!el) continue;
        var t = (el.textContent || "").trim();
        if (t && t !== "—") assigned[t] = true;
      }
    }
    return assigned;
  }

  /** 배치된 닉은 풀에서 숨김 + 검색어와 함께 필터 */
  function mockStatsMmApplyPoolChipVisibility() {
    var grid = document.getElementById("msm-pool-grid");
    if (!grid) return;
    var assigned = mockStatsMmGetAssignedNicks();
    var searchEl = document.getElementById("msm-pool-search");
    var q = (searchEl && searchEl.value ? searchEl.value : "")
      .trim()
      .toLowerCase();
    Array.prototype.forEach.call(
      grid.querySelectorAll(".mock-balance-pool-chip"),
      function (btn) {
        var dn = (btn.getAttribute("data-name") || "").trim();
        var lab = (btn.textContent || "").trim();
        var taken =
          (dn !== "" && assigned[dn]) || (lab !== "" && assigned[lab]);
        if (taken) {
          btn.hidden = true;
          btn.classList.remove("mock-stats-mm-chip-picked");
          return;
        }
        if (q) {
          var n = dn.toLowerCase();
          var t = lab.toLowerCase();
          btn.hidden = !(n.indexOf(q) >= 0 || t.indexOf(q) >= 0);
        } else {
          btn.hidden = false;
        }
      },
    );
    var pn = window.__msmPendingNick;
    if (pn != null && String(pn).trim() !== "") {
      var p = String(pn).trim();
      if (assigned[p]) window.__msmPendingNick = null;
    }
  }

  function mockStatsMmSetSlotNick(side, idx, name) {
    var el = document.getElementById("msm-nick-" + side + idx);
    if (!el) return;
    var t = name && String(name).trim() !== "" ? String(name).trim() : "—";
    el.textContent = t;
    if (t === "—") el.classList.add("mock-stats-mm-nick--empty");
    else el.classList.remove("mock-stats-mm-nick--empty");
    mockStatsMmApplyPoolChipVisibility();
  }

  function mockStatsMatchModalSyncMapTypeLabel(mapTypeFallback) {
    var sm = document.getElementById("msm-map");
    var el = document.getElementById("msm-maptype-display");
    if (!el) return;
    var mapName = sm && sm.value ? sm.value : "";
    if (mapName && MOCK_STATS_MAP_META[mapName] != null) {
      el.textContent = MOCK_STATS_MAP_META[mapName];
      return;
    }
    if (mapTypeFallback != null && String(mapTypeFallback).trim() !== "") {
      el.textContent = String(mapTypeFallback).trim();
      return;
    }
    el.textContent = mockStatsMapTypeForMap(mapName);
  }

  function mockStatsMatchModalFillSelects() {
    var sm = document.getElementById("msm-map");
    if (!sm) return;
    sm.innerHTML = "";
    MOCK_STATS_MAP_OPTIONS.forEach(function (name) {
      var o = document.createElement("option");
      o.value = name;
      o.textContent = name;
      sm.appendChild(o);
    });
    sm.onchange = function () {
      mockStatsMatchModalSyncMapTypeLabel();
    };
    mockStatsMatchModalSyncMapTypeLabel();
    mockStatsMatchModalBuildPoolGrid();
  }

  function mockStatsMatchModalSetDefaultRosters() {
    var k;
    for (k = 0; k < 5; k++) {
      mockStatsMmSetSlotNick("b", k, MOCK_STATS_POOL_BLUE[k]);
      mockStatsMmSetSlotNick("r", k, MOCK_STATS_POOL_RED[k]);
    }
  }

  window.mockStatsMmSetWinner = function (side) {
    var blue = document.getElementById("msm-win-blue");
    var red = document.getElementById("msm-win-red");
    var draw = document.getElementById("msm-win-draw");
    var btnB = document.getElementById("msm-btn-win-blue");
    var btnR = document.getElementById("msm-btn-win-red");
    var btnD = document.getElementById("msm-btn-win-draw");
    function clearOn() {
      if (btnB) btnB.classList.remove("mock-stats-mm-win--on");
      if (btnR) btnR.classList.remove("mock-stats-mm-win--on");
      if (btnD) btnD.classList.remove("mock-stats-mm-win--on");
    }
    if (side === "red") {
      if (red) red.checked = true;
      clearOn();
      if (btnR) btnR.classList.add("mock-stats-mm-win--on");
    } else if (side === "draw") {
      if (draw) draw.checked = true;
      clearOn();
      if (btnD) btnD.classList.add("mock-stats-mm-win--on");
    } else {
      if (blue) blue.checked = true;
      clearOn();
      if (btnB) btnB.classList.add("mock-stats-mm-win--on");
    }
    return false;
  };

  window.mockStatsMmChipClick = function (btn) {
    if (btn && btn.hidden) return false;
    var grid = document.getElementById("msm-pool-grid");
    if (grid) {
      Array.prototype.forEach.call(
        grid.querySelectorAll(".mock-balance-pool-chip"),
        function (b) {
          b.classList.remove("mock-stats-mm-chip-picked");
        },
      );
    }
    if (btn) btn.classList.add("mock-stats-mm-chip-picked");
    window.__msmPendingNick = btn
      ? btn.getAttribute("data-name") || (btn.textContent || "").trim()
      : null;
    return false;
  };

  window.mockStatsMmSlotClick = function (side, idx) {
    var el = document.getElementById("msm-nick-" + side + idx);
    if (!el) return false;
    var nick = window.__msmPendingNick;
    if (nick) {
      el.textContent = nick;
      el.classList.remove("mock-stats-mm-nick--empty");
      var grid = document.getElementById("msm-pool-grid");
      if (grid) {
        Array.prototype.forEach.call(
          grid.querySelectorAll(".mock-balance-pool-chip"),
          function (b) {
            b.classList.remove("mock-stats-mm-chip-picked");
          },
        );
      }
      window.__msmPendingNick = null;
    } else {
      el.textContent = "—";
      el.classList.add("mock-stats-mm-nick--empty");
    }
    mockStatsMmApplyPoolChipVisibility();
    return false;
  };

  window.mockStatsMmPoolFilter = function () {
    mockStatsMmApplyPoolChipVisibility();
  };

  window.mockStatsMmPoolSort = function (sel) {
    var grid = document.getElementById("msm-pool-grid");
    if (!grid || !sel) return false;
    var chips = Array.prototype.slice.call(
      grid.querySelectorAll(".mock-balance-pool-chip"),
    );
    var v = sel.value;
    var sorted = chips.slice();
    if (v === "name") {
      sorted.sort(function (a, b) {
        var na = (a.getAttribute("data-name") || "").toLowerCase();
        var nb = (b.getAttribute("data-name") || "").toLowerCase();
        return na.localeCompare(nb, "ko");
      });
    } else {
      sorted.sort(function (a, b) {
        return (
          parseInt(a.getAttribute("data-order") || "0", 10) -
          parseInt(b.getAttribute("data-order") || "0", 10)
        );
      });
    }
    sorted.forEach(function (c) {
      grid.appendChild(c);
    });
    mockStatsMmApplyPoolChipVisibility();
    return false;
  };

  function mockStatsMatchModalFillFromMatch(m) {
    var parts = mockStatsMatchModalLocalPartsFromIso(m.at);
    document.getElementById("msm-date").value = parts.date;
    document.getElementById("msm-time").value = parts.time;
    mockStatsMatchModalEnsureOption(document.getElementById("msm-map"), m.map);
    mockStatsMatchModalSyncMapTypeLabel(m.mapType);
    if (m.winner === "red") mockStatsMmSetWinner("red");
    else if (m.winner === "blue") mockStatsMmSetWinner("blue");
    else mockStatsMmSetWinner("draw");
    var br = m.blueRoster || [];
    var rr = m.redRoster || [];
    var j;
    for (j = 0; j < 5; j++) {
      mockStatsMmSetSlotNick(
        "b",
        j,
        br[j] && br[j].n ? br[j].n : "—",
      );
      mockStatsMmSetSlotNick(
        "r",
        j,
        rr[j] && rr[j].n ? rr[j].n : "—",
      );
    }
  }

  function mockStatsMatchModalReadSlotNicks() {
    var bNames = [];
    var rNames = [];
    var i;
    for (i = 0; i < 5; i++) {
      var eb = document.getElementById("msm-nick-b" + i);
      var er = document.getElementById("msm-nick-r" + i);
      bNames.push(
        eb && (eb.textContent || "").trim() !== "—"
          ? (eb.textContent || "").trim()
          : "",
      );
      rNames.push(
        er && (er.textContent || "").trim() !== "—"
          ? (er.textContent || "").trim()
          : "",
      );
    }
    return { bNames: bNames, rNames: rNames };
  }

  window.mockStatsMatchModalClose = function () {
    window.__msmPendingNick = null;
    var grid = document.getElementById("msm-pool-grid");
    if (grid) {
      Array.prototype.forEach.call(
        grid.querySelectorAll(".mock-balance-pool-chip"),
        function (b) {
          b.classList.remove("mock-stats-mm-chip-picked");
        },
      );
    }
    var modal = document.getElementById("mock-stats-match-modal");
    if (!modal) return;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
  };

  window.mockStatsMatchModalOpen = function (mode) {
    if (!mockStatsLeaderGuardOrAlert()) return false;
    if (mode === "edit") {
      var atEdit =
        mockStatsArchiveReadVisibleSliderAt() ||
        window.__mockStatsArchiveAsOfAt;
      if (!atEdit) {
        window.alert(
          "목업: 캘린더에서 날짜를 고르고, 슬라이드에 보이는 내전을 수정합니다.",
        );
        return false;
      }
      window.__mockStatsArchiveAsOfAt = atEdit;
    }
    var modal = document.getElementById("mock-stats-match-modal");
    if (!modal) return false;
    document.getElementById("msm-mode").value = mode;
    var hint = document.getElementById("msm-mode-hint");
    if (mode === "edit") {
      hint.textContent =
        "선택한 경기 수정 · 확인을 누르면 요약 후 한 번 더 확인합니다.";
    } else {
      hint.textContent =
        "새 내전을 등록합니다. 저장 후 경기 목록은 시각 기준 최신순으로 정렬됩니다(목업).";
    }
    mockStatsMatchModalFillSelects();
    window.__msmPendingNick = null;
    if (mode === "edit") {
      var mEdit = CLAN_STATS_MATCHES.find(function (x) {
        return x.at === window.__mockStatsArchiveAsOfAt;
      });
      if (!mEdit || mEdit.type !== "intra") {
        window.alert("목업: 내전만 수정할 수 있습니다.");
        return false;
      }
      document.getElementById("msm-edit-at").value = mEdit.at;
      mockStatsMatchModalFillFromMatch(mEdit);
    } else {
      document.getElementById("msm-edit-at").value = "";
      var now = new Date();
      var parts = mockStatsMatchModalLocalPartsFromIso(now.toISOString());
      document.getElementById("msm-date").value = parts.date;
      document.getElementById("msm-time").value = parts.time;
      mockStatsMmSetWinner("blue");
      mockStatsMatchModalSetDefaultRosters();
    }
    document.getElementById("msm-title").textContent =
      mode === "edit" ? "내전 경기 수정" : "내전 경기 추가";
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    return false;
  };

  window.mockStatsMatchModalSubmit = function () {
    if (!mockStatsLeaderGuardOrAlert()) return false;
    var mode = document.getElementById("msm-mode").value;
    var dateStr = document.getElementById("msm-date").value;
    var timeStr = document.getElementById("msm-time").value;
    if (!dateStr || !timeStr) {
      window.alert("목업: 날짜와 시각을 입력해 주세요.");
      return false;
    }
    var iso = mockStatsMatchModalLocalToIso(dateStr, timeStr);
    if (!iso) {
      window.alert("목업: 날짜·시각이 올바르지 않습니다.");
      return false;
    }
    var map = document.getElementById("msm-map").value;
    var mapType = mockStatsMapTypeForMap(map);
    var wEl = document.querySelector('input[name="msm-winner"]:checked');
    var winner =
      wEl && wEl.value === "red"
        ? "red"
        : wEl && wEl.value === "draw"
          ? null
          : "blue";
    var rosters = mockStatsMatchModalReadSlotNicks();
    var bNames = rosters.bNames;
    var rNames = rosters.rNames;
    var i;
    for (i = 0; i < 5; i++) {
      if (!bNames[i] || !rNames[i]) {
        window.alert(
          "목업: 블루·레드 각 5슬롯에 닉네임을 모두 채워 주세요. (칩 선택 후 슬롯 클릭)",
        );
        return false;
      }
    }
    var summary =
      "날짜·시각: " +
      dateStr +
      " " +
      timeStr +
      "\n맵 / 모드: " +
      map +
      " / " +
      mapType +
      "\n승패: " +
      (winner === "blue"
        ? "블루 승"
        : winner === "red"
          ? "레드 승"
          : "무승부") +
      "\n블루: " +
      bNames.join(", ") +
      "\n레드: " +
      rNames.join(", ");
    if (!window.confirm("목업: 아래 내용으로 반영할까요?\n\n" + summary)) {
      return false;
    }
    if (mode === "add") {
      var newMatch = {
        at: iso,
        type: "intra",
        map: map,
        mapType: mapType,
        winner: winner,
      };
      CLAN_STATS_MATCHES.push(newMatch);
      mockStatsSortMatchesDescending();
      mockStatsFillRosters(CLAN_STATS_MATCHES);
      var mNew = CLAN_STATS_MATCHES.find(function (x) {
        return x.at === iso;
      });
      if (mNew) mockStatsPatchRostersFromForm(mNew, bNames, rNames);
    } else {
      var origAt = document.getElementById("msm-edit-at").value;
      var m = CLAN_STATS_MATCHES.find(function (x) {
        return x.at === origAt;
      });
      if (!m) {
        window.alert("목업: 경기를 찾을 수 없습니다.");
        return false;
      }
      m.at = iso;
      m.map = map;
      m.mapType = mapType;
      m.winner = winner;
      mockStatsSortMatchesDescending();
      mockStatsFillRosters(CLAN_STATS_MATCHES);
      mockStatsPatchRostersFromForm(m, bNames, rNames);
    }
    mockStatsArchiveSnapToLatestIntraDay(
      CLAN_STATS_MATCHES.filter(function (m) {
        return m.type === "intra";
      }),
    );
    window.mockStatsMatchModalClose();
    window.mockStatsRender();
    window.alert("목업: 반영했습니다.");
    return false;
  };

  window.mockStatsLeaderIntraAdd = function () {
    return window.mockStatsMatchModalOpen("add");
  };

  window.mockStatsLeaderIntraEdit = function () {
    return window.mockStatsMatchModalOpen("edit");
  };

  window.mockStatsLeaderIntraDelete = function () {
    if (!mockStatsLeaderGuardOrAlert()) return false;
    var at =
      mockStatsArchiveReadVisibleSliderAt() ||
      window.__mockStatsArchiveAsOfAt;
    if (!at) {
      window.alert(
        "목업: 캘린더에서 날짜를 고르고, 슬라이드에 보이는 내전을 삭제합니다.",
      );
      return false;
    }
    window.__mockStatsArchiveAsOfAt = at;
    var idx = CLAN_STATS_MATCHES.findIndex(function (m) {
      return m.at === at;
    });
    if (idx < 0) return false;
    if (!window.confirm("목업: 이 경기를 삭제할까요?")) return false;
    CLAN_STATS_MATCHES.splice(idx, 1);
    mockStatsSortMatchesDescending();
    mockStatsFillRosters(CLAN_STATS_MATCHES);
    mockStatsArchiveSnapToLatestIntraDay(
      CLAN_STATS_MATCHES.filter(function (m) {
        return m.type === "intra";
      }),
    );
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

  /** 상단 탭: 요약 / 명예의 전당 / 경기 기록(운영진+) / 앱 이용 — main-game 클랜 순위 탭과 동일 패턴(hidden + .on) */
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

  /** 앱 이용 탭 · 내전 순 참여 인원: 월간 / 연간 그래프 전환 */
  window.mockStatsIntraPartSetTab = function (btn, name) {
    var isYear = name === "year";
    document.querySelectorAll("[data-intra-part-tab]").forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("mock-tab-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-intra-part-panel]").forEach(function (p) {
      var match = p.getAttribute("data-intra-part-panel") === (isYear ? "year" : "month");
      if (match) p.removeAttribute("hidden");
      else p.setAttribute("hidden", "");
    });
    return false;
  };

  /** 앱 이용 탭 · 내전 경기 횟수: 월간 / 연간 그래프 전환 */
  window.mockStatsIntraMatchSetTab = function (btn, name) {
    var isYear = name === "year";
    document.querySelectorAll("[data-intra-match-tab]").forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("mock-tab-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-intra-match-panel]").forEach(function (p) {
      var match = p.getAttribute("data-intra-match-panel") === (isYear ? "year" : "month");
      if (match) p.removeAttribute("hidden");
      else p.setAttribute("hidden", "");
    });
    return false;
  };

  /** 앱 이용 탭 · 맵 이용률: 월간 / 연간 표 전환 */
  window.mockStatsMapUsageSetTab = function (btn, name) {
    var isYear = name === "year";
    document.querySelectorAll("[data-map-usage-tab]").forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("mock-tab-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-map-usage-panel]").forEach(function (p) {
      var match = p.getAttribute("data-map-usage-panel") === (isYear ? "year" : "month");
      if (match) p.removeAttribute("hidden");
      else p.setAttribute("hidden", "");
    });
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

    var elCal = document.getElementById("mock-stats-archive-cal-root");
    var elRec = document.getElementById("mock-stats-archive-slider-root");
    var elDayHeading = document.getElementById("mock-stats-archive-day-heading");
    var elWrAside = document.getElementById("mock-stats-archive-winrate");
    var intraList = list.filter(function (m) {
      return m.type === "intra";
    });
    if (window.mockClanCurrentRole() !== "member") {
      mockStatsArchivePrepareState(intraList);
      var calSt = window.__mockStatsArchiveCal;
      var intraAsc = intraList
        .slice()
        .sort(function (a, b) {
          return new Date(a.at) - new Date(b.at);
        });
      var dayMatches = [];
      var dateLbl = "";
      if (calSt && calSt.selectedKey) {
        dateLbl = mockStatsFormatDayHeadingFromKey(calSt.selectedKey);
        dayMatches = intraList.filter(function (m) {
          return mockStatsDayKey(m.at) === calSt.selectedKey;
        });
      }
      mockStatsArchiveResolveSelMatchForDay(
        calSt,
        intraAsc,
        dayMatches,
        window.__mockStatsArchiveAsOfAt,
      );
      if (elCal) elCal.innerHTML = mockStatsArchiveBuildCalHtml(intraList);
      if (elRec) elRec.innerHTML = mockStatsArchiveBuildRecordHtml(intraList);
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
      var selMatch = intraAsc.find(function (m) {
        return m.at === window.__mockStatsArchiveAsOfAt;
      });
      mockStatsArchiveApplyWinrateState(selMatch, intraAsc, dateLbl);
      if (elRec) {
        requestAnimationFrame(function () {
          mockStatsArchiveEnsureSliderScroll();
          mockStatsArchiveBindSliderScroll();
        });
      }
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

    var elHof = document.getElementById("mock-stats-hof-root");
    if (elHof) {
      mockStatsHofEnsureState(intraList);
      mockStatsHofClampYear(intraList);
      mockStatsHofClampMonthKey(intraList);
      elHof.innerHTML = mockStatsHofBuildRootHtml(intraList);
    }
  };

  /** 클랜 관리 — 구독(localStorage) · 구성원 검색/페이지네이션 · 개인 기록 상세 · 활성도 분류(D-CLAN-07) */
  var MOCK_MMEMBER_OVERRIDES_KEY = "clansync-mock-mmgr-member-overrides-v1";
  /** D-CLAN-07: 체크박스로 일괄 강퇴된(=status='left') 휴면 멤버 id 집합 */
  var MOCK_KICKED_DORMANT_KEY = "clansync-mock-manage-kicked-dormant-v1";
  /** D-CLAN-07: 신규 휴면 진입 알림 배너 닫기 여부 (세션 단위) */
  var MOCK_DORMANT_BANNER_KEY = "clansync-mock-manage-dormant-banner-dismissed-v1";
  /** D-CLAN-07: 활성 <30d / 비활성 30~60d / 휴면 60d+ */
  var MOCK_ACTIVITY_THRESHOLD_INACTIVE = 30;
  var MOCK_ACTIVITY_THRESHOLD_DORMANT = 60;
  /** D-CLAN-07: 클랜 인원 한도 (D-CLAN-06 Free·Premium 동일 200, 이 목업 클랜은 30명) */
  var MOCK_CLAN_MAX_MEMBERS = 30;
  var __mockManageMembersState = {
    page: 1,
    pageSize: 5,
    search: "",
    /** D-CLAN-07: 활성/비활성 테이블 필터 (all/active/inactive) */
    activityFilter: "all",
    /** D-CLAN-07: 휴면 섹션 접힘 여부 */
    dormantCollapsed: true,
    /** D-CLAN-07: 휴면 섹션 페이지 */
    dormantPage: 1,
    /** D-CLAN-07: 휴면 섹션 선택된 멤버 id 집합 */
    dormantSelected: Object.create(null),
  };
  var __mockManageMemberDetailId = null;

  function mockClassifyActivity(daysSince) {
    var d = Number(daysSince);
    if (!(d >= 0)) return "active";
    if (d < MOCK_ACTIVITY_THRESHOLD_INACTIVE) return "active";
    if (d < MOCK_ACTIVITY_THRESHOLD_DORMANT) return "inactive";
    return "dormant";
  }

  /** D-CLAN-07: 활성도 배지 SVG (ui-ic · stroke 기반 · currentColor 상속) */
  var MOCK_ACTIVITY_ICON = {
    active:
      '<span class="ui-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path></svg></span>',
    inactive:
      '<span class="ui-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span>',
    dormant:
      '<span class="ui-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg></span>',
  };

  function mockActivityBadgeHtml(activity) {
    if (activity === "active") {
      return (
        '<span class="mock-activity-badge mock-activity-active" title="최근 30일 내 활동">' +
        MOCK_ACTIVITY_ICON.active +
        " 활성</span>"
      );
    }
    if (activity === "inactive") {
      return (
        '<span class="mock-activity-badge mock-activity-inactive" title="30~60일 무활동">' +
        MOCK_ACTIVITY_ICON.inactive +
        " 비활성</span>"
      );
    }
    return (
      '<span class="mock-activity-badge mock-activity-dormant" title="60일+ 무활동">' +
      MOCK_ACTIVITY_ICON.dormant +
      " 휴면</span>"
    );
  }

  function mockLoadKickedDormant() {
    try {
      var raw = localStorage.getItem(MOCK_KICKED_DORMANT_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }

  function mockSaveKickedDormant(arr) {
    try {
      localStorage.setItem(MOCK_KICKED_DORMANT_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function mockIsKickedDormant(id) {
    return mockLoadKickedDormant().indexOf(id) !== -1;
  }

  function mockAddKickedDormant(ids) {
    var cur = mockLoadKickedDormant();
    for (var i = 0; i < ids.length; i++) {
      if (cur.indexOf(ids[i]) === -1) cur.push(ids[i]);
    }
    mockSaveKickedDormant(cur);
  }

  function mockIsDormantBannerDismissed() {
    try {
      return sessionStorage.getItem(MOCK_DORMANT_BANNER_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function mockSetDormantBannerDismissed(v) {
    try {
      if (v) sessionStorage.setItem(MOCK_DORMANT_BANNER_KEY, "1");
      else sessionStorage.removeItem(MOCK_DORMANT_BANNER_KEY);
    } catch (e) {}
  }

  var MOCK_MANAGE_MEMBERS = [
    {
      id: "kim",
      nick: "김클랜",
      gameId: "Kim#1000",
      role: "leader",
      joined: "2025.01.15",
      last: "4/19",
      daysSince: 1,
      donation: "1,200",
      medals: ["창단 멤버"],
      mScores: { tank: 1.1, dps: 0.9, heal: 0.7 },
      record: null,
    },
    {
      id: "pro",
      nick: "이프로",
      gameId: "Pro#2000",
      role: "officer",
      joined: "2025.02.01",
      last: "4/16",
      daysSince: 4,
      donation: "400",
      medals: ["밸런스장"],
      mScores: { tank: 0.9, dps: 1.2, heal: 0.5 },
      profileSubAccount: "ProAlt#2222",
      record: null,
    },
    {
      id: "heal",
      nick: "박힐러",
      gameId: "Heal#3000",
      role: "member",
      joined: "2025.06.10",
      last: "4/07",
      daysSince: 13,
      donation: "0",
      medals: ["개근왕 후보"],
      mScores: { tank: 0.4, dps: 0.3, heal: 1.0 },
      record: null,
    },
    {
      id: "abel",
      nick: "ABEL",
      gameId: "ABEL#0001",
      role: "member",
      joined: "2025.06.10",
      last: "4/15",
      daysSince: 5,
      donation: "320",
      medals: ["맵장인", "예측왕"],
      mScores: { tank: 1.0, dps: 0.85, heal: 0.62 },
      record: {
        briefing: false,
        subAccount: "",
        firstIntra: "2025년 06월 10일",
        lastIntra: "2026년 03월 24일",
        maps: [
          { map: "네팔 (Nepal)", w: 1, d: 0, l: 3, rd: 4, pct: 25 },
          { map: "눔바니 (Numbani)", w: 0, d: 0, l: 1, rd: 1, pct: 0 },
          { map: "도라도 (Dorado)", w: 1, d: 0, l: 1, rd: 2, pct: 50 },
        ],
        roles: [
          { code: "D (딜)", w: 4, d: 0, l: 12, rd: 16, pct: 25 },
          { code: "T (탱)", w: 2, d: 0, l: 3, rd: 5, pct: 40 },
          { code: "H (힐)", w: 1, d: 0, l: 2, rd: 3, pct: 33 },
        ],
        synergy: [
          { name: "김정태", rd: 33, pct: 48 },
          { name: "PICTURE", rd: 19, pct: 26 },
          { name: "냥이의비행", rd: 14, pct: 36 },
          { name: "라인히터", rd: 11, pct: 45 },
        ],
      },
    },
    {
      id: "m1",
      nick: "냥이의비행",
      gameId: "Cat#4400",
      role: "member",
      joined: "2025.03.01",
      last: "4/12",
      daysSince: 8,
      donation: "50",
      medals: [],
      mScores: { tank: 0.8, dps: 0.9, heal: 0.4 },
      record: null,
    },
    {
      id: "m2",
      nick: "아재",
      gameId: "Ajae#5500",
      role: "member",
      joined: "2025.04.12",
      last: "3/16",
      daysSince: 35,
      donation: "0",
      medals: ["분위기 메이커"],
      mScores: { tank: 0.7, dps: 0.75, heal: 0.6 },
      record: null,
    },
    {
      id: "m3",
      nick: "초보만",
      gameId: "Rookie#6600",
      role: "member",
      joined: "2025.07.20",
      last: "3/14",
      daysSince: 37,
      donation: "100",
      medals: [],
      mScores: { tank: 0.5, dps: 0.5, heal: 0.5 },
      record: null,
    },
    {
      id: "m4",
      nick: "라인히터",
      gameId: "Line#7700",
      role: "member",
      joined: "2025.08.05",
      last: "3/05",
      daysSince: 46,
      donation: "0",
      medals: ["딜견"],
      mScores: { tank: 0.3, dps: 1.1, heal: 0.2 },
      record: null,
    },
    {
      id: "m5",
      nick: "메르시메인",
      gameId: "Mercy#8800",
      role: "member",
      joined: "2025.09.01",
      last: "2/28",
      daysSince: 51,
      donation: "200",
      medals: ["힐 딜러"],
      mScores: { tank: 0.4, dps: 0.4, heal: 1.05 },
      record: null,
    },
    {
      id: "m6",
      nick: "솔져장인",
      gameId: "Soldier#9900",
      role: "member",
      joined: "2025.10.10",
      last: "2/13",
      daysSince: 66,
      donation: "0",
      medals: [],
      mScores: { tank: 0.8, dps: 0.95, heal: 0.35 },
      record: null,
      dormantNewlyEntered: true,
    },
    {
      id: "m7",
      nick: "윈스턴킹",
      gameId: "Winston#1010",
      role: "member",
      joined: "2025.11.01",
      last: "1/30",
      daysSince: 80,
      donation: "80",
      medals: ["돌진"],
      mScores: { tank: 1.15, dps: 0.4, heal: 0.3 },
      record: null,
    },
    {
      id: "m8",
      nick: "나노블레이드",
      gameId: "Nano#2020",
      role: "member",
      joined: "2026.01.05",
      last: "12/20",
      daysSince: 121,
      donation: "0",
      medals: ["신입"],
      mScores: { tank: 0.55, dps: 0.88, heal: 0.42 },
      record: null,
    },
  ];

  function mockManageSubscribeDefaultState() {
    return {
      plan: "premium",
      payments: [
        {
          at: "2025-06-01T10:00:00",
          amount: "₩9,900",
          method: "카드",
          status: "완료",
        },
        {
          at: "2025-07-01T10:00:00",
          amount: "₩9,900",
          method: "카드",
          status: "완료",
        },
      ],
    };
  }

  function mockManageSubscribeLoadState() {
    try {
      var raw = localStorage.getItem(MOCK_SUBSCRIBE_STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.payments)) {
          if (o.plan !== "premium" && o.plan !== "free") {
            o.plan = o.payments.length > 0 ? "premium" : "free";
            try {
              localStorage.setItem(MOCK_SUBSCRIBE_STORAGE_KEY, JSON.stringify(o));
            } catch (eMig) {}
          }
          return o;
        }
      }
    } catch (e) {}
    return mockManageSubscribeDefaultState();
  }

  function mockManageSubscribeSaveState(st) {
    try {
      localStorage.setItem(MOCK_SUBSCRIBE_STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  /** 목업: 구독 플랜만 전환(URL ?plan= 없을 때 밸런스·대시보드 Premium UI 반영) */
  window.mockManageSubscribeSetPlan = function (plan) {
    var p = plan === "premium" ? "premium" : "free";
    var st = mockManageSubscribeLoadState();
    st.plan = p;
    mockManageSubscribeSaveState(st);
    applyPlanBodyClass();
    if (typeof window.mockManageSubscribeRender === "function") {
      window.mockManageSubscribeRender();
    }
    return false;
  };

  function mockManageSubscribeFormatAt(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  window.mockManageSubscribeRender = function () {
    var sum = document.getElementById("mock-manage-subscribe-plan-summary");
    var tb = document.getElementById("mock-manage-subscribe-payments-tbody");
    if (!sum || !tb) return false;
    var plan =
      typeof window.mockClanCurrentPlan === "function"
        ? window.mockClanCurrentPlan()
        : "free";
    var isPrem = plan === "premium";
    sum.innerHTML =
      "<div><strong>현재 플랜</strong> · " +
      (isPrem
        ? '<span style="color:#fcd34d">Premium</span> — AI 밸런스·승부예측·OCR 등 전체 기능'
        : '<span>Free</span> — 기본 통계·밸런스(일부 제한)') +
      "</div>" +
      (isPrem
        ? '<div style="margin-top:8px"><strong>다음 결제 예정</strong> · 목업 기준 매월 1일 · ₩9,900 (VAT 포함 가능)</div>'
        : '<div style="margin-top:8px;color:var(--text-muted)">Free 플랜입니다. Premium 전환 시 아래 결제 기록에 새 항목이 쌓이도록 목업할 수 있습니다.</div>');
    var st = mockManageSubscribeLoadState();
    tb.innerHTML = st.payments
      .map(function (p) {
        return (
          "<tr><td>" +
          mockManageSubscribeFormatAt(p.at) +
          "</td><td style=\"text-align:right\">" +
          (p.amount || "—") +
          "</td><td>" +
          (p.method || "—") +
          "</td><td>" +
          (p.status || "—") +
          "</td></tr>"
        );
      })
      .join("");
    return false;
  };

  /** 외부에서 클랜 관리·구독결제 탭으로 전환 (모달 대신 본문) */
  window.mockManageSubscribeOpen = function () {
    var manageLink = document.querySelector('a.clan-nav[href="#manage"]');
    if (manageLink && typeof window.clanGo === "function") {
      window.clanGo("manage", manageLink);
    }
    window.setTimeout(function () {
      var tabBtn = document.querySelector('[data-manage-tab="subscribe"]');
      if (tabBtn) {
        window.mockManageSetTab(tabBtn, "subscribe");
      } else if (typeof window.mockManageSubscribeRender === "function") {
        window.mockManageSubscribeRender();
      }
    }, 0);
    return false;
  };

  window.mockManageSubscribeClose = function () {
    return false;
  };

  window.mockManageSubscribeAddMockPayment = function () {
    var st = mockManageSubscribeLoadState();
    st.payments = st.payments || [];
    st.plan = "premium";
    var now = new Date().toISOString();
    st.payments.unshift({
      at: now,
      amount: "₩9,900",
      method: "카드",
      status: "완료",
    });
    mockManageSubscribeSaveState(st);
    applyPlanBodyClass();
    var tb = document.getElementById("mock-manage-subscribe-payments-tbody");
    if (tb) {
      tb.innerHTML =
        st.payments
          .map(function (p) {
            return (
              "<tr><td>" +
              mockManageSubscribeFormatAt(p.at) +
              "</td><td style=\"text-align:right\">" +
              (p.amount || "—") +
              "</td><td>" +
              (p.method || "—") +
              "</td><td>" +
              (p.status || "—") +
              "</td></tr>"
            );
          })
          .join("");
    }
    return false;
  };

  /** D-CLAN-07: 강퇴되지 않은 모든 현역 멤버 (활성/비활성/휴면 모두 포함). 검색·활성도 필터 미적용. */
  function mockManageMembersAllLiving() {
    return MOCK_MANAGE_MEMBERS.filter(function (m) {
      return !mockIsKickedDormant(m.id);
    });
  }

  /** 활성 + 비활성 테이블용 목록 (검색 + activityFilter 반영). 휴면은 여기서 제외. */
  function mockManageMembersFilterList() {
    var q = (__mockManageMembersState.search || "").trim().toLowerCase();
    var f = __mockManageMembersState.activityFilter || "all";
    return mockManageMembersAllLiving().filter(function (m) {
      var activity = mockClassifyActivity(m.daysSince);
      if (activity === "dormant") return false;
      if (f === "active" && activity !== "active") return false;
      if (f === "inactive" && activity !== "inactive") return false;
      if (!q) return true;
      return (
        (m.nick && m.nick.toLowerCase().indexOf(q) !== -1) ||
        (m.gameId && m.gameId.toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  /** 휴면 섹션용 목록 (검색 반영). activityFilter 무관. */
  function mockManageMembersDormantList() {
    var q = (__mockManageMembersState.search || "").trim().toLowerCase();
    return mockManageMembersAllLiving().filter(function (m) {
      if (mockClassifyActivity(m.daysSince) !== "dormant") return false;
      if (!q) return true;
      return (
        (m.nick && m.nick.toLowerCase().indexOf(q) !== -1) ||
        (m.gameId && m.gameId.toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  function mockManageMembersRoleBadge(role) {
    if (role === "leader") {
      return '<span class="badge badge-brand" style="font-size:10px">leader</span>';
    }
    if (role === "officer") {
      return '<span class="badge badge-muted" style="font-size:10px">officer</span>';
    }
    return '<span class="badge" style="font-size:10px">member</span>';
  }

  /** D-CLAN-07: 활성·비활성·휴면 카운트 + 인원 한도·신규 휴면 진입 수 집계 */
  function mockManageMembersStats() {
    var living = mockManageMembersAllLiving();
    var active = 0;
    var inactive = 0;
    var dormant = 0;
    var newDormant = 0;
    for (var i = 0; i < living.length; i++) {
      var a = mockClassifyActivity(living[i].daysSince);
      if (a === "active") active++;
      else if (a === "inactive") inactive++;
      else {
        dormant++;
        if (living[i].dormantNewlyEntered) newDormant++;
      }
    }
    return {
      active: active,
      inactive: inactive,
      dormant: dormant,
      newDormant: newDormant,
      capUsed: active + inactive,
      capMax: MOCK_CLAN_MAX_MEMBERS,
    };
  }

  /** 인원(users) 아이콘 — 사이드바 "클랜 관리"와 동일 모양 */
  var MOCK_ICON_USERS =
    '<span class="ui-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="9" r="2.5"></circle><path d="M3.5 20a5.5 5.5 0 0 1 11 0"></path><path d="M14 20a4 4 0 0 1 7.5-1.8"></path></svg></span>';
  /** 경고 삼각 아이콘 — 신규 휴면 진입 알림 */
  var MOCK_ICON_ALERT =
    '<span class="ui-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3z"></path><path d="M12 10v5"></path><circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none"></circle></svg></span>';

  /** D-CLAN-07: 상단 요약 배너 렌더 */
  function mockManageMembersRenderSummary() {
    var el = document.getElementById("mock-manage-members-summary");
    if (!el) return;
    var s = mockManageMembersStats();
    var capPct = Math.min(100, Math.round((s.capUsed / s.capMax) * 100));
    var bannerHtml = "";
    if (s.newDormant > 0 && !mockIsDormantBannerDismissed()) {
      bannerHtml =
        '<div class="mock-manage-dormant-alert" role="status" aria-live="polite">' +
        '<span class="mock-manage-dormant-alert-icon">' +
        MOCK_ICON_ALERT +
        "</span>" +
        '<span class="mock-manage-dormant-alert-text">최근 7일간 <strong>' +
        s.newDormant +
        '명</strong>이 새로 휴면으로 분류됐습니다. 아래 휴면 섹션에서 확인 후 정리하세요.</span>' +
        '<button type="button" class="mock-manage-dormant-alert-close" aria-label="알림 닫기" onclick="return window.mockManageMembersDismissDormantAlert()">×</button>' +
        "</div>";
    }
    el.innerHTML =
      bannerHtml +
      '<div class="mock-manage-summary-grid">' +
      '<div class="mock-manage-summary-pill mock-activity-active"><span class="mock-manage-summary-label">' +
      MOCK_ACTIVITY_ICON.active +
      ' 활성</span><strong>' +
      s.active +
      '</strong><span class="mock-manage-summary-hint">&lt; 30일</span></div>' +
      '<div class="mock-manage-summary-pill mock-activity-inactive"><span class="mock-manage-summary-label">' +
      MOCK_ACTIVITY_ICON.inactive +
      ' 비활성</span><strong>' +
      s.inactive +
      '</strong><span class="mock-manage-summary-hint">30~60일</span></div>' +
      '<div class="mock-manage-summary-pill mock-activity-dormant"><span class="mock-manage-summary-label">' +
      MOCK_ACTIVITY_ICON.dormant +
      ' 휴면</span><strong>' +
      s.dormant +
      '</strong><span class="mock-manage-summary-hint">60일+ · 인원 미포함</span></div>' +
      '<div class="mock-manage-summary-pill mock-manage-summary-cap"><span class="mock-manage-summary-label">' +
      MOCK_ICON_USERS +
      ' 인원 한도</span><strong>' +
      s.capUsed +
      " / " +
      s.capMax +
      '</strong><span class="mock-manage-summary-hint">' +
      capPct +
      "% · 휴면 제외(D-CLAN-07)</span></div>" +
      "</div>";
  }

  window.mockManageMembersDismissDormantAlert = function () {
    mockSetDormantBannerDismissed(true);
    mockManageMembersRenderSummary();
    return false;
  };

  /** 활성·비활성 테이블 렌더 */
  function mockManageMembersRenderActive() {
    var tbody = document.getElementById("mock-manage-members-tbody");
    var pager = document.getElementById("mock-manage-members-pager");
    var cnt = document.getElementById("mock-manage-members-count");
    if (!tbody) return;
    var list = mockManageMembersFilterList();
    var ps = __mockManageMembersState.pageSize || 5;
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / ps));
    if (__mockManageMembersState.page > pages) __mockManageMembersState.page = pages;
    if (__mockManageMembersState.page < 1) __mockManageMembersState.page = 1;
    var p = __mockManageMembersState.page;
    var start = (p - 1) * ps;
    var slice = list.slice(start, start + ps);
    if (slice.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:18px 8px;font-size:12px">조건에 맞는 구성원이 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = slice
        .map(function (m) {
          var activity = mockClassifyActivity(m.daysSince);
          return (
            '<tr class="mock-manage-member-row" tabindex="0" data-member-id="' +
            m.id +
            '" onclick="return window.mockManageMemberDetailOpen(\'' +
            m.id +
            '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.mockManageMemberDetailOpen(\'' +
            m.id +
            '\')}">' +
            "<td>" +
            mockActivityBadgeHtml(activity) +
            "</td><td>" +
            m.nick +
            '</td><td style="color:var(--text-muted)">' +
            m.gameId +
            "</td><td>" +
            mockManageMembersRoleBadge(m.role) +
            '</td><td style="color:var(--text-muted)">' +
            m.joined +
            '</td><td style="color:var(--text-muted)">' +
            m.last +
            " <span style=\"font-size:10px;opacity:0.6\">(" +
            m.daysSince +
            "d)</span></td><td style=\"text-align:right;color:var(--text-muted)\">" +
            m.donation +
            "</td></tr>"
          );
        })
        .join("");
    }
    if (cnt) cnt.textContent = "총 " + total + "명 · " + p + " / " + pages + " 페이지";
    if (pager) {
      pager.innerHTML =
        '<button type="button" class="btn btn-secondary btn-sm" ' +
        (p <= 1 ? "disabled" : "") +
        ' onclick="return window.mockManageMembersPage(' +
        (p - 1) +
        ')">이전</button><span>페이지 ' +
        p +
        " / " +
        pages +
        '</span><button type="button" class="btn btn-secondary btn-sm" ' +
        (p >= pages ? "disabled" : "") +
        ' onclick="return window.mockManageMembersPage(' +
        (p + 1) +
        ')">다음</button>';
    }
  }

  /** 휴면 섹션 렌더 */
  function mockManageMembersRenderDormant() {
    var sec = document.getElementById("mock-manage-dormant-section");
    var cnt = document.getElementById("mock-manage-dormant-count");
    var body = document.getElementById("mock-manage-dormant-body");
    var tbody = document.getElementById("mock-manage-dormant-tbody");
    var pager = document.getElementById("mock-manage-dormant-pager");
    var selCountEl = document.getElementById("mock-manage-dormant-selected-count");
    var selectAll = document.getElementById("mock-manage-dormant-select-all");
    var kickBtn = document.getElementById("mock-manage-dormant-kick-btn");
    var toggle = document.getElementById("mock-manage-dormant-toggle");
    if (!sec || !tbody) return;
    var list = mockManageMembersDormantList();
    if (cnt) cnt.textContent = list.length;
    if (body) body.hidden = !!__mockManageMembersState.dormantCollapsed;
    if (toggle) toggle.setAttribute("aria-expanded", __mockManageMembersState.dormantCollapsed ? "false" : "true");
    var ps = __mockManageMembersState.pageSize || 5;
    var pages = Math.max(1, Math.ceil(list.length / ps));
    if (__mockManageMembersState.dormantPage > pages) __mockManageMembersState.dormantPage = pages;
    if (__mockManageMembersState.dormantPage < 1) __mockManageMembersState.dormantPage = 1;
    var p = __mockManageMembersState.dormantPage;
    var start = (p - 1) * ps;
    var slice = list.slice(start, start + ps);
    /** 휴면이 한 명도 없으면 섹션 자체를 옅게 표시 */
    sec.classList.toggle("mock-manage-dormant-empty", list.length === 0);
    if (slice.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px 8px;font-size:12px">휴면 구성원이 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = slice
        .map(function (m) {
          var checked = !!__mockManageMembersState.dormantSelected[m.id];
          return (
            '<tr class="mock-manage-dormant-row" data-member-id="' +
            m.id +
            '">' +
            '<td style="width:32px"><input type="checkbox" aria-label="' +
            m.nick +
            ' 선택" ' +
            (checked ? "checked" : "") +
            ' onchange="return window.mockManageMembersToggleDormant(\'' +
            m.id +
            '\', this.checked)" /></td>' +
            "<td>" +
            m.nick +
            '</td><td style="color:var(--text-muted)">' +
            m.gameId +
            "</td><td>" +
            mockManageMembersRoleBadge(m.role) +
            '</td><td style="color:var(--text-muted)">' +
            m.joined +
            '</td><td style="color:var(--text-muted)">' +
            m.last +
            ' <span style="font-size:10px;opacity:0.6">(' +
            m.daysSince +
            "d)</span></td>" +
            '<td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" onclick="return window.mockManageMemberDetailOpen(\'' +
            m.id +
            '\')">상세</button></td></tr>'
          );
        })
        .join("");
    }
    /** 현재 페이지의 휴면 id 목록 */
    var pageIds = slice.map(function (m) {
      return m.id;
    });
    /** 현재 페이지 내에서 선택된 수 */
    var pageSelected = pageIds.filter(function (id) {
      return __mockManageMembersState.dormantSelected[id];
    });
    if (selectAll) {
      selectAll.checked = pageIds.length > 0 && pageSelected.length === pageIds.length;
      selectAll.indeterminate = pageSelected.length > 0 && pageSelected.length < pageIds.length;
      selectAll.disabled = pageIds.length === 0;
    }
    /** 선택 수 = 전체 휴면 목록 기준이 아니라 현재 페이지 체크박스 스코프 */
    var selCount = pageSelected.length;
    if (selCountEl) selCountEl.textContent = selCount;
    if (kickBtn) kickBtn.disabled = selCount === 0;
    if (pager) {
      pager.innerHTML =
        '<button type="button" class="btn btn-secondary btn-sm" ' +
        (p <= 1 ? "disabled" : "") +
        ' onclick="return window.mockManageMembersDormantPage(' +
        (p - 1) +
        ')">이전</button><span>페이지 ' +
        p +
        " / " +
        pages +
        '</span><button type="button" class="btn btn-secondary btn-sm" ' +
        (p >= pages ? "disabled" : "") +
        ' onclick="return window.mockManageMembersDormantPage(' +
        (p + 1) +
        ')">다음</button>';
    }
  }

  window.mockManageMembersRender = function () {
    mockManageMembersRenderSummary();
    mockManageMembersRenderActive();
    mockManageMembersRenderDormant();
    if (typeof window.mockSidebarNotifyRefresh === "function") {
      window.mockSidebarNotifyRefresh();
    }
  };

  window.mockManageMembersPage = function (next) {
    var list = mockManageMembersFilterList();
    var ps = __mockManageMembersState.pageSize || 5;
    var pages = Math.max(1, Math.ceil(list.length / ps));
    if (next < 1 || next > pages) return false;
    __mockManageMembersState.page = next;
    window.mockManageMembersRender();
    return false;
  };

  window.mockManageMembersOnSearch = function (el) {
    __mockManageMembersState.search = el ? el.value : "";
    __mockManageMembersState.page = 1;
    __mockManageMembersState.dormantPage = 1;
    window.mockManageMembersRender();
  };

  window.mockManageMembersOnActivityFilter = function (el) {
    var v = el ? el.value : "all";
    if (v !== "all" && v !== "active" && v !== "inactive") v = "all";
    __mockManageMembersState.activityFilter = v;
    __mockManageMembersState.page = 1;
    window.mockManageMembersRender();
    return false;
  };

  window.mockManageMembersToggleDormantSection = function () {
    __mockManageMembersState.dormantCollapsed = !__mockManageMembersState.dormantCollapsed;
    mockManageMembersRenderDormant();
    return false;
  };

  window.mockManageMembersDormantPage = function (next) {
    var list = mockManageMembersDormantList();
    var ps = __mockManageMembersState.pageSize || 5;
    var pages = Math.max(1, Math.ceil(list.length / ps));
    if (next < 1 || next > pages) return false;
    __mockManageMembersState.dormantPage = next;
    mockManageMembersRenderDormant();
    return false;
  };

  window.mockManageMembersToggleDormant = function (id, checked) {
    if (!id) return false;
    if (checked) {
      __mockManageMembersState.dormantSelected[id] = true;
    } else {
      delete __mockManageMembersState.dormantSelected[id];
    }
    mockManageMembersRenderDormant();
    return true;
  };

  window.mockManageMembersSelectAllDormantPage = function (el) {
    var list = mockManageMembersDormantList();
    var ps = __mockManageMembersState.pageSize || 5;
    var p = __mockManageMembersState.dormantPage;
    var start = (p - 1) * ps;
    var slice = list.slice(start, start + ps);
    var checked = el ? !!el.checked : true;
    for (var i = 0; i < slice.length; i++) {
      if (checked) __mockManageMembersState.dormantSelected[slice[i].id] = true;
      else delete __mockManageMembersState.dormantSelected[slice[i].id];
    }
    mockManageMembersRenderDormant();
    return true;
  };

  window.mockManageMembersBulkKickDormant = function () {
    /** 현재 페이지에서 체크된 휴면 멤버만 강퇴 (D-CLAN-07: 일괄 범위는 현재 페이지 기준) */
    var list = mockManageMembersDormantList();
    var ps = __mockManageMembersState.pageSize || 5;
    var p = __mockManageMembersState.dormantPage;
    var start = (p - 1) * ps;
    var slice = list.slice(start, start + ps);
    var ids = [];
    for (var i = 0; i < slice.length; i++) {
      if (__mockManageMembersState.dormantSelected[slice[i].id]) ids.push(slice[i].id);
    }
    if (ids.length === 0) {
      alert("강퇴할 휴면 멤버를 먼저 선택하세요.");
      return false;
    }
    var ok = confirm(
      "선택한 휴면 멤버 " +
        ids.length +
        "명을 클랜에서 탈퇴시킵니다.\n(목업이므로 이 브라우저에서만 반영됩니다)"
    );
    if (!ok) return false;
    mockAddKickedDormant(ids);
    for (var j = 0; j < ids.length; j++) {
      delete __mockManageMembersState.dormantSelected[ids[j]];
    }
    window.mockManageMembersRender();
    return false;
  };

  /** 목업 한정: 강퇴 기록 초기화 (디버그 편의) */
  window.mockManageMembersResetKickedDormant = function () {
    mockSaveKickedDormant([]);
    mockSetDormantBannerDismissed(false);
    window.mockManageMembersRender();
    return false;
  };

  window.mockManageMembersInit = function () {
    var inp = document.getElementById("mock-manage-members-search");
    if (inp) __mockManageMembersState.search = inp.value || "";
    var fil = document.getElementById("mock-manage-members-activity-filter");
    if (fil) __mockManageMembersState.activityFilter = fil.value || "all";
    __mockManageMembersState.page = 1;
    __mockManageMembersState.dormantPage = 1;
    window.mockManageMembersRender();
  };

  /**
   * 가입 요청 탭(requests) 렌더 — 목업 상태에서는 정적 `<tr>` 개수를 기준으로
   * 탭 뱃지와 카드 헤더 배지의 카운트를 동기화한다. 실제 구현에서는
   * `clan_join_requests` 쿼리 결과로 대체된다 (D-CLAN-02).
   */
  window.mockManageRequestsRender = function () {
    var tbody = document.getElementById("mock-manage-requests-tbody");
    var tabBadge = document.getElementById("mock-manage-requests-badge");
    var cardBadge = document.getElementById("mock-manage-requests-count");
    var n = tbody ? tbody.querySelectorAll("tr").length : 0;
    var txt = String(n);
    [tabBadge, cardBadge].forEach(function (el) {
      if (!el) return;
      el.textContent = txt;
      if (n > 0) {
        el.removeAttribute("hidden");
        el.setAttribute("aria-hidden", "false");
      } else {
        el.setAttribute("hidden", "");
        el.setAttribute("aria-hidden", "true");
      }
    });
    if (typeof window.mockSidebarNotifyRefresh === "function") {
      window.mockSidebarNotifyRefresh();
    }
  };

  function mockManageMemberFind(id) {
    return MOCK_MANAGE_MEMBERS.find(function (m) {
      return m.id === id;
    });
  }

  function mockMmgrRoleToClanSelect(role) {
    if (role === "leader") return "leader";
    if (role === "officer") return "officer";
    return "member";
  }

  function mockMmgrLoadOverrides(id) {
    try {
      var raw = localStorage.getItem(MOCK_MMEMBER_OVERRIDES_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o[id]) return o[id];
      }
    } catch (e) {}
    return {};
  }

  function mockMmgrSavePatch(id, patch) {
    var all = {};
    try {
      var raw = localStorage.getItem(MOCK_MMEMBER_OVERRIDES_KEY);
      if (raw) all = JSON.parse(raw) || {};
    } catch (e) {}
    if (!all[id]) all[id] = {};
    Object.assign(all[id], patch);
    try {
      localStorage.setItem(MOCK_MMEMBER_OVERRIDES_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function mockMmgrEscapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mockMmgrApplyBriefButtons(on) {
    var onBtn = document.getElementById("mock-mmgr-brief-on");
    var offBtn = document.getElementById("mock-mmgr-brief-off");
    if (onBtn) onBtn.classList.toggle("mock-mmgr-seg-active", on);
    if (offBtn) offBtn.classList.toggle("mock-mmgr-seg-active", !on);
  }

  window.mockMmgrBriefSet = function (on) {
    var id = __mockManageMemberDetailId;
    if (!id) return false;
    mockMmgrSavePatch(id, { briefingOn: !!on });
    mockMmgrApplyBriefButtons(!!on);
    return false;
  };

  window.mockMmgrOnClanRoleChange = function (sel) {
    var id = __mockManageMemberDetailId;
    if (!id || !sel) return false;
    // D-MANAGE-02 · 역할 변경은 leader 전용
    var role = window.mockClanCurrentRole();
    if (role !== "leader") {
      window.alert("역할 변경은 클랜장만 수행할 수 있습니다 (D-MANAGE-02).");
      window.mockMmgrSyncMscoreGate();
      return false;
    }
    mockMmgrSavePatch(id, { clanRole: sel.value });
    return false;
  };

  window.mockMmgrOnMScoreChange = function () {
    var id = __mockManageMemberDetailId;
    if (!id) return false;
    // D-MANAGE-02 · M점수 편집은 leader 기본 / clanSettings.allowOfficerEditMscore 시 officer 허용
    var role = window.mockClanCurrentRole();
    var settings = window.mockClanSettingsGet();
    var canEdit =
      role === "leader" ||
      (role === "officer" && !!settings.allowOfficerEditMscore);
    if (!canEdit) {
      window.alert(
        role === "officer"
          ? "M점수 편집이 운영진에게 허용되지 않았습니다. 클랜장이 개요 탭의 '운영 권한 설정'에서 허용할 수 있습니다."
          : "M점수 편집은 운영진 이상만 가능합니다.",
      );
      window.mockMmgrSyncMscoreGate();
      return false;
    }
    var tank = document.getElementById("mock-mmgr-mscore-tank");
    var dps = document.getElementById("mock-mmgr-mscore-dps");
    var heal = document.getElementById("mock-mmgr-mscore-heal");
    function parseM(el) {
      if (!el || el.value === "") return null;
      var n = parseFloat(el.value, 10);
      return isNaN(n) ? null : n;
    }
    mockMmgrSavePatch(id, {
      mScores: {
        tank: parseM(tank),
        dps: parseM(dps),
        heal: parseM(heal),
      },
    });
    return false;
  };

  window.mockManageMemberDetailOpen = function (id) {
    var m = mockManageMemberFind(id);
    if (!m) return false;
    __mockManageMemberDetailId = id;
    var ov = mockMmgrLoadOverrides(id);
    var modal = document.getElementById("mock-manage-member-detail-modal");
    var badge = document.getElementById("mock-mmgr-detail-nick-badge");
    var medWrap = document.getElementById("mock-mmgr-detail-medals");
    var clanSel = document.getElementById("mock-mmgr-detail-clan-role");
    var subDisp = document.getElementById("mock-mmgr-detail-sub-display");
    var first = document.getElementById("mock-mmgr-detail-first");
    var last = document.getElementById("mock-mmgr-detail-last");
    var tankIn = document.getElementById("mock-mmgr-mscore-tank");
    var dpsIn = document.getElementById("mock-mmgr-mscore-dps");
    var healIn = document.getElementById("mock-mmgr-mscore-heal");
    var mapTb = document.getElementById("mock-mmgr-detail-map-tbody");
    var roleTb = document.getElementById("mock-mmgr-detail-role-tbody");
    var synTb = document.getElementById("mock-mmgr-detail-syn-tbody");
    if (badge) badge.textContent = m.nick;

    var medals = ov.medals;
    if (!medals || !medals.length) {
      medals = m.medals || (m.record && m.record.medals) || [];
    }
    if (medWrap) {
      medWrap.innerHTML = medals.length
        ? medals
            .map(function (t) {
              return (
                '<span class="mock-mmgr-medal">' + mockMmgrEscapeHtml(t) + "</span>"
              );
            })
            .join("")
        : '<span style="font-size:11px;color:var(--text-muted)">부여된 칭호 없음</span>';
    }

    if (clanSel) {
      clanSel.value =
        ov.clanRole || mockMmgrRoleToClanSelect(m.role);
    }

    var briefingOn = Object.prototype.hasOwnProperty.call(ov, "briefingOn")
      ? !!ov.briefingOn
      : !!(m.record && m.record.briefing);
    mockMmgrApplyBriefButtons(briefingOn);

    if (subDisp) {
      var subRaw =
        (typeof m.profileSubAccount === "string" && m.profileSubAccount.trim()) ||
        (m.record && typeof m.record.subAccount === "string" && m.record.subAccount.trim()) ||
        "";
      subDisp.textContent = subRaw ? subRaw : "없음";
      subDisp.classList.toggle("mock-mmgr-sub-display--empty", !subRaw);
    }

    if (first) first.textContent = (m.record && m.record.firstIntra) || "—";
    if (last) last.textContent = (m.record && m.record.lastIntra) || "—";

    var baseM = m.mScores || (m.record && m.record.mScores) || {};
    var mOv = ov.mScores || {};
    function pickM(k) {
      if (mOv[k] !== undefined && mOv[k] !== null) return mOv[k];
      if (baseM[k] !== undefined && baseM[k] !== null) return baseM[k];
      return "";
    }
    if (tankIn) tankIn.value = pickM("tank") === "" ? "" : String(pickM("tank"));
    if (dpsIn) dpsIn.value = pickM("dps") === "" ? "" : String(pickM("dps"));
    if (healIn) healIn.value = pickM("heal") === "" ? "" : String(pickM("heal"));
    if (m.record && m.record.maps && mapTb) {
      mapTb.innerHTML = m.record.maps
        .map(function (r) {
          return (
            "<tr><td>" +
            r.map +
            '</td><td style="text-align:right">' +
            r.w +
            '</td><td style="text-align:right">' +
            r.d +
            '</td><td style="text-align:right">' +
            r.l +
            '</td><td style="text-align:right">' +
            r.rd +
            '</td><td style="text-align:right">' +
            r.pct +
            "%</td></tr>"
          );
        })
        .join("");
    } else if (mapTb) {
      mapTb.innerHTML =
        '<tr><td colspan="6" style="color:var(--text-muted);text-align:center">목업 개인 기록이 없습니다.</td></tr>';
    }
    if (m.record && m.record.roles && roleTb) {
      roleTb.innerHTML = m.record.roles
        .map(function (r) {
          return (
            "<tr><td>" +
            r.code +
            '</td><td style="text-align:right">' +
            r.w +
            '</td><td style="text-align:right">' +
            r.d +
            '</td><td style="text-align:right">' +
            r.l +
            '</td><td style="text-align:right">' +
            r.rd +
            '</td><td style="text-align:right">' +
            r.pct +
            "%</td></tr>"
          );
        })
        .join("");
    } else if (roleTb) {
      roleTb.innerHTML =
        '<tr><td colspan="6" style="color:var(--text-muted);text-align:center">목업 개인 기록이 없습니다.</td></tr>';
    }
    if (m.record && m.record.synergy && synTb) {
      synTb.innerHTML = m.record.synergy
        .map(function (r) {
          return (
            "<tr><td>" +
            r.name +
            '</td><td style="text-align:right">' +
            r.rd +
            '</td><td style="text-align:right">' +
            r.pct +
            "%</td></tr>"
          );
        })
        .join("");
    } else if (synTb) {
      synTb.innerHTML =
        '<tr><td colspan="3" style="color:var(--text-muted);text-align:center">목업 시너지 데이터가 없습니다.</td></tr>';
    }
    if (modal) {
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
    }
    // D-MANAGE-02 · 역할·M점수 게이팅, 부계정 공개 범위 라벨 동기화
    try {
      window.mockClanSettingsSyncUi();
    } catch (e) {}
    return false;
  };

  window.mockManageMemberDetailClose = function () {
    var modal = document.getElementById("mock-manage-member-detail-modal");
    if (modal) {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    __mockManageMemberDetailId = null;
    return false;
  };

  window.mockManageMemberDetailRefreshPeriod = function () {
    var id = __mockManageMemberDetailId;
    if (id) window.mockManageMemberDetailOpen(id);
    return false;
  };
})();

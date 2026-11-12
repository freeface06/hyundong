/* ==========================================================================
   Storefront Interactive Controller (js/store.js)
   쇼핑몰 메인 · 도서탐색 · 상세보기 · 장바구니/주문 · 배송조회 · 고객센터(공지/FAQ/Q&A)
   ========================================================================== */

(function () {
  const Store = window.HyundongStore || window.Store;
  let state = Store.loadState();

  const params = new URLSearchParams(window.location.search);
  const rawView = params.get("view") || (params.get("direct") ? "checkout" : (params.get("cat") || params.get("keyword") || params.get("sort") || params.get("sets") ? "catalog" : "home"));
  const initialView = (rawView === "mypage" ? "addresses" : (rawView === "checkout" ? "cart" : rawView));
  const directBookParam = params.get("direct");
  const directQtyParam = Math.max(1, parseInt(params.get("qty") || "1", 10) || 1);

  let ui = {
    view: initialView, // home | catalog | cart | orders | addresses | support
    categoryId: params.get("cat") || "ALL",
    bookTypeFilter: params.get("sets") === "1" ? "SET" : "ALL",
    searchTarget: params.get("searchTarget") || "ALL",
    keyword: params.get("keyword") || "",
    subKeyword: "",
    catalogPageSize: "16", // "16" | "8" | "ALL"
    catalogPage: 1,
    onlySets: params.get("sets") === "1",
    excludeSoldOut: false,
    sortBy: params.get("sort") || "BESTSELLER",
    gnbPreset: params.get("sets") === "1" ? "SETS" : (params.get("sort") === "NEWEST" ? "NEWEST" : (params.get("sort") === "BESTSELLER" && !params.get("cat") ? "BESTSELLER" : "")),
    viewMode: "list",
    selectedBookIds: [],
    activeDetailBookId: null,
    activeDetailTab: "biblio",
    supportTab: "qna", // notice | faq | qna
    mypageTab: params.get("tab") || "addresses", // addresses | points | activity | profile
    directBuy: directBookParam ? { bookId: directBookParam, qty: directQtyParam } : null,
    usePoints: 0,
    taxProofType: "NONE",
    taxProofValue: "",
    lastCompletedOrderNo: "",
    orderPeriod: "ALL", // "ALL" | "1M" | "3M" | "6M"
    orderStatusFilter: "ALL", // "ALL" | "PAID" | "SHIPPED"
    orderSearchKeyword: "",
    guestLookupOrderNo: "",
    guestLookupPhone: "",
    heroSlideIdx: 0
  };

  if (ui.keyword) {
    const initPcInput = document.getElementById("pcSearchInput");
    const initMobInput = document.getElementById("mobileSearchInput");
    if (initPcInput) initPcInput.value = ui.keyword;
    if (initMobInput) initMobInput.value = ui.keyword;
  }
  if (ui.searchTarget && ui.searchTarget !== "ALL") {
    const initPcTarget = document.getElementById("pcSearchTarget");
    const initMobTarget = document.getElementById("mobileSearchTarget");
    if (initPcTarget) initPcTarget.value = ui.searchTarget;
    if (initMobTarget) initMobTarget.value = ui.searchTarget;
  }

  let heroTimer = null;
  let revealObserver = null;

  const mainEl = document.getElementById("storeMainContent");

  function findBook(bookId) {
    return state.books.find(function (b) { return b.id === bookId; });
  }

  function getLoggedInMember() {
    if (!state.currentUser || !state.currentUser.loggedIn) return null;
    return (state.members || []).find(function (m) {
      return m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId;
    }) || null;
  }

  function syncShellChrome() {
    const cartCount = state.cart.reduce(function (sum, c) { return sum + Number(c.qty || 0); }, 0);
    const cartEl = document.getElementById("headerCartCount");
    if (cartEl) cartEl.textContent = cartCount;
    const mobCartEl = document.getElementById("mobCartCount");
    if (mobCartEl) mobCartEl.textContent = cartCount;

    // 공통 유틸바(고객센터 드롭다운 · 회원 포인트) + 검색 자동완성 + 우측 플로팅 위젯 동기화
    if (typeof Store.syncStoreShell === "function") {
      Store.syncStoreShell({
        isSPA: true,
        state: state,
        onSearchKeyword: function (kw, target) {
          ui.keyword = kw || "";
          ui.subKeyword = "";
          ui.catalogPage = 1;
          ui.searchTarget = target || "ALL";
          ui.categoryId = "ALL";
          ui.gnbPreset = "";
          ui.view = "catalog";
          render();
        }
      });
    }

    // 모바일 드로어 상단 회원 상태 연동 (1줄 간결 표시)
    const mobStatusEl = document.getElementById("mobileUserStatusText");
    const mobActionRow = document.getElementById("mobileAuthActionRow");
    if (mobStatusEl && mobActionRow) {
      if (state.currentUser && state.currentUser.loggedIn) {
        const curM = getLoggedInMember();
        const pts = curM ? ` · ${Number(curM.points || 0).toLocaleString()}P` : "";
        mobStatusEl.textContent = `${state.currentUser.name || state.currentUser.nameMasked}님${pts}`;
        mobActionRow.innerHTML = `
          <button type="button" class="btn btn-sm btn-primary" style="flex:1;" data-nav="mypage">마이페이지</button>
          <button type="button" class="btn btn-sm btn-outline" style="flex:1;" data-nav="orders">주문·배송</button>
          <button type="button" class="btn btn-sm btn-outline" style="flex:1;" id="btnLogoutMob">로그아웃</button>
        `;
      } else {
        mobStatusEl.textContent = "로그인 후 3% 구매 적립 혜택";
        mobActionRow.innerHTML = `
          <a href="./login.html" class="btn btn-sm btn-primary" style="flex:1;">로그인</a>
          <a href="./signup.html" class="btn btn-sm btn-outline" style="flex:1;">회원가입</a>
        `;
      }
    }

    // 전 구간 1줄 가로 슬라이드 GNB (도서 탐색 전용 IA + 스크롤바 숨김 + 드래그 슬라이드)
    const gnbEl = document.getElementById("pcGnbList");
    if (gnbEl) {
      const activeCats = Store.getActiveCodes(state, "BOOK_CATEGORY");
      const railEl = gnbEl.parentElement;
      if (railEl) railEl.classList.add("store-gnb-rail");
      gnbEl.innerHTML =
        `<li><button type="button" class="store-gnb-btn" data-view="home">홈</button></li>` +
        `<li><button type="button" class="store-gnb-btn" data-cat="ALL">전체 도서</button></li>` +
        activeCats.map(function (c) {
          const compactName = String(c.name || "").replace(/\s*·\s*/g, "·");
          return `<li><button type="button" class="store-gnb-btn" data-cat="${Store.escapeHtml(c.code)}">${Store.escapeHtml(compactName)}</button></li>`;
        }).join("") +
        `<li><button type="button" class="store-gnb-btn" data-gnb-preset="BESTSELLER">베스트셀러</button></li>` +
        `<li><button type="button" class="store-gnb-btn" data-gnb-preset="NEWEST">신간 도서</button></li>` +
        `<li><button type="button" class="store-gnb-btn" data-gnb-preset="SETS">전집 · 세트</button></li>`;

      document.querySelectorAll(".store-gnb-btn").forEach(function (btn) {
        const btnView = btn.getAttribute("data-view");
        const btnCat = btn.getAttribute("data-cat");
        const btnPreset = btn.getAttribute("data-gnb-preset");
        let active = false;
        if (btnView && ui.view === btnView) {
          active = true;
        } else if (ui.view === "catalog") {
          if (ui.gnbPreset && btnPreset === ui.gnbPreset) {
            active = true;
          } else if (!ui.gnbPreset && btnCat && btnCat === ui.categoryId) {
            active = true;
          }
        }
        btn.classList.toggle("is-active", Boolean(active));
      });

      if (typeof Store.enableHorizontalDragScroll === "function") {
        Store.enableHorizontalDragScroll(gnbEl, railEl);
        const activeBtn = gnbEl.querySelector(".store-gnb-btn.is-active");
        if (activeBtn && gnbEl.scrollWidth > gnbEl.clientWidth) {
          gnbEl.scrollLeft = Math.max(0, activeBtn.offsetLeft - Math.round((gnbEl.clientWidth - activeBtn.offsetWidth) / 2));
          Store.updateRailShadows(gnbEl, railEl);
        }
      }
    }

    document.querySelectorAll(".mobile-tab-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-mob-nav") === ui.view);
    });

    renderMobileDrawerCategories();
    renderFooterInfo();
  }

  function renderMobileDrawerCategories() {
    const wrap = document.getElementById("mobileDrawerCategories");
    if (!wrap) return;
    wrap.innerHTML = Store.getCategoriesWithAll(state).map(function (cat) {
      const count = cat.id === "ALL"
        ? state.books.length
        : state.books.filter(function (b) { return b.categoryId === cat.id; }).length;
      return `
        <button type="button" class="mobile-drawer-cat-btn" data-drawer-cat="${Store.escapeHtml(cat.id)}">
          <span>${Store.escapeHtml(cat.name)}</span>
          <span class="badge badge-brand">${count}권</span>
        </button>
      `;
    }).join("");
  }

  function renderFooterInfo() {
    const foot = document.getElementById("storeFooterInfo");
    if (!foot) return;
    const cfg = state.siteConfig;
    const currentYear = new Date().getFullYear();
    foot.innerHTML = `
      <div>
        <div class="footer-brand-row">
          <img src="./images/logo-mark-light.svg" alt="현동서재 로고" class="footer-brand-mark" width="32" height="32" />
          <strong style="font-family: var(--font-serif); font-size: 1.08rem; color: #ffffff;">
            ${Store.escapeHtml(cfg.mallName)}
          </strong>
        </div>
        <p style="margin: 8px 0 4px;">
          ${Store.escapeHtml(cfg.address)} | 대표: ${Store.escapeHtml(cfg.ceoName)}
        </p>
        <p style="margin: 0;">
          대표전화: ${Store.escapeHtml(cfg.csPhone)} | 상담시간: ${Store.escapeHtml(cfg.csHours)}
        </p>
      </div>
      <div>
        <strong style="color: #ffffff;">무통장 입금 및 배송 안내</strong>
        <p style="margin: 8px 0 4px;">· 입금 계좌: ${Store.escapeHtml(cfg.bankAccount)}</p>
        <p style="margin: 0 0 4px;">· 배송비: ${Store.formatKRW(cfg.freeShippingThreshold)} 이상 무료배송 (미만 시 ${Store.formatKRW(cfg.baseShippingFee)})</p>
        <p style="margin: 0;">· 발송 안내: ${Store.escapeHtml(cfg.cutoffNotice)}</p>
      </div>
    `;
    const copyEl = document.getElementById("storeFooterCopyright");
    if (copyEl) {
      copyEl.innerHTML = `
        <span>Copyright © <strong>${currentYear}</strong> ${Store.escapeHtml(cfg.mallName)}. All rights reserved.</span>
        <span style="display:inline-flex; align-items:center; gap:10px;">
          <a href="./admin.html" style="color:#cbc5b8; text-decoration:none;">관리자 센터</a>
          <span style="opacity:0.35;">|</span>
          <button type="button" id="btnFooterResetDemo" style="background:none; border:none; padding:0; color:#a8a196; font-size:0.78rem; cursor:pointer;">초기 데이터 복원</button>
        </span>
      `;
      const resetBtn = document.getElementById("btnFooterResetDemo");
      if (resetBtn) {
        resetBtn.onclick = function () {
          Store.resetState();
          Store.showToast("초기 데이터 상태로 복원되었습니다.");
          setTimeout(function () { window.location.reload(); }, 250);
        };
      }
    }
  }

  function triggerBadgePop(ids) {
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("badge-pop");
      void el.offsetWidth;
      el.classList.add("badge-pop");
    });
  }

  function triggerViewEnter() {
    if (!mainEl) return;
    mainEl.classList.remove("view-enter-anim");
    void mainEl.offsetWidth;
    mainEl.classList.add("view-enter-anim");
  }

  function setupScrollReveal() {
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    if (!mainEl) return;

    const targets = mainEl.querySelectorAll(
      ".hanui-plaque-card, .bestseller-card, .promo-mid-banner, .recommend-card-home, .book-summary-row, .cart-item-card, .panel-card"
    );
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -32px 0px", threshold: 0.06 });

    targets.forEach(function (el, idx) {
      const delay = Math.min(idx % 6, 5) * 55;
      el.style.setProperty("--stagger", delay + "ms");
      el.classList.add("reveal-on-scroll");
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96) {
        requestAnimationFrame(function () {
          el.classList.add("is-revealed");
        });
      } else {
        revealObserver.observe(el);
      }
    });
  }

  function stopHeroCarousel() {
    if (heroTimer) {
      clearInterval(heroTimer);
      heroTimer = null;
    }
  }

  function getHeroShowcaseItems() {
    const heroBanner = state.banners.find(function (b) { return b.position === "HERO" && b.active; });
    const primaryId = (heroBanner && heroBanner.targetBookId) || "BK-001";
    const candidateIds = [primaryId, "BK-002", "BK-003", "BK-005"];
    const picked = [];
    candidateIds.forEach(function (id) {
      const bk = findBook(id);
      if (bk && picked.length < 3 && !picked.some(function (p) { return p.id === bk.id; })) {
        picked.push(bk);
      }
    });
    state.books.forEach(function (bk) {
      if (picked.length < 3 && !picked.some(function (p) { return p.id === bk.id; })) {
        picked.push(bk);
      }
    });
    const sealLabels = ["대표 완간 정본", "임상 필독 의서", "진료실 상비 방제"];
    const shortTabs = ["동의보감 세트", "현동의감", "현동처방집"];
    return picked.map(function (bk, i) {
      return {
        book: bk,
        sealLabel: sealLabels[i] || "학당 추천서",
        tabTitle: i === 0 && bk.id !== "BK-001" ? bk.title : (shortTabs[i] || bk.title)
      };
    });
  }

  function renderHeroFeaturedCardInner(slideItem) {
    const bk = slideItem.book;
    return `
      <div class="hero-cover-pedestal" data-open-book="${bk.id}">
        ${Store.renderBookCoverHTML(bk)}
      </div>
      <div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="badge badge-seal">${Store.escapeHtml(slideItem.sealLabel)}</span>
          <span class="badge badge-brand">${Store.escapeHtml(bk.categoryName)}</span>
        </div>
        <h3 style="margin:8px 0 5px; font-family:var(--font-serif); font-size:1.14rem; line-height:1.35; cursor:pointer; color:var(--color-brand-900);" data-open-book="${bk.id}">
          ${Store.escapeHtml(bk.title)}
        </h3>
        <p style="margin:0 0 8px; font-size:0.83rem; color:var(--color-text-secondary); line-height:1.5;">
          ${Store.escapeHtml(bk.subtitle)}
        </p>
        <div style="font-size:0.76rem; color:var(--color-text-muted); margin-bottom:10px;">
          ${Store.escapeHtml(bk.author)}${bk.translator ? " · " + Store.escapeHtml(bk.translator) : ""} | ${bk.pageCount.toLocaleString()}쪽
        </div>
        <div style="margin-bottom:12px;">
          <span class="discount-pct">${bk.discountRate}%↓</span>
          <strong style="font-size:1.18rem; color:var(--color-brand-900);">${Store.formatKRW(bk.salePrice)}</strong>
          <span class="price-list">${Store.formatKRW(bk.listPrice)}</span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-dark" data-add-cart="${bk.id}">장바구니 담기</button>
          <button type="button" class="btn btn-sm btn-outline" data-open-book="${bk.id}">서지 · 목차 보기</button>
        </div>
      </div>
    `;
  }

  function updateHeroSlideDOM(nextIdx) {
    const slides = getHeroShowcaseItems();
    if (!slides.length) return;
    ui.heroSlideIdx = ((nextIdx % slides.length) + slides.length) % slides.length;
    const activeItem = slides[ui.heroSlideIdx];

    const stage = document.getElementById("heroFeaturedStage");
    const counter = document.getElementById("heroSlideCounter");
    const prog = document.getElementById("heroProgressBar");
    if (!stage) return;

    stage.classList.remove("is-swapping");
    stage.innerHTML = renderHeroFeaturedCardInner(activeItem);
    void stage.offsetWidth;
    stage.classList.add("is-swapping");

    if (counter) {
      counter.textContent = "(0" + (ui.heroSlideIdx + 1) + " / 0" + slides.length + ")";
    }
    if (prog) {
      prog.style.animation = "none";
      void prog.offsetWidth;
      prog.style.animation = "";
    }

    document.querySelectorAll(".hero-showcase-tab").forEach(function (tabBtn) {
      const idx = Number(tabBtn.getAttribute("data-hero-slide"));
      tabBtn.classList.toggle("is-active", idx === ui.heroSlideIdx);
    });
  }

  function setupHeroCarousel() {
    stopHeroCarousel();
    const bookstand = document.getElementById("heroBookstand");
    if (!bookstand) return;

    let paused = false;
    bookstand.addEventListener("mouseenter", function () { paused = true; });
    bookstand.addEventListener("mouseleave", function () { paused = false; });

    heroTimer = setInterval(function () {
      if (paused || ui.view !== "home") return;
      updateHeroSlideDOM(ui.heroSlideIdx + 1);
    }, 5200);
  }

  function render() {
    stopHeroCarousel();
    syncShellChrome();
    if (ui.view === "home") {
      renderHomeView();
    } else if (ui.view === "catalog") {
      renderCatalogView();
    } else if (ui.view === "cart" || ui.view === "checkout") {
      renderCartCheckoutView();
    } else if (ui.view === "orders") {
      renderOrdersView();
    } else if (ui.view === "addresses" || ui.view === "mypage") {
      renderAddressBookView();
    } else if (ui.view === "support") {
      renderSupportView();
    }
    triggerViewEnter();
    setupScrollReveal();
    if (ui.view === "home") {
      setupHeroCarousel();
    }
  }

  /* ========================================================================
     1. HOME VIEW (메인 배너 · 베스트셀러 · 추천 도서 · 기획 배너 · 공지/후기)
     ======================================================================== */
  function renderHomeView() {
    const heroBanner = state.banners.find(function (b) { return b.position === "HERO" && b.active; });
    const promoBanner = state.banners.find(function (b) { return b.position === "PROMO" && b.active; });
    const heroBook = findBook((heroBanner && heroBanner.targetBookId) || "BK-001") || state.books[0];
    const heroSlides = getHeroShowcaseItems();
    if (ui.heroSlideIdx >= heroSlides.length) ui.heroSlideIdx = 0;
    const currentHeroSlide = heroSlides[ui.heroSlideIdx] || { book: heroBook, sealLabel: "대표 완간 정본", tabTitle: heroBook.title };

    const bestsellers = state.books
      .filter(function (b) { return b.saleStatus !== "HIDDEN"; })
      .slice()
      .sort(function (a, b) { return a.bestsellerRank - b.bestsellerRank; })
      .slice(0, 5);
    const newestBooks = state.books
      .filter(function (b) { return b.saleStatus !== "HIDDEN"; })
      .slice()
      .sort(function (a, b) { return String(b.publishedDate || "").localeCompare(String(a.publishedDate || "")); })
      .slice(0, 4);
    const recommendedBooks = state.books.filter(function (b) { return b.mdPick && b.saleStatus !== "HIDDEN"; }).slice(0, 4);
    const visibleReviews = state.reviews.filter(function (r) { return r.visible; }).slice(0, 4);
    const recentNotices = state.notices.filter(function (n) { return n.visible; }).slice(0, 3);
    const heroBgStyle = heroBanner && heroBanner.imageUrl
      ? ` style="background-image: linear-gradient(110deg, rgba(247,245,240,0.92), rgba(242,238,229,0.88)), url('${Store.escapeHtml(heroBanner.imageUrl)}'); background-size: cover; background-position: center;"`
      : "";
    const promoBgStyle = promoBanner && promoBanner.imageUrl
      ? ` style="background-image: linear-gradient(100deg, rgba(46,43,39,0.9), rgba(74,69,61,0.86)), url('${Store.escapeHtml(promoBanner.imageUrl)}'); background-size: cover; background-position: center;"`
      : "";

    mainEl.innerHTML = `
      ${heroBanner ? `
        <section class="hero-banner"${heroBgStyle}>
          <!-- 수묵 산수 · 본초 약초문 · 전통 서예 배경 레이어 -->
          <div class="hero-ink-backdrop" aria-hidden="true">
            <svg class="hero-ink-mountains" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path d="M0,155 C190,105 330,138 520,96 C710,54 880,126 1090,82 C1240,50 1350,95 1440,74 L1440,200 L0,200 Z" fill="rgba(145, 138, 125, 0.13)"></path>
              <path d="M0,172 C240,126 430,164 660,122 C870,84 1080,148 1280,108 C1360,92 1410,110 1440,104 L1440,200 L0,200 Z" fill="rgba(95, 89, 79, 0.11)"></path>
              <path d="M0,186 C310,158 580,188 890,154 C1120,130 1290,168 1440,148 L1440,200 L0,200 Z" fill="rgba(247, 245, 240, 0.65)"></path>
            </svg>
            <svg class="hero-herb-ornament" viewBox="0 0 180 180" fill="none">
              <path d="M26 168 C48 126, 76 88, 122 26" stroke="#5f594f" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M62 122 C42 108, 30 92, 34 72 C52 78, 66 96, 62 122 Z" stroke="#5f594f" stroke-width="1.4" fill="rgba(145,138,125,0.12)"/>
              <path d="M78 98 C98 96, 118 84, 126 64 C106 62, 88 76, 78 98 Z" stroke="#5f594f" stroke-width="1.4" fill="rgba(145,138,125,0.12)"/>
              <path d="M94 70 C78 56, 72 38, 80 22 C96 30, 102 48, 94 70 Z" stroke="#5f594f" stroke-width="1.4" fill="rgba(145,138,125,0.12)"/>
              <circle cx="125" cy="24" r="4" fill="#8c3a32" opacity="0.18"/>
              <circle cx="134" cy="31" r="3" fill="#8c3a32" opacity="0.14"/>
            </svg>
            <div class="hero-calligraphy-watermark">東醫寶鑑 · 法古創新</div>
          </div>

          <div class="store-container hero-grid">
            <div class="hero-editorial">
              <div class="hero-seal-row">
                <img src="./images/logo-mark.svg" alt="" width="36" height="36" class="hero-emblem-mark" />
                <span class="hero-eyebrow">${Store.escapeHtml(heroBanner.eyebrow)}</span>
              </div>
              <div class="hero-maxim-bar">
                <span class="hero-maxim-hanja">「法古創新 · 原文直譯」</span>
                <span>옛 의서의 본뜻을 바로 세워 오늘의 임상을 밝히다</span>
              </div>
              <h1 class="hero-title">${Store.escapeHtml(heroBanner.title)}</h1>
              <p class="hero-desc">${Store.escapeHtml(heroBanner.subtitle)}</p>
              <div class="hero-authentic-strip">
                <span class="hero-authentic-chip"><b>印</b> 원문 대조 정본 직역</span>
                <span class="hero-authentic-chip"><b>冊</b> 사철 양장 보존판 제본</span>
                <span class="hero-authentic-chip"><b>發</b> 출판부 직접 검수 · 당일 발송</span>
              </div>
              <div class="hero-cta-row">
                <button type="button" class="btn btn-primary" data-open-book="${heroBook.id}">${Store.escapeHtml(heroBanner.buttonText || "상세보기")}</button>
                <button type="button" class="btn btn-outline" style="background:rgba(255,253,249,0.78);" data-goto-cat="ALL">전체 출간 의서 보기 (${state.books.length}종)</button>
              </div>
            </div>

            <div class="hero-bookstand" id="heroBookstand">
              <span class="hero-corner tl" aria-hidden="true"></span>
              <span class="hero-corner tr" aria-hidden="true"></span>
              <span class="hero-corner bl" aria-hidden="true"></span>
              <span class="hero-corner br" aria-hidden="true"></span>

              <div class="hero-bookstand-top">
                <span class="hero-bookstand-label">
                  書案 · 현동 대표 의서 선집
                  <small id="heroSlideCounter" style="color:var(--color-text-muted); font-weight:600;">(0${ui.heroSlideIdx + 1} / 0${heroSlides.length})</small>
                </span>
                <span class="hero-stamp-mark">正本直譯</span>
              </div>
              <div class="hero-progress-track" aria-hidden="true">
                <div class="hero-progress-bar" id="heroProgressBar"></div>
              </div>

              <div class="hero-featured-card" id="heroFeaturedStage">
                ${renderHeroFeaturedCardInner(currentHeroSlide)}
              </div>

              <div class="hero-showcase-tabs" role="tablist" aria-label="대표 의서 선택">
                ${heroSlides.map(function (sl, idx) {
                  return `
                    <button type="button" class="hero-showcase-tab ${idx === ui.heroSlideIdx ? "is-active" : ""}" data-hero-slide="${idx}">
                      <small>0${idx + 1} · ${Store.escapeHtml(sl.book.hanjaWatermark || "醫書")}</small>
                      <span>${Store.escapeHtml(sl.tabTitle)}</span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </section>
      ` : ""}

      <div class="store-container">
        <!-- 한의학 분야별 서가(書架) 한자 문패 바로가기 (공통코드 실시간 연동) -->
        <section class="hanui-plaque-section" aria-label="한의학 분야별 서가 바로가기">
          <div class="hanui-plaque-grid">
            ${Store.getActiveCodes(state, "BOOK_CATEGORY").map(function (cat) {
              const cnt = state.books.filter(function (b) { return b.categoryId === cat.code; }).length;
              const hanjaText = cat.hanja || String(cat.name || "").slice(0, 2);
              const shortSub = cat.desc ? (cat.desc.length > 18 ? cat.desc.slice(0, 18) + "…" : cat.desc) : "출간 도서 서가";
              return `
                <button type="button" class="hanui-plaque-card" data-goto-cat="${Store.escapeHtml(cat.code)}">
                  <span class="hanui-plaque-hanja" aria-hidden="true">${Store.escapeHtml(hanjaText)}</span>
                  <div class="hanui-plaque-text">
                    <strong>${Store.escapeHtml(cat.name)}</strong>
                    <span>${Store.escapeHtml(shortSub)} · ${cnt}종</span>
                  </div>
                </button>
              `;
            }).join("")}
          </div>
        </section>

        <!-- 베스트셀러 TOP 5 -->
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2>인기 도서 베스트 5</h2>
              <p>한의사와 한의학도들이 가장 많이 찾는 대표 직역서 · 처방집</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" data-goto-cat="ALL">전체 도서 보기 →</button>
          </div>
          <div class="bestseller-grid">
            ${bestsellers.map(function (book, idx) {
              return `
                <article class="bestseller-card" data-open-book="${book.id}">
                  <span class="rank-flag ${idx < 3 ? "is-top" : ""}">${idx + 1}</span>
                  ${Store.renderBookCoverHTML(book)}
                  <h3 class="bestseller-card-title">${Store.escapeHtml(book.title)}</h3>
                  <div class="bestseller-card-meta">${Store.escapeHtml(book.author)}${book.translator ? " · " + Store.escapeHtml(book.translator) : ""}</div>
                  <div class="bestseller-card-price">
                    <span class="discount-pct">${book.discountRate}%</span>${Store.formatKRW(book.salePrice)}
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>

        ${promoBanner ? `
          <section style="margin-bottom: 12px;">
            <div class="promo-mid-banner"${promoBgStyle}>
              <div>
                <span class="badge badge-seal" style="margin-bottom:8px;">${Store.escapeHtml(promoBanner.eyebrow)}</span>
                <h3 style="margin:0 0 6px; font-family:var(--font-serif); font-size:1.2rem; color:#ffffff;">${Store.escapeHtml(promoBanner.title)}</h3>
                <p style="margin:0; font-size:0.88rem; color:#dfdcd3;">${Store.escapeHtml(promoBanner.subtitle)}</p>
              </div>
              <button type="button" class="btn btn-primary" data-goto-cat="FORMULA">${Store.escapeHtml(promoBanner.buttonText || "자세히 보기")}</button>
            </div>
          </section>
        ` : ""}

        <!-- 주목할 신간 · 학당 강의록 -->
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2>주목할 신간 · 최근 개정판</h2>
              <p>현동학당 출판부에서 가장 최근 펴낸 직역서와 임상 강의록</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" data-gnb-preset="NEWEST">신간 전체 보기 →</button>
          </div>
          <div class="form-grid-2">
            ${newestBooks.map(function (book) {
              const soldOut = book.saleStatus === "OUT_OF_STOCK" || book.stockQuantity <= 0;
              return `
                <div class="panel-card recommend-card-home" style="margin-bottom:0; display:grid; grid-template-columns: 88px minmax(0, 1fr); gap:14px; align-items:center;">
                  <div data-open-book="${book.id}" style="cursor:pointer;">
                    ${Store.renderBookCoverHTML(book)}
                  </div>
                  <div>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                      <span class="badge badge-seal">출간 ${Store.escapeHtml(book.publishedDate)}</span>
                      <span class="badge badge-brand">${Store.escapeHtml(book.categoryName)}</span>
                    </div>
                    <h3 style="margin:6px 0 4px; font-size:0.98rem; font-family:var(--font-serif); cursor:pointer;" data-open-book="${book.id}">
                      ${Store.escapeHtml(book.title)}
                    </h3>
                    <div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:8px;">
                      ${Store.escapeHtml(book.author)}${book.translator ? " · " + Store.escapeHtml(book.translator) : ""} | ${book.pageCount.toLocaleString()}쪽
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                      <strong>${Store.formatKRW(book.salePrice)}</strong>
                      <div style="display:flex; gap:6px;">
                        <button type="button" class="btn btn-sm btn-outline" data-open-book="${book.id}">상세보기</button>
                        <button type="button" class="btn btn-sm btn-primary" data-add-cart="${book.id}" ${soldOut ? "disabled" : ""}>${soldOut ? "품절" : "담기"}</button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <!-- 단계별 추천 도서 -->
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2>학당 추천 필독 도서</h2>
              <p>입문 강의집부터 진료실 상비 처방집·전집까지 단계별로 권해드립니다</p>
            </div>
          </div>
          <div class="form-grid-2">
            ${recommendedBooks.map(function (book) {
              return `
                <div class="panel-card recommend-card-home" style="margin-bottom:0; display:grid; grid-template-columns: 98px minmax(0, 1fr); gap:16px; align-items:center;">
                  <div data-open-book="${book.id}" style="cursor:pointer;">
                    ${Store.renderBookCoverHTML(book)}
                  </div>
                  <div>
                    <span class="badge badge-brand">${Store.escapeHtml(book.categoryName)}</span>
                    <h3 style="margin:6px 0 4px; font-size:1rem; font-family:var(--font-serif); cursor:pointer;" data-open-book="${book.id}">
                      ${Store.escapeHtml(book.title)}
                    </h3>
                    <p style="margin:0 0 10px; font-size:0.83rem; color:var(--color-text-secondary);">
                      ${Store.escapeHtml(book.summary)}
                    </p>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                      <strong>${Store.formatKRW(book.salePrice)}</strong>
                      <div style="display:flex; gap:6px;">
                        <button type="button" class="btn btn-sm btn-outline" data-open-book="${book.id}">상세보기</button>
                        <button type="button" class="btn btn-sm btn-primary" data-add-cart="${book.id}">담기</button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <!-- 독자 구매 후기 & 새 소식 -->
        <section class="section-block" style="padding-top: 8px;">
          <div class="form-grid-2">
            <div>
              <div class="section-head">
                <div>
                  <h2>독자 구매 후기</h2>
                  <p>구매 독자분들이 직접 남겨주신 생생한 서평</p>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${visibleReviews.slice(0, 2).map(function (rv) {
                  const bk = findBook(rv.bookId);
                  return `
                    <div class="panel-card" style="margin-bottom:0; padding:18px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
                        <span>
                          ${rv.isBest ? `<span class="badge badge-seal">베스트 후기</span> ` : ""}
                          <span class="badge badge-success">★ ${rv.rating}.0</span>
                        </span>
                        <span style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(rv.memberMask)}</span>
                      </div>
                      <div style="font-weight:700; font-size:0.88rem; color:var(--color-brand-700); margin-bottom:6px; cursor:pointer;" data-open-book="${bk ? bk.id : ""}">
                        ${bk ? Store.escapeHtml(bk.title) : ""}
                      </div>
                      <p style="margin:0; font-size:0.86rem;">${Store.escapeHtml(rv.content)}</p>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div>
              <div class="section-head">
                <div>
                  <h2>공지사항 · 고객센터</h2>
                  <p>신간 소식 및 배송 안내를 확인하세요</p>
                </div>
                <button type="button" class="btn btn-sm btn-outline" data-nav="support">더보기 →</button>
              </div>
              <div class="panel-card" style="margin-bottom:0; padding:18px;">
                ${recentNotices.map(function (nt) {
                  return `
                    <div style="padding:10px 0; border-bottom:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center; gap:10px;">
                      <button type="button" style="background:none; border:none; padding:0; text-align:left; font-size:0.9rem; font-weight:600; cursor:pointer;" data-goto-notice="${nt.id}">
                        <span class="badge badge-brand" style="margin-right:6px;">${Store.escapeHtml(nt.category)}</span>
                        ${Store.escapeHtml(nt.title)}
                      </button>
                      <span style="font-size:0.78rem; color:var(--color-text-muted); flex-shrink:0;">${nt.createdAt}</span>
                    </div>
                  `;
                }).join("")}
                <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:var(--color-brand-50); padding:12px 14px; border-radius:var(--radius-sm);">
                  <div>
                    <strong style="font-size:0.9rem;">전화 주문 · 대량 구매 문의: ${Store.escapeHtml(state.siteConfig.csPhone)}</strong>
                    <div style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(state.siteConfig.csHours)}</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-primary" data-goto-qna="1">1:1 문의 남기기</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  /* ========================================================================
     2. CATALOG / SEARCH VIEW
     ======================================================================== */
  function getFilteredBooks() {
    const kw = ui.keyword.trim().toLowerCase();
    const subKw = (ui.subKeyword || "").trim().toLowerCase();
    let list = state.books.filter(function (b) {
      if (b.saleStatus === "HIDDEN") return false;
      if (ui.categoryId !== "ALL" && b.categoryId !== ui.categoryId) return false;
      if (ui.bookTypeFilter !== "ALL" && b.bookTypeCode !== ui.bookTypeFilter) return false;
      if (ui.onlySets && !b.isSet) return false;
      if (ui.excludeSoldOut && (b.saleStatus === "OUT_OF_STOCK" || b.stockQuantity <= 0)) return false;

      if (kw) {
        let matchedPrimary = false;
        if (ui.searchTarget === "TITLE") {
          matchedPrimary = (b.title + " " + b.subtitle).toLowerCase().includes(kw);
        } else if (ui.searchTarget === "AUTHOR") {
          matchedPrimary = (b.author + " " + (b.translator || "")).toLowerCase().includes(kw);
        } else if (ui.searchTarget === "ISBN") {
          matchedPrimary = String(b.isbn13 || "").replace(/-/g, "").includes(kw.replace(/-/g, ""));
        } else {
          matchedPrimary = (
            b.title + " " + b.subtitle + " " + b.author + " " + (b.translator || "") + " " + b.isbn13 + " " + b.summary
          ).toLowerCase().includes(kw);
        }
        if (!matchedPrimary) return false;
      }

      if (subKw) {
        const subHaystack = (
          b.title + " " + (b.subtitle || "") + " " + (b.author || "") + " " + (b.translator || "") + " " + (b.isbn13 || "") + " " + (b.summary || "") + " " + (b.categoryName || "")
        ).toLowerCase();
        if (!subHaystack.includes(subKw)) return false;
      }

      return true;
    });

    if (ui.sortBy === "BESTSELLER") {
      list.sort(function (a, b) { return b.salesCount - a.salesCount; });
    } else if (ui.sortBy === "NEWEST") {
      list.sort(function (a, b) { return b.publishedDate.localeCompare(a.publishedDate); });
    } else if (ui.sortBy === "PRICE_ASC") {
      list.sort(function (a, b) { return a.salePrice - b.salePrice; });
    } else if (ui.sortBy === "PRICE_DESC") {
      list.sort(function (a, b) { return b.salePrice - a.salePrice; });
    } else if (ui.sortBy === "RATING") {
      list.sort(function (a, b) { return b.ratingAvg - a.ratingAvg; });
    }
    return list;
  }

  function renderCatalogResultsInner(books) {
    if (books.length === 0) {
      return `
        <div class="panel-card" style="text-align:center; padding:48px 20px;">
          <p style="margin:0 0 14px; color:var(--color-text-secondary);">찾으시는 조건의 도서가 없습니다.</p>
          <button type="button" class="btn btn-primary" id="btnResetCatalogFilter">전체 도서 다시 보기</button>
        </div>
      `;
    }

    const isAllMode = ui.catalogPageSize === "ALL";
    const pageSizeNum = isAllMode ? Math.max(1, books.length) : (parseInt(ui.catalogPageSize, 10) || 16);
    const totalPages = isAllMode ? 1 : Math.max(1, Math.ceil(books.length / pageSizeNum));
    if (ui.catalogPage > totalPages) ui.catalogPage = totalPages;
    if (ui.catalogPage < 1) ui.catalogPage = 1;

    const startIdx = isAllMode ? 0 : (ui.catalogPage - 1) * pageSizeNum;
    const pagedBooks = isAllMode ? books : books.slice(startIdx, startIdx + pageSizeNum);

    const paginationHTML = totalPages > 1 ? `
      <nav class="catalog-pagination" aria-label="도서 목록 페이지네이션">
        <button type="button" class="catalog-page-btn is-nav" data-catalog-page-nav="prev" ${ui.catalogPage <= 1 ? "disabled" : ""} aria-label="이전 페이지">‹ 이전</button>
        ${Array.from({ length: totalPages }, function (_, idx) {
          const p = idx + 1;
          return `<button type="button" class="catalog-page-btn ${p === ui.catalogPage ? "is-active" : ""}" data-catalog-page="${p}" aria-current="${p === ui.catalogPage ? "page" : "false"}">${p}</button>`;
        }).join("")}
        <button type="button" class="catalog-page-btn is-nav" data-catalog-page-nav="next" ${ui.catalogPage >= totalPages ? "disabled" : ""} aria-label="다음 페이지">다음 ›</button>
      </nav>
    ` : "";

    return `
      <div class="book-summary-list ${ui.viewMode === "grid" ? "is-grid-view" : ""}">
        ${pagedBooks.map(renderCatalogBookRow).join("")}
      </div>
      ${paginationHTML}
    `;
  }

  function renderCatalogView() {
    const allCats = Store.getCategoriesWithAll(state);
    const currentCat = allCats.find(function (c) { return c.id === ui.categoryId; }) || allCats[0];
    const bookTypes = [{ code: "ALL", name: "전체 구성 (단권·세트)" }].concat(Store.getActiveCodes(state, "BOOK_TYPE"));
    const books = getFilteredBooks();
    const hasSearchFilter = Boolean((ui.keyword && ui.keyword.trim()) || (ui.subKeyword && ui.subKeyword.trim()));

    mainEl.innerHTML = `
      <div class="store-container">
        <div class="catalog-layout">
          <aside class="catalog-sidebar">
            <h3 class="sidebar-group-title">분야별 도서</h3>
            <ul class="sidebar-cat-list">
              ${allCats.map(function (cat) {
                const cnt = cat.id === "ALL"
                  ? state.books.length
                  : state.books.filter(function (b) { return b.categoryId === cat.id; }).length;
                return `
                  <li>
                    <button type="button" class="sidebar-cat-item ${ui.categoryId === cat.id ? "is-active" : ""}" data-goto-cat="${Store.escapeHtml(cat.id)}">
                      <span>${Store.escapeHtml(cat.name)}</span>
                      <span>${cnt}</span>
                    </button>
                  </li>
                `;
              }).join("")}
            </ul>

            <h3 class="sidebar-group-title">단권 / 세트 구분</h3>
            <ul class="sidebar-cat-list">
              ${bookTypes.map(function (bt) {
                const cnt = bt.code === "ALL"
                  ? state.books.length
                  : state.books.filter(function (b) { return b.bookTypeCode === bt.code; }).length;
                return `
                  <li>
                    <button type="button" class="sidebar-cat-item ${ui.bookTypeFilter === bt.code ? "is-active" : ""}" data-book-type="${Store.escapeHtml(bt.code)}">
                      <span>${Store.escapeHtml(bt.name)}</span>
                      <span>${cnt}</span>
                    </button>
                  </li>
                `;
              }).join("")}
            </ul>

            <h3 class="sidebar-group-title">조건 선택</h3>
            <label class="check-label" style="margin-bottom:18px; display:flex;">
              <input type="checkbox" id="chkExcludeSoldOut" ${ui.excludeSoldOut ? "checked" : ""} />
              <span>일시품절 도서 제외</span>
            </label>

            <div class="sidebar-notice-card">
              <strong>출판부 직영 구매 혜택</strong>
              <p style="margin:6px 0 0;">
                정가 대비 23~25% 직판 할인과 구매 적립금이 제공되며, ${Store.formatKRW(state.siteConfig.freeShippingThreshold)} 이상 구매 시 무료배송됩니다.
              </p>
            </div>
          </aside>

          <section>
            <div class="mobile-category-chips">
              ${allCats.map(function (cat) {
                return `
                  <button type="button" class="chip-btn ${ui.categoryId === cat.id ? "is-active" : ""}" data-goto-cat="${Store.escapeHtml(cat.id)}">
                    ${Store.escapeHtml(cat.name)}
                  </button>
                `;
              }).join("")}
            </div>

            <div style="margin-bottom: 14px;">
              <h1 style="margin:0; font-family:var(--font-serif); font-size:1.4rem;">${Store.escapeHtml(currentCat.name)}</h1>
              <p style="margin:4px 0 0; font-size:0.86rem; color:var(--color-text-muted);">
                ${Store.escapeHtml(currentCat.desc)}
                ${ui.keyword ? ` · 검색어: <strong>"${Store.escapeHtml(ui.keyword)}"</strong>` : ""}
              </p>
            </div>

            <div class="catalog-toolbar">
              <div class="toolbar-left">
                <strong id="catalogResultCount" style="font-size:0.9rem;">총 ${books.length}종</strong>
                <button type="button" class="btn btn-sm btn-soft" id="btnClearSearch" style="${hasSearchFilter ? "" : "display:none;"}">검색 초기화 ×</button>
                <button type="button" class="btn btn-sm btn-outline pc-only-action" id="btnBatchAddCart">
                  선택 도서 한꺼번에 담기
                </button>
              </div>
              <div class="toolbar-right">
                <div class="catalog-subsearch-wrap">
                  <input type="search" class="form-input catalog-subsearch-input" id="catalogSubSearchInput" placeholder="결과 내 재검색..." aria-label="결과 내 재검색" value="${Store.escapeHtml(ui.subKeyword)}" />
                </div>
                <select class="toolbar-select" id="catalogBookTypeSelect" aria-label="단권 / 세트 구분">
                  ${bookTypes.map(function (bt) {
                    return `<option value="${Store.escapeHtml(bt.code)}" ${ui.bookTypeFilter === bt.code ? "selected" : ""}>${Store.escapeHtml(bt.name)}</option>`;
                  }).join("")}
                </select>
                <select class="toolbar-select" id="catalogSortSelect" aria-label="정렬 기준">
                  <option value="BESTSELLER" ${ui.sortBy === "BESTSELLER" ? "selected" : ""}>인기 판매순</option>
                  <option value="NEWEST" ${ui.sortBy === "NEWEST" ? "selected" : ""}>최신 출간순</option>
                  <option value="PRICE_ASC" ${ui.sortBy === "PRICE_ASC" ? "selected" : ""}>낮은 가격순</option>
                  <option value="PRICE_DESC" ${ui.sortBy === "PRICE_DESC" ? "selected" : ""}>높은 가격순</option>
                  <option value="RATING" ${ui.sortBy === "RATING" ? "selected" : ""}>독자 평점순</option>
                </select>
                <select class="toolbar-select" id="catalogPageSizeSelect" aria-label="페이지당 보기 개수">
                  <option value="16" ${ui.catalogPageSize === "16" ? "selected" : ""}>16권씩 보기</option>
                  <option value="8" ${ui.catalogPageSize === "8" ? "selected" : ""}>8권씩 보기</option>
                  <option value="ALL" ${ui.catalogPageSize === "ALL" ? "selected" : ""}>전체 보기</option>
                </select>
                <button type="button" class="btn btn-sm ${ui.viewMode === "list" ? "btn-primary" : "btn-outline"}" data-view-mode="list">목록형</button>
                <button type="button" class="btn btn-sm ${ui.viewMode === "grid" ? "btn-primary" : "btn-outline"}" data-view-mode="grid">표지형</button>
              </div>
            </div>

            <div id="catalogResultsRegion">
              ${renderCatalogResultsInner(books)}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderCatalogBookRow(book) {
    const soldOut = book.saleStatus === "OUT_OF_STOCK" || book.stockQuantity <= 0;
    const checked = ui.selectedBookIds.includes(book.id);

    return `
      <article class="book-summary-row">
        <div class="book-check-col">
          <input type="checkbox" class="book-batch-chk" value="${book.id}" ${checked ? "checked" : ""} ${soldOut ? "disabled" : ""} aria-label="${Store.escapeHtml(book.title)} 선택" />
        </div>
        <div data-open-book="${book.id}" style="cursor:pointer;">
          ${Store.renderBookCoverHTML(book)}
        </div>
        <div class="book-info-col">
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="badge badge-brand">${Store.escapeHtml(book.categoryName)}</span>
            <span class="badge ${book.isSet ? "badge-seal" : "badge-brand"}" style="${book.isSet ? "" : "background:var(--color-surface); border:1px solid var(--color-border-strong); color:var(--color-brand-800);"}">${Store.escapeHtml(book.bookTypeName || (book.isSet ? "전집 · 세트 상품" : "단권 도서"))}</span>
            ${book.mdPick ? `<span class="badge badge-seal">학당추천</span>` : ""}
            ${soldOut
              ? `<span class="badge badge-danger">일시품절</span>`
              : `<span class="badge badge-success">${Store.escapeHtml(book.shippingEta)}</span>`}
          </div>
          <h3 data-open-book="${book.id}">${Store.escapeHtml(book.title)}</h3>
          <p class="book-sub-line">${Store.escapeHtml(book.subtitle)}</p>
          <div class="book-biblio-line">
            ${Store.escapeHtml(book.author)}${book.translator ? " · " + Store.escapeHtml(book.translator) : ""} |
            ${Store.escapeHtml(book.publisher)} | ${book.publishedDate} | ${book.pageCount.toLocaleString()}쪽 | ISBN ${book.isbn13}
          </div>
          <div class="book-price-line">
            <span class="discount-pct">${book.discountRate}%↓</span>
            <span class="price-sale">${Store.formatKRW(book.salePrice)}</span>
            <span class="price-list">${Store.formatKRW(book.listPrice)}</span>
            <span class="badge badge-brand">적립 ${Store.formatKRW(book.rewardPoints)}</span>
            <span style="font-size:0.8rem; color:var(--color-text-secondary);">★ ${book.ratingAvg} (${book.reviewCount})</span>
          </div>
          <p class="book-excerpt">${Store.escapeHtml(book.summary)}</p>
        </div>
        <div class="book-action-col">
          <button type="button" class="btn btn-primary" data-add-cart="${book.id}" ${soldOut ? "disabled" : ""}>
            ${soldOut ? "일시품절" : "장바구니"}
          </button>
          <button type="button" class="btn btn-dark" data-buy-now="${book.id}" ${soldOut ? "disabled" : ""}>
            바로구매
          </button>
        </div>
      </article>
    `;
  }

  /* ========================================================================
     3. CART & CHECKOUT VIEW (장바구니 일괄관리 · 바로구매 격리 · 적립금 · 증빙 · 다중배송지)
     ======================================================================== */
  function getActiveCheckoutItems() {
    if (ui.directBuy && ui.directBuy.bookId) {
      const dbk = findBook(ui.directBuy.bookId);
      if (dbk && dbk.saleStatus !== "OUT_OF_STOCK" && dbk.stockQuantity > 0) {
        return [{
          item: { bookId: dbk.id, qty: Math.min(Math.max(1, ui.directBuy.qty || 1), dbk.stockQuantity), checked: true, isDirect: true },
          book: dbk
        }];
      }
    }
    return state.cart
      .map(function (c) { return { item: c, book: findBook(c.bookId) }; })
      .filter(function (x) { return Boolean(x.book); });
  }

  function renderCartCheckoutView() {
    const threshold = Number(state.siteConfig.freeShippingThreshold || 50000);
    const baseFee = Number(state.siteConfig.baseShippingFee || 3500);
    const isDirectMode = Boolean(ui.directBuy && ui.directBuy.bookId && findBook(ui.directBuy.bookId));

    const validItems = getActiveCheckoutItems();
    const checkedItems = validItems.filter(function (x) {
      const soldOut = x.book.saleStatus === "OUT_OF_STOCK" || x.book.stockQuantity <= 0;
      return x.item.checked && !soldOut;
    });

    const checkedTotal = checkedItems.reduce(function (sum, x) {
      return sum + x.book.salePrice * x.item.qty;
    }, 0);

    const shippingFee = checkedTotal === 0 ? 0 : (checkedTotal >= threshold ? 0 : baseFee);
    const grossTotal = checkedTotal + shippingFee;

    const isLoggedIn = Boolean(state.currentUser && state.currentUser.loggedIn);
    const curMember = getLoggedInMember();
    const availablePoints = curMember ? Math.max(0, Number(curMember.points || 0)) : 0;
    const appliedPoints = isLoggedIn ? Math.min(Math.max(0, Math.trunc(Number(ui.usePoints) || 0)), availablePoints, grossTotal) : 0;
    if (ui.usePoints !== appliedPoints) ui.usePoints = appliedPoints;

    const finalTotal = Math.max(0, grossTotal - appliedPoints);
    const expectedEarnedPoints = isLoggedIn ? Math.floor(Math.max(0, checkedTotal - appliedPoints) * 0.03) : 0;
    const remainForFree = Math.max(0, threshold - checkedTotal);
    const gaugePct = Math.min(100, Math.round((checkedTotal / threshold) * 100));

    const memberAddrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
    const defaultAddr = memberAddrs.find(function (a) { return a.isDefault; }) || memberAddrs[0] || null;

    const initialRecipient = defaultAddr ? defaultAddr.recipientName : (curMember ? (curMember.name || "") : "");
    const initialPhone = defaultAddr ? defaultAddr.recipientPhone : (curMember ? (curMember.phone || "") : "");
    const initialZip = defaultAddr ? defaultAddr.zipCode : (curMember ? (curMember.zipCode || "") : "");
    const initialAddr1 = defaultAddr ? (defaultAddr.addressLine1 || "") : (curMember ? (curMember.address || "") : "");
    const initialAddr2 = defaultAddr ? (defaultAddr.addressLine2 || "") : "";
    const initialMemo = defaultAddr ? (defaultAddr.deliveryMemo || "") : "";

    const allChecked = validItems.length > 0 && validItems.every(function (x) { return Boolean(x.item.checked); });
    const hasSoldOutInCart = !isDirectMode && validItems.some(function (x) {
      return x.book.saleStatus === "OUT_OF_STOCK" || x.book.stockQuantity <= 0;
    });

    mainEl.innerHTML = `
      <div class="store-container">
        <div class="split-view-layout">
          <div>
            <div class="free-ship-gauge-box">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong>
                  ${checkedTotal === 0
                    ? `주문하실 도서를 선택해 주세요 (${Store.formatKRW(threshold)} 이상 무료배송)`
                    : remainForFree === 0
                      ? "무료배송 대상 주문입니다! (로젠택배 배송비 0원)"
                      : `무료배송까지 ${Store.formatKRW(remainForFree)} 남았습니다 (${Store.formatKRW(threshold)} 이상 무료)`}
                </strong>
                <span class="badge badge-brand">${gaugePct}%</span>
              </div>
              <div class="gauge-track"><div class="gauge-fill" style="width:${gaugePct}%;"></div></div>
            </div>

            <div class="panel-card">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                <h2 style="margin:0; font-family:var(--font-serif); font-size:1.22rem;">
                  ${isDirectMode ? `바로구매 주문 도서 (1종)` : `장바구니 도서 (${validItems.length}종)`}
                </h2>
                ${isDirectMode ? `
                  <button type="button" class="btn btn-sm btn-outline" id="btnExitDirectBuy">
                    장바구니 전체 보기 (${state.cart.length}종) 전환
                  </button>
                ` : validItems.length > 0 ? `
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <label class="check-label" style="font-size:0.84rem; font-weight:600;">
                      <input type="checkbox" id="chkCartSelectAll" ${allChecked ? "checked" : ""} />
                      <span>전체 선택</span>
                    </label>
                    <button type="button" class="btn btn-sm btn-outline" id="btnCartRemoveSelected">선택 삭제</button>
                    ${hasSoldOutInCart ? `<button type="button" class="btn btn-sm btn-outline" id="btnCartRemoveSoldOut">품절 정리</button>` : ""}
                  </div>
                ` : ""}
              </div>

              ${isDirectMode ? `
                <div style="margin-bottom:12px; padding:10px 12px; background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:0.83rem; color:var(--color-brand-800);">
                  기존 장바구니에 담아두신 다른 도서는 그대로 유지되며, 현재 선택한 도서만 단독 결제합니다.
                </div>
              ` : ""}

              ${validItems.length === 0 ? `
                <p style="color:var(--color-text-muted); padding:24px 0;">장바구니에 담긴 도서가 없습니다.</p>
                <button type="button" class="btn btn-primary" data-goto-cat="ALL">출판도서 둘러보기</button>
              ` : validItems.map(function (x) {
                const soldOut = x.book.saleStatus === "OUT_OF_STOCK" || x.book.stockQuantity <= 0;
                const maxStock = Math.max(1, Number(x.book.stockQuantity || 99));
                return `
                  <div class="cart-item-card">
                    ${isDirectMode
                      ? `<input type="checkbox" checked disabled aria-label="바로구매 도서" />`
                      : `<input type="checkbox" class="cart-item-chk" data-book-id="${x.book.id}" ${x.item.checked && !soldOut ? "checked" : ""} ${soldOut ? "disabled" : ""} />`
                    }
                    <div data-open-book="${x.book.id}" style="cursor:pointer;">${Store.renderBookCoverHTML(x.book)}</div>
                    <div>
                      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <span class="badge badge-brand">${Store.escapeHtml(x.book.categoryName)}</span>
                        ${soldOut ? `<span class="badge badge-danger">일시품절</span>` : `<span style="font-size:0.76rem; color:var(--color-text-muted);">재고 ${x.book.stockQuantity}부</span>`}
                      </div>
                      <h4 style="margin:4px 0; font-family:var(--font-serif); cursor:pointer;" data-open-book="${x.book.id}">
                        ${Store.escapeHtml(x.book.title)}
                      </h4>
                      <div style="font-size:0.86rem; font-weight:700;">
                        권당 ${Store.formatKRW(x.book.salePrice)}
                        <span class="price-list">${Store.formatKRW(x.book.listPrice)}</span>
                        <span style="margin-left:6px; color:var(--color-brand-700); font-size:0.8rem;">합계 ${Store.formatKRW(x.book.salePrice * x.item.qty)}</span>
                      </div>
                    </div>
                    <div class="cart-item-actions" style="display:flex; align-items:center; gap:10px;">
                      <div class="qty-stepper">
                        <button type="button" data-cart-delta="-1" data-book-id="${x.book.id}" ${x.item.qty <= 1 ? "disabled" : ""}>-</button>
                        <span>${x.item.qty}</span>
                        <button type="button" data-cart-delta="1" data-book-id="${x.book.id}" ${x.item.qty >= maxStock ? "disabled" : ""}>+</button>
                      </div>
                      ${!isDirectMode ? `<button type="button" class="btn btn-sm btn-outline" data-cart-remove="${x.book.id}">삭제</button>` : ""}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            <form class="panel-card" id="checkoutOrderForm">
              <h2 style="margin:0 0 16px; font-family:var(--font-serif); font-size:1.2rem;">받는 분 정보 및 결제 · 증빙 신청</h2>

              <div id="checkoutAddressSelect" data-address-picker="true" class="checkout-address-picker" style="margin-bottom: 20px; padding: 14px 16px; background: var(--color-brand-50); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <strong style="font-size:0.98rem; color:var(--color-brand-900);">배송지 선택</strong>
                    <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:8px;">
                      ${isLoggedIn ? "등록된 배송지를 클릭하면 정보가 자동 입력됩니다" : "비회원 주문 — 아래 배송지 정보를 직접 입력하거나 도로명 주소를 검색하세요"}
                    </span>
                  </div>
                  ${isLoggedIn
                    ? `<button type="button" class="btn btn-sm btn-outline" data-nav="addresses">배송지 관리 ⚙</button>`
                    : `<a href="./login.html?returnUrl=${encodeURIComponent("./index.html?view=checkout")}" class="btn btn-sm btn-outline">회원 로그인 혜택 →</a>`}
                </div>
                <div class="checkout-address-chips">
                  ${memberAddrs.map(function (addr) {
                    const isDef = defaultAddr && defaultAddr.id === addr.id;
                    return `
                      <button type="button" class="checkout-addr-chip ${isDef ? "is-selected" : ""}" data-select-checkout-addr="${addr.id}">
                        <strong>${Store.escapeHtml(addr.addressName)}</strong>
                        ${addr.isDefault ? `<span class="badge badge-brand" style="font-size:0.7rem; padding:1px 5px;">기본</span>` : ""}
                        <small>(${Store.escapeHtml(addr.recipientName)})</small>
                      </button>
                    `;
                  }).join("")}
                  <button type="button" class="checkout-addr-chip ${!defaultAddr ? "is-selected" : ""}" data-select-checkout-addr="NEW">
                    <span>+ 새 배송지 직접 입력</span>
                  </button>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label for="recipientName">받는 분 성함 / 한의원명 *</label>
                  <input id="recipientName" name="recipientName" data-field="ordRecipient" class="form-input" type="text" placeholder="예: 홍길동 (현동한의원)" required value="${Store.escapeHtml(initialRecipient)}" />
                </div>
                <div class="form-field">
                  <label for="recipientPhone">휴대폰 번호 *</label>
                  <input id="recipientPhone" name="recipientPhone" data-field="ordPhone" class="form-input" type="tel" placeholder="010-1234-5678" required value="${Store.escapeHtml(initialPhone)}" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="form-field">
                  <label for="recipientZip">우편번호 *</label>
                  <div class="inline-input-group">
                    <input id="recipientZip" name="zipCode" data-field="ordZip" class="form-input" type="text" placeholder="06631" required value="${Store.escapeHtml(initialZip)}" />
                    <button type="button" class="btn btn-outline" data-open-postcode="checkout" style="flex-shrink:0;">우편번호 찾기</button>
                  </div>
                </div>
                <div class="form-field">
                  <label for="ordPayMethod">결제 방법 *</label>
                  <select id="ordPayMethod" class="form-input">
                    <option value="무통장입금 (${Store.escapeHtml(state.siteConfig.bankAccount)})">무통장입금 (도서출판 물고기)</option>
                    <option value="신용·체크카드 결제">신용·체크카드 결제</option>
                    <option value="계좌이체 (현금영수증 발급)">실시간 계좌이체</option>
                  </select>
                </div>
              </div>
              <div class="form-grid-2">
                <div class="form-field">
                  <label for="recipientAddress">기본 배송지 주소 (도로명/지번) *</label>
                  <input id="recipientAddress" name="addressLine1" data-field="ordAddr" class="form-input" type="text" placeholder="우편번호 찾기로 검색하거나 직접 입력" required value="${Store.escapeHtml(initialAddr1)}" />
                </div>
                <div class="form-field">
                  <label for="recipientAddress2">상세 주소 (동·호수 / 층·진료실)</label>
                  <input id="recipientAddress2" name="addressLine2" class="form-input" type="text" placeholder="예: 3층 진료실 데스크" value="${Store.escapeHtml(initialAddr2)}" />
                </div>
              </div>
              <div class="form-field">
                <label for="recipientMemo">배송 요청 메모</label>
                <div class="form-grid-2" style="gap:8px;">
                  <select id="checkoutMemoPreset" class="form-input" aria-label="배송 메모 빠른 선택">
                    <option value="">자주 쓰는 배송 메모 선택 (직접 입력 가능)</option>
                    <option value="진료실 데스크에 전달 부탁드립니다">진료실 데스크에 전달 부탁드립니다</option>
                    <option value="부재 시 경비실에 맡겨주세요">부재 시 경비실에 맡겨주세요</option>
                    <option value="문 앞에 놓아주시고 문자 부탁드립니다">문 앞에 놓아주시고 문자 부탁드립니다</option>
                    <option value="양장 서적 파손주의 부탁드립니다">양장 서적 파손주의 부탁드립니다</option>
                  </select>
                  <input id="recipientMemo" name="deliveryMemo" data-field="ordMemo" class="form-input" type="text" placeholder="직접 요청사항 입력" value="${Store.escapeHtml(initialMemo)}" />
                </div>
              </div>

              ${isLoggedIn ? `
                <div style="margin-top:14px; padding:14px 16px; background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm);">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                    <strong style="font-size:0.9rem; color:var(--color-brand-900);">구매 적립금 사용</strong>
                    <span style="font-size:0.82rem; color:var(--color-brand-700);">보유 적립금: <strong>${availablePoints.toLocaleString()}P</strong></span>
                  </div>
                  <div class="inline-input-group">
                    <input type="number" id="usePointsInput" class="form-input" min="0" max="${Math.min(availablePoints, grossTotal)}" step="100" value="${appliedPoints}" placeholder="0" />
                    <button type="button" class="btn btn-outline" id="btnUseAllPoints" style="flex-shrink:0;">전액 사용</button>
                  </div>
                </div>
              ` : ""}

              <div style="margin-top:14px; padding:14px 16px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-sm);">
                <div class="form-grid-2" style="align-items:end;">
                  <div class="form-field" style="margin-bottom:0;">
                    <label for="ordTaxProofType">현금영수증 · 전자세금계산서 (한의원 지출증빙)</label>
                    <select id="ordTaxProofType" class="form-input">
                      <option value="NONE" ${ui.taxProofType === "NONE" ? "selected" : ""}>신청 안 함 (카드전표 등)</option>
                      <option value="CASH_DEDUCT" ${ui.taxProofType === "CASH_DEDUCT" ? "selected" : ""}>현금영수증 (개인 소득공제 · 휴대폰번호)</option>
                      <option value="CASH_BIZ" ${ui.taxProofType === "CASH_BIZ" ? "selected" : ""}>현금영수증 (한의원/사업자 지출증빙)</option>
                      <option value="TAX_INVOICE" ${ui.taxProofType === "TAX_INVOICE" ? "selected" : ""}>전자세금계산서 발급 요청 (사업자번호)</option>
                    </select>
                  </div>
                  <div class="form-field" style="margin-bottom:0; ${ui.taxProofType === "NONE" ? "display:none;" : ""}" id="ordTaxProofValueWrap">
                    <label for="ordTaxProofValue">증빙 발급 번호 (휴대폰 또는 사업자등록번호)</label>
                    <input type="text" id="ordTaxProofValue" class="form-input" placeholder="예: 010-1234-5678 또는 214-92-01842" value="${Store.escapeHtml(ui.taxProofValue)}" />
                  </div>
                </div>
              </div>

              ${isLoggedIn ? `
                <div id="checkoutNewAddrSaveWrap" style="display:none; margin-top:14px; padding:12px 14px; background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm);">
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.88rem;">
                    <input type="checkbox" id="chkSaveToAddressBook" />
                    <span>이 배송지를 내 배송지 목록에 저장</span>
                  </label>
                  <div id="chkSaveDefaultSubWrap" style="display:none; margin-top:6px; margin-left:24px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.83rem;">
                      <input type="checkbox" id="chkSaveToAddressBookDefault" />
                      <span>기본 배송지로 지정</span>
                    </label>
                  </div>
                </div>
              ` : ""}
            </form>
          </div>

          <aside class="panel-card sticky-summary-panel">
            <h3 style="margin:0 0 16px; font-family:var(--font-serif);">결제 예정 금액</h3>
            <div class="summary-row">
              <span>선택 도서 금액 (${checkedItems.length}종)</span>
              <strong>${Store.formatKRW(checkedTotal)}</strong>
            </div>
            <div class="summary-row">
              <span>로젠택배 배송비</span>
              <strong>${shippingFee === 0 ? "무료 (0원)" : Store.formatKRW(shippingFee)}</strong>
            </div>
            ${appliedPoints > 0 ? `
              <div class="summary-row" style="color:var(--color-seal);">
                <span>적립금 사용 할인</span>
                <strong>-${appliedPoints.toLocaleString()}원</strong>
              </div>
            ` : ""}
            <div class="summary-row is-total">
              <span>총 결제금액</span>
              <span style="color:var(--color-seal);">${Store.formatKRW(finalTotal)}</span>
            </div>
            ${isLoggedIn ? `
              <div style="margin-top:8px; padding:8px 10px; background:var(--color-brand-50); border-radius:var(--radius-sm); font-size:0.8rem; display:flex; justify-content:space-between;">
                <span>구매 확정 적립 예정 (3%)</span>
                <strong style="color:var(--color-brand-800);">+${expectedEarnedPoints.toLocaleString()}P</strong>
              </div>
            ` : ""}
            <button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" id="btnSubmitOrder" ${checkedTotal === 0 ? "disabled" : ""}>
              ${Store.formatKRW(finalTotal)} 주문하기
            </button>
            <p style="margin:12px 0 0; font-size:0.8rem; color:var(--color-text-muted);">
              주문 완료 후 [관리자 센터 → 주문·택배 발송]에서 로젠택배 송장번호를 등록하면 배송 상태가 실시간 연동됩니다.
            </p>
          </aside>
        </div>
      </div>
    `;
  }


  /* ========================================================================
     5. ORDERS & WAYBILL SELF-LOOKUP VIEW (로젠택배 전담 2단계 배송 프로세스)
     ======================================================================== */
  function getVisibleOrdersForCurrentViewer() {
    const isLoggedIn = Boolean(state.currentUser && state.currentUser.loggedIn);
    if (isLoggedIn) {
      return state.orders.filter(function (o) {
        return o.memberLoginId === state.currentUser.loginId || o.orderNo === ui.lastCompletedOrderNo;
      });
    }
    const qNo = String(ui.guestLookupOrderNo || "").trim().toUpperCase();
    const qPhone = String(ui.guestLookupPhone || "").replace(/\D/g, "");
    return state.orders.filter(function (o) {
      if (o.memberLoginId === "guest" || o.orderNo === ui.lastCompletedOrderNo) return true;
      if (!qNo) return false;
      const ordPhone = String(o.recipientPhone || "").replace(/\D/g, "");
      return String(o.orderNo || "").toUpperCase() === qNo && (!qPhone || ordPhone === qPhone || ordPhone.slice(-4) === qPhone.slice(-4));
    });
  }

  function parseOrderDateMs(orderedAt) {
    const raw = String(orderedAt || "").trim();
    const m = raw.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (m) {
      return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    return null;
  }

  function getOrdersAnchorDateMs() {
    let maxMs = 0;
    (state.orders || []).forEach(function (o) {
      const ms = parseOrderDateMs(o.orderedAt);
      if (ms && ms > maxMs) maxMs = ms;
    });
    return maxMs || Date.UTC(2026, 10, 13);
  }

  function filterOrdersForDisplay(baseOrders) {
    const anchorMs = getOrdersAnchorDateMs();
    const dayMs = 24 * 60 * 60 * 1000;
    const periodDaysMap = { "1M": 31, "3M": 93, "6M": 186 };
    const maxAgeDays = periodDaysMap[ui.orderPeriod] || null;
    const statusFilter = ui.orderStatusFilter || "ALL";
    const kw = (ui.orderSearchKeyword || "").trim().toLowerCase();

    return baseOrders.filter(function (o) {
      if (maxAgeDays !== null) {
        const ordMs = parseOrderDateMs(o.orderedAt);
        if (ordMs !== null) {
          const diffDays = (anchorMs - ordMs) / dayMs;
          if (diffDays > maxAgeDays) return false;
        }
      }

      if (statusFilter === "PAID") {
        const isPaidWaiting = (o.orderStatus === "PAID" || o.orderStatus === "PREPARING_SHIPMENT") && !o.trackingNumber;
        if (!isPaidWaiting) return false;
      } else if (statusFilter === "SHIPPED") {
        const isShipped = o.orderStatus === "SHIPPED" || Boolean(o.trackingNumber);
        if (!isShipped) return false;
      }

      if (kw) {
        const noMatch = String(o.orderNo || "").toLowerCase().includes(kw);
        const itemMatch = (o.items || []).some(function (it) {
          const bk = findBook(it.bookId);
          const title = String(it.title || (bk && bk.title) || "").toLowerCase();
          return title.includes(kw);
        });
        if (!noMatch && !itemMatch) return false;
      }

      return true;
    });
  }

  function renderOrdersListInner(visibleOrders, filteredOrders) {
    if (visibleOrders.length === 0) {
      return `
        <div class="order-empty-state" style="padding:36px 20px; text-align:center; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md);">
          <p style="margin:0 0 12px; color:var(--color-text-secondary);">조회된 주문 내역이 없습니다.</p>
          <button type="button" class="btn btn-primary" data-goto-cat="ALL">출간 도서 둘러보기</button>
        </div>
      `;
    }

    if (filteredOrders.length === 0) {
      return `
        <div class="order-empty-state" style="padding:36px 20px; text-align:center; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md);">
          <p style="margin:0 0 12px; color:var(--color-text-secondary);">선택하신 기간·상태 또는 검색어에 해당하는 주문 내역이 없습니다.</p>
          <button type="button" class="btn btn-outline" id="btnResetOrderFilter" data-reset-order-filter="true">필터 초기화 · 전체 주문 보기</button>
        </div>
      `;
    }

    return filteredOrders.map(renderOrderTrackingCard).join("");
  }

  function ensureOrderClaimModal() {
    let modal = document.getElementById("orderClaimModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.id = "orderClaimModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "orderClaimModalTitle");
    modal.innerHTML = `
      <div class="modal-panel" style="max-width: 540px;">
        <div class="modal-header">
          <h2 class="modal-title" id="orderClaimModalTitle">교환 · 반품 신청</h2>
          <button type="button" class="modal-close" data-close-modal="orderClaimModal" aria-label="닫기">×</button>
        </div>
        <form id="orderClaimForm" class="modal-body" style="padding: 20px;">
          <input type="hidden" id="claimOrderNo" value="" />
          <div class="order-claim-modal-target" id="claimOrderSummaryBox">
            <strong id="claimOrderSummaryNo">주문번호 -</strong>
            <div id="claimOrderSummaryItems" style="font-size:0.83rem; color:var(--color-text-secondary); margin-top:3px;"></div>
          </div>

          <div class="form-field" style="margin-bottom: 12px;">
            <label for="claimTypeSelect">신청 구분 *</label>
            <select id="claimTypeSelect" name="claimType" class="form-input" required>
              <option value="EXCHANGE">교환 신청 (파본·낙장·파손)</option>
              <option value="RETURN">반품 신청 (미개봉·오배송)</option>
            </select>
          </div>

          <div class="form-field" style="margin-bottom: 12px;">
            <label for="claimReasonSelect">신청 사유 선택 *</label>
            <select id="claimReasonSelect" name="claimReason" class="form-input" required>
              <option value="파본·낙장·인쇄불량">파본 · 낙장 · 인쇄불량 (출판사 왕복 배송비 부담)</option>
              <option value="배송 중 표지·모서리 파손">배송 중 양장 표지 · 모서리 파손</option>
              <option value="주문 도서와 다른 오배송">주문 도서와 다른 도서 오배송</option>
              <option value="미개봉 단순변심 반품">미개봉 도서 반품 요청 (수령 후 7일 이내)</option>
            </select>
          </div>

          <div class="form-field" style="margin-bottom: 14px;">
            <label for="claimDetailInput">상세 사유 입력 *</label>
            <textarea id="claimDetailInput" name="claimDetail" class="form-input" rows="4" placeholder="예: 내경편 142~148쪽 인쇄 번짐(파본)으로 새 도서 교환을 요청합니다." required></textarea>
          </div>

          <div style="padding:10px 12px; background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:14px; line-height:1.55;">
            · 파본·낙장·오배송으로 인한 교환 시 왕복 로젠택배비(1588-9988)는 <strong>도서출판 물고기</strong>에서 전액 부담합니다.<br/>
            · 접수 완료 시 출판부 검수 담당자가 확인 후 회수 및 재발송 안내를 드립니다.
          </div>

          <div class="modal-footer" style="padding: 8px 0 0; display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline" data-close-modal="orderClaimModal">취소</button>
            <button type="submit" class="btn btn-primary" id="btnSubmitOrderClaim">교환·반품 신청 접수</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function openOrderClaimModal(orderNo) {
    const ord = state.orders.find(function (o) { return o.orderNo === orderNo; });
    if (!ord) return;
    const modal = ensureOrderClaimModal();
    const noInput = document.getElementById("claimOrderNo");
    const sumNo = document.getElementById("claimOrderSummaryNo");
    const sumItems = document.getElementById("claimOrderSummaryItems");
    const typeSel = document.getElementById("claimTypeSelect");
    const reasonSel = document.getElementById("claimReasonSelect");
    const detailIn = document.getElementById("claimDetailInput");

    if (noInput) noInput.value = ord.orderNo;
    if (sumNo) sumNo.textContent = "대상 주문번호: " + ord.orderNo;
    if (sumItems) {
      const titles = (ord.items || []).map(function (it) {
        return (it.title || "도서") + " × " + (it.qty || 1) + "권";
      }).join(", ");
      sumItems.textContent = titles + (ord.trackingNumber ? " | 로젠택배 " + ord.trackingNumber : "");
    }
    if (typeSel) typeSel.value = "EXCHANGE";
    if (reasonSel) reasonSel.value = "파본·낙장·인쇄불량";
    if (detailIn) detailIn.value = "";

    modal.classList.add("is-open");
    if (detailIn) {
      setTimeout(function () { detailIn.focus(); }, 40);
    }
  }

  function renderOrdersView() {
    ensureOrderClaimModal();
    const isLoggedIn = Boolean(state.currentUser && state.currentUser.loggedIn);
    const visibleOrders = getVisibleOrdersForCurrentViewer();
    const filteredOrders = filterOrdersForDisplay(visibleOrders);
    const hasActiveOrderFilter = ui.orderPeriod !== "ALL" || ui.orderStatusFilter !== "ALL" || Boolean((ui.orderSearchKeyword || "").trim());

    const countPaid = visibleOrders.filter(function (o) {
      return (o.orderStatus === "PAID" || o.orderStatus === "PREPARING_SHIPMENT") && !o.trackingNumber;
    }).length;
    const countShip = visibleOrders.filter(function (o) {
      return o.orderStatus === "SHIPPED" || Boolean(o.trackingNumber);
    }).length;
    const justOrdered = ui.lastCompletedOrderNo
      ? state.orders.find(function (o) { return o.orderNo === ui.lastCompletedOrderNo; })
      : null;
    const isBankTransferOrder = Boolean(justOrdered && String(justOrdered.paymentMethod || "").includes("무통장"));

    mainEl.innerHTML = `
      <div class="store-container section-block">
        <div class="section-head">
          <div>
            <h2>주문 내역 및 로젠택배 배송조회 안내</h2>
            <p>출판부 발송 시 로젠택배 운송장 번호가 등록되며, 안내된 공식 배송조회 페이지에서 실시간 배송 현황을 조회하실 수 있습니다.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-outline" data-nav="addresses">마이페이지 · 배송지 관리 ⚙</button>
            <a href="./admin.html?sec=orders" class="btn btn-sm btn-dark">관리자 센터에서 송장번호 입력해보기 →</a>
          </div>
        </div>

        ${justOrdered ? `
          <section id="orderCompleteCard" class="order-complete-box order-complete-card" role="status" aria-label="주문완료 확인 요약">
            <div class="order-complete-head">
              <div>
                <span class="badge badge-success" style="margin-bottom:6px;">주문이 정상적으로 접수되었습니다</span>
                <h3 class="order-complete-title">
                  주문번호 <span>${Store.escapeHtml(justOrdered.orderNo)}</span> · 최종 결제금액 <span class="order-complete-amount">${Store.formatKRW(justOrdered.finalAmount)}</span>
                </h3>
                <p class="order-complete-sub">주문일시 ${Store.escapeHtml(justOrdered.orderedAt)} · 출판부 검수 후 전담 로젠택배(1588-9988)로 안전하게 출고됩니다.</p>
              </div>
              <div class="order-complete-actions">
                <button type="button" class="btn btn-sm btn-primary" data-open-receipt="${Store.escapeHtml(justOrdered.orderNo)}">거래명세서 · 영수증 인쇄</button>
                <button type="button" class="btn btn-sm btn-outline" data-goto-cat="ALL">쇼핑 계속하기</button>
                <button type="button" class="btn btn-sm btn-soft" id="btnDismissOrderComplete" data-dismiss-order-complete="true">확인 닫기</button>
              </div>
            </div>

            ${isBankTransferOrder ? `
              <div class="order-complete-deposit-box">
                <strong>무통장입금 계좌 안내: ${Store.escapeHtml(state.siteConfig.bankAccount)}</strong>
                <span>입금하실 금액: <strong>${Store.formatKRW(justOrdered.finalAmount)}</strong> (${Store.escapeHtml(state.siteConfig.cutoffNotice)})</span>
              </div>
            ` : ""}

            <div class="order-complete-summary-grid">
              <div class="order-complete-meta-item">
                <span class="meta-label">결제수단</span>
                <strong class="meta-val">${Store.escapeHtml(justOrdered.paymentMethod)}</strong>
              </div>
              <div class="order-complete-meta-item">
                <span class="meta-label">수령인 · 연락처</span>
                <strong class="meta-val">${Store.escapeHtml(justOrdered.recipientName)}${justOrdered.recipientPhone ? " (" + Store.escapeHtml(justOrdered.recipientPhone) + ")" : ""}</strong>
              </div>
              <div class="order-complete-meta-item is-wide">
                <span class="meta-label">배송지 주소</span>
                <strong class="meta-val">${justOrdered.zipCode ? "(" + Store.escapeHtml(justOrdered.zipCode) + ") " : ""}${Store.escapeHtml(justOrdered.address)}${justOrdered.deliveryMemo ? " · 메모: " + Store.escapeHtml(justOrdered.deliveryMemo) : ""}</strong>
              </div>
              <div class="order-complete-meta-item">
                <span class="meta-label">차감 적립금 / 적립 예정 포인트</span>
                <strong class="meta-val">차감 -${Number(justOrdered.usedPoints || 0).toLocaleString()}P · 적립 +${Number(justOrdered.earnedPoints || 0).toLocaleString()}P</strong>
              </div>
              <div class="order-complete-meta-item">
                <span class="meta-label">최종 결제금액${justOrdered.taxProof ? " · 증빙" : ""}</span>
                <strong class="meta-val" style="color:var(--color-seal);">${Store.formatKRW(justOrdered.finalAmount)}${justOrdered.taxProof ? " (" + Store.escapeHtml(justOrdered.taxProof) + ")" : ""}</strong>
              </div>
            </div>
          </section>
        ` : ""}

        ${!isLoggedIn ? `
          <form class="guest-order-lookup-bar" id="guestOrdersInlineForm">
            <div style="flex:1 1 220px;">
              <strong style="display:block; font-size:0.92rem; color:var(--color-brand-900); margin-bottom:2px;">비회원 주문 · 배송 조회</strong>
              <span style="font-size:0.8rem; color:var(--color-text-muted);">주문 시 안내받은 주문번호와 수령인 휴대폰 번호로 조회하세요.</span>
            </div>
            <input type="text" id="guestInlineOrderNo" class="form-input" placeholder="주문번호 (예: ORD-20261112-0042)" value="${Store.escapeHtml(ui.guestLookupOrderNo)}" style="flex:1 1 200px;" required />
            <input type="tel" id="guestInlinePhone" class="form-input" placeholder="수령인 연락처 (뒤 4자리 가능)" value="${Store.escapeHtml(ui.guestLookupPhone)}" style="flex:1 1 180px;" required />
            <button type="submit" class="btn btn-primary" style="flex-shrink:0;">조회하기</button>
            <a href="./login.html" class="btn btn-outline" style="flex-shrink:0;">회원 로그인</a>
          </form>
        ` : ""}

        <div class="order-kpi-strip">
          <div class="order-kpi-card" style="margin:0; text-align:center; padding:16px 10px;">
            <div style="font-size:0.84rem; color:var(--color-text-muted); font-weight:600;">1단계: 입금완료 / 발송대기</div>
            <strong style="font-size:1.6rem; color:var(--color-warning);">${countPaid}</strong>
            <div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:2px;">결제 확인 후 도서 출고 준비 중</div>
          </div>
          <div class="order-kpi-card" style="margin:0; text-align:center; padding:16px 10px;">
            <div style="font-size:0.84rem; color:var(--color-text-muted); font-weight:600;">2단계: 발송완료</div>
            <strong style="font-size:1.6rem; color:var(--color-success);">${countShip}</strong>
            <div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:2px;">로젠택배 송장 등록 및 발송 완료</div>
          </div>
        </div>

        ${visibleOrders.length > 0 ? `
          <div class="delivery-steps delivery-stepper-overview" style="margin-bottom: 20px;">
            <div class="delivery-step is-active is-done"><span class="step-num">1</span> 입금완료/발송대기</div>
            <div class="delivery-step is-current"><span class="step-num">2</span> 발송완료</div>
          </div>
        ` : ""}

        <section class="carrier-directory-card" aria-label="로젠택배 공식 운송장 배송조회 안내">
          <div class="carrier-directory-head">
            <div>
              <h3>로젠택배 공식 배송조회 안내</h3>
              <p>현동서재의 모든 도서는 <strong>로젠택배 (고객센터 1588-9988)</strong>를 통해 안전하게 발송됩니다. 주문 카드의 <strong>[운송장 번호 복사]</strong> 후 공식 배송조회 페이지에서 실시간 배송 이동 경로를 직접 확인하실 수 있습니다.</p>
            </div>
            <span class="badge badge-brand">로젠택배 전담 배송</span>
          </div>
          <div class="rosen-guidance-box">
            <div class="rosen-guidance-info">
              <div class="rosen-guidance-brand">
                <strong style="font-size:1.02rem; color:var(--color-brand-900);">로젠택배 (LOGEN Logistics)</strong>
                <span class="badge badge-outline" style="margin-left:8px;">고객센터 1588-9988</span>
              </div>
              <div class="rosen-guidance-url" style="margin-top:6px;">
                <span>공식 배송조회 주소: </span>
                <a href="https://www.ilogen.com/web/personal/tkSearch" target="_blank" rel="noopener noreferrer" class="waybill-url-link">https://www.ilogen.com/web/personal/tkSearch</a>
              </div>
            </div>
            <div class="rosen-guidance-action">
              <a href="https://www.ilogen.com/web/personal/tkSearch" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">로젠택배 배송조회 바로가기 ↗</a>
            </div>
          </div>
        </section>

        <section class="order-filter-bar" aria-label="주문 내역 기간·상태 필터 및 검색">
          <div class="order-filter-groups">
            <div class="order-filter-group" role="group" aria-label="조회 기간 선택">
              <span class="order-filter-label">조회기간</span>
              <div class="order-filter-chips">
                <button type="button" class="chip-btn ${ui.orderPeriod === "ALL" ? "is-active" : ""}" data-order-period="ALL">전체</button>
                <button type="button" class="chip-btn ${ui.orderPeriod === "1M" ? "is-active" : ""}" data-order-period="1M">최근 1개월</button>
                <button type="button" class="chip-btn ${ui.orderPeriod === "3M" ? "is-active" : ""}" data-order-period="3M">3개월</button>
                <button type="button" class="chip-btn ${ui.orderPeriod === "6M" ? "is-active" : ""}" data-order-period="6M">6개월</button>
              </div>
            </div>

            <div class="order-filter-group" role="group" aria-label="주문 상태 선택">
              <span class="order-filter-label">주문상태</span>
              <div class="order-filter-chips">
                <button type="button" class="chip-btn ${ui.orderStatusFilter === "ALL" ? "is-active" : ""}" data-order-status-filter="ALL">전체</button>
                <button type="button" class="chip-btn ${ui.orderStatusFilter === "PAID" ? "is-active" : ""}" data-order-status-filter="PAID">입금완료·발송대기</button>
                <button type="button" class="chip-btn ${ui.orderStatusFilter === "SHIPPED" ? "is-active" : ""}" data-order-status-filter="SHIPPED">발송완료</button>
              </div>
            </div>
          </div>

          <div class="order-filter-search-row">
            <div class="order-history-search-wrap">
              <input type="search" id="orderHistorySearchInput" class="form-input order-history-search-input" placeholder="주문번호 또는 주문 도서명 검색..." aria-label="주문번호 또는 주문 도서명 검색" value="${Store.escapeHtml(ui.orderSearchKeyword)}" />
            </div>
            <div class="order-filter-summary">
              <span id="orderFilterResultCount">조회 <strong>${filteredOrders.length}</strong>건 / 전체 ${visibleOrders.length}건</span>
              <button type="button" class="btn btn-sm btn-soft" id="btnClearOrderFilter" data-reset-order-filter="true" style="${hasActiveOrderFilter ? "" : "display:none;"}">필터 초기화 ×</button>
            </div>
          </div>
        </section>

        <div id="ordersListRegion">
          ${renderOrdersListInner(visibleOrders, filteredOrders)}
        </div>
      </div>
    `;
  }

  function getStepIndex(order) {
    if (order.orderStatus === "CANCELED") return -1;
    if (order.orderStatus === "SHIPPED" || Boolean(order.trackingNumber)) return 1;
    return 0; // PAID (입금완료/발송대기)
  }

  function renderOrderClaimStatusBadge(order) {
    if (!order || !order.claim) return "";
    if (order.claim.status === "APPROVED") {
      return `<span class="badge badge-success" data-claim-badge="${Store.escapeHtml(order.orderNo)}">교환·반품 승인완료</span>`;
    }
    const label = order.claim.type === "RETURN" ? "반품 신청 접수중" : "교환 신청 접수중";
    return `<span class="badge badge-warning" data-claim-badge="${Store.escapeHtml(order.orderNo)}">${label}</span>`;
  }

  function renderOrderTrackingCard(order) {
    const stepIdx = getStepIndex(order);
    const steps = [
      "1단계: 입금완료 / 발송대기",
      order.orderStatus === "SHIPPED" ? "2단계: 발송완료" : "2단계: 배송 출고 준비"
    ];
    const canCancel = order.orderStatus === "PAID" && !order.trackingNumber;
    const isShippedOrder = order.orderStatus === "SHIPPED" || Boolean(order.trackingNumber);
    const hasWaybill = Boolean(order.trackingNumber);
    const carrier = hasWaybill ? Store.getCarrierInfo(order.carrierCode || order.carrierName || "LOGEN", state) : null;
    const carrierName = (carrier && carrier.name) || order.carrierName || "로젠택배";
    const trackingUrl = (carrier && carrier.trackingUrl) || "https://www.ilogen.com/web/personal/tkSearch";
    const claimObj = order.claim || null;

    return `
      <article class="panel-card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; border-bottom:1px solid var(--color-border); padding-bottom:12px;">
          <div>
            <strong>주문번호 ${Store.escapeHtml(order.orderNo)}</strong>
            <span style="font-size:0.82rem; color:var(--color-text-muted); margin-left:8px;">주문일시 ${Store.escapeHtml(order.orderedAt)}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span class="badge ${Store.getOrderStatusBadge(order.orderStatus)}">${Store.getOrderStatusLabel(order.orderStatus)}</span>
            ${hasWaybill
              ? `<span class="badge badge-brand">${Store.escapeHtml(carrierName)} · ${Store.escapeHtml(order.trackingNumber)}</span>`
              : ""}
            ${claimObj ? renderOrderClaimStatusBadge(order) : ""}
            <button type="button" class="btn btn-sm btn-outline" data-open-receipt="${Store.escapeHtml(order.orderNo)}">거래명세서·영수증</button>
            <button type="button" class="btn btn-sm btn-outline" data-reorder-items="${Store.escapeHtml(order.orderNo)}">다시 담기</button>
            ${isShippedOrder && !claimObj
              ? `<button type="button" class="btn btn-sm btn-outline" data-claim-order="${Store.escapeHtml(order.orderNo)}">교환·반품 신청</button>`
              : ""}
            <a href="./inquiry.html?orderNo=${encodeURIComponent(order.orderNo)}" class="btn btn-sm btn-outline">교환·배송 문의</a>
            ${canCancel
              ? `<button type="button" class="btn btn-sm btn-danger-outline" data-cancel-order="${order.orderNo}">주문취소</button>`
              : ""}
          </div>
        </div>

        <div style="padding:14px 0 10px;">
          <div class="order-items-list">
            ${order.items.map(function (it) {
              const bk = findBook(it.bookId);
              const thumbSrc = (it.coverThumb !== undefined && it.coverThumb !== null) ? it.coverThumb : ((bk && (bk.coverThumb || bk.coverImage)) || "");
              const bookTitle = it.title || (bk && bk.title) || "도서";
              const itemTotal = it.price * it.qty;
              return `
                <div class="order-item order-item-row">
                  <a href="./book-detail.html?id=${encodeURIComponent(it.bookId)}" class="order-item-thumb-link" title="${Store.escapeHtml(bookTitle)} 상세보기">
                    ${thumbSrc ? `
                      <img src="${Store.escapeHtml(thumbSrc)}" alt="${Store.escapeHtml(bookTitle)}" class="order-item-thumb order-book-thumb order-thumb" data-fallback="true" onerror="this.onerror=null; this.src='images/placeholder-book.svg'; this.classList.add('is-placeholder'); this.classList.add('order-thumb-placeholder');" />
                    ` : `
                      <div class="order-item-thumb order-book-thumb is-placeholder order-thumb-placeholder order-item-thumb-fallback" style="display: flex;">
                        <span class="thumb-seal-mark">冊</span>
                      </div>
                    `}
                  </a>
                  <div class="order-item-meta">
                    <a href="./book-detail.html?id=${encodeURIComponent(it.bookId)}" class="order-item-title-link">
                      <strong>${Store.escapeHtml(bookTitle)}</strong>
                    </a>
                    <div class="order-item-sub">
                      <span>${Store.formatKRW(it.price)} × ${it.qty}권</span>
                      <span class="order-item-total">${Store.formatKRW(itemTotal)}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--color-border); color:var(--color-text-secondary); font-size:0.84rem;">
            받는 분: <strong>${Store.escapeHtml(order.recipientName)}</strong> | 배송지: ${Store.escapeHtml(order.address)} | 결제금액: <strong style="color:var(--color-brand-900);">${Store.formatKRW(order.finalAmount)}</strong>
            ${order.taxProof ? ` | 증빙: ${Store.escapeHtml(order.taxProof)}` : ""}
          </div>
        </div>

        ${claimObj ? `
          <div class="order-claim-summary-bar">
            <div>
              <strong>[${claimObj.type === "RETURN" ? "반품 신청" : "교환 신청"}] ${Store.escapeHtml(claimObj.reason || "")}</strong>
              <span style="font-size:0.78rem; color:var(--color-text-muted); margin-left:6px;">접수일시 ${Store.escapeHtml(claimObj.requestedAt || "-")}</span>
              ${claimObj.detail ? `<div style="margin-top:3px; font-size:0.83rem; color:var(--color-text-secondary);">상세 사유: ${Store.escapeHtml(claimObj.detail)}</div>` : ""}
            </div>
            <div>${renderOrderClaimStatusBadge(order)}</div>
          </div>
        ` : ""}

        ${order.orderStatus !== "CANCELED" ? `
          <div class="order-card-steps">
            ${steps.map(function (label, idx) {
              const isDone = idx < stepIdx || (idx === 1 && stepIdx === 1);
              const isCurrent = idx === stepIdx;
              const cls = isCurrent ? "is-current" : (isDone ? "is-done" : "");
              const stateText = isCurrent ? (idx === 1 ? "발송완료" : "진행중") : (isDone ? "완료" : "대기");
              return `<div class="order-card-step ${cls}"><span>${label}</span><small>${stateText}</small></div>`;
            }).join("")}
          </div>

          ${hasWaybill ? `
            <div class="waybill-lookup-box">
              <div class="waybill-lookup-main">
                <div class="waybill-number-info">
                  <span style="font-size:0.8rem; color:var(--color-text-muted);">
                    발송 택배사 · 운송장 번호${order.shippedAt ? ` (발송일시: ${Store.escapeHtml(order.shippedAt)})` : ""}
                  </span>
                  <div class="waybill-number-code">
                    <span class="badge badge-brand">${Store.escapeHtml(carrierName)}</span>
                    <span>${Store.escapeHtml(order.trackingNumber)}</span>
                  </div>
                </div>
                <div class="waybill-lookup-actions">
                  <button type="button" class="btn btn-sm btn-outline" data-copy-waybill="${Store.escapeHtml(order.trackingNumber)}">운송장 번호 복사</button>
                  <a href="${Store.escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">${Store.escapeHtml(carrierName)} 배송조회 바로가기 ↗</a>
                </div>
              </div>
              <div class="waybill-url-guide">
                <div><strong>로젠택배 공식 배송조회 주소:</strong> <a href="${Store.escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer" class="waybill-url-link">${Store.escapeHtml(trackingUrl)}</a></div>
                <div style="margin-top:4px; color:var(--color-text-muted);">※ 출판부 발송 완료 이후의 상세 배송 위치는 위 운송장 번호로 로젠택배 공식 조회 페이지에서 실시간 직접 확인하실 수 있습니다. (고객센터 1588-9988)</div>
              </div>
            </div>
          ` : `
            <div class="waybill-lookup-box is-pending">
              <strong style="display:block; font-size:0.88rem; color:var(--color-brand-800); margin-bottom:4px;">
                결제(입금)가 확인되어 로젠택배 발송을 준비하고 있습니다.
              </strong>
              <span style="font-size:0.83rem; color:var(--color-text-secondary);">
                택배 발송이 완료되면 이곳에 <strong>로젠택배 운송장 번호</strong>와 <strong>공식 배송조회 링크</strong>가 즉시 안내됩니다.
              </span>
            </div>
          `}
        ` : ""}
      </article>
    `;
  }

  /* ========================================================================
     5-1. UNIFIED MYPAGE & MEMBER ADDRESS BOOK VIEW (배송지 · 적립금 · 내 활동 · 정보수정)
     ======================================================================== */
  function renderAddressBookView() {
    const isLoggedIn = Boolean(state.currentUser && state.currentUser.loggedIn);
    const curMember = getLoggedInMember();

    if (!isLoggedIn || !curMember) {
      mainEl.innerHTML = `
        <div class="store-container section-block">
          <div class="panel-card" style="max-width:540px; margin:24px auto; text-align:center; padding:36px 24px;">
            <span class="badge badge-brand" style="margin-bottom:10px;">회원 전용 마이페이지</span>
            <h2 style="margin:0 0 8px; font-family:var(--font-serif);">로그인 후 배송지 관리 및 적립금 혜택을 이용하세요</h2>
            <p style="margin:0 0 20px; color:var(--color-text-secondary); font-size:0.9rem;">
              한의원 진료실·자택 다중 배송지 저장, 3% 구매 적립금 조회, 거래명세서 출력을 지원합니다.
            </p>
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
              <a href="./login.html?returnUrl=${encodeURIComponent("./index.html?view=mypage")}" class="btn btn-primary">회원 로그인하기</a>
              <a href="./signup.html" class="btn btn-outline">신규 회원가입 (+2,000P)</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const addrs = Array.isArray(curMember.addresses) ? curMember.addresses : [];
    const pointHistory = Array.isArray(curMember.pointHistory) ? curMember.pointHistory : [];
    const myOrdersCount = state.orders.filter(function (o) { return o.memberLoginId === curMember.loginId; }).length;
    const myQnas = state.qnas.filter(function (q) {
      return q.writerId === curMember.loginId || q.loginId === curMember.loginId;
    });
    const myReviews = state.reviews.filter(function (r) {
      return r.writerId === curMember.loginId ||
        r.loginId === curMember.loginId ||
        (curMember.name && r.authorName === curMember.name);
    });
    const activeTab = ui.mypageTab || "addresses";

    let subBodyHTML = "";
    if (activeTab === "points") {
      subBodyHTML = `
        <div class="panel-card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
            <div>
              <h3 style="margin:0; font-family:var(--font-serif);">구매 적립금 적립 · 사용 내역</h3>
              <p style="margin:4px 0 0; font-size:0.84rem; color:var(--color-text-muted);">직판 도서 결제 금액의 3%가 적립되며, 주문서에서 100P 단위로 현금처럼 사용하실 수 있습니다.</p>
            </div>
            <strong style="font-size:1.25rem; color:var(--color-brand-900);">사용 가능 ${Number(curMember.points || 0).toLocaleString()}P</strong>
          </div>
          ${pointHistory.length === 0 ? `<p style="color:var(--color-text-muted);">적립금 내역이 없습니다.</p>` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${pointHistory.map(function (pt) {
                const isPlus = Number(pt.delta) >= 0;
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:12px 14px; background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm);">
                    <div>
                      <strong style="font-size:0.92rem; color:var(--color-brand-900);">${Store.escapeHtml(pt.reason)}</strong>
                      <div style="font-size:0.78rem; color:var(--color-text-muted); margin-top:2px;">일자: ${Store.escapeHtml(pt.date)} ${pt.orderNo && pt.orderNo !== "-" ? `| 주문번호: ${Store.escapeHtml(pt.orderNo)}` : ""}</div>
                    </div>
                    <div style="text-align:right;">
                      <strong style="font-size:1rem; color:${isPlus ? "var(--color-success)" : "var(--color-seal)"};">${isPlus ? "+" : ""}${Number(pt.delta).toLocaleString()}P</strong>
                      <div style="font-size:0.76rem; color:var(--color-text-muted);">잔액 ${Number(pt.balance || 0).toLocaleString()}P</div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        </div>
      `;
    } else if (activeTab === "activity") {
      subBodyHTML = `
        <div class="form-grid-2">
          <div class="panel-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
              <h3 style="margin:0; font-family:var(--font-serif); font-size:1.06rem;">내 1:1 문의 · Q&amp;A (${myQnas.length})</h3>
              <a href="./inquiry.html" class="btn btn-sm btn-outline">새 문의 쓰기 →</a>
            </div>
            ${myQnas.length === 0 ? `<p style="color:var(--color-text-muted); font-size:0.88rem;">작성하신 문의 내역이 없습니다.</p>` : myQnas.map(function (q) {
              return `
                <div style="padding:10px 0; border-bottom:1px solid var(--color-border);">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                    <span class="badge ${q.status === "ANSWERED" ? "badge-success" : "badge-warning"}">${q.status === "ANSWERED" ? "답변완료" : "답변대기"}</span>
                    <span style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(q.createdAt)}</span>
                  </div>
                  <strong style="font-size:0.9rem;">${Store.escapeHtml(q.title)}</strong>
                  ${q.answer ? `<div style="margin-top:6px; padding:8px 10px; background:var(--color-brand-50); border-radius:var(--radius-sm); font-size:0.83rem; color:var(--color-text-secondary);">답변: ${Store.escapeHtml(q.answer)}</div>` : ""}
                </div>
              `;
            }).join("")}
          </div>
          <div class="panel-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
              <h3 style="margin:0; font-family:var(--font-serif); font-size:1.06rem;">내가 남긴 독자 서평 (${myReviews.length})</h3>
              <button type="button" class="btn btn-sm btn-outline" data-goto-cat="ALL">도서 보러가기 →</button>
            </div>
            ${myReviews.length === 0 ? `<p style="color:var(--color-text-muted); font-size:0.88rem;">작성하신 구매 서평이 없습니다.</p>` : myReviews.map(function (rv) {
              const bk = findBook(rv.bookId);
              return `
                <div class="mypage-review-item" data-mypage-review-id="${Store.escapeHtml(rv.id)}" style="padding:10px 0; border-bottom:1px solid var(--color-border);">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="badge badge-success">★ ${rv.rating}.0</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(rv.createdAt)}</span>
                      <button type="button" class="btn btn-sm btn-danger-outline" data-delete-my-review="${Store.escapeHtml(rv.id)}" data-delete-review="${Store.escapeHtml(rv.id)}" style="min-height:28px; padding:0 8px; font-size:0.76rem;">삭제</button>
                    </div>
                  </div>
                  <a href="./book-detail.html?id=${encodeURIComponent(rv.bookId)}#secReviews" style="font-weight:700; font-size:0.88rem; color:var(--color-brand-800);">${bk ? Store.escapeHtml(bk.title) : Store.escapeHtml(rv.bookId)}</a>
                  <p style="margin:4px 0 0; font-size:0.85rem; color:var(--color-text-secondary);">${Store.escapeHtml(rv.content)}</p>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    } else if (activeTab === "profile") {
      subBodyHTML = `
        <form class="panel-card" id="mypageProfileForm" style="max-width:680px;">
          <h3 style="margin:0 0 14px; font-family:var(--font-serif);">회원 기본정보 및 연락처 수정</h3>
          <div class="form-grid-2">
            <div class="form-field">
              <label>아이디 (변경 불가)</label>
              <input type="text" class="form-input" value="${Store.escapeHtml(curMember.loginId)}" disabled />
            </div>
            <div class="form-field">
              <label for="mpMemberGrade">회원 구분</label>
              <input type="text" id="mpMemberGrade" class="form-input" value="${Store.escapeHtml(curMember.grade || "일반회원")}" disabled />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="mpName">성함 *</label>
              <input type="text" id="mpName" class="form-input" value="${Store.escapeHtml(curMember.name || "")}" required />
            </div>
            <div class="form-field">
              <label for="mpPhone">휴대폰 번호 *</label>
              <input type="tel" id="mpPhone" class="form-input" value="${Store.escapeHtml(curMember.phone || "")}" required />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="mpEmail">이메일 주소 *</label>
              <input type="email" id="mpEmail" class="form-input" value="${Store.escapeHtml(curMember.email || "")}" required />
            </div>
            <div class="form-field">
              <label for="mpNewPassword">새 비밀번호 변경 (선택)</label>
              <input type="password" id="mpNewPassword" class="form-input" placeholder="변경 시에만 8자 이상 입력" minlength="8" />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button type="submit" class="btn btn-primary">회원정보 저장하기</button>
          </div>
        </form>
      `;
    } else {
      subBodyHTML = addrs.length === 0 ? `
        <div class="panel-card" style="text-align:center; padding:48px 16px;">
          <p style="color:var(--color-text-muted); font-size:1rem; margin-bottom:16px;">등록된 배송지가 없습니다.</p>
          <button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 등록하기</button>
        </div>
      ` : `
        <div id="memberAddressList" data-address-list="true" class="address-book-grid">
          ${addrs.map(function (addr) {
            const isDefault = Boolean(addr.isDefault);
            const canDelete = !isDefault;
            return `
              <div class="address-card ${isDefault ? "is-default" : ""}" data-address-id="${addr.id}" data-addr-id="${addr.id}" data-is-default="${Boolean(isDefault)}">
                <div class="address-card-header">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong style="font-size:1.05rem; color:var(--color-brand-900);">${Store.escapeHtml(addr.addressName)}</strong>
                    ${isDefault ? `<span class="badge badge-brand badge-default-address" data-is-default="true">기본 배송지</span>` : ""}
                  </div>
                  <div class="address-card-actions">
                    <button type="button" class="btn btn-sm btn-outline" data-edit-address="${addr.id}" data-edit-addr="${addr.id}">수정</button>
                    ${canDelete ? `
                      <button type="button" class="btn btn-sm btn-danger-outline" data-delete-address="${addr.id}" data-delete-addr="${addr.id}">삭제</button>
                    ` : ""}
                  </div>
                </div>
                <div class="address-card-body">
                  <div class="address-field-row">
                    <span class="field-label">받는 분</span>
                    <span class="field-val"><strong>${Store.escapeHtml(addr.recipientName)}</strong></span>
                  </div>
                  <div class="address-field-row">
                    <span class="field-label">연락처</span>
                    <span class="field-val">${Store.escapeHtml(addr.recipientPhone)}</span>
                  </div>
                  <div class="address-field-row">
                    <span class="field-label">배송 주소</span>
                    <span class="field-val">(${Store.escapeHtml(addr.zipCode)}) ${Store.escapeHtml(addr.addressLine1)} ${Store.escapeHtml(addr.addressLine2 || "")}</span>
                  </div>
                  ${addr.deliveryMemo ? `
                    <div class="address-field-row">
                      <span class="field-label">배송 메모</span>
                      <span class="field-val" style="color:var(--color-text-secondary);">${Store.escapeHtml(addr.deliveryMemo)}</span>
                    </div>
                  ` : ""}
                </div>
                ${!isDefault ? `
                  <div class="address-card-footer" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border); display:flex; justify-content:flex-end;">
                    <button type="button" class="btn btn-sm btn-outline" data-set-default-address="${addr.id}" data-set-default-addr="${addr.id}">기본 배송지로 설정</button>
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    mainEl.innerHTML = `
      <div class="store-container section-block">
        <div class="section-head">
          <div>
            <h2>마이페이지 · 회원 배송지 관리</h2>
            <p>${Store.escapeHtml(curMember.name)}님 (${Store.escapeHtml(curMember.grade || "일반회원")})의 다중 배송지록, 적립금, 활동 내역을 한눈에 관리하세요.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 추가</button>
            <button type="button" class="btn btn-sm btn-outline" data-nav="orders">주문·배송 조회 (${myOrdersCount}) →</button>
          </div>
        </div>

        <div class="mypage-summary-strip">
          <div class="mypage-summary-item">
            <span>회원 등급</span>
            <strong>${Store.escapeHtml(curMember.grade || "일반회원")}</strong>
          </div>
          <div class="mypage-summary-item">
            <span>보유 적립금</span>
            <strong style="color:var(--color-brand-800);">${Number(curMember.points || 0).toLocaleString()}P</strong>
          </div>
          <div class="mypage-summary-item">
            <span>누적 주문</span>
            <strong>${myOrdersCount}건</strong>
          </div>
          <div class="mypage-summary-item">
            <span>등록 배송지</span>
            <strong>${addrs.length}곳</strong>
          </div>
        </div>

        <div class="mypage-subtabs" role="tablist" aria-label="마이페이지 메뉴">
          <button type="button" class="chip-btn ${activeTab === "addresses" ? "is-active" : ""}" data-mypage-tab="addresses">배송지 관리 (${addrs.length})</button>
          <button type="button" class="chip-btn ${activeTab === "points" ? "is-active" : ""}" data-mypage-tab="points">적립금 내역 (${Number(curMember.points || 0).toLocaleString()}P)</button>
          <button type="button" class="chip-btn ${activeTab === "activity" ? "is-active" : ""}" data-mypage-tab="activity">내 문의 · 서평 (${myQnas.length + myReviews.length})</button>
          <button type="button" class="chip-btn ${activeTab === "profile" ? "is-active" : ""}" data-mypage-tab="profile">회원정보 · 비밀번호 변경</button>
        </div>

        ${subBodyHTML}
      </div>
    `;
  }

  /* ========================================================================
     6. CUSTOMER SUPPORT VIEW (공지사항 · 자주 묻는 질문 · 1:1 문의 Q&A)
     ======================================================================== */
  function renderSupportView() {
    const visibleNotices = state.notices.filter(function (n) { return n.visible; });
    const visibleFaqs = state.faqs.filter(function (f) { return f.visible; });

    mainEl.innerHTML = `
      <div class="store-container section-block">
        <div class="section-head">
          <div>
            <h2>고객센터 · 공지 및 문의 게시판</h2>
            <p>도서 구매, 단체 주문, 배송 및 영수증 발급에 관해 궁금한 점을 남겨주세요.</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="chip-btn ${ui.supportTab === "qna" ? "is-active" : ""}" data-support-tab="qna">1:1 문의 · Q&amp;A (${state.qnas.length})</button>
            <button type="button" class="chip-btn ${ui.supportTab === "notice" ? "is-active" : ""}" data-support-tab="notice">공지사항 (${visibleNotices.length})</button>
            <button type="button" class="chip-btn ${ui.supportTab === "faq" ? "is-active" : ""}" data-support-tab="faq">자주 묻는 질문 (${visibleFaqs.length})</button>
          </div>
        </div>

        ${ui.supportTab === "notice" ? `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${visibleNotices.map(function (nt) {
              return `
                <article class="panel-card" style="margin-bottom:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                    <div>
                      ${nt.pinned ? `<span class="badge badge-seal">중요공지</span>` : ""}
                      <span class="badge badge-brand">${Store.escapeHtml(nt.category)}</span>
                    </div>
                    <span style="font-size:0.8rem; color:var(--color-text-muted);">등록일 ${nt.createdAt} · 조회 ${nt.views}</span>
                  </div>
                  <h3 style="margin:0 0 10px; font-size:1.06rem;">${Store.escapeHtml(nt.title)}</h3>
                  <p style="margin:0; font-size:0.9rem; color:var(--color-text-secondary); white-space:pre-line;">${Store.escapeHtml(nt.content)}</p>
                </article>
              `;
            }).join("")}
          </div>
        ` : ui.supportTab === "faq" ? `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${visibleFaqs.map(function (fq) {
              return `
                <article class="panel-card" style="margin-bottom:0;">
                  <div style="margin-bottom:6px;"><span class="badge badge-brand">${Store.escapeHtml(fq.category)}</span></div>
                  <h3 style="margin:0 0 8px; font-size:1rem;">Q. ${Store.escapeHtml(fq.question)}</h3>
                  <div style="background:var(--color-brand-50); padding:12px 14px; border-radius:var(--radius-sm); font-size:0.9rem; color:var(--color-text-secondary);">
                    <strong>A.</strong> ${Store.escapeHtml(fq.answer)}
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="split-view-layout" style="padding-top:4px;">
            <div>
              ${state.qnas.map(function (qa) {
                return `
                  <article class="panel-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                      <div style="display:flex; gap:6px; align-items:center;">
                        <span class="badge ${qa.status === "ANSWERED" ? "badge-success" : "badge-warning"}">
                          ${qa.status === "ANSWERED" ? "답변완료" : "답변대기"}
                        </span>
                        <span class="badge badge-brand">${Store.escapeHtml(qa.category)}</span>
                      </div>
                      <span style="font-size:0.8rem; color:var(--color-text-muted);">${Store.escapeHtml(qa.writerName)} · ${qa.createdAt}</span>
                    </div>
                    <h3 style="margin:0 0 6px; font-size:1.02rem;">${Store.escapeHtml(qa.title)}</h3>
                    ${qa.bookTitle ? `<div style="font-size:0.8rem; color:var(--color-brand-600); margin-bottom:8px;">관련 도서: ${Store.escapeHtml(qa.bookTitle)}</div>` : ""}
                    <p style="margin:0 0 10px; font-size:0.9rem; color:var(--color-text-primary);">${Store.escapeHtml(qa.question)}</p>
                    ${qa.answer ? `
                      <div style="background:var(--color-brand-50); border-left:3px solid var(--color-brand-500); padding:12px 14px; border-radius:var(--radius-sm); font-size:0.88rem;">
                        <div style="font-weight:700; color:var(--color-brand-800); margin-bottom:4px;">현동서재 출판부 답변 (${qa.answeredAt})</div>
                        <div>${Store.escapeHtml(qa.answer)}</div>
                      </div>
                    ` : `
                      <div style="font-size:0.82rem; color:var(--color-text-muted);">담당자가 확인 후 빠르게 답변을 남겨드립니다. (관리자 센터에서 답변을 등록해 보세요!)</div>
                    `}
                  </article>
                `;
              }).join("")}
            </div>

            <aside class="panel-card sticky-summary-panel">
              <h3 style="margin:0 0 12px; font-family:var(--font-serif);">새 1:1 문의 작성하기</h3>
              <form id="customerQnaForm">
                <div class="form-field">
                  <label for="qaCategory">문의 유형 *</label>
                  <select id="qaCategory" class="form-input">
                    ${(Store.getActiveCodes(state, "BOARD_CATEGORY").length
                      ? Store.getActiveCodes(state, "BOARD_CATEGORY")
                      : [{ code: "도서문의", name: "도서 내용 · 추천 문의" }, { code: "배송문의", name: "배송 · 포장 문의" }]
                    ).map(function (c) {
                      return `<option value="${Store.escapeHtml(c.code)}">${Store.escapeHtml(c.name)}</option>`;
                    }).join("")}
                  </select>
                </div>
                <div class="form-field">
                  <label for="qaWriter">작성자 성함 *</label>
                  <input id="qaWriter" type="text" class="form-input" value="${state.currentUser.loggedIn ? Store.escapeHtml(state.currentUser.name || state.currentUser.nameMasked) : ""}" placeholder="예: 홍길동" required />
                </div>
                <div class="form-field">
                  <label for="qaTitle">문의 제목 *</label>
                  <input id="qaTitle" type="text" class="form-input" placeholder="궁금하신 내용을 요약해 주세요" required />
                </div>
                <div class="form-field">
                  <label for="qaContent">문의 내용 *</label>
                  <textarea id="qaContent" class="form-input" rows="4" placeholder="문의하실 내용을 자세히 적어주세요." required></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;">문의 등록하기</button>
              </form>
            </aside>
          </div>
        `}
      </div>
    `;
  }

  /* ========================================================================
     BOOK DETAIL & POLICY MODALS
     ======================================================================== */
  function openBookDetailModal(bookId) {
    if (!bookId) return;
    window.location.href = `./book-detail.html?id=${encodeURIComponent(bookId)}`;
  }

  function renderBookDetailModalContent() {
    const titleEl = document.getElementById("bookDetailModalTitle");
    if (!titleEl) return;
    const book = findBook(ui.activeDetailBookId);
    if (!book) return;
    const soldOut = book.saleStatus === "OUT_OF_STOCK" || book.stockQuantity <= 0;
    const bookReviews = state.reviews.filter(function (r) { return r.bookId === book.id && r.visible; });

    titleEl.textContent = book.title;

    let tabBodyHTML = "";
    if (ui.activeDetailTab === "biblio") {
      tabBodyHTML = `
        <div style="padding-top:16px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
            <tbody>
              <tr><th style="text-align:left; padding:10px; background:var(--color-brand-50); border:1px solid var(--color-border); width:30%;">ISBN</th><td style="padding:10px; border:1px solid var(--color-border);">${book.isbn13}</td></tr>
              <tr><th style="text-align:left; padding:10px; background:var(--color-brand-50); border:1px solid var(--color-border);">출간일 / 규격</th><td style="padding:10px; border:1px solid var(--color-border);">${book.publishedDate} | ${Store.escapeHtml(book.dimensions)} | ${book.pageCount.toLocaleString()}쪽</td></tr>
              <tr><th style="text-align:left; padding:10px; background:var(--color-brand-50); border:1px solid var(--color-border);">추천 독자</th><td style="padding:10px; border:1px solid var(--color-border);">${Store.escapeHtml(book.targetReaders)}</td></tr>
              <tr><th style="text-align:left; padding:10px; background:var(--color-brand-50); border:1px solid var(--color-border);">출판사 소개</th><td style="padding:10px; border:1px solid var(--color-border);">${Store.escapeHtml(book.publisherReview)}</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (ui.activeDetailTab === "intro") {
      const richBody = book.descriptionHtml
        ? `<div class="rich-book-content">${Store.sanitizeRichHtml(book.descriptionHtml)}</div>`
        : `<p>${Store.escapeHtml(book.description)}</p>`;
      tabBodyHTML = `
        <div style="padding-top:16px; line-height:1.8; font-size:0.94rem;">
          <p style="font-weight:700; color:var(--color-brand-800); margin-top:0;">${Store.escapeHtml(book.summary)}</p>
          ${richBody}
        </div>
      `;
    } else if (ui.activeDetailTab === "toc") {
      tabBodyHTML = `
        <div style="padding-top:16px;">
          <pre style="white-space:pre-wrap; font-family:var(--font-sans); background:var(--color-brand-50); padding:16px; border-radius:var(--radius-sm); border:1px solid var(--color-border); line-height:1.75; margin:0;">${Store.escapeHtml(book.tableOfContents)}</pre>
        </div>
      `;
    } else if (ui.activeDetailTab === "author") {
      tabBodyHTML = `
        <div style="padding-top:16px; line-height:1.75;">
          <p>${Store.escapeHtml(book.authorBio)}</p>
        </div>
      `;
    } else if (ui.activeDetailTab === "reviews") {
      tabBodyHTML = `
        <div style="padding-top:16px;">
          <form id="detailReviewForm" style="background:var(--color-brand-50); padding:14px; border-radius:var(--radius-sm); margin-bottom:14px;">
            <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
              <strong style="font-size:0.86rem;">구매 후기 남기기</strong>
              <select id="newReviewRating" class="toolbar-select" style="height:36px; min-height:36px;">
                <option value="5">★★★★★ (5점)</option>
                <option value="4">★★★★☆ (4점)</option>
              </select>
            </div>
            <div class="inline-input-group">
              <input type="text" id="newReviewContent" class="form-input" placeholder="도서를 읽으신 소감을 남겨주세요" required />
              <button type="submit" class="btn btn-primary">등록</button>
            </div>
          </form>
          ${bookReviews.length === 0
            ? `<p style="color:var(--color-text-muted);">아직 등록된 후기가 없습니다.</p>`
            : bookReviews.map(function (rv) {
              return `
                <div style="border-bottom:1px solid var(--color-border); padding:10px 0; font-size:0.88rem;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong>★ ${rv.rating}.0 · ${Store.escapeHtml(rv.memberMask)}</strong>
                    <span style="color:var(--color-text-muted);">${rv.createdAt}</span>
                  </div>
                  <div>${Store.escapeHtml(rv.content)}</div>
                </div>
              `;
            }).join("")}
        </div>
      `;
    } else {
      tabBodyHTML = `
        <div style="padding-top:16px; font-size:0.9rem; line-height:1.8; color:var(--color-text-secondary); white-space:pre-line;">${Store.escapeHtml(state.terms.shippingPolicy.content)}</div>
      `;
    }

    document.getElementById("bookDetailModalBody").innerHTML = `
      <div class="detail-top-grid">
        <div class="detail-cover-wrap">
          ${Store.renderBookCoverHTML(book)}
        </div>
        <div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
            <span class="badge badge-brand">${Store.escapeHtml(book.categoryName)}</span>
            <span class="badge ${book.isSet ? "badge-seal" : "badge-brand"}" style="${book.isSet ? "" : "background:var(--color-surface); border:1px solid var(--color-border-strong); color:var(--color-brand-800);"}">${Store.escapeHtml(book.bookTypeName || (book.isSet ? "전집 · 세트 상품" : "단권 도서"))}</span>
            ${book.setBadge ? `<span class="badge badge-seal">${Store.escapeHtml(book.setBadge)}</span>` : ""}
          </div>
          <h3 style="margin:0 0 6px; font-family:var(--font-serif); font-size:1.3rem;">${Store.escapeHtml(book.title)}</h3>
          <p style="margin:0 0 10px; color:var(--color-text-secondary); font-size:0.9rem;">${Store.escapeHtml(book.subtitle)}</p>
          <div style="font-size:0.84rem; color:var(--color-text-muted); margin-bottom:14px;">
            ${Store.escapeHtml(book.author)}${book.translator ? " · " + Store.escapeHtml(book.translator) : ""} | ${Store.escapeHtml(book.publisher)} | 출간일 ${book.publishedDate}
          </div>
          <div style="background:var(--color-brand-50); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            <div style="margin-bottom:6px;">
              <span style="font-size:0.84rem; color:var(--color-text-muted);">정가 ${Store.formatKRW(book.listPrice)} → </span>
              <span class="discount-pct">${book.discountRate}% 할인</span>
              <strong style="font-size:1.3rem; color:var(--color-brand-900);">${Store.formatKRW(book.salePrice)}</strong>
            </div>
            <div style="font-size:0.84rem; color:var(--color-text-secondary);">
              적립금 ${Store.formatKRW(book.rewardPoints)} | 발송안내: <strong>${Store.escapeHtml(book.shippingEta)}</strong> (남은 수량 ${book.stockQuantity}부)
            </div>
          </div>
        </div>
      </div>

      <div class="detail-tabs">
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "biblio" ? "is-active" : ""}" data-detail-tab="biblio">기본정보</button>
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "intro" ? "is-active" : ""}" data-detail-tab="intro">책소개</button>
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "toc" ? "is-active" : ""}" data-detail-tab="toc">목차</button>
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "author" ? "is-active" : ""}" data-detail-tab="author">저자·역자</button>
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "reviews" ? "is-active" : ""}" data-detail-tab="reviews">구매후기(${bookReviews.length})</button>
        <button type="button" class="detail-tab-btn ${ui.activeDetailTab === "shipping" ? "is-active" : ""}" data-detail-tab="shipping">배송·교환</button>
      </div>
      ${tabBodyHTML}
    `;

    document.getElementById("bookDetailModalFooter").innerHTML = `
      <button type="button" class="btn btn-primary" data-add-cart="${book.id}" ${soldOut ? "disabled" : ""}>장바구니 담기</button>
      <button type="button" class="btn btn-dark" data-buy-now="${book.id}" ${soldOut ? "disabled" : ""}>바로 구매하기</button>
    `;
  }

  function openPolicyModal(termKey) {
    if (termKey === "serviceTerms") {
      window.location.href = "./terms.html";
    } else if (termKey === "privacyPolicy") {
      window.location.href = "./privacy.html";
    } else if (termKey === "shippingPolicy") {
      window.location.href = "./shipping-guide.html";
    } else {
      window.location.href = "./terms.html";
    }
  }

  /* ========================================================================
     Cart & Order Actions
     ======================================================================== */
  function addToCart(bookId, qty) {
    const book = findBook(bookId);
    if (!book || book.saleStatus === "OUT_OF_STOCK" || book.stockQuantity <= 0) return;
    const maxStock = Math.max(1, Number(book.stockQuantity || 99));
    const found = state.cart.find(function (c) { return c.bookId === bookId; });
    if (found) {
      found.qty = Math.min(maxStock, found.qty + (qty || 1));
      found.checked = true;
    } else {
      state.cart.push({ bookId: bookId, qty: Math.min(maxStock, qty || 1), checked: true });
    }
    Store.saveState(state);
    syncShellChrome();
    triggerBadgePop(["headerCartCount", "mobCartCount"]);
    Store.showToast(`『${book.title}』 도서가 장바구니에 담겼습니다.`);
  }

  function submitCheckoutOrder() {
    const form = document.getElementById("checkoutOrderForm");
    if (form && !form.reportValidity()) return;

    const isDirectMode = Boolean(ui.directBuy && ui.directBuy.bookId && findBook(ui.directBuy.bookId));
    const activeItems = getActiveCheckoutItems();
    const checkedPairs = activeItems.filter(function (x) {
      const soldOut = x.book.saleStatus === "OUT_OF_STOCK" || x.book.stockQuantity <= 0;
      return x.item.checked && !soldOut;
    });

    if (checkedPairs.length === 0) return;

    const getCheckoutInput = function (id1, id2) { return document.getElementById(id1) || document.getElementById(id2); };
    const recipient = ((getCheckoutInput("recipientName", "ordRecipient") || {}).value || "").trim();
    const phone = ((getCheckoutInput("recipientPhone", "ordPhone") || {}).value || "").trim();
    const zip = ((getCheckoutInput("recipientZip", "ordZip") || {}).value || "").trim();
    const addr1 = ((getCheckoutInput("recipientAddress", "ordAddr") || {}).value || "").trim();
    const addr2 = ((document.getElementById("recipientAddress2") || {}).value || "").trim();
    const fullAddr = addr1 + (addr2 ? " " + addr2 : "");
    const memo = ((getCheckoutInput("recipientMemo", "ordMemo") || {}).value || "").trim();
    const payMethod = document.getElementById("ordPayMethod").value;

    const taxTypeEl = document.getElementById("ordTaxProofType");
    const taxValEl = document.getElementById("ordTaxProofValue");
    const taxType = taxTypeEl ? taxTypeEl.value : "NONE";
    const taxVal = taxValEl ? taxValEl.value.trim() : "";
    let taxProofLabel = "";
    if (taxType === "CASH_DEDUCT") taxProofLabel = "현금영수증 (소득공제: " + (taxVal || phone) + ")";
    else if (taxType === "CASH_BIZ") taxProofLabel = "현금영수증 (지출증빙: " + (taxVal || "사업자") + ")";
    else if (taxType === "TAX_INVOICE") taxProofLabel = "전자세금계산서 (" + (taxVal || "사업자") + ")";

    const isLoggedIn = Boolean(state.currentUser && state.currentUser.loggedIn);
    const curMember = getLoggedInMember();

    const saveAddrChk = document.getElementById("chkSaveToAddressBook");
    if (saveAddrChk && saveAddrChk.checked && curMember) {
      const saveDefaultChk = document.getElementById("chkSaveToAddressBookDefault");
      const isDefault = Boolean(saveDefaultChk && saveDefaultChk.checked);
      Store.addMemberAddress(curMember.id || curMember.loginId, {
        addressName: recipient + " 배송지",
        recipientName: recipient,
        recipientPhone: phone,
        zipCode: zip,
        addressLine1: addr1,
        addressLine2: addr2,
        deliveryMemo: memo,
        isDefault: isDefault
      });
      state.members = Store.loadState().members;
    }

    const threshold = Number(state.siteConfig.freeShippingThreshold || 50000);
    const baseFee = Number(state.siteConfig.baseShippingFee || 3500);
    const bookTotal = checkedPairs.reduce(function (s, x) { return s + x.book.salePrice * x.item.qty; }, 0);
    const shippingFee = bookTotal >= threshold ? 0 : baseFee;
    const grossTotal = bookTotal + shippingFee;

    const latestMember = getLoggedInMember();
    const availPts = latestMember ? Math.max(0, Number(latestMember.points || 0)) : 0;
    const usePtsInput = document.getElementById("usePointsInput");
    const requestedPts = usePtsInput ? Math.trunc(Number(usePtsInput.value) || 0) : ui.usePoints;
    const usedPoints = isLoggedIn ? Math.min(Math.max(0, requestedPts), availPts, grossTotal) : 0;
    const finalAmount = Math.max(0, grossTotal - usedPoints);
    const earnedPoints = isLoggedIn ? Math.floor(Math.max(0, bookTotal - usedPoints) * 0.03) : 0;

    const orderNo = "ORD-20261113-" + String(Math.floor(1000 + Math.random() * 9000));

    checkedPairs.forEach(function (x) {
      x.book.stockQuantity = Math.max(0, x.book.stockQuantity - x.item.qty);
      if (x.book.stockQuantity === 0) x.book.saleStatus = "OUT_OF_STOCK";
      x.book.salesCount += x.item.qty;
    });

    state.orders.unshift({
      orderNo: orderNo,
      orderedAt: "2026-11-13 방금 전",
      memberLoginId: isLoggedIn ? state.currentUser.loginId : "guest",
      buyerName: isLoggedIn ? (state.currentUser.name || recipient) : recipient,
      recipientName: recipient,
      recipientPhone: phone,
      zipCode: zip,
      address: fullAddr,
      deliveryMemo: memo,
      paymentMethod: payMethod,
      orderStatus: "PAID",
      shipmentStatus: "READY",
      carrierCode: "",
      carrierName: "",
      trackingNumber: "",
      shippedAt: "",
      items: checkedPairs.map(function (x) {
        return {
          bookId: x.book.id,
          title: x.book.title,
          price: x.book.salePrice,
          qty: x.item.qty,
          coverThumb: x.book.coverThumb || x.book.coverImage || ""
        };
      }),
      bookTotal: bookTotal,
      shippingFee: shippingFee,
      usedPoints: usedPoints,
      earnedPoints: earnedPoints,
      taxProof: taxProofLabel,
      finalAmount: finalAmount
    });

    if (!isDirectMode) {
      state.cart = state.cart.filter(function (c) { return !c.checked; });
    }
    ui.directBuy = null;
    ui.usePoints = 0;
    ui.taxProofType = "NONE";
    ui.taxProofValue = "";
    ui.orderPeriod = "ALL";
    ui.orderStatusFilter = "ALL";
    ui.orderSearchKeyword = "";
    ui.lastCompletedOrderNo = orderNo;

    Store.saveState(state);

    if (isLoggedIn && latestMember) {
      if (usedPoints > 0) {
        Store.adjustMemberPoints(latestMember.loginId, -usedPoints, "도서 주문 적립금 사용", orderNo);
      }
      if (earnedPoints > 0) {
        Store.adjustMemberPoints(latestMember.loginId, earnedPoints, "직판 도서 구매 적립 (3%)", orderNo);
      }
      state = Store.loadState();
    }

    Store.showToast(`주문(${orderNo})이 완료되었습니다!`);
    ui.view = "orders";
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }

  /* ========================================================================
     Event Listeners
     ======================================================================== */
  function closeMobileDrawer() {
    document.getElementById("mobileDrawer").classList.remove("is-open");
    document.getElementById("mobileDrawerBackdrop").classList.remove("is-open");
  }

  document.addEventListener("click", function (e) {
    if (e.target.id === "btnLogout" || e.target.id === "btnLogoutPc" || e.target.id === "btnLogoutMob") {
      state.currentUser = { loggedIn: false, loginId: "", name: "", nameMasked: "", grade: "" };
      Store.saveState(state);
      closeMobileDrawer();
      Store.showToast("로그아웃 되었습니다.");
      render();
      return;
    }

    const postcodeBtn = e.target.closest("[data-open-postcode]");
    if (postcodeBtn && typeof Store.openPostcodeModal === "function") {
      const mode = postcodeBtn.getAttribute("data-open-postcode");
      Store.openPostcodeModal(function (picked) {
        if (mode === "addr") {
          const z = document.getElementById("addrZip");
          const l1 = document.getElementById("addrLine1");
          const l2 = document.getElementById("addrLine2");
          if (z) z.value = picked.zipCode;
          if (l1) l1.value = picked.roadAddress;
          if (l2) l2.focus();
        } else {
          const z = document.getElementById("recipientZip");
          const l1 = document.getElementById("recipientAddress");
          const l2 = document.getElementById("recipientAddress2");
          if (z) z.value = picked.zipCode;
          if (l1) l1.value = picked.roadAddress;
          if (l2) l2.focus();
        }
      });
      return;
    }

    if (e.target.id === "btnExitDirectBuy") {
      ui.directBuy = null;
      render();
      return;
    }

    if (e.target.id === "btnCartRemoveSelected") {
      const beforeLen = state.cart.length;
      state.cart = state.cart.filter(function (c) { return !c.checked; });
      if (state.cart.length === beforeLen) {
        Store.showToast("삭제할 도서를 먼저 선택해 주세요.");
        return;
      }
      Store.saveState(state);
      Store.showToast("선택한 도서가 장바구니에서 삭제되었습니다.");
      render();
      triggerBadgePop(["headerCartCount", "mobCartCount"]);
      return;
    }

    if (e.target.id === "btnCartRemoveSoldOut") {
      state.cart = state.cart.filter(function (c) {
        const bk = findBook(c.bookId);
        return bk && bk.saleStatus !== "OUT_OF_STOCK" && bk.stockQuantity > 0;
      });
      Store.saveState(state);
      Store.showToast("일시품절 도서가 장바구니에서 정리되었습니다.");
      render();
      triggerBadgePop(["headerCartCount", "mobCartCount"]);
      return;
    }

    if (e.target.id === "btnUseAllPoints") {
      const curM = getLoggedInMember();
      if (curM) {
        ui.usePoints = Math.max(0, Number(curM.points || 0));
        render();
      }
      return;
    }

    const receiptBtn = e.target.closest("[data-open-receipt]");
    if (receiptBtn && typeof Store.openOrderReceiptModal === "function") {
      Store.openOrderReceiptModal(receiptBtn.getAttribute("data-open-receipt"));
      return;
    }

    const reorderBtn = e.target.closest("[data-reorder-items]");
    if (reorderBtn) {
      const ordNo = reorderBtn.getAttribute("data-reorder-items");
      const ord = state.orders.find(function (o) { return o.orderNo === ordNo; });
      if (ord && Array.isArray(ord.items)) {
        let added = 0;
        ord.items.forEach(function (it) {
          const bk = findBook(it.bookId);
          if (bk && bk.saleStatus !== "OUT_OF_STOCK" && bk.stockQuantity > 0) {
            addToCart(bk.id, it.qty || 1);
            added++;
          }
        });
        if (added > 0) {
          ui.directBuy = null;
          ui.view = "cart";
          window.scrollTo({ top: 0, behavior: "smooth" });
          render();
        } else {
          Store.showToast("현재 재고가 있는 도서가 없어 장바구니에 담지 못했습니다.");
        }
      }
      return;
    }

    const mypageTabBtn = e.target.closest("[data-mypage-tab]");
    if (mypageTabBtn) {
      ui.mypageTab = mypageTabBtn.getAttribute("data-mypage-tab") || "addresses";
      render();
      return;
    }

    const gnbPresetBtn = e.target.closest("[data-gnb-preset]");
    if (gnbPresetBtn) {
      const preset = gnbPresetBtn.getAttribute("data-gnb-preset");
      ui.view = "catalog";
      ui.categoryId = "ALL";
      ui.keyword = "";
      ui.subKeyword = "";
      ui.catalogPage = 1;
      ui.gnbPreset = preset;
      if (preset === "SETS") {
        ui.onlySets = true;
        ui.bookTypeFilter = "SET";
        ui.sortBy = "BESTSELLER";
      } else if (preset === "NEWEST") {
        ui.onlySets = false;
        ui.bookTypeFilter = "ALL";
        ui.sortBy = "NEWEST";
      } else {
        ui.onlySets = false;
        ui.bookTypeFilter = "ALL";
        ui.sortBy = "BESTSELLER";
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const policyBtn = e.target.closest("[data-open-policy]");
    if (policyBtn) {
      const termKey = policyBtn.getAttribute("data-open-policy");
      if (termKey === "serviceTerms") window.location.href = "./terms.html";
      else if (termKey === "privacyPolicy") window.location.href = "./privacy.html";
      else if (termKey === "shippingPolicy") window.location.href = "./shipping-guide.html";
      else window.location.href = "./terms.html";
      return;
    }

    const navTrigger = e.target.closest("[data-nav]");
    if (navTrigger) {
      const nTarget = navTrigger.getAttribute("data-nav");
      if (nTarget === "support" || nTarget === "notice") {
        window.location.href = "./notice.html";
        return;
      }
      if (nTarget === "faq") {
        window.location.href = "./faq.html";
        return;
      }
      if (nTarget === "inquiry") {
        window.location.href = "./inquiry.html";
        return;
      }
      if (nTarget === "qna") {
        window.location.href = "./qna.html";
        return;
      }
      if (nTarget === "mypage" || nTarget === "addresses") {
        ui.view = "addresses";
        ui.mypageTab = "addresses";
      } else if (nTarget === "checkout" || nTarget === "cart") {
        if (nTarget === "cart") ui.directBuy = null;
        ui.view = "cart";
      } else {
        ui.view = nTarget;
      }
      closeMobileDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const mobNavBtn = e.target.closest("[data-mob-nav]");
    if (mobNavBtn) {
      const mTarget = mobNavBtn.getAttribute("data-mob-nav");
      if (mTarget === "support" || mTarget === "notice") {
        window.location.href = "./notice.html";
        return;
      }
      if (mTarget === "cart") ui.directBuy = null;
      ui.view = mTarget;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const drawerViewBtn = e.target.closest("[data-drawer-view]");
    if (drawerViewBtn) {
      const dTarget = drawerViewBtn.getAttribute("data-drawer-view");
      if (dTarget === "support" || dTarget === "notice") {
        window.location.href = "./notice.html";
        return;
      }
      ui.view = dTarget;
      closeMobileDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      const vTarget = viewBtn.getAttribute("data-view");
      if (vTarget === "support" || vTarget === "notice") {
        window.location.href = "./notice.html";
        return;
      }
      ui.gnbPreset = "";
      ui.view = vTarget;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const gotoNoticeBtn = e.target.closest("[data-goto-notice]");
    if (gotoNoticeBtn) {
      window.location.href = "./notice.html";
      return;
    }

    const gotoQnaBtn = e.target.closest("[data-goto-qna]");
    if (gotoQnaBtn) {
      window.location.href = "./qna.html";
      return;
    }

    const supTabBtn = e.target.closest("[data-support-tab]");
    if (supTabBtn) {
      ui.supportTab = supTabBtn.getAttribute("data-support-tab");
      render();
      return;
    }

    const gnbCatBtn = e.target.closest("[data-cat]");
    if (gnbCatBtn) {
      ui.view = "catalog";
      ui.categoryId = gnbCatBtn.getAttribute("data-cat");
      ui.keyword = "";
      ui.subKeyword = "";
      ui.catalogPage = 1;
      ui.onlySets = false;
      ui.bookTypeFilter = "ALL";
      ui.gnbPreset = "";
      render();
      return;
    }

    const bookTypeBtn = e.target.closest("[data-book-type]");
    if (bookTypeBtn) {
      ui.bookTypeFilter = bookTypeBtn.getAttribute("data-book-type") || "ALL";
      ui.onlySets = ui.bookTypeFilter === "SET";
      ui.catalogPage = 1;
      ui.gnbPreset = "";
      render();
      return;
    }

    const gotoCatBtn = e.target.closest("[data-goto-cat]");
    if (gotoCatBtn) {
      ui.view = "catalog";
      ui.categoryId = gotoCatBtn.getAttribute("data-goto-cat");
      ui.subKeyword = "";
      ui.catalogPage = 1;
      ui.onlySets = false;
      ui.bookTypeFilter = "ALL";
      ui.gnbPreset = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const drawerCatBtn = e.target.closest("[data-drawer-cat]");
    if (drawerCatBtn) {
      ui.view = "catalog";
      ui.categoryId = drawerCatBtn.getAttribute("data-drawer-cat");
      ui.subKeyword = "";
      ui.catalogPage = 1;
      ui.onlySets = false;
      ui.bookTypeFilter = "ALL";
      ui.gnbPreset = "";
      closeMobileDrawer();
      render();
      return;
    }

    const catPageBtn = e.target.closest("[data-catalog-page]");
    if (catPageBtn) {
      const nextPage = Math.max(1, parseInt(catPageBtn.getAttribute("data-catalog-page") || "1", 10) || 1);
      if (nextPage !== ui.catalogPage) {
        ui.catalogPage = nextPage;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      }
      return;
    }

    const catPageNavBtn = e.target.closest("[data-catalog-page-nav]");
    if (catPageNavBtn && !catPageNavBtn.disabled) {
      const dir = catPageNavBtn.getAttribute("data-catalog-page-nav");
      const allFiltered = getFilteredBooks();
      const pageSizeNum = ui.catalogPageSize === "ALL" ? Math.max(1, allFiltered.length) : (parseInt(ui.catalogPageSize, 10) || 16);
      const totalPages = ui.catalogPageSize === "ALL" ? 1 : Math.max(1, Math.ceil(allFiltered.length / pageSizeNum));
      const nextPage = dir === "prev" ? Math.max(1, ui.catalogPage - 1) : Math.min(totalPages, ui.catalogPage + 1);
      if (nextPage !== ui.catalogPage) {
        ui.catalogPage = nextPage;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      }
      return;
    }

    const heroSlideBtn = e.target.closest("[data-hero-slide]");
    if (heroSlideBtn) {
      updateHeroSlideDOM(Number(heroSlideBtn.getAttribute("data-hero-slide")));
      setupHeroCarousel();
      return;
    }

    const openBookEl = e.target.closest("[data-open-book]");
    if (openBookEl) {
      const bId = openBookEl.getAttribute("data-open-book");
      if (bId) {
        window.location.href = `./book-detail.html?id=${encodeURIComponent(bId)}`;
      }
      return;
    }

    const addCartBtn = e.target.closest("[data-add-cart]");
    if (addCartBtn) {
      addToCart(addCartBtn.getAttribute("data-add-cart"), 1);
      return;
    }

    const buyNowBtn = e.target.closest("[data-buy-now]");
    if (buyNowBtn) {
      const targetBookId = buyNowBtn.getAttribute("data-buy-now");
      const bk = findBook(targetBookId);
      if (!bk || bk.saleStatus === "OUT_OF_STOCK" || bk.stockQuantity <= 0) return;
      ui.directBuy = { bookId: bk.id, qty: 1 };
      const detailModal = document.getElementById("bookDetailModal");
      if (detailModal) detailModal.classList.remove("is-open");
      ui.view = "cart";
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const viewModeBtn = e.target.closest("[data-view-mode]");
    if (viewModeBtn) {
      ui.viewMode = viewModeBtn.getAttribute("data-view-mode");
      render();
      return;
    }

    const detailTabBtn = e.target.closest("[data-detail-tab]");
    if (detailTabBtn) {
      ui.activeDetailTab = detailTabBtn.getAttribute("data-detail-tab");
      renderBookDetailModalContent();
      return;
    }

    const closeModalBtn = e.target.closest("[data-close-modal]");
    if (closeModalBtn) {
      document.getElementById(closeModalBtn.getAttribute("data-close-modal")).classList.remove("is-open");
      return;
    }

    const cartDeltaBtn = e.target.closest("[data-cart-delta]");
    if (cartDeltaBtn) {
      const bId = cartDeltaBtn.getAttribute("data-book-id");
      const delta = Number(cartDeltaBtn.getAttribute("data-cart-delta"));
      const bk = findBook(bId);
      const maxStock = bk ? Math.max(1, Number(bk.stockQuantity || 99)) : 99;
      if (ui.directBuy && ui.directBuy.bookId === bId) {
        ui.directBuy.qty = Math.min(maxStock, Math.max(1, (ui.directBuy.qty || 1) + delta));
        render();
        return;
      }
      const item = state.cart.find(function (c) { return c.bookId === bId; });
      if (item) {
        item.qty = Math.min(maxStock, Math.max(1, item.qty + delta));
        Store.saveState(state);
        render();
      }
      return;
    }

    const cartRemoveBtn = e.target.closest("[data-cart-remove]");
    if (cartRemoveBtn) {
      const bId = cartRemoveBtn.getAttribute("data-cart-remove");
      state.cart = state.cart.filter(function (c) { return c.bookId !== bId; });
      Store.saveState(state);
      render();
      triggerBadgePop(["headerCartCount", "mobCartCount"]);
      return;
    }

    const openAddAddrBtn = e.target.closest("[data-open-address-modal], [data-open-add-addr]");
    if (openAddAddrBtn) {
      const curMember = getLoggedInMember() || state.members[0];
      const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];

      const setVal = function (id1, id2, val) {
        const el = document.getElementById(id1) || document.getElementById(id2);
        if (el) el.value = val;
      };

      document.getElementById("addressModalTitle").textContent = "새 배송지 등록";
      setVal("addrFormEditId", "addrEditId", "");
      setVal("addrName", "addrFormName", "");
      setVal("addrRecipient", "addrFormRecipient", (curMember && curMember.name) || "");
      setVal("addrPhone", "addrFormPhone", (curMember && curMember.phone) || "");
      setVal("addrZip", "addrFormZip", "");
      setVal("addrLine1", "addrFormLine1", "");
      setVal("addrLine2", "addrFormLine2", "");
      setVal("addrMemo", "addrFormMemo", "");
      const presetEl = document.getElementById("addrMemoPreset");
      if (presetEl) presetEl.value = "";
      const defEl = document.getElementById("addrIsDefault") || document.getElementById("addrFormIsDefault");
      if (defEl) defEl.checked = (addrs.length === 0);
      document.getElementById("addressEditModal").classList.add("is-open");
      return;
    }

    const editAddrBtn = e.target.closest("[data-edit-address], [data-edit-addr]");
    if (editAddrBtn) {
      const addrId = editAddrBtn.getAttribute("data-edit-address") || editAddrBtn.getAttribute("data-edit-addr");
      const curMember = getLoggedInMember() || state.members[0];
      const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
      const addr = addrs.find(function (a) { return a.id === addrId; });
      if (addr) {
        const setVal = function (id1, id2, val) {
          const el = document.getElementById(id1) || document.getElementById(id2);
          if (el) el.value = val;
        };

        document.getElementById("addressModalTitle").textContent = "배송지 수정";
        setVal("addrFormEditId", "addrEditId", addr.id);
        setVal("addrName", "addrFormName", addr.addressName || "");
        setVal("addrRecipient", "addrFormRecipient", addr.recipientName || "");
        setVal("addrPhone", "addrFormPhone", addr.recipientPhone || "");
        setVal("addrZip", "addrFormZip", addr.zipCode || "");
        setVal("addrLine1", "addrFormLine1", addr.addressLine1 || "");
        setVal("addrLine2", "addrFormLine2", addr.addressLine2 || "");
        setVal("addrMemo", "addrFormMemo", addr.deliveryMemo || "");
        const defEl = document.getElementById("addrIsDefault") || document.getElementById("addrFormIsDefault");
        if (defEl) defEl.checked = Boolean(addr.isDefault);
        document.getElementById("addressEditModal").classList.add("is-open");
      }
      return;
    }

    const deleteAddrBtn = e.target.closest("[data-delete-address], [data-delete-addr]");
    if (deleteAddrBtn) {
      const addrId = deleteAddrBtn.getAttribute("data-delete-address") || deleteAddrBtn.getAttribute("data-delete-addr");
      const curMember = getLoggedInMember() || state.members[0];
      const res = Store.deleteMemberAddress(curMember.id || curMember.loginId, addrId);
      Store.showToast(res.message);
      if (res.success) {
        state = Store.loadState();
        render();
      }
      return;
    }

    const setDefaultAddrBtn = e.target.closest("[data-set-default-address], [data-set-default-addr]");
    if (setDefaultAddrBtn) {
      const addrId = setDefaultAddrBtn.getAttribute("data-set-default-address") || setDefaultAddrBtn.getAttribute("data-set-default-addr");
      const curMember = getLoggedInMember() || state.members[0];
      const res = Store.setDefaultMemberAddress(curMember.id || curMember.loginId, addrId);
      if (res.success) {
        Store.showToast(res.message);
        state = Store.loadState();
        render();
      }
      return;
    }

    const selectCheckoutAddrBtn = e.target.closest("[data-select-checkout-addr]");
    if (selectCheckoutAddrBtn) {
      const addrId = selectCheckoutAddrBtn.getAttribute("data-select-checkout-addr");
      document.querySelectorAll("[data-select-checkout-addr]").forEach(function (btn) {
        btn.classList.remove("is-selected");
      });
      selectCheckoutAddrBtn.classList.add("is-selected");

      const setCheckoutVal = function (id1, id2, val) {
        const el = document.getElementById(id1) || document.getElementById(id2);
        if (el) el.value = val;
      };

      const newSaveWrap = document.getElementById("checkoutNewAddrSaveWrap");
      if (addrId === "NEW") {
        setCheckoutVal("recipientName", "ordRecipient", "");
        setCheckoutVal("recipientPhone", "ordPhone", "");
        setCheckoutVal("recipientZip", "ordZip", "");
        setCheckoutVal("recipientAddress", "ordAddr", "");
        setCheckoutVal("recipientAddress2", "recipientAddress2", "");
        setCheckoutVal("recipientMemo", "ordMemo", "");
        if (newSaveWrap) newSaveWrap.style.display = "block";
        const recEl = document.getElementById("recipientName") || document.getElementById("ordRecipient");
        if (recEl) recEl.focus();
      } else {
        const curMember = getLoggedInMember();
        const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
        const addr = addrs.find(function (a) { return a.id === addrId; });
        if (addr) {
          setCheckoutVal("recipientName", "ordRecipient", addr.recipientName || "");
          setCheckoutVal("recipientPhone", "ordPhone", addr.recipientPhone || "");
          setCheckoutVal("recipientZip", "ordZip", addr.zipCode || "");
          setCheckoutVal("recipientAddress", "ordAddr", addr.addressLine1 || "");
          setCheckoutVal("recipientAddress2", "recipientAddress2", addr.addressLine2 || "");
          setCheckoutVal("recipientMemo", "ordMemo", addr.deliveryMemo || "");
          if (newSaveWrap) newSaveWrap.style.display = "none";
          Store.showToast(`[${addr.addressName}] 배송지 정보가 자동 적용되었습니다.`);
        }
      }
      return;
    }

    const copyWbBtn = e.target.closest("[data-copy-waybill]");
    if (copyWbBtn) {
      const wb = copyWbBtn.getAttribute("data-copy-waybill") || "";
      if (wb) {
        const doneCopy = function () {
          Store.showToast(`로젠택배 운송장 번호(${wb})가 복사되었습니다. 공식 배송조회 페이지에 붙여넣어 조회해 주세요.`);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(wb).then(doneCopy).catch(function () {
            const ta = document.createElement("textarea");
            ta.value = wb;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); } catch (err) { /* ignore */ }
            ta.remove();
            doneCopy();
          });
        } else {
          const ta = document.createElement("textarea");
          ta.value = wb;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (err) { /* ignore */ }
          ta.remove();
          doneCopy();
        }
      }
      return;
    }

    const dismissCompleteBtn = e.target.closest("[data-dismiss-order-complete]") || (e.target.id === "btnDismissOrderComplete" ? e.target : null);
    if (dismissCompleteBtn) {
      ui.lastCompletedOrderNo = "";
      render();
      return;
    }

    const ordPeriodBtn = e.target.closest("[data-order-period]");
    if (ordPeriodBtn) {
      ui.orderPeriod = ordPeriodBtn.getAttribute("data-order-period") || "ALL";
      render();
      return;
    }

    const ordStatusBtn = e.target.closest("[data-order-status-filter]");
    if (ordStatusBtn) {
      ui.orderStatusFilter = ordStatusBtn.getAttribute("data-order-status-filter") || "ALL";
      render();
      return;
    }

    const resetOrdFilterBtn = e.target.closest("[data-reset-order-filter]");
    if (resetOrdFilterBtn) {
      ui.orderPeriod = "ALL";
      ui.orderStatusFilter = "ALL";
      ui.orderSearchKeyword = "";
      render();
      return;
    }

    const claimOrderBtn = e.target.closest("[data-claim-order]");
    if (claimOrderBtn) {
      openOrderClaimModal(claimOrderBtn.getAttribute("data-claim-order"));
      return;
    }

    const deleteMyReviewBtn = e.target.closest("[data-delete-my-review], [data-delete-review]");
    if (deleteMyReviewBtn) {
      const rvId = deleteMyReviewBtn.getAttribute("data-delete-my-review") || deleteMyReviewBtn.getAttribute("data-delete-review");
      if (rvId) {
        state = Store.loadState();
        const targetRv = (state.reviews || []).find(function (r) { return r.id === rvId; });
        state.reviews = (state.reviews || []).filter(function (r) { return r.id !== rvId; });
        if (targetRv && targetRv.bookId) {
          const targetBook = findBook(targetRv.bookId);
          if (targetBook) {
            const remainBookRevs = state.reviews.filter(function (r) { return r.bookId === targetBook.id && r.visible !== false; });
            targetBook.reviewCount = remainBookRevs.length;
            if (remainBookRevs.length > 0) {
              const avgRating = remainBookRevs.reduce(function (s, r) { return s + Number(r.rating || 5); }, 0) / remainBookRevs.length;
              targetBook.ratingAvg = Number(avgRating.toFixed(1));
            }
          }
        }
        Store.saveState(state);
        Store.showToast("작성하신 서평이 삭제되었습니다.");
        render();
      }
      return;
    }

    const cancelOrderBtn = e.target.closest("[data-cancel-order]");
    if (cancelOrderBtn) {
      const ordNo = cancelOrderBtn.getAttribute("data-cancel-order");
      state = Store.loadState();
      const ord = state.orders.find(function (o) { return o.orderNo === ordNo; });
      if (ord && !ord.trackingNumber && ord.orderStatus !== "CANCELED") {
        ord.orderStatus = "CANCELED";
        (ord.items || []).forEach(function (it) {
          const bk = findBook(it.bookId);
          if (bk) {
            const qty = Math.max(1, Number(it.qty || 1));
            bk.stockQuantity = Number(bk.stockQuantity || 0) + qty;
            if (bk.stockQuantity > 0 && bk.saleStatus === "OUT_OF_STOCK") {
              bk.saleStatus = "ON_SALE";
            }
            if (typeof bk.salesCount === "number") {
              bk.salesCount = Math.max(0, bk.salesCount - qty);
            }
          }
        });
        Store.saveState(state);
        if (ord.memberLoginId && ord.memberLoginId !== "guest") {
          if (Number(ord.usedPoints || 0) > 0) {
            Store.adjustMemberPoints(ord.memberLoginId, Number(ord.usedPoints), "주문 취소 적립금 환원", ordNo);
          }
          if (Number(ord.earnedPoints || 0) > 0) {
            Store.adjustMemberPoints(ord.memberLoginId, -Number(ord.earnedPoints), "주문 취소 구매적립 회수", ordNo);
          }
          state = Store.loadState();
        }
        if (ui.lastCompletedOrderNo === ordNo) {
          ui.lastCompletedOrderNo = "";
        }
        Store.showToast(`주문(${ordNo})이 취소되었으며 재고 및 적립금이 복원되었습니다.`);
        render();
      }
      return;
    }

    if (e.target.id === "btnClearSearch" || e.target.id === "btnResetCatalogFilter") {
      ui.keyword = "";
      ui.subKeyword = "";
      ui.catalogPage = 1;
      ui.onlySets = false;
      ui.bookTypeFilter = "ALL";
      ui.excludeSoldOut = false;
      ui.categoryId = "ALL";
      ui.gnbPreset = "";
      const pcIn = document.getElementById("pcSearchInput");
      const mobIn = document.getElementById("mobileSearchInput");
      if (pcIn) pcIn.value = "";
      if (mobIn) mobIn.value = "";
      render();
      return;
    }

    if (e.target.id === "btnBatchAddCart") {
      if (ui.selectedBookIds.length === 0) {
        Store.showToast("먼저 목록 왼쪽 체크박스에서 도서를 선택해 주세요.");
        return;
      }
      ui.selectedBookIds.forEach(function (id) { addToCart(id, 1); });
      ui.selectedBookIds = [];
      render();
      return;
    }

    if (e.target.id === "btnSubmitOrder") {
      submitCheckoutOrder();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "chkSaveToAddressBook") {
      const subWrap = document.getElementById("chkSaveDefaultSubWrap");
      if (subWrap) subWrap.style.display = e.target.checked ? "block" : "none";
    } else if (e.target.id === "chkCartSelectAll") {
      const checked = e.target.checked;
      state.cart.forEach(function (c) {
        const bk = findBook(c.bookId);
        if (bk && bk.saleStatus !== "OUT_OF_STOCK" && bk.stockQuantity > 0) {
          c.checked = checked;
        }
      });
      Store.saveState(state);
      render();
    } else if (e.target.id === "checkoutMemoPreset") {
      const memoEl = document.getElementById("recipientMemo");
      if (memoEl && e.target.value) memoEl.value = e.target.value;
    } else if (e.target.id === "addrMemoPreset") {
      const memoEl = document.getElementById("addrMemo");
      if (memoEl && e.target.value) memoEl.value = e.target.value;
    } else if (e.target.id === "usePointsInput") {
      ui.usePoints = Math.max(0, Math.trunc(Number(e.target.value) || 0));
      render();
    } else if (e.target.id === "ordTaxProofType") {
      ui.taxProofType = e.target.value;
      const valWrap = document.getElementById("ordTaxProofValueWrap");
      if (valWrap) valWrap.style.display = e.target.value === "NONE" ? "none" : "";
    } else if (e.target.id === "ordTaxProofValue") {
      ui.taxProofValue = e.target.value.trim();
    } else if (e.target.id === "chkOnlySets") {
      ui.onlySets = e.target.checked;
      ui.catalogPage = 1;
      render();
    } else if (e.target.id === "catalogBookTypeSelect") {
      ui.bookTypeFilter = e.target.value || "ALL";
      ui.onlySets = ui.bookTypeFilter === "SET";
      ui.catalogPage = 1;
      ui.gnbPreset = "";
      render();
    } else if (e.target.id === "chkExcludeSoldOut") {
      ui.excludeSoldOut = e.target.checked;
      ui.catalogPage = 1;
      render();
    } else if (e.target.id === "catalogSortSelect") {
      ui.sortBy = e.target.value;
      ui.catalogPage = 1;
      ui.gnbPreset = "";
      render();
    } else if (e.target.id === "catalogPageSizeSelect") {
      ui.catalogPageSize = e.target.value || "16";
      ui.catalogPage = 1;
      render();
    } else if (e.target.id === "claimTypeSelect") {
      const reasonSel = document.getElementById("claimReasonSelect");
      if (reasonSel) {
        reasonSel.value = e.target.value === "RETURN" ? "미개봉 단순변심 반품" : "파본·낙장·인쇄불량";
      }
    } else if (e.target.classList.contains("book-batch-chk")) {
      const bId = e.target.value;
      if (e.target.checked) {
        if (!ui.selectedBookIds.includes(bId)) ui.selectedBookIds.push(bId);
      } else {
        ui.selectedBookIds = ui.selectedBookIds.filter(function (x) { return x !== bId; });
      }
    } else if (e.target.classList.contains("cart-item-chk")) {
      const bId = e.target.getAttribute("data-book-id");
      const found = state.cart.find(function (c) { return c.bookId === bId; });
      if (found) {
        found.checked = e.target.checked;
        Store.saveState(state);
        render();
      }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "catalogSubSearchInput") {
      ui.subKeyword = e.target.value;
      ui.catalogPage = 1;
      const books = getFilteredBooks();
      const regionEl = document.getElementById("catalogResultsRegion");
      if (regionEl) {
        regionEl.innerHTML = renderCatalogResultsInner(books);
      }
      const cntEl = document.getElementById("catalogResultCount");
      if (cntEl) {
        cntEl.textContent = "총 " + books.length + "종";
      }
      const clearBtn = document.getElementById("btnClearSearch");
      if (clearBtn) {
        const hasSearch = Boolean((ui.keyword && ui.keyword.trim()) || (ui.subKeyword && ui.subKeyword.trim()));
        clearBtn.style.display = hasSearch ? "" : "none";
      }
      setupScrollReveal();
    } else if (e.target.id === "orderHistorySearchInput") {
      ui.orderSearchKeyword = e.target.value;
      const visibleOrders = getVisibleOrdersForCurrentViewer();
      const filteredOrders = filterOrdersForDisplay(visibleOrders);
      const listEl = document.getElementById("ordersListRegion");
      if (listEl) {
        listEl.innerHTML = renderOrdersListInner(visibleOrders, filteredOrders);
      }
      const cntEl = document.getElementById("orderFilterResultCount");
      if (cntEl) {
        cntEl.innerHTML = "조회 <strong>" + filteredOrders.length + "</strong>건 / 전체 " + visibleOrders.length + "건";
      }
      const clearFilterBtn = document.getElementById("btnClearOrderFilter");
      if (clearFilterBtn) {
        const hasFilter = ui.orderPeriod !== "ALL" || ui.orderStatusFilter !== "ALL" || Boolean((ui.orderSearchKeyword || "").trim());
        clearFilterBtn.style.display = hasFilter ? "" : "none";
      }
      setupScrollReveal();
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id === "orderClaimForm") {
      e.preventDefault();
      const ordNo = (document.getElementById("claimOrderNo") && document.getElementById("claimOrderNo").value.trim()) || "";
      const claimType = (document.getElementById("claimTypeSelect") && document.getElementById("claimTypeSelect").value) || "EXCHANGE";
      const claimReason = (document.getElementById("claimReasonSelect") && document.getElementById("claimReasonSelect").value) || "파본·낙장·인쇄불량";
      const claimDetail = (document.getElementById("claimDetailInput") && document.getElementById("claimDetailInput").value.trim()) || "";

      if (!ordNo) return;
      if (!claimDetail) {
        Store.showToast("교환·반품 상세 사유를 입력해 주세요.");
        const dIn = document.getElementById("claimDetailInput");
        if (dIn) dIn.focus();
        return;
      }

      state = Store.loadState();
      const ord = state.orders.find(function (o) { return o.orderNo === ordNo; });
      if (!ord) {
        Store.showToast("대상 주문을 찾을 수 없습니다.");
        return;
      }

      const now = new Date();
      const pad2 = function (n) { return String(n).padStart(2, "0"); };
      const requestedAt = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()) + " " + pad2(now.getHours()) + ":" + pad2(now.getMinutes());

      // 기본 주문 상태(orderStatus: "SHIPPED")는 변경하지 않고 별도 claim 객체만 기록하여 관리기와 연동
      ord.claim = {
        type: claimType,
        reason: claimReason,
        detail: claimDetail,
        status: "REQUESTED",
        requestedAt: requestedAt
      };
      Store.saveState(state);

      const claimModal = document.getElementById("orderClaimModal");
      if (claimModal) claimModal.classList.remove("is-open");

      const typeLabel = claimType === "RETURN" ? "반품 신청" : "교환 신청";
      Store.showToast(`주문(${ordNo})의 ${typeLabel}이 정상 접수되었습니다.`);
      render();
      return;
    } else if (e.target.id === "addressEditForm") {
      e.preventDefault();
      const getVal = function (id1, id2) {
        const el = document.getElementById(id1) || document.getElementById(id2);
        return el ? el.value.trim() : "";
      };

      const editId = getVal("addrFormEditId", "addrEditId");
      const curMember = getLoggedInMember() || state.members[0];

      const phoneRaw = getVal("addrPhone", "addrFormPhone");
      const phoneDigits = phoneRaw.replace(/\D/g, "");
      if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) {
        Store.showToast("올바른 휴대폰 번호 형식을 입력해 주세요.");
        const pEl = document.getElementById("addrPhone") || document.getElementById("addrFormPhone");
        if (pEl) pEl.focus();
        return;
      }

      const defEl = document.getElementById("addrIsDefault") || document.getElementById("addrFormIsDefault");
      const addrData = {
        addressName: getVal("addrName", "addrFormName"),
        recipientName: getVal("addrRecipient", "addrFormRecipient"),
        recipientPhone: phoneRaw,
        zipCode: getVal("addrZip", "addrFormZip"),
        addressLine1: getVal("addrLine1", "addrFormLine1"),
        addressLine2: getVal("addrLine2", "addrFormLine2"),
        deliveryMemo: getVal("addrMemo", "addrFormMemo"),
        isDefault: Boolean(defEl && defEl.checked)
      };

      if (editId) {
        const res = Store.updateMemberAddress(curMember.id || curMember.loginId, editId, addrData);
        if (res.success) {
          Store.showToast("배송지 정보가 수정되었습니다.");
        } else {
          Store.showToast(res.message);
          return;
        }
      } else {
        const res = Store.addMemberAddress(curMember.id || curMember.loginId, addrData);
        if (res.success) {
          Store.showToast("새 배송지가 등록되었습니다.");
        } else {
          Store.showToast(res.message);
          return;
        }
      }
      const modal = document.getElementById("addressEditModal");
      if (modal) modal.classList.remove("is-open");
      state = Store.loadState();
      render();
      return;
    } else if (e.target.id === "mypageProfileForm") {
      e.preventDefault();
      const curM = getLoggedInMember();
      if (!curM) return;
      const newName = document.getElementById("mpName").value.trim();
      const newPhone = document.getElementById("mpPhone").value.trim();
      const newEmail = document.getElementById("mpEmail").value.trim();
      const newPw = document.getElementById("mpNewPassword").value;
      if (!/^01[016789]\d{7,8}$/.test(newPhone.replace(/\D/g, ""))) {
        Store.showToast("올바른 휴대폰 번호 형식을 입력해 주세요.");
        return;
      }
      curM.name = newName;
      curM.phone = newPhone;
      curM.email = newEmail;
      if (newPw && newPw.length >= 8) {
        curM.password = newPw;
      }
      state.currentUser.name = newName;
      state.currentUser.nameMasked = Store.maskKoreanName(newName);
      Store.saveState(state);
      Store.showToast("회원 기본정보가 안전하게 변경되었습니다.");
      render();
      return;
    } else if (e.target.id === "guestOrdersInlineForm") {
      e.preventDefault();
      ui.guestLookupOrderNo = document.getElementById("guestInlineOrderNo").value.trim();
      ui.guestLookupPhone = document.getElementById("guestInlinePhone").value.trim();
      ui.orderPeriod = "ALL";
      ui.orderStatusFilter = "ALL";
      ui.orderSearchKeyword = "";
      const found = getVisibleOrdersForCurrentViewer();
      if (found.length === 0) {
        Store.showToast("입력하신 주문번호·연락처와 일치하는 주문을 찾지 못했습니다.");
      } else {
        Store.showToast(`주문 내역 ${found.length}건이 조회되었습니다.`);
      }
      render();
      return;
    } else if (e.target.id === "pcSearchForm") {
      e.preventDefault();
      ui.searchTarget = document.getElementById("pcSearchTarget").value;
      ui.keyword = document.getElementById("pcSearchInput").value.trim();
      ui.subKeyword = "";
      ui.catalogPage = 1;
      if (ui.keyword && typeof Store.addRecentKeyword === "function") {
        Store.addRecentKeyword(ui.keyword);
      }
      ui.gnbPreset = "";
      ui.view = "catalog";
      render();
    } else if (e.target.id === "mobileSearchForm") {
      e.preventDefault();
      ui.searchTarget = document.getElementById("mobileSearchTarget").value;
      ui.keyword = document.getElementById("mobileSearchInput").value.trim();
      ui.subKeyword = "";
      ui.catalogPage = 1;
      if (ui.keyword && typeof Store.addRecentKeyword === "function") {
        Store.addRecentKeyword(ui.keyword);
      }
      ui.gnbPreset = "";
      ui.view = "catalog";
      document.getElementById("mobileSearchDrawer").classList.remove("is-open");
      render();
    } else if (e.target.id === "detailReviewForm") {
      e.preventDefault();
      const content = document.getElementById("newReviewContent").value.trim();
      const rating = Number(document.getElementById("newReviewRating").value);
      if (!content) return;
      state.reviews.unshift({
        id: "RV-" + Date.now(),
        bookId: ui.activeDetailBookId,
        writerId: state.currentUser.loginId || "guest",
        loginId: state.currentUser.loginId || "guest",
        memberMask: (state.currentUser.nameMasked || "구매독자") + " (" + (state.currentUser.grade || "회원") + ")",
        rating: rating,
        isBest: false,
        visible: true,
        createdAt: "2026-11-13",
        content: content
      });
      Store.saveState(state);
      Store.showToast("구매 후기가 등록되었습니다.");
      renderBookDetailModalContent();
    } else if (e.target.id === "customerQnaForm") {
      e.preventDefault();
      const cat = document.getElementById("qaCategory").value;
      const writer = document.getElementById("qaWriter").value.trim();
      const title = document.getElementById("qaTitle").value.trim();
      const content = document.getElementById("qaContent").value.trim();
      if (!title || !content) return;

      state.qnas.unshift({
        id: "QA-" + Math.floor(205 + Math.random() * 700),
        category: cat,
        status: "WAITING",
        writerName: Store.maskKoreanName(writer),
        writerId: state.currentUser.loginId || "guest",
        bookTitle: "",
        title: title,
        question: content,
        createdAt: "2026-11-13 방금 전",
        answer: "",
        answeredAt: ""
      });
      Store.saveState(state);
      Store.showToast("1:1 문의가 등록되었습니다. 관리자 센터 [1:1 문의 답변] 메뉴에서도 바로 확인됩니다.");
      render();
    }
  });

  window.addEventListener("storage", function () {
    state = Store.loadState();
    render();
  });

  // Prevent detached #btnToggleQuickRecent click from immediately triggering document outside-close
  if (document.body) {
    document.body.addEventListener("click", function (e) {
      if (e.target && typeof e.target.closest === "function" && e.target.closest("#btnToggleQuickRecent, [data-close-quick-recent]")) {
        e.stopPropagation();
      }
    });
  }

  document.getElementById("btnMobileMenu").addEventListener("click", function () {
    document.getElementById("mobileDrawer").classList.add("is-open");
    document.getElementById("mobileDrawerBackdrop").classList.add("is-open");
  });
  document.getElementById("btnCloseMobileDrawer").addEventListener("click", closeMobileDrawer);
  document.getElementById("mobileDrawerBackdrop").addEventListener("click", closeMobileDrawer);

  const resetDemoBtn = document.getElementById("btnResetDemo");
  if (resetDemoBtn) {
    resetDemoBtn.addEventListener("click", function () {
      state = Store.resetState();
      ui.view = "home";
      ui.directBuy = null;
      ui.subKeyword = "";
      ui.catalogPageSize = "16";
      ui.catalogPage = 1;
      ui.orderPeriod = "ALL";
      ui.orderStatusFilter = "ALL";
      ui.orderSearchKeyword = "";
      ui.lastCompletedOrderNo = "";
      render();
      Store.showToast("모든 화면 데이터가 초기 상태로 복원되었습니다.");
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-footer-reset]")) {
      state = Store.resetState();
      ui.view = "home";
      ui.directBuy = null;
      ui.subKeyword = "";
      ui.catalogPageSize = "16";
      ui.catalogPage = 1;
      ui.orderPeriod = "ALL";
      ui.orderStatusFilter = "ALL";
      ui.orderSearchKeyword = "";
      ui.lastCompletedOrderNo = "";
      render();
      Store.showToast("모든 화면 데이터가 초기 상태로 복원되었습니다.");
    }
  });

  render();
})();

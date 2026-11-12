/* ==========================================================================
   Storefront Interactive Controller (js/store.js)
   쇼핑몰 메인 · 도서탐색 · 상세보기 · 장바구니/주문 · 배송조회 · 고객센터(공지/FAQ/Q&A)
   ========================================================================== */

(function () {
  const Store = window.HyundongStore || window.Store;
  let state = Store.loadState();

  const params = new URLSearchParams(window.location.search);
  const rawView = params.get("view") || "home";
  const initialView = (rawView === "mypage" ? "addresses" : (rawView === "checkout" ? "cart" : rawView));

  let ui = {
    view: initialView, // home | catalog | cart | orders | addresses | support
    categoryId: "ALL",
    bookTypeFilter: "ALL",
    searchTarget: "ALL",
    keyword: "",
    onlySets: false,
    excludeSoldOut: false,
    sortBy: "BESTSELLER",
    viewMode: "list",
    selectedBookIds: [],
    activeDetailBookId: null,
    activeDetailTab: "biblio",
    supportTab: "qna", // notice | faq | qna
    heroSlideIdx: 0
  };

  let heroTimer = null;
  let revealObserver = null;

  const HANUI_PLAQUES = [
    { id: "DONGEUI", hanja: "東醫", title: "동의보감 · 경전", sub: "원문 대조 정본 직역서" },
    { id: "DIAGNOSIS", hanja: "脈診", title: "진단 · 맥진학", sub: "사진법 · 맥진 실전 지침" },
    { id: "FORMULA", hanja: "方劑", title: "방제 · 처방집", sub: "진료실 상비 처방 해설" },
    { id: "CLINICAL", hanja: "臨床", title: "임상 · 강의집", sub: "학당 강의록 · 증례 토론" },
    { id: "PHILOSOPHY", hanja: "養生", title: "양생 · 인체생리", sub: "한방 생리 · 섭생 입문" }
  ];

  const mainEl = document.getElementById("storeMainContent");

  function findBook(bookId) {
    return state.books.find(function (b) { return b.id === bookId; });
  }

  function syncShellChrome() {
    const cartCount = state.cart.reduce(function (sum, c) { return sum + c.qty; }, 0);
    const cartEl = document.getElementById("headerCartCount");
    if (cartEl) cartEl.textContent = cartCount;
    const mobCartEl = document.getElementById("mobCartCount");
    if (mobCartEl) mobCartEl.textContent = cartCount;

    // 상단 띠배너 연동
    const topRibbon = state.banners.find(function (b) { return b.position === "TOP_BAR" && b.active; });
    const topRibbonBar = document.getElementById("topRibbonBar");
    const topRibbonText = document.getElementById("topRibbonText");
    if (topRibbon) {
      topRibbonBar.style.display = "";
      topRibbonText.textContent = topRibbon.title;
    } else {
      topRibbonText.textContent = `${state.siteConfig.mallName} · ${Store.formatKRW(state.siteConfig.freeShippingThreshold)} 이상 무료배송`;
    }

    // 상단 우측 회원 메뉴 (별도 페이지 로그인/회원가입 연결)
    const pcAuthEl = document.getElementById("pcAuthUtilLinks");
    const mobStatusEl = document.getElementById("mobileUserStatusText");
    const mobActionRow = document.getElementById("mobileAuthActionRow");

    if (state.currentUser && state.currentUser.loggedIn) {
      pcAuthEl.innerHTML = `
        <span><strong>${Store.escapeHtml(state.currentUser.name || state.currentUser.nameMasked)}</strong>님 (${Store.escapeHtml(state.currentUser.grade)})</span>
        <button type="button" class="store-util-btn" id="btnLogoutPc">로그아웃</button>
        <button type="button" class="store-util-btn" data-nav="addresses"><strong>배송지 관리</strong></button>
        <button type="button" class="store-util-btn" data-nav="orders">주문·배송조회</button>
        <span>고객센터 ${Store.escapeHtml(state.siteConfig.csPhone)}</span>
      `;
      mobStatusEl.textContent = `${state.currentUser.name || state.currentUser.nameMasked}님 로그인 중 (${state.currentUser.grade})`;
      mobActionRow.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline" style="flex:1;" id="btnLogoutMob">로그아웃</button>
        <button type="button" class="btn btn-sm btn-outline" style="flex:1;" data-nav="addresses">배송지 관리</button>
        <a href="./signup.html" class="btn btn-sm btn-primary" style="flex:1;">회원가입</a>
      `;
    } else {
      pcAuthEl.innerHTML = `
        <a href="./login.html" class="store-util-btn"><strong>로그인</strong></a>
        <a href="./signup.html" class="store-util-btn">회원가입</a>
        <button type="button" class="store-util-btn" data-nav="orders">주문·배송조회</button>
        <span>고객센터 ${Store.escapeHtml(state.siteConfig.csPhone)}</span>
      `;
      mobStatusEl.textContent = "로그인 후 적립금 혜택을 받아보세요";
      mobActionRow.innerHTML = `
        <a href="./login.html" class="btn btn-sm btn-primary" style="flex:1;">로그인</a>
        <a href="./signup.html" class="btn btn-sm btn-outline" style="flex:1;">회원가입</a>
      `;
    }

    // PC 수평 GNB 메뉴 동적 렌더링 (관리기 [도서 분야] 공통코드 실시간 연동)
    const gnbEl = document.getElementById("pcGnbList");
    if (gnbEl) {
      const activeCats = Store.getActiveCodes(state, "BOOK_CATEGORY");
      gnbEl.innerHTML =
        `<li><button type="button" class="store-gnb-btn" data-view="home">홈</button></li>` +
        `<li><button type="button" class="store-gnb-btn" data-cat="ALL">전체 도서</button></li>` +
        activeCats.map(function (c) {
          const compactName = String(c.name || "").replace(/\s*·\s*/g, "·");
          return `<li><button type="button" class="store-gnb-btn" data-cat="${Store.escapeHtml(c.code)}">${Store.escapeHtml(compactName)}</button></li>`;
        }).join("") +
        `<li class="store-gnb-item-right"><a href="./notice.html" class="store-gnb-btn">공지사항</a></li>` +
        `<li><a href="./faq.html" class="store-gnb-btn">자주 묻는 질문</a></li>` +
        `<li><a href="./inquiry.html" class="store-gnb-btn">1:1 문의</a></li>` +
        `<li><a href="./qna.html" class="store-gnb-btn">독자 Q&amp;A</a></li>`;
    }

    // GNB 활성 표시
    document.querySelectorAll(".store-gnb-btn").forEach(function (btn) {
      const btnView = btn.getAttribute("data-view");
      const btnCat = btn.getAttribute("data-cat");
      const active =
        (btnView && ui.view === btnView) ||
        (ui.view === "catalog" && btnCat === ui.categoryId);
      btn.classList.toggle("is-active", Boolean(active));
    });

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
        <strong style="font-family: var(--font-serif); font-size: 1.08rem; color: #ffffff;">
          ${Store.escapeHtml(cfg.mallName)}
        </strong>
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
        <span>현동학당 출판부 공식 직영 서점</span>
      `;
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
      .slice()
      .sort(function (a, b) { return a.bestsellerRank - b.bestsellerRank; })
      .slice(0, 5);
    const recommendedBooks = state.books.filter(function (b) { return b.mdPick; }).slice(0, 4);
    const visibleReviews = state.reviews.filter(function (r) { return r.visible; }).slice(0, 4);
    const recentNotices = state.notices.filter(function (n) { return n.visible; }).slice(0, 3);

    mainEl.innerHTML = `
      ${heroBanner ? `
        <section class="hero-banner">
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
              <circle cx="125" cy="24" r="4" fill="#8c3a32" opacity="0.55"/>
              <circle cx="134" cy="31" r="3" fill="#8c3a32" opacity="0.45"/>
            </svg>
            <div class="hero-calligraphy-watermark">東醫寶鑑 · 法古創新</div>
          </div>

          <div class="store-container hero-grid">
            <div class="hero-editorial">
              <div class="hero-seal-row">
                <span class="hero-square-seal" aria-hidden="true">玄同<br/>書齋</span>
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
            <div class="promo-mid-banner">
              <div>
                <span class="badge badge-seal" style="margin-bottom:8px;">${Store.escapeHtml(promoBanner.eyebrow)}</span>
                <h3 style="margin:0 0 6px; font-family:var(--font-serif); font-size:1.2rem; color:#ffffff;">${Store.escapeHtml(promoBanner.title)}</h3>
                <p style="margin:0; font-size:0.88rem; color:#dfdcd3;">${Store.escapeHtml(promoBanner.subtitle)}</p>
              </div>
              <button type="button" class="btn btn-primary" data-goto-cat="FORMULA">${Store.escapeHtml(promoBanner.buttonText || "자세히 보기")}</button>
            </div>
          </section>
        ` : ""}

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
    let list = state.books.filter(function (b) {
      if (ui.categoryId !== "ALL" && b.categoryId !== ui.categoryId) return false;
      if (ui.bookTypeFilter !== "ALL" && b.bookTypeCode !== ui.bookTypeFilter) return false;
      if (ui.onlySets && !b.isSet) return false;
      if (ui.excludeSoldOut && b.saleStatus === "OUT_OF_STOCK") return false;
      if (!kw) return true;

      if (ui.searchTarget === "TITLE") {
        return (b.title + " " + b.subtitle).toLowerCase().includes(kw);
      }
      if (ui.searchTarget === "AUTHOR") {
        return (b.author + " " + b.translator).toLowerCase().includes(kw);
      }
      if (ui.searchTarget === "ISBN") {
        return b.isbn13.replace(/-/g, "").includes(kw.replace(/-/g, ""));
      }
      return (
        b.title + " " + b.subtitle + " " + b.author + " " + b.translator + " " + b.isbn13 + " " + b.summary
      ).toLowerCase().includes(kw);
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

  function renderCatalogView() {
    const allCats = Store.getCategoriesWithAll(state);
    const currentCat = allCats.find(function (c) { return c.id === ui.categoryId; }) || allCats[0];
    const bookTypes = [{ code: "ALL", name: "전체 구성 (단권·세트)" }].concat(Store.getActiveCodes(state, "BOOK_TYPE"));
    const books = getFilteredBooks();

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
                <strong style="font-size:0.9rem;">총 ${books.length}종</strong>
                ${ui.keyword ? `<button type="button" class="btn btn-sm btn-soft" id="btnClearSearch">검색 초기화 ×</button>` : ""}
                <button type="button" class="btn btn-sm btn-outline pc-only-action" id="btnBatchAddCart">
                  선택 도서 한꺼번에 담기
                </button>
              </div>
              <div class="toolbar-right">
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
                <button type="button" class="btn btn-sm ${ui.viewMode === "list" ? "btn-primary" : "btn-outline"}" data-view-mode="list">목록형</button>
                <button type="button" class="btn btn-sm ${ui.viewMode === "grid" ? "btn-primary" : "btn-outline"}" data-view-mode="grid">표지형</button>
              </div>
            </div>

            ${books.length === 0 ? `
              <div class="panel-card" style="text-align:center; padding:48px 20px;">
                <p style="margin:0 0 14px; color:var(--color-text-secondary);">찾으시는 조건의 도서가 없습니다.</p>
                <button type="button" class="btn btn-primary" id="btnResetCatalogFilter">전체 도서 다시 보기</button>
              </div>
            ` : `
              <div class="book-summary-list ${ui.viewMode === "grid" ? "is-grid-view" : ""}">
                ${books.map(renderCatalogBookRow).join("")}
              </div>
            `}
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
     3. CART & CHECKOUT VIEW
     ======================================================================== */
  function renderCartCheckoutView() {
    const threshold = Number(state.siteConfig.freeShippingThreshold || 50000);
    const baseFee = Number(state.siteConfig.baseShippingFee || 3500);

    const validItems = state.cart
      .map(function (c) { return { item: c, book: findBook(c.bookId) }; })
      .filter(function (x) { return Boolean(x.book); });

    const checkedTotal = validItems.reduce(function (sum, x) {
      return x.item.checked ? sum + x.book.salePrice * x.item.qty : sum;
    }, 0);

    const shippingFee = checkedTotal === 0 ? 0 : (checkedTotal >= threshold ? 0 : baseFee);
    const finalTotal = checkedTotal + shippingFee;
    const remainForFree = Math.max(0, threshold - checkedTotal);
    const gaugePct = Math.min(100, Math.round((checkedTotal / threshold) * 100));

    const curMember = (state.members || []).find(function (m) {
      return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
    }) || state.members[0];

    const memberAddrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
    const defaultAddr = memberAddrs.find(function (a) { return a.isDefault; }) || memberAddrs[0];

    const initialRecipient = defaultAddr ? defaultAddr.recipientName : (curMember ? curMember.name : "정지훈 (정지훈한의원)");
    const initialPhone = defaultAddr ? defaultAddr.recipientPhone : (curMember ? curMember.phone : "010-3928-4821");
    const initialZip = defaultAddr ? defaultAddr.zipCode : (curMember ? curMember.zipCode : "06631");
    const initialAddr = defaultAddr ? (defaultAddr.addressLine1 + (defaultAddr.addressLine2 ? " " + defaultAddr.addressLine2 : "")) : (curMember ? curMember.address : "서울특별시 서초구 서초대로 314, 3층 정지훈한의원");
    const initialMemo = defaultAddr ? (defaultAddr.deliveryMemo || "") : "진료실 데스크 전달 부탁드립니다";

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
                      ? "무료배송 대상 주문입니다! (택배비 0원)"
                      : `무료배송까지 ${Store.formatKRW(remainForFree)} 남았습니다 (${Store.formatKRW(threshold)} 이상 무료)`}
                </strong>
                <span class="badge badge-brand">${gaugePct}%</span>
              </div>
              <div class="gauge-track"><div class="gauge-fill" style="width:${gaugePct}%;"></div></div>
            </div>

            <div class="panel-card">
              <h2 style="margin:0 0 14px; font-family:var(--font-serif); font-size:1.25rem;">
                장바구니 도서 (${validItems.length}종)
              </h2>
              ${validItems.length === 0 ? `
                <p style="color:var(--color-text-muted); padding:24px 0;">장바구니에 담긴 도서가 없습니다.</p>
                <button type="button" class="btn btn-primary" data-goto-cat="ALL">출판도서 둘러보기</button>
              ` : validItems.map(function (x) {
                return `
                  <div class="cart-item-card">
                    <input type="checkbox" class="cart-item-chk" data-book-id="${x.book.id}" ${x.item.checked ? "checked" : ""} />
                    <div data-open-book="${x.book.id}" style="cursor:pointer;">${Store.renderBookCoverHTML(x.book)}</div>
                    <div>
                      <span class="badge badge-brand">${Store.escapeHtml(x.book.categoryName)}</span>
                      <h4 style="margin:4px 0; font-family:var(--font-serif); cursor:pointer;" data-open-book="${x.book.id}">
                        ${Store.escapeHtml(x.book.title)}
                      </h4>
                      <div style="font-size:0.86rem; font-weight:700;">
                        권당 ${Store.formatKRW(x.book.salePrice)}
                        <span class="price-list">${Store.formatKRW(x.book.listPrice)}</span>
                      </div>
                    </div>
                    <div class="cart-item-actions" style="display:flex; align-items:center; gap:10px;">
                      <div class="qty-stepper">
                        <button type="button" data-cart-delta="-1" data-book-id="${x.book.id}">-</button>
                        <span>${x.item.qty}</span>
                        <button type="button" data-cart-delta="1" data-book-id="${x.book.id}">+</button>
                      </div>
                      <button type="button" class="btn btn-sm btn-outline" data-cart-remove="${x.book.id}">삭제</button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            <form class="panel-card" id="checkoutOrderForm">
              <h2 style="margin:0 0 16px; font-family:var(--font-serif); font-size:1.2rem;">받는 분 정보 및 결제 수단</h2>

              <div id="checkoutAddressSelect" data-address-picker="true" class="checkout-address-picker" style="margin-bottom: 20px; padding: 14px 16px; background: var(--color-brand-50); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <strong style="font-size:0.98rem; color:var(--color-brand-900);">배송지 선택</strong>
                    <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:8px;">등록된 배송지를 클릭하면 정보가 자동 입력됩니다</span>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline" data-nav="addresses">배송지 관리 ⚙</button>
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
                  <button type="button" class="checkout-addr-chip" data-select-checkout-addr="NEW">
                    <span>+ 새 배송지 직접 입력</span>
                  </button>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label for="recipientName">받는 분 성함 / 한의원명 *</label>
                  <input id="recipientName" name="recipientName" data-field="ordRecipient" class="form-input" type="text" required value="${Store.escapeHtml(initialRecipient)}" />
                </div>
                <div class="form-field">
                  <label for="recipientPhone">휴대폰 번호 *</label>
                  <input id="recipientPhone" name="recipientPhone" data-field="ordPhone" class="form-input" type="tel" required value="${Store.escapeHtml(initialPhone)}" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="form-field">
                  <label for="recipientZip">우편번호 *</label>
                  <input id="recipientZip" name="zipCode" data-field="ordZip" class="form-input" type="text" required value="${Store.escapeHtml(initialZip)}" />
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
              <div class="form-field">
                <label for="recipientAddress">배송지 주소 *</label>
                <input id="recipientAddress" name="addressLine1" data-field="ordAddr" class="form-input" type="text" required value="${Store.escapeHtml(initialAddr)}" />
              </div>
              <div class="form-field">
                <label for="recipientMemo">배송 요청 메모</label>
                <input id="recipientMemo" name="deliveryMemo" data-field="ordMemo" class="form-input" type="text" value="${Store.escapeHtml(initialMemo)}" />
              </div>

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
            </form>
          </div>

          <aside class="panel-card sticky-summary-panel">
            <h3 style="margin:0 0 16px; font-family:var(--font-serif);">결제 예정 금액</h3>
            <div class="summary-row">
              <span>선택 도서 금액</span>
              <strong>${Store.formatKRW(checkedTotal)}</strong>
            </div>
            <div class="summary-row">
              <span>택배 배송비</span>
              <strong>${shippingFee === 0 ? "무료 (0원)" : Store.formatKRW(shippingFee)}</strong>
            </div>
            <div class="summary-row is-total">
              <span>총 결제금액</span>
              <span style="color:var(--color-seal);">${Store.formatKRW(finalTotal)}</span>
            </div>
            <button type="button" class="btn btn-primary" style="width:100%; margin-top:14px;" id="btnSubmitOrder" ${checkedTotal === 0 ? "disabled" : ""}>
              ${Store.formatKRW(finalTotal)} 주문하기
            </button>
            <p style="margin:12px 0 0; font-size:0.8rem; color:var(--color-text-muted);">
              주문 완료 후 [관리자 센터 → 주문·택배 발송]에서 송장번호를 등록하면 배송 상태가 바로 연동됩니다.
            </p>
          </aside>
        </div>
      </div>
    `;
  }


  /* ========================================================================
     5. ORDERS & WAYBILL SELF-LOOKUP VIEW (로젠택배 전담 2단계 배송 프로세스)
     ======================================================================== */
  function renderOrdersView() {
    const countPaid = state.orders.filter(function (o) {
      return (o.orderStatus === "PAID" || o.orderStatus === "PREPARING_SHIPMENT") && !o.trackingNumber;
    }).length;
    const countShip = state.orders.filter(function (o) {
      return o.orderStatus === "SHIPPED" || Boolean(o.trackingNumber);
    }).length;

    mainEl.innerHTML = `
      <div class="store-container section-block">
        <div class="section-head">
          <div>
            <h2>주문 내역 및 로젠택배 배송조회 안내</h2>
            <p>출판부 발송 시 로젠택배 운송장 번호가 등록되며, 안내된 공식 배송조회 페이지에서 실시간 배송 현황을 조회하실 수 있습니다.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-outline" data-nav="addresses">내 배송지 목록 관리 ⚙</button>
            <a href="./admin.html?sec=orders" class="btn btn-sm btn-dark">관리자 센터에서 송장번호 입력해보기 →</a>
          </div>
        </div>

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

        ${state.orders.length > 0 ? `
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

        ${state.orders.map(renderOrderTrackingCard).join("")}
      </div>
    `;
  }

  function getStepIndex(order) {
    if (order.orderStatus === "CANCELED") return -1;
    if (order.orderStatus === "SHIPPED" || Boolean(order.trackingNumber)) return 1;
    return 0; // PAID (입금완료/발송대기)
  }

  function renderOrderTrackingCard(order) {
    const stepIdx = getStepIndex(order);
    const steps = [
      "1단계: 입금완료 / 발송대기",
      order.orderStatus === "SHIPPED" ? "2단계: 발송완료" : "2단계: 배송 출고 준비"
    ];
    const canCancel = order.orderStatus === "PAID" && !order.trackingNumber;
    const hasWaybill = Boolean(order.trackingNumber);
    const carrier = hasWaybill ? Store.getCarrierInfo(order.carrierCode || order.carrierName || "LOGEN", state) : null;
    const carrierName = (carrier && carrier.name) || order.carrierName || "로젠택배";
    const trackingUrl = (carrier && carrier.trackingUrl) || "https://www.ilogen.com/web/personal/tkSearch";

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
            ${canCancel
              ? `<button type="button" class="btn btn-sm btn-outline" data-cancel-order="${order.orderNo}">주문취소</button>`
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
          </div>
        </div>

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
     5-1. MEMBER ADDRESS BOOK MANAGEMENT VIEW
     ======================================================================== */
  function renderAddressBookView() {
    const curMember = (state.members || []).find(function (m) {
      return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
    }) || state.members[0];

    const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];

    mainEl.innerHTML = `
      <div class="store-container section-block">
        <div class="section-head">
          <div>
            <h2>회원 배송지 관리</h2>
            <p>자주 사용하시는 배송지를 등록해 두시면 주문서 작성 시 클릭 한 번으로 자동 입력됩니다.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 추가</button>
            <button type="button" class="btn btn-sm btn-outline" data-nav="orders">주문·배송 조회로 이동 →</button>
          </div>
        </div>

        ${addrs.length === 0 ? `
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
                    <div style="display:flex; align-items:center; gap:8px;">
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
        `}
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
    if (!book || book.saleStatus === "OUT_OF_STOCK") return;
    const found = state.cart.find(function (c) { return c.bookId === bookId; });
    if (found) {
      found.qty += qty || 1;
      found.checked = true;
    } else {
      state.cart.push({ bookId: bookId, qty: qty || 1, checked: true });
    }
    Store.saveState(state);
    syncShellChrome();
    triggerBadgePop(["headerCartCount", "mobCartCount"]);
    Store.showToast(`『${book.title}』 도서가 장바구니에 담겼습니다.`);
  }

  function submitCheckoutOrder() {
    const form = document.getElementById("checkoutOrderForm");
    if (form && !form.reportValidity()) return;

    const checkedPairs = state.cart
      .filter(function (c) { return c.checked; })
      .map(function (c) { return { item: c, book: findBook(c.bookId) }; })
      .filter(function (x) { return Boolean(x.book); });

    if (checkedPairs.length === 0) return;

    const getCheckoutInput = (id1, id2) => document.getElementById(id1) || document.getElementById(id2);
    const recipient = ((getCheckoutInput("recipientName", "ordRecipient") || {}).value || "").trim();
    const phone = ((getCheckoutInput("recipientPhone", "ordPhone") || {}).value || "").trim();
    const zip = ((getCheckoutInput("recipientZip", "ordZip") || {}).value || "").trim();
    const addr = ((getCheckoutInput("recipientAddress", "ordAddr") || {}).value || "").trim();
    const memo = ((getCheckoutInput("recipientMemo", "ordMemo") || {}).value || "").trim();
    const payMethod = document.getElementById("ordPayMethod").value;

    const curMember = (state.members || []).find(function (m) {
      return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
    }) || state.members[0];

    const saveAddrChk = document.getElementById("chkSaveToAddressBook");
    if (saveAddrChk && saveAddrChk.checked && curMember) {
      const saveDefaultChk = document.getElementById("chkSaveToAddressBookDefault");
      const isDefault = Boolean(saveDefaultChk && saveDefaultChk.checked);
      Store.addMemberAddress(curMember.id || curMember.loginId, {
        addressName: recipient + " 배송지",
        recipientName: recipient,
        recipientPhone: phone,
        zipCode: zip,
        addressLine1: addr,
        addressLine2: "",
        deliveryMemo: memo,
        isDefault: isDefault
      });
      state.members = Store.loadState().members;
    }

    const threshold = Number(state.siteConfig.freeShippingThreshold || 50000);
    const baseFee = Number(state.siteConfig.baseShippingFee || 3500);
    const bookTotal = checkedPairs.reduce(function (s, x) { return s + x.book.salePrice * x.item.qty; }, 0);
    const shippingFee = bookTotal >= threshold ? 0 : baseFee;
    const orderNo = "ORD-20261112-" + String(Math.floor(1000 + Math.random() * 9000));

    checkedPairs.forEach(function (x) {
      x.book.stockQuantity = Math.max(0, x.book.stockQuantity - x.item.qty);
      x.book.salesCount += x.item.qty;
    });

    state.orders.unshift({
      orderNo: orderNo,
      orderedAt: "2026-11-12 방금 전",
      memberLoginId: state.currentUser.loginId || "guest",
      buyerName: state.currentUser.name || recipient,
      recipientName: recipient,
      recipientPhone: phone,
      zipCode: zip,
      address: addr,
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
      finalAmount: bookTotal + shippingFee
    });

    state.cart = state.cart.filter(function (c) { return !c.checked; });
    Store.saveState(state);
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
    if (e.target.id === "btnLogoutPc" || e.target.id === "btnLogoutMob") {
      state.currentUser = { loggedIn: false, loginId: "", name: "", nameMasked: "", grade: "" };
      Store.saveState(state);
      closeMobileDrawer();
      Store.showToast("로그아웃 되었습니다.");
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
      if (nTarget === "mypage") {
        ui.view = "addresses";
      } else if (nTarget === "checkout") {
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
      render();
      return;
    }

    const bookTypeBtn = e.target.closest("[data-book-type]");
    if (bookTypeBtn) {
      ui.bookTypeFilter = bookTypeBtn.getAttribute("data-book-type") || "ALL";
      render();
      return;
    }

    const gotoCatBtn = e.target.closest("[data-goto-cat]");
    if (gotoCatBtn) {
      ui.view = "catalog";
      ui.categoryId = gotoCatBtn.getAttribute("data-goto-cat");
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const drawerCatBtn = e.target.closest("[data-drawer-cat]");
    if (drawerCatBtn) {
      ui.view = "catalog";
      ui.categoryId = drawerCatBtn.getAttribute("data-drawer-cat");
      closeMobileDrawer();
      render();
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
      addToCart(buyNowBtn.getAttribute("data-buy-now"), 1);
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
      const item = state.cart.find(function (c) { return c.bookId === bId; });
      if (item) {
        item.qty = Math.max(1, item.qty + delta);
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
      const curMember = (state.members || []).find(function (m) {
        return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
      }) || state.members[0];
      const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];

      const setVal = (id1, id2, val) => {
        const el = document.getElementById(id1) || document.getElementById(id2);
        if (el) el.value = val;
      };

      document.getElementById("addressModalTitle").textContent = "새 배송지 등록";
      setVal("addrFormEditId", "addrEditId", "");
      setVal("addrName", "addrFormName", "");
      setVal("addrRecipient", "addrFormRecipient", curMember.name || "");
      setVal("addrPhone", "addrFormPhone", curMember.phone || "");
      setVal("addrZip", "addrFormZip", "");
      setVal("addrLine1", "addrFormLine1", "");
      setVal("addrLine2", "addrFormLine2", "");
      setVal("addrMemo", "addrFormMemo", "");
      const defEl = document.getElementById("addrIsDefault") || document.getElementById("addrFormIsDefault");
      if (defEl) defEl.checked = (addrs.length === 0);
      document.getElementById("addressEditModal").classList.add("is-open");
      return;
    }

    const editAddrBtn = e.target.closest("[data-edit-address], [data-edit-addr]");
    if (editAddrBtn) {
      const addrId = editAddrBtn.getAttribute("data-edit-address") || editAddrBtn.getAttribute("data-edit-addr");
      const curMember = (state.members || []).find(function (m) {
        return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
      }) || state.members[0];
      const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
      const addr = addrs.find(function (a) { return a.id === addrId; });
      if (addr) {
        const setVal = (id1, id2, val) => {
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
      const curMember = (state.members || []).find(function (m) {
        return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
      }) || state.members[0];
      const res = Store.deleteMemberAddress(curMember.id || curMember.loginId, addrId);
      if (!res.success) {
        Store.showToast(res.message);
      } else {
        Store.showToast(res.message);
        state = Store.loadState();
        render();
      }
      return;
    }

    const setDefaultAddrBtn = e.target.closest("[data-set-default-address], [data-set-default-addr]");
    if (setDefaultAddrBtn) {
      const addrId = setDefaultAddrBtn.getAttribute("data-set-default-address") || setDefaultAddrBtn.getAttribute("data-set-default-addr");
      const curMember = (state.members || []).find(function (m) {
        return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
      }) || state.members[0];
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

      const setCheckoutVal = (id1, id2, val) => {
        const el = document.getElementById(id1) || document.getElementById(id2);
        if (el) el.value = val;
      };

      const newSaveWrap = document.getElementById("checkoutNewAddrSaveWrap");
      if (addrId === "NEW") {
        setCheckoutVal("recipientName", "ordRecipient", "");
        setCheckoutVal("recipientPhone", "ordPhone", "");
        setCheckoutVal("recipientZip", "ordZip", "");
        setCheckoutVal("recipientAddress", "ordAddr", "");
        setCheckoutVal("recipientMemo", "ordMemo", "");
        if (newSaveWrap) newSaveWrap.style.display = "block";
        const recEl = document.getElementById("recipientName") || document.getElementById("ordRecipient");
        if (recEl) recEl.focus();
      } else {
        const curMember = (state.members || []).find(function (m) {
          return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
        }) || state.members[0];
        const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
        const addr = addrs.find(function (a) { return a.id === addrId; });
        if (addr) {
          setCheckoutVal("recipientName", "ordRecipient", addr.recipientName || "");
          setCheckoutVal("recipientPhone", "ordPhone", addr.recipientPhone || "");
          setCheckoutVal("recipientZip", "ordZip", addr.zipCode || "");
          setCheckoutVal("recipientAddress", "ordAddr", (addr.addressLine1 || "") + (addr.addressLine2 ? " " + addr.addressLine2 : ""));
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

    const cancelOrderBtn = e.target.closest("[data-cancel-order]");
    if (cancelOrderBtn) {
      const ordNo = cancelOrderBtn.getAttribute("data-cancel-order");
      const ord = state.orders.find(function (o) { return o.orderNo === ordNo; });
      if (ord && !ord.trackingNumber) {
        ord.orderStatus = "CANCELED";
        Store.saveState(state);
        Store.showToast(`주문(${ordNo})이 취소되었습니다.`);
        render();
      }
      return;
    }

    if (e.target.id === "btnClearSearch" || e.target.id === "btnResetCatalogFilter") {
      ui.keyword = "";
      ui.onlySets = false;
      ui.bookTypeFilter = "ALL";
      ui.excludeSoldOut = false;
      ui.categoryId = "ALL";
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
    } else if (e.target.id === "chkOnlySets") {
      ui.onlySets = e.target.checked;
      render();
    } else if (e.target.id === "catalogBookTypeSelect") {
      ui.bookTypeFilter = e.target.value || "ALL";
      render();
    } else if (e.target.id === "chkExcludeSoldOut") {
      ui.excludeSoldOut = e.target.checked;
      render();
    } else if (e.target.id === "catalogSortSelect") {
      ui.sortBy = e.target.value;
      render();
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

  document.addEventListener("submit", function (e) {
    if (e.target.id === "addressEditForm") {
      e.preventDefault();
      const getVal = (id1, id2) => {
        const el = document.getElementById(id1) || document.getElementById(id2);
        return el ? el.value.trim() : "";
      };

      const editId = getVal("addrFormEditId", "addrEditId");
      const curMember = (state.members || []).find(function (m) {
        return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
      }) || state.members[0];

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
    } else if (e.target.id === "pcSearchForm") {
      e.preventDefault();
      ui.searchTarget = document.getElementById("pcSearchTarget").value;
      ui.keyword = document.getElementById("pcSearchInput").value;
      ui.view = "catalog";
      render();
    } else if (e.target.id === "mobileSearchForm") {
      e.preventDefault();
      ui.searchTarget = document.getElementById("mobileSearchTarget").value;
      ui.keyword = document.getElementById("mobileSearchInput").value;
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
        memberMask: (state.currentUser.nameMasked || "구매독자") + " (" + (state.currentUser.grade || "회원") + ")",
        rating: rating,
        isBest: false,
        visible: true,
        createdAt: "2026-11-12",
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
        createdAt: "2026-11-12 방금 전",
        answer: "",
        answeredAt: ""
      });
      Store.saveState(state);
      Store.showToast("1:1 문의가 등록되었습니다. 관리자 센터 [1:1 문의 답변] 메뉴에서도 바로 확인됩니다.");
      render();
    }
  });

  document.getElementById("btnMobileMenu").addEventListener("click", function () {
    document.getElementById("mobileDrawer").classList.add("is-open");
    document.getElementById("mobileDrawerBackdrop").classList.add("is-open");
  });
  document.getElementById("btnCloseMobileDrawer").addEventListener("click", closeMobileDrawer);
  document.getElementById("mobileDrawerBackdrop").addEventListener("click", closeMobileDrawer);

  document.getElementById("btnMobileSearchToggle").addEventListener("click", function () {
    document.getElementById("mobileSearchDrawer").classList.toggle("is-open");
  });

  document.getElementById("btnResetDemo").addEventListener("click", function () {
    state = Store.resetState();
    ui.view = "home";
    render();
    Store.showToast("모든 화면 데이터가 초기 상태로 복원되었습니다.");
  });

  render();
})();

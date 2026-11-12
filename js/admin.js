/* ==========================================================================
   현동서재 관리자 센터 컨트롤러 (js/admin.js)
   9개 직관적 운영 메뉴 + SVG 매출/점유율/배송 차트 + PC 테이블 <-> 모바일 카드 전환
   ========================================================================== */

(function () {
  const Store = window.HyundongStore || window.Store;
  let state = Store.loadState();

  const urlParams = new URLSearchParams(window.location.search);
  const initialSec = urlParams.get("sec") || "dashboard";
  const initialGroup = urlParams.get("group") || "BOOK_CATEGORY";

  let ui = {
    section: initialSec, // dashboard | books | orders | members | qna | boards | reviews | codes | banners | settings
    chartPeriod: "daily7", // daily7 | monthly6
    bookKeyword: "",
    bookCat: "ALL",
    bookType: "ALL",
    orderFilter: "ALL",
    memberKeyword: "",
    qnaFilter: "ALL", // ALL | WAITING | ANSWERED
    boardTab: "notice", // notice | faq
    codeGroup: initialGroup,
    editingCodeMode: "create", // create | edit
    editingCodeOrigin: null,
    editingNoticeId: null,
    editingFaqId: null,
    settingsTab: "basic", // basic | serviceTerms | privacyPolicy | shippingPolicy
    mobileFilterOpen: false,
    activeWaybillOrderNo: null,
    activeMemberId: null,
    activeQnaId: null,
    activeBannerId: null
  };

  const mainEl = document.getElementById("adminMainContent");
  const titleEl = document.getElementById("adminPageTitle");

  const SECTION_META = {
    dashboard: {
      title: "매출 · 운영 대시보드",
      desc: "쇼핑몰의 기간별 매출 그래프, 분야별 판매 비중, 오늘 발송할 주문과 답변이 필요한 문의를 한눈에 확인합니다."
    },
    books: {
      title: "도서 상품 · 재고 관리",
      desc: "판매 중인 도서의 가격·재고 수량·추천 도서 여부를 변경하거나 새로운 출간 도서를 등록합니다."
    },
    orders: {
      title: "주문 · 택배 발송 관리",
      desc: "고객 주문을 확인하고 택배사와 운송장 번호까지만 등록하면, 고객의 주문·배송 화면에 송장번호와 택배사 공식 조회 페이지 주소가 즉시 안내됩니다."
    },
    members: {
      title: "회원 목록 · 적립금 관리",
      desc: "가입한 회원의 연락처, 배송지, 회원 등급과 보유 적립금을 확인하고 관리합니다."
    },
    qna: {
      title: "1:1 문의 (Q&A) 답변",
      desc: "고객이 남긴 도서·배송·단체구매 질문을 확인하고 답변을 등록합니다."
    },
    boards: {
      title: "공지사항 · 자주 묻는 질문",
      desc: "쇼핑몰 고객센터에 표시되는 공지사항과 자주 묻는 질문(FAQ)을 등록하고 노출 여부를 관리합니다."
    },
    reviews: {
      title: "독자 구매후기 관리",
      desc: "구매 고객이 작성한 도서 후기를 확인하고 베스트 후기 지정이나 숨김 처리를 합니다."
    },
    codes: {
      title: "분류 · 선택항목 코드관리",
      desc: "도서 등록 화면의 [도서 분야], [단권 / 세트 구분], [판매 상태]와 회원 구분, 문의 분류, 택배사 선택 항목을 코드로 통합 관리합니다."
    },
    banners: {
      title: "메인 배너 · 띠배너 관리",
      desc: "쇼핑몰 첫 화면 상단 배너, 공지 띠배너, 중간 이벤트 배너의 문구와 노출 여부를 관리합니다."
    },
    settings: {
      title: "약관 · 입금계좌 · 배송비 설정",
      desc: "회원가입 이용약관, 개인정보 안내문, 무통장 입금계좌, 무료배송 기준 금액을 수정합니다."
    }
  };

  function syncSidebarChrome() {
    document.getElementById("navBookCount").textContent = state.books.length;
    const pendingShip = state.orders.filter(function (o) {
      return o.orderStatus === "PAID" || o.orderStatus === "PREPARING_SHIPMENT";
    }).length;
    document.getElementById("navPendingShipCount").textContent = pendingShip;
    document.getElementById("navMemberCount").textContent = state.members.length;

    const pendingQna = state.qnas.filter(function (q) { return q.status === "WAITING"; }).length;
    const qnaBadge = document.getElementById("navPendingQnaCount");
    qnaBadge.textContent = pendingQna;
    qnaBadge.style.display = pendingQna > 0 ? "" : "none";

    if (state.adminSession && state.adminSession.adminName) {
      document.getElementById("sidebarAdminName").textContent = state.adminSession.adminName;
    }

    const meta = SECTION_META[ui.section] || SECTION_META.dashboard;
    titleEl.textContent = meta.title;

    document.querySelectorAll("[data-admin-sec]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-admin-sec") === ui.section);
    });
  }

  function renderSectionGuideHTML(actionHTML) {
    const meta = SECTION_META[ui.section] || SECTION_META.dashboard;
    return `
      <div class="admin-section-guide">
        <div>
          <h2>${Store.escapeHtml(meta.title)}</h2>
          <p>${Store.escapeHtml(meta.desc)}</p>
        </div>
        ${actionHTML ? `<div style="display:flex; gap:8px; flex-wrap:wrap;">${actionHTML}</div>` : ""}
      </div>
    `;
  }

  function animateAdminCountUps() {
    if (!mainEl) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mainEl.querySelectorAll("[data-countup]").forEach(function (el) {
      const target = Number(el.getAttribute("data-countup") || 0);
      const suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion || target <= 0) {
        el.textContent = target.toLocaleString("ko-KR") + suffix;
        return;
      }
      const duration = 680;
      const startTime = performance.now();
      function step(now) {
        const p = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = Math.round(target * eased);
        el.textContent = cur.toLocaleString("ko-KR") + suffix;
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target.toLocaleString("ko-KR") + suffix;
        }
      }
      requestAnimationFrame(step);
    });
  }

  function runAdminMotion() {
    if (!mainEl) return;
    mainEl.classList.remove("admin-sec-enter");
    void mainEl.offsetWidth;
    mainEl.classList.add("admin-sec-enter");

    mainEl.querySelectorAll(".kpi-card").forEach(function (card, idx) {
      card.style.setProperty("--stagger", (idx * 55) + "ms");
    });
    mainEl.querySelectorAll(".chart-card").forEach(function (card, idx) {
      card.style.setProperty("--stagger", (90 + idx * 65) + "ms");
    });
    mainEl.querySelectorAll(".admin-table tbody tr").forEach(function (row, idx) {
      row.style.setProperty("--row-delay", (Math.min(idx, 12) * 32) + "ms");
    });
    mainEl.querySelectorAll(".admin-action-card").forEach(function (card, idx) {
      card.style.setProperty("--row-delay", (Math.min(idx, 10) * 40) + "ms");
    });

    animateAdminCountUps();
  }

  function render() {
    syncSidebarChrome();
    if (ui.section === "dashboard") {
      renderDashboardSection();
    } else if (ui.section === "books") {
      renderBooksSection();
    } else if (ui.section === "orders") {
      renderOrdersSection();
    } else if (ui.section === "members") {
      renderMembersSection();
    } else if (ui.section === "qna") {
      renderQnaSection();
    } else if (ui.section === "boards") {
      renderBoardsSection();
    } else if (ui.section === "reviews") {
      renderReviewsSection();
    } else if (ui.section === "codes") {
      renderCodesSection();
    } else if (ui.section === "banners") {
      renderBannersSection();
    } else if (ui.section === "settings") {
      renderSettingsSection();
    }
    runAdminMotion();
  }

  /* ========================================================================
     1. DASHBOARD SECTION (시각화 차트 · 그래프 중심 대시보드)
     ======================================================================== */
  function buildSalesComboSvg(series, isMonthly) {
    const W = 620;
    const H = 250;
    const padL = 54;
    const padR = 24;
    const padT = 28;
    const padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxSales = Math.max.apply(null, series.map(function (d) { return d.sales; })) * 1.15;
    const maxOrders = Math.max.apply(null, series.map(function (d) { return d.orders; })) * 1.25;

    const stepX = plotW / series.length;
    const barW = Math.min(42, stepX * 0.48);

    // 가로 눈금선 4개
    let gridLines = "";
    for (let i = 0; i <= 4; i++) {
      const ratio = i / 4;
      const y = padT + plotH - ratio * plotH;
      const val = Math.round((maxSales * ratio) / 10000);
      const unitLabel = isMonthly ? Math.round(val / 100) + "백만" : val + "만";
      gridLines += `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e1d8" stroke-dasharray="${i === 0 ? "0" : "4 3"}" />
        <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#857e72">${i === 0 ? "0" : unitLabel}</text>
      `;
    }

    let bars = "";
    let linePts = [];
    let dots = "";
    let xLabels = "";

    series.forEach(function (d, idx) {
      const cx = padL + stepX * idx + stepX / 2;
      const barH = Math.max(4, (d.sales / maxSales) * plotH);
      const barY = padT + plotH - barH;
      const isLast = idx === series.length - 1;
      const barColor = isLast ? "#5f594f" : "#918a7d";
      const salesShort = isMonthly
        ? (d.sales / 1000000).toFixed(1) + "백만"
        : Math.round(d.sales / 10000) + "만";

      bars += `
        <rect class="svg-bar-anim" style="--bar-delay:${idx * 55}ms;" x="${cx - barW / 2}" y="${barY}" width="${barW}" height="${barH}" rx="5" fill="${barColor}" opacity="${isLast ? "1" : "0.85"}">
          <title>${d.label}: 매출 ${Store.formatKRW(d.sales)} / 주문 ${d.orders}건</title>
        </rect>
        <text class="svg-bar-label" style="--bar-delay:${idx * 55}ms;" x="${cx}" y="${barY - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#46423b">${salesShort}</text>
      `;

      const lineY = padT + plotH - (d.orders / maxOrders) * plotH;
      linePts.push(cx + "," + lineY);
      dots += `
        <circle class="svg-dot-anim" style="--dot-delay:${220 + idx * 65}ms;" cx="${cx}" cy="${lineY}" r="4.5" fill="#8c3a32" stroke="#ffffff" stroke-width="2">
          <title>${d.label}: 주문 ${d.orders}건</title>
        </circle>
      `;

      xLabels += `
        <text x="${cx}" y="${H - 12}" text-anchor="middle" font-size="11.5" font-weight="${isLast ? "700" : "500"}" fill="${isLast ? "#2c2925" : "#5f594f"}">${d.label}</text>
      `;
    });

    return `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="auto" role="img" aria-label="매출 및 주문 추이 차트">
        ${gridLines}
        ${bars}
        <polyline class="svg-line-anim" pathLength="1000" fill="none" stroke="#8c3a32" stroke-width="2.4" points="${linePts.join(" ")}" />
        ${dots}
        ${xLabels}
      </svg>
    `;
  }

  function buildCategoryDonutHTML() {
    const palette = ["#5f594f", "#918a7d", "#8c3a32", "#47647a", "#9c6626", "#3d6b50", "#787165"];
    const realCats = Store.getCategoriesWithAll(state).filter(function (c) { return c.id !== "ALL"; });

    const catStats = realCats.map(function (cat, idx) {
      const copies = state.books
        .filter(function (b) { return b.categoryId === cat.id; })
        .reduce(function (s, b) { return s + (b.salesCount || 0); }, 0);
      return {
        name: cat.name,
        copies: copies,
        color: palette[idx % palette.length]
      };
    }).sort(function (a, b) { return b.copies - a.copies; });

    const totalCopies = catStats.reduce(function (s, x) { return s + x.copies; }, 0) || 1;
    const r = 56;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    const segments = catStats.map(function (item, idx) {
      const pct = item.copies / totalCopies;
      const len = pct * circumference;
      const seg = `
        <circle
          class="svg-donut-seg"
          style="--seg-delay:${idx * 85}ms;"
          cx="80" cy="80" r="${r}"
          fill="transparent"
          stroke="${item.color}"
          stroke-width="22"
          stroke-dasharray="${len} ${circumference - len}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 80 80)"
        >
          <title>${item.name}: ${item.copies}권 (${Math.round(pct * 100)}%)</title>
        </circle>
      `;
      offset += len;
      return seg;
    }).join("");

    return `
      <div class="donut-layout">
        <div class="donut-svg-box">
          <svg viewBox="0 0 160 160" width="100%" height="auto" role="img" aria-label="분야별 판매 비중 도넛 차트">
            <circle cx="80" cy="80" r="${r}" fill="transparent" stroke="#efede8" stroke-width="22" />
            ${segments}
            <text x="80" y="75" text-anchor="middle" font-size="11" fill="#857e72" font-weight="600">누적 판매</text>
            <text x="80" y="95" text-anchor="middle" font-size="15" fill="#2c2925" font-weight="800" data-countup="${totalCopies}" data-suffix="권">${totalCopies.toLocaleString()}권</text>
          </svg>
        </div>
        <div class="cat-share-list">
          ${catStats.map(function (item, idx) {
            const pct = Math.round((item.copies / totalCopies) * 100);
            return `
              <div class="cat-share-row">
                <div class="cat-share-top">
                  <span><span class="legend-dot" style="background:${item.color};"></span><strong>${Store.escapeHtml(item.name)}</strong></span>
                  <span><strong>${pct}%</strong> (${item.copies.toLocaleString()}권)</span>
                </div>
                <div class="cat-share-bar">
                  <div class="cat-share-fill" style="width:${pct}%; background:${item.color}; --hbar-delay:${160 + idx * 65}ms;"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderDashboardSection() {
    const monthlySeries = state.analytics.monthly6;
    const currentMonthSales = monthlySeries[monthlySeries.length - 1].sales;
    const pendingShipOrders = state.orders.filter(function (o) {
      return o.orderStatus === "PAID" || o.orderStatus === "PREPARING_SHIPMENT";
    });
    const waitingQnas = state.qnas.filter(function (q) { return q.status === "WAITING"; });
    const lowStockBooks = state.books.filter(function (b) { return b.stockQuantity <= 10; });

    const series = ui.chartPeriod === "monthly6" ? state.analytics.monthly6 : state.analytics.daily7;
    const isMonthly = ui.chartPeriod === "monthly6";

    // 주문 단계별 집계 (결제완료 -> 포장준비 -> 송장등록·발송완료 3단계)
    const stageStats = [
      { code: "PAID", label: "결제완료 (송장 입력 대기)", color: "#9c6626", count: state.orders.filter(function (o) { return o.orderStatus === "PAID"; }).length },
      { code: "PREPARING_SHIPMENT", label: "도서 검수 · 포장 준비중", color: "#918a7d", count: state.orders.filter(function (o) { return o.orderStatus === "PREPARING_SHIPMENT"; }).length },
      { code: "SHIPPED", label: "송장 등록 · 택배 발송 완료", color: "#3d6b50", count: state.orders.filter(function (o) { return o.orderStatus === "SHIPPED"; }).length }
    ];
    const maxStageCount = Math.max(1, Math.max.apply(null, stageStats.map(function (s) { return s.count; })));

    // 판매 상위 5권 그래프용
    const topBooks = state.books.slice().sort(function (a, b) { return b.salesCount - a.salesCount; }).slice(0, 5);
    const maxBookSales = Math.max(1, topBooks[0] ? topBooks[0].salesCount : 1);

    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <button type="button" class="btn btn-sm btn-outline" data-admin-sec="orders">송장 등록하러 가기 (${pendingShipOrders.length}건)</button>
        <button type="button" class="btn btn-sm btn-primary" data-admin-sec="qna">미답변 문의 확인 (${waitingQnas.length}건)</button>
      `)}

      <!-- 상단 4대 요약 카드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-head">
            <span class="kpi-label">이번 달 누적 매출액</span>
            <span class="badge badge-success">전월 대비 ▲ 14.8%</span>
          </div>
          <div class="kpi-value" data-countup="${currentMonthSales}" data-suffix="원">${Store.formatKRW(currentMonthSales)}</div>
          <div class="kpi-foot">
            <span>이번 달 누적 231건 결제</span>
          </div>
        </div>

        <div class="kpi-card" style="border-top-color: var(--color-warning);">
          <div class="kpi-head">
            <span class="kpi-label">오늘 발송 대기 주문</span>
            <span class="badge badge-warning">오후 3시 마감</span>
          </div>
          <div class="kpi-value" data-countup="${pendingShipOrders.length}" data-suffix="건">${pendingShipOrders.length}건</div>
          <div class="kpi-foot">
            <span>택배 송장번호 입력 필요</span>
            <button type="button" class="kpi-link-btn" data-admin-sec="orders">바로 처리 →</button>
          </div>
        </div>

        <div class="kpi-card" style="border-top-color: var(--color-danger);">
          <div class="kpi-head">
            <span class="kpi-label">답변 대기 고객 문의</span>
            <span class="badge ${waitingQnas.length > 0 ? "badge-danger" : "badge-success"}">${waitingQnas.length > 0 ? "확인 필요" : "모두 완료"}</span>
          </div>
          <div class="kpi-value" data-countup="${waitingQnas.length}" data-suffix="건">${waitingQnas.length}건</div>
          <div class="kpi-foot">
            <span>전체 1:1 문의 ${state.qnas.length}건</span>
            <button type="button" class="kpi-link-btn" data-admin-sec="qna">답변 작성 →</button>
          </div>
        </div>

        <div class="kpi-card" style="border-top-color: var(--color-info);">
          <div class="kpi-head">
            <span class="kpi-label">가입 회원 / 재고 부족 도서</span>
            <span class="badge badge-brand">이번 달 +24명</span>
          </div>
          <div class="kpi-value"><span data-countup="${state.members.length}" data-suffix="명">${state.members.length}명</span> <span style="font-size:0.95rem; font-weight:600; color:var(--color-text-muted);">/ 부족 ${lowStockBooks.length}종</span></div>
          <div class="kpi-foot">
            <span>재고 10권 이하 도서 점검</span>
            <button type="button" class="kpi-link-btn" data-admin-sec="books">재고 보기 →</button>
          </div>
        </div>
      </div>

      <!-- 메인 시각화 차트 행 (매출 추이 복합 그래프 + 분야별 도넛 차트) -->
      <div class="chart-grid-main">
        <section class="chart-card">
          <div class="chart-card-head">
            <div>
              <h3>기간별 매출액 및 주문 건수 추이</h3>
              <p>막대는 결제 매출액, 꺾은선은 주문 건수를 나타냅니다.</p>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="chip-btn ${ui.chartPeriod === "daily7" ? "is-active" : ""}" data-chart-period="daily7">최근 7일</button>
              <button type="button" class="chip-btn ${ui.chartPeriod === "monthly6" ? "is-active" : ""}" data-chart-period="monthly6">최근 6개월</button>
            </div>
          </div>
          <div class="chart-svg-wrap">
            ${buildSalesComboSvg(series, isMonthly)}
          </div>
          <div class="chart-legend">
            <span><span class="legend-dot" style="background:#918a7d;"></span>매출액 (원)</span>
            <span><span class="legend-dot" style="background:#8c3a32; border-radius:50%;"></span>주문 건수</span>
          </div>
        </section>

        <section class="chart-card">
          <div class="chart-card-head">
            <div>
              <h3>분야별 도서 판매 비중</h3>
              <p>어떤 분야의 서적이 가장 많이 판매되었는지 비율로 보여줍니다.</p>
            </div>
          </div>
          ${buildCategoryDonutHTML()}
        </section>
      </div>

      <!-- 보조 그래프 행 (주문·배송 단계별 막대 그래프 + 인기 판매 도서 TOP 5 그래프) -->
      <div class="admin-2col-grid">
        <section class="chart-card">
          <div class="chart-card-head">
            <div>
              <h3>주문 · 송장 등록 단계별 현황</h3>
              <p>항목을 클릭하면 해당 상태의 주문 목록으로 바로 이동합니다.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" data-admin-sec="orders">전체 주문 관리</button>
          </div>
          <div class="hbar-list">
            ${stageStats.map(function (st, idx) {
              const pct = Math.max(8, Math.round((st.count / maxStageCount) * 100));
              return `
                <div class="hbar-item" data-jump-order-filter="${st.code}">
                  <div class="hbar-head">
                    <strong>${st.label}</strong>
                    <span class="badge badge-brand">${st.count}건</span>
                  </div>
                  <div class="hbar-track">
                    <div class="hbar-fill" style="width:${st.count === 0 ? 0 : pct}%; background:${st.color}; --hbar-delay:${180 + idx * 65}ms;"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <section class="chart-card">
          <div class="chart-card-head">
            <div>
              <h3>누적 판매 베스트 도서 TOP 5</h3>
              <p>판매량 상위 도서와 현재 남아있는 재고 수량입니다.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" data-admin-sec="books">재고 관리</button>
          </div>
          <div class="hbar-list">
            ${topBooks.map(function (bk, i) {
              const pct = Math.round((bk.salesCount / maxBookSales) * 100);
              return `
                <div>
                  <div class="hbar-head">
                    <span style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      <strong style="color:var(--color-seal); margin-right:4px;">${i + 1}위</strong> ${Store.escapeHtml(bk.title)}
                    </span>
                    <span style="flex-shrink:0; font-size:0.8rem;">
                      <strong>${bk.salesCount}권</strong> 판매 · <span style="color:var(--color-text-muted);">재고 ${bk.stockQuantity}권</span>
                    </span>
                  </div>
                  <div class="hbar-track">
                    <div class="hbar-fill" style="width:${pct}%; --hbar-delay:${200 + i * 65}ms;"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>
      </div>

      <!-- 오늘 바로 처리할 업무 (발송 대기 & 미답변 문의) -->
      <div class="admin-2col-grid" style="margin-bottom:0;">
        <section class="panel-card" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:1rem;">바로 발송 처리할 주문 (${pendingShipOrders.length}건)</h3>
            <button type="button" class="btn btn-sm btn-outline" data-admin-sec="orders">주문 메뉴로 →</button>
          </div>
          ${pendingShipOrders.length === 0 ? `
            <p style="margin:0; color:var(--color-text-muted); font-size:0.88rem;">현재 발송 대기 중인 주문이 없습니다.</p>
          ` : pendingShipOrders.map(function (o) {
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 0; border-bottom:1px solid var(--color-border); font-size:0.86rem;">
                <div>
                  <strong>${Store.escapeHtml(o.orderNo)}</strong> · ${Store.escapeHtml(o.recipientName)}
                  <div style="color:var(--color-text-muted); font-size:0.8rem;">${Store.escapeHtml(o.items[0].title)}${o.items.length > 1 ? ` 외 ${o.items.length - 1}종` : ""} (${Store.formatKRW(o.finalAmount)})</div>
                </div>
                <button type="button" class="btn btn-sm btn-primary" data-open-waybill="${o.orderNo}">송장번호 등록</button>
              </div>
            `;
          }).join("")}
        </section>

        <section class="panel-card" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:1rem;">답변을 기다리는 1:1 문의 (${waitingQnas.length}건)</h3>
            <button type="button" class="btn btn-sm btn-outline" data-admin-sec="qna">문의 메뉴로 →</button>
          </div>
          ${waitingQnas.length === 0 ? `
            <p style="margin:0; color:var(--color-text-muted); font-size:0.88rem;">모든 고객 문의에 답변이 완료되었습니다.</p>
          ` : waitingQnas.map(function (qa) {
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 0; border-bottom:1px solid var(--color-border); font-size:0.86rem;">
                <div style="min-width:0; flex:1;">
                  <span class="badge badge-brand" style="margin-right:4px;">${Store.escapeHtml(qa.category)}</span>
                  <strong>${Store.escapeHtml(qa.title)}</strong>
                  <div style="color:var(--color-text-muted); font-size:0.8rem;">작성자: ${Store.escapeHtml(qa.writerName)} · ${qa.createdAt}</div>
                </div>
                <button type="button" class="btn btn-sm btn-primary" data-open-qna-reply="${qa.id}">답변하기</button>
              </div>
            `;
          }).join("")}
        </section>
      </div>
    `;
  }

  /* ========================================================================
     2. BOOKS & INVENTORY SECTION (도서 상품 · 재고 관리 — 공통코드 실시간 연동)
     ======================================================================== */
  function renderBooksSection() {
    const kw = ui.bookKeyword.trim().toLowerCase();
    const catOptions = Store.getCategoriesWithAll(state);
    const typeOptions = [{ code: "ALL", name: "단권 / 세트 전체" }].concat(Store.getActiveCodes(state, "BOOK_TYPE"));

    const list = state.books.filter(function (b) {
      if (ui.bookCat !== "ALL" && b.categoryId !== ui.bookCat) return false;
      if (ui.bookType !== "ALL" && b.bookTypeCode !== ui.bookType) return false;
      if (!kw) return true;
      return (b.title + " " + b.isbn13 + " " + b.author + " " + (b.bookTypeName || "")).toLowerCase().includes(kw);
    });

    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <button type="button" class="btn btn-sm btn-soft" data-jump-codes="BOOK_CATEGORY">분야 · 단권/세트 코드관리</button>
        <a href="./admin-book-new.html" class="btn btn-sm btn-primary">+ 새 도서 상품 등록</a>
      `)}

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <input type="search" id="admBookSearchInput" class="form-input" placeholder="도서명, 저자명, 상품코드, ISBN 번호로 검색..." value="${Store.escapeHtml(ui.bookKeyword)}" />
          <button type="button" class="btn btn-outline mobile-filter-toggle-btn" id="btnToggleMobFilter">
            분류 필터 ${ui.mobileFilterOpen ? "▲" : "▼"}
          </button>
          <button type="button" class="btn btn-primary" id="btnApplyBookFilter">검색</button>
        </div>
        <div class="admin-filter-advanced ${ui.mobileFilterOpen ? "is-open" : ""}">
          <select id="admBookCatSelect" class="toolbar-select" aria-label="도서 분야 선택">
            ${catOptions.map(function (c) {
              return `<option value="${Store.escapeHtml(c.id)}" ${ui.bookCat === c.id ? "selected" : ""}>${Store.escapeHtml(c.name)}</option>`;
            }).join("")}
          </select>
          <select id="admBookTypeSelect" class="toolbar-select" aria-label="단권 / 세트 구분 선택">
            ${typeOptions.map(function (t) {
              return `<option value="${Store.escapeHtml(t.code)}" ${ui.bookType === t.code ? "selected" : ""}>${Store.escapeHtml(t.name)}</option>`;
            }).join("")}
          </select>
          <span style="font-size:0.82rem; color:var(--color-text-muted);">
            총 <strong>${list.length}종</strong> 조회됨 · 도서 분야 및 단권/세트 선택 항목은 [분류 · 선택항목 코드관리]에서 자유롭게 추가·변경할 수 있습니다.
          </span>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>표지 · 상품코드</th>
              <th>도서 분야 · 구분</th>
              <th>도서명 / 저자</th>
              <th>정가 → 판매가</th>
              <th>현재 재고</th>
              <th>추천 도서</th>
              <th>도서 수정 · 재고 관리</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(function (b) {
              const typeBadgeCls = b.isSet ? "badge-seal" : "badge-brand";
              return `
                <tr>
                  <td>
                    <div class="admin-book-code-cell">
                      ${Store.renderBookThumbHTML(b)}
                      <div>
                        <strong>${Store.escapeHtml(b.id)}</strong>
                        <div style="font-size:0.76rem; color:var(--color-text-muted);">${Store.escapeHtml(b.isbn13)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;">
                      <span class="badge badge-brand">${Store.escapeHtml(b.categoryName)}</span>
                      <span class="badge ${typeBadgeCls}" style="${b.isSet ? "" : "background:var(--color-surface); border:1px solid var(--color-border-strong); color:var(--color-brand-800);"}">${Store.escapeHtml(b.bookTypeName || (b.isSet ? "전집 · 세트 상품" : "단권 도서"))}</span>
                    </div>
                  </td>
                  <td>
                    <strong>${Store.escapeHtml(b.title)}</strong>
                    <div style="font-size:0.78rem; color:var(--color-text-secondary);">${Store.escapeHtml(b.author)}${b.translator ? " · " + Store.escapeHtml(b.translator) : ""}</div>
                  </td>
                  <td>
                    <span style="text-decoration:line-through; color:var(--color-text-muted); font-size:0.78rem;">${Store.formatKRW(b.listPrice)}</span><br/>
                    <strong>${Store.formatKRW(b.salePrice)}</strong> <span class="discount-pct">(${b.discountRate}%↓)</span>
                  </td>
                  <td>
                    <span class="badge ${b.stockQuantity === 0 ? "badge-danger" : (b.stockQuantity <= 10 ? "badge-warning" : "badge-success")}">
                      ${b.stockQuantity === 0 ? "품절 (0권)" : b.stockQuantity + "권"}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm ${b.mdPick ? "btn-primary" : "btn-outline"}" data-toggle-mdpick="${b.id}">
                      ${b.mdPick ? "추천 중" : "일반"}
                    </button>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                      <a href="./admin-book-new.html?id=${encodeURIComponent(b.id)}" class="btn btn-sm btn-soft">내용 수정</a>
                      <button type="button" class="btn btn-sm btn-outline" data-stock-add="10" data-book-id="${b.id}">+10권 입고</button>
                      <button type="button" class="btn btn-sm btn-outline" data-toggle-soldout="${b.id}">
                        ${b.saleStatus === "OUT_OF_STOCK" ? "판매 재개" : "품절 처리"}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-mobile-cards">
        ${list.map(function (b) {
          return `
            <article class="admin-action-card">
              <div class="admin-card-head">
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                  <span class="badge badge-brand">${Store.escapeHtml(b.categoryName)}</span>
                  <span class="badge ${b.isSet ? "badge-seal" : "badge-brand"}">${Store.escapeHtml(b.bookTypeName || (b.isSet ? "전집 · 세트 상품" : "단권 도서"))}</span>
                </div>
                <span class="badge ${b.stockQuantity === 0 ? "badge-danger" : "badge-success"}">재고 ${b.stockQuantity}권</span>
              </div>
              <div class="admin-book-code-cell">
                ${Store.renderBookThumbHTML(b)}
                <div style="min-width:0;">
                  <div style="font-size:0.76rem; color:var(--color-text-muted); font-weight:700;">${Store.escapeHtml(b.id)} · ${Store.escapeHtml(b.isbn13)}</div>
                  <strong style="font-family:var(--font-serif); font-size:0.98rem; display:block; margin-top:2px;">${Store.escapeHtml(b.title)}</strong>
                  <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">${Store.escapeHtml(b.author)}${b.translator ? " · " + Store.escapeHtml(b.translator) : ""}</div>
                </div>
              </div>
              <dl class="admin-card-kv">
                <dt>판매가격</dt><dd><strong>${Store.formatKRW(b.salePrice)}</strong> (정가 ${Store.formatKRW(b.listPrice)})</dd>
              </dl>
              <div class="admin-card-actions">
                <a href="./admin-book-new.html?id=${encodeURIComponent(b.id)}" class="btn btn-sm btn-soft">내용 수정</a>
                <button type="button" class="btn btn-sm btn-outline" data-stock-add="10" data-book-id="${b.id}">+10권 입고</button>
                <button type="button" class="btn btn-sm ${b.mdPick ? "btn-primary" : "btn-outline"}" data-toggle-mdpick="${b.id}">
                  ${b.mdPick ? "추천 해제" : "추천 지정"}
                </button>
                <button type="button" class="btn btn-sm btn-outline" data-toggle-soldout="${b.id}">
                  ${b.saleStatus === "OUT_OF_STOCK" ? "판매 재개" : "품절 처리"}
                </button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ========================================================================
     3. ORDERS & SHIPPING SECTION (주문 · 택배 발송 관리 — 송장번호 입력까지만 관리)
     ======================================================================== */
  function renderOrdersSection() {
    const orders = state.orders.filter(function (o) {
      if (ui.orderFilter === "ALL") return true;
      return o.orderStatus === ui.orderFilter;
    });

    const countBy = function (st) {
      return state.orders.filter(function (o) { return o.orderStatus === st; }).length;
    };
    const canceledCount = countBy("CANCELED");
    const activeCarriers = Store.getActiveCarriers(state);

    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <button type="button" class="btn btn-sm btn-soft" data-jump-codes="CARRIER_CODE">택배사 · 조회주소 코드관리</button>
        <a href="./index.html?view=orders" class="btn btn-sm btn-outline">고객 배송조회 안내 화면 보기 ↗</a>
      `)}

      <div class="panel-card" style="margin-bottom:16px; padding:14px 18px; background:var(--color-brand-50);">
        <div style="font-size:0.86rem; font-weight:700; color:var(--color-brand-900); margin-bottom:4px;">
          운송장 번호 입력 및 고객 직접 조회 안내 방식
        </div>
        <div style="font-size:0.82rem; color:var(--color-text-secondary); line-height:1.55;">
          출판부에서는 <strong>택배사 선택 및 송장번호 등록(발송 완료)</strong> 단계까지만 입력합니다. 이후 배송 위치 추적은 고객 화면에 자동 안내되는 각 택배사 공식 조회 페이지 주소에서 고객이 직접 조회합니다.
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
          ${activeCarriers.map(function (c) {
            return `<a href="${Store.escapeHtml(c.trackingUrl)}" target="_blank" rel="noopener noreferrer" class="badge badge-brand" style="text-decoration:none;">${Store.escapeHtml(c.name)} 조회페이지 ↗</a>`;
          }).join("")}
        </div>
      </div>

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <button type="button" class="chip-btn ${ui.orderFilter === "ALL" ? "is-active" : ""}" data-ord-filter="ALL">전체 주문 (${state.orders.length})</button>
          <button type="button" class="chip-btn ${ui.orderFilter === "PAID" ? "is-active" : ""}" data-ord-filter="PAID">결제완료 · 송장대기 (${countBy("PAID")})</button>
          <button type="button" class="chip-btn ${ui.orderFilter === "PREPARING_SHIPMENT" ? "is-active" : ""}" data-ord-filter="PREPARING_SHIPMENT">포장 준비중 (${countBy("PREPARING_SHIPMENT")})</button>
          <button type="button" class="chip-btn ${ui.orderFilter === "SHIPPED" ? "is-active" : ""}" data-ord-filter="SHIPPED">송장 등록 · 발송완료 (${countBy("SHIPPED")})</button>
          ${canceledCount > 0 ? `<button type="button" class="chip-btn ${ui.orderFilter === "CANCELED" ? "is-active" : ""}" data-ord-filter="CANCELED">주문 취소 (${canceledCount})</button>` : ""}
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>주문번호 / 주문일시</th>
              <th>받는 분 / 연락처</th>
              <th>주문 도서 내역</th>
              <th>결제 금액</th>
              <th>주문 상태 · 송장번호</th>
              <th>출고 · 송장번호 관리</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(function (o) {
              return `
                <tr>
                  <td><strong>${Store.escapeHtml(o.orderNo)}</strong><div style="font-size:0.77rem; color:var(--color-text-muted);">${o.orderedAt}</div></td>
                  <td>
                    <strong>${Store.escapeHtml(o.recipientName)}</strong>
                    <div style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(o.recipientPhone)}</div>
                  </td>
                  <td>
                    ${o.items.map(function (it) { return `<div>· ${Store.escapeHtml(it.title)} × ${it.qty}권</div>`; }).join("")}
                    <div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:3px;">배송지: ${Store.escapeHtml(o.address)}</div>
                  </td>
                  <td>
                    <strong>${Store.formatKRW(o.finalAmount)}</strong>
                    <div style="font-size:0.76rem; color:var(--color-text-muted);">${Store.escapeHtml(o.paymentMethod.slice(0, 16))}</div>
                  </td>
                  <td>
                    <span class="badge ${Store.getOrderStatusBadge(o.orderStatus)}">${Store.getOrderStatusLabel(o.orderStatus)}</span>
                    ${o.trackingNumber
                      ? `<div style="font-size:0.8rem; margin-top:4px; font-weight:700;">${Store.escapeHtml(o.carrierName)} ${Store.escapeHtml(o.trackingNumber)}</div>`
                      : `<div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:4px;">송장번호 미등록</div>`}
                  </td>
                  <td>${renderOrderActionButtons(o)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-mobile-cards">
        ${orders.map(function (o) {
          return `
            <article class="admin-action-card">
              <div class="admin-card-head">
                <strong>${Store.escapeHtml(o.orderNo)}</strong>
                <span class="badge ${Store.getOrderStatusBadge(o.orderStatus)}">${Store.getOrderStatusLabel(o.orderStatus)}</span>
              </div>
              <dl class="admin-card-kv">
                <dt>받는 분</dt><dd>${Store.escapeHtml(o.recipientName)} (${Store.escapeHtml(o.recipientPhone)})</dd>
                <dt>배송 주소</dt><dd>${Store.escapeHtml(o.address)}</dd>
                <dt>주문 도서</dt><dd>${o.items.map(function (it) { return `${Store.escapeHtml(it.title)} × ${it.qty}권`; }).join(", ")}</dd>
                <dt>결제 금액</dt><dd><strong>${Store.formatKRW(o.finalAmount)}</strong></dd>
                <dt>택배 송장</dt><dd>${o.trackingNumber ? `${Store.escapeHtml(o.carrierName)} ${Store.escapeHtml(o.trackingNumber)}` : "아직 등록되지 않음"}</dd>
              </dl>
              <div class="admin-card-actions">
                ${renderOrderActionButtons(o)}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderOrderActionButtons(o) {
    if (o.orderStatus === "CANCELED") {
      return `<span class="badge badge-danger">주문 취소됨</span>`;
    }
    if (!o.trackingNumber) {
      if (o.orderStatus === "PAID") {
        return `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-primary" data-open-waybill="${o.orderNo}">송장번호 입력</button>
          </div>
        `;
      }
      return `<button type="button" class="btn btn-sm btn-primary" data-open-waybill="${o.orderNo}">송장번호 입력 · 발송</button>`;
    }
    const carrier = Store.getCarrierInfo(o.carrierCode || o.carrierName, state);
    return `
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button type="button" class="btn btn-sm btn-outline" data-open-waybill="${o.orderNo}">송장번호 수정</button>
        <a href="${Store.escapeHtml(carrier.trackingUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">택배사 조회 ↗</a>
      </div>
    `;
  }

  /* ========================================================================
     4. MEMBERS SECTION (회원 목록 · 적립금 관리 — 어려운 전문용어 완전 제거)
     ======================================================================== */
  function renderMembersSection() {
    const kw = ui.memberKeyword.trim().toLowerCase();
    const list = state.members.filter(function (m) {
      if (!kw) return true;
      return (m.name + " " + m.loginId + " " + m.phone + " " + m.memberGrade + " " + (m.clinicName || "")).toLowerCase().includes(kw);
    });

    mainEl.innerHTML = `
      ${renderSectionGuideHTML("")}

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <input type="search" id="admMemberSearchInput" class="form-input" placeholder="회원 이름, 아이디, 휴대폰 번호, 한의원/학교명 검색..." value="${Store.escapeHtml(ui.memberKeyword)}" />
          <button type="button" class="btn btn-primary" id="btnApplyMemberFilter">회원 검색</button>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>회원번호 / 아이디</th>
              <th>이름 / 소속</th>
              <th>휴대폰 / 이메일</th>
              <th>회원 등급</th>
              <th>보유 적립금</th>
              <th>가입일 / 누적구매</th>
              <th>상세 · 적립금 관리</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(function (m) {
              return `
                <tr>
                  <td><strong>${m.id}</strong><div style="font-size:0.78rem; color:var(--color-text-muted);">${Store.escapeHtml(m.loginId)}</div></td>
                  <td>
                    <strong>${Store.escapeHtml(m.name)}</strong>
                    ${m.clinicName ? `<div style="font-size:0.77rem; color:var(--color-text-secondary);">${Store.escapeHtml(m.clinicName)}</div>` : ""}
                  </td>
                  <td>
                    ${Store.escapeHtml(m.phone)}
                    <div style="font-size:0.77rem; color:var(--color-text-muted);">${Store.escapeHtml(m.email)}</div>
                  </td>
                  <td><span class="badge badge-brand">${Store.escapeHtml(m.memberGrade)}</span></td>
                  <td><strong>${Store.formatKRW(m.points || 0)}</strong></td>
                  <td>
                    ${m.joinedAt}
                    <div style="font-size:0.77rem; color:var(--color-text-secondary);">${m.orderCount}회 (${Store.formatKRW(m.totalSpent || 0)})</div>
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm btn-outline" data-open-member="${m.id}">정보 · 적립금 관리</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-mobile-cards">
        ${list.map(function (m) {
          return `
            <article class="admin-action-card">
              <div class="admin-card-head">
                <strong>${Store.escapeHtml(m.name)} (${Store.escapeHtml(m.loginId)})</strong>
                <span class="badge badge-brand">${Store.escapeHtml(m.memberGrade)}</span>
              </div>
              <dl class="admin-card-kv">
                <dt>연락처</dt><dd>${Store.escapeHtml(m.phone)}</dd>
                <dt>이메일</dt><dd>${Store.escapeHtml(m.email)}</dd>
                <dt>보유적립금</dt><dd><strong>${Store.formatKRW(m.points || 0)}</strong></dd>
                <dt>누적주문</dt><dd>${m.orderCount}회 (${Store.formatKRW(m.totalSpent || 0)})</dd>
              </dl>
              <div class="admin-card-actions">
                <button type="button" class="btn btn-sm btn-primary" data-open-member="${m.id}">회원 상세 · 적립금 관리</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ========================================================================
     5. 1:1 INQUIRY / Q&A SECTION (1:1 문의 답변 관리)
     ======================================================================== */
  function renderQnaSection() {
    const waitingCount = state.qnas.filter(function (q) { return q.status === "WAITING"; }).length;
    const list = state.qnas.filter(function (q) {
      if (ui.qnaFilter === "ALL") return true;
      return q.status === ui.qnaFilter;
    });

    mainEl.innerHTML = `
      ${renderSectionGuideHTML("")}

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <button type="button" class="chip-btn ${ui.qnaFilter === "ALL" ? "is-active" : ""}" data-qna-filter="ALL">전체 문의 (${state.qnas.length})</button>
          <button type="button" class="chip-btn ${ui.qnaFilter === "WAITING" ? "is-active" : ""}" data-qna-filter="WAITING">답변 대기중 (${waitingCount})</button>
          <button type="button" class="chip-btn ${ui.qnaFilter === "ANSWERED" ? "is-active" : ""}" data-qna-filter="ANSWERED">답변 완료 (${state.qnas.length - waitingCount})</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        ${list.map(function (qa) {
          return `
            <article class="panel-card" style="margin-bottom:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding-bottom:10px; border-bottom:1px solid var(--color-border);">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span class="badge ${qa.status === "ANSWERED" ? "badge-success" : "badge-danger"}">
                    ${qa.status === "ANSWERED" ? "답변 완료" : "답변 대기중"}
                  </span>
                  <span class="badge badge-brand">${Store.escapeHtml(qa.category)}</span>
                  <strong>${Store.escapeHtml(qa.title)}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:0.8rem; color:var(--color-text-muted);">작성자: ${Store.escapeHtml(qa.writerName)} · ${qa.createdAt}</span>
                  <button type="button" class="btn btn-sm ${qa.status === "ANSWERED" ? "btn-outline" : "btn-primary"}" data-open-qna-reply="${qa.id}">
                    ${qa.status === "ANSWERED" ? "답변 수정" : "답변 작성하기"}
                  </button>
                </div>
              </div>

              ${qa.bookTitle ? `<div style="margin-top:8px; font-size:0.82rem; color:var(--color-brand-600);">문의 도서: <strong>${Store.escapeHtml(qa.bookTitle)}</strong></div>` : ""}
              <p style="margin:10px 0; font-size:0.92rem; line-height:1.65;">${Store.escapeHtml(qa.question)}</p>

              ${qa.answer ? `
                <div style="background:var(--color-brand-50); border-left:3px solid var(--color-brand-500); padding:12px 16px; border-radius:var(--radius-sm); font-size:0.88rem;">
                  <div style="font-weight:700; color:var(--color-brand-800); margin-bottom:4px;">등록된 답변 (${qa.answeredAt})</div>
                  <div style="white-space:pre-line;">${Store.escapeHtml(qa.answer)}</div>
                </div>
              ` : ""}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ========================================================================
     6. NOTICES & FAQ SECTION (공지사항 · 자주 묻는 질문 관리)
     ======================================================================== */
  function renderBoardsSection() {
    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <button type="button" class="btn btn-sm btn-primary" id="btnOpenNewPostModal">
          ${ui.boardTab === "notice" ? "+ 새 공지사항 등록" : "+ 새 자주 묻는 질문 등록"}
        </button>
      `)}

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <button type="button" class="chip-btn ${ui.boardTab === "notice" ? "is-active" : ""}" data-board-tab="notice">공지사항 관리 (${state.notices.length})</button>
          <button type="button" class="chip-btn ${ui.boardTab === "faq" ? "is-active" : ""}" data-board-tab="faq">자주 묻는 질문 FAQ 관리 (${state.faqs.length})</button>
        </div>
      </div>

      ${ui.boardTab === "notice" ? `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${state.notices.map(function (nt) {
            return `
              <article class="panel-card" style="margin-bottom:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    ${nt.pinned ? `<span class="badge badge-seal">상단 고정</span>` : ""}
                    <span class="badge badge-brand">${Store.escapeHtml(nt.category)}</span>
                    <strong style="font-size:0.98rem;">${Store.escapeHtml(nt.title)}</strong>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
                    <button type="button" class="btn btn-sm btn-outline" data-edit-notice="${nt.id}">수정</button>
                    <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
                    <span class="switch-wrap" data-toggle-notice-vis="${nt.id}">
                      <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
                      <span>${nt.visible ? "노출 중" : "숨김"}</span>
                    </span>
                  </div>
                </div>
                <p style="margin:0; font-size:0.88rem; color:var(--color-text-secondary); white-space:pre-line;">${Store.escapeHtml(nt.content)}</p>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${state.faqs.map(function (fq) {
            return `
              <article class="panel-card" style="margin-bottom:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                  <div>
                    <span class="badge badge-brand">${Store.escapeHtml(fq.category)}</span>
                    <strong style="margin-left:6px; font-size:0.96rem;">Q. ${Store.escapeHtml(fq.question)}</strong>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
                    <button type="button" class="btn btn-sm btn-outline" data-edit-faq="${fq.id}">수정</button>
                    <button type="button" class="btn btn-sm btn-danger-outline" data-delete-faq="${fq.id}">삭제</button>
                    <span class="switch-wrap" data-toggle-faq-vis="${fq.id}">
                      <span class="switch-pill ${fq.visible ? "is-on" : ""}"></span>
                      <span>${fq.visible ? "노출 중" : "숨김"}</span>
                    </span>
                  </div>
                </div>
                <div style="background:var(--color-brand-50); padding:12px 14px; border-radius:var(--radius-sm); font-size:0.88rem; color:var(--color-text-secondary);">
                  <strong>답변:</strong> ${Store.escapeHtml(fq.answer)}
                </div>
              </article>
            `;
          }).join("")}
        </div>
      `}
    `;
  }

  /* ========================================================================
     7. REVIEWS SECTION (독자 구매후기 관리)
     ======================================================================== */
  function renderReviewsSection() {
    mainEl.innerHTML = `
      ${renderSectionGuideHTML("")}

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${state.reviews.map(function (rv) {
          const bk = state.books.find(function (b) { return b.id === rv.bookId; });
          return `
            <article class="panel-card" style="margin-bottom:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  ${rv.isBest ? `<span class="badge badge-seal">베스트 후기</span>` : ""}
                  <span class="badge ${rv.visible ? "badge-success" : "badge-warning"}">${rv.visible ? "공개 중" : "숨김 상태"}</span>
                  <strong>★ ${rv.rating}.0 · ${Store.escapeHtml(rv.memberMask)}</strong>
                  <span style="font-size:0.8rem; color:var(--color-text-muted);">${rv.createdAt}</span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <button type="button" class="btn btn-sm ${rv.isBest ? "btn-primary" : "btn-outline"}" data-toggle-best-review="${rv.id}">
                    ${rv.isBest ? "베스트 해제" : "베스트 선정"}
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" data-toggle-review="${rv.id}">
                    ${rv.visible ? "숨김 처리" : "다시 공개"}
                  </button>
                </div>
              </div>
              <div style="font-size:0.83rem; font-weight:700; color:var(--color-brand-700); margin-bottom:6px;">
                대상 도서: ${bk ? Store.escapeHtml(bk.title) : rv.bookId}
              </div>
              <p style="margin:0; font-size:0.9rem; ${rv.visible ? "" : "text-decoration:line-through; opacity:0.55;"}">${Store.escapeHtml(rv.content)}</p>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ========================================================================
     8. COMMON CLASSIFICATION CODES SECTION (분류 · 선택항목 코드관리)
     ======================================================================== */
  function getCodeUsageSummary(groupCode, codeVal) {
    if (groupCode === "BOOK_CATEGORY") {
      const n = state.books.filter(function (b) { return b.categoryId === codeVal; }).length;
      return { count: n, text: n > 0 ? `도서 ${n}권 연결됨` : "연결 도서 없음" };
    }
    if (groupCode === "BOOK_TYPE") {
      const n = state.books.filter(function (b) { return b.bookTypeCode === codeVal; }).length;
      return { count: n, text: n > 0 ? `도서 ${n}권 연결됨` : "연결 도서 없음" };
    }
    if (groupCode === "BOOK_SALE_STATUS") {
      const n = state.books.filter(function (b) { return b.saleStatus === codeVal; }).length;
      return { count: n, text: n > 0 ? `도서 ${n}권 해당` : "해당 도서 없음" };
    }
    if (groupCode === "MEMBER_GRADE") {
      const n = state.members.filter(function (m) { return m.memberGrade === codeVal; }).length;
      return { count: n, text: n > 0 ? `회원 ${n}명 사용중` : "해당 회원 없음" };
    }
    if (groupCode === "BOARD_CATEGORY") {
      const n =
        state.qnas.filter(function (q) { return q.category === codeVal; }).length +
        state.notices.filter(function (nt) { return nt.category === codeVal; }).length;
      return { count: n, text: n > 0 ? `게시글 ${n}건 사용중` : "게시글 없음" };
    }
    if (groupCode === "CARRIER_CODE") {
      const n = state.orders.filter(function (o) {
        return o.carrierCode === codeVal || o.carrierName === codeVal;
      }).length;
      return { count: n, text: n > 0 ? `발송주문 ${n}건 연결됨` : "발송 내역 없음" };
    }
    return { count: 0, text: "-" };
  }

  function renderCodesSection() {
    const groups = Array.isArray(state.codeGroups) ? state.codeGroups : [];
    let grp = Store.getCodeGroup(state, ui.codeGroup);
    if (!grp && groups.length > 0) {
      ui.codeGroup = groups[0].groupCode;
      grp = groups[0];
    }
    if (!grp) return;

    const sortedItems = grp.items.slice().sort(function (a, b) {
      return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    });
    const activeCount = sortedItems.filter(function (it) { return it.active !== false; }).length;

    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <a href="./admin-book-new.html" class="btn btn-sm btn-outline">신규 도서 등록 화면 보기 →</a>
      `)}

      <div class="code-mgmt-layout">
        <!-- 좌측(PC) / 상단(모바일): 코드 분류 그룹 목록 -->
        <aside class="code-group-panel" aria-label="관리할 코드 분류 선택">
          <div class="code-group-panel-head">
            <strong style="font-size:0.9rem; color:var(--color-brand-900);">코드 분류 선택 (${groups.length}종)</strong>
            <div style="font-size:0.77rem; color:var(--color-text-muted); margin-top:2px;">수정할 선택창 항목을 눌러주세요</div>
          </div>
          <div class="code-group-list">
            ${groups.map(function (g) {
              const gActive = g.items.filter(function (x) { return x.active !== false; }).length;
              const selected = g.groupCode === grp.groupCode;
              return `
                <button type="button" class="code-group-btn ${selected ? "is-active" : ""}" data-select-code-group="${Store.escapeHtml(g.groupCode)}">
                  <span class="code-group-btn-text">
                    <strong>${Store.escapeHtml(g.groupName)}</strong>
                    <small>사용 ${gActive}개 / 전체 ${g.items.length}개</small>
                  </span>
                  <span class="badge ${selected ? "badge-seal" : "badge-brand"}">${g.items.length}</span>
                </button>
              `;
            }).join("")}
          </div>
        </aside>

        <!-- 우측(PC) / 하단(모바일): 선택 그룹의 상세 코드 목록 및 관리 -->
        <section>
          <div class="code-detail-head">
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:5px;">
                <h3 style="margin:0; font-family:var(--font-serif); font-size:1.12rem; color:var(--color-brand-900);">
                  ${Store.escapeHtml(grp.groupName)} 코드 목록
                </h3>
                <span class="code-key-pill">${Store.escapeHtml(grp.groupCode)}</span>
                <span class="badge badge-success">선택창 노출 ${activeCount}개</span>
              </div>
              <p style="margin:0; font-size:0.84rem; color:var(--color-text-secondary); line-height:1.5;">
                ${Store.escapeHtml(grp.summary)}
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              ${grp.previewUrl ? `<a href="${Store.escapeHtml(grp.previewUrl)}" class="btn btn-sm btn-outline">${Store.escapeHtml(grp.previewLabel || "적용 화면 보기")}</a>` : ""}
              <button type="button" class="btn btn-sm btn-primary" id="btnOpenNewCodeModal">+ 새 항목 코드 추가</button>
            </div>
          </div>

          <!-- PC 데이터 테이블 -->
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>노출 순서</th>
                  <th>관리 코드</th>
                  <th>화면 표시 이름</th>
                  <th>설명 · 연결 현황</th>
                  <th>선택창 노출</th>
                  <th>수정 · 삭제</th>
                </tr>
              </thead>
              <tbody>
                ${sortedItems.map(function (it, idx) {
                  const usage = getCodeUsageSummary(grp.groupCode, it.code);
                  const isFirst = idx === 0;
                  const isLast = idx === sortedItems.length - 1;
                  return `
                    <tr>
                      <td>
                        <div class="code-order-ctrl">
                          <strong style="min-width:22px; font-size:0.84rem; color:var(--color-brand-800);">${idx + 1}</strong>
                          <button type="button" class="code-order-btn" data-move-code="${Store.escapeHtml(it.code)}" data-dir="-1" ${isFirst ? "disabled" : ""} title="위로 이동" aria-label="순서 위로">▲</button>
                          <button type="button" class="code-order-btn" data-move-code="${Store.escapeHtml(it.code)}" data-dir="1" ${isLast ? "disabled" : ""} title="아래로 이동" aria-label="순서 아래로">▼</button>
                        </div>
                      </td>
                      <td><span class="code-key-pill">${Store.escapeHtml(it.code)}</span></td>
                      <td>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                          <strong>${Store.escapeHtml(it.name)}</strong>
                          ${it.hanja ? `<span class="badge badge-seal">${Store.escapeHtml(it.hanja)}</span>` : ""}
                        </div>
                      </td>
                      <td>
                        <div style="font-size:0.83rem; color:var(--color-text-secondary);">${Store.escapeHtml(it.desc || "-")}</div>
                        ${grp.groupCode === "CARRIER_CODE" && it.trackingUrl ? `
                          <div style="font-size:0.76rem; margin-top:3px; word-break:break-all;">
                            조회주소: <a href="${Store.escapeHtml(it.trackingUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-brand-700); text-decoration:underline;">${Store.escapeHtml(it.trackingUrl)}</a>
                          </div>
                        ` : ""}
                        <div style="margin-top:4px;">
                          <span class="badge ${usage.count > 0 ? "badge-brand" : ""}" style="${usage.count > 0 ? "" : "background:var(--color-brand-50); color:var(--color-text-muted);"}">${Store.escapeHtml(usage.text)}</span>
                        </div>
                      </td>
                      <td>
                        <span class="switch-wrap" data-toggle-code-active="${Store.escapeHtml(it.code)}">
                          <span class="switch-pill ${it.active !== false ? "is-on" : ""}"></span>
                          <span>${it.active !== false ? "사용중" : "숨김"}</span>
                        </span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                          <button type="button" class="btn btn-sm btn-soft" data-edit-code="${Store.escapeHtml(it.code)}">수정</button>
                          <button type="button" class="btn btn-sm btn-danger-outline" data-delete-code="${Store.escapeHtml(it.code)}">삭제</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <!-- 모바일 운영 액션 카드 (< 1024px) -->
          <div class="admin-mobile-cards">
            ${sortedItems.map(function (it, idx) {
              const usage = getCodeUsageSummary(grp.groupCode, it.code);
              const isFirst = idx === 0;
              const isLast = idx === sortedItems.length - 1;
              return `
                <article class="admin-action-card">
                  <div class="admin-card-head">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                      <span class="badge badge-brand">순서 ${idx + 1}</span>
                      <span class="code-key-pill">${Store.escapeHtml(it.code)}</span>
                      ${it.hanja ? `<span class="badge badge-seal">${Store.escapeHtml(it.hanja)}</span>` : ""}
                    </div>
                    <span class="switch-wrap" data-toggle-code-active="${Store.escapeHtml(it.code)}">
                      <span class="switch-pill ${it.active !== false ? "is-on" : ""}"></span>
                      <span>${it.active !== false ? "사용중" : "숨김"}</span>
                    </span>
                  </div>
                  <strong style="font-size:1rem; color:var(--color-brand-900);">${Store.escapeHtml(it.name)}</strong>
                  <dl class="admin-card-kv">
                    <dt>항목 설명</dt><dd>${Store.escapeHtml(it.desc || "-")}</dd>
                    ${grp.groupCode === "CARRIER_CODE" && it.trackingUrl ? `<dt>조회 주소</dt><dd><a href="${Store.escapeHtml(it.trackingUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-brand-700); text-decoration:underline;">${Store.escapeHtml(it.trackingUrl)}</a></dd>` : ""}
                    <dt>연결 현황</dt><dd>${Store.escapeHtml(usage.text)}</dd>
                  </dl>
                  <div class="admin-card-actions">
                    <div class="code-order-ctrl" style="margin-right:auto;">
                      <button type="button" class="code-order-btn" data-move-code="${Store.escapeHtml(it.code)}" data-dir="-1" ${isFirst ? "disabled" : ""} aria-label="순서 위로">▲</button>
                      <button type="button" class="code-order-btn" data-move-code="${Store.escapeHtml(it.code)}" data-dir="1" ${isLast ? "disabled" : ""} aria-label="순서 아래로">▼</button>
                    </div>
                    <button type="button" class="btn btn-sm btn-soft" data-edit-code="${Store.escapeHtml(it.code)}">수정</button>
                    <button type="button" class="btn btn-sm btn-danger-outline" data-delete-code="${Store.escapeHtml(it.code)}">삭제</button>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      </div>
    `;
  }

  /* ========================================================================
     9. BANNERS SECTION (메인 배너 · 띠배너 관리 — 쇼핑몰 실시간 연동)
     ======================================================================== */
  function renderBannersSection() {
    mainEl.innerHTML = `
      ${renderSectionGuideHTML(`
        <a href="./index.html" class="btn btn-sm btn-outline">쇼핑몰 메인에서 배너 확인하기 ↗</a>
      `)}

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${state.banners.map(function (bn) {
          return `
            <article class="panel-card" style="margin-bottom:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding-bottom:12px; border-bottom:1px solid var(--color-border);">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span class="badge badge-brand">${Store.escapeHtml(bn.positionLabel)}</span>
                  <span style="font-size:0.82rem; color:var(--color-text-muted);">노출 기간: ${Store.escapeHtml(bn.period)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-left:auto;">
                  <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">배너 수정</button>
                  <span class="switch-wrap" data-toggle-banner="${bn.id}">
                    <span class="switch-pill ${bn.active ? "is-on" : ""}"></span>
                    <span>${bn.active ? "쇼핑몰 노출 켜짐" : "노출 꺼짐"}</span>
                  </span>
                </div>
              </div>

              <div style="margin-top:14px; background:linear-gradient(135deg, #f3f1ec 0%, #e6e1d6 100%); padding:18px 20px; border-radius:var(--radius-md); border:1px solid var(--color-border);">
                ${bn.eyebrow ? `<span class="badge badge-seal" style="margin-bottom:8px;">${Store.escapeHtml(bn.eyebrow)}</span>` : ""}
                <h3 style="margin:0 0 6px; font-family:var(--font-serif); font-size:1.12rem; color:var(--color-brand-900);">${Store.escapeHtml(bn.title)}</h3>
                ${bn.subtitle ? `<p style="margin:0 0 10px; font-size:0.86rem; color:var(--color-text-secondary);">${Store.escapeHtml(bn.subtitle)}</p>` : ""}
                ${bn.imageUrl ? `
                  <div style="margin:12px 0; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--color-border); max-width:480px; background:#ffffff;">
                    <img src="${Store.escapeHtml(bn.imageUrl)}" alt="${Store.escapeHtml(bn.title)}" style="width:100%; max-height:180px; object-fit:cover; display:block;" />
                  </div>
                ` : ""}
                ${bn.buttonText ? `<span class="badge badge-brand">버튼 문구: ${Store.escapeHtml(bn.buttonText)}</span>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ========================================================================
     9. TERMS & SITE SETTINGS SECTION (약관 · 입금계좌 · 배송비 설정)
     ======================================================================== */
  function renderSettingsSection() {
    const cfg = state.siteConfig;
    const activeTerm = state.terms[ui.settingsTab];

    mainEl.innerHTML = `
      ${renderSectionGuideHTML("")}

      <div class="admin-filter-box">
        <div class="admin-filter-primary">
          <button type="button" class="chip-btn ${ui.settingsTab === "basic" ? "is-active" : ""}" data-settings-tab="basic">기본정보 · 입금계좌 · 배송비</button>
          <button type="button" class="chip-btn ${ui.settingsTab === "serviceTerms" ? "is-active" : ""}" data-settings-tab="serviceTerms">서비스 이용약관</button>
          <button type="button" class="chip-btn ${ui.settingsTab === "privacyPolicy" ? "is-active" : ""}" data-settings-tab="privacyPolicy">개인정보 수집·이용 안내</button>
          <button type="button" class="chip-btn ${ui.settingsTab === "shippingPolicy" ? "is-active" : ""}" data-settings-tab="shippingPolicy">배송·교환·반품 안내</button>
        </div>
      </div>

      ${ui.settingsTab === "basic" ? `
        <form class="panel-card" id="siteBasicConfigForm" style="margin-bottom:0;">
          <h3 style="margin:0 0 16px; font-size:1.05rem;">쇼핑몰 운영 기본정보 및 배송비 정책</h3>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="cfgMallName">쇼핑몰 이름 *</label>
              <input type="text" id="cfgMallName" class="form-input" value="${Store.escapeHtml(cfg.mallName)}" required />
            </div>
            <div class="form-field">
              <label for="cfgCeoName">대표자명 *</label>
              <input type="text" id="cfgCeoName" class="form-input" value="${Store.escapeHtml(cfg.ceoName)}" required />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field">
              <label for="cfgCsPhone">고객센터 전화번호 *</label>
              <input type="text" id="cfgCsPhone" class="form-input" value="${Store.escapeHtml(cfg.csPhone)}" required />
            </div>
            <div class="form-field">
              <label for="cfgCsHours">고객센터 상담시간 안내 *</label>
              <input type="text" id="cfgCsHours" class="form-input" value="${Store.escapeHtml(cfg.csHours)}" required />
            </div>
          </div>

          <div class="form-field">
            <label for="cfgBankAccount">무통장 입금 계좌 안내 *</label>
            <input type="text" id="cfgBankAccount" class="form-input" value="${Store.escapeHtml(cfg.bankAccount)}" required />
          </div>

          <div class="form-field">
            <label for="cfgAddress">사업장(출판부) 주소 *</label>
            <input type="text" id="cfgAddress" class="form-input" value="${Store.escapeHtml(cfg.address)}" required />
          </div>

          <div class="form-grid-3">
            <div class="form-field">
              <label for="cfgFreeThreshold">무료배송 기준 금액 (원) *</label>
              <input type="number" id="cfgFreeThreshold" class="form-input" value="${cfg.freeShippingThreshold}" step="1000" min="0" required />
            </div>
            <div class="form-field">
              <label for="cfgBaseFee">기본 택배비 (원) *</label>
              <input type="number" id="cfgBaseFee" class="form-input" value="${cfg.baseShippingFee}" step="500" min="0" required />
            </div>
            <div class="form-field">
              <label for="cfgCutoff">당일 발송 마감 안내 문구 *</label>
              <input type="text" id="cfgCutoff" class="form-input" value="${Store.escapeHtml(cfg.cutoffNotice)}" required />
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <button type="submit" class="btn btn-primary">기본 설정 저장하기</button>
          </div>
        </form>
      ` : `
        <form class="panel-card" id="siteTermEditForm" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
            <div>
              <h3 style="margin:0; font-size:1.05rem;">${Store.escapeHtml(activeTerm.title)}</h3>
              <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:2px;">
                이곳에서 내용을 수정하고 저장하면 회원가입 페이지와 쇼핑몰 하단 약관 창에 즉시 적용됩니다.
              </div>
            </div>
            <span class="badge badge-brand">최근 수정일: ${activeTerm.updatedAt}</span>
          </div>

          <div class="form-field">
            <label for="termTitleInput">문서 제목</label>
            <input type="text" id="termTitleInput" class="form-input" value="${Store.escapeHtml(activeTerm.title)}" required />
          </div>

          <div class="form-field">
            <label for="termContentInput">약관 · 안내 본문 내용</label>
            <textarea id="termContentInput" class="form-input" rows="11" required>${Store.escapeHtml(activeTerm.content)}</textarea>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-top:16px;">
            <a href="./signup.html" class="btn btn-sm btn-outline">회원가입 페이지에서 약관 확인하기 ↗</a>
            <button type="submit" class="btn btn-primary">약관 내용 저장하기</button>
          </div>
        </form>
      `}
    `;
  }

  /* ========================================================================
     MODALS: Waybill, Member Detail, Q&A Reply, Board Post, Banner Edit
     ======================================================================== */
  function openCodeItemModal(editCode) {
    const grp = Store.getCodeGroup(state, ui.codeGroup);
    if (!grp) return;

    const existing = editCode
      ? grp.items.find(function (x) { return x.code === editCode; })
      : null;

    ui.editingCodeMode = existing ? "edit" : "create";
    ui.editingCodeOrigin = existing ? existing.code : null;

    document.getElementById("codeItemModalTitle").textContent = existing
      ? `[${grp.groupName}] 코드 항목 수정`
      : `[${grp.groupName}] 새 코드 항목 추가`;
    document.getElementById("btnSubmitCodeItem").textContent = existing
      ? "코드 수정 저장"
      : "새 코드 등록";

    const nextSort = existing ? existing.sortOrder : (grp.items.length + 1);
    const isCat = grp.groupCode === "BOOK_CATEGORY";
    const isCarrier = grp.groupCode === "CARRIER_CODE";

    let codePlaceholder = "예: SHANGHAN (영문 대문자·숫자·밑줄)";
    let namePlaceholder = "예: 상한 · 금궤경전";
    if (grp.groupCode === "BOOK_TYPE") {
      codePlaceholder = "예: SPECIAL_SET";
      namePlaceholder = "예: 특별 양장본 세트";
    } else if (grp.groupCode === "MEMBER_GRADE") {
      codePlaceholder = "예: 학당 연구회원";
      namePlaceholder = "예: 학당 연구회원";
    } else if (grp.groupCode === "CARRIER_CODE") {
      codePlaceholder = "예: KGB";
      namePlaceholder = "예: 경동택배";
    }

    document.getElementById("codeItemModalBody").innerHTML = `
      <div style="background:var(--color-brand-50); padding:10px 14px; border-radius:var(--radius-sm); margin-bottom:14px; font-size:0.83rem; color:var(--color-text-secondary);">
        분류 그룹: <strong style="color:var(--color-brand-900);">${Store.escapeHtml(grp.groupName)}</strong> (${Store.escapeHtml(grp.groupCode)})
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <label for="ciCode">관리 코드 *</label>
          <input
            type="text"
            id="ciCode"
            class="form-input"
            value="${existing ? Store.escapeHtml(existing.code) : ""}"
            placeholder="${codePlaceholder}"
            ${existing ? "readonly style='background:var(--color-brand-50); color:var(--color-text-muted);'" : ""}
            required
          />
          <div class="form-help">${existing ? "기존 데이터와 연결된 코드값은 고정됩니다." : "시스템 내부에서 구분하는 고유 코드값입니다."}</div>
        </div>
        <div class="form-field">
          <label for="ciSortOrder">선택창 노출 순서 *</label>
          <input type="number" id="ciSortOrder" class="form-input" value="${nextSort}" min="1" max="99" required />
          <div class="form-help">숫자가 작을수록 선택창 위쪽에 표시됩니다.</div>
        </div>
      </div>

      <div class="form-field">
        <label for="ciName">화면 표시 이름 *</label>
        <input type="text" id="ciName" class="form-input" value="${existing ? Store.escapeHtml(existing.name) : ""}" placeholder="${namePlaceholder}" required />
        <div class="form-help">도서 등록 선택창과 쇼핑몰 화면에 실제로 표시되는 이름입니다.</div>
      </div>

      ${isCat ? `
        <div class="form-field">
          <label for="ciHanja">쇼핑몰 서가 문패 한자 (선택, 2글자 권장)</label>
          <input type="text" id="ciHanja" class="form-input" maxlength="4" value="${existing && existing.hanja ? Store.escapeHtml(existing.hanja) : ""}" placeholder="예: 傷寒, 本草" />
        </div>
      ` : ""}

      ${isCarrier ? `
        <div class="form-field">
          <label for="ciTrackingUrl">택배사 공식 배송조회 페이지 주소 (URL) *</label>
          <input type="url" id="ciTrackingUrl" class="form-input" value="${existing && existing.trackingUrl ? Store.escapeHtml(existing.trackingUrl) : ""}" placeholder="https://..." required />
        </div>
        <div class="form-grid-2">
          <div class="form-field">
            <label for="ciCsPhone">택배사 고객센터 전화번호</label>
            <input type="text" id="ciCsPhone" class="form-input" value="${existing && existing.csPhone ? Store.escapeHtml(existing.csPhone) : ""}" placeholder="예: 1588-0000" />
          </div>
          <div class="form-field">
            <label for="ciSamplePrefix">송장번호 앞자리 예시</label>
            <input type="text" id="ciSamplePrefix" class="form-input" value="${existing && existing.samplePrefix ? Store.escapeHtml(existing.samplePrefix) : "6482"}" placeholder="예: 6482" />
          </div>
        </div>
      ` : ""}

      <div class="form-field">
        <label for="ciDesc">항목 설명 메모 (선택)</label>
        <input type="text" id="ciDesc" class="form-input" value="${existing && existing.desc ? Store.escapeHtml(existing.desc) : ""}" placeholder="운영자 참고 설명 또는 분야 소개 문구" />
      </div>

      <div class="form-field" style="margin-bottom:0;">
        <label class="check-label">
          <input type="checkbox" id="ciActive" ${(existing ? existing.active !== false : true) ? "checked" : ""} />
          <span>선택창 및 메뉴에 바로 표시하기 (사용중)</span>
        </label>
      </div>
    `;

    document.getElementById("codeItemModal").classList.add("is-open");
  }

  function openWaybillModal(orderNo) {
    const ord = state.orders.find(function (o) { return o.orderNo === orderNo; });
    if (!ord) return;
    ui.activeWaybillOrderNo = orderNo;

    const activeCarriers = Store.getActiveCarriers(state);
    const currentCarrier = Store.getCarrierInfo(ord.carrierCode || ord.carrierName || (activeCarriers[0] && activeCarriers[0].code) || "CJ", state);
    const carrierPool = activeCarriers.some(function (c) { return c.code === currentCarrier.code; })
      ? activeCarriers
      : activeCarriers.concat([currentCarrier]);

    const isEditing = Boolean(ord.trackingNumber);
    const defaultTrackingNo = isEditing
      ? ord.trackingNumber
      : (currentCarrier.samplePrefix || "6482") + "-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000);

    document.getElementById("waybillModalTitle").textContent = isEditing
      ? "택배 송장번호 수정"
      : "택배 송장번호 등록 · 발송 완료 처리";

    document.getElementById("waybillModalBody").innerHTML = `
      <div style="background:var(--color-brand-50); padding:12px 14px; border-radius:var(--radius-sm); margin-bottom:16px; font-size:0.86rem;">
        <div><strong>주문번호:</strong> ${Store.escapeHtml(ord.orderNo)}</div>
        <div style="margin-top:4px;"><strong>받는 분:</strong> ${Store.escapeHtml(ord.recipientName)} (${Store.escapeHtml(ord.recipientPhone)})</div>
        <div style="margin-top:4px;"><strong>배송지:</strong> ${Store.escapeHtml(ord.address)}</div>
      </div>
      <div class="form-field">
        <div class="field-label-with-link">
          <label for="wbCarrier">발송 택배사 선택 *</label>
          <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="CARRIER_CODE">택배사 코드관리 →</button>
        </div>
        <select id="wbCarrier" class="form-input">
          ${carrierPool.map(function (c) {
            const sel = c.code === currentCarrier.code ? "selected" : "";
            return `<option value="${Store.escapeHtml(c.code)}|${Store.escapeHtml(c.name)}" ${sel}>${Store.escapeHtml(c.name)} (고객센터 ${Store.escapeHtml(c.csPhone)})</option>`;
          }).join("")}
        </select>
      </div>
      <div class="form-field">
        <label for="wbTrackingNo">운송장 번호 입력 *</label>
        <input type="text" id="wbTrackingNo" class="form-input" value="${Store.escapeHtml(defaultTrackingNo)}" data-is-editing="${isEditing ? "1" : "0"}" placeholder="예: 6482-9104-3382" required />
        <div class="form-help">송장번호를 저장하면 주문 상태가 <strong>[송장 등록 · 발송완료]</strong>로 변경되며, 그 이후 배송 추적은 고객이 직접 조회합니다.</div>
      </div>
      <div style="background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:10px 12px; font-size:0.8rem; color:var(--color-text-secondary); word-break:break-all;">
        <div style="font-weight:700; color:var(--color-brand-800); margin-bottom:2px;">고객 화면에 함께 안내될 택배사 조회 주소</div>
        <a id="wbCarrierUrlPreview" href="${Store.escapeHtml(currentCarrier.trackingUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-brand-700); text-decoration:underline;">${Store.escapeHtml(currentCarrier.trackingUrl)}</a>
      </div>
    `;
    document.getElementById("waybillModal").classList.add("is-open");
  }

  function openMemberDetailModal(memberId) {
    const m = state.members.find(function (x) { return x.id === memberId; });
    if (!m) return;
    ui.activeMemberId = memberId;

    const gradeCodes = Store.getActiveCodes(state, "MEMBER_GRADE").slice();
    if (m.memberGrade && !gradeCodes.some(function (g) { return g.code === m.memberGrade; })) {
      gradeCodes.push({ code: m.memberGrade, name: m.memberGrade });
    }

    document.getElementById("memberDetailModalBody").innerHTML = `
      <div style="background:var(--color-brand-50); padding:14px; border-radius:var(--radius-sm); margin-bottom:16px; font-size:0.86rem;">
        <div style="margin-bottom:4px;"><strong>회원명 / 아이디:</strong> ${Store.escapeHtml(m.name)} (${Store.escapeHtml(m.loginId)})</div>
        <div style="margin-bottom:4px;"><strong>연락처 / 이메일:</strong> ${Store.escapeHtml(m.phone)} | ${Store.escapeHtml(m.email)}</div>
        <div><strong>기본 배송지:</strong> (${Store.escapeHtml(m.zipCode || "-")}) ${Store.escapeHtml(m.address)}</div>
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <div class="field-label-with-link">
            <label for="mdGrade">회원 등급</label>
            <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="MEMBER_GRADE">코드 관리 →</button>
          </div>
          <select id="mdGrade" class="form-input">
            ${gradeCodes.map(function (g) {
              return `<option value="${Store.escapeHtml(g.code)}" ${m.memberGrade === g.code ? "selected" : ""}>${Store.escapeHtml(g.name)}</option>`;
            }).join("")}
          </select>
        </div>
        <div class="form-field">
          <label for="mdPoints">보유 적립금 (원)</label>
          <input type="number" id="mdPoints" class="form-input" value="${m.points || 0}" step="500" min="0" />
        </div>
      </div>

      <div class="form-field">
        <label for="mdMemo">운영자 참고 메모 (고객에게 보이지 않음)</label>
        <textarea id="mdMemo" class="form-input" rows="3" placeholder="세금계산서 요청 사항, 배송 특이사항 등">${Store.escapeHtml(m.adminMemo || "")}</textarea>
      </div>
    `;
    document.getElementById("memberDetailModal").classList.add("is-open");
  }

  function openQnaReplyModal(qnaId) {
    const qa = state.qnas.find(function (x) { return x.id === qnaId; });
    if (!qa) return;
    ui.activeQnaId = qnaId;

    document.getElementById("qnaReplyModalBody").innerHTML = `
      <div style="background:var(--color-brand-50); padding:14px; border-radius:var(--radius-sm); margin-bottom:16px; font-size:0.88rem;">
        <div style="margin-bottom:6px;">
          <span class="badge badge-brand">${Store.escapeHtml(qa.category)}</span>
          <strong style="margin-left:4px;">${Store.escapeHtml(qa.writerName)}</strong> (${qa.createdAt})
        </div>
        <div style="font-weight:700; margin-bottom:6px;">${Store.escapeHtml(qa.title)}</div>
        <div style="color:var(--color-text-secondary);">${Store.escapeHtml(qa.question)}</div>
      </div>

      <div class="form-field">
        <label for="qnaAnswerInput">고객에게 전달할 답변 내용 *</label>
        <textarea id="qnaAnswerInput" class="form-input" rows="5" placeholder="친절하고 명확한 안내 답변을 입력해 주세요." required>${Store.escapeHtml(qa.answer || "안녕하세요, 현동서재 출판부입니다.\n문의주신 내용 확인하여 안내드립니다. ")}</textarea>
      </div>
    `;
    document.getElementById("qnaReplyModal").classList.add("is-open");
  }

  function openNewBoardPostModal() {
    ui.editingNoticeId = null;
    ui.editingFaqId = null;
    const isNotice = ui.boardTab === "notice";
    const boardCodes = Store.getActiveCodes(state, "BOARD_CATEGORY");
    document.getElementById("boardPostModalTitle").textContent = isNotice
      ? "새 공지사항 작성"
      : "새 자주 묻는 질문(FAQ) 등록";
    const submitBtn = document.getElementById("btnSubmitBoardPost");
    if (submitBtn) submitBtn.textContent = isNotice ? "새 공지사항 등록하기" : "새 FAQ 등록하기";

    document.getElementById("boardPostModalBody").innerHTML = isNotice ? `
      <div class="form-grid-2">
        <div class="form-field">
          <div class="field-label-with-link">
            <label for="npCategory">분류</label>
            <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="BOARD_CATEGORY">코드 관리 →</button>
          </div>
          <select id="npCategory" class="form-input">
            ${(boardCodes.length ? boardCodes : [{ code: "발송안내", name: "발송안내" }, { code: "신간소식", name: "신간소식" }]).map(function (c) {
              return `<option value="${Store.escapeHtml(c.code)}">${Store.escapeHtml(c.name)}</option>`;
            }).join("")}
          </select>
        </div>
        <div class="form-field" style="display:flex; align-items:flex-end; padding-bottom:10px;">
          <label class="check-label">
            <input type="checkbox" id="npPinned" checked />
            <span>목록 맨 위에 중요 공지로 고정</span>
          </label>
        </div>
      </div>
      <div class="form-field">
        <label for="npTitle">공지 제목 *</label>
        <input type="text" id="npTitle" class="form-input" placeholder="예: [안내] 동계 강독 교재 단체 주문 일정 안내" required />
      </div>
      <div class="form-field">
        <label for="npContent">공지 본문 *</label>
        <textarea id="npContent" class="form-input" rows="5" placeholder="공지하실 상세 내용을 입력해 주세요." required></textarea>
      </div>
    ` : `
      <div class="form-field">
        <div class="field-label-with-link">
          <label for="npCategory">질문 분류</label>
          <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="BOARD_CATEGORY">코드 관리 →</button>
        </div>
        <select id="npCategory" class="form-input">
          ${(boardCodes.length ? boardCodes : [{ code: "배송문의", name: "배송 · 포장 문의" }]).map(function (c) {
            return `<option value="${Store.escapeHtml(c.code)}">${Store.escapeHtml(c.name)}</option>`;
          }).join("")}
        </select>
      </div>
      <div class="form-field">
        <label for="npTitle">자주 묻는 질문 (Q) *</label>
        <input type="text" id="npTitle" class="form-input" placeholder="예: 제주도나 도서산간 지역도 무료배송이 되나요?" required />
      </div>
      <div class="form-field">
        <label for="npContent">답변 내용 (A) *</label>
        <textarea id="npContent" class="form-input" rows="4" placeholder="고객이 바로 이해할 수 있도록 답변을 적어주세요." required></textarea>
      </div>
    `;
    document.getElementById("boardPostModal").classList.add("is-open");
  }

  function openEditNoticeModal(noticeId) {
    const nt = state.notices.find(function (x) { return x.id === noticeId; });
    if (!nt) return;
    ui.editingNoticeId = noticeId;
    ui.editingFaqId = null;
    ui.boardTab = "notice";
    const boardCodes = Store.getActiveCodes(state, "BOARD_CATEGORY");
    document.getElementById("boardPostModalTitle").textContent = "공지사항 수정";
    const submitBtn = document.getElementById("btnSubmitBoardPost");
    if (submitBtn) submitBtn.textContent = "공지사항 수정 저장";

    document.getElementById("boardPostModalBody").innerHTML = `
      <div class="form-grid-2">
        <div class="form-field">
          <div class="field-label-with-link">
            <label for="npCategory">분류</label>
            <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="BOARD_CATEGORY">코드 관리 →</button>
          </div>
          <select id="npCategory" class="form-input">
            ${(boardCodes.length ? boardCodes : [{ code: "발송안내", name: "발송안내" }, { code: "신간소식", name: "신간소식" }]).map(function (c) {
              const sel = c.code === nt.category ? "selected" : "";
              return `<option value="${Store.escapeHtml(c.code)}" ${sel}>${Store.escapeHtml(c.name)}</option>`;
            }).join("")}
          </select>
        </div>
        <div class="form-field" style="display:flex; align-items:flex-end; padding-bottom:10px;">
          <label class="check-label">
            <input type="checkbox" id="npPinned" ${nt.pinned ? "checked" : ""} />
            <span>목록 맨 위에 중요 공지로 고정</span>
          </label>
        </div>
      </div>
      <div class="form-field">
        <label for="npTitle">공지 제목 *</label>
        <input type="text" id="npTitle" class="form-input" value="${Store.escapeHtml(nt.title)}" required />
      </div>
      <div class="form-field">
        <label for="npContent">공지 본문 *</label>
        <textarea id="npContent" class="form-input" rows="5" required>${Store.escapeHtml(nt.content)}</textarea>
      </div>
    `;
    document.getElementById("boardPostModal").classList.add("is-open");
  }

  function openEditFaqModal(faqId) {
    const fq = state.faqs.find(function (x) { return x.id === faqId; });
    if (!fq) return;
    ui.editingFaqId = faqId;
    ui.editingNoticeId = null;
    ui.boardTab = "faq";
    const boardCodes = Store.getActiveCodes(state, "BOARD_CATEGORY");
    document.getElementById("boardPostModalTitle").textContent = "자주 묻는 질문(FAQ) 수정";
    const submitBtn = document.getElementById("btnSubmitBoardPost");
    if (submitBtn) submitBtn.textContent = "FAQ 수정 저장";

    document.getElementById("boardPostModalBody").innerHTML = `
      <div class="form-field">
        <div class="field-label-with-link">
          <label for="npCategory">질문 분류</label>
          <button type="button" class="field-code-link" style="background:none; border:none; padding:0; cursor:pointer;" data-jump-codes="BOARD_CATEGORY">코드 관리 →</button>
        </div>
        <select id="npCategory" class="form-input">
          ${(boardCodes.length ? boardCodes : [{ code: "배송문의", name: "배송 · 포장 문의" }]).map(function (c) {
            const sel = c.code === fq.category ? "selected" : "";
            return `<option value="${Store.escapeHtml(c.code)}" ${sel}>${Store.escapeHtml(c.name)}</option>`;
          }).join("")}
        </select>
      </div>
      <div class="form-field">
        <label for="npTitle">자주 묻는 질문 (Q) *</label>
        <input type="text" id="npTitle" class="form-input" value="${Store.escapeHtml(fq.question)}" required />
      </div>
      <div class="form-field">
        <label for="npContent">답변 내용 (A) *</label>
        <textarea id="npContent" class="form-input" rows="4" required>${Store.escapeHtml(fq.answer)}</textarea>
      </div>
    `;
    document.getElementById("boardPostModal").classList.add("is-open");
  }

  function openBannerEditModal(bannerId) {
    const bn = state.banners.find(function (x) { return x.id === bannerId; });
    if (!bn) return;
    ui.activeBannerId = bannerId;

    document.getElementById("bannerEditModalTitle").textContent = bn.positionLabel + " 수정";
    document.getElementById("bannerEditModalBody").innerHTML = `
      <div class="form-field">
        <label for="bnImageFileInput">배너 이미지 파일 업로드</label>
        <input type="file" id="bnImageFileInput" class="form-input" accept="image/*" />
        <span style="font-size:0.78rem; color:var(--color-text-muted); margin-top:4px; display:block;">
          이미지 파일 선택 시 실시간 미리보기가 동작하며 Base64 DataURL로 자동 변환 저장됩니다.
        </span>
      </div>
      <div class="form-field">
        <label for="bnImageUrl">배너 이미지 URL (직접 입력 또는 파일 업로드 시 자동 채움)</label>
        <input type="text" id="bnImageUrl" class="form-input" placeholder="https://... 또는 images/hero.png" value="${Store.escapeHtml(bn.imageUrl || "")}" />
      </div>
      <div class="form-field">
        <label>배너 이미지 미리보기</label>
        <div id="bnImagePreviewContainer" style="border:1px dashed var(--color-border); border-radius:var(--radius-sm); padding:12px; text-align:center; background:var(--color-bg); min-height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;">
          <img id="bnImagePreview" src="${Store.escapeHtml(bn.imageUrl || "")}" alt="배너 이미지 미리보기" style="max-width:100%; max-height:160px; object-fit:contain; border-radius:4px; ${bn.imageUrl ? "" : "display:none;"}" />
          <span id="bnImagePreviewEmpty" style="font-size:0.82rem; color:var(--color-text-muted); ${bn.imageUrl ? "display:none;" : ""}">
            등록된 배너 이미지가 없습니다. 상단에서 파일을 선택하거나 이미지 URL을 입력해 주세요.
          </span>
          <button type="button" class="btn btn-sm btn-outline" id="btnClearBannerImg" style="${bn.imageUrl ? "" : "display:none;"}">이미지 초기화</button>
        </div>
      </div>
      <div class="form-field">
        <label for="bnEyebrow">상단 작은 강조 문구</label>
        <input type="text" id="bnEyebrow" class="form-input" value="${Store.escapeHtml(bn.eyebrow || "")}" />
      </div>
      <div class="form-field">
        <label for="bnTitle">배너 메인 제목 *</label>
        <input type="text" id="bnTitle" class="form-input" value="${Store.escapeHtml(bn.title)}" required />
      </div>
      <div class="form-field">
        <label for="bnSubtitle">보조 설명 문구</label>
        <textarea id="bnSubtitle" class="form-input" rows="3">${Store.escapeHtml(bn.subtitle || "")}</textarea>
      </div>
      <div class="form-grid-2">
        <div class="form-field">
          <label for="bnBtnText">버튼 표시 이름</label>
          <input type="text" id="bnBtnText" class="form-input" value="${Store.escapeHtml(bn.buttonText || "")}" />
        </div>
        <div class="form-field">
          <label for="bnPeriod">노출 기간 메모</label>
          <input type="text" id="bnPeriod" class="form-input" value="${Store.escapeHtml(bn.period || "")}" />
        </div>
      </div>
    `;

    const fileInput = document.getElementById("bnImageFileInput");
    const urlInput = document.getElementById("bnImageUrl");
    const previewImg = document.getElementById("bnImagePreview");
    const previewEmpty = document.getElementById("bnImagePreviewEmpty");
    const clearBtn = document.getElementById("btnClearBannerImg");

    function setPreviewSource(src) {
      const cleanSrc = (src || "").trim();
      if (cleanSrc) {
        previewImg.src = cleanSrc;
        previewImg.style.display = "";
        previewEmpty.style.display = "none";
        clearBtn.style.display = "";
      } else {
        previewImg.removeAttribute("src");
        previewImg.style.display = "none";
        previewEmpty.style.display = "";
        clearBtn.style.display = "none";
      }
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (evt) {
            const dataUrl = evt.target.result;
            if (urlInput) urlInput.value = dataUrl;
            setPreviewSource(dataUrl);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener("input", function () {
        setPreviewSource(urlInput.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (fileInput) fileInput.value = "";
        if (urlInput) urlInput.value = "";
        setPreviewSource("");
      });
    }

    document.getElementById("bannerEditModal").classList.add("is-open");
  }

  /* ========================================================================
     Event Delegation
     ======================================================================== */
  function openAdminDrawer() {
    document.getElementById("adminSidebar").classList.add("is-open");
    document.getElementById("adminDrawerBackdrop").classList.add("is-open");
  }

  function closeAdminDrawer() {
    document.getElementById("adminSidebar").classList.remove("is-open");
    document.getElementById("adminDrawerBackdrop").classList.remove("is-open");
  }

  document.getElementById("btnOpenAdminDrawer").addEventListener("click", openAdminDrawer);
  document.getElementById("btnCloseAdminDrawer").addEventListener("click", closeAdminDrawer);
  document.getElementById("adminDrawerBackdrop").addEventListener("click", closeAdminDrawer);
  document.getElementById("btnMobMoreMenu").addEventListener("click", openAdminDrawer);

  document.getElementById("btnAdminResetDemo").addEventListener("click", function () {
    state = Store.resetState();
    render();
    Store.showToast("모든 시연 데이터가 처음 상태로 초기화되었습니다.");
  });

  document.addEventListener("click", function (e) {
    const secBtn = e.target.closest("[data-admin-sec]");
    if (secBtn) {
      ui.section = secBtn.getAttribute("data-admin-sec");
      closeAdminDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    if (e.target.id === "btnOpenNewPostModal") {
      openNewBoardPostModal();
      return;
    }

    const periodBtn = e.target.closest("[data-chart-period]");
    if (periodBtn) {
      ui.chartPeriod = periodBtn.getAttribute("data-chart-period");
      render();
      return;
    }

    const jumpOrd = e.target.closest("[data-jump-order-filter]");
    if (jumpOrd) {
      ui.section = "orders";
      ui.orderFilter = jumpOrd.getAttribute("data-jump-order-filter");
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const closeBtn = e.target.closest("[data-close-admin-modal]");
    if (closeBtn) {
      const modalId = closeBtn.getAttribute("data-close-admin-modal");
      if (modalId === "boardPostModal") {
        ui.editingNoticeId = null;
        ui.editingFaqId = null;
      }
      document.getElementById(modalId).classList.remove("is-open");
      return;
    }

    if (e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("is-open");
      if (e.target.id === "boardPostModal") {
        ui.editingNoticeId = null;
        ui.editingFaqId = null;
      }
      return;
    }

    if (e.target.id === "btnToggleMobFilter") {
      ui.mobileFilterOpen = !ui.mobileFilterOpen;
      render();
      return;
    }

    const jumpCodesBtn = e.target.closest("[data-jump-codes]");
    if (jumpCodesBtn) {
      document.querySelectorAll(".modal-backdrop.is-open").forEach(function (m) {
        m.classList.remove("is-open");
      });
      ui.section = "codes";
      ui.codeGroup = jumpCodesBtn.getAttribute("data-jump-codes") || "BOOK_CATEGORY";
      closeAdminDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }

    const codeGrpBtn = e.target.closest("[data-select-code-group]");
    if (codeGrpBtn) {
      ui.codeGroup = codeGrpBtn.getAttribute("data-select-code-group");
      render();
      return;
    }

    if (e.target.id === "btnOpenNewCodeModal") {
      openCodeItemModal(null);
      return;
    }

    const editCodeBtn = e.target.closest("[data-edit-code]");
    if (editCodeBtn) {
      openCodeItemModal(editCodeBtn.getAttribute("data-edit-code"));
      return;
    }

    const toggleCodeAct = e.target.closest("[data-toggle-code-active]");
    if (toggleCodeAct) {
      const codeVal = toggleCodeAct.getAttribute("data-toggle-code-active");
      const grp = Store.getCodeGroup(state, ui.codeGroup);
      if (grp) {
        const item = grp.items.find(function (x) { return x.code === codeVal; });
        if (item) {
          const currentlyActive = item.active !== false;
          const activeCnt = grp.items.filter(function (x) { return x.active !== false; }).length;
          if (currentlyActive && activeCnt <= 1) {
            Store.showToast("최소 1개 이상의 항목은 선택창에 사용중으로 남겨두어야 합니다.");
            return;
          }
          item.active = !currentlyActive;
          Store.saveState(state);
          Store.showToast(item.active ? `[${item.name}] 코드가 선택창에 다시 노출됩니다.` : `[${item.name}] 코드가 선택창에서 숨김 처리되었습니다.`);
          render();
        }
      }
      return;
    }

    const moveCodeBtn = e.target.closest("[data-move-code]");
    if (moveCodeBtn) {
      const codeVal = moveCodeBtn.getAttribute("data-move-code");
      const dir = Number(moveCodeBtn.getAttribute("data-dir")) || 0;
      const grp = Store.getCodeGroup(state, ui.codeGroup);
      if (grp && dir !== 0) {
        grp.items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
        const idx = grp.items.findIndex(function (x) { return x.code === codeVal; });
        const swapIdx = idx + dir;
        if (idx >= 0 && swapIdx >= 0 && swapIdx < grp.items.length) {
          const tmp = grp.items[idx];
          grp.items[idx] = grp.items[swapIdx];
          grp.items[swapIdx] = tmp;
          grp.items.forEach(function (x, i) { x.sortOrder = i + 1; });
          Store.saveState(state);
          render();
        }
      }
      return;
    }

    const delCodeBtn = e.target.closest("[data-delete-code]");
    if (delCodeBtn) {
      const codeVal = delCodeBtn.getAttribute("data-delete-code");
      const grp = Store.getCodeGroup(state, ui.codeGroup);
      if (grp) {
        const usage = getCodeUsageSummary(grp.groupCode, codeVal);
        if (usage.count > 0) {
          Store.showToast(`현재 ${usage.text} 상태인 코드입니다. 기존 데이터 보호를 위해 삭제 대신 [사용중] 스위치를 꺼서 숨김 처리해 주세요.`);
          return;
        }
        if (grp.items.length <= 1) {
          Store.showToast("그룹 내 마지막 코드는 삭제할 수 없습니다.");
          return;
        }
        const target = grp.items.find(function (x) { return x.code === codeVal; });
        grp.items = grp.items.filter(function (x) { return x.code !== codeVal; });
        grp.items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
        grp.items.forEach(function (x, i) { x.sortOrder = i + 1; });
        Store.saveState(state);
        Store.showToast(`[${target ? target.name : codeVal}] 코드 항목이 삭제되었습니다.`);
        render();
      }
      return;
    }

    if (e.target.id === "btnApplyBookFilter") {
      ui.bookKeyword = document.getElementById("admBookSearchInput").value;
      const catSel = document.getElementById("admBookCatSelect");
      if (catSel) ui.bookCat = catSel.value;
      const typeSel = document.getElementById("admBookTypeSelect");
      if (typeSel) ui.bookType = typeSel.value;
      render();
      return;
    }

    if (e.target.id === "btnApplyMemberFilter") {
      ui.memberKeyword = document.getElementById("admMemberSearchInput").value;
      render();
      return;
    }

    const stockBtn = e.target.closest("[data-stock-add]");
    if (stockBtn) {
      const bId = stockBtn.getAttribute("data-book-id");
      const bk = state.books.find(function (x) { return x.id === bId; });
      if (bk) {
        bk.stockQuantity += Number(stockBtn.getAttribute("data-stock-add"));
        if (bk.stockQuantity > 0) {
          bk.saleStatus = "ON_SALE";
          bk.shippingEta = "오늘 발송 예정";
        }
        Store.saveState(state);
        Store.showToast(`『${bk.title}』 재고가 10권 추가 입고되었습니다.`);
        render();
      }
      return;
    }

    const mdBtn = e.target.closest("[data-toggle-mdpick]");
    if (mdBtn) {
      const bId = mdBtn.getAttribute("data-toggle-mdpick");
      const bk = state.books.find(function (x) { return x.id === bId; });
      if (bk) {
        bk.mdPick = !bk.mdPick;
        Store.saveState(state);
        Store.showToast(bk.mdPick ? "학당 추천 도서로 지정되었습니다." : "일반 도서로 변경되었습니다.");
        render();
      }
      return;
    }

    const soldOutBtn = e.target.closest("[data-toggle-soldout]");
    if (soldOutBtn) {
      const bId = soldOutBtn.getAttribute("data-toggle-soldout");
      const bk = state.books.find(function (x) { return x.id === bId; });
      if (bk) {
        if (bk.saleStatus === "OUT_OF_STOCK") {
          bk.saleStatus = "ON_SALE";
          bk.stockQuantity = Math.max(10, bk.stockQuantity);
          bk.shippingEta = "오늘 발송 예정";
          Store.showToast("판매가 재개되었습니다.");
        } else {
          bk.saleStatus = "OUT_OF_STOCK";
          bk.stockQuantity = 0;
          bk.shippingEta = "일시품절";
          Store.showToast("일시품절 상태로 전환되었습니다.");
        }
        Store.saveState(state);
        render();
      }
      return;
    }

    const ordFilterBtn = e.target.closest("[data-ord-filter]");
    if (ordFilterBtn) {
      ui.orderFilter = ordFilterBtn.getAttribute("data-ord-filter");
      render();
      return;
    }

    const wbBtn = e.target.closest("[data-open-waybill]");
    if (wbBtn) {
      openWaybillModal(wbBtn.getAttribute("data-open-waybill"));
      return;
    }

    const memBtn = e.target.closest("[data-open-member]");
    if (memBtn) {
      openMemberDetailModal(memBtn.getAttribute("data-open-member"));
      return;
    }

    const qnaFilterBtn = e.target.closest("[data-qna-filter]");
    if (qnaFilterBtn) {
      ui.qnaFilter = qnaFilterBtn.getAttribute("data-qna-filter");
      render();
      return;
    }

    const qnaReplyBtn = e.target.closest("[data-open-qna-reply]");
    if (qnaReplyBtn) {
      openQnaReplyModal(qnaReplyBtn.getAttribute("data-open-qna-reply"));
      return;
    }

    const boardTabBtn = e.target.closest("[data-board-tab]");
    if (boardTabBtn) {
      ui.boardTab = boardTabBtn.getAttribute("data-board-tab");
      render();
      return;
    }

    const toggleNoticeVis = e.target.closest("[data-toggle-notice-vis]");
    if (toggleNoticeVis) {
      const id = toggleNoticeVis.getAttribute("data-toggle-notice-vis");
      const nt = state.notices.find(function (x) { return x.id === id; });
      if (nt) {
        nt.visible = !nt.visible;
        Store.saveState(state);
        render();
      }
      return;
    }

    const editNotice = e.target.closest("[data-edit-notice]");
    if (editNotice) {
      openEditNoticeModal(editNotice.getAttribute("data-edit-notice"));
      return;
    }

    const delNotice = e.target.closest("[data-delete-notice]");
    if (delNotice) {
      const id = delNotice.getAttribute("data-delete-notice");
      state.notices = state.notices.filter(function (x) { return x.id !== id; });
      Store.saveState(state);
      Store.showToast("공지사항이 삭제되었습니다.");
      render();
      return;
    }

    const editFaq = e.target.closest("[data-edit-faq]");
    if (editFaq) {
      openEditFaqModal(editFaq.getAttribute("data-edit-faq"));
      return;
    }

    const toggleFaqVis = e.target.closest("[data-toggle-faq-vis]");
    if (toggleFaqVis) {
      const id = toggleFaqVis.getAttribute("data-toggle-faq-vis");
      const fq = state.faqs.find(function (x) { return x.id === id; });
      if (fq) {
        fq.visible = !fq.visible;
        Store.saveState(state);
        render();
      }
      return;
    }

    const delFaq = e.target.closest("[data-delete-faq]");
    if (delFaq) {
      const id = delFaq.getAttribute("data-delete-faq");
      state.faqs = state.faqs.filter(function (x) { return x.id !== id; });
      Store.saveState(state);
      Store.showToast("FAQ 항목이 삭제되었습니다.");
      render();
      return;
    }

    const bestRevBtn = e.target.closest("[data-toggle-best-review]");
    if (bestRevBtn) {
      const rId = bestRevBtn.getAttribute("data-toggle-best-review");
      const rv = state.reviews.find(function (r) { return r.id === rId; });
      if (rv) {
        rv.isBest = !rv.isBest;
        Store.saveState(state);
        Store.showToast(rv.isBest ? "베스트 후기로 선정되었습니다." : "베스트 후기에서 해제되었습니다.");
        render();
      }
      return;
    }

    const revBtn = e.target.closest("[data-toggle-review]");
    if (revBtn) {
      const rId = revBtn.getAttribute("data-toggle-review");
      const rv = state.reviews.find(function (r) { return r.id === rId; });
      if (rv) {
        rv.visible = !rv.visible;
        Store.saveState(state);
        Store.showToast(rv.visible ? "후기가 다시 공개되었습니다." : "후기가 숨김 처리되었습니다.");
        render();
      }
      return;
    }

    const toggleBanner = e.target.closest("[data-toggle-banner]");
    if (toggleBanner) {
      const bId = toggleBanner.getAttribute("data-toggle-banner");
      const bn = state.banners.find(function (x) { return x.id === bId; });
      if (bn) {
        bn.active = !bn.active;
        Store.saveState(state);
        Store.showToast(bn.active ? "배너가 쇼핑몰 화면에 노출됩니다." : "배너가 숨김 처리되었습니다.");
        render();
      }
      return;
    }

    const editBanner = e.target.closest("[data-edit-banner]");
    if (editBanner) {
      openBannerEditModal(editBanner.getAttribute("data-edit-banner"));
      return;
    }

    const setTabBtn = e.target.closest("[data-settings-tab]");
    if (setTabBtn) {
      ui.settingsTab = setTabBtn.getAttribute("data-settings-tab");
      render();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "admBookCatSelect") {
      ui.bookCat = e.target.value;
      render();
      return;
    }
    if (e.target.id === "admBookTypeSelect") {
      ui.bookType = e.target.value;
      render();
      return;
    }
    if (e.target.id === "wbCarrier") {
      const code = e.target.value.split("|")[0];
      const info = Store.getCarrierInfo(code, state);
      const linkEl = document.getElementById("wbCarrierUrlPreview");
      if (linkEl) {
        linkEl.href = info.trackingUrl;
        linkEl.textContent = info.trackingUrl;
      }
      const noInput = document.getElementById("wbTrackingNo");
      if (noInput && noInput.getAttribute("data-is-editing") !== "1") {
        noInput.value = (info.samplePrefix || "6482") + "-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000);
      }
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id === "waybillIssueForm") {
      e.preventDefault();
      const ord = state.orders.find(function (o) { return o.orderNo === ui.activeWaybillOrderNo; });
      if (!ord) return;
      const carrierParts = document.getElementById("wbCarrier").value.split("|");
      const trackingNo = document.getElementById("wbTrackingNo").value.trim();
      if (!trackingNo) return;

      ord.carrierCode = carrierParts[0];
      ord.carrierName = carrierParts[1];
      ord.trackingNumber = trackingNo;
      ord.orderStatus = "SHIPPED";
      ord.shipmentStatus = "WAYBILL_ISSUED";
      if (!ord.shippedAt) {
        ord.shippedAt = "2026-11-12 방금 전";
      }

      Store.saveState(state);
      document.getElementById("waybillModal").classList.remove("is-open");
      render();
      Store.showToast(`${carrierParts[1]} 운송장(${trackingNo})이 등록되었습니다! 고객 화면에 택배사 조회 주소가 함께 안내됩니다.`);
    } else if (e.target.id === "memberEditForm") {
      e.preventDefault();
      const m = state.members.find(function (x) { return x.id === ui.activeMemberId; });
      if (!m) return;
      m.memberGrade = document.getElementById("mdGrade").value;
      m.points = Number(document.getElementById("mdPoints").value) || 0;
      m.adminMemo = document.getElementById("mdMemo").value.trim();
      Store.saveState(state);
      document.getElementById("memberDetailModal").classList.remove("is-open");
      render();
      Store.showToast(`${m.name} 회원의 정보 및 적립금이 저장되었습니다.`);
    } else if (e.target.id === "qnaReplyForm") {
      e.preventDefault();
      const qa = state.qnas.find(function (x) { return x.id === ui.activeQnaId; });
      if (!qa) return;
      qa.answer = document.getElementById("qnaAnswerInput").value.trim();
      qa.status = "ANSWERED";
      qa.answeredAt = "2026-11-12 방금 전";
      Store.saveState(state);
      document.getElementById("qnaReplyModal").classList.remove("is-open");
      render();
      Store.showToast("1:1 문의 답변이 등록되었습니다! 쇼핑몰 Q&A 게시판에서도 바로 확인됩니다.");
    } else if (e.target.id === "boardPostForm") {
      e.preventDefault();
      const cat = document.getElementById("npCategory").value;
      const title = document.getElementById("npTitle").value.trim();
      const content = document.getElementById("npContent").value.trim();

      if (ui.boardTab === "notice") {
        const pinned = document.getElementById("npPinned").checked;
        if (ui.editingNoticeId) {
          const nt = state.notices.find(function (x) { return x.id === ui.editingNoticeId; });
          if (nt) {
            nt.category = cat;
            nt.pinned = pinned;
            nt.title = title;
            nt.content = content;
          }
          Store.showToast("공지사항이 수정되었습니다.");
          ui.editingNoticeId = null;
        } else {
          state.notices.unshift({
            id: "NT-" + Date.now(),
            category: cat,
            pinned: pinned,
            visible: true,
            title: title,
            createdAt: new Date().toISOString().slice(0, 10),
            views: 1,
            content: content
          });
          Store.showToast("새 공지사항이 등록되었습니다.");
        }
      } else {
        if (ui.editingFaqId) {
          const fq = state.faqs.find(function (x) { return x.id === ui.editingFaqId; });
          if (fq) {
            fq.category = cat;
            fq.question = title;
            fq.answer = content;
          }
          Store.showToast("자주 묻는 질문(FAQ)이 수정되었습니다.");
          ui.editingFaqId = null;
        } else {
          state.faqs.unshift({
            id: "FQ-" + Date.now(),
            category: cat,
            visible: true,
            question: title,
            answer: content
          });
          Store.showToast("새 자주 묻는 질문(FAQ)이 등록되었습니다.");
        }
      }
      Store.saveState(state);
      document.getElementById("boardPostModal").classList.remove("is-open");
      render();
    } else if (e.target.id === "bannerEditForm") {
      e.preventDefault();
      const bn = state.banners.find(function (x) { return x.id === ui.activeBannerId; });
      if (!bn) return;
      const urlInput = document.getElementById("bnImageUrl");
      bn.imageUrl = urlInput ? urlInput.value.trim() : (bn.imageUrl || "");
      bn.eyebrow = document.getElementById("bnEyebrow").value.trim();
      bn.title = document.getElementById("bnTitle").value.trim();
      bn.subtitle = document.getElementById("bnSubtitle").value.trim();
      bn.buttonText = document.getElementById("bnBtnText").value.trim();
      bn.period = document.getElementById("bnPeriod").value.trim();
      Store.saveState(state);
      document.getElementById("bannerEditModal").classList.remove("is-open");
      render();
      Store.showToast("배너 이미지와 문구가 수정되었습니다! 쇼핑몰 홈에서 변경된 배너를 확인하실 수 있습니다.");
    } else if (e.target.id === "codeItemForm") {
      e.preventDefault();
      const grp = Store.getCodeGroup(state, ui.codeGroup);
      if (!grp) return;

      const rawCode = document.getElementById("ciCode").value.trim();
      const nameVal = document.getElementById("ciName").value.trim();
      const desiredOrder = Math.max(1, Number(document.getElementById("ciSortOrder").value) || (grp.items.length + 1));
      const descVal = document.getElementById("ciDesc").value.trim();
      const activeVal = document.getElementById("ciActive").checked;

      if (!rawCode || !nameVal) {
        Store.showToast("관리 코드와 화면 표시 이름을 모두 입력해 주세요.");
        return;
      }

      const hanjaEl = document.getElementById("ciHanja");
      const urlEl = document.getElementById("ciTrackingUrl");
      const phoneEl = document.getElementById("ciCsPhone");
      const prefixEl = document.getElementById("ciSamplePrefix");

      if (ui.editingCodeMode === "create") {
        const dup = grp.items.some(function (x) {
          return x.code.toLowerCase() === rawCode.toLowerCase();
        });
        if (dup) {
          Store.showToast(`이미 [${rawCode}] 관리 코드가 등록되어 있습니다. 다른 코드값을 입력해 주세요.`);
          return;
        }
        const newItem = {
          code: rawCode,
          name: nameVal,
          sortOrder: desiredOrder,
          active: activeVal,
          desc: descVal
        };
        if (hanjaEl) newItem.hanja = hanjaEl.value.trim() || nameVal.slice(0, 2);
        if (urlEl) {
          newItem.trackingUrl = urlEl.value.trim();
          newItem.csPhone = phoneEl ? phoneEl.value.trim() || "-" : "-";
          newItem.samplePrefix = prefixEl ? prefixEl.value.trim() || "6482" : "6482";
        }
        grp.items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
        const insertIdx = Math.min(grp.items.length, Math.max(0, desiredOrder - 1));
        grp.items.splice(insertIdx, 0, newItem);
        grp.items.forEach(function (x, i) { x.sortOrder = i + 1; });
        Store.showToast(`[${grp.groupName}]에 새 코드 『${nameVal}』 항목이 추가되었습니다!`);
      } else {
        const target = grp.items.find(function (x) { return x.code === ui.editingCodeOrigin; });
        if (!target) return;
        const activeOthers = grp.items.filter(function (x) { return x.code !== target.code && x.active !== false; }).length;
        if (!activeVal && activeOthers === 0) {
          Store.showToast("최소 1개 이상의 항목은 선택창에 사용중으로 남겨두어야 합니다.");
          return;
        }
        target.name = nameVal;
        target.desc = descVal;
        target.active = activeVal;
        if (hanjaEl) target.hanja = hanjaEl.value.trim();
        if (urlEl) {
          target.trackingUrl = urlEl.value.trim();
          if (phoneEl) target.csPhone = phoneEl.value.trim() || "-";
          if (prefixEl) target.samplePrefix = prefixEl.value.trim() || "6482";
        }

        grp.items = grp.items.filter(function (x) { return x.code !== target.code; });
        grp.items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
        const moveIdx = Math.min(grp.items.length, Math.max(0, desiredOrder - 1));
        grp.items.splice(moveIdx, 0, target);
        grp.items.forEach(function (x, i) { x.sortOrder = i + 1; });

        if (grp.groupCode === "CARRIER_CODE") {
          state.orders.forEach(function (o) {
            if (o.carrierCode === target.code) {
              o.carrierName = target.name;
            }
          });
        }
        Store.showToast(`『${nameVal}』 코드 정보가 수정되어 연결된 선택창과 화면에 즉시 반영되었습니다.`);
      }

      state.books = Store.normalizeBooks(state.books, state.codeGroups);
      Store.saveState(state);
      document.getElementById("codeItemModal").classList.remove("is-open");
      render();
    } else if (e.target.id === "siteBasicConfigForm") {
      e.preventDefault();
      state.siteConfig.mallName = document.getElementById("cfgMallName").value.trim();
      state.siteConfig.ceoName = document.getElementById("cfgCeoName").value.trim();
      state.siteConfig.csPhone = document.getElementById("cfgCsPhone").value.trim();
      state.siteConfig.csHours = document.getElementById("cfgCsHours").value.trim();
      state.siteConfig.bankAccount = document.getElementById("cfgBankAccount").value.trim();
      state.siteConfig.address = document.getElementById("cfgAddress").value.trim();
      state.siteConfig.freeShippingThreshold = Number(document.getElementById("cfgFreeThreshold").value) || 50000;
      state.siteConfig.baseShippingFee = Number(document.getElementById("cfgBaseFee").value) || 3500;
      state.siteConfig.cutoffNotice = document.getElementById("cfgCutoff").value.trim();
      Store.saveState(state);
      render();
      Store.showToast("쇼핑몰 기본정보 및 배송비 설정이 저장되었습니다.");
    } else if (e.target.id === "siteTermEditForm") {
      e.preventDefault();
      const term = state.terms[ui.settingsTab];
      if (!term) return;
      term.title = document.getElementById("termTitleInput").value.trim();
      term.content = document.getElementById("termContentInput").value;
      term.updatedAt = "2026-11-12";
      Store.saveState(state);
      render();
      Store.showToast(`『${term.title}』 내용이 저장되었습니다! 회원가입 및 하단 약관에 즉시 반영됩니다.`);
    }
  });

  render();

  try {
    const flash = window.sessionStorage.getItem("HYUNDONG_ADMIN_FLASH");
    if (flash) {
      window.sessionStorage.removeItem("HYUNDONG_ADMIN_FLASH");
      Store.showToast(flash);
    }
  } catch (e) {
    // ignore sessionStorage error
  }
})();

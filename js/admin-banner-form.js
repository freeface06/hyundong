/* ==========================================================================
   배너 상세 수정 전용 페이지 컨트롤러 (js/admin-banner-form.js)
   배너 이미지 파일 업로드/URL 입력 + 실시간 카드 미리보기 + 쇼핑몰 실시간 연동
   ========================================================================== */

(function () {
  const Store = window.HyundongStore || window.Store;
  let state = Store.loadState();

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");
  let activeBanner =
    state.banners.find(function (b) { return b.id === requestedId; }) ||
    state.banners[0];

  function syncSidebarCounts() {
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
  }

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

  const fileInput = document.getElementById("bnImageFileInput");
  const urlInput = document.getElementById("bnImageUrl");
  const previewImg = document.getElementById("bnImagePreview");
  const previewEmpty = document.getElementById("bnImagePreviewEmpty");
  const clearBtn = document.getElementById("btnClearBannerImg");
  const eyebrowInput = document.getElementById("bnEyebrow");
  const periodInput = document.getElementById("bnPeriod");
  const titleInput = document.getElementById("bnTitle");
  const subtitleInput = document.getElementById("bnSubtitle");
  const btnTextInput = document.getElementById("bnBtnText");
  const targetBookSel = document.getElementById("bnTargetBookId");
  const activeChk = document.getElementById("bnActive");
  const liveCardEl = document.getElementById("liveBannerCardPreview");
  const slotTabsEl = document.getElementById("bannerSlotTabs");

  function populateTargetBooks(selectedBookId) {
    const opts = ['<option value="">전체 도서 목록 화면으로 이동</option>'].concat(
      state.books.map(function (b) {
        const sel = b.id === selectedBookId ? "selected" : "";
        return `<option value="${Store.escapeHtml(b.id)}" ${sel}>[${Store.escapeHtml(b.id)}] ${Store.escapeHtml(b.title)}</option>`;
      })
    );
    targetBookSel.innerHTML = opts.join("");
  }

  function renderSlotTabs() {
    slotTabsEl.innerHTML = state.banners
      .map(function (bn) {
        const isCurrent = activeBanner && bn.id === activeBanner.id;
        return `
          <a href="./admin-banner-edit.html?id=${encodeURIComponent(bn.id)}" class="chip-btn ${isCurrent ? "is-active" : ""}" style="text-decoration:none;">
            ${Store.escapeHtml(bn.positionLabel)}
          </a>
        `;
      })
      .join("");
  }

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
    renderLiveBannerCard();
  }

  function renderLiveBannerCard() {
    const eyebrow = eyebrowInput.value.trim();
    const title = titleInput.value.trim() || "(배너 제목을 입력해 주세요)";
    const subtitle = subtitleInput.value.trim();
    const btnText = btnTextInput.value.trim();
    const imgSrc = urlInput.value.trim();
    const isOn = activeChk.checked;

    liveCardEl.style.opacity = isOn ? "1" : "0.56";
    liveCardEl.innerHTML = `
      ${eyebrow ? `<div style="margin-bottom:8px;"><span class="badge badge-seal">${Store.escapeHtml(eyebrow)}</span></div>` : ""}
      <h4 style="margin:0 0 6px; font-family:var(--font-serif); font-size:1.15rem; color:var(--color-brand-900); line-height:1.4;">
        ${Store.escapeHtml(title)}
      </h4>
      ${subtitle ? `<p style="margin:0 0 12px; font-size:0.88rem; color:var(--color-text-secondary); line-height:1.6;">${Store.escapeHtml(subtitle)}</p>` : ""}
      ${imgSrc ? `
        <div style="margin:12px 0; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--color-border); max-width:520px; background:#ffffff;">
          <img src="${Store.escapeHtml(imgSrc)}" alt="미리보기 이미지" style="width:100%; max-height:190px; object-fit:cover; display:block;" onerror="this.style.display='none';" />
        </div>
      ` : ""}
      ${btnText ? `<span class="btn btn-sm btn-primary" style="pointer-events:none; min-height:34px;">${Store.escapeHtml(btnText)}</span>` : ""}
    `;
  }

  function loadBannerIntoForm(bn) {
    if (!bn) return;
    document.getElementById("bannerFormPageHeading").textContent = bn.positionLabel + " 수정";
    document.getElementById("bannerGuideHeading").textContent = bn.positionLabel + " 수정";
    document.title = bn.positionLabel + " 수정 — 현동서재 관리자 센터";

    activeChk.checked = bn.active !== false;
    eyebrowInput.value = bn.eyebrow || "";
    periodInput.value = bn.period || "";
    titleInput.value = bn.title || "";
    subtitleInput.value = bn.subtitle || "";
    btnTextInput.value = bn.buttonText || "";
    urlInput.value = bn.imageUrl || "";
    populateTargetBooks(bn.targetBookId || "");
    renderSlotTabs();
    setPreviewSource(bn.imageUrl || "");
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const dataUrl = evt.target.result;
      urlInput.value = dataUrl;
      setPreviewSource(dataUrl);
    };
    reader.readAsDataURL(file);
  });

  urlInput.addEventListener("input", function () {
    setPreviewSource(urlInput.value);
  });

  previewImg.addEventListener("error", function () {
    // URL 깨짐 시에도 페이지와 입력 상태가 안전하게 유지되도록 처리
    previewImg.dataset.loadError = "1";
  });

  previewImg.addEventListener("load", function () {
    delete previewImg.dataset.loadError;
  });

  clearBtn.addEventListener("click", function () {
    fileInput.value = "";
    urlInput.value = "";
    setPreviewSource("");
  });

  [eyebrowInput, periodInput, titleInput, subtitleInput, btnTextInput].forEach(function (el) {
    el.addEventListener("input", renderLiveBannerCard);
  });
  activeChk.addEventListener("change", renderLiveBannerCard);

  document.getElementById("bannerEditPageForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!activeBanner) return;

    activeBanner.active = activeChk.checked;
    activeBanner.imageUrl = urlInput.value.trim();
    activeBanner.eyebrow = eyebrowInput.value.trim();
    activeBanner.period = periodInput.value.trim();
    activeBanner.title = titleInput.value.trim();
    activeBanner.subtitle = subtitleInput.value.trim();
    activeBanner.buttonText = btnTextInput.value.trim();
    activeBanner.targetBookId = targetBookSel.value;

    Store.saveState(state);
    try {
      window.sessionStorage.setItem(
        "HYUNDONG_ADMIN_FLASH",
        `[${activeBanner.positionLabel}] 변경 내용이 저장되어 쇼핑몰에 반영되었습니다.`
      );
    } catch (err) {
      // ignore sessionStorage error
    }
    window.location.href = "./admin.html?sec=banners";
  });

  syncSidebarCounts();
  loadBannerIntoForm(activeBanner);
})();

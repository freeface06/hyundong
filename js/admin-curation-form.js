/* ==========================================================================
   현동서재 대문 큐레이션 등록·수정 전용 페이지 컨트롤러 (js/admin-curation-form.js)
   ========================================================================== */

(function () {
  const Store = window.HyundongStore || window.Store;
  let state = Store.loadState();

  const BG_TONES = [
    { color: "#1b1917", label: "묵향 차콜" },
    { color: "#1f1c19", label: "호두나무 다크" },
    { color: "#1d1a17", label: "고서 에스프레소" },
    { color: "#191b1a", label: "송연 먹빛" },
    { color: "#201c19", label: "다실 브라운" }
  ];

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id") || "";
  const sortedCurations = (Array.isArray(state.heroCurations) ? state.heroCurations : [])
    .slice()
    .sort(function (a, b) { return Number(a.sortOrder || 0) - Number(b.sortOrder || 0); });
  const existingCuration = editId
    ? sortedCurations.find(function (c) { return c.id === editId; })
    : null;
  const isEditMode = Boolean(existingCuration);

  // 1. 사이드바 뱃지 동기화
  const pendingShip = (state.orders || []).filter(function (o) {
    return !o.trackingNumber && o.orderStatus !== "CANCELED";
  }).length;
  const pendingQna = (state.qnas || []).filter(function (q) {
    return q.status === "WAITING";
  }).length;

  const navBookEl = document.getElementById("navBookCount");
  const navShipEl = document.getElementById("navPendingShipCount");
  const navMemEl = document.getElementById("navMemberCount");
  const navQnaEl = document.getElementById("navPendingQnaCount");
  if (navBookEl) navBookEl.textContent = (state.books || []).length;
  if (navShipEl) navShipEl.textContent = pendingShip;
  if (navMemEl) navMemEl.textContent = (state.members || []).length;
  if (navQnaEl) navQnaEl.textContent = pendingQna;
  if (state.adminSession && state.adminSession.adminName) {
    const adminNameEl = document.getElementById("sidebarAdminName");
    if (adminNameEl) adminNameEl.textContent = state.adminSession.adminName;
  }

  // 모바일 드로어 토글
  const sidebarEl = document.getElementById("adminSidebar");
  const backdropEl = document.getElementById("adminDrawerBackdrop");
  function openDrawer() {
    if (sidebarEl) sidebarEl.classList.add("is-open");
    if (backdropEl) backdropEl.classList.add("is-open");
  }
  function closeDrawer() {
    if (sidebarEl) sidebarEl.classList.remove("is-open");
    if (backdropEl) backdropEl.classList.remove("is-open");
  }
  const btnOpen = document.getElementById("btnOpenAdminDrawer");
  const btnClose = document.getElementById("btnCloseAdminDrawer");
  const btnMobMore = document.getElementById("btnMobMoreMenu");
  if (btnOpen) btnOpen.addEventListener("click", openDrawer);
  if (btnClose) btnClose.addEventListener("click", closeDrawer);
  if (backdropEl) backdropEl.addEventListener("click", closeDrawer);
  if (btnMobMore) btnMobMore.addEventListener("click", openDrawer);

  // 2. 폼 요소 바인딩
  const pageHeadingEl = document.getElementById("curationFormPageHeading");
  const guideHeadingEl = document.getElementById("curationGuideHeading");
  const slotTabsEl = document.getElementById("curationSlotTabs");

  const activeInput = document.getElementById("curActive");
  const fileInput = document.getElementById("curImageFileInput");
  const imageUrlInput = document.getElementById("curImageUrl");
  const presetGalleryEl = document.getElementById("curPresetGallery");
  const tabTitleInput = document.getElementById("curTabTitle");
  const bgSwatchesEl = document.getElementById("curBgSwatches");
  const bgColorInput = document.getElementById("curBgColor");
  const titleInput = document.getElementById("curTitle");
  const subtitleInput = document.getElementById("curSubtitle");
  const targetTypeSelect = document.getElementById("curTargetType");
  const targetBookField = document.getElementById("curTargetBookField");
  const targetBookSelect = document.getElementById("curTargetBookId");
  const targetUrlField = document.getElementById("curTargetUrlField");
  const linkUrlInput = document.getElementById("curLinkUrl");
  const submitBtn = document.getElementById("btnSubmitCurationForm");

  const liveStageEl = document.getElementById("liveCurationStagePreview");
  const liveTitleEl = document.getElementById("livePreviewTitle");
  const liveSubtitleEl = document.getElementById("livePreviewSubtitle");
  const liveImgEl = document.getElementById("livePreviewImage");
  const liveTabChipEl = document.getElementById("livePreviewTabChip");

  // 상단 빠른 전환 탭 렌더링
  if (slotTabsEl) {
    slotTabsEl.innerHTML = sortedCurations.map(function (c, i) {
      const isCur = isEditMode && c.id === existingCuration.id;
      return `<a href="./admin-curation-edit.html?id=${encodeURIComponent(c.id)}" class="chip-btn ${isCur ? "is-active" : ""}">0${i + 1}. ${Store.escapeHtml(c.tabTitle || "큐레이션")}</a>`;
    }).join("") + `<a href="./admin-curation-edit.html" class="chip-btn ${!isEditMode ? "is-active" : ""}">+ 새 큐레이션 추가</a>`;
  }

  // 연결 도서 셀렉트 채우기
  if (targetBookSelect) {
    targetBookSelect.innerHTML = (state.books || []).map(function (b) {
      return `<option value="${Store.escapeHtml(b.id)}">${Store.escapeHtml(b.title)} (${Store.formatKRW(b.salePrice)})</option>`;
    }).join("");
  }

  // 기본 제작 이미지 5종 프리셋 렌더링
  const presets = Array.isArray(Store.PRESET_CURATION_IMAGES) ? Store.PRESET_CURATION_IMAGES : [];
  function renderPresetGallery() {
    if (!presetGalleryEl) return;
    const curVal = (imageUrlInput.value || "").trim();
    presetGalleryEl.innerHTML = presets.map(function (p) {
      const sel = curVal === p.url;
      return `
        <button type="button" class="curation-preset-btn ${sel ? "is-selected" : ""}" data-preset-url="${Store.escapeHtml(p.url)}">
          <img src="${Store.escapeHtml(p.url)}" alt="${Store.escapeHtml(p.label)}" />
          <span>${Store.escapeHtml(p.label)}</span>
        </button>
      `;
    }).join("");
  }

  // 다크 배경 톤 스와치 렌더링
  function renderBgSwatches() {
    if (!bgSwatchesEl) return;
    const curBg = (bgColorInput.value || "#1b1917").trim();
    bgSwatchesEl.innerHTML = BG_TONES.map(function (t) {
      const sel = curBg.toLowerCase() === t.color.toLowerCase();
      return `
        <button type="button" class="curation-bg-swatch ${sel ? "is-selected" : ""}" data-bg-tone="${t.color}">
          <span class="curation-bg-dot" style="background:${t.color};"></span>
          <span>${Store.escapeHtml(t.label)}</span>
        </button>
      `;
    }).join("");
  }

  function syncTargetTypeFields() {
    const isUrl = targetTypeSelect.value === "URL";
    if (targetBookField) targetBookField.style.display = isUrl ? "none" : "";
    if (targetUrlField) targetUrlField.style.display = isUrl ? "" : "none";
  }

  function updateLivePreview() {
    const rawTitle = titleInput.value.trim() || "대문 메인 문구를 입력해 주세요";
    const linesHtml = rawTitle
      .split(/\r?\n/)
      .map(function (l) { return Store.escapeHtml(l.trim()); })
      .filter(Boolean)
      .join("<br/>");
    if (liveTitleEl) liveTitleEl.innerHTML = linesHtml;

    const sub = subtitleInput.value.trim();
    if (liveSubtitleEl) {
      liveSubtitleEl.textContent = sub;
      liveSubtitleEl.style.display = sub ? "" : "none";
    }

    const bg = bgColorInput.value || "#1b1917";
    if (liveStageEl) liveStageEl.style.background = bg;

    const imgSrc = imageUrlInput.value.trim() || "./images/curation-01.webp";
    if (liveImgEl) {
      liveImgEl.src = imgSrc;
    }

    if (liveTabChipEl) {
      liveTabChipEl.textContent = tabTitleInput.value.trim() || "하단 탭 이름";
    }
    renderPresetGallery();
    renderBgSwatches();
  }

  if (liveImgEl) {
    liveImgEl.addEventListener("error", function () {
      if (liveImgEl.getAttribute("src") !== "./images/curation-01.webp") {
        liveImgEl.setAttribute("src", "./images/curation-01.webp");
      }
    });
  }

  // 초기값 세팅 (수정 vs 신규)
  if (isEditMode) {
    if (pageHeadingEl) pageHeadingEl.textContent = "대문 큐레이션 수정";
    if (guideHeadingEl) guideHeadingEl.textContent = `[${existingCuration.tabTitle}] 큐레이션 수정`;
    if (submitBtn) submitBtn.textContent = "큐레이션 변경 저장";

    activeInput.checked = existingCuration.active !== false;
    imageUrlInput.value = existingCuration.imageUrl || "./images/curation-01.webp";
    tabTitleInput.value = existingCuration.tabTitle || "";
    bgColorInput.value = existingCuration.bgColor || "#1b1917";
    titleInput.value = existingCuration.title || "";
    subtitleInput.value = existingCuration.subtitle || "";
    targetTypeSelect.value = existingCuration.targetType === "URL" ? "URL" : "BOOK";
    if (existingCuration.targetBookId && targetBookSelect) {
      targetBookSelect.value = existingCuration.targetBookId;
    }
    linkUrlInput.value = existingCuration.linkUrl || "./index.html?view=catalog";
  } else {
    if (pageHeadingEl) pageHeadingEl.textContent = "새 대문 큐레이션 추가";
    if (guideHeadingEl) guideHeadingEl.textContent = "새 대문 큐레이션 등록";
    if (submitBtn) submitBtn.textContent = "새 큐레이션 등록하기";

    activeInput.checked = true;
    imageUrlInput.value = "./images/curation-01.webp";
    tabTitleInput.value = "";
    bgColorInput.value = "#1b1917";
    titleInput.value = "";
    subtitleInput.value = "";
    targetTypeSelect.value = "BOOK";
    linkUrlInput.value = "./index.html?view=catalog";
  }

  syncTargetTypeFields();
  updateLivePreview();

  // 이벤트 리스너
  [tabTitleInput, titleInput, subtitleInput, imageUrlInput].forEach(function (el) {
    if (el) el.addEventListener("input", updateLivePreview);
  });

  if (targetTypeSelect) {
    targetTypeSelect.addEventListener("change", syncTargetTypeFields);
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        Store.showToast("이미지 용량은 4MB 이하로 업로드해 주세요.");
        fileInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        const dataUrl = String((ev.target && ev.target.result) || "");
        if (dataUrl.indexOf("data:image/") === 0) {
          imageUrlInput.value = dataUrl;
          updateLivePreview();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener("click", function (e) {
    const presetBtn = e.target.closest("[data-preset-url]");
    if (presetBtn) {
      imageUrlInput.value = presetBtn.getAttribute("data-preset-url") || "./images/curation-01.webp";
      if (fileInput) fileInput.value = "";
      updateLivePreview();
      return;
    }

    const bgBtn = e.target.closest("[data-bg-tone]");
    if (bgBtn) {
      bgColorInput.value = bgBtn.getAttribute("data-bg-tone") || "#1b1917";
      updateLivePreview();
    }
  });

  const formEl = document.getElementById("curationEditPageForm");
  if (formEl) {
    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      const tabTitle = tabTitleInput.value.trim();
      const title = titleInput.value.trim();
      const subtitle = subtitleInput.value.trim();
      const imageUrl = imageUrlInput.value.trim() || "./images/curation-01.webp";
      const bgColor = bgColorInput.value.trim() || "#1b1917";
      const targetType = targetTypeSelect.value === "URL" ? "URL" : "BOOK";
      const targetBookId = targetType === "BOOK" ? (targetBookSelect.value || "BK-001") : "";
      const linkUrl = targetType === "URL" ? (linkUrlInput.value.trim() || "./index.html?view=catalog") : "";

      if (!tabTitle || !title) {
        Store.showToast("하단 탭 이름과 대문 메인 문구를 입력해 주세요.");
        return;
      }

      state = Store.loadState();
      if (!Array.isArray(state.heroCurations)) {
        state.heroCurations = [];
      }

      if (isEditMode) {
        const target = state.heroCurations.find(function (c) { return c.id === existingCuration.id; });
        if (target) {
          target.tabTitle = tabTitle;
          target.title = title;
          target.subtitle = subtitle;
          target.imageUrl = imageUrl;
          target.bgColor = bgColor;
          target.targetType = targetType;
          target.targetBookId = targetBookId;
          target.linkUrl = linkUrl;
          target.active = Boolean(activeInput.checked);
        }
      } else {
        const nextNum = state.heroCurations.length + 1;
        const newId = "CUR-" + Date.now().toString(36).toUpperCase().slice(-5);
        state.heroCurations.push({
          id: newId,
          tabTitle: tabTitle,
          title: title,
          subtitle: subtitle,
          imageUrl: imageUrl,
          bgColor: bgColor,
          targetType: targetType,
          targetBookId: targetBookId,
          linkUrl: linkUrl,
          active: Boolean(activeInput.checked),
          sortOrder: nextNum
        });
      }

      Store.saveState(state);
      Store.showToast(isEditMode ? "대문 큐레이션이 저장되었습니다." : "새 대문 큐레이션이 등록되었습니다.");
      window.location.href = "./admin.html?sec=hero";
    });
  }
})();

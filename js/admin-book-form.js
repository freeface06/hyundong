/* ==========================================================================
   신규 도서 등록 및 기존 도서 수정 전용 페이지 컨트롤러 (js/admin-book-form.js)
   실제 책 표지 이미지 업로드/샘플 선택 + WYSIWYG 웹 에디터 + 쇼핑몰 실시간 연동
   ========================================================================== */

(function () {
  const Store = window.HyundongStore;
  let state = Store.loadState();

  const params = new URLSearchParams(window.location.search);
  const editBookId = params.get("id");
  const editingBook = editBookId
    ? state.books.find(function (b) { return b.id === editBookId; })
    : null;

  const MAX_GALLERY_IMAGES = 8;

  // 초기 갤러리 목록 구성 (1장 단독 표지 또는 대표 표지 + 추가 사진 여러 장)
  function buildInitialGallery(book) {
    if (book) {
      return Store.getBookGalleryImages(book).map(function (it) {
        return { url: it.url, thumb: it.thumb || it.url, label: it.label || "" };
      });
    }
    return [
      {
        url: Store.SAMPLE_COVERS[1].full,
        thumb: Store.SAMPLE_COVERS[1].thumb,
        label: "대표 표지"
      }
    ];
  }

  // 현재 선택된 표지 및 다중 이미지 갤러리 상태
  let coverState = {
    galleryImages: buildInitialGallery(editingBook),
    activePreviewIdx: 0,
    isInitialSample: !editingBook,
    coverTheme: editingBook ? (editingBook.coverTheme || "sumuk-gold") : "sumuk-gold"
  };

  function syncPrimaryFromGallery() {
    const first = coverState.galleryImages[0] || null;
    coverState.coverImage = first ? first.url : "";
    coverState.coverThumb = first ? (first.thumb || first.url) : "";
    if (coverState.activePreviewIdx >= coverState.galleryImages.length) {
      coverState.activePreviewIdx = Math.max(0, coverState.galleryImages.length - 1);
    }
  }
  syncPrimaryFromGallery();

  let savedSelectionRange = null;
  const editorEl = document.getElementById("bookWebEditor");
  const previewPaneEl = document.getElementById("bookEditorPreviewPane");
  const previewBodyEl = document.getElementById("bookEditorPreviewBody");
  const toolbarEl = document.getElementById("editorToolbar");

  const DEFAULT_SAMPLE_RICH_HTML = `
    <h2>원문의 글자 하나도 소홀히 하지 않은 정통 직역 강해서</h2>
    <p>본 도서는 임상 현장에서 고전 원문을 대조할 때 의역으로 인해 본뜻이 흐려지는 문제를 바로잡기 위해, <strong>원문 조문 전체를 우리말 어순과 한의학적 문리에 맞춰 정밀하게 직역</strong>한 학술 도서입니다.</p>
    <blockquote>
      <strong>[원문 · 직역 수록 예시]</strong><br/>
      원문 조문과 직역문, 그리고 진료실에서 바로 참고할 수 있는 병증 감별 해설을 나란히 배치하여 초학자부터 개원 임상의까지 막힘없이 읽을 수 있습니다.
    </blockquote>
    <h3>이 책의 핵심 구성 특징</h3>
    <ul>
      <li><strong>정확한 원문 대조:</strong> 판본 대조를 거친 정본 원문과 직역문 수록</li>
      <li><strong>임상 변증 길잡이:</strong> 유사 증상 간 감별 기준과 처방 운용 핵심 정리</li>
      <li><strong>진료실 상비 양장본:</strong> 오래 펼쳐 보아도 튼튼한 사철 제본 양장 제작</li>
    </ul>
    <table>
      <tbody>
        <tr>
          <th>권장 독자</th>
          <td>임상 한의사, 한의과대학 학부생 및 고전 강독 연구자</td>
        </tr>
        <tr>
          <th>활용 분야</th>
          <td>원전 강독 교재 · 진료실 처방 및 변증 참고서</td>
        </tr>
      </tbody>
    </table>
  `.trim();

  /* ========================================================================
     1. 사이드바 카운트 및 모바일 드로어 동기화
     ======================================================================== */
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

  /* ========================================================================
     2. 표지 · 다중 이미지 갤러리 미리보기, 여러 장 업로드(자동 압축), 순서/대표 지정
     ======================================================================== */
  function renderSampleCoverStrip() {
    const strip = document.getElementById("sampleCoverStrip");
    if (!strip) return;
    strip.innerHTML = Store.SAMPLE_COVERS.map(function (sc, idx) {
      const selected = coverState.galleryImages.some(function (it) {
        return it.url === sc.full || it.thumb === sc.thumb;
      });
      return `
        <button type="button" class="sample-cover-btn ${selected ? "is-selected" : ""}" data-sample-idx="${idx}" title="${Store.escapeHtml(sc.label)}">
          <img class="book-real-img" src="${Store.escapeHtml(sc.thumb)}" data-fallback="${Store.escapeHtml(sc.full)}" alt="${Store.escapeHtml(sc.label)}" />
        </button>
      `;
    }).join("");
  }

  function renderBookGalleryList() {
    const listEl = document.getElementById("bookGalleryList");
    const countBadge = document.getElementById("coverGalleryCountBadge");
    if (countBadge) {
      countBadge.textContent = coverState.galleryImages.length > 0
        ? `${coverState.galleryImages.length}장 등록`
        : "전통 표지";
    }
    if (!listEl) return;

    if (coverState.galleryImages.length === 0) {
      listEl.innerHTML = `<div class="book-gallery-empty">등록된 사진 없음 · 기본 전통 표지 사용 중</div>`;
      return;
    }

    listEl.innerHTML = coverState.galleryImages.map(function (item, idx) {
      const isCover = idx === 0;
      const isActive = idx === coverState.activePreviewIdx;
      const thumbSrc = (item.url && item.url.indexOf("data:image/") === 0)
        ? item.url
        : (item.thumb || item.url);
      return `
        <div class="book-gallery-item ${isActive ? "is-active" : ""}" data-preview-gallery-idx="${idx}" title="${isCover ? "대표 표지 이미지" : `추가 이미지 #${idx + 1} (클릭하여 미리보기)`}">
          <img class="book-real-img" src="${Store.escapeHtml(thumbSrc)}" data-fallback="${Store.escapeHtml(item.url)}" alt="${isCover ? "대표 표지" : `추가 이미지 ${idx + 1}`}" />
          <span class="book-gallery-badge ${isCover ? "" : "is-sub"}">${isCover ? "대표" : `#${idx + 1}`}</span>
          <button type="button" class="book-gallery-del-btn" data-remove-gallery-idx="${idx}" aria-label="이미지 삭제" title="이 이미지 삭제">✕</button>
          ${!isCover ? `<button type="button" class="book-gallery-make-cover-btn" data-set-cover-idx="${idx}">대표 지정</button>` : ""}
        </div>
      `;
    }).join("");
  }

  function renderCoverLivePreview() {
    syncPrimaryFromGallery();
    const titleVal = document.getElementById("bfTitle").value.trim() || "현동직역 상한론 강해";
    const authorVal = document.getElementById("bfAuthor").value.trim() || "장중경 원저";
    const transVal = document.getElementById("bfTranslator").value.trim();
    const badgeVal = document.getElementById("bfSetBadge").value.trim();
    const pubVal = document.getElementById("bfPublisher").value.trim() || "도서출판 물고기";

    const activeIdx = coverState.activePreviewIdx;
    const activeItem = coverState.galleryImages[activeIdx] || null;
    const previewEl = document.getElementById("coverLivePreview");

    if (activeItem && activeIdx > 0) {
      previewEl.innerHTML = `
        <div class="cover-preview-sub-photo">
          <img class="book-real-img" src="${Store.escapeHtml(activeItem.url)}" data-fallback="${Store.escapeHtml(activeItem.thumb || activeItem.url)}" alt="${Store.escapeHtml(titleVal)} 추가 이미지 ${activeIdx + 1}" />
          <span class="cover-preview-sub-tag">추가 이미지 ${activeIdx + 1} / ${coverState.galleryImages.length}</span>
        </div>
      `;
    } else {
      const previewBook = {
        title: titleVal,
        author: authorVal,
        translator: transVal,
        publisher: pubVal,
        setBadge: badgeVal,
        hanjaWatermark: "玄同",
        coverTheme: coverState.coverTheme,
        coverImage: coverState.coverImage,
        coverThumb: coverState.coverThumb
      };
      previewEl.innerHTML = Store.renderBookCoverHTML(previewBook);
    }

    renderBookGalleryList();
    renderSampleCoverStrip();
  }

  // 이미지 파일을 캔버스로 적정 해상도 압축하여 용량 초과 없이 선명하게 저장
  function readImageFileAsCompressedDataUrl(file, maxWidth, callback) {
    if (!file || !file.type.startsWith("image/")) {
      Store.showToast("이미지 파일(JPG, PNG, WEBP, SVG)을 선택해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (ev) {
      if (file.type === "image/svg+xml") {
        callback(ev.target.result);
        return;
      }
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () {
        callback(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleMultipleFilesUpload(fileList, replaceCoverFirst) {
    const files = Array.from(fileList || []).filter(function (f) {
      return f && f.type && f.type.startsWith("image/");
    });
    if (files.length === 0) {
      Store.showToast("이미지 파일(JPG, PNG, WEBP)을 선택해 주세요.");
      return;
    }

    const baseList = (replaceCoverFirst && coverState.isInitialSample)
      ? []
      : coverState.galleryImages.slice();

    const availableSlots = MAX_GALLERY_IMAGES - (replaceCoverFirst && !coverState.isInitialSample ? Math.max(0, baseList.length - 1) : baseList.length);
    if (availableSlots <= 0) {
      Store.showToast(`도서 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const targetFiles = files.slice(0, availableSlots);
    const results = new Array(targetFiles.length);
    let doneCount = 0;

    targetFiles.forEach(function (file, i) {
      readImageFileAsCompressedDataUrl(file, 560, function (dataUrl) {
        results[i] = {
          url: dataUrl,
          thumb: dataUrl,
          label: file.name ? file.name.replace(/\.[^.]+$/, "") : `도서 이미지 ${i + 1}`
        };
        doneCount += 1;
        if (doneCount === targetFiles.length) {
          const validItems = results.filter(Boolean);
          if (replaceCoverFirst) {
            if (coverState.isInitialSample || coverState.galleryImages.length === 0) {
              coverState.galleryImages = validItems.slice(0, MAX_GALLERY_IMAGES);
            } else {
              const rest = coverState.galleryImages.slice(1);
              coverState.galleryImages = [validItems[0]].concat(validItems.slice(1), rest).slice(0, MAX_GALLERY_IMAGES);
            }
            coverState.activePreviewIdx = 0;
          } else {
            if (coverState.isInitialSample) {
              coverState.isInitialSample = false;
            }
            const startIdx = coverState.galleryImages.length;
            coverState.galleryImages = coverState.galleryImages.concat(validItems).slice(0, MAX_GALLERY_IMAGES);
            coverState.activePreviewIdx = Math.min(startIdx, coverState.galleryImages.length - 1);
          }
          coverState.isInitialSample = false;
          renderCoverLivePreview();
          Store.showToast(
            validItems.length > 1
              ? `도서 이미지 ${validItems.length}장이 등록되었습니다 (총 ${coverState.galleryImages.length}장).`
              : "선택하신 도서 이미지가 등록되었습니다."
          );
        }
      });
    });
  }

  document.getElementById("btnTriggerCoverUpload").addEventListener("click", function () {
    document.getElementById("bfCoverFileInput").click();
  });

  document.getElementById("bfCoverFileInput").addEventListener("change", function (e) {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFilesUpload(e.target.files, true);
    }
    e.target.value = "";
  });

  const btnAddGallery = document.getElementById("btnAddGalleryImages");
  const addGalleryInput = document.getElementById("bfAddGalleryFileInput");
  if (btnAddGallery && addGalleryInput) {
    btnAddGallery.addEventListener("click", function () {
      addGalleryInput.click();
    });
    addGalleryInput.addEventListener("change", function (e) {
      if (e.target.files && e.target.files.length > 0) {
        handleMultipleFilesUpload(e.target.files, false);
      }
      e.target.value = "";
    });
  }

  const btnAddUrl = document.getElementById("btnAddImageUrl");
  const urlInput = document.getElementById("bfImageUrlInput");
  if (btnAddUrl && urlInput) {
    btnAddUrl.addEventListener("click", function () {
      const rawUrl = urlInput.value.trim();
      if (!rawUrl) {
        Store.showToast("추가할 이미지 URL을 입력해 주세요.");
        urlInput.focus();
        return;
      }
      if (coverState.galleryImages.length >= MAX_GALLERY_IMAGES && !coverState.isInitialSample) {
        Store.showToast(`도서 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있습니다.`);
        return;
      }
      if (coverState.isInitialSample) {
        coverState.galleryImages = [{ url: rawUrl, thumb: rawUrl, label: "대표 표지" }];
        coverState.isInitialSample = false;
        coverState.activePreviewIdx = 0;
      } else {
        coverState.galleryImages.push({
          url: rawUrl,
          thumb: rawUrl,
          label: coverState.galleryImages.length === 0 ? "대표 표지" : `추가 이미지 ${coverState.galleryImages.length + 1}`
        });
        coverState.activePreviewIdx = coverState.galleryImages.length - 1;
      }
      urlInput.value = "";
      renderCoverLivePreview();
      Store.showToast("이미지 URL이 도서 갤러리에 추가되었습니다.");
    });
  }

  const galleryListEl = document.getElementById("bookGalleryList");
  if (galleryListEl) {
    galleryListEl.addEventListener("click", function (e) {
      const delBtn = e.target.closest("[data-remove-gallery-idx]");
      if (delBtn) {
        e.stopPropagation();
        const delIdx = Number(delBtn.getAttribute("data-remove-gallery-idx"));
        coverState.galleryImages.splice(delIdx, 1);
        coverState.isInitialSample = false;
        if (coverState.activePreviewIdx >= coverState.galleryImages.length) {
          coverState.activePreviewIdx = Math.max(0, coverState.galleryImages.length - 1);
        }
        renderCoverLivePreview();
        Store.showToast("선택한 이미지가 목록에서 제외되었습니다.");
        return;
      }

      const setCoverBtn = e.target.closest("[data-set-cover-idx]");
      if (setCoverBtn) {
        e.stopPropagation();
        const targetIdx = Number(setCoverBtn.getAttribute("data-set-cover-idx"));
        const picked = coverState.galleryImages.splice(targetIdx, 1)[0];
        if (picked) {
          picked.label = "대표 표지";
          coverState.galleryImages.unshift(picked);
          coverState.activePreviewIdx = 0;
          coverState.isInitialSample = false;
          renderCoverLivePreview();
          Store.showToast("선택한 사진이 대표 표지 이미지로 변경되었습니다.");
        }
        return;
      }

      const itemCard = e.target.closest("[data-preview-gallery-idx]");
      if (itemCard) {
        coverState.activePreviewIdx = Number(itemCard.getAttribute("data-preview-gallery-idx"));
        renderCoverLivePreview();
      }
    });
  }

  document.getElementById("btnClearCoverPhoto").addEventListener("click", function () {
    coverState.galleryImages = [];
    coverState.activePreviewIdx = 0;
    coverState.isInitialSample = false;
    renderCoverLivePreview();
    Store.showToast("기본 전통 표지 디자인으로 전환되었습니다.");
  });

  document.getElementById("sampleCoverStrip").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-sample-idx]");
    if (!btn) return;
    const sc = Store.SAMPLE_COVERS[Number(btn.getAttribute("data-sample-idx"))];
    if (sc) {
      const existingIdx = coverState.galleryImages.findIndex(function (it) {
        return it.url === sc.full || it.thumb === sc.thumb;
      });
      if (existingIdx !== -1) {
        coverState.activePreviewIdx = existingIdx;
        renderCoverLivePreview();
        Store.showToast(`『${sc.label}』 이미지를 미리보기합니다.`);
      } else if (coverState.isInitialSample || coverState.galleryImages.length === 0) {
        coverState.galleryImages = [{ url: sc.full, thumb: sc.thumb, label: sc.label }];
        coverState.activePreviewIdx = 0;
        coverState.isInitialSample = false;
        renderCoverLivePreview();
        Store.showToast(`『${sc.label}』 샘플 표지가 적용되었습니다.`);
      } else if (coverState.galleryImages.length < MAX_GALLERY_IMAGES) {
        coverState.galleryImages.push({ url: sc.full, thumb: sc.thumb, label: sc.label });
        coverState.activePreviewIdx = coverState.galleryImages.length - 1;
        renderCoverLivePreview();
        Store.showToast(`『${sc.label}』 샘플이 추가 이미지로 등록되었습니다 (총 ${coverState.galleryImages.length}장).`);
      } else {
        Store.showToast(`도서 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있습니다.`);
      }
    }
  });

  ["bfTitle", "bfAuthor", "bfTranslator", "bfSetBadge", "bfPublisher"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderCoverLivePreview);
  });

  /* ========================================================================
     3. 정가 · 판매가 실시간 할인율 & 적립금 자동 계산
     ======================================================================== */
  function updatePriceCalcBanner() {
    const listPrice = Math.max(0, Number(document.getElementById("bfListPrice").value) || 0);
    const salePrice = Math.max(0, Number(document.getElementById("bfSalePrice").value) || 0);
    const disc = listPrice > 0 ? Math.max(0, Math.round((1 - salePrice / listPrice) * 100)) : 0;
    const points = Math.round(salePrice * 0.03);
    document.getElementById("liveDiscountSummary").textContent =
      `${disc}% 할인 · 구매 적립금 ${Store.formatKRW(points)}`;
  }

  document.getElementById("bfListPrice").addEventListener("input", updatePriceCalcBanner);
  document.getElementById("bfSalePrice").addEventListener("input", updatePriceCalcBanner);

  /* ========================================================================
     4. WYSIWYG 웹 에디터 (서식 명령 · 색상 · 표/인용박스/이미지 삽입 · 미리보기)
     ======================================================================== */
  function saveEditorSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorEl.contains(range.commonAncestorContainer)) {
        savedSelectionRange = range.cloneRange();
      }
    }
  }

  function restoreEditorSelection() {
    editorEl.focus();
    if (savedSelectionRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange);
    }
  }

  function updateEditorCharCount() {
    const text = (editorEl.innerText || "").replace(/\s+/g, " ").trim();
    document.getElementById("editorCharCount").textContent =
      `입력 글자 수: ${text.length.toLocaleString("ko-KR")}자`;
  }

  editorEl.addEventListener("keyup", function () {
    saveEditorSelection();
    updateEditorCharCount();
  });
  editorEl.addEventListener("mouseup", saveEditorSelection);
  editorEl.addEventListener("input", updateEditorCharCount);

  // 툴바 버튼 클릭 시 에디터 선택 영역 포커스 유지
  toolbarEl.addEventListener("mousedown", function (e) {
    if (e.target.closest("button")) {
      e.preventDefault();
    }
  });

  toolbarEl.addEventListener("click", function (e) {
    const cmdBtn = e.target.closest("[data-ed-cmd]");
    if (cmdBtn) {
      restoreEditorSelection();
      document.execCommand(cmdBtn.getAttribute("data-ed-cmd"), false, null);
      saveEditorSelection();
      updateEditorCharCount();
      return;
    }

    const colorBtn = e.target.closest("[data-ed-color]");
    if (colorBtn) {
      restoreEditorSelection();
      document.execCommand("foreColor", false, colorBtn.getAttribute("data-ed-color"));
      saveEditorSelection();
      return;
    }

    const hiliteBtn = e.target.closest("[data-ed-hilite]");
    if (hiliteBtn) {
      restoreEditorSelection();
      document.execCommand("hiliteColor", false, hiliteBtn.getAttribute("data-ed-hilite"));
      saveEditorSelection();
    }
  });

  document.getElementById("edBlockFormat").addEventListener("change", function (e) {
    restoreEditorSelection();
    document.execCommand("formatBlock", false, e.target.value);
    saveEditorSelection();
  });

  document.getElementById("edFontSize").addEventListener("change", function (e) {
    restoreEditorSelection();
    document.execCommand("fontSize", false, e.target.value);
    saveEditorSelection();
  });

  function insertHtmlAtCursor(htmlSnippet) {
    restoreEditorSelection();
    document.execCommand("insertHTML", false, htmlSnippet);
    saveEditorSelection();
    updateEditorCharCount();
  }

  document.getElementById("btnInsertQuoteBox").addEventListener("click", function () {
    insertHtmlAtCursor(`
      <blockquote>
        <strong>[원문 조문 및 직역 해설]</strong><br/>
        원문 구절과 우리말 직역, 임상 적용 포인트를 이곳에 입력해 주세요.
      </blockquote>
      <p><br/></p>
    `);
    Store.showToast("원문·해설 인용 박스가 본문에 삽입되었습니다.");
  });

  document.getElementById("btnInsertInfoTable").addEventListener("click", function () {
    insertHtmlAtCursor(`
      <table>
        <tbody>
          <tr>
            <th>핵심 주제</th>
            <td>원문 직역 및 병증별 감별 진단 기준 정리</td>
          </tr>
          <tr>
            <th>추천 대상</th>
            <td>임상 한의사, 한의과대학 학부생, 고전 연구자</td>
          </tr>
        </tbody>
      </table>
      <p><br/></p>
    `);
    Store.showToast("특징 요약표가 본문에 삽입되었습니다.");
  });

  document.getElementById("btnInsertInlineImg").addEventListener("click", function () {
    saveEditorSelection();
    document.getElementById("editorInlineImgInput").click();
  });

  document.getElementById("editorInlineImgInput").addEventListener("change", function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    readImageFileAsCompressedDataUrl(file, 720, function (dataUrl) {
      insertHtmlAtCursor(`<p><img src="${dataUrl}" alt="도서 상세 소개 이미지" /></p><p><br/></p>`);
      Store.showToast("본문 이미지가 에디터에 삽입되었습니다.");
    });
    e.target.value = "";
  });

  // 에디터 작성 <-> 쇼핑몰 화면 미리보기 탭 전환
  document.querySelectorAll("[data-editor-mode]").forEach(function (tabBtn) {
    tabBtn.addEventListener("click", function () {
      const mode = tabBtn.getAttribute("data-editor-mode");
      document.querySelectorAll("[data-editor-mode]").forEach(function (b) {
        b.classList.toggle("is-active", b === tabBtn);
      });
      if (mode === "preview") {
        previewBodyEl.innerHTML = Store.sanitizeRichHtml(editorEl.innerHTML);
        editorEl.style.display = "none";
        toolbarEl.style.display = "none";
        previewPaneEl.classList.add("is-active");
      } else {
        previewPaneEl.classList.remove("is-active");
        toolbarEl.style.display = "";
        editorEl.style.display = "";
        editorEl.focus();
      }
    });
  });

  /* ========================================================================
     5. 공통코드 연동 드롭다운 바인딩 & 초기값 세팅 (수정 모드 vs 신규 등록 모드)
     ======================================================================== */
  function renderCodeSelectOptions(selectId, groupCode, currentVal) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const activeItems = Store.getActiveCodes(state, groupCode);
    const grp = Store.getCodeGroup(state, groupCode);
    const list = activeItems.slice();

    if (currentVal && !list.some(function (it) { return it.code === currentVal; })) {
      const legacy = grp && grp.items ? grp.items.find(function (it) { return it.code === currentVal; }) : null;
      list.push({
        code: currentVal,
        name: (legacy ? legacy.name : currentVal) + " (현재 숨김 코드)"
      });
    }

    sel.innerHTML = list.map(function (it) {
      return `<option value="${Store.escapeHtml(it.code)}">${Store.escapeHtml(it.name)}</option>`;
    }).join("");

    if (currentVal && list.some(function (it) { return it.code === currentVal; })) {
      sel.value = currentVal;
    } else if (list[0]) {
      sel.value = list[0].code;
    }
  }

  function populateCodeSelects() {
    renderCodeSelectOptions("bfCategory", "BOOK_CATEGORY", editingBook ? editingBook.categoryId : "DONGEUI");
    renderCodeSelectOptions(
      "bfIsSet",
      "BOOK_TYPE",
      editingBook ? (editingBook.bookTypeCode || (editingBook.isSet ? "SET" : "SINGLE")) : "SINGLE"
    );
    renderCodeSelectOptions("bfSaleStatus", "BOOK_SALE_STATUS", editingBook ? (editingBook.saleStatus || "ON_SALE") : "ON_SALE");
  }

  function fillSampleNewBookData() {
    const activeCats = Store.getActiveCodes(state, "BOOK_CATEGORY");
    const defaultCat = activeCats.some(function (c) { return c.code === "DONGEUI"; })
      ? "DONGEUI"
      : (activeCats[0] ? activeCats[0].code : "DONGEUI");
    document.getElementById("bfCategory").value = defaultCat;

    const activeTypes = Store.getActiveCodes(state, "BOOK_TYPE");
    const defaultType = activeTypes.some(function (t) { return t.code === "SINGLE"; })
      ? "SINGLE"
      : (activeTypes[0] ? activeTypes[0].code : "SINGLE");
    document.getElementById("bfIsSet").value = defaultType;

    const statusSel = document.getElementById("bfSaleStatus");
    if (statusSel) statusSel.value = "ON_SALE";
    document.getElementById("bfSetBadge").value = "신간 직역서";
    document.getElementById("bfTitle").value = "현동직역 상한론 강해 (傷寒論講解)";
    document.getElementById("bfSubtitle").value = "장중경 원저 전문 직역 및 육경변증 임상 운용 지침";
    document.getElementById("bfAuthor").value = "장중경 원저";
    document.getElementById("bfTranslator").value = "현동 김공빈 직역";
    document.getElementById("bfPublisher").value = "도서출판 물고기";
    document.getElementById("bfIsbn").value = "9791188421992";
    document.getElementById("bfPubDate").value = "2026-11-12";
    document.getElementById("bfDimensions").value = "182×257mm (양장)";
    document.getElementById("bfPageCount").value = "648";
    document.getElementById("bfListPrice").value = "65000";
    document.getElementById("bfSalePrice").value = "50000";
    document.getElementById("bfStock").value = "35";
    document.getElementById("bfMdPick").checked = true;
    document.getElementById("bfSummary").value =
      "태양·양명·소양·태음·소음·궐음 육경병맥증병치 전문을 원문 뜻 그대로 우리말로 직역하고 처방 감별 기준을 정리한 신간 강해서.";
    document.getElementById("bfToc").value =
      "제1편 변태양병맥증병치 (상·중·하)\n제2편 변양명병맥증병치\n제3편 변소양병맥증병치\n제4편 변태음·소음·궐음병맥증병치\n부록 상한론 핵심 처방 가감 색인";
    editorEl.innerHTML = DEFAULT_SAMPLE_RICH_HTML;
    coverState.galleryImages = [
      { url: Store.SAMPLE_COVERS[1].full, thumb: Store.SAMPLE_COVERS[1].thumb, label: "대표 표지" },
      { url: Store.SAMPLE_COVERS[2].full, thumb: Store.SAMPLE_COVERS[2].thumb, label: "추가 표지 예시" }
    ];
    coverState.activePreviewIdx = 0;
    coverState.isInitialSample = false;
    updatePriceCalcBanner();
    updateEditorCharCount();
    renderCoverLivePreview();
  }

  function populateEditingBook(book) {
    document.title = `도서 내용 수정 (${book.title}) — 현동서재 관리자 센터`;
    document.getElementById("bookFormPageHeading").textContent = `도서 정보 수정 (${book.id})`;
    document.getElementById("guideTitle").textContent = `『${book.title}』 도서 정보 및 상세 소개 수정`;
    document.getElementById("guideDesc").textContent =
      "표지 이미지, 판매가, 재고 수량, 웹 에디터 책 소개를 수정하고 저장하면 쇼핑몰 화면에 즉시 반영됩니다.";
    document.getElementById("btnSubmitBookForm").textContent = "도서 수정 내용 저장";

    document.getElementById("bfCategory").value = book.categoryId;
    document.getElementById("bfIsSet").value = book.bookTypeCode || (book.isSet ? "SET" : "SINGLE");
    const statusSel = document.getElementById("bfSaleStatus");
    if (statusSel) statusSel.value = book.saleStatus || "ON_SALE";
    document.getElementById("bfSetBadge").value = book.setBadge || "";
    document.getElementById("bfTitle").value = book.title || "";
    document.getElementById("bfSubtitle").value = book.subtitle || "";
    document.getElementById("bfAuthor").value = book.author || "";
    document.getElementById("bfTranslator").value = book.translator || "";
    document.getElementById("bfPublisher").value = book.publisher || "도서출판 물고기";
    document.getElementById("bfIsbn").value = book.isbn13 || "";
    document.getElementById("bfPubDate").value = book.publishedDate || "2026-11-12";
    document.getElementById("bfDimensions").value = book.dimensions || "176×248mm";
    document.getElementById("bfPageCount").value = book.pageCount || 500;
    document.getElementById("bfListPrice").value = book.listPrice || 50000;
    document.getElementById("bfSalePrice").value = book.salePrice || 40000;
    document.getElementById("bfStock").value = book.stockQuantity != null ? book.stockQuantity : 10;
    document.getElementById("bfMdPick").checked = Boolean(book.mdPick);
    document.getElementById("bfSummary").value = book.summary || "";
    document.getElementById("bfToc").value = book.tableOfContents || "";
    document.getElementById("bfTargetReaders").value = book.targetReaders || "";
    document.getElementById("bfAuthorBio").value = book.authorBio || "";

    if (book.descriptionHtml) {
      editorEl.innerHTML = Store.sanitizeRichHtml(book.descriptionHtml);
    } else {
      editorEl.innerHTML = `
        <h2>${Store.escapeHtml(book.title)}</h2>
        <p>${Store.escapeHtml(book.description || book.summary || "")}</p>
        <blockquote>
          <strong>출판사 서평</strong><br/>
          ${Store.escapeHtml(book.publisherReview || "현동학당 · 도서출판 물고기 정본 직역 도서입니다.")}
        </blockquote>
      `;
    }

    updatePriceCalcBanner();
    updateEditorCharCount();
    renderCoverLivePreview();
  }

  document.getElementById("btnFillSampleBook").addEventListener("click", function () {
    fillSampleNewBookData();
    Store.showToast("시연용 샘플 도서 정보와 웹 에디터 소개글이 채워졌습니다.");
  });

  /* ========================================================================
     6. 저장 제출 처리 -> localStorage 반영 후 도서 관리 목록으로 이동
     ======================================================================== */
  document.getElementById("standaloneBookForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("bfTitle").value.trim();
    if (!title) {
      Store.showToast("도서명을 입력해 주세요.");
      document.getElementById("bfTitle").focus();
      return;
    }

    const catId = document.getElementById("bfCategory").value;
    const catName = Store.getCodeLabel(state, "BOOK_CATEGORY", catId, catId);
    const bookTypeCode = document.getElementById("bfIsSet").value || "SINGLE";
    const bookTypeName = Store.getCodeLabel(state, "BOOK_TYPE", bookTypeCode, bookTypeCode === "SINGLE" ? "단권 도서" : "전집 · 세트 상품");
    const statusSel = document.getElementById("bfSaleStatus");
    const rawStatus = statusSel && statusSel.value ? statusSel.value : "ON_SALE";

    const listPrice = Math.max(1000, Number(document.getElementById("bfListPrice").value) || 0);
    const salePrice = Math.max(1000, Number(document.getElementById("bfSalePrice").value) || 0);
    const disc = Math.max(0, Math.round((1 - salePrice / listPrice) * 100));
    const stock = Math.max(0, Number(document.getElementById("bfStock").value) || 0);
    const finalStatus = (stock === 0 && rawStatus === "ON_SALE") ? "OUT_OF_STOCK" : rawStatus;
    const cleanRichHtml = Store.sanitizeRichHtml(editorEl.innerHTML.trim());
    const plainDesc = (editorEl.innerText || "").replace(/\s+/g, " ").trim() || document.getElementById("bfSummary").value.trim();

    let shippingEtaText = "오늘 발송 예정";
    if (finalStatus === "OUT_OF_STOCK" || finalStatus === "DISCONTINUED") {
      shippingEtaText = Store.getCodeLabel(state, "BOOK_SALE_STATUS", finalStatus, "일시품절");
    } else if (finalStatus === "PREORDER") {
      shippingEtaText = "출간 예정 · 순차 발송";
    } else if (salePrice >= state.siteConfig.freeShippingThreshold) {
      shippingEtaText = "오늘 발송 예정 (무료배송)";
    }

    const payload = {
      isbn13: document.getElementById("bfIsbn").value.trim(),
      categoryId: catId,
      categoryName: catName,
      bookTypeCode: bookTypeCode,
      bookTypeName: bookTypeName,
      isSet: bookTypeCode !== "SINGLE",
      setBadge: document.getElementById("bfSetBadge").value.trim(),
      title: title,
      subtitle: document.getElementById("bfSubtitle").value.trim(),
      author: document.getElementById("bfAuthor").value.trim(),
      translator: document.getElementById("bfTranslator").value.trim(),
      publisher: document.getElementById("bfPublisher").value.trim() || "도서출판 물고기",
      publishedDate: document.getElementById("bfPubDate").value || "2026-11-12",
      dimensions: document.getElementById("bfDimensions").value.trim() || "176×248mm",
      pageCount: Math.max(1, Number(document.getElementById("bfPageCount").value) || 400),
      listPrice: listPrice,
      salePrice: salePrice,
      discountRate: disc,
      rewardPoints: Math.round(salePrice * 0.03),
      stockQuantity: stock,
      mdPick: document.getElementById("bfMdPick").checked,
      saleStatus: finalStatus,
      shippingEta: shippingEtaText,
      summary: document.getElementById("bfSummary").value.trim(),
      description: plainDesc,
      descriptionHtml: cleanRichHtml,
      tableOfContents: document.getElementById("bfToc").value.trim(),
      targetReaders: document.getElementById("bfTargetReaders").value.trim(),
      authorBio: document.getElementById("bfAuthorBio").value.trim(),
      coverImage: coverState.coverImage,
      coverThumb: coverState.coverThumb || coverState.coverImage,
      galleryImages: coverState.galleryImages.map(function (it, idx) {
        return {
          url: it.url,
          thumb: it.thumb || it.url,
          label: it.label || (idx === 0 ? "대표 표지" : `추가 이미지 ${idx + 1}`)
        };
      }),
      coverTheme: coverState.coverTheme
    };

    if (editingBook) {
      Object.assign(editingBook, payload);
      Store.saveState(state);
      try {
        window.sessionStorage.setItem("HYUNDONG_ADMIN_FLASH", `『${editingBook.title}』 도서 정보가 수정되었습니다.`);
      } catch (err) {}
    } else {
      const nextNum = state.books.length + 1;
      const newBook = Object.assign({
        id: "BK-" + String(nextNum).padStart(3, "0"),
        hanjaWatermark: "玄同",
        salesCount: 1,
        ratingAvg: 5.0,
        reviewCount: 0,
        bestsellerRank: nextNum,
        publisherReview: "도서출판 물고기 신간 도서"
      }, payload);
      state.books.unshift(newBook);
      Store.saveState(state);
      try {
        window.sessionStorage.setItem("HYUNDONG_ADMIN_FLASH", `신규 도서 『${newBook.title}』 등록이 완료되었습니다!`);
      } catch (err) {}
    }

    window.location.href = "./admin.html?sec=books";
  });

  /* ========================================================================
     초기 실행
     ======================================================================== */
  syncSidebarCounts();
  populateCodeSelects();
  if (editingBook) {
    populateEditingBook(editingBook);
  } else {
    editorEl.innerHTML = DEFAULT_SAMPLE_RICH_HTML;
    updatePriceCalcBanner();
    updateEditorCharCount();
    renderCoverLivePreview();
  }
})();

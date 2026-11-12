/* ==========================================================================
   현동서재 (현동학당 · 도서출판 물고기) 통합 시연 데이터 & 상태 동기화 스토어
   쇼핑몰(index/login/signup) <-> 관리자 센터(admin-login/admin) 실시간 연동
   ========================================================================== */

(function () {
  const STORAGE_KEY = "HYUNDONG_BOOKMALL_DEMO_V5";

  // 주요 택배사 기본 목록 (로젠택배 전담 단독 설정)
  const CARRIERS = [
    {
      code: "LOGEN",
      name: "로젠택배",
      trackingUrl: "https://www.ilogen.com/web/personal/tkSearch",
      csPhone: "1588-9988",
      samplePrefix: "9812"
    }
  ];

  // 관리기 [분류 · 공통코드 관리] 마스터 데이터 (도서분야, 단권/세트 구분, 판매상태, 회원등급, 게시판분류, 택배사)
  const INITIAL_CODE_GROUPS = [
    {
      groupCode: "BOOK_CATEGORY",
      groupName: "도서 분야",
      summary: "도서 등록 시 [도서 분야] 선택창 및 쇼핑몰 상단 메뉴·분야별 서가에 표시되는 코드",
      previewUrl: "./admin-book-new.html",
      previewLabel: "도서 등록 화면에서 확인 →",
      items: [
        { code: "DONGEUI", name: "동의보감 · 경전", sortOrder: 1, active: true, hanja: "東醫", desc: "원문 의도를 왜곡 없이 우리말로 옮긴 표준 직역서 및 주석서" },
        { code: "DIAGNOSIS", name: "진단 · 맥진학", sortOrder: 2, active: true, hanja: "脈診", desc: "망·문·문·절 진찰법과 정통 맥진 필독 고전" },
        { code: "FORMULA", name: "방제 · 처방집", sortOrder: 3, active: true, hanja: "方劑", desc: "진료실에서 바로 펼쳐 확인하는 병증별 처방 원리와 가감법" },
        { code: "CLINICAL", name: "임상 · 강의집", sortOrder: 4, active: true, hanja: "臨床", desc: "현동의감 전집, 입문 강의록 및 실제 임상 증례 토론집" },
        { code: "PHILOSOPHY", name: "양생 · 인체생리", sortOrder: 5, active: true, hanja: "養生", desc: "전통 생명철학과 동의보감 정기신 인체생리 · 자연치유 양생서" }
      ]
    },
    {
      groupCode: "BOOK_TYPE",
      groupName: "단권 / 세트 구분",
      summary: "도서 등록 시 [단권 / 세트 구분] 선택창과 쇼핑몰 목록 조건 검색에 사용되는 구성 코드",
      previewUrl: "./admin-book-new.html",
      previewLabel: "도서 등록 화면에서 확인 →",
      items: [
        { code: "SINGLE", name: "단권 도서", sortOrder: 1, active: true, desc: "낱권으로 개별 구매하는 일반 단행본 도서" },
        { code: "SET", name: "전집 · 세트 상품", sortOrder: 2, active: true, desc: "여러 권이 한 질(보관 케이스 포함 등)로 구성된 전집·세트 도서" },
        { code: "LECTURE_SET", name: "강독 교재 묶음", sortOrder: 3, active: true, desc: "학당 강독 과정용 원문집 · 해설집 결합 구성 상품" }
      ]
    },
    {
      groupCode: "BOOK_SALE_STATUS",
      groupName: "도서 판매 상태",
      summary: "도서 등록·수정 및 재고 관리 시 판매 가능 여부를 표시하는 상태 코드",
      previewUrl: "./admin.html?sec=books",
      previewLabel: "도서 목록에서 확인 →",
      items: [
        { code: "ON_SALE", name: "정상 판매중", sortOrder: 1, active: true, desc: "쇼핑몰에서 즉시 장바구니 담기 및 주문 결제가 가능한 상태" },
        { code: "OUT_OF_STOCK", name: "일시 품절", sortOrder: 2, active: true, desc: "재고 소진으로 구매 버튼이 비활성화되고 재입고 예정으로 표시" },
        { code: "PREORDER", name: "출간 예정 (예약판매)", sortOrder: 3, active: true, desc: "신간 인쇄 진행 중으로 출간일 기준 순차 발송 안내" },
        { code: "DISCONTINUED", name: "절판 (구판 마감)", sortOrder: 4, active: false, desc: "개정판 출간 등으로 추가 인쇄가 종료된 구판 상태" }
      ]
    },
    {
      groupCode: "MEMBER_GRADE",
      groupName: "회원 구분 · 등급",
      summary: "회원가입 화면의 [회원 구분] 선택창과 회원 상세 관리의 등급 항목 코드",
      previewUrl: "./signup.html",
      previewLabel: "회원가입 화면에서 확인 ↗",
      items: [
        { code: "한의사 회원", name: "한의사 회원", sortOrder: 1, active: true, desc: "개원·봉직 한의사 회원 (세금계산서·원장실 비치용 단체주문 지원)" },
        { code: "한의대생 회원", name: "한의대생 회원", sortOrder: 2, active: true, desc: "전국 한의과대학 및 한의학전문대학원 재학생 회원" },
        { code: "일반 회원", name: "일반 회원", sortOrder: 3, active: true, desc: "전통의학 연구자 및 일반 교양·양생 독자 회원" }
      ]
    },
    {
      groupCode: "BOARD_CATEGORY",
      groupName: "문의 · 게시판 분류",
      summary: "쇼핑몰 1:1 문의 유형 선택창 및 공지사항·FAQ 말머리 분류 코드",
      previewUrl: "./index.html?view=support",
      previewLabel: "고객센터 화면에서 확인 ↗",
      items: [
        { code: "도서문의", name: "도서 내용 · 추천 문의", sortOrder: 1, active: true, desc: "원문 직역서 난이도, 입문 추천 순서, 목차 관련 문의" },
        { code: "배송문의", name: "배송 · 포장 문의", sortOrder: 2, active: true, desc: "당일 출고 마감, 완충 포장, 파본 교환 및 운송장 관련 문의" },
        { code: "대량구매·영수증", name: "단체구매 · 세금계산서 문의", sortOrder: 3, active: true, desc: "한의원·대학 도서관 대량 납품 및 세금계산서 발행 문의" },
        { code: "재입고문의", name: "품절 도서 재입고 문의", sortOrder: 4, active: true, desc: "일시품절 도서의 중쇄 및 재입고 일정 문의" },
        { code: "발송안내", name: "발송 · 휴무 공지", sortOrder: 5, active: true, desc: "공지사항 게시판의 택배 발송 마감 및 명절 휴무 안내" },
        { code: "신간소식", name: "신간 출간 소식", sortOrder: 6, active: true, desc: "공지사항 게시판의 신규 출간 도서 및 개정판 안내" }
      ]
    },
    {
      groupCode: "CARRIER_CODE",
      groupName: "택배사 · 송장조회 주소",
      summary: "주문 송장번호 등록 시 선택하는 택배사 코드와 고객에게 안내되는 배송조회 페이지 주소",
      previewUrl: "./index.html?view=orders",
      previewLabel: "고객 배송조회 안내 보기 ↗",
      items: [
        { code: "LOGEN", name: "로젠택배", sortOrder: 1, active: true, trackingUrl: "https://www.ilogen.com/web/personal/tkSearch", csPhone: "1588-9988", samplePrefix: "9812", desc: "고객센터 1588-9988 · 전담 배송 택배사" },
        { code: "CJ", name: "CJ대한통운", sortOrder: 2, active: false, trackingUrl: "https://trace.cjlogistics.com/next/tracking.html", csPhone: "1588-1255", samplePrefix: "6482", desc: "고객센터 1588-1255" },
        { code: "POST", name: "우체국택배", sortOrder: 3, active: false, trackingUrl: "https://service.epost.go.kr/iservice/usr/trace/usrtrc001k01.jsp", csPhone: "1588-1300", samplePrefix: "68901", desc: "고객센터 1588-1300" },
        { code: "HANJIN", name: "한진택배", sortOrder: 4, active: false, trackingUrl: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038", csPhone: "1588-0011", samplePrefix: "4218", desc: "고객센터 1588-0011" },
        { code: "LOTTE", name: "롯데택배", sortOrder: 5, active: false, trackingUrl: "https://www.lotteglogis.com/home/reservation/tracking/index", csPhone: "1588-2121", samplePrefix: "2491", desc: "고객센터 1588-2121" }
      ]
    }
  ];

  function getCodeGroup(state, groupCode) {
    const groups = (state && Array.isArray(state.codeGroups)) ? state.codeGroups : INITIAL_CODE_GROUPS;
    return groups.find(function (g) { return g.groupCode === groupCode; }) || null;
  }

  function getActiveCodes(state, groupCode) {
    const grp = getCodeGroup(state, groupCode);
    if (!grp || !Array.isArray(grp.items)) return [];
    return grp.items
      .filter(function (it) { return it.active !== false; })
      .slice()
      .sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
  }

  function getCodeLabel(state, groupCode, codeValue, fallbackLabel) {
    const grp = getCodeGroup(state, groupCode);
    if (grp && Array.isArray(grp.items)) {
      const found = grp.items.find(function (it) { return it.code === codeValue; });
      if (found) return found.name;
    }
    return fallbackLabel != null ? fallbackLabel : String(codeValue || "");
  }

  function getCategoriesWithAll(state) {
    const activeCats = getActiveCodes(state, "BOOK_CATEGORY").map(function (it) {
      return {
        id: it.code,
        name: it.name,
        desc: it.desc || (it.name + " 분야 출간 도서 목록"),
        hanja: it.hanja || it.name.slice(0, 2)
      };
    });
    return [
      { id: "ALL", name: "전체 도서", desc: "현동학당 · 도서출판 물고기 출간 도서 전체 목록", hanja: "全卷" }
    ].concat(activeCats);
  }

  function getActiveCarriers(state) {
    const items = getActiveCodes(state, "CARRIER_CODE");
    if (!items.length) return CARRIERS;
    return items.map(function (it) {
      return {
        code: it.code,
        name: it.name,
        trackingUrl: it.trackingUrl || CARRIERS[0].trackingUrl,
        csPhone: it.csPhone || "-",
        samplePrefix: it.samplePrefix || "9812"
      };
    });
  }

  function getCarrierInfo(codeOrName, state) {
    const grp = getCodeGroup(state, "CARRIER_CODE");
    const allItems = (grp && Array.isArray(grp.items)) ? grp.items.map(function (it) {
      return {
        code: it.code,
        name: it.name,
        trackingUrl: it.trackingUrl || CARRIERS[0].trackingUrl,
        csPhone: it.csPhone || "1588-9988",
        samplePrefix: it.samplePrefix || "9812"
      };
    }) : [];
    const pool = allItems.concat(CARRIERS);
    if (!codeOrName) return pool[0];
    const found = pool.find(function (c) {
      return c.code === codeOrName || c.name === codeOrName;
    });
    return found || {
      code: String(codeOrName),
      name: String(codeOrName),
      trackingUrl: (pool[0] && pool[0].trackingUrl) || "https://www.ilogen.com/web/personal/tkSearch",
      csPhone: "1588-9988",
      samplePrefix: "9812"
    };
  }

  function normalizeTrackingNumber(trackingNo) {
    if (trackingNo == null) return "";
    return String(trackingNo).replace(/\D/g, "");
  }

  // 실제 현동학당 출판도서 표지 이미지 매핑 (원본 + 썸네일 폴백)
  const BOOK_COVER_ASSETS = {
    "BK-001": "f8acbeb82b22954e6897fd398e90d166",
    "BK-002": "c37779d6cb61ab076e571d6692bbcbaf",
    "BK-003": "ca0b3aee64077e65e0adb6eb22b70b4c",
    "BK-004": "635be3bebed40948478bd7e5903c1633",
    "BK-005": "2113bd4295512e1209216da69d29c3b7",
    "BK-006": "cf6288fa52ad2edb6a1e17e90e6a37da",
    "BK-007": "10b0440724b77b195b42cdde984bc1f4",
    "BK-008": "b86e421de476dbd4891b59f5cd934e02",
    "BK-009": "a6aa1a5777026f60187f930a23dde246",
    "BK-010": "f4ecc02632764e3e1379378205fd9f67",
    "BK-011": "635be3bebed40948478bd7e5903c1633",
    "BK-012": "f8acbeb82b22954e6897fd398e90d166",
    "BK-013": "f8acbeb82b22954e6897fd398e90d166",
    "BK-014": "f8acbeb82b22954e6897fd398e90d166"
  };

  const SAMPLE_COVERS = [
    {
      label: "동의보감 세트 표지",
      full: "https://www.hyundong.co.kr/data/book_img/f8acbeb82b22954e6897fd398e90d166.jpg",
      thumb: "https://www.hyundong.co.kr/data/book_img/thumb-f8acbeb82b22954e6897fd398e90d166_98x142.jpg"
    },
    {
      label: "찬도방론맥결집성 표지",
      full: "https://www.hyundong.co.kr/data/book_img/2113bd4295512e1209216da69d29c3b7.jpg",
      thumb: "https://www.hyundong.co.kr/data/book_img/thumb-2113bd4295512e1209216da69d29c3b7_98x142.jpg"
    },
    {
      label: "난경본의 표지",
      full: "https://www.hyundong.co.kr/data/book_img/10b0440724b77b195b42cdde984bc1f4.jpg",
      thumb: "https://www.hyundong.co.kr/data/book_img/thumb-10b0440724b77b195b42cdde984bc1f4_98x142.jpg"
    },
    {
      label: "하늘기운 양생서 표지",
      full: "https://www.hyundong.co.kr/data/book_img/f4ecc02632764e3e1379378205fd9f67.jpg",
      thumb: "https://www.hyundong.co.kr/data/book_img/thumb-f4ecc02632764e3e1379378205fd9f67_98x142.jpg"
    }
  ];

  const CATEGORIES = [
    { id: "ALL", name: "전체 도서", desc: "현동학당 · 도서출판 물고기 출간 도서 전체 목록" },
    { id: "DONGEUI", name: "동의보감 · 경전", desc: "원문 의도를 왜곡 없이 우리말로 옮긴 표준 직역서 및 주석서" },
    { id: "DIAGNOSIS", name: "진단 · 맥진학", desc: "망·문·문·절 진찰법과 정통 맥진 필독 고전" },
    { id: "FORMULA", name: "방제 · 처방집", desc: "진료실에서 바로 펼쳐 확인하는 병증별 처방 원리와 가감법" },
    { id: "CLINICAL", name: "임상 · 강의집", desc: "현동의감 전집, 입문 강의록 및 실제 임상 증례 토론집" },
    { id: "PHILOSOPHY", name: "양생 · 인체생리", desc: "전통 생명철학과 동의보감 정기신 인체생리 · 자연치유 양생서" }
  ];

  const INITIAL_BOOKS = [
    {
      id: "BK-001",
      isbn13: "9791188421015",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: true,
      setBadge: "전4권 완간 양장세트",
      title: "현동직역 동의보감 (전4권 세트)",
      subtitle: "내경편 · 외형편 · 잡병편1 · 잡병편2 완역본 (전용 보관 케이스 포함)",
      hanjaWatermark: "東醫寶鑑",
      coverTheme: "sumuk-gold",
      author: "허준 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2023-03-15",
      pageCount: 3480,
      dimensions: "188×257mm (4·6배판 양장 · 케이스입)",
      listPrice: 260000,
      salePrice: 200000,
      discountRate: 23,
      rewardPoints: 6000,
      stockQuantity: 24,
      salesCount: 412,
      ratingAvg: 4.96,
      reviewCount: 38,
      mdPick: true,
      bestsellerRank: 1,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "임상 한의사, 한의과대학 재학생, 고전 원전 연구자",
      summary: "후대의 주관적 의역이나 가감을 배제하고 허준 선생의 원문 글자 하나하나를 정밀하게 우리말로 옮긴 정본 동의보감 세트.",
      description: "『현동직역 동의보감』은 허준 선생이 찬집한 『동의보감』 원문을 한 글자의 소홀함도 없이 원형 그대로 우리말로 직역한 정본입니다. 의역으로 인해 흐려지기 쉬운 고전 조문의 본래 취지와 병증 감별 기준을 진료 현장에서 즉시 대조할 수 있도록 구성하였습니다.",
      tableOfContents: "제1권 내경편(內景篇) — 신형·정·기·신·혈·몽·성음·언어·진액·담음·오장육부·포·충·소변·대변\n제2권 외형편(外形篇) — 두·면·이·목·구설·아치·인후·경항·배·흉·유·복·제·요·협·피·육·맥·근·골·수·족·모발·전음·후음\n제3권 잡병편 1(雜病篇 一) — 천지운기·심병·변증·진맥·용약·토·한·하·풍·한·서·습·조·화·내상·허로·곽란·구토·해수\n제4권 잡병편 2(雜病篇 二) — 적취·부종·창만·소갈·황달·학질·온역·사수·옹저·제창·제상·해독·구급·부인·소아",
      authorBio: "역자 현동(玄同) 김공빈 — 현동한의원 원장, 현동학당 학장. 평생을 『동의보감』 원문 직역과 허준 의학의 본뜻 복원, 맥진·사진 진단 체계 확립 및 후학 양성에 매진하고 있습니다.",
      publisherReview: "조문 하나를 읽더라도 원저자가 왜 이 위치에 이 처방을 두었는지를 묻는 현동학당 강독의 정수가 고스란히 담긴 직역 완간본입니다."
    },
    {
      id: "BK-002",
      isbn13: "9791188421060",
      categoryId: "CLINICAL",
      categoryName: "임상 · 강의집",
      isSet: true,
      setBadge: "전5권 양장 세트",
      title: "현동의감 (玄同醫鑑 · 전5권 세트)",
      subtitle: "현동 김공빈 선생의 동의보감 의론과 실전 임상 체계 집대성",
      hanjaWatermark: "玄同醫鑑",
      coverTheme: "royal-classic",
      author: "현동 김공빈 저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2023-09-10",
      pageCount: 3920,
      dimensions: "188×257mm (양장본 전5권)",
      listPrice: 350000,
      salePrice: 270000,
      discountRate: 23,
      rewardPoints: 8100,
      stockQuantity: 15,
      salesCount: 289,
      ratingAvg: 4.98,
      reviewCount: 29,
      mdPick: true,
      bestsellerRank: 2,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "임상 한의사, 동의보감 심화 연구자",
      summary: "병인병기·사진맥진·장부변증·형상과 처방 선용까지 현동 임상의학의 핵심을 전5권으로 집대성한 대표 저작.",
      description: "수십 년간의 임상 경험과 고전 원전 강독을 결합하여 인체 생리·병리 기전부터 난치 질환의 변증 치료까지 일관된 체계로 서술한 임상 지침서입니다.",
      tableOfContents: "제1권 의론총강 및 정기신 생리병리\n제2권 사진합참과 맥진 실전 운용\n제3권 내경·외형 병증 변증과 처방 기준\n제4권 잡병 심화 치법 및 상한·온병 통섭\n제5권 부인·소아·노인 임상 요결 및 처방 색인",
      authorBio: "현동 김공빈 — 현동한의원 원장, 현동학당 학장.",
      publisherReview: "『동의보감 내경편 강의집』으로 입문한 임상의가 심화 학습을 위해 가장 많이 찾는 대표 전집입니다."
    },
    {
      id: "BK-003",
      isbn13: "9791188421053",
      categoryId: "FORMULA",
      categoryName: "방제 · 처방집",
      isSet: true,
      setBadge: "상·하 2권 세트",
      title: "현동처방집 (상 · 하 세트)",
      subtitle: "병증별 처방 원리 · 가감법 · 복약지도 · 치험례 실무 방제서",
      hanjaWatermark: "處方集",
      coverTheme: "ochre-silk",
      author: "현동 김공빈 저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2022-11-20",
      pageCount: 1640,
      dimensions: "182×257mm (상·하 전2권)",
      listPrice: 170000,
      salePrice: 130000,
      discountRate: 24,
      rewardPoints: 3900,
      stockQuantity: 31,
      salesCount: 356,
      ratingAvg: 4.94,
      reviewCount: 34,
      mdPick: true,
      bestsellerRank: 3,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "진료실 상비 처방 기준서가 필요한 개원 한의사 및 수련의",
      summary: "진료실에서 즉시 펼쳐 확인하는 핵심 처방의 구성 의도, 약재 배합 비율, 체질·병세별 가감법과 복약 지도 총람.",
      description: "단순한 처방 나열을 넘어 유사 처방 간의 감별 포인트와 실제 투약 후 경과 관찰 기준을 명쾌하게 정리한 실전 처방집입니다.",
      tableOfContents: "상권(上卷) — 정기신·혈·담음·오장육부 허실 기본방 및 내경/외형 다빈도 처방 180선\n하권(下卷) — 외감·내상·허로·부인·소아 핵심 처방 170선, 약재 수치 기준 및 가나다 색인",
      authorBio: "현동 김공빈 — 현동한의원 원장, 현동학당 학장.",
      publisherReview: "진료실 책상 가장 가까운 곳에 두고 매일 참조하게 되는 실전 방제학의 정석입니다."
    },
    {
      id: "BK-004",
      isbn13: "9791188421107",
      categoryId: "CLINICAL",
      categoryName: "임상 · 강의집",
      isSet: false,
      setBadge: "",
      title: "동의보감 내경편 (강의집)",
      subtitle: "허준 선생은 어떤 뜻으로 적으셨을까 — 입문자와 임상의를 위한 강독록",
      hanjaWatermark: "內景講義",
      coverTheme: "sumuk-gold",
      author: "현동 김공빈 저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2023-11-16",
      pageCount: 780,
      dimensions: "176×248mm (양장)",
      listPrice: 70000,
      salePrice: 54000,
      discountRate: 23,
      rewardPoints: 1620,
      stockQuantity: 42,
      salesCount: 330,
      ratingAvg: 4.95,
      reviewCount: 41,
      mdPick: true,
      bestsellerRank: 4,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "동의보감 강독 입문자, 한의대생, 기초를 탄탄히 다지려는 한의사",
      summary: "생생한 현장 강의를 바탕으로 내경편의 배열 순서와 임상 적용 원리를 쉽고 깊이 있게 풀어낸 입문 필독서.",
      description: "동의보감 내경편을 처음 펼쳤을 때 막막함을 느끼는 독자들을 위해, 조문 간의 연결고리와 실제 임상 사례를 곁들여 누구나 흐름을 이해할 수 있도록 안내합니다.",
      tableOfContents: "제1강 동의보감 편찬 정신과 내경편을 읽는 눈\n제2강 신형장부도의 임상적 의미\n제3강 정(精)·기(氣)·신(神)의 생리와 병리\n제4강 혈(血)·몽(夢)·진액(津液)·담음(痰飮) 변증\n제5강 오장육부 통론 및 대소변 진찰의 핵심",
      authorBio: "현동 김공빈 — 현동학당 학장.",
      publisherReview: "현동학당 도서를 처음 접하시는 분께 가장 먼저 권해드리는 입문 대표작입니다."
    },
    {
      id: "BK-005",
      isbn13: "9791188421077",
      categoryId: "DIAGNOSIS",
      categoryName: "진단 · 맥진학",
      isSet: false,
      setBadge: "",
      title: "찬도방론맥결집성 (纂圖方論脈訣集成)",
      subtitle: "허준 선생이 왕명으로 교정한 동의보감 맥진의 모태",
      hanjaWatermark: "纂圖脈訣",
      coverTheme: "hanji-taupe",
      author: "고양생 원저 · 허준 교정",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2022-06-12",
      pageCount: 512,
      dimensions: "176×248mm",
      listPrice: 50000,
      salePrice: 38000,
      discountRate: 24,
      rewardPoints: 1140,
      stockQuantity: 19,
      salesCount: 245,
      ratingAvg: 4.91,
      reviewCount: 22,
      mdPick: false,
      bestsellerRank: 5,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정",
      targetReaders: "정통 맥진법을 체득하고자 하는 한의사 및 한의대생",
      summary: "동의보감 맥법의 직접적 뿌리가 된 의서. 진맥 기본자세부터 칠표·팔리·구도맥 도해까지 원문 완벽 직역.",
      description: "선조 14년 허준 선생이 왕명을 받들어 교정한 『찬도방론맥결집성』 전 4권을 정밀 번역하고 맥상 그림을 선명하게 복원하였습니다.",
      tableOfContents: "권1 좌우수배장부부위 · 진맥입식 · 오장기본맥체\n권2 오장육부 평맥과 병맥 · 사시맥법\n권3 칠표맥 · 팔리맥 · 구도맥 도해\n권4 잡병 맥결 · 부인 임신/산후 맥법 · 소아 맥법",
      authorBio: "원교정 허준 / 직역 현동 김공빈",
      publisherReview: "막연했던 손끝의 맥상을 명확한 문장과 그림으로 잡아주는 맥진 교본입니다."
    },
    {
      id: "BK-006",
      isbn13: "9791188421091",
      categoryId: "DIAGNOSIS",
      categoryName: "진단 · 맥진학",
      isSet: false,
      setBadge: "",
      title: "사진심법요결 (四診心法要訣)",
      subtitle: "『의종금감』 핵심 권차 직역 — 망·문·문·절 진단의 표준",
      hanjaWatermark: "四診心法",
      coverTheme: "hanji-taupe",
      author: "오겸 외 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2022-08-25",
      pageCount: 428,
      dimensions: "176×248mm",
      listPrice: 40000,
      salePrice: 31000,
      discountRate: 23,
      rewardPoints: 930,
      stockQuantity: 27,
      salesCount: 214,
      ratingAvg: 4.89,
      reviewCount: 18,
      mdPick: false,
      bestsellerRank: 6,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정",
      targetReaders: "초진 진찰과 진단 체계를 정립하려는 한의사 및 한의대생",
      summary: "한의학 진단의 네 기둥인 망진·문진·문진·절진을 체계적으로 정리한 정통 진단학 직역서.",
      description: "『의종금감』 중 임상 활용도가 가장 높은 「사진심법요결」 원문과 주석을 빠짐없이 직역하여 초진 진찰의 정확도를 높여 줍니다.",
      tableOfContents: "제1장 망진(望診) — 안면 오색·설진 감별\n제2장 문진(聞診) — 성음·호흡·해수 변증\n제3장 문진(問診) — 한열·음식·수면 핵심 문진\n제4장 절진(切診) — 맥진 총괄 및 복진 합참",
      authorBio: "오겸 등 찬 / 현동 김공빈 직역",
      publisherReview: "네 가지 진찰법의 체계를 한 권으로 정리할 수 있는 검증된 고전입니다."
    },
    {
      id: "BK-007",
      isbn13: "9791188421084",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: false,
      setBadge: "",
      title: "난경본의 (難經本義)",
      subtitle: "명의 활수(滑壽) 주석 『팔십일난경』 정밀 직역본",
      hanjaWatermark: "難經本義",
      coverTheme: "sage-paper",
      author: "편작 원저 · 활수 본의",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2022-04-18",
      pageCount: 446,
      dimensions: "176×248mm",
      listPrice: 40000,
      salePrice: 31000,
      discountRate: 23,
      rewardPoints: 930,
      stockQuantity: 16,
      salesCount: 198,
      ratingAvg: 4.92,
      reviewCount: 16,
      mdPick: false,
      bestsellerRank: 7,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정",
      targetReaders: "경락·침구 보사법과 맥학 원리를 탐구하는 연구자 및 한의사",
      summary: "81개 핵심 의학 주제를 문답식으로 규명한 『난경』 최고의 주석서 『난경본의』 완역본.",
      description: "촌구맥법의 기원, 명문과 삼초, 기경팔맥, 오수혈 및 침구 보사법의 원천이 되는 1난~81난 전문과 주석을 충실히 직역하였습니다.",
      tableOfContents: "제1~22난 맥학 총론\n제23~29난 경락 및 기경팔맥\n제30~47난 장부 · 명문삼초\n제48~61난 병증 · 오적\n제62~81난 경혈 및 침법 보사",
      authorBio: "활수 주석 / 현동 김공빈 직역",
      publisherReview: "침구학과 맥진학의 원류를 정확히 꿰뚫게 해 주는 경전 직역서입니다."
    },
    {
      id: "BK-008",
      isbn13: "9791188421114",
      categoryId: "CLINICAL",
      categoryName: "임상 · 강의집",
      isSet: false,
      setBadge: "",
      title: "현동학당 임상증례 토론집",
      subtitle: "실제 내원 환자 진찰 기록 · 변증 과정 · 투약 경과 케이스북",
      hanjaWatermark: "臨床討論",
      coverTheme: "ochre-silk",
      author: "현동학당 임상연구회 편저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2019-02-20",
      pageCount: 540,
      dimensions: "182×257mm",
      listPrice: 50000,
      salePrice: 38000,
      discountRate: 24,
      rewardPoints: 1140,
      stockQuantity: 6,
      salesCount: 176,
      ratingAvg: 4.93,
      reviewCount: 21,
      mdPick: true,
      bestsellerRank: 8,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 (잔여 6부 · 품절임박)",
      targetReaders: "실제 환자의 진단 추론 과정과 치료 경과 분석이 궁금한 임상 한의사",
      summary: "실제 환자 사례를 놓고 여러 한의사가 토론하며 처방을 도출한 생생한 임상 증례 기록집.",
      description: "결과만 나열하는 사례집과 달리, 초진 정보만을 두고 어떻게 원인을 추론하고 처방을 조정해 나갔는지 전 과정을 투명하게 담았습니다.",
      tableOfContents: "제1부 만성피로 및 소화기 질환 증례 8선\n제2부 불면 · 두통 · 자율신경 질환 증례 7선\n제3부 부인과 · 산후 · 갱년기 증례 6선\n제4부 종합 강평 및 진찰 체크리스트",
      authorBio: "현동학당 임상연구회 공동 집필 · 현동 김공빈 감수",
      publisherReview: "마치 세미나실에 함께 앉아 환자를 보듯 임상 사고력을 넓혀 줍니다."
    },
    {
      id: "BK-009",
      isbn13: "9791188421121",
      categoryId: "PHILOSOPHY",
      categoryName: "양생 · 인체생리",
      isSet: false,
      setBadge: "",
      title: "하늘기운을 품고 있는 우리 몸",
      subtitle: "전통 생명철학과 『동의보감』 정기신(精氣神) 인체생리 이야기",
      hanjaWatermark: "天符人身",
      coverTheme: "sage-paper",
      author: "현동 김공빈 저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2021-05-10",
      pageCount: 336,
      dimensions: "152×225mm (신국판)",
      listPrice: 28000,
      salePrice: 21000,
      discountRate: 25,
      rewardPoints: 630,
      stockQuantity: 38,
      salesCount: 165,
      ratingAvg: 4.88,
      reviewCount: 15,
      mdPick: false,
      bestsellerRank: 9,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정",
      targetReaders: "한의학 인체관에 관심 있는 일반 독자 및 한의학 입문자",
      summary: "우리 몸이 자연의 기운과 어떻게 호흡하며 생명을 유지하는지 쉽고 따뜻하게 풀어낸 교양·전문서.",
      description: "전통 철학의 원리와 허준 선생의 『동의보감』 인체관을 하나로 엮어 우리 몸의 생리 원리를 명쾌한 우리말로 설명합니다.",
      tableOfContents: "1부 하늘을 닮은 소우주, 사람의 몸\n2부 생명의 근원 정기신 이야기\n3부 호흡과 음식으로 빚어지는 오장육부의 기운\n4부 병들지 않는 몸의 균형 감각",
      authorBio: "현동 김공빈 저",
      publisherReview: "일반 독자분들도 부담 없이 읽을 수 있는 따뜻한 한의학 인체 교양서입니다."
    },
    {
      id: "BK-010",
      isbn13: "9791188421138",
      categoryId: "PHILOSOPHY",
      categoryName: "양생 · 인체생리",
      isSet: false,
      setBadge: "",
      title: "하늘기운을 닮아가는 우리 몸",
      subtitle: "내 몸 본연의 치유력을 깨우는 동의보감 일상 양생법",
      hanjaWatermark: "性命養生",
      coverTheme: "sage-paper",
      author: "현동 김공빈 저",
      translator: "",
      publisher: "도서출판 물고기",
      publishedDate: "2021-10-04",
      pageCount: 348,
      dimensions: "152×225mm (신국판)",
      listPrice: 28000,
      salePrice: 21000,
      discountRate: 25,
      rewardPoints: 630,
      stockQuantity: 34,
      salesCount: 152,
      ratingAvg: 4.90,
      reviewCount: 14,
      mdPick: false,
      bestsellerRank: 10,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정",
      targetReaders: "올바른 건강 관리와 자연치유 양생법을 실천하려는 독자",
      summary: "질병 치료를 넘어 인체 스스로의 회복력을 기르는 마음가짐·호흡·음식·수면 건강 지침서.",
      description: "일상 속에서 몸과 마음의 균형을 지키고 건강을 회복하는 구체적인 동의보감 양생 실천법을 담았습니다.",
      tableOfContents: "1부 치유의 주체는 내 몸 안의 생명력이다\n2부 마음과 감정의 조율\n3부 사계절 순응 섭생과 음식 치유\n4부 회복을 앞당기는 수면과 호흡의 원리",
      authorBio: "현동 김공빈 저",
      publisherReview: "환자분께 선물하거나 한의원 대기실 비치 도서로도 꾸준히 사랑받는 책입니다."
    },
    {
      id: "BK-011",
      isbn13: "9791188421022",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: false,
      setBadge: "낱권 제1권",
      title: "현동직역 동의보감 — 내경편 (낱권)",
      subtitle: "신형 · 정 · 기 · 신 · 혈 · 오장육부 원문 직역",
      hanjaWatermark: "內景篇",
      coverTheme: "hanji-taupe",
      author: "허준 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2023-03-15",
      pageCount: 860,
      dimensions: "188×257mm (양장)",
      listPrice: 65000,
      salePrice: 50000,
      discountRate: 23,
      rewardPoints: 1500,
      stockQuantity: 20,
      salesCount: 140,
      ratingAvg: 4.95,
      reviewCount: 12,
      mdPick: false,
      bestsellerRank: 11,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "내경편 강독 수강생 및 낱권 구매 희망 독자",
      summary: "현동직역 동의보감 전4권 중 제1권 내경편 낱권 구매용 양장본.",
      description: "인체 내부 생리와 정기신혈, 오장육부, 대소변 각 문을 원문 대조와 함께 정밀 직역한 제1권입니다.",
      tableOfContents: "내경편 권1~권4 전문 (신형 ~ 대변)",
      authorBio: "허준 원저 / 현동 김공빈 직역",
      publisherReview: "정기 강독 과정 교재 및 단권 학습용으로 제공됩니다."
    },
    {
      id: "BK-012",
      isbn13: "9791188421039",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: false,
      setBadge: "낱권 제2권",
      title: "현동직역 동의보감 — 외형편 (낱권)",
      subtitle: "두 · 면 · 이 · 목 · 구치 · 흉복 · 요배 · 사지 질환 직역",
      hanjaWatermark: "外形篇",
      coverTheme: "hanji-taupe",
      author: "허준 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2023-03-15",
      pageCount: 840,
      dimensions: "188×257mm (양장)",
      listPrice: 65000,
      salePrice: 50000,
      discountRate: 23,
      rewardPoints: 1500,
      stockQuantity: 18,
      salesCount: 118,
      ratingAvg: 4.94,
      reviewCount: 9,
      mdPick: false,
      bestsellerRank: 12,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "안이비인후·피부·근골격 질환 연구자 및 강독 수강생",
      summary: "현동직역 동의보감 전4권 중 제2권 외형편 낱권 구매용 양장본.",
      description: "머리부터 발끝까지 인체 부위별 병증과 근본 치료법을 담은 외형편 완역본입니다.",
      tableOfContents: "외형편 권1~권4 전문 (두 ~ 후음)",
      authorBio: "허준 원저 / 현동 김공빈 직역",
      publisherReview: "부위별 통증 및 감각기관 질환 진료 시 명확한 원전 근거를 제시합니다."
    },
    {
      id: "BK-013",
      isbn13: "9791188421046",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: false,
      setBadge: "낱권 제3권",
      title: "현동직역 동의보감 — 잡병편 1 (낱권)",
      subtitle: "운기 · 변증 · 진맥 · 풍한서습조화 · 내상 · 허로 · 해수 직역",
      hanjaWatermark: "雜病篇一",
      coverTheme: "hanji-taupe",
      author: "허준 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2023-03-15",
      pageCount: 890,
      dimensions: "188×257mm (양장)",
      listPrice: 65000,
      salePrice: 50000,
      discountRate: 23,
      rewardPoints: 1500,
      stockQuantity: 14,
      salesCount: 125,
      ratingAvg: 4.95,
      reviewCount: 11,
      mdPick: false,
      bestsellerRank: 13,
      saleStatus: "ON_SALE",
      shippingEta: "오늘 발송 예정 (무료배송)",
      targetReaders: "외감병 및 내상·허로 변증을 심화 학습하려는 한의사",
      summary: "현동직역 동의보감 전4권 중 제3권 잡병편 전반부 낱권 양장본.",
      description: "변증·진맥·용약 총론부터 외감병, 내상, 허로, 해수까지 내과 핵심 영역을 총망라합니다.",
      tableOfContents: "잡병편 권1~권6 전문 (천지운기 ~ 해수)",
      authorBio: "허준 원저 / 현동 김공빈 직역",
      publisherReview: "감기·만성피로·호흡기 질환 진료의 표준 원전입니다."
    },
    {
      id: "BK-014",
      isbn13: "9791188421145",
      categoryId: "DONGEUI",
      categoryName: "동의보감 · 경전",
      isSet: false,
      setBadge: "낱권 제4권",
      title: "현동직역 동의보감 — 잡병편 2 (낱권)",
      subtitle: "적취 · 부종 · 소갈 · 옹저 · 부인 · 소아과 원문 직역",
      hanjaWatermark: "雜病篇二",
      coverTheme: "hanji-taupe",
      author: "허준 원저",
      translator: "현동 김공빈 직역",
      publisher: "도서출판 물고기",
      publishedDate: "2023-03-15",
      pageCount: 890,
      dimensions: "188×257mm (양장)",
      listPrice: 65000,
      salePrice: 50000,
      discountRate: 23,
      rewardPoints: 1500,
      stockQuantity: 0,
      salesCount: 119,
      ratingAvg: 4.93,
      reviewCount: 10,
      mdPick: false,
      bestsellerRank: 14,
      saleStatus: "OUT_OF_STOCK",
      shippingEta: "일시품절 (전4권 세트는 바로 구매 가능)",
      targetReaders: "부인과·소아과 및 대사질환 원전 연구자",
      summary: "현동직역 동의보감 전4권 중 제4권 잡병편 후반부(부인·소아 포함) 낱권 양장본.",
      description: "적취·부종·소갈·황달부터 구급, 부인문, 소아문까지 수록한 완결 권차입니다.",
      tableOfContents: "잡병편 권7~권11 · 부인문 · 소아문 전문",
      authorBio: "허준 원저 / 현동 김공빈 직역",
      publisherReview: "현재 단권 재인쇄 중이며, 전4권 세트 구성은 정상 발송됩니다."
    }
  ].map(function (b) {
    const hash = BOOK_COVER_ASSETS[b.id];
    if (hash) {
      b.coverImage = "https://www.hyundong.co.kr/data/book_img/" + hash + ".jpg";
      b.coverThumb = "https://www.hyundong.co.kr/data/book_img/thumb-" + hash + "_98x142.jpg";
    }
    return b;
  });

  const INITIAL_BANNERS = [
    {
      id: "BN-01",
      position: "HERO",
      positionLabel: "메인 상단 대표 배너",
      eyebrow: "현동학당 · 도서출판 물고기 정본 직역 총서",
      title: "허준 선생의 본뜻을 원문 그대로 옮긴 정통 한의학 경전과 임상 지침서",
      subtitle: "후대의 의역으로 가려진 고전의 문리를 바로잡는 『현동직역 동의보감』부터 맥진·사진법·실전 처방집까지, 출판부에서 직접 검수하여 안전하게 발송합니다.",
      buttonText: "대표 완간세트 살펴보기",
      targetBookId: "BK-001",
      period: "상시 노출",
      active: true
    },
    {
      id: "BN-02",
      position: "TOP_BAR",
      positionLabel: "상단 공지 띠배너",
      eyebrow: "직영 혜택",
      title: "50,000원 이상 무료배송 · 평일 오후 3시 이전 당일발송",
      subtitle: "",
      buttonText: "전체 도서 보기",
      targetBookId: "",
      period: "2026-01-01 ~ 상시",
      active: true
    },
    {
      id: "BN-03",
      position: "PROMO",
      positionLabel: "메인 중간 기획전 배너",
      eyebrow: "한의원 개원 · 진료실 상비 추천",
      title: "진료실 필독 3종 (동의보감 세트 · 현동처방집 · 맥결집성) 직판 최대 24% 할인",
      subtitle: "한의원·학교·연구기관 단체 주문 시 현금영수증(지출증빙) 및 세금계산서 즉시 발행을 지원합니다.",
      buttonText: "처방·진단 도서 보러가기",
      targetBookId: "BK-003",
      period: "2026-11-01 ~ 2026-12-31",
      active: true
    }
  ];

  const INITIAL_NOTICES = [
    {
      id: "NT-01",
      category: "발송안내",
      pinned: true,
      visible: true,
      title: "[안내] 평일 오후 3시 이전 결제/입금 완료 건 당일 택배 발송 안내",
      createdAt: "2026-11-01",
      views: 342,
      content: "안녕하세요, 현동서재(도서출판 물고기)입니다.\n평일 오후 3시 이전에 결제 또는 무통장 입금이 확인된 주문 건은 출판부에서 직접 파손 방지 완충 포장 후 당일 전담 로젠택배(1588-9988)로 발송됩니다.\n50,000원 이상 주문 시 배송비(3,500원)는 무료입니다."
    },
    {
      id: "NT-02",
      category: "신간소식",
      pinned: true,
      visible: true,
      title: "[신간] 『동의보감 내경편 (강의집)』 출간 및 직판 할인 안내",
      createdAt: "2026-10-20",
      views: 518,
      content: "현동 김공빈 선생의 현장 강의를 바탕으로 엮은 『동의보감 내경편 (강의집)』이 출간되었습니다.\n동의보감을 처음 읽는 한의대생과 임상 한의사 선생님들께 가장 먼저 권해드리는 입문서로, 정가 대비 23% 할인된 직판가로 만나보실 수 있습니다."
    },
    {
      id: "NT-03",
      category: "구매혜택",
      pinned: false,
      visible: true,
      title: "한의원 · 대학 도서관 단체 구매 및 세금계산서/지출증빙 발급 안내",
      createdAt: "2026-09-15",
      views: 209,
      content: "한의원 비치용 도서, 스터디 모임, 한의과대학 도서관 납품 등 5권 이상 단체 주문이나 계산서 발행이 필요하신 경우 [1:1 문의] 또는 대표전화(02-974-8545)로 남겨주시면 신속히 처리해 드립니다."
    }
  ];

  const INITIAL_FAQS = [
    {
      id: "FQ-01",
      category: "배송/포장",
      visible: true,
      question: "주문하면 언제 발송되며, 운송장 배송조회는 어디서 확인하나요?",
      answer: "평일 오후 3시 이전 결제(무통장 입금 확인 포함) 건은 당일 출고됩니다. 발송 직후 [주문·배송] 메뉴에 택배사와 운송장 번호가 등록되며, 안내된 택배사 공식 배송조회 페이지 주소에서 운송장 번호로 실시간 위치를 직접 조회하실 수 있습니다. 실결제 금액 50,000원 이상은 무료배송(미만 시 3,500원)입니다."
    },
    {
      id: "FQ-02",
      category: "결제/영수증",
      visible: true,
      question: "한의원 경비 처리용 현금영수증이나 세금계산서 발급이 가능한가요?",
      answer: "네, 가능합니다. 무통장 입금 주문 시 사업자 지출증빙용 현금영수증 또는 전자세금계산서 발행을 모두 지원합니다. 주문 메모 또는 1:1 문의 게시판에 사업자등록번호를 남겨주시면 즉시 처리해 드립니다."
    },
    {
      id: "FQ-03",
      category: "도서구매",
      visible: true,
      question: "『현동직역 동의보감』은 전4권 세트 외에 낱권으로도 살 수 있나요?",
      answer: "네, 내경편·외형편·잡병편1·잡병편2 각 권을 낱권(권당 50,000원)으로도 개별 구매하실 수 있습니다. 다만 전용 보관 케이스는 전4권 세트 구매 시 함께 증정됩니다."
    },
    {
      id: "FQ-04",
      category: "교환/반품",
      visible: true,
      question: "양장본 모서리 파손이나 인쇄 파본이 있으면 어떻게 교환하나요?",
      answer: "수령일로부터 14일 이내에 고객센터(02-974-8545) 또는 1:1 문의에 남겨주시면 왕복 택배비 100% 출판사 부담으로 즉시 새 책으로 교환 발송해 드립니다."
    }
  ];

  const INITIAL_QNAS = [
    {
      id: "QA-204",
      category: "대량구매·영수증",
      status: "WAITING",
      writerName: "최*민 (청담경희한의원)",
      writerId: "dr_choi",
      bookTitle: "현동처방집 (상 · 하 세트)",
      title: "원장실 비치용 3세트 구매 시 전자세금계산서 발행 문의드립니다.",
      question: "안녕하세요. 분원 원장님들과 함께 보려고 현동처방집 상·하 세트 3질과 동의보감 전4권 1질을 무통장 입금으로 주문하려고 합니다. 입금 후 사업자등록증을 어디로 보내드리면 전자세금계산서 발행이 될까요?",
      createdAt: "2026-11-12 11:20",
      answer: "",
      answeredAt: ""
    },
    {
      id: "QA-203",
      category: "재입고문의",
      status: "WAITING",
      writerName: "이*준 (한의대 본과2)",
      writerId: "km_lee24",
      bookTitle: "현동직역 동의보감 — 잡병편 2 (낱권)",
      title: "동의보감 잡병편 2 낱권은 언제쯤 다시 입고되나요?",
      question: "1~3권은 낱권으로 이미 소장하고 있어서 잡병편 2권 단권만 추가 구매하고 싶습니다. 현재 일시품절로 나오는데 재입고 예정일이 궁금합니다!",
      createdAt: "2026-11-12 09:45",
      answer: "",
      answeredAt: ""
    },
    {
      id: "QA-202",
      category: "도서추천",
      status: "ANSWERED",
      writerName: "김*연",
      writerId: "hyundong_stu",
      bookTitle: "동의보감 내경편 (강의집)",
      title: "학당 도서를 처음 읽는데 어떤 순서로 읽으면 좋을까요?",
      question: "본과 진급 전에 방학 동안 동의보감 원문을 제대로 읽어보고 싶습니다. 바로 현동직역 동의보감 4권 세트로 시작해도 될지, 강의집을 먼저 읽는 게 좋을지 추천 부탁드립니다.",
      createdAt: "2026-11-10 16:10",
      answer: "안녕하세요, 현동서재입니다. 처음 시작하신다면 『동의보감 내경편 (강의집)』을 먼저 일독하시어 전체 편찬 흐름과 정기신 생리관을 잡으신 뒤, 『현동직역 동의보감』 원문 대조로 넘어가시는 순서를 가장 추천해 드립니다. 감사합니다.",
      answeredAt: "2026-11-10 17:05"
    },
    {
      id: "QA-201",
      category: "배송문의",
      status: "ANSWERED",
      writerName: "박*수 (본초당한의원)",
      writerId: "busan_clinic",
      bookTitle: "현동의감 (玄同醫鑑 · 전5권 세트)",
      title: "양장 세트라 무게가 꽤 나갈 것 같은데 포장 상태 문의드립니다.",
      question: "지방(부산)에서 주문하는데 5권 양장 세트라 택배 이동 중 모서리가 찌그러지지 않을까 걱정되어 문의 남깁니다.",
      createdAt: "2026-11-09 14:30",
      answer: "원장님 안녕하세요. 도서출판 물고기에서 발송하는 모든 양장 세트는 이중 에어캡 완충재와 두께 강화 전용 박스로 직접 포장하여 출고하고 있습니다. 혹시라도 배송 중 파손이 발생할 경우 100% 새 도서로 즉시 교환해 드리니 안심하고 주문해 주세요.",
      answeredAt: "2026-11-09 15:12"
    }
  ];

  const INITIAL_REVIEWS = [
    {
      id: "RV-101",
      bookId: "BK-001",
      writerId: "dr_jeong82",
      memberMask: "정*훈 (한의사 회원)",
      verifiedBuyer: true,
      helpfulCount: 14,
      rating: 5,
      isBest: true,
      visible: true,
      createdAt: "2026-10-28",
      content: "기존 번역본들은 역자의 주관이 섞인 의역이 많아 한자 원문을 다시 찾아봐야 했는데, 현동직역본은 조문 구조 그대로 직역되어 있어 진료실에서 원문 대조할 때 최고의 정본입니다. 4권 양장 제본과 케이스 마감도 훌륭합니다."
    },
    {
      id: "RV-102",
      bookId: "BK-004",
      writerId: "hyundong_stu",
      memberMask: "김*연 (한의대 회원)",
      verifiedBuyer: true,
      helpfulCount: 11,
      rating: 5,
      isBest: true,
      visible: true,
      createdAt: "2026-11-02",
      content: "동의보감 내경편이 왜 신형-정-기-신 순서로 편찬되었는지 처음 명쾌하게 이해했습니다. 강의록 형태라 술술 읽히면서도 임상 사례가 깊어 입문용으로 강력 추천합니다."
    },
    {
      id: "RV-103",
      bookId: "BK-003",
      writerId: "busan_clinic",
      memberMask: "박*수 (한의사 회원)",
      verifiedBuyer: true,
      helpfulCount: 8,
      rating: 5,
      isBest: false,
      visible: true,
      createdAt: "2026-11-06",
      content: "현동처방집 상·하권은 진료실 책상에 상비해 두고 매일 봅니다. 비슷한 처방끼리 어떤 맥상과 증상에서 갈리는지 가감 기준이 명확해서 큰 도움을 받고 있습니다."
    },
    {
      id: "RV-104",
      bookId: "BK-005",
      writerId: "dr_jeong82",
      memberMask: "정*훈 (한의사 회원)",
      verifiedBuyer: true,
      helpfulCount: 6,
      rating: 5,
      isBest: false,
      visible: true,
      createdAt: "2026-11-09",
      content: "허준 선생님이 교정하신 찬도방론맥결집성 직역본을 구할 수 있어 반갑습니다. 맥상 그림과 설명이 선명해 스터디 교재로 채택했습니다."
    }
  ];

  const INITIAL_MEMBERS = [
    {
      id: "MB-1001",
      loginId: "dr_jeong82",
      name: "정지훈",
      clinicName: "정지훈한의원",
      nameMasked: "정*훈",
      phone: "010-3928-4821",
      phoneMasked: "010-****-4821",
      email: "jhoon82@kmd.or.kr",
      zipCode: "06631",
      address: "서울특별시 서초구 서초대로 314, 3층 정지훈한의원",
      memberGrade: "한의사 회원",
      points: 14500,
      status: "정상",
      joinedAt: "2026-08-14",
      orderCount: 4,
      totalSpent: 642000,
      adminMemo: "정기 강독 수강 원장님 / 세금계산서 상시 발행 요청",
      addresses: [
        {
          id: "ADDR-1001-1",
          addressName: "정지훈한의원 (진료실)",
          recipientName: "정지훈",
          recipientPhone: "010-3928-4821",
          zipCode: "06631",
          addressLine1: "서울특별시 서초구 서초대로 314",
          addressLine2: "3층 정지훈한의원 데스크",
          isDefault: true,
          deliveryMemo: "진료실 데스크에 전달 부탁드립니다"
        },
        {
          id: "ADDR-1001-2",
          addressName: "자택",
          recipientName: "정지훈",
          recipientPhone: "010-3928-4821",
          zipCode: "06540",
          addressLine1: "서울특별시 서초구 반포대로 201",
          addressLine2: "102동 1402호",
          isDefault: false,
          deliveryMemo: "부재 시 경비실 보관 부탁드립니다"
        }
      ]
    },
    {
      id: "MB-1002",
      loginId: "hyundong_stu",
      name: "김서연",
      clinicName: "경희대 한의과대학",
      nameMasked: "김*연",
      phone: "010-8412-7719",
      phoneMasked: "010-****-7719",
      email: "sykim24@kyunghee.ac.kr",
      zipCode: "02447",
      address: "서울특별시 동대문구 경희대로 26, 학생회관 204호",
      memberGrade: "한의대생 회원",
      points: 3800,
      status: "정상",
      joinedAt: "2026-09-22",
      orderCount: 2,
      totalSpent: 116000,
      adminMemo: "본과 학술동아리 총무",
      addresses: [
        {
          id: "ADDR-1002-1",
          addressName: "경희대학교 (학생회관)",
          recipientName: "김서연",
          recipientPhone: "010-8412-7719",
          zipCode: "02447",
          addressLine1: "서울특별시 동대문구 경희대로 26",
          addressLine2: "학생회관 204호",
          isDefault: true,
          deliveryMemo: "부재 시 경비실 보관 요청"
        }
      ]
    },
    {
      id: "MB-1003",
      loginId: "busan_clinic",
      name: "박현수",
      clinicName: "본초당한의원",
      nameMasked: "박*수",
      phone: "010-5231-1190",
      phoneMasked: "010-****-1190",
      email: "bonchodang@naver.com",
      zipCode: "48059",
      address: "부산광역시 해운대구 센텀중앙로 90, 센텀메디컬 502호",
      memberGrade: "한의사 회원",
      points: 19200,
      status: "정상",
      joinedAt: "2026-10-03",
      orderCount: 3,
      totalSpent: 580000,
      adminMemo: "오전 시간대 배송 선호",
      addresses: [
        {
          id: "ADDR-1003-1",
          addressName: "본초당한의원 (진료실)",
          recipientName: "박현수",
          recipientPhone: "010-5231-1190",
          zipCode: "48059",
          addressLine1: "부산광역시 해운대구 센텀중앙로 90",
          addressLine2: "센텀메디컬 502호",
          isDefault: true,
          deliveryMemo: "오전 진료시간 내 배송 요망"
        }
      ]
    },
    {
      id: "MB-1004",
      loginId: "reader_han",
      name: "한도윤",
      clinicName: "",
      nameMasked: "한*윤",
      phone: "010-7734-2091",
      phoneMasked: "010-****-2091",
      email: "doyoon.han@daum.net",
      zipCode: "03080",
      address: "서울특별시 종로구 대학로 84, 402호",
      memberGrade: "일반 회원",
      points: 2000,
      status: "정상",
      joinedAt: "2026-10-29",
      orderCount: 1,
      totalSpent: 42000,
      adminMemo: "양생 도서 관심 독자",
      addresses: [
        {
          id: "ADDR-1004-1",
          addressName: "자택",
          recipientName: "한도윤",
          recipientPhone: "010-7734-2091",
          zipCode: "03080",
          addressLine1: "서울특별시 종로구 대학로 84",
          addressLine2: "402호",
          isDefault: true,
          deliveryMemo: "문 앞에 놓아주세요"
        }
      ]
    }
  ];

  const INITIAL_ORDERS = [
    {
      orderNo: "ORD-20261112-0044",
      orderedAt: "2026-11-12 13:20",
      memberLoginId: "dr_jeong82",
      buyerName: "정지훈",
      recipientName: "정지훈 (정지훈한의원)",
      recipientPhone: "010-3928-4821",
      zipCode: "06631",
      address: "서울특별시 서초구 서초대로 314, 3층 정지훈한의원",
      deliveryMemo: "진료실 데스크에 전달 부탁드립니다",
      paymentMethod: "무통장입금 (입금확인 완료)",
      orderStatus: "PAID",
      shipmentStatus: "READY",
      carrierCode: "",
      carrierName: "",
      trackingNumber: "",
      shippedAt: "",
      items: [
        { bookId: "BK-003", title: "현동처방집 (상 · 하 세트)", price: 130000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-ca0b3aee64077e65e0adb6eb22b70b4c_98x142.jpg" }
      ],
      bookTotal: 130000,
      shippingFee: 0,
      finalAmount: 130000
    },
    {
      orderNo: "ORD-20261112-0043",
      orderedAt: "2026-11-12 11:40",
      memberLoginId: "hyundong_stu",
      buyerName: "김서연",
      recipientName: "김서연",
      recipientPhone: "010-8412-7719",
      zipCode: "02447",
      address: "서울특별시 동대문구 경희대로 26, 학생회관 204호",
      deliveryMemo: "부재 시 경비실 보관 요청",
      paymentMethod: "신용·체크카드 결제",
      orderStatus: "PAID",
      shipmentStatus: "READY",
      carrierCode: "",
      carrierName: "",
      trackingNumber: "",
      shippedAt: "",
      items: [
        { bookId: "BK-004", title: "동의보감 내경편 (강의집)", price: 54000, qty: 1, coverThumb: "" }
      ],
      bookTotal: 54000,
      shippingFee: 0,
      finalAmount: 54000
    },
    {
      orderNo: "ORD-20261112-0042",
      orderedAt: "2026-11-12 09:15",
      memberLoginId: "dr_jeong82",
      buyerName: "정지훈",
      recipientName: "정지훈 (정지훈한의원)",
      recipientPhone: "010-3928-4821",
      zipCode: "06631",
      address: "서울특별시 서초구 서초대로 314, 3층 정지훈한의원",
      deliveryMemo: "양장 서적 파손주의 부탁드립니다",
      paymentMethod: "무통장입금 (기업은행)",
      orderStatus: "SHIPPED",
      shipmentStatus: "WAYBILL_ISSUED",
      carrierCode: "LOGEN",
      carrierName: "로젠택배",
      trackingNumber: "9812-4019-2831",
      shippedAt: "2026-11-12 12:10",
      items: [
        { bookId: "BK-001", title: "현동직역 동의보감 (전4권 세트)", price: 200000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-f8acbeb82b22954e6897fd398e90d166_98x142.jpg" },
        { bookId: "BK-005", title: "찬도방론맥결집성 (纂圖方論脈訣集成)", price: 38000, qty: 1, coverThumb: "" }
      ],
      bookTotal: 238000,
      shippingFee: 0,
      usedPoints: 0,
      earnedPoints: 7140,
      taxProof: "현금영수증 (지출증빙: 214-92-01842)",
      finalAmount: 238000
    },
    {
      orderNo: "ORD-20261110-0039",
      orderedAt: "2026-11-10 14:05",
      memberLoginId: "busan_clinic",
      buyerName: "박현수",
      recipientName: "박현수 (본초당한의원)",
      recipientPhone: "010-5231-1190",
      zipCode: "48059",
      address: "부산광역시 해운대구 센텀중앙로 90, 센텀메디컬 502호",
      deliveryMemo: "오전 진료시간 내 배송 요망",
      paymentMethod: "무통장입금 (기업은행)",
      orderStatus: "SHIPPED",
      shipmentStatus: "WAYBILL_ISSUED",
      carrierCode: "LOGEN",
      carrierName: "로젠택배",
      trackingNumber: "9812-5813-9024",
      shippedAt: "2026-11-10 15:20",
      items: [
        { bookId: "BK-002", title: "현동의감 (玄同醫鑑 · 전5권 세트)", price: 270000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-c37779d6cb61ab076e571d6692bbcbaf_98x142.jpg" },
        { bookId: "BK-003", title: "현동처방집 (상 · 하 세트)", price: 130000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-ca0b3aee64077e65e0adb6eb22b70b4c_98x142.jpg" }
      ],
      bookTotal: 400000,
      shippingFee: 0,
      finalAmount: 400000
    },
    {
      orderNo: "ORD-20261108-0035",
      orderedAt: "2026-11-08 16:40",
      memberLoginId: "reader_han",
      buyerName: "한도윤",
      recipientName: "한도윤",
      recipientPhone: "010-7734-2091",
      zipCode: "03080",
      address: "서울특별시 종로구 대학로 84, 402호",
      deliveryMemo: "문 앞에 놓아주세요",
      paymentMethod: "신용·체크카드 결제",
      orderStatus: "SHIPPED",
      shipmentStatus: "WAYBILL_ISSUED",
      carrierCode: "LOGEN",
      carrierName: "로젠택배",
      trackingNumber: "9812-7741-1902",
      shippedAt: "2026-11-08 17:10",
      items: [
        { bookId: "BK-009", title: "하늘기운을 품고 있는 우리 몸", price: 21000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-a6aa1a5777026f60187f930a23dde246_98x142.jpg" },
        { bookId: "BK-010", title: "하늘기운을 닮아가는 우리 몸", price: 21000, qty: 1, coverThumb: "https://www.hyundong.co.kr/data/book_img/thumb-f4ecc02632764e3e1379378205fd9f67_98x142.jpg" }
      ],
      bookTotal: 42000,
      shippingFee: 3500,
      finalAmount: 45500
    }
  ];

  const INITIAL_SITE_CONFIG = {
    mallName: "현동서재 (현동학당 · 도서출판 물고기)",
    ceoName: "김공빈",
    csPhone: "02-974-8545",
    csHours: "평일 09:30 ~ 17:30 (점심 12:30~13:30 / 주말·공휴일 휴무)",
    bankAccount: "기업은행 380-043327-04-013 (예금주: 도서출판 물고기 김공빈)",
    address: "서울특별시 중랑구 신내로 25가길 2, 현동빌딩 503호",
    freeShippingThreshold: 50000,
    baseShippingFee: 3500,
    cutoffNotice: "평일 오후 3시 이전 결제/입금 확인 시 당일 출고"
  };

  const INITIAL_TERMS = {
    serviceTerms: {
      title: "서비스 이용약관 (필수)",
      updatedAt: "2026-10-01",
      content: "제1조 (목적)\n이 약관은 도서출판 물고기(이하 '회사')가 운영하는 현동서재 온라인 서점에서 제공하는 도서 구매 및 관련 서비스의 이용 조건과 절차를 규정함을 목적으로 합니다.\n\n제2조 (회원가입 및 계정 관리)\n1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의함으로써 회원가입을 신청합니다.\n2. 회원은 등록사항에 변경이 있는 경우 마이페이지 또는 고객센터를 통해 수정할 수 있습니다.\n\n제3조 (주문 및 배송)\n1. 회사는 결제(무통장 입금 확인 포함) 완료 후 영업일 기준 1~2일 이내에 도서를 발송합니다.\n2. 천재지변 또는 일시 품절 사유 발생 시 지체 없이 사유를 안내하고 환불 또는 재입고 일정을 고지합니다."
    },
    privacyPolicy: {
      title: "개인정보 수집 및 이용 동의 (필수)",
      updatedAt: "2026-10-01",
      content: "1. 수집하는 개인정보 항목\n- 회원가입 시: 아이디, 비밀번호, 이름, 휴대폰 번호, 이메일 주소, 회원 구분\n- 도서 주문 시: 수령인 성명, 연락처, 배송지 주소, 결제 및 현금영수증 정보\n\n2. 수집 및 이용 목적\n- 도서 주문 접수, 택배 발송, 배송 조회 안내 및 고객 상담 응대\n- 구매 적립금 부여 및 세금계산서/영수증 발급 처리\n\n3. 보유 및 이용 기간\n- 회원 탈퇴 시 지체 없이 파기합니다. 단, 전자상거래 등에서의 소비자보호에 관한 법률에 따라 계약·결제 및 배송 기록은 5년간 안전하게 보관 후 파기합니다."
    },
    shippingPolicy: {
      title: "배송 · 교환 · 반품 안내",
      updatedAt: "2026-10-15",
      content: "· 발송 택배사: 로젠택배 (고객센터 1588-9988) (서울 중랑구 현동학당 출판부 직접 검수 발송)\n· 운송장 배송조회: 도서 발송 시 [주문·배송] 화면에 로젠택배 운송장 번호가 등록되며, 로젠택배 공식 배송조회 웹페이지(https://www.ilogen.com/web/personal/tkSearch)에서 고객님이 직접 상세 배송 현황을 조회하실 수 있습니다.\n· 배송비 안내: 실결제 금액 50,000원 이상 무료배송 (50,000원 미만 시 3,500원)\n· 출고 마감: 평일 오후 3시 이전 입금·결제 완료 건 당일 발송\n· 교환 및 반품: 인쇄 파본·낙장 또는 배송 중 파손 발견 시 수령일로부터 14일 이내 100% 출판사 부담 새 책 교환 (단순 변심 반품은 미개봉 새 책 상태에 한해 수령 후 7일 이내 가능)"
    }
  };

  const ANALYTICS_SERIES = {
    daily7: [
      { label: "11/06(금)", sales: 680000, orders: 6 },
      { label: "11/07(토)", sales: 420000, orders: 4 },
      { label: "11/08(일)", sales: 510000, orders: 5 },
      { label: "11/09(월)", sales: 940000, orders: 9 },
      { label: "11/10(화)", sales: 1120000, orders: 11 },
      { label: "11/11(수)", sales: 860000, orders: 8 },
      { label: "11/12(오늘)", sales: 1290000, orders: 12 }
    ],
    monthly6: [
      { label: "6월", sales: 14200000, orders: 134 },
      { label: "7월", sales: 15800000, orders: 149 },
      { label: "8월", sales: 17900000, orders: 168 },
      { label: "9월", sales: 19400000, orders: 182 },
      { label: "10월", sales: 21600000, orders: 205 },
      { label: "11월(현재)", sales: 24800000, orders: 231 }
    ]
  };

  function normalizeBooks(books, codeGroups) {
    if (!Array.isArray(books)) return [];
    const mockState = { codeGroups: codeGroups || INITIAL_CODE_GROUPS };
    return books.map(function (b) {
      const next = Object.assign({}, b);
      if (!next.bookTypeCode) {
        next.bookTypeCode = next.isSet ? "SET" : "SINGLE";
      }
      next.isSet = next.bookTypeCode !== "SINGLE";
      next.categoryName = getCodeLabel(mockState, "BOOK_CATEGORY", next.categoryId, next.categoryName);
      next.bookTypeName = getCodeLabel(mockState, "BOOK_TYPE", next.bookTypeCode, next.isSet ? "전집 · 세트 상품" : "단권 도서");
      return next;
    });
  }

  function createDefaultState() {
    const codeGroups = JSON.parse(JSON.stringify(INITIAL_CODE_GROUPS));
    return {
      codeGroups: codeGroups,
      books: normalizeBooks(JSON.parse(JSON.stringify(INITIAL_BOOKS)), codeGroups),
      banners: JSON.parse(JSON.stringify(INITIAL_BANNERS)),
      notices: JSON.parse(JSON.stringify(INITIAL_NOTICES)),
      faqs: JSON.parse(JSON.stringify(INITIAL_FAQS)),
      qnas: JSON.parse(JSON.stringify(INITIAL_QNAS)),
      reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
      members: JSON.parse(JSON.stringify(INITIAL_MEMBERS)),
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
      siteConfig: JSON.parse(JSON.stringify(INITIAL_SITE_CONFIG)),
      terms: JSON.parse(JSON.stringify(INITIAL_TERMS)),
      analytics: JSON.parse(JSON.stringify(ANALYTICS_SERIES)),
      cart: [
        { bookId: "BK-004", qty: 1, checked: true },
        { bookId: "BK-006", qty: 1, checked: true }
      ],
      recentBookIds: ["BK-001", "BK-003", "BK-004"],
      recentKeywords: ["동의보감", "처방집", "맥결집성"],
      restockAlerts: [],
      wishlist: ["BK-001", "BK-003"],
      currentUser: {
        loggedIn: true,
        loginId: "dr_jeong82",
        name: "정지훈",
        nameMasked: "정*훈",
        grade: "한의사 회원"
      },
      adminSession: {
        loggedIn: true,
        adminId: "admin",
        adminName: "출판부 총괄관리자"
      }
    };
  }

  function normalizeOrders(orders) {
    if (!Array.isArray(orders)) return [];
    return orders.map(function (o) {
      const next = Object.assign({}, o);
      if (next.orderStatus === "DELIVERED" || next.orderStatus === "PREPARING_SHIPMENT") {
        next.orderStatus = next.trackingNumber ? "SHIPPED" : "PAID";
      }
      if (next.trackingNumber && next.orderStatus !== "CANCELED") {
        next.orderStatus = "SHIPPED";
        next.shipmentStatus = "WAYBILL_ISSUED";
      }
      if (next.orderStatus === "SHIPPED") {
        next.carrierCode = "LOGEN";
        next.carrierName = "로젠택배";
        if (next.trackingNumber && (next.trackingNumber.startsWith("6482") || next.trackingNumber.startsWith("68901"))) {
          next.trackingNumber = "9812-" + next.trackingNumber.replace(/\D/g, "").slice(-8).padStart(8, "0").replace(/(\d{4})(\d{4})/, "$1-$2");
        }
      }
      if (Array.isArray(next.items)) {
        next.items = next.items.map(function (it) {
          const itemCopy = Object.assign({}, it);
          if (itemCopy.coverThumb === undefined || itemCopy.coverThumb === null) {
            const assetKey = BOOK_COVER_ASSETS[itemCopy.bookId];
            if (assetKey) {
              itemCopy.coverThumb = "https://www.hyundong.co.kr/data/book_img/thumb-" + assetKey + "_98x142.jpg";
            }
          }
          return itemCopy;
        });
      }
      delete next.trackingEvents;
      return next;
    });
  }

  function normalizeMembers(members) {
    if (!Array.isArray(members)) return [];
    return members.map(function (m) {
      const next = Object.assign({}, m);
      if (!Array.isArray(next.addresses)) {
        const initM = INITIAL_MEMBERS.find(function (im) { return im.id === next.id || im.loginId === next.loginId; });
        if (initM && Array.isArray(initM.addresses) && initM.addresses.length > 0) {
          next.addresses = JSON.parse(JSON.stringify(initM.addresses));
        } else {
          next.addresses = [
            {
              id: "ADDR-" + (next.id || "1001").replace(/\D/g, "") + "-1",
              addressName: "기본 배송지",
              recipientName: next.name || "수령인",
              recipientPhone: next.phone || "010-0000-0000",
              zipCode: next.zipCode || "06631",
              addressLine1: next.address || "서울특별시 서초구 서초대로 314",
              addressLine2: "",
              isDefault: true,
              deliveryMemo: "부재 시 경비실에 맡겨주세요"
            }
          ];
        }
      }
      if (!Array.isArray(next.pointHistory)) {
        next.pointHistory = [
          {
            id: "PT-" + (next.id || "1001") + "-1",
            date: next.joinedAt || "2026-09-01",
            delta: 2000,
            balance: Number(next.points || 2000),
            reason: "신규 회원 가입 축하 적립금",
            orderNo: "-"
          }
        ];
        if (Number(next.points || 0) > 2000) {
          next.pointHistory.unshift({
            id: "PT-" + (next.id || "1001") + "-2",
            date: "2026-11-12",
            delta: Number(next.points) - 2000,
            balance: Number(next.points),
            reason: "직판 도서 구매 적립 (3%)",
            orderNo: next.loginId === "dr_jeong82" ? "ORD-20261112-0042" : "-"
          });
        }
      }
      return next;
    });
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createDefaultState();
        saveState(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      const defaults = createDefaultState();
      const merged = Object.assign(defaults, parsed);
      if (!Array.isArray(merged.codeGroups) || merged.codeGroups.length === 0) {
        merged.codeGroups = JSON.parse(JSON.stringify(INITIAL_CODE_GROUPS));
      }
      merged.books = normalizeBooks(merged.books, merged.codeGroups);
      merged.orders = normalizeOrders(merged.orders);
      merged.members = normalizeMembers(merged.members);
      if (Array.isArray(merged.banners)) {
        merged.banners.forEach(function (bn) {
          if (
            bn.id === "BN-02" &&
            bn.position === "TOP_BAR" &&
            bn.title === "도서출판 물고기 직영몰 · 50,000원 이상 구매 시 무료배송 (평일 오후 3시 이전 주문 당일 발송)"
          ) {
            bn.eyebrow = "직영 혜택";
            bn.title = "50,000원 이상 무료배송 · 평일 오후 3시 이전 당일발송";
          }
        });
      }
      return merged;
    } catch (e) {
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage quota errors
    }
  }

  function resetState() {
    const fresh = createDefaultState();
    saveState(fresh);
    return fresh;
  }

  function formatKRW(num) {
    return Number(num || 0).toLocaleString("ko-KR") + "원";
  }

  function getOrderStatusLabel(orderStatus) {
    const map = {
      PAID: "입금완료/발송대기",
      PREPARING_SHIPMENT: "입금완료/발송대기",
      SHIPPED: "발송완료",
      DELIVERED: "발송완료",
      CANCELED: "주문 취소"
    };
    return map[orderStatus] || "입금완료/발송대기";
  }

  function getOrderStatusBadge(orderStatus) {
    if (orderStatus === "SHIPPED") return "badge-success";
    if (orderStatus === "CANCELED") return "badge-danger";
    return "badge-warning";
  }

  function getMemberAddresses(memberId) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberId || m.loginId === memberId;
    });
    if (!member || !Array.isArray(member.addresses)) return [];
    return member.addresses.slice();
  }

  let addressCounter = 0;

  function addMemberAddress(memberId, addressData) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberId || m.loginId === memberId;
    });
    if (!member) return { success: false, message: "회원을 찾을 수 없습니다." };
    if (!Array.isArray(member.addresses)) member.addresses = [];

    const isFirst = member.addresses.length === 0;
    const shouldBeDefault = Boolean(addressData.isDefault || isFirst);

    if (shouldBeDefault) {
      member.addresses.forEach(function (a) { a.isDefault = false; });
    }

    addressCounter = (addressCounter + 1) % 100000;
    const numId = (member.id || "1001").replace(/\D/g, "") || "1001";
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const newId = "ADDR-" + numId + "-" + Date.now().toString(36) + "-" + addressCounter + "-" + randSuffix;

    const newAddr = {
      id: newId,
      addressName: String(addressData.addressName || "배송지").trim(),
      recipientName: String(addressData.recipientName || "").trim(),
      recipientPhone: String(addressData.recipientPhone || "").trim(),
      zipCode: String(addressData.zipCode || "").trim(),
      addressLine1: String(addressData.addressLine1 || "").trim(),
      addressLine2: String(addressData.addressLine2 || "").trim(),
      isDefault: shouldBeDefault,
      deliveryMemo: String(addressData.deliveryMemo || "").trim()
    };

    member.addresses.push(newAddr);
    saveState(state);
    return { success: true, message: "배송지가 등록되었습니다.", address: newAddr, addresses: member.addresses };
  }

  function updateMemberAddress(memberId, addressId, addressData) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberId || m.loginId === memberId;
    });
    if (!member || !Array.isArray(member.addresses)) return { success: false, message: "회원을 찾을 수 없습니다." };
    const target = member.addresses.find(function (a) { return a.id === addressId; });
    if (!target) return { success: false, message: "배송지를 찾을 수 없습니다." };

    if (addressData.isDefault) {
      member.addresses.forEach(function (a) { a.isDefault = false; });
      target.isDefault = true;
    } else if (target.isDefault && member.addresses.length > 1) {
      target.isDefault = true;
    }

    if (addressData.addressName != null) target.addressName = String(addressData.addressName).trim();
    if (addressData.recipientName != null) target.recipientName = String(addressData.recipientName).trim();
    if (addressData.recipientPhone != null) target.recipientPhone = String(addressData.recipientPhone).trim();
    if (addressData.zipCode != null) target.zipCode = String(addressData.zipCode).trim();
    if (addressData.addressLine1 != null) target.addressLine1 = String(addressData.addressLine1).trim();
    if (addressData.addressLine2 != null) target.addressLine2 = String(addressData.addressLine2).trim();
    if (addressData.deliveryMemo != null) target.deliveryMemo = String(addressData.deliveryMemo).trim();

    saveState(state);
    return { success: true, message: "배송지 정보가 수정되었습니다.", address: target, addresses: member.addresses };
  }

  function deleteMemberAddress(memberId, addressId) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberId || m.loginId === memberId;
    });
    if (!member || !Array.isArray(member.addresses)) return { success: false, message: "회원을 찾을 수 없습니다." };
    const idx = member.addresses.findIndex(function (a) { return a.id === addressId; });
    if (idx === -1) return { success: false, message: "배송지를 찾을 수 없습니다." };
    const target = member.addresses[idx];
    if (target.isDefault && member.addresses.length > 1) {
      return { success: false, message: "기본 배송지는 삭제할 수 없습니다. 다른 배송지를 기본으로 지정한 후 삭제해 주세요." };
    }
    member.addresses.splice(idx, 1);
    saveState(state);
    return { success: true, message: "배송지가 삭제되었습니다.", addresses: member.addresses };
  }

  function setDefaultMemberAddress(memberId, addressId) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberId || m.loginId === memberId;
    });
    if (!member || !Array.isArray(member.addresses)) return { success: false, message: "회원을 찾을 수 없습니다." };
    member.addresses.forEach(function (a) {
      a.isDefault = (a.id === addressId);
    });
    saveState(state);
    return { success: true, message: "기본 배송지로 설정되었습니다.", addresses: member.addresses };
  }

  function maskKoreanName(name) {
    const clean = String(name || "").trim();
    if (clean.length <= 1) return clean;
    return clean.charAt(0) + "*" + clean.slice(2);
  }

  function maskPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length >= 10) {
      return digits.slice(0, 3) + "-****-" + digits.slice(-4);
    }
    return "010-****-0000";
  }

  // 이미지 로드 실패 시 썸네일 -> 전통 표지 그래픽으로 자동 폴백
  if (typeof window !== "undefined") {
    window.addEventListener("error", function (e) {
      const img = e.target;
      if (!img || img.tagName !== "IMG" || !img.classList.contains("book-real-img")) return;
      const fallback = img.getAttribute("data-fallback");
      if (fallback && img.getAttribute("src") !== fallback) {
        img.setAttribute("src", fallback);
        return;
      }
      img.style.display = "none";
      const wrap = img.closest(".has-real-photo");
      if (wrap) wrap.classList.remove("has-real-photo");
    }, true);
  }

  function renderBookCoverHTML(book) {
    const setRibbon = book.setBadge
      ? `<span class="book-set-ribbon">${escapeHtml(book.setBadge)}</span>`
      : "";
    const topLabelStyle = book.setBadge ? ' style="visibility:hidden;"' : "";
    const subAuthor = book.translator
      ? `${escapeHtml(book.author)} · ${escapeHtml(book.translator)}`
      : escapeHtml(book.author);
    const primarySrc = book.coverImage || book.coverThumb || "";
    const fallbackSrc = book.coverThumb || "";
    const hasPhotoClass = primarySrc ? " has-real-photo" : "";
    const realImgTag = primarySrc
      ? `<img class="book-real-img" src="${escapeHtml(primarySrc)}" data-fallback="${escapeHtml(fallbackSrc)}" alt="${escapeHtml(book.title)} 표지" />`
      : "";

    return `
      <div class="book-cover-art${hasPhotoClass}" data-theme="${escapeHtml(book.coverTheme || "hanji-taupe")}">
        ${setRibbon}
        ${realImgTag}
        <span class="book-cover-hanja-watermark" aria-hidden="true">${escapeHtml(book.hanjaWatermark || "玄同")}</span>
        <div class="book-cover-top"${topLabelStyle}>현동학당 학술총서</div>
        <div class="book-cover-center">
          <div class="book-cover-title">${escapeHtml(book.title.replace(/\s*\(.*?\)\s*$/, ""))}</div>
          <div class="book-cover-sub">
            <span>${subAuthor}</span>
            <span class="book-cover-seal">玄同</span>
          </div>
        </div>
        <div class="book-cover-bottom">
          <span>${escapeHtml(book.publisher)}</span>
          <span>정본직역</span>
        </div>
      </div>
    `;
  }

  // 관리기 도서 목록 코드 왼쪽용 소형 실제 책 표지 썸네일
  function renderBookThumbHTML(book) {
    const thumbSrc = (book.coverImage && book.coverImage.indexOf("data:image/") === 0)
      ? book.coverImage
      : (book.coverThumb || book.coverImage || "");
    const fallbackSrc = book.coverImage || "";
    const hasPhotoClass = thumbSrc ? " has-real-photo" : "";
    const imgTag = thumbSrc
      ? `<img class="book-real-img" src="${escapeHtml(thumbSrc)}" data-fallback="${escapeHtml(fallbackSrc)}" alt="${escapeHtml(book.title)} 표지" loading="lazy" />`
      : "";
    return `
      <div class="admin-book-thumb${hasPhotoClass}" title="${escapeHtml(book.title)}">
        ${imgTag}
        <span class="admin-book-thumb-fallback">${escapeHtml((book.hanjaWatermark || book.title || "冊").slice(0, 2))}</span>
      </div>
    `;
  }

  // 웹 에디터 작성 HTML 안전 정제 (스크립트/이벤트 속성 차단, 서식 유지)
  function sanitizeRichHtml(dirtyHtml) {
    if (!dirtyHtml) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(dirtyHtml), "text/html");
    doc.querySelectorAll("script, iframe, object, embed, link, meta, style").forEach(function (el) {
      el.remove();
    });
    doc.body.querySelectorAll("*").forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        const name = attr.name.toLowerCase();
        const val = String(attr.value || "").trim().toLowerCase();
        if (name.indexOf("on") === 0) {
          el.removeAttribute(attr.name);
        } else if ((name === "href" || name === "src") && val.indexOf("javascript:") === 0) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    let container = document.getElementById("globalToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "globalToastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const item = document.createElement("div");
    item.className = "toast toast-item";
    item.setAttribute("data-toast", "true");
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () {
      item.remove();
    }, 3000);
  }

  const POPULAR_KEYWORDS = [
    "동의보감",
    "맥결집성",
    "현동처방집",
    "내경편 강의집",
    "난경본의",
    "하늘기운"
  ];

  const POSTCODE_DIRECTORY = [
    { zipCode: "06631", roadAddr: "서울특별시 서초구 서초대로 314", jibunAddr: "서울특별시 서초구 서초동 1675-5", building: "서초메디컬빌딩" },
    { zipCode: "06540", roadAddr: "서울특별시 서초구 반포대로 201", jibunAddr: "서울특별시 서초구 반포동 59-4", building: "반포센트럴타워" },
    { zipCode: "06134", roadAddr: "서울특별시 강남구 테헤란로 124", jibunAddr: "서울특별시 강남구 역삼동 823-1", building: "강남메디컬타워" },
    { zipCode: "02447", roadAddr: "서울특별시 동대문구 경희대로 26", jibunAddr: "서울특별시 동대문구 회기동 1", building: "경희대학교 한의과대학" },
    { zipCode: "02847", roadAddr: "서울특별시 동대문구 약령중앙로 26", jibunAddr: "서울특별시 동대문구 제기동 1082", building: "서울한방진흥센터 (약령시)" },
    { zipCode: "02054", roadAddr: "서울특별시 중랑구 신내로 25가길 2", jibunAddr: "서울특별시 중랑구 신내동 654", building: "현동빌딩 (현동학당)" },
    { zipCode: "03080", roadAddr: "서울특별시 종로구 대학로 84", jibunAddr: "서울특별시 종로구 동숭동 1-45", building: "혜화아카데미빌딩" },
    { zipCode: "13529", roadAddr: "경기도 성남시 분당구 판교역로 152", jibunAddr: "경기도 성남시 분당구 백현동 537", building: "알파돔타워" },
    { zipCode: "14348", roadAddr: "경기도 광명시 일직로 43", jibunAddr: "경기도 광명시 일직동 511", building: "광명메디컬센터" },
    { zipCode: "26339", roadAddr: "강원특별자치도 원주시 상지대길 83", jibunAddr: "강원특별자치도 원주시 우산동 660", building: "상지대학교 한의과대학" },
    { zipCode: "35235", roadAddr: "대전광역시 서구 둔산로 100", jibunAddr: "대전광역시 서구 둔산동 1420", building: "둔산클리닉빌딩" },
    { zipCode: "34520", roadAddr: "대전광역시 동구 대학로 62", jibunAddr: "대전광역시 동구 용운동 96-3", building: "대전대학교 한의과대학" },
    { zipCode: "42102", roadAddr: "대구광역시 수성구 달구벌대로 2410", jibunAddr: "대구광역시 수성구 범어동 177-1", building: "범어메디컬스퀘어" },
    { zipCode: "38458", roadAddr: "경상북도 경산시 한의대로 1", jibunAddr: "경상북도 경산시 유곡동 290", building: "대구한의대학교" },
    { zipCode: "48059", roadAddr: "부산광역시 해운대구 센텀중앙로 90", jibunAddr: "부산광역시 해운대구 재송동 1209", building: "센텀메디컬빌딩" },
    { zipCode: "47227", roadAddr: "부산광역시 부산진구 양정로 52", jibunAddr: "부산광역시 부산진구 양정동 455", building: "동의대학교 양정캠퍼스" },
    { zipCode: "61452", roadAddr: "광주광역시 동구 필문대로 309", jibunAddr: "광주광역시 동구 서석동 375", building: "광주한의학관" },
    { zipCode: "54538", roadAddr: "전북특별자치도 익산시 익산대로 460", jibunAddr: "전북특별자치도 익산시 신동 344-2", building: "원광대학교 한의과대학" },
    { zipCode: "58245", roadAddr: "전라남도 나주시 한빛로 1", jibunAddr: "전라남도 나주시 대호동 252", building: "동신대학교 한의과대학" },
    { zipCode: "63243", roadAddr: "제주특별자치도 제주시 연삼로 473", jibunAddr: "제주특별자치도 제주시 이도이동 1978", building: "제주메디컬빌딩" }
  ];

  function recordRecentBook(bookId) {
    if (!bookId) return;
    const state = loadState();
    const list = Array.isArray(state.recentBookIds) ? state.recentBookIds.slice() : [];
    const filtered = list.filter(function (id) { return id !== bookId; });
    filtered.unshift(bookId);
    state.recentBookIds = filtered.slice(0, 8);
    saveState(state);
  }

  function getRecentBooks(customState) {
    const state = customState || loadState();
    const ids = Array.isArray(state.recentBookIds) ? state.recentBookIds : [];
    const books = Array.isArray(state.books) ? state.books : [];
    return ids
      .map(function (id) { return books.find(function (b) { return b.id === id; }); })
      .filter(Boolean);
  }

  function addRecentKeyword(keyword) {
    const kw = String(keyword || "").trim();
    if (!kw) return;
    const state = loadState();
    const list = Array.isArray(state.recentKeywords) ? state.recentKeywords.slice() : [];
    const filtered = list.filter(function (item) { return item !== kw; });
    filtered.unshift(kw);
    state.recentKeywords = filtered.slice(0, 8);
    saveState(state);
  }

  function removeRecentKeyword(keyword) {
    const state = loadState();
    state.recentKeywords = (state.recentKeywords || []).filter(function (k) { return k !== keyword; });
    saveState(state);
  }

  function clearRecentKeywords() {
    const state = loadState();
    state.recentKeywords = [];
    saveState(state);
  }

  function adjustMemberPoints(memberKey, delta, reason, orderNo) {
    const state = loadState();
    const member = (state.members || []).find(function (m) {
      return m.id === memberKey || m.loginId === memberKey;
    });
    if (!member) return { success: false, balance: 0 };
    const amount = Math.trunc(Number(delta) || 0);
    if (amount === 0) return { success: true, balance: Number(member.points || 0) };
    const nextBalance = Math.max(0, Number(member.points || 0) + amount);
    member.points = nextBalance;
    if (!Array.isArray(member.pointHistory)) member.pointHistory = [];
    const nowStr = new Date().toISOString().slice(0, 10);
    member.pointHistory.unshift({
      id: "PT-" + Date.now().toString(36) + "-" + Math.floor(100 + Math.random() * 900),
      date: nowStr,
      delta: amount,
      balance: nextBalance,
      reason: String(reason || (amount > 0 ? "적립금 지급" : "적립금 사용")),
      orderNo: orderNo || "-"
    });
    saveState(state);
    return { success: true, balance: nextBalance };
  }

  function openPostcodeModal(onSelect) {
    if (typeof document === "undefined") return;
    let backdrop = document.getElementById("globalPostcodeModal");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "globalPostcodeModal";
      backdrop.className = "modal-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-labelledby", "globalPostcodeTitle");
      backdrop.innerHTML = `
        <div class="modal-panel" style="max-width:560px;">
          <div class="modal-head">
            <h2 class="modal-title" id="globalPostcodeTitle">우편번호 · 도로명 주소 검색</h2>
            <button type="button" class="modal-close-btn" id="btnClosePostcodeModal" aria-label="닫기">&times;</button>
          </div>
          <div class="modal-body" style="padding-top:14px;">
            <form id="globalPostcodeSearchForm" style="display:flex; gap:8px; margin-bottom:12px;">
              <input type="search" class="form-input" id="globalPostcodeQuery" placeholder="도로명, 건물명, 지역명 입력 (예: 서초대로, 경희대, 해운대)" style="flex:1;" />
              <button type="submit" class="btn btn-primary" style="flex-shrink:0;">검색</button>
            </form>
            <div style="font-size:0.8rem; color:var(--color-text-muted); margin-bottom:10px;">
              검색 결과를 클릭하면 우편번호와 기본주소가 자동 입력됩니다. 목록에 없는 주소도 검색어로 바로 적용할 수 있습니다.
            </div>
            <div id="globalPostcodeResults" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop || e.target.closest("#btnClosePostcodeModal")) {
          backdrop.classList.remove("is-open");
        }
      });
    }

    const queryInput = document.getElementById("globalPostcodeQuery");
    const resultsEl = document.getElementById("globalPostcodeResults");
    const formEl = document.getElementById("globalPostcodeSearchForm");

    function renderPostcodeList(q) {
      const clean = String(q || "").trim().toLowerCase();
      const matched = POSTCODE_DIRECTORY.filter(function (row) {
        if (!clean) return true;
        return (
          row.zipCode.indexOf(clean) !== -1 ||
          row.roadAddr.toLowerCase().indexOf(clean) !== -1 ||
          row.jibunAddr.toLowerCase().indexOf(clean) !== -1 ||
          row.building.toLowerCase().indexOf(clean) !== -1
        );
      });

      let html = matched.map(function (row, idx) {
        return `
          <button type="button" class="postcode-result-item" data-pc-idx="${idx}" data-zip="${escapeHtml(row.zipCode)}" data-road="${escapeHtml(row.roadAddr)}" data-bldg="${escapeHtml(row.building)}">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;">
              <span class="badge badge-brand" style="font-family:ui-monospace,monospace;">${escapeHtml(row.zipCode)}</span>
              <span style="font-size:0.78rem; color:var(--color-brand-700); font-weight:600;">선택 →</span>
            </div>
            <div style="font-weight:700; color:var(--color-brand-900); font-size:0.9rem; margin-top:4px; text-align:left;">
              ${escapeHtml(row.roadAddr)} ${row.building ? "(" + escapeHtml(row.building) + ")" : ""}
            </div>
            <div style="font-size:0.78rem; color:var(--color-text-muted); text-align:left;">[지번] ${escapeHtml(row.jibunAddr)}</div>
          </button>
        `;
      }).join("");

      if (clean && matched.length === 0) {
        const customZip = String(10000 + (clean.length * 3713) % 80000).padStart(5, "0");
        html = `
          <button type="button" class="postcode-result-item" data-zip="${customZip}" data-road="${escapeHtml(String(q).trim())}" data-bldg="">
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
              <span class="badge badge-brand">${customZip}</span>
              <span style="font-size:0.78rem; color:var(--color-brand-700); font-weight:600;">입력 주소로 바로 적용 →</span>
            </div>
            <div style="font-weight:700; color:var(--color-brand-900); font-size:0.9rem; margin-top:4px; text-align:left;">
              ${escapeHtml(String(q).trim())}
            </div>
            <div style="font-size:0.78rem; color:var(--color-text-muted); text-align:left;">직접 입력한 도로명/지번 주소를 적용합니다.</div>
          </button>
        `;
      }
      resultsEl.innerHTML = html;
    }

    formEl.onsubmit = function (e) {
      e.preventDefault();
      renderPostcodeList(queryInput.value);
    };
    queryInput.oninput = function () {
      renderPostcodeList(queryInput.value);
    };
    resultsEl.onclick = function (e) {
      const item = e.target.closest(".postcode-result-item");
      if (!item) return;
      const zip = item.getAttribute("data-zip") || "";
      const road = item.getAttribute("data-road") || "";
      const bldg = item.getAttribute("data-bldg") || "";
      const fullRoad = bldg ? (road + " (" + bldg + ")") : road;
      backdrop.classList.remove("is-open");
      if (typeof onSelect === "function") {
        onSelect({ zipCode: zip, roadAddress: fullRoad, baseRoad: road, building: bldg });
      }
    };

    queryInput.value = "";
    renderPostcodeList("");
    backdrop.classList.add("is-open");
    setTimeout(function () { queryInput.focus(); }, 40);
  }

  function openOrderReceiptModal(orderNo) {
    if (typeof document === "undefined") return;
    const state = loadState();
    const order = (state.orders || []).find(function (o) { return o.orderNo === orderNo; });
    if (!order) {
      showToast("주문 내역을 찾을 수 없습니다.");
      return;
    }
    const cfg = state.siteConfig || INITIAL_SITE_CONFIG;
    let backdrop = document.getElementById("globalReceiptModal");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "globalReceiptModal";
      backdrop.className = "modal-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop || e.target.closest("[data-close-receipt]")) {
          backdrop.classList.remove("is-open");
        }
      });
    }
    const itemsRows = (order.items || []).map(function (it) {
      return `
        <tr>
          <td style="padding:8px 10px; border-bottom:1px solid var(--color-border);">${escapeHtml(it.title)}</td>
          <td style="padding:8px 10px; border-bottom:1px solid var(--color-border); text-align:center;">${Number(it.qty || 1)}권</td>
          <td style="padding:8px 10px; border-bottom:1px solid var(--color-border); text-align:right;">${formatKRW(Number(it.price || 0) * Number(it.qty || 1))}</td>
        </tr>
      `;
    }).join("");

    backdrop.innerHTML = `
      <div class="modal-panel" style="max-width:600px;">
        <div class="modal-head">
          <h2 class="modal-title">거래명세서 · 구매 영수증</h2>
          <button type="button" class="modal-close-btn" data-close-receipt="true" aria-label="닫기">&times;</button>
        </div>
        <div class="modal-body" id="printableReceiptBody">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; padding-bottom:12px; border-bottom:2px solid var(--color-brand-800); margin-bottom:14px;">
            <div>
              <div style="font-size:0.78rem; color:var(--color-brand-700); font-weight:700;">공급자 · 직영 출판사</div>
              <strong style="font-family:var(--font-serif); font-size:1.1rem; color:var(--color-brand-900);">도서출판 물고기 (현동서재)</strong>
              <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">대표 ${escapeHtml(cfg.ceoName)} | 사업자번호 204-91-84021 | Tel ${escapeHtml(cfg.csPhone)}</div>
              <div style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHtml(cfg.address)}</div>
            </div>
            <div style="text-align:right;">
              <span class="badge ${getOrderStatusBadge(order.orderStatus)}">${escapeHtml(getOrderStatusLabel(order.orderStatus))}</span>
              <div style="font-size:0.82rem; font-weight:700; margin-top:6px;">${escapeHtml(order.orderNo)}</div>
              <div style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHtml(order.orderedAt)}</div>
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:0.86rem; margin-bottom:14px;">
            <thead>
              <tr style="background:var(--color-brand-50);">
                <th style="padding:8px 10px; text-align:left; border-bottom:1px solid var(--color-border-strong);">도서명</th>
                <th style="padding:8px 10px; text-align:center; width:68px; border-bottom:1px solid var(--color-border-strong);">수량</th>
                <th style="padding:8px 10px; text-align:right; width:110px; border-bottom:1px solid var(--color-border-strong);">합계</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <div style="background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:12px 14px; font-size:0.86rem; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between;"><span>도서 상품 합계</span><strong>${formatKRW(order.bookTotal)}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>배송비 (로젠택배)</span><strong>${Number(order.shippingFee || 0) === 0 ? "무료" : formatKRW(order.shippingFee)}</strong></div>
            ${Number(order.usedPoints || 0) > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--color-seal);"><span>적립금 할인</span><strong>-${Number(order.usedPoints).toLocaleString()}P</strong></div>` : ""}
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--color-border-strong); padding-top:8px; font-size:1rem;">
              <strong>최종 결제 금액</strong>
              <strong style="color:var(--color-seal);">${formatKRW(order.finalAmount)}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">
              결제수단: ${escapeHtml(order.paymentMethod || "-")}
              ${order.taxProof ? ` | 증빙: ${escapeHtml(order.taxProof)}` : ""}
            </div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary);">
              수령인: ${escapeHtml(order.recipientName)} | 배송지: (${escapeHtml(order.zipCode)}) ${escapeHtml(order.address)}
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-outline" data-close-receipt="true">닫기</button>
          <button type="button" class="btn btn-primary" id="btnPrintReceiptNow">인쇄 / PDF 저장</button>
        </div>
      </div>
    `;
    const printBtn = backdrop.querySelector("#btnPrintReceiptNow");
    if (printBtn) {
      printBtn.onclick = function () { window.print(); };
    }
    backdrop.classList.add("is-open");
  }

  function enableHorizontalDragScroll(scrollEl, railEl) {
    if (!scrollEl || scrollEl.dataset.dragBound === "1") {
      updateRailShadows(scrollEl, railEl);
      return;
    }
    scrollEl.dataset.dragBound = "1";

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    function syncShadows() {
      updateRailShadows(scrollEl, railEl);
    }

    scrollEl.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScrollLeft = scrollEl.scrollLeft;
      scrollEl.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 6) {
        dragged = true;
      }
      if (dragged) {
        scrollEl.scrollLeft = startScrollLeft - dx;
        syncShadows();
      }
    });

    window.addEventListener("mouseup", function () {
      if (!isDown) return;
      isDown = false;
      scrollEl.classList.remove("is-dragging");
      setTimeout(function () { dragged = false; }, 0);
    });

    scrollEl.addEventListener("click", function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    }, true);

    scrollEl.addEventListener("wheel", function (e) {
      if (scrollEl.scrollWidth <= scrollEl.clientWidth + 2) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        const prev = scrollEl.scrollLeft;
        scrollEl.scrollLeft += e.deltaY;
        if (scrollEl.scrollLeft !== prev) {
          e.preventDefault();
          syncShadows();
        }
      }
    }, { passive: false });

    scrollEl.addEventListener("scroll", syncShadows, { passive: true });
    window.addEventListener("resize", syncShadows);
    syncShadows();
  }

  function updateRailShadows(scrollEl, railEl) {
    if (!scrollEl || !railEl) return;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    railEl.classList.toggle("has-scroll-left", scrollEl.scrollLeft > 6);
    railEl.classList.toggle("has-scroll-right", maxScroll - scrollEl.scrollLeft > 6);
  }

  function bindSearchSuggest(formEl, inputEl, targetSelectEl, onKeywordSelect) {
    if (!formEl || !inputEl || formEl.dataset.suggestBound === "1") return;
    formEl.dataset.suggestBound = "1";
    formEl.style.position = "relative";

    const pop = document.createElement("div");
    pop.className = "search-suggest-popover";
    pop.setAttribute("role", "listbox");
    formEl.appendChild(pop);

    function renderSuggest() {
      const state = loadState();
      const q = String(inputEl.value || "").trim();
      const qLower = q.toLowerCase();

      if (!q) {
        const recents = Array.isArray(state.recentKeywords) ? state.recentKeywords : [];
        pop.innerHTML = `
          <div class="suggest-section">
            <div class="suggest-head">
              <span>최근 검색어</span>
              ${recents.length ? `<button type="button" class="suggest-clear-btn" data-clear-recent-kw="true">전체삭제</button>` : ""}
            </div>
            ${recents.length ? `
              <div class="suggest-chip-wrap">
                ${recents.map(function (kw) {
                  return `<span class="suggest-kw-pill"><button type="button" data-pick-kw="${escapeHtml(kw)}">${escapeHtml(kw)}</button><button type="button" class="suggest-kw-del" data-del-kw="${escapeHtml(kw)}" aria-label="${escapeHtml(kw)} 삭제">&times;</button></span>`;
                }).join("")}
              </div>
            ` : `<div class="suggest-empty">최근 검색 내역이 없습니다.</div>`}
          </div>
          <div class="suggest-section" style="border-top:1px solid var(--color-border); padding-top:10px; margin-top:10px;">
            <div class="suggest-head"><span>추천 학술 키워드</span></div>
            <div class="suggest-chip-wrap">
              ${POPULAR_KEYWORDS.map(function (kw, i) {
                return `<button type="button" class="suggest-pop-chip" data-pick-kw="${escapeHtml(kw)}"><strong>${i + 1}</strong> ${escapeHtml(kw)}</button>`;
              }).join("")}
            </div>
          </div>
        `;
      } else {
        const books = (state.books || []).filter(function (b) {
          if (b.saleStatus === "HIDDEN") return false;
          const hay = [b.title, b.subtitle, b.author, b.translator, b.isbn13, b.categoryName].join(" ").toLowerCase();
          return hay.indexOf(qLower) !== -1;
        }).slice(0, 5);

        pop.innerHTML = `
          <div class="suggest-section">
            <div class="suggest-head"><span>도서 바로가기 (${books.length}건)</span></div>
            ${books.length ? `
              <div class="suggest-book-list">
                ${books.map(function (b) {
                  return `
                    <a href="./book-detail.html?id=${encodeURIComponent(b.id)}" class="suggest-book-row">
                      <div class="suggest-book-info">
                        <strong>${escapeHtml(b.title)}</strong>
                        <span>${escapeHtml(b.author)} | ${formatKRW(b.salePrice)}</span>
                      </div>
                      <span class="badge badge-brand" style="flex-shrink:0;">상세 →</span>
                    </a>
                  `;
                }).join("")}
              </div>
            ` : `<div class="suggest-empty">'${escapeHtml(q)}' 일치 도서가 없습니다. Enter를 눌러 통합검색하세요.</div>`}
          </div>
        `;
      }
    }

    inputEl.addEventListener("focus", function () {
      renderSuggest();
      pop.classList.add("is-open");
    });

    inputEl.addEventListener("input", function () {
      renderSuggest();
      pop.classList.add("is-open");
    });

    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        pop.classList.remove("is-open");
      } else if (e.key === "Enter") {
        pop.classList.remove("is-open");
      }
    });

    pop.addEventListener("mousedown", function (e) {
      // Prevent input blur before click handler runs
      if (e.target.closest("button, a")) {
        e.preventDefault();
      }
    });

    pop.addEventListener("click", function (e) {
      const clearBtn = e.target.closest("[data-clear-recent-kw]");
      if (clearBtn) {
        clearRecentKeywords();
        renderSuggest();
        return;
      }
      const delBtn = e.target.closest("[data-del-kw]");
      if (delBtn) {
        removeRecentKeyword(delBtn.getAttribute("data-del-kw"));
        renderSuggest();
        return;
      }
      const pickBtn = e.target.closest("[data-pick-kw]");
      if (pickBtn) {
        const kw = pickBtn.getAttribute("data-pick-kw") || "";
        inputEl.value = kw;
        addRecentKeyword(kw);
        pop.classList.remove("is-open");
        if (typeof onKeywordSelect === "function") {
          onKeywordSelect(kw, targetSelectEl ? targetSelectEl.value : "ALL");
        } else {
          const targetVal = targetSelectEl ? targetSelectEl.value : "ALL";
          window.location.href = "./index.html?view=catalog&keyword=" + encodeURIComponent(kw) + "&searchTarget=" + encodeURIComponent(targetVal);
        }
      }
    });

    document.addEventListener("click", function (e) {
      if (!formEl.contains(e.target)) {
        pop.classList.remove("is-open");
      }
    });
  }

  function mountQuickFloatingBar() {
    if (typeof document === "undefined") return;
    const isAdminOrAuth = Boolean(
      document.querySelector(".admin-shell") ||
      document.querySelector(".auth-page-wrap") ||
      window.location.pathname.indexOf("admin") !== -1
    );
    if (isAdminOrAuth) return;

    let quickEl = document.getElementById("storeQuickFloating");
    if (!quickEl) {
      quickEl = document.createElement("aside");
      quickEl.id = "storeQuickFloating";
      quickEl.className = "store-quick-floating";
      quickEl.setAttribute("aria-label", "빠른 도구 모음");
      document.body.appendChild(quickEl);
    }

    function renderQuick() {
      const recents = getRecentBooks();
      const isOpen = quickEl.classList.contains("is-drawer-open");
      quickEl.innerHTML = `
        <div class="quick-recent-popover ${isOpen ? "is-open" : ""}" id="quickRecentPopover">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--color-border);">
            <strong style="font-size:0.84rem; color:var(--color-brand-900);">최근 본 도서 (${recents.length})</strong>
            <button type="button" class="suggest-clear-btn" data-close-quick-recent="true">닫기</button>
          </div>
          ${recents.length ? `
            <div style="display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto;">
              ${recents.slice(0, 5).map(function (b) {
                return `
                  <a href="./book-detail.html?id=${encodeURIComponent(b.id)}" class="quick-recent-item">
                    <span class="quick-recent-title">${escapeHtml(b.title)}</span>
                    <span class="quick-recent-price">${formatKRW(b.salePrice)}</span>
                  </a>
                `;
              }).join("")}
            </div>
          ` : `<div style="font-size:0.8rem; color:var(--color-text-muted); padding:10px 0;">최근 열람한 도서가 없습니다.</div>`}
        </div>
        <div class="quick-fab-stack">
          <button type="button" class="quick-fab-btn" id="btnToggleQuickRecent" title="최근 본 도서">
            <span>최근</span>
            <strong class="quick-fab-count">${recents.length}</strong>
          </button>
          <button type="button" class="quick-fab-btn quick-fab-top" id="btnQuickScrollTop" aria-label="맨 위로 이동" title="맨 위로">
            ↑ TOP
          </button>
        </div>
      `;
    }

    if (quickEl.dataset.bound !== "1") {
      quickEl.dataset.bound = "1";
      quickEl.addEventListener("click", function (e) {
        if (e.target.closest("#btnToggleQuickRecent")) {
          quickEl.classList.toggle("is-drawer-open");
          renderQuick();
          return;
        }
        if (e.target.closest("[data-close-quick-recent]")) {
          quickEl.classList.remove("is-drawer-open");
          renderQuick();
          return;
        }
        if (e.target.closest("#btnQuickScrollTop")) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      document.addEventListener("click", function (e) {
        if (!quickEl.contains(e.target) && quickEl.classList.contains("is-drawer-open")) {
          quickEl.classList.remove("is-drawer-open");
          renderQuick();
        }
      });
    }
    renderQuick();
  }

  const HEADER_SVG_ICONS = {
    menu: '<span class="menu-bars-icon" aria-hidden="true"></span>',
    search: '<svg class="header-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/></svg>',
    cart: '<svg class="header-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12l-1 12H7L6 7.5z"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/></svg>',
    user: '<svg class="header-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/></svg>',
    order: '<svg class="header-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>'
  };

  // 전 스토어 페이지 공통 헤더·유틸바·1줄 슬라이드 GNB·모바일드로어·푸터 동기화
  function syncStoreShell(options) {
    if (typeof document === "undefined") return;
    const opts = options || {};
    const state = opts.state || loadState();
    const isSPA = Boolean(opts.isSPA);
    const pathname = (window.location.pathname || "").toLowerCase();
    const isCsPage = /\/(notice|faq|inquiry|qna)\.html$/.test(pathname);
    const cfg = state.siteConfig || INITIAL_SITE_CONFIG;

    // 1. 레거시 상단 시연 바 제거 시에도 초기화 기능 바인딩 지원
    const demoRight = document.querySelector(".demo-switcher-actions, .demo-switcher-links");
    if (demoRight && !document.getElementById("btnResetDemo")) {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "demo-switch-link";
      resetBtn.id = "btnResetDemo";
      resetBtn.textContent = "초기화";
      resetBtn.addEventListener("click", function () {
        resetState();
        showToast("모든 화면 데이터가 초기 상태로 복원되었습니다.");
        setTimeout(function () { window.location.reload(); }, 250);
      });
      demoRight.appendChild(resetBtn);
    }

    // 2. 전 구간 1줄 상단 유틸리티 바 (TOP_BAR 배너 + 간결 계정 링크 + 고객센터 드롭다운)
    const topBanner = (state.banners || []).find(function (b) { return b.position === "TOP_BAR" && b.active; });
    const topRibbonEl = document.getElementById("topRibbonText");
    if (topRibbonEl) {
      topRibbonEl.textContent = topBanner
        ? `${topBanner.eyebrow ? "[" + topBanner.eyebrow + "] " : ""}${topBanner.title}`
        : `${Number(cfg.freeShippingThreshold || 50000).toLocaleString()}원 이상 무료배송 · 평일 오후 3시 이전 당일발송`;
    }

    const authLinksEl = document.getElementById("pcAuthUtilLinks");
    if (authLinksEl) {
      const curMember = state.currentUser && state.currentUser.loggedIn
        ? (state.members || []).find(function (m) { return m.loginId === state.currentUser.loginId; })
        : null;
      const ptsText = curMember ? ` (${Number(curMember.points || 0).toLocaleString()}P)` : "";

      const csDropdownHTML = `
        <div class="util-cs-dropdown" id="utilCsDropdown">
          <button type="button" class="store-util-btn util-cs-trigger ${isCsPage ? "is-active" : ""}" id="btnUtilCsTrigger" aria-expanded="false" aria-haspopup="true">
            고객센터 ▾
          </button>
          <div class="util-cs-menu" id="utilCsMenu" role="menu">
            <a href="./notice.html" role="menuitem">공지사항</a>
            <a href="./faq.html" role="menuitem">자주 묻는 질문 (FAQ)</a>
            <a href="./inquiry.html" role="menuitem">1:1 문의하기</a>
            <a href="./qna.html" role="menuitem">독자 Q&amp;A</a>
            <a href="./shipping-guide.html" role="menuitem">출고 · 배송 안내</a>
          </div>
        </div>
      `;

      if (state.currentUser && state.currentUser.loggedIn) {
        const userBadgeHTML = isSPA
          ? `<button type="button" class="store-util-btn util-user-badge" data-nav="mypage" title="마이페이지 이동"><strong>${escapeHtml(state.currentUser.name)}</strong>님<small>${escapeHtml(ptsText)}</small></button>`
          : `<a href="./index.html?view=mypage" class="util-user-badge" title="마이페이지 이동"><strong>${escapeHtml(state.currentUser.name)}</strong>님<small>${escapeHtml(ptsText)}</small></a>`;

        authLinksEl.innerHTML = `
          ${userBadgeHTML}
          <a href="./login.html" class="store-util-btn">계정전환</a>
          <button type="button" class="store-util-btn" id="${isSPA ? "btnLogout" : "btnStandaloneLogout"}">로그아웃</button>
          ${csDropdownHTML}
          <a href="./admin.html" class="store-util-btn util-admin-link">관리자</a>
        `;
      } else {
        authLinksEl.innerHTML = `
          <a href="./login.html" class="store-util-btn">로그인</a>
          <a href="./signup.html" class="store-util-btn">회원가입</a>
          <a href="./login.html#guest" class="store-util-btn">비회원 주문조회</a>
          ${csDropdownHTML}
          <a href="./admin.html" class="store-util-btn util-admin-link">관리자</a>
        `;
      }

      const csWrap = document.getElementById("utilCsDropdown");
      const csBtn = document.getElementById("btnUtilCsTrigger");
      if (csWrap && csBtn) {
        csBtn.onclick = function (e) {
          e.stopPropagation();
          const open = csWrap.classList.toggle("is-open");
          csBtn.setAttribute("aria-expanded", open ? "true" : "false");
        };
        if (!document.body.dataset.csDocBound) {
          document.body.dataset.csDocBound = "1";
          document.addEventListener("click", function (ev) {
            const openDrop = document.querySelector(".util-cs-dropdown.is-open");
            if (openDrop && !openDrop.contains(ev.target)) {
              openDrop.classList.remove("is-open");
              const trig = openDrop.querySelector(".util-cs-trigger");
              if (trig) trig.setAttribute("aria-expanded", "false");
            }
          });
        }
      }

      const standaloneLogout = document.getElementById("btnStandaloneLogout");
      if (standaloneLogout) {
        standaloneLogout.onclick = function () {
          const latest = loadState();
          latest.currentUser = { loggedIn: false, loginId: "", name: "", nameMasked: "", grade: "" };
          saveState(latest);
          showToast("로그아웃 되었습니다.");
          syncStoreShell(opts);
        };
      }
    }

    // 3. 헤더 로고 심볼·버튼 정리 + GNB 고정 래퍼(.store-sticky-chrome) 정규화
    const headerEl = document.querySelector("header.store-header");
    if (headerEl) {
      // 모든 헤더 내 구형 사각 인장(.brand-seal-mark)을 신규 한약·고서 심볼 로고로 일괄 교체
      headerEl.querySelectorAll(".brand-logo").forEach(function (logoLink) {
        const legacySeal = logoLink.querySelector(".brand-seal-mark");
        if (legacySeal) {
          const img = document.createElement("img");
          img.src = "./images/logo-mark.svg";
          img.alt = "현동서재 로고";
          img.className = "brand-logo-mark";
          img.width = 38;
          img.height = 38;
          legacySeal.replaceWith(img);
        }
      });

      const btnMenuIconEl = document.getElementById("btnMobileMenu");
      if (btnMenuIconEl) {
        btnMenuIconEl.classList.add("header-icon-only");
        btnMenuIconEl.innerHTML = HEADER_SVG_ICONS.menu;
      }

      let gnbEl = document.querySelector("nav.store-gnb");
      if (gnbEl) {
        let stickyWrap = headerEl.closest(".store-sticky-chrome");
        if (!stickyWrap) {
          stickyWrap = document.createElement("div");
          stickyWrap.className = "store-sticky-chrome";
          headerEl.parentNode.insertBefore(stickyWrap, headerEl);
          stickyWrap.appendChild(headerEl);
        }
        if (gnbEl.parentNode !== stickyWrap) {
          stickyWrap.appendChild(gnbEl);
        }
      }

      // 헤더 우측 액션 아이콘 정리 (박스 테두리 제거 · 심플 SVG 아이콘화)
      const actionsEl = headerEl.querySelector(".store-header-actions");
      const cartQty = (state.cart || []).reduce(function (acc, item) { return acc + Number(item.qty || 0); }, 0);
      if (actionsEl && !isSPA) {
        actionsEl.innerHTML = `
          <button type="button" class="header-icon-btn header-icon-only mobile-only-btn" id="btnMobileSearchToggle" aria-label="도서 검색 열기">${HEADER_SVG_ICONS.search}</button>
          <a href="./index.html?view=mypage" class="header-icon-btn pc-wide-only-action" data-nav="addresses" aria-label="마이페이지">
            ${HEADER_SVG_ICONS.user}<span class="header-action-label">마이페이지</span>
          </a>
          <a href="./index.html?view=orders" class="header-icon-btn pc-only-action" data-nav="orders" aria-label="주문·배송">
            ${HEADER_SVG_ICONS.order}<span class="header-action-label">주문·배송</span>
          </a>
          <a href="./index.html?view=cart" class="header-icon-btn" data-nav="cart" aria-label="장바구니">
            ${HEADER_SVG_ICONS.cart}<span class="header-action-label">장바구니</span><span class="count-pill" id="headerCartCount">${cartQty}</span>
          </a>
        `;
      } else if (actionsEl && isSPA) {
        if (!actionsEl.dataset.svgUpgraded) {
          actionsEl.dataset.svgUpgraded = "1";
          actionsEl.innerHTML = `
            <button type="button" class="header-icon-btn header-icon-only mobile-only-btn" id="btnMobileSearchToggle" aria-label="도서 검색">${HEADER_SVG_ICONS.search}</button>
            <button type="button" class="header-icon-btn pc-wide-only-action" data-nav="addresses" aria-label="마이페이지">
              ${HEADER_SVG_ICONS.user}<span class="header-action-label">마이페이지</span>
            </button>
            <button type="button" class="header-icon-btn pc-only-action" data-nav="orders" aria-label="주문·배송">
              ${HEADER_SVG_ICONS.order}<span class="header-action-label">주문·배송</span>
            </button>
            <button type="button" class="header-icon-btn" data-nav="cart" aria-label="장바구니">
              ${HEADER_SVG_ICONS.cart}<span class="header-action-label">장바구니</span><span class="count-pill" id="headerCartCount">${cartQty}</span>
            </button>
          `;
        } else {
          const cartCountEl = document.getElementById("headerCartCount");
          if (cartCountEl) {
            cartCountEl.textContent = String(cartQty);
          }
        }
      }

      if (!document.getElementById("mobileSearchDrawer") && headerEl.querySelector(".store-header-main")) {
        const drawerDiv = document.createElement("div");
        drawerDiv.className = "mobile-search-drawer";
        drawerDiv.id = "mobileSearchDrawer";
        drawerDiv.innerHTML = `
          <form class="store-search-box" id="mobileSearchForm" action="./index.html" method="GET">
            <select class="store-search-select" id="mobileSearchTarget" name="searchTarget" aria-label="모바일 검색 기준">
              <option value="ALL">통합</option>
              <option value="TITLE">도서명</option>
              <option value="AUTHOR">저자</option>
            </select>
            <input type="search" class="store-search-input" id="mobileSearchInput" name="keyword" placeholder="도서명, 저자, 처방명 검색" />
            <button type="submit" class="store-search-submit">검색</button>
          </form>
        `;
        headerEl.appendChild(drawerDiv);
      }

      const btnMobSearch = document.getElementById("btnMobileSearchToggle");
      const mobSearchDrawer = document.getElementById("mobileSearchDrawer");
      if (btnMobSearch && mobSearchDrawer && btnMobSearch.dataset.bound !== "1") {
        btnMobSearch.dataset.bound = "1";
        btnMobSearch.addEventListener("click", function () {
          mobSearchDrawer.classList.toggle("is-open");
          if (mobSearchDrawer.classList.contains("is-open")) {
            const inp = mobSearchDrawer.querySelector("input");
            if (inp) inp.focus();
          }
        });
      }

      // 서브페이지 모바일 햄버거 메뉴 드로어 자동 마운트 및 상태 동기화
      const btnMobMenu = document.getElementById("btnMobileMenu");
      if (btnMobMenu && !document.getElementById("mobileDrawer")) {
        const backdrop = document.createElement("div");
        backdrop.className = "mobile-nav-drawer-backdrop";
        backdrop.id = "mobileDrawerBackdrop";
        const drawer = document.createElement("aside");
        drawer.className = "mobile-nav-drawer";
        drawer.id = "mobileDrawer";
        drawer.setAttribute("aria-label", "모바일 전체 메뉴");
        const cats = getActiveCodes(state, "BOOK_CATEGORY");
        drawer.innerHTML = `
          <div class="mobile-drawer-head">
            <div class="mobile-drawer-brand">
              <img src="./images/logo-mark-light.svg" alt="현동서재 로고" class="brand-logo-mark" width="34" height="34" />
              <div class="mobile-drawer-brand-text">
                <strong style="font-family:var(--font-serif); font-size:1.02rem;">현동서재</strong>
                <div style="font-size:0.76rem; opacity:0.86; margin-top:2px;" id="mobileUserStatusText">
                  ${state.currentUser && state.currentUser.loggedIn ? escapeHtml(state.currentUser.name + "님 로그인 중") : "로그인 후 3% 구매 적립"}
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline" id="btnCloseMobileDrawer" style="background:rgba(255,255,255,0.12); color:#fff; border-color:rgba(255,255,255,0.25); flex-shrink:0;">닫기</button>
          </div>
          <div class="mobile-drawer-body">
            <div style="display:flex; gap:8px; margin-bottom:14px;" id="mobileAuthActionRow">
              ${state.currentUser && state.currentUser.loggedIn
                ? `<a href="./index.html?view=mypage" class="btn btn-sm btn-primary" style="flex:1;">마이페이지</a><a href="./index.html?view=orders" class="btn btn-sm btn-outline" style="flex:1;">주문·배송</a>`
                : `<a href="./login.html" class="btn btn-sm btn-primary" style="flex:1;">로그인</a><a href="./signup.html" class="btn btn-sm btn-outline" style="flex:1;">회원가입</a>`}
            </div>
            <a href="./index.html" class="mobile-drawer-cat-btn"><span>홈 화면</span><span>→</span></a>
            <a href="./index.html?view=catalog" class="mobile-drawer-cat-btn"><span>전체 출간 도서</span><span>→</span></a>
            ${cats.map(function (c) {
              return `<a href="./index.html?view=catalog&cat=${encodeURIComponent(c.code)}" class="mobile-drawer-cat-btn"><span>${escapeHtml(c.name)}</span><span>→</span></a>`;
            }).join("")}
            <div style="border-top:1px solid var(--color-border); margin:14px 0 8px; padding-top:10px;">
              <a href="./index.html?view=cart" class="mobile-drawer-cat-btn"><span>장바구니</span><span>→</span></a>
              <a href="./notice.html" class="mobile-drawer-cat-btn"><span>공지사항</span><span>→</span></a>
              <a href="./faq.html" class="mobile-drawer-cat-btn"><span>자주 묻는 질문 (FAQ)</span><span>→</span></a>
              <a href="./inquiry.html" class="mobile-drawer-cat-btn"><span>1:1 문의하기</span><span>→</span></a>
              <a href="./qna.html" class="mobile-drawer-cat-btn"><span>독자 Q&amp;A</span><span>→</span></a>
              <a href="./shipping-guide.html" class="mobile-drawer-cat-btn"><span>출고 · 배송 안내</span><span>→</span></a>
              <a href="./admin.html" class="mobile-drawer-cat-btn"><span>관리자 센터</span><span>→</span></a>
            </div>
          </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(drawer);
        const closeFn = function () {
          drawer.classList.remove("is-open");
          backdrop.classList.remove("is-open");
        };
        btnMobMenu.addEventListener("click", function () {
          drawer.classList.add("is-open");
          backdrop.classList.add("is-open");
        });
        backdrop.addEventListener("click", closeFn);
        const closeBtn = document.getElementById("btnCloseMobileDrawer");
        if (closeBtn) closeBtn.addEventListener("click", closeFn);
      } else if (!isSPA && document.getElementById("mobileDrawer")) {
        const existingDrawer = document.getElementById("mobileDrawer");
        const existingBackdrop = document.getElementById("mobileDrawerBackdrop");
        const mobStatusEl = document.getElementById("mobileUserStatusText");
        if (mobStatusEl) {
          mobStatusEl.textContent = state.currentUser && state.currentUser.loggedIn
            ? state.currentUser.name + "님 로그인 중"
            : "로그인 후 3% 구매 적립";
        }
        const mobAuthRow = document.getElementById("mobileAuthActionRow");
        if (mobAuthRow) {
          mobAuthRow.innerHTML = state.currentUser && state.currentUser.loggedIn
            ? `<a href="./index.html?view=mypage" class="btn btn-sm btn-primary" style="flex:1;">마이페이지</a><a href="./index.html?view=orders" class="btn btn-sm btn-outline" style="flex:1;">주문·배송</a>`
            : `<a href="./login.html" class="btn btn-sm btn-primary" style="flex:1;">로그인</a><a href="./signup.html" class="btn btn-sm btn-outline" style="flex:1;">회원가입</a>`;
        }
        const mobCatBox = document.getElementById("mobileDrawerCategories");
        if (mobCatBox) {
          const cats = getActiveCodes(state, "BOOK_CATEGORY");
          mobCatBox.innerHTML = `
            <a href="./index.html" class="mobile-drawer-cat-btn"><span>홈 화면</span><span>→</span></a>
            <a href="./index.html?view=catalog" class="mobile-drawer-cat-btn"><span>전체 출간 도서</span><span>→</span></a>
            ${cats.map(function (c) {
              return `<a href="./index.html?view=catalog&cat=${encodeURIComponent(c.code)}" class="mobile-drawer-cat-btn"><span>${escapeHtml(c.name)}</span><span>→</span></a>`;
            }).join("")}
          `;
        }
        if (btnMobMenu && existingDrawer && existingBackdrop && btnMobMenu.dataset.bound !== "1") {
          btnMobMenu.dataset.bound = "1";
          const closeFn = function () {
            existingDrawer.classList.remove("is-open");
            existingBackdrop.classList.remove("is-open");
          };
          btnMobMenu.addEventListener("click", function () {
            existingDrawer.classList.add("is-open");
            existingBackdrop.classList.add("is-open");
          });
          existingBackdrop.addEventListener("click", closeFn);
          const closeBtn = document.getElementById("btnCloseMobileDrawer");
          if (closeBtn) closeBtn.addEventListener("click", closeFn);
        }
      }

      // 검색 자동완성 & 최근/인기 검색어 바인딩
      const pcForm = document.getElementById("pcSearchForm") || headerEl.querySelector(".store-search-box.pc-only-search");
      const pcInput = document.getElementById("pcSearchInput") || (pcForm && pcForm.querySelector(".store-search-input, input[type='search']"));
      const pcSelect = document.getElementById("pcSearchTarget") || (pcForm && pcForm.querySelector(".store-search-select, select"));
      if (pcForm && pcInput) {
        bindSearchSuggest(pcForm, pcInput, pcSelect, opts.onSearchKeyword);
        if (!isSPA && pcForm.dataset.submitBound !== "1") {
          pcForm.dataset.submitBound = "1";
          pcForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const kw = pcInput.value.trim();
            if (kw) addRecentKeyword(kw);
            const tgt = pcSelect ? pcSelect.value : "ALL";
            window.location.href = "./index.html?view=catalog&keyword=" + encodeURIComponent(kw) + "&searchTarget=" + encodeURIComponent(tgt);
          });
        }
      }

      const mobForm = document.getElementById("mobileSearchForm") || (mobSearchDrawer && mobSearchDrawer.querySelector("form"));
      const mobInput = document.getElementById("mobileSearchInput") || (mobForm && mobForm.querySelector(".store-search-input, input[type='search']"));
      const mobSelect = document.getElementById("mobileSearchTarget") || (mobForm && mobForm.querySelector(".store-search-select, select"));
      if (mobForm && mobInput && !isSPA && mobForm.dataset.submitBound !== "1") {
        mobForm.dataset.submitBound = "1";
        mobForm.addEventListener("submit", function (e) {
          e.preventDefault();
          const kw = mobInput.value.trim();
          if (kw) addRecentKeyword(kw);
          const tgt = mobSelect ? mobSelect.value : "ALL";
          window.location.href = "./index.html?view=catalog&keyword=" + encodeURIComponent(kw) + "&searchTarget=" + encodeURIComponent(tgt);
        });
      }
    }

    // 4. 1줄 가로 슬라이드 GNB (도서 탐색 전용 IA + 스크롤바 숨김 + 마우스 드래그 지원)
    const gnbListEl = document.getElementById("pcGnbList") || document.querySelector(".store-gnb-list");
    if (gnbListEl) {
      if (!gnbListEl.id) gnbListEl.id = "pcGnbList";
      const railContainer = gnbListEl.parentElement;
      if (railContainer) railContainer.classList.add("store-gnb-rail");
      const gnbCats = getActiveCodes(state, "BOOK_CATEGORY");

      if (!isSPA) {
        const activeBookCat = opts.activeCategoryId || "";
        gnbListEl.innerHTML = `
          <li><a href="./index.html" class="store-gnb-btn ${opts.activeGnb === "home" ? "is-active" : ""}">홈</a></li>
          <li><a href="./index.html?view=catalog" class="store-gnb-btn ${opts.activeGnb === "catalog" && !activeBookCat ? "is-active" : ""}">전체 도서</a></li>
          ${gnbCats.map(function (c) {
            const isAct = activeBookCat === c.code;
            return `<li><a href="./index.html?view=catalog&cat=${encodeURIComponent(c.code)}" class="store-gnb-btn ${isAct ? "is-active" : ""}">${escapeHtml(c.name)}</a></li>`;
          }).join("")}
          <li><a href="./index.html?view=catalog&sort=BESTSELLER" class="store-gnb-btn">베스트셀러</a></li>
          <li><a href="./index.html?view=catalog&sort=NEWEST" class="store-gnb-btn">신간 도서</a></li>
          <li><a href="./index.html?view=catalog&sets=1" class="store-gnb-btn">전집 · 세트</a></li>
        `;
      }

      enableHorizontalDragScroll(gnbListEl, railContainer);
      const activeBtn = gnbListEl.querySelector(".store-gnb-btn.is-active");
      if (activeBtn && gnbListEl.scrollWidth > gnbListEl.clientWidth) {
        const targetLeft = Math.max(0, activeBtn.offsetLeft - Math.round((gnbListEl.clientWidth - activeBtn.offsetWidth) / 2));
        gnbListEl.scrollLeft = targetLeft;
        updateRailShadows(gnbListEl, railContainer);
      }
    }

    // 5. 푸터 로고 심볼 & 배송비·연락처·데이터 초기화 반영
    const footerBrandCol = document.querySelector(".store-footer .footer-grid > div:first-child");
    if (footerBrandCol && !footerBrandCol.querySelector(".footer-brand-mark") && !isSPA) {
      const firstStrong = footerBrandCol.querySelector("strong");
      if (firstStrong && !firstStrong.closest(".footer-brand-row")) {
        const row = document.createElement("div");
        row.className = "footer-brand-row";
        const markImg = document.createElement("img");
        markImg.src = "./images/logo-mark-light.svg";
        markImg.alt = "현동서재 로고";
        markImg.className = "footer-brand-mark";
        markImg.width = 32;
        markImg.height = 32;
        firstStrong.parentNode.insertBefore(row, firstStrong);
        row.appendChild(markImg);
        row.appendChild(firstStrong);
      }
    }

    const footerCsStrong = document.querySelector(".store-footer .footer-grid > div:nth-child(2) strong");
    if (footerCsStrong && cfg.csPhone) {
      footerCsStrong.textContent = cfg.csPhone;
    }

    const footerCopyBar = document.querySelector(".store-footer .footer-copyright-bar");
    if (footerCopyBar && !isSPA && !footerCopyBar.querySelector("[data-footer-reset]")) {
      const utilSpan = document.createElement("span");
      utilSpan.style.display = "inline-flex";
      utilSpan.style.alignItems = "center";
      utilSpan.style.gap = "10px";
      utilSpan.innerHTML = `
        <a href="./admin.html" style="color:#cbc5b8; text-decoration:none;">관리자 센터</a>
        <span style="opacity:0.35;">|</span>
        <button type="button" data-footer-reset="1" style="background:none; border:none; padding:0; color:#a8a196; font-size:0.78rem; cursor:pointer;">초기 데이터 복원</button>
      `;
      footerCopyBar.appendChild(utilSpan);
      const resetFooterBtn = utilSpan.querySelector("[data-footer-reset]");
      if (resetFooterBtn) {
        resetFooterBtn.onclick = function () {
          resetState();
          showToast("초기 데이터 상태로 복원되었습니다.");
          setTimeout(function () { window.location.reload(); }, 250);
        };
      }
    }

    // 6. 우측 하단 최근 본 도서 + TOP 플로팅 위젯
    mountQuickFloatingBar();
  }

  function syncFooterCopyrightYears() {
    const yr = String(new Date().getFullYear());
    document.querySelectorAll(".js-current-year").forEach(function (el) {
      el.textContent = yr;
    });
    // 서브페이지(book-detail 외 정적 페이지)에서도 자동으로 공통 헤더·GNB·푸터 동기화 실행
    if (document.querySelector("header.store-header") && !document.getElementById("storeMainContent")) {
      syncStoreShell({ isSPA: false });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFooterCopyrightYears);
  } else {
    syncFooterCopyrightYears();
  }

  const HyundongStore = {
    CATEGORIES: CATEGORIES,
    CARRIERS: CARRIERS,
    SAMPLE_COVERS: SAMPLE_COVERS,
    FREE_SHIPPING_THRESHOLD: 50000,
    BASE_SHIPPING_FEE: 3500,
    loadState: loadState,
    saveState: saveState,
    resetState: resetState,
    normalizeBooks: normalizeBooks,
    formatKRW: formatKRW,
    getCodeGroup: getCodeGroup,
    getActiveCodes: getActiveCodes,
    getCodeLabel: getCodeLabel,
    getCategoriesWithAll: getCategoriesWithAll,
    getActiveCarriers: getActiveCarriers,
    getCarrierInfo: getCarrierInfo,
    normalizeTrackingNumber: normalizeTrackingNumber,
    getOrderStatusLabel: getOrderStatusLabel,
    getOrderStatusBadge: getOrderStatusBadge,
    getMemberAddresses: getMemberAddresses,
    addMemberAddress: addMemberAddress,
    updateMemberAddress: updateMemberAddress,
    deleteMemberAddress: deleteMemberAddress,
    setDefaultMemberAddress: setDefaultMemberAddress,
    maskKoreanName: maskKoreanName,
    maskPhone: maskPhone,
    renderBookCoverHTML: renderBookCoverHTML,
    renderBookThumbHTML: renderBookThumbHTML,
    sanitizeRichHtml: sanitizeRichHtml,
    escapeHtml: escapeHtml,
    showToast: showToast,
    POPULAR_KEYWORDS: POPULAR_KEYWORDS,
    POSTCODE_DIRECTORY: POSTCODE_DIRECTORY,
    recordRecentBook: recordRecentBook,
    getRecentBooks: getRecentBooks,
    addRecentKeyword: addRecentKeyword,
    removeRecentKeyword: removeRecentKeyword,
    clearRecentKeywords: clearRecentKeywords,
    adjustMemberPoints: adjustMemberPoints,
    openPostcodeModal: openPostcodeModal,
    openOrderReceiptModal: openOrderReceiptModal,
    enableHorizontalDragScroll: enableHorizontalDragScroll,
    updateRailShadows: updateRailShadows,
    syncStoreShell: syncStoreShell,
    mountQuickFloatingBar: mountQuickFloatingBar
  };

  if (typeof window !== "undefined") {
    window.HyundongStore = HyundongStore;
    window.Store = HyundongStore;
  }
  if (typeof global !== "undefined") {
    global.HyundongStore = HyundongStore;
    global.Store = HyundongStore;
  }
})();

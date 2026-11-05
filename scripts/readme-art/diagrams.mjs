// 프론트 README 그림 정의. 이름(키)은 README의 <!-- diagram: 이름 --> 과 같아야 한다.
// 화면 그림은 실제 배치를 단순화한 와이어프레임. 확인: node scripts/build-readme-art.mjs --png <폴더>

import {
  arrow,
  badgeIcon,
  card,
  chipRow,
  chipWrap,
  icon,
  MUTED,
  step,
  svg,
  text,
  TONES,
  zone,
} from "./kit.mjs";

const W = 960;
const LINE = "#e2e8f0";

// 브라우저 창 틀(위 막대 + 주소)
const frame = (x, y, w, h, address) =>
  [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`,
    `<path d="M${x} ${y + 12} a12 12 0 0 1 12 -12 h${w - 24} a12 12 0 0 1 12 12 v18 h${-w} z" fill="#f1f5f9"/>`,
    `<line x1="${x}" y1="${y + 30}" x2="${x + w}" y2="${y + 30}" stroke="#cbd5e1"/>`,
    ...["#fda4af", "#fcd34d", "#86efac"].map((color, index) => `<circle cx="${x + 16 + index * 13}" cy="${y + 15}" r="4" fill="${color}"/>`),
    `<rect x="${x + 64}" y="${y + 7}" width="${Math.min(260, w - 90)}" height="16" rx="8" fill="#ffffff" stroke="${LINE}"/>`,
    text(x + 74, y + 19, address, { size: 10.5, color: MUTED }),
  ].join("");

// 회색 글줄 막대(내용 자리)
const bar = (x, y, w, color = "#e2e8f0", h = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${color}"/>`;
const box = (x, y, w, h, fill = "#f8fafc", stroke = LINE, rx = 8) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;

// 1. 화면 지도
const screenMap = () => {
  const parts = [
    zone({ x: 30, y: 36, w: 900, h: 70, label: "모든 화면 위: 공통 헤더", tone: "slate", iconName: "PanelLeft" }),
    chipRow(50, 62, ["홈", "메시지", "캘린더(준비 중)", "주소록", "게시판", "관리자 모드", "알림", "내 프로필", "세션 남은 시간", "프로젝트 소개"], "slate"),
    card({ x: 30, y: 140, w: 220, h: 96, tone: "slate", icon: "LogIn", title: "/ 로그인", sub: ["아이디 · 이메일 로그인", "로그인 유지 선택"] }),
    card({ x: 30, y: 256, w: 220, h: 76, tone: "slate", icon: "UserPlus", title: "/signup", sub: ["체험 · 새 회사 · 초대"] }),
    card({ x: 30, y: 352, w: 220, h: 76, tone: "slate", icon: "KeyRound", title: "/recover", sub: ["복구 코드로 재설정"] }),
    card({ x: 300, y: 230, w: 200, h: 110, tone: "blue", icon: "House", title: "/home", sub: ["인사 · 알림 · 주소록", "최근 대화 · 최신 글", "관리자: API 대시보드"], fill: "#dbeafe" }),
    arrow([[250, 188], [275, 188], [275, 270], [300, 270]], { tone: "blue" }),
    arrow([[250, 294], [300, 294]], { tone: "blue" }),
    card({ x: 580, y: 130, w: 350, h: 76, tone: "violet", icon: "MessagesSquare", title: "/message 메신저", sub: ["방 목록 · 대화 · 공지 · 파일 · 검색"] }),
    card({ x: 580, y: 222, w: 350, h: 76, tone: "teal", icon: "Contact", title: "/addressBook 주소록", sub: ["조직도 · 전체 구성원 · 그룹 · 즐겨찾기"] }),
    card({ x: 580, y: 314, w: 350, h: 56, tone: "teal", icon: "Search", title: "/addressBook/search", sub: [] }),
    text(800, 347, "전체 회사 검색", { size: 12, color: MUTED }),
    card({ x: 580, y: 386, w: 350, h: 76, tone: "amber", icon: "ClipboardList", title: "/board 게시판", sub: ["목록 · 글 보기 · 글쓰기가 주소 하나에"] }),
    arrow([[500, 250], [540, 250], [540, 168], [580, 168]], { tone: "violet" }),
    arrow([[500, 270], [580, 260]], { tone: "teal" }),
    arrow([[500, 300], [540, 300], [540, 424], [580, 424]], { tone: "amber" }),
    arrow([[755, 298], [755, 314]], { tone: "teal" }),
  ];
  return svg(W, 490, parts.join(""), { title: "화면 지도" });
};

// 2. 앱 구조(공급자 층)
const appArchitecture = () => {
  const layers = [
    ["AuthProvider", "KeyRound", "slate", "로그인 상태 · Access 토큰(메모리) · 자동 갱신"],
    ["LeaveGuardProvider", "CircleAlert", "amber", "작성 중 나가기 확인(링크 · 뒤로 · 새로고침)"],
    ["ProfileImageProvider", "Image", "sky", "누가 사진이 있는지 한 번 받아 공유 · 실시간 반영"],
    ["ChatNotificationProvider", "Bell", "rose", "실시간 연결 · 알림 목록 · 접속 상태 · 새 메시지 토스트"],
    ["ProfileModalProvider", "UserRound", "teal", "어느 아바타를 눌러도 같은 프로필 창"],
    ["RouteStateBoundary", "RefreshCw", "violet", "화면이 바뀌면 상태 초기화"],
  ];
  const parts = [text(30, 40, "src/app/layout.tsx · 바깥에서 안쪽으로 감싸는 순서", { size: 14, weight: 700 })];
  layers.forEach(([name, iconName, tone, sub], index) => {
    const inset = index * 18;
    const y = 56 + index * 50;
    const t = TONES[tone];
    parts.push(
      `<rect x="${30 + inset}" y="${y}" width="${540 - inset * 2}" height="${370 - index * 50 - index * 8}" rx="14" fill="${t.bg}" stroke="${t.line}" stroke-width="1.5"/>`,
      badgeIcon(iconName, 30 + inset + 22, y + 22, tone, 26),
      text(30 + inset + 42, y + 20, name, { size: 13, weight: 700, color: t.ink }),
      text(30 + inset + 42, y + 37, sub, { size: 11.5, color: MUTED }),
    );
  });
  parts.push(
    box(138, 350, 324, 28, "#ffffff", "#cbd5e1", 8),
    text(300, 369, "각 화면(page.tsx) + 공통 헤더", { size: 13, weight: 700, anchor: "middle" }),
    card({ x: 610, y: 56, w: 320, h: 104, tone: "blue", icon: "Code", title: "src/lib/api", sub: ["fetch 감싼 함수 · 응답 타입", "실패는 ApiClientError → 토스트"] }),
    card({ x: 610, y: 176, w: 320, h: 104, tone: "violet", icon: "Radio", title: "src/lib/realtime", sub: ["STOMP 연결 · 구독 · 이벤트 나눔", "끊기면 3초 뒤 다시 연결"] }),
    card({ x: 610, y: 296, w: 320, h: 104, tone: "green", icon: "Boxes", title: "src/lib 순수 함수", sub: ["읽음 수 · 리액션 · URL·멘션 나누기", "node:test 단위 테스트"] }),
    arrow([[570, 108], [610, 108]], { tone: "blue" }),
    arrow([[570, 228], [610, 228]], { tone: "violet" }),
    arrow([[570, 348], [610, 348]], { tone: "green" }),
  );
  return svg(W, 444, parts.join(""), { title: "앱 구조" });
};

// 3. 로그인 유지
const authUx = () => {
  const parts = [];
  const steps = [
    ["RefreshCw", "blue", "새로고침 · 처음 열기", ["쿠키로 /auth/refresh", "→ /auth/me 확인"]],
    ["Clock", "blue", "만료 1분 전", ["조용히 새 Access 받기", "화면은 그대로"]],
    ["Timer", "amber", "헤더에 남은 시간", ["세션 HH:MM:SS", "24시간에서 줄어듦"]],
    ["Lock", "rose", "세션 끝 · 갱신 실패", ["로그인 화면으로", "\"로그인이 필요합니다\""]],
  ];
  steps.forEach(([iconName, tone, title, sub], index) => {
    const x = 30 + index * 230;
    parts.push(card({ x, y: 50, w: 210, h: 128, tone, icon: iconName, title, sub, align: "center" }));
    parts.push(step(x + 18, 68, index + 1, tone));
    if (index < 3) parts.push(arrow([[x + 210, 114], [x + 230, 114]], { tone: "slate" }));
  });
  parts.push(
    card({ x: 30, y: 206, w: 440, h: 92, tone: "slate", icon: "Lock", title: "Access 토큰은 탭 메모리에만", sub: ["localStorage에 저장하지 않음", "Refresh는 서버가 주는 HttpOnly 쿠키(자바스크립트가 못 읽음)"] }),
    card({ x: 490, y: 206, w: 440, h: 92, tone: "slate", icon: "Eye", title: "로그인이 필요한 화면", sub: ["로그인 안 됐으면 / 로 보내고 한 번만 안내", "늦게 온 응답은 버림(로그인·로그아웃 직후 꼬임 방지)"] }),
  );
  return svg(W, 324, parts.join(""), { title: "로그인 유지" });
};

// 4. 실시간 연결
const realtime = () =>
  svg(
    W,
    430,
    [
      card({ x: 30, y: 40, w: 250, h: 108, tone: "rose", icon: "Radio", title: "전역 연결", sub: ["로그인한 모든 화면", "ChatNotificationProvider"] }),
      card({ x: 30, y: 262, w: 250, h: 108, tone: "violet", icon: "MessagesSquare", title: "메신저 연결", sub: ["/message 화면에서만", "입력 중 표시도 보냄"] }),
      zone({ x: 330, y: 36, w: 600, h: 186, label: "전역 연결이 구독하는 곳", tone: "rose" }),
      chipRow(350, 62, ["/topic/presence", "/topic/profileImage", "/user/queue/notification", "/topic/chatRoom/*"], "rose", { gap: 6 }),
      card({ x: 350, y: 102, w: 180, h: 100, tone: "sky", icon: "Wifi", title: "접속 상태", sub: ["아바타 점 · 상태", "아이콘 바로 바뀜"] }),
      card({ x: 545, y: 102, w: 180, h: 100, tone: "sky", icon: "Image", title: "프로필 사진", sub: ["바뀐 사람만", "다시 받음"] }),
      card({ x: 740, y: 102, w: 170, h: 100, tone: "rose", icon: "Bell", title: "알림 · 토스트", sub: ["알림 목록 추가", "새 메시지 카드"] }),
      zone({ x: 330, y: 254, w: 600, h: 150, label: "메신저 연결이 다루는 이벤트", tone: "violet" }),
      chipWrap(350, 280, 560, ["MESSAGE_CREATED · 방 목록 + 대화", "MESSAGE_UPDATED · DELETED", "REACTION_UPDATED", "NOTICE_UPDATED · 공지 패널", "READ_UPDATED · 읽음 수 다시 셈", "TYPING_CHANGED · 입력 중"], "violet"),
      text(350, 386, "보내는 쪽: 글자 입력 0.5초 뒤 시작 → 2초마다 '아직 입력 중' · 받는 쪽은 3초 지나면 지움", { size: 12, color: MUTED }),
      arrow([[280, 94], [330, 110]], { tone: "rose" }),
      arrow([[280, 316], [330, 320]], { tone: "violet" }),
    ].join(""),
    { title: "실시간 연결" },
  );

// 5. 메신저 화면
const messengerScreen = () => {
  const x = 30;
  const y = 30;
  const parts = [frame(x, y, 900, 430, "localhost:3000/message?roomId=12")];
  // 왼쪽 방 목록
  parts.push(box(x + 10, y + 42, 230, 376, "#f8fafc"));
  parts.push(box(x + 22, y + 54, 206, 26, "#ffffff"), icon("Search", x + 30, y + 59, 15, MUTED), text(x + 52, y + 72, "메시지 · 파일 검색", { size: 11, color: MUTED }));
  const rooms = [
    ["개발팀", "내일 배포 일정 공유드려요", "3", true],
    ["이서준", "입력 중…", "", false],
    ["디자인 리뷰", "@김하늘 시안 확인 부탁", "@", false],
    ["내 메모", "할 일: README 정리", "", false],
  ];
  rooms.forEach(([name, last, badge, pinned], index) => {
    const ry = y + 92 + index * 56;
    parts.push(
      index === 0 ? box(x + 16, ry - 4, 218, 52, TONES.blue.bg, TONES.blue.line) : "",
      `<circle cx="${x + 40}" cy="${ry + 22}" r="15" fill="${[TONES.violet.line, TONES.teal.line, TONES.amber.line, TONES.slate.line][index]}"/>`,
      text(x + 64, ry + 18, name, { size: 12.5, weight: 700 }),
      text(x + 64, ry + 36, last, { size: 11, color: index === 1 ? TONES.green.solid : MUTED }),
      pinned ? icon("Pin", x + 200, ry + 6, 13, TONES.blue.solid) : "",
      badge ? `<circle cx="${x + 216}" cy="${ry + 32}" r="9" fill="${badge === "@" ? TONES.violet.solid : TONES.rose.solid}"/>` + text(x + 216, ry + 36, badge, { size: 10.5, weight: 700, color: "#ffffff", anchor: "middle" }) : "",
    );
  });
  // 가운데 대화
  const cx = x + 250;
  parts.push(
    box(cx, y + 42, 420, 36, "#ffffff"),
    text(cx + 14, y + 65, "개발팀 · 5명", { size: 13, weight: 700 }),
    icon("Search", cx + 360, y + 52, 16, MUTED),
    icon("Image", cx + 390, y + 52, 16, MUTED),
    box(cx, y + 84, 420, 30, TONES.amber.bg, TONES.amber.line),
    icon("Megaphone", cx + 10, y + 91, 15, TONES.amber.solid),
    text(cx + 32, y + 104, "공지 · 금요일 18시 배포 동결", { size: 11.5, weight: 700, color: TONES.amber.ink }),
    text(cx + 404, y + 104, "∨", { size: 12, color: TONES.amber.ink, anchor: "end" }),
    `<circle cx="${cx + 22}" cy="${y + 140}" r="13" fill="${TONES.teal.line}"/>`,
    text(cx + 42, y + 136, "이서준", { size: 11.5, weight: 700 }),
    box(cx + 42, y + 144, 230, 34, "#f1f5f9", "#e2e8f0", 12),
    text(cx + 54, y + 166, "배포 체크리스트 올렸어요", { size: 12 }),
    box(cx + 42, y + 184, 150, 40, "#ffffff", LINE, 10),
    icon("FileText", cx + 52, y + 193, 20, TONES.blue.solid),
    text(cx + 78, y + 201, "체크리스트.xlsx", { size: 11, weight: 700 }),
    text(cx + 78, y + 216, "미리보기 가능", { size: 10, color: MUTED }),
    chipRow(cx + 42, y + 230, ["좋아요 2"], "violet", { size: 10.5, height: 20 }),
    box(cx + 200, y + 262, 210, 50, TONES.blue.bg, TONES.blue.line, 12),
    `<rect x="${cx + 208}" y="${y + 268}" width="3" height="16" rx="1.5" fill="${TONES.blue.solid}"/>`,
    text(cx + 216, y + 280, "이서준님에게 답장", { size: 10, weight: 700, color: TONES.blue.ink }),
    text(cx + 216, y + 300, "확인했습니다! @All 리뷰 부탁", { size: 11.5 }),
    text(cx + 194, y + 308, "읽음 3", { size: 10.5, weight: 700, color: TONES.amber.solid, anchor: "end" }),
    text(cx + 42, y + 336, "김하늘 님이 입력 중…", { size: 11, color: TONES.green.solid }),
    box(cx, y + 350, 420, 68, "#ffffff", "#cbd5e1", 10),
    text(cx + 14, y + 372, "메시지 입력 · @로 멘션 · 파일 끌어 놓기", { size: 11.5, color: MUTED }),
    icon("Paperclip", cx + 14, y + 386, 16, MUTED),
    icon("SmilePlus", cx + 40, y + 386, 16, MUTED),
    icon("AtSign", cx + 66, y + 386, 16, MUTED),
    `<rect x="${cx + 360}" y="${y + 382}" width="48" height="26" rx="8" fill="${TONES.blue.solid}"/>`,
    icon("Send", cx + 376, y + 387, 16, "#ffffff"),
  );
  // 오른쪽 모아보기
  const gx = x + 680;
  parts.push(
    box(gx, y + 42, 210, 376, "#f8fafc"),
    text(gx + 14, y + 66, "모아보기", { size: 12.5, weight: 700 }),
    chipRow(gx + 14, y + 78, ["사진", "파일", "링크"], "slate", { size: 11, height: 22 }),
  );
  for (let index = 0; index < 6; index++) {
    parts.push(box(gx + 14 + (index % 3) * 62, y + 112 + Math.floor(index / 3) * 62, 56, 56, ["#dbeafe", "#fef3c7", "#dcfce7", "#ede9fe", "#ffe4e6", "#e0f2fe"][index], "none", 8));
  }
  parts.push(icon("FileText", gx + 18, y + 252, 18, TONES.blue.solid), bar(gx + 44, y + 258, 140));
  parts.push(icon("Link", gx + 18, y + 284, 18, TONES.violet.solid), bar(gx + 44, y + 290, 120));
  // 설명 딱지
  parts.push(
    step(x + 240, y + 54, 1, "blue"),
    step(cx + 410, y + 84, 2, "amber"),
    step(cx + 410, y + 262, 3, "blue"),
    step(gx + 200, y + 50, 4, "slate"),
  );
  return svg(W, 520, parts.join("") + legend(30, 482, ["① 방 목록: 핀 · 안 읽음 · 입력 중", "② 공지 패널: 여러 개 · 접기", "③ 답장 · 멘션 · 읽음 수", "④ 사진 · 파일 · 링크 모아보기"]), { title: "메신저 화면" });
};

// 그림 아래 번호 설명 줄
const legend = (x, y, values) =>
  values.map((value, index) => text(x + index * 228, y + 12, value, { size: 11.5, color: MUTED })).join("");

// 6. 말풍선에서 할 수 있는 것
const messageActions = () => {
  const parts = [
    // 메뉴 모형
    box(30, 40, 230, 280, "#ffffff", "#cbd5e1", 12),
    text(46, 64, "⋮ 메뉴 · 우클릭", { size: 12.5, weight: 700 }),
  ];
  const menu = [
    ["Link", "복사 / 저장"],
    ["Reply", "답장"],
    ["Forward", "전달 (최대 10개 방)"],
    ["Megaphone", "공지로 등록"],
    ["Pencil", "수정 (24시간)"],
    ["Trash2", "삭제 (24시간)"],
  ];
  menu.forEach(([iconName, value], index) => {
    const y = 80 + index * 38;
    parts.push(icon(iconName, 46, y + 2, 16, index >= 4 ? TONES.rose.solid : TONES.slate.solid), text(72, y + 15, value, { size: 12.5, color: index >= 4 ? TONES.rose.ink : "#0f172a" }));
  });
  parts.push(
    card({ x: 290, y: 40, w: 300, h: 130, tone: "violet", icon: "SmilePlus", title: "리액션", sub: ["이모지를 고르면 바로 반영", "칩을 누르면 누른 사람 목록", "1인 1개 · 24시간 안"] }),
    card({ x: 290, y: 190, w: 300, h: 130, tone: "amber", icon: "Eye", title: "읽음 수", sub: ["그룹: '읽음 N' · 1:1: 읽음 표시", "누르면 읽은 · 안 읽은 사람", "도착 순서가 바뀌어도 화면이 다시 셈"] }),
    zone({ x: 620, y: 40, w: 310, h: 280, label: "파일 미리보기", tone: "blue", iconName: "Paperclip" }),
    chipWrap(640, 66, 280, ["사진 (←/→ 넘기기)", "PDF", "Word", "Excel · CSV", "Markdown", "코드", "텍스트", "ZIP 목록", "동영상", "음성"], "blue"),
    text(640, 240, "한 번에 10개 · 파일당 20MB", { size: 12, color: MUTED }),
    text(640, 262, "끌어 놓기 · 붙여 넣기로 첨부", { size: 12, color: MUTED }),
    text(640, 284, "PPT · HWP는 내려받기만", { size: 12, color: MUTED }),
  );
  return svg(W, 345, parts.join(""), { title: "말풍선에서 할 수 있는 것" });
};

// 7. 주소록 화면
const addressBook = () => {
  const x = 30;
  const y = 30;
  const parts = [frame(x, y, 900, 360, "localhost:3000/addressBook")];
  parts.push(box(x + 10, y + 42, 200, 306, "#f8fafc"));
  const side = [
    ["Star", "즐겨찾기", TONES.amber.solid],
    ["Users", "그룹", TONES.violet.solid],
    ["Building2", "조직도", TONES.teal.solid],
  ];
  side.forEach(([iconName, value, color], index) => {
    const sy = y + 58 + index * 34;
    parts.push(icon(iconName, x + 24, sy, 16, color), text(x + 48, sy + 13, value, { size: 12.5, weight: 700 }));
  });
  parts.push(
    box(x + 18, y + 158, 184, 26, TONES.blue.bg, TONES.blue.line),
    text(x + 30, y + 176, "전체 구성원 (기본)", { size: 12, weight: 700, color: TONES.blue.ink }),
    text(x + 30, y + 206, "▸ 한빛 소프트  42", { size: 12 }),
    text(x + 44, y + 230, "개발팀 · 디자인팀 · 경영팀", { size: 11, color: MUTED }),
    text(x + 30, y + 256, "▸ 데모 회사  18", { size: 12 }),
  );
  // 표
  const tx = x + 222;
  parts.push(box(tx, y + 42, 420, 30, "#ffffff"), text(tx + 14, y + 62, "이름 ↕     부서     소속     이메일", { size: 11.5, weight: 700, color: MUTED }));
  const statusIcons = [
    [TONES.green.solid, null],
    [null, "바쁨"],
    [TONES.slate.line, null],
    [null, "휴가"],
    [TONES.green.solid, null],
  ];
  statusIcons.forEach(([dot, status], index) => {
    const ry = y + 80 + index * 44;
    parts.push(
      index === 0 ? box(tx, ry - 4, 420, 40, TONES.blue.bg, "none") : "",
      `<circle cx="${tx + 22}" cy="${ry + 16}" r="13" fill="${[TONES.teal.line, TONES.violet.line, TONES.amber.line, TONES.sky.line, TONES.rose.line][index]}"/>`,
      dot ? `<circle cx="${tx + 32}" cy="${ry + 26}" r="5" fill="${dot}" stroke="#ffffff" stroke-width="2"/>` : "",
      text(tx + 44, ry + 21, ["김하늘", "이서준", "박도윤", "최지우", "정민서"][index], { size: 12, weight: 700 }),
      index === 0 ? chipRow(tx + 96, ry + 7, ["나"], "blue", { size: 10, height: 18 }) : "",
      status ? chipRow(tx + 96, ry + 7, [status], "amber", { size: 10, height: 18 }) : "",
      bar(tx + 160, ry + 13, 60),
      bar(tx + 240, ry + 13, 50),
      bar(tx + 310, ry + 13, 80),
      icon("Star", tx + 398, ry + 9, 14, index < 2 ? TONES.amber.solid : "#cbd5e1"),
    );
  });
  // 상세
  const px = x + 652;
  parts.push(
    box(px, y + 42, 238, 306, "#ffffff"),
    `<circle cx="${px + 119}" cy="${y + 96}" r="30" fill="${TONES.teal.line}"/>`,
    `<circle cx="${px + 141}" cy="${y + 118}" r="8" fill="${TONES.green.solid}" stroke="#ffffff" stroke-width="3"/>`,
    text(px + 119, y + 150, "김하늘", { size: 14, weight: 700, anchor: "middle" }),
    text(px + 119, y + 170, "개발팀 · 매니저", { size: 11.5, color: MUTED, anchor: "middle" }),
    ...["소속", "전화", "이메일", "입사일"].map((name, index) => text(px + 20, y + 200 + index * 22, name, { size: 11.5, color: MUTED }) + bar(px + 80, y + 193 + index * 22, 120)),
    `<rect x="${px + 20}" y="${y + 296}" width="198" height="34" rx="9" fill="${TONES.blue.solid}"/>`,
    text(px + 119, y + 318, "메시지 보내기", { size: 12.5, weight: 700, color: "#ffffff", anchor: "middle" }),
  );
  parts.push(
    text(30, 420, "상태 아이콘", { size: 13, weight: 700 }),
    chipRow(116, 404, ["바쁨", "자리 비움", "퇴근", "부재", "휴가", "출장", "병가"], "amber"),
    text(30, 452, "상태가 없으면 초록(온라인) · 회색(오프라인) 점 · 실시간으로 바뀜 · 검색은 모든 회사의 이름 · 이메일 · 전화", { size: 12, color: MUTED }),
  );
  return svg(W, 476, parts.join(""), { title: "주소록 화면" });
};

// 8. 게시판 화면
const boardScreen = () => {
  const x = 30;
  const y = 30;
  const parts = [frame(x, y, 900, 380, "localhost:3000/board?menu=latest")];
  parts.push(
    box(x + 10, y + 42, 210, 326, "#f8fafc"),
    `<rect x="${x + 22}" y="${y + 52}" width="186" height="32" rx="8" fill="#0f172a"/>`,
    text(x + 115, y + 73, "글쓰기", { size: 12.5, weight: 700, color: "#ffffff", anchor: "middle" }),
  );
  ["최신글", "필독", "중요", "내 글"].forEach((value, index) =>
    parts.push(text(x + 40 + index * 46, y + 110, value, { size: 11, weight: 700, color: index === 0 ? TONES.blue.solid : MUTED, anchor: "middle" })),
  );
  const tree = [
    ["즐겨찾기", null, 0],
    ["공지사항", "Megaphone", 1],
    ["전체게시판", null, 0],
    ["자유게시판", "MessagesSquare", 1],
    ["문의하기", "MessageCircleQuestion", 1],
    ["회사별게시판", null, 0],
    ["한빛 소프트", "Building2", 1],
    ["개발팀", "Users", 2],
  ];
  tree.forEach(([value, iconName, depth], index) => {
    const ty = y + 136 + index * 26;
    if (!iconName) parts.push(text(x + 22, ty + 12, `∨ ${value}`, { size: 11, weight: 700, color: MUTED }));
    else parts.push(icon(iconName, x + 22 + depth * 12, ty + 1, 14, TONES.slate.solid), text(x + 42 + depth * 12, ty + 12, value, { size: 12 }));
  });
  parts.push(icon("Star", x + 194, y + 162, 13, TONES.amber.solid), text(x + 22, y + 356, "임시저장함 · 예약함 · 휴지통", { size: 11, color: MUTED }));
  // 목록
  const lx = x + 230;
  const list = [
    [[["공지사항", "blue"], ["필독", "rose"]], "11월 보안 점검 안내", true],
    [[["일일", "violet"]], "2026년 11월 05일 입니다, 오늘도 좋은 하루…", true],
    [[["답변 대기", "amber"]], "로그인이 자꾸 풀려요", false],
    [[["답변 완료", "green"]], "파일 첨부 용량 문의", false],
    [[], "점심 메뉴 추천 받습니다", false],
    [[["부서", "slate"]], "개발팀 주간 회의록", false],
  ];
  parts.push(box(lx, y + 42, 650, 34, "#ffffff"), text(lx + 14, y + 64, "최신글", { size: 13, weight: 700 }), box(lx + 470, y + 49, 166, 20, "#f8fafc", LINE, 10), text(lx + 482, y + 63, "제목 · 작성자 · 파일 검색", { size: 10, color: MUTED }));
  list.forEach(([badges, title, bold], index) => {
    const ry = y + 86 + index * 46;
    let cursor = lx + 14;
    if (index === 0) parts.push(icon("Star", cursor, ry + 6, 14, TONES.amber.solid));
    cursor += 22;
    for (const [value, tone] of badges) {
      const piece = chipRow(cursor, ry + 3, [value], tone, { size: 10.5, height: 20, solid: false });
      parts.push(piece);
      cursor += value.length * 10.5 + 26;
    }
    parts.push(
      text(cursor + 4, ry + 17, title, { size: 12.5, weight: bold ? 700 : 400 }),
      text(lx + 636, ry + 17, ["관리자 · 조회 52", "시스템 · 조회 31", "김하늘 · 댓글 1", "이서준 · 댓글 2", "박도윤 · 리액션 4", "최지우 · 첨부"][index], { size: 10.5, color: MUTED, anchor: "end" }),
      `<line x1="${lx + 10}" y1="${ry + 34}" x2="${lx + 640}" y2="${ry + 34}" stroke="${LINE}"/>`,
    );
  });
  parts.push(
    text(lx + 14, y + 370, "안 읽은 글은 굵게 · 일일 > 게시판 이름 순으로 딱지 · 자유게시판은 딱지 없음", { size: 11, color: MUTED }),
    text(30, 440, "글쓰기", { size: 13, weight: 700 }),
    chipRow(90, 424, ["굵게 · 기울임 · 밑줄", "제목 1~3", "목록", "인용 · 코드", "링크", "사진 붙여 넣기", "첨부 20개", "필독 · 댓글 허용", "임시저장 · 예약"], "amber", { size: 11, height: 22, gap: 6 }),
  );
  return svg(W, 470, parts.join(""), { title: "게시판 화면" });
};

// 9. 홈 · 관리자 대시보드
const home = () => {
  const x = 30;
  const y = 30;
  const parts = [frame(x, y, 900, 486, "localhost:3000/home")];
  parts.push(
    box(x + 12, y + 42, 876, 44, "#ffffff"),
    text(x + 28, y + 70, "김하늘님, 안녕하세요.", { size: 14, weight: 700 }),
    chipRow(x + 190, y + 53, ["업무 중 ▾"], "green", { size: 11, height: 22 }),
    chipRow(x + 600, y + 53, ["메시지", "주소록", "게시판", "내 메모"], "slate", { size: 11, height: 22 }),
  );
  const cards = [
    ["Bell", "rose", "알림"],
    ["Contact", "teal", "주소록 · 온라인 5/18"],
    ["MessagesSquare", "violet", "최근 대화"],
    ["ClipboardList", "amber", "최신 게시글"],
  ];
  cards.forEach(([iconName, tone, title], index) => {
    const cx = x + 12 + index * 221;
    parts.push(box(cx, y + 94, 211, 110, "#ffffff"), icon(iconName, cx + 12, y + 106, 16, TONES[tone].solid), text(cx + 36, y + 119, title, { size: 12, weight: 700 }));
    for (let row = 0; row < 3; row++) parts.push(bar(cx + 14, y + 138 + row * 20, 150 - row * 22));
  });
  // 관리자 대시보드
  const dy = y + 216;
  parts.push(
    `<rect x="${x + 12}" y="${dy}" width="876" height="258" rx="10" fill="${TONES.violet.bg}" stroke="${TONES.violet.line}" stroke-dasharray="6 4"/>`,
    text(x + 28, dy + 24, "관리자만 · API 대시보드 (30초마다 새로)", { size: 12.5, weight: 700, color: TONES.violet.ink }),
  );
  ["최근 60분", "24시간", "7일", "30일"].forEach((value, index) => {
    parts.push(text(x + 340 + index * 76, dy + 24, value, { size: 11.5, weight: 700, color: index === 0 ? TONES.blue.solid : MUTED, anchor: "middle" }));
    if (index === 0) parts.push(`<rect x="${x + 312}" y="${dy + 30}" width="56" height="2.5" rx="1" fill="${TONES.blue.solid}"/>`);
  });
  ["요청 수", "서버 오류율", "평균 응답", "p95 응답"].forEach((value, index) => {
    const kx = x + 24 + index * 214;
    parts.push(box(kx, dy + 40, 204, 54, "#ffffff"), text(kx + 12, dy + 58, value, { size: 11, color: MUTED }), text(kx + 12, dy + 82, ["1,284", "0.2%", "38ms", "약 120ms"][index], { size: 17, weight: 700 }), text(kx + 192, dy + 82, ["▲ 12%", "▼ 0.1%p", "▼ 4ms", "▲ 9ms"][index], { size: 10.5, weight: 700, color: index % 3 === 0 ? TONES.rose.solid : TONES.blue.solid, anchor: "end" }));
  });
  const charts = ["요청 수 · 영역별", "오류율 5xx · 4xx", "응답 시간 평균 · p95", "응답 시간 분포", "가용성 · 오류 예산", "DB 연결 풀"];
  const colors = ["#2a78d6", "#eda100", "#33d097", "#c084fc"];
  charts.forEach((value, index) => {
    const cx = x + 24 + (index % 3) * 286;
    const cy = dy + 104 + Math.floor(index / 3) * 66;
    parts.push(box(cx, cy, 276, 58, "#ffffff"), text(cx + 10, cy + 16, value, { size: 10.5, weight: 700, color: MUTED }));
    const series = index === 0 ? colors : index === 1 ? [TONES.rose.solid, TONES.amber.solid] : [TONES.blue.solid, "#94a3b8"];
    series.forEach((color, seriesIndex) => {
      const points = Array.from({ length: 12 }, (_, step) => `${cx + 12 + step * 22},${cy + 48 - Math.abs(Math.sin(step * 0.9 + seriesIndex * 1.7 + index)) * (18 - seriesIndex * 3) - seriesIndex * 2}`).join(" ");
      parts.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`);
    });
  });
  parts.push(
    text(x + 24, dy + 246, "아래: 많이 호출된 API · 느린 API 순위(작은 흐름선) · 가동 중인 서버 목록 · 표로 보기", { size: 11, color: MUTED }),
  );
  return svg(W, 546, parts.join(""), { title: "홈 · 관리자 대시보드" });
};

// 10. 공통 UI
const uiSystem = () => {
  const parts = [];
  const cell = (x, y, w, h, title) =>
    parts.push(box(x, y, w, h, "#ffffff", "#cbd5e1", 12), text(x + 14, y + 22, title, { size: 12.5, weight: 700 }));
  // 탭
  cell(30, 30, 290, 100, "탭 · 밑줄형 하나로");
  ["전체", "메시지", "주소록", "시스템"].forEach((value, index) => parts.push(text(56 + index * 66, 80, value, { size: 12, weight: 700, color: index === 0 ? TONES.blue.solid : MUTED, anchor: "middle" })));
  parts.push(`<line x1="44" y1="92" x2="306" y2="92" stroke="${LINE}"/>`, `<rect x="36" y="90" width="40" height="3" rx="1.5" fill="${TONES.blue.solid}"/>`);
  // 선택
  cell(335, 30, 290, 100, "선택 · 날짜 (브라우저 기본 위젯 안 씀)");
  parts.push(box(350, 60, 120, 26, "#ffffff", "#cbd5e1"), text(362, 78, "시간순", { size: 11.5 }), text(458, 78, "▾", { size: 11, color: MUTED, anchor: "end" }));
  parts.push(box(480, 60, 130, 26, "#ffffff", "#cbd5e1"), icon("CalendarClock", 488, 65, 15, TONES.blue.solid), text(510, 78, "11.06 09:00", { size: 11.5 }));
  parts.push(box(350, 94, 260, 28, "#f8fafc", LINE));
  ["오늘", "내일", "다음 주"].forEach((value, index) => parts.push(text(392 + index * 84, 113, value, { size: 11, color: index === 1 ? TONES.blue.solid : MUTED, weight: index === 1 ? 700 : 400, anchor: "middle" })));
  // 체크 · 라디오
  cell(640, 30, 290, 100, "체크박스 · 라디오");
  parts.push(`<rect x="656" y="60" width="18" height="18" rx="5" fill="${TONES.blue.solid}"/>`, `<path d="M660 69 l4 4 l7 -8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`, text(682, 74, "필독으로 등록", { size: 12 }));
  parts.push(`<rect x="656" y="90" width="18" height="18" rx="5" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>`, text(682, 104, "댓글 허용", { size: 12 }));
  parts.push(`<circle cx="806" cy="69" r="9" fill="#fff" stroke="${TONES.blue.solid}" stroke-width="1.5"/>`, `<circle cx="806" cy="69" r="4.5" fill="${TONES.blue.solid}"/>`, text(822, 74, "전체", { size: 12 }));
  parts.push(`<circle cx="806" cy="99" r="9" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>`, text(822, 104, "멘션만", { size: 12 }));
  // 로딩
  cell(30, 145, 290, 120, "로딩 · 조회하는 자리마다");
  parts.push(`<circle cx="60" cy="195" r="10" fill="none" stroke="${LINE}" stroke-width="3"/>`, `<path d="M60 185 a10 10 0 0 1 10 10" fill="none" stroke="${TONES.blue.solid}" stroke-width="3" stroke-linecap="round"/>`, text(80, 199, "아이콘만", { size: 11.5, color: MUTED }));
  parts.push(`<circle cx="170" cy="195" r="7" fill="none" stroke="${TONES.blue.solid}" stroke-width="2.5" stroke-dasharray="20 30"/>`, text(184, 199, "한 줄 문구", { size: 11.5, color: MUTED }));
  parts.push(box(46, 214, 258, 38, "#f8fafc", LINE), text(175, 237, "영역 전체 · 자리 높이 유지", { size: 11.5, color: MUTED, anchor: "middle" }));
  // 토스트 · 툴팁
  cell(335, 145, 290, 120, "토스트 · 툴팁");
  parts.push(`<rect x="350" y="180" width="200" height="34" rx="10" fill="#0f172a"/>`, icon("CircleCheck", 360, 188, 18, "#4ade80"), text(386, 202, "저장했습니다", { size: 12, color: "#ffffff" }));
  parts.push(`<rect x="440" y="226" width="110" height="26" rx="6" fill="#334155"/>`, text(495, 243, "이름 변경", { size: 11, color: "#ffffff", anchor: "middle" }), `<path d="M490 226 l5 -6 l5 6 z" fill="#334155"/>`);
  // 아바타
  cell(640, 145, 290, 120, "아바타 · 딱지 · 즐겨찾기");
  parts.push(`<circle cx="672" cy="200" r="18" fill="${TONES.teal.line}"/>`, text(672, 206, "김", { size: 14, weight: 700, color: TONES.teal.ink, anchor: "middle" }), `<circle cx="685" cy="213" r="6" fill="${TONES.green.solid}" stroke="#fff" stroke-width="2.5"/>`);
  parts.push(`<circle cx="726" cy="200" r="18" fill="${TONES.violet.line}"/>`, `<circle cx="740" cy="214" r="8" fill="#fff"/>`, icon("Clock", 734, 208, 12, TONES.amber.solid));
  parts.push(chipRow(764, 190, ["나"], "blue", { size: 11, height: 20 }), `<circle cx="822" cy="200" r="11" fill="${TONES.green.solid}"/>`, icon("Star", 815, 193, 14, "#ffffff"));
  parts.push(text(656, 250, "사진 있으면 사진 · 없으면 이름 첫 글자", { size: 11, color: MUTED }));
  // 모달
  cell(30, 280, 445, 110, "모달 · 메뉴");
  parts.push(box(50, 312, 180, 62, "#ffffff", "#cbd5e1", 10), text(64, 334, "삭제할까요?", { size: 12, weight: 700 }), `<rect x="150" y="346" width="66" height="20" rx="6" fill="${TONES.rose.solid}"/>`, text(183, 360, "삭제", { size: 11, weight: 700, color: "#fff", anchor: "middle" }));
  parts.push(text(250, 330, "배경을 어둡게 하지 않음", { size: 11.5, color: MUTED }), text(250, 350, "Esc · 바깥 클릭으로 닫기 · 포커스 순환", { size: 11.5, color: MUTED }), text(250, 370, "메뉴는 화면 밖으로 안 나가게 위치 보정", { size: 11.5, color: MUTED }));
  // 그래프 색
  cell(490, 280, 440, 110, "그래프 색은 한 파일(chart-colors.ts)에서만");
  [["#2a78d6", "메시지"], ["#eda100", "주소록"], ["#33d097", "게시판"], ["#c084fc", "알림"], ["#94a3b8", "기타"]].forEach(([color, value], index) => {
    const sx = 506 + index * 82;
    parts.push(`<rect x="${sx}" y="316" width="22" height="22" rx="6" fill="${color}"/>`, text(sx + 28, 332, value, { size: 11.5 }));
  });
  parts.push(text(506, 368, "시장 브리핑: 오름 빨강 · 내림 파랑", { size: 11.5, color: MUTED }));
  return svg(W, 415, parts.join(""), { title: "공통 UI" });
};

// 11. 다음 계획
const roadmap = () => {
  const parts = [
    zone({ x: 30, y: 36, w: 420, h: 290, label: "만든 것", tone: "green", iconName: "CircleCheck" }),
    chipWrap(50, 62, 390, ["로그인 · 가입 · 계정 찾기", "세션 자동 유지", "관리자 모드", "회사 이동 · 초대", "메신저 1:1 · 그룹 · 내 메모", "답장 · 전달 · 공지", "리액션 · 멘션", "파일 미리보기 10종", "모아보기 · 검색", "입력 중 표시", "주소록 · 전체 검색", "내 상태 · 실시간 점", "프로필 사진", "게시판 · 글쓰기 편집기", "예약 · 임시저장 · 휴지통", "일일 브리핑 화면", "홈 카드", "API 대시보드"], "green"),
    zone({ x: 480, y: 36, w: 450, h: 290, label: "다음 계획", tone: "slate", iconName: "CircleDashed" }),
  ];
  const plans = [
    ["Rocket", "Vercel 배포", "API는 Oracle VM · 주소 2개(DuckDNS)"],
    ["CalendarClock", "캘린더 화면", "지금은 '준비 중' 안내만"],
    ["Link", "말풍선 링크 카드", "서버가 모은 제목 · 그림을 대화에 표시"],
    ["Users", "조직 · 그룹 검색 탭", "검색 화면의 '준비 중' 탭 채우기"],
  ];
  plans.forEach(([iconName, title, sub], index) => {
    const y = 62 + index * 64;
    parts.push(
      `<rect x="500" y="${y}" width="410" height="54" rx="12" fill="#ffffff" stroke="${TONES.slate.line}" stroke-width="1.5" stroke-dasharray="5 4"/>`,
      badgeIcon(iconName, 528, y + 27, "slate", 32),
      text(556, y + 23, `${index + 1}. ${title}`, { size: 13.5, weight: 700 }),
      text(556, y + 42, sub, { size: 11.5, color: MUTED }),
    );
  });
  return svg(W, 350, parts.join(""), { title: "다음 계획" });
};

export const DIAGRAMS = {
  "screen-map": screenMap,
  "app-architecture": appArchitecture,
  "auth-ux": authUx,
  realtime,
  "messenger-screen": messengerScreen,
  "message-actions": messageActions,
  "address-book": addressBook,
  "board-screen": boardScreen,
  home,
  "ui-system": uiSystem,
  roadmap,
};

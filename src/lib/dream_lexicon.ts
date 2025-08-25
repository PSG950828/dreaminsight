// lib/dream_lexicon.ts
export type SymbolMeaning = {
  label: string;
  tags: string[];      // 주제/아키타입
  meaning: string;     // 핵심 해석 (한 줄)
  advice: string;      // 즉시 실행 한 줄
};

export const SYMBOLS: Record<string, SymbolMeaning> = {
  // ===== 인물/관계 =====
  mother: { label:"어머니", tags:["보살핌","근원","관계"], meaning:"보살핌·의존·감정영양에 대한 욕구 또는 과부하.", advice:"감정적 에너지원 1가지를 오늘 10분 확보(통화/산책)." },
  father: { label:"아버지", tags:["권위","기준","경계"], meaning:"권위·규칙·기준과의 긴장 또는 지지 필요.", advice:"내가 스스로 정한 규칙 1개만 오늘 적용." },
  partner: { label:"연인/배우자", tags:["친밀","애착"], meaning:"친밀감 욕구와 경계(거리조절) 재조정 신호.", advice:"요청/감사 한 문장 메시지를 지금 전송." },
  ex: { label:"전 애인", tags:["미해결","회상"], meaning:"미결감정·비교·자기정체성 재평가.", advice:"그 관계에서 배운 점 3가지 적기." },
  child: { label:"아이(자녀)", tags:["성장","책임"], meaning:"새 프로젝트/연약함/양육책임의 상징.", advice:"아이디어 1개를 오늘 10분 프로토타이핑." },
  stranger: { label:"낯선 사람", tags:["그림자","잠재력"], meaning:"내가 모르는 자아측면(그림자/가능성)의 등장.", advice:"낯선 선택 1가지를 작은 규모로 시도." },

  // ===== 신체 =====
  teeth: { label:"치아", tags:["자기이미지","불안","통제감"], meaning:"표현능력·외모·재정/건강 통제감 저하 불안.", advice:"호흡 4-7-8×3, 지출 3항목 점검." },
  hair: { label:"머리카락", tags:["자존감","활력"], meaning:"매력/활력/정체성 회복 욕구.", advice:"외모 관리 10분(정리/컷/케어) 실행." },
  eyes: { label:"눈", tags:["통찰","진실"], meaning:"진실을 보려는 의지 또는 회피 갈등.", advice:"오늘 결정을 위한 팩트 1개 추가확인." },
  blood: { label:"피", tags:["에너지","희생"], meaning:"에너지 소모·희생·강렬한 감정.", advice:"과로 요인 1개를 즉시 제거." },
  hands: { label:"손", tags:["행동","기술"], meaning:"행동의지/기술발휘/촉각적 연결.", advice:"손이 필요한 3분 행동 즉시 실행." },
  feet: { label:"발", tags:["기반","이동"], meaning:"기반/진로/안정성 재정렬 필요.", advice:"이번 주 이동·동선 최적화 1건." },

  // ===== 동물 =====
  snake: { label:"뱀", tags:["위험","재생","에로스"], meaning:"위험·유혹·재생의 이중신호.", advice:"경계가 흐린 관계/일 1건 경계선 긋기." },
  dog: { label:"개", tags:["충성","보호"], meaning:"충성·보호·친밀 욕구.", advice:"지지해주는 사람 1명에게 감사 표하기." },
  cat: { label:"고양이", tags:["직관","자율"], meaning:"직관·자율·경계존중 필요.", advice:"오늘 20분 혼자만의 회복시간 확보." },
  bird: { label:"새", tags:["자유","메시지"], meaning:"자유·소식·관점 상승.", advice:"현재 문제를 3m 위 관점에서 다시 적기." },
  fish: { label:"물고기", tags:["무의식","풍요"], meaning:"무의식/풍요/감정의 흐름.", advice:"물 섭취+감정 라벨링 3문장." },
  spider: { label:"거미", tags:["창조","불안"], meaning:"섬세한 창조/통제욕과 불안 공존.", advice:"웹처럼 얽힌 일 1건을 분해하여 순서화." },
  tiger: { label:"호랑이", tags:["힘","위엄"], meaning:"억눌린 힘/분노/리더십 호출.", advice:"회의/대화에서 입장 1번 명확히 표명." },
  bear: { label:"곰", tags:["인내","휴식"], meaning:"휴식·동면·회복의 필요.", advice:"수면 30분 보강 또는 낮잠 10분." },

  // ===== 장소/자연 =====
  house: { label:"집/방", tags:["자아","경계"], meaning:"자아구조·사생활 경계 상태.", advice:"작업공간 10분 리셋." },
  school: { label:"학교", tags:["학습","평가"], meaning:"학습욕구·평가불안·성장통.", advice:"오늘 15분 신규학습 블럭." },
  hospital: { label:"병원", tags:["치유","점검"], meaning:"치유·검진·회복 필요 신호.", advice:"몸/마음 체크리스트 3항목 점검." },
  cemetery: { label:"묘지", tags:["종결","기억"], meaning:"마무리·애도·기억정리.", advice:"끝낼 일 1건 종결 선언." },
  ocean: { label:"바다", tags:["감정","무의식"], meaning:"감정의 광대함·변동성.", advice:"파도처럼 오르내리는 감정 관찰 5분." },
  river: { label:"강/하천", tags:["흐름","전환"], meaning:"변화의 흐름·이동.", advice:"작은 전환 1건(통근로/루틴) 적용." },
  mountain: { label:"산", tags:["도전","목표"], meaning:"도전·장기목표·인내.", advice:"최상위 목표 1개를 다음 행동으로 분해." },
  forest: { label:"숲", tags:["무의식","탐색"], meaning:"무의식 탐험·방향 상실/재발견.", advice:"혼자 걷기 10분 + 생각 메모." },
  desert: { label:"사막", tags:["고립","갈증"], meaning:"자원고갈·고립감·의미추구.", advice:"지원 요청 1건을 오늘 보냄." },
  bridge: { label:"다리", tags:["연결","과도기"], meaning:"과도기·연결·결단 직전.", advice:"미뤄둔 연락 1건 보내 연결 복원." },
  road: { label:"길/도로", tags:["진로","선택"], meaning:"진로·선택·방향감각 재조정.", advice:"오늘 선택 1건에 기준 1줄 정의." },
  elevator: { label:"엘리베이터", tags:["단계","가속"], meaning:"단계이동·빠른 변화에 대한 불안.", advice:"빠른 결정 1건을 안전장치와 함께 시행." },
  stairs: { label:"계단", tags:["과정","성장"], meaning:"계단식 성장·과정 중심.", advice:"작은 단계 체크리스트 3칸 진행." },

  // ===== 이동수단 =====
  car: { label:"자동차", tags:["자기통제","진로"], meaning:"자기주도 이동·통제감.", advice:"주도권이 필요한 일 1건 직접 잡기." },
  bus: { label:"버스", tags:["집단","흐름"], meaning:"타인 페이스에 편승/집단리듬.", advice:"오늘 내 페이스를 위한 20분 블럭 확보." },
  train: { label:"기차", tags:["경로","예정"], meaning:"정해진 경로·장거리 계획.", advice:"장기계획 1개 일정에 박아두기." },
  airplane: { label:"비행기", tags:["확장","높은 관점"], meaning:"확장·고도 상승·출국/이동.", advice:"프로젝트를 상위 3목표로 재정렬." },
  ship: { label:"배", tags:["항해","감정"], meaning:"감정의 바다를 건너는 항해.", advice:"감정일지 3문장 후 오늘의 항로 1문장." },

  // ===== 사물 =====
  phone: { label:"전화", tags:["소통","연결"], meaning:"연락/소통 욕구 또는 미루기.", advice:"중요한 1명에게 메시지 전송." },
  computer: { label:"컴퓨터", tags:["일","체계"], meaning:"일/체계/정보처리 과부하.", advice:"작업 인박스 10분 비우기." },
  book: { label:"책", tags:["지식","내면"], meaning:"지식·내면대화·의미탐색.", advice:"독서 10분과 핵심문장 1개 기록." },
  mirror: { label:"거울", tags:["자아","인식"], meaning:"자기인식·자존감 재평가.", advice:"거울 앞 자기긍정 1문장." },
  key: { label:"열쇠", tags:["해결","접근"], meaning:"해결실마리·접근권한.", advice:"문제 핵심질문 1개 작성." },
  door: { label:"문", tags:["기회","경계"], meaning:"출입/기회/경계 재설정.", advice:"거절/승인 하나를 명시적으로 선택." },
  window: { label:"창문", tags:["관점","통풍"], meaning:"관점/정보 유입/환기.", advice:"닫힌 통로 1개를 열어보기(정보/사람)." },
  wallet: { label:"지갑", tags:["가치","안전"], meaning:"재정/가치/안전감.", advice:"계좌잔액 확인 + 소액 자동이체 점검." },
  money: { label:"돈", tags:["자원","가치"], meaning:"자원·교환가치·불안/욕망.", advice:"오늘 지출 1건을 의식적으로 건너뛰기." },
  ring: { label:"반지", tags:["약속","관계"], meaning:"약속·헌신·관계의 구속/안정.", advice:"지키고 싶은 약속 1개를 문장화." },
  clock: { label:"시계", tags:["시간","압박"], meaning:"시간압박/마감/리듬.", advice:"타이머 25분 1회 집중." },
  shoes: { label:"신발", tags:["여정","역할"], meaning:"역할·여정·준비상태.", advice:"오늘 역할에 맞는 준비 1건." },
  clothes: { label:"옷", tags:["정체성","표현"], meaning:"표현/정체성/가면.", advice:"내일 입을 옷 미리 준비하여 정체성 정렬." },

  // ===== 사건/상황 =====
  exam: { label:"시험", tags:["평가불안","기준"], meaning:"평가불안·완벽주의 경직.", advice:"‘충분히 좋음’ 기준으로 1건 제출." },
  wedding: { label:"결혼식", tags:["결합","새출발"], meaning:"결합·계약·새 단계.", advice:"협업/약속 1건을 서면으로 확정." },
  funeral: { label:"장례식", tags:["종결","애도"], meaning:"종결·애도·전환 인정.", advice:"끝낸 일에 감사 1문장 기록." },
  pregnancy: { label:"임신", tags:["창조","준비"], meaning:"새 아이디어/프로젝트 임박.", advice:"아이디어 1건 3단계(초안→시작→유지)로 분해." },
  birth: { label:"출산", tags:["탄생","시작"], meaning:"실행의 시작·현실화.", advice:"오늘 바로 10분 착수." },
  falling: { label:"추락", tags:["통제","스트레스"], meaning:"통제상실/성과압박 신호.", advice:"할 일 3개로 축소 후 첫 행동 명확화." },
  flying: { label:"비행", tags:["자유","확장"], meaning:"자유·확장·관점전환.", advice:"익숙한 길 대신 다른 길로 이동." },
  chase: { label:"추격/쫓김", tags:["회피","두려움"], meaning:"미해결 과제·감정 회피.", advice:"미룬 일 1건 25분 스타트." },
  late: { label:"지각", tags:["불안","준비"], meaning:"준비부족 감각/완벽주의 압박.", advice:"완벽 대신 제출을 선택(최소기능 제출)." },
  lost: { label:"길 잃음", tags:["혼란","정체성"], meaning:"방향감 상실·정체성 탐색.", advice:"나침반 3요소(가치·강점·관심) 한 줄." },
  naked: { label:"나체", tags:["취약성","진정성"], meaning:"취약성·노출두려움·진정성 갈망.", advice:"안전한 상대 1명에게 진심 1문장." },
  drowning: { label:"물에 빠짐", tags:["감정과부하","무력"], meaning:"감정과부하·무력감.", advice:"감정 라벨링+호흡 4-7-8×3." },
  fire: { label:"불", tags:["변화","정화"], meaning:"격변/정화/분노 에너지.", advice:"불필요 1건 과감히 태워 없애기(삭제/해지)." },
  earthquake: { label:"지진", tags:["기초","불안"], meaning:"기반 동요·구조 재설계 필요.", advice:"핵심 시스템 1개(돈/시간) 리팩터링." },
  flood: { label:"홍수", tags:["감정폭발","범람"], meaning:"감정 폭발·경계 붕괴.", advice:"경계선 선언 1문장(시간/연락/업무)." },
  tsunami: { label:"쓰나미", tags:["대전환","압도"], meaning:"대전환/압도감/집단영향.", advice:"큰 변화에 대비한 버퍼 1개 확보." },

  // ===== 구조/추상 =====
  stairs_down: { label:"내려가는 계단", tags:["무의식","회귀"], meaning:"내면/과거로의 하강 탐색.", advice:"옛 감정 트리거 1개를 글로 적기." },
  stairs_up: { label:"올라가는 계단", tags:["성장","노력"], meaning:"노력에 따른 점진 성장.", advice:"‘오늘 한 칸’ 체크박스 1개 완료." },
  tunnel: { label:"터널", tags:["과도기","인내"], meaning:"과도기/인내/빛을 향한 진행.", advice:"끝을 알고 버티기—완료일 가정해 적기." },
};

export const KOR_ALIASES: Record<string, string[]> = {
  // 인물
  mother:["어머니","엄마"], father:["아버지","아빠"], partner:["연인","배우자"], ex:["전애인","옛연인"], child:["아이","자녀"], stranger:["낯선사람","모르는사람"],
  // 신체
  teeth:["치아","이빨","이"], hair:["머리카락","머리"], eyes:["눈"], blood:["피"], hands:["손"], feet:["발"],
  // 동물
  snake:["뱀"], dog:["개","강아지"], cat:["고양이"], bird:["새"], fish:["물고기"], spider:["거미"], tiger:["호랑이"], bear:["곰"],
  // 장소/자연
  house:["집","방","거실","주택"], school:["학교"], hospital:["병원"], cemetery:["묘지","납골당"], ocean:["바다","바닷물"], river:["강","하천"], mountain:["산"], forest:["숲"], desert:["사막"], bridge:["다리"], road:["길","도로"], elevator:["엘리베이터","승강기"], stairs:["계단"],
  // 이동수단
  car:["차","자동차"], bus:["버스"], train:["기차","지하철"], airplane:["비행기","항공기","비행"], ship:["배","선박","보트"],
  // 사물
  phone:["전화","핸드폰","스마트폰"], computer:["컴퓨터","노트북","PC"], book:["책"], mirror:["거울"], key:["열쇠"], door:["문"], window:["창문","창"], wallet:["지갑"], money:["돈","현금"], ring:["반지"], clock:["시계"], shoes:["신발"], clothes:["옷","의복"],
  // 사건/상황
  exam:["시험","고사"], wedding:["결혼식"], funeral:["장례식"], pregnancy:["임신"], birth:["출산"], falling:["추락","떨어짐"], flying:["비행","날아오름"], chase:["쫓김","추격","도망"], late:["지각","늦음"], lost:["길잃음","헤맴"], naked:["나체","벌거벗음"], drowning:["물에빠짐","익사"], fire:["불","화재"], earthquake:["지진"], flood:["홍수"], tsunami:["쓰나미","해일"],
  // 구조/추상
  stairs_down:["내려가는계단"], stairs_up:["올라가는계단"], tunnel:["터널"],
};

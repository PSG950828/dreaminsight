import { SymbolMeaning } from "./core";

// DreamInsight 확장 상징/추가 의미 (대표 상징 60+)
// 키는 사전/별칭(KOR_ALIASES_EXT)과 일치해야 탐지가 잘 됩니다.
export const EXTRA_SYMBOLS: Record<string, SymbolMeaning> = {
  teeth: {
    key: 'teeth', label: '이/치아', tags: ['발화','자기이미지','불안'],
    meaning: '치아는 발화/자기표현/자기이미지와 연결됩니다. 빠지거나 부서지는 꿈은 말하지 못함, 체면/외형 불안을 반영하기 쉽습니다.',
    advice: '치아 관련 불안을 한 단어로 라벨링하고 4-7-8 호흡 3회 후 핵심 문장 1개를 소리 내어 읽어보세요.'
  },
  falling: {
    key: 'falling', label: '추락', tags: ['통제감','급락','불안'],
    meaning: '추락은 통제력 저하/급락 공포를 나타냅니다. 결과 불확실성에 대한 불안을 보여줍니다.',
    advice: '현재 진행 중인 일에서 “중단 기준/연락처/대체 경로”를 3줄로 적어 리스크 버퍼를 확보하세요.'
  },
  flying: {
    key: 'flying', label: '비행/날기', tags: ['자유','확장','자기효능감'],
    meaning: '비행은 확장과 자유의 상징입니다. 안정적이면 효능감, 흔들리면 준비/기초 보강 신호일 수 있습니다.',
    advice: '지금 가장 확장하고 싶은 1가지를 25분 타이머로 “작은 조각”부터 실행해 보세요.'
  },
  house: {
    key: 'house', label: '집/방', tags: ['자아','안정','경계'],
    meaning: '집은 자아와 경계의 은유입니다. 방 구조/문/창은 심리적 경계 상태를 비춥니다.',
    advice: '집의 한 공간을 10분 정리하며 “지금 필요한 심리적 경계” 한 줄을 적어 보세요.'
  },
  water: {
    key: 'water', label: '물/바다', tags: ['감정','정화','몰입'],
    meaning: '물은 감정과 정화를 상징합니다. 잔잔함/파도/탁도에 따라 감정 상태의 힌트를 줍니다.',
    advice: '감정을 한 단어로 라벨링하고, 미지근한 물 한 잔과 3회 호흡으로 몸을 안정시키세요.'
  },
  exam: {
    key: 'exam', label: '시험/평가', tags: ['성과압박','준비','표현'],
    meaning: '시험은 평가와 기준의 압박을 상징합니다. 준비 부족/완벽주의가 혼재할 수 있습니다.',
    advice: '모의답 3문장을 소리 내어 읽고, 합격 기준을 나만의 문장으로 낮춰 정의해 보세요.',
    contexts: { psych: '평가 상황은 자기 효능감/완벽성 추구와 상호작용합니다.', culture: { kr: '입시 문화 맥락에서 자주 등장하는 상징.' } }
  },
  teeth_ctx: {
    key: 'teeth_ctx', label: '치아(심화)', tags: ['발화','이미지'],
    meaning: '치아는 심리적 발화(표현)와 자기 이미지의 상징.',
    advice: '핵심 문장 1개를 정하고 소리 내어 연습하세요.',
    contexts: { psych: '발화/자기표현 억제 → 치아 파손/빠짐 테마로 나타나기 쉬움.' }
  },
  tsunami: {
    key: 'tsunami', label: '파도/쓰나미', tags: ['감정파동','압도','불안'],
    meaning: '거대한 파도는 감정의 압도/스트레스 파동을 의미합니다.',
    advice: '오늘의 “압도 원인”을 1문장으로 쓰고, 25분 단절(알림 off)로 버퍼를 만드세요.'
  },
  
  cannot_speak: {
    key: 'cannot_speak', label: '말이 안 나옴', tags: ['표현','불안'],
    meaning: '발화가 막히는 꿈은 표현 불안/평가 시 긴장과 연결됩니다.',
    advice: '핵심 메시지 1문장 → 근거 2개를 3분 스피치로 녹음해 즉석 리허설 해보세요.'
  },
  chase: {
    key: 'chase', label: '추격/쫓김', tags: ['회피','불안','과제'],
    meaning: '쫓기는 대상은 미룬 과제/불편한 주제를 은유합니다.',
    advice: '도망친 과제 1개를 25분 타이머로 바로 착수하세요. 끝나면 감정을 한 줄 기록.'
  },
  hiding: {
    key: 'hiding', label: '숨기/은신', tags: ['자기보호','경계','회피'],
    meaning: '숨는 꿈은 경계 강화/과도한 회피의 양면을 보여줍니다.',
    advice: '지금 보호가 필요한 1가지를 확인하고, 회피 중인 행동을 1단계 축소해 실행하세요.'
  },
  ring_lost: {
    key: 'ring_lost', label: '반지 분실', tags: ['관계','약속','불안'],
    meaning: '반지는 관계의 약속/가치를 상징합니다. 분실은 약속 불안/가치 재검토 신호일 수 있습니다.',
    advice: '관계의 핵심 가치를 1문장으로 쓰고, 이번 주 작은 약속 1개를 합의하세요.'
  },
  wedding_canceled: {
    key: 'wedding_canceled', label: '결혼식 취소', tags: ['관계','결정','재평가'],
    meaning: '중요한 합의/결정을 미루거나 재평가하는 내적 과정을 비춥니다.',
    advice: '결정의 기준을 3줄로 쓰고, 오늘 결정/보류/추가정보 중 무엇인지 정하세요.'
  },
  partner_argument: {
    key: 'partner_argument', label: '연인과 말다툼', tags: ['관계','소통','경계'],
    meaning: '상호 경계/욕구 충돌을 드러냅니다. I-메시지로 재구성해보세요.',
    advice: '사실-느낌-요구 각 1문장(I-메시지)을 작성하고 전달 전 소리 내어 읽어보세요.'
  },
  jealousy_scene: {
    key: 'jealousy_scene', label: '질투/의심 장면', tags: ['관계','신뢰','통제'],
    meaning: '통제 상실/불안정 애착의 신호일 수 있습니다.',
    advice: '관찰 사실과 해석을 분리해 쓰고, 내 경계/요구를 1문장으로 명료화하세요.'
  },
  left_on_read: {
    key: 'left_on_read', label: '읽씹/답장 없음', tags: ['관계','불안','기대'],
    meaning: '기대-현실 불일치에서 오는 불안/해석 과잉을 반영합니다.',
    advice: '해석을 보류하고, “요청 1문장”만 명확히 하여 다음 행동을 정하세요.'
  },
  boss_criticism: {
    key: 'boss_criticism', label: '상사 질책', tags: ['직장','평가','스트레스'],
    meaning: '권위/평가 스트레스가 높을 때 자주 등장합니다.',
    advice: '사실-영향-다음 행동(3줄)로 피드백 요약 후, 1개만 즉시 실행하세요.'
  },
  coworker_conflict: {
    key: 'coworker_conflict', label: '동료 갈등', tags: ['협업','경계','역할'],
    meaning: '불명확한 역할/규칙이 갈등으로 표출될 수 있습니다.',
    advice: '역할/시간/결과 3줄 작업계약을 제안해 협업 규칙을 명료화하세요.'
  },
  medical_checkup: {
    key: 'medical_checkup', label: '검진/검사', tags: ['건강','불안','준비'],
    meaning: '건강 불안을 비추는 상징. 정보/기다림의 스트레스가 섞여 있습니다.',
    advice: '의사에게 물을 질문 1개와 증상/기간/강도를 메모해 준비하세요.'
  },
  fever: { key: 'fever', label: '발열', tags: ['건강','회복'], meaning: '신체 피로/감염 신호의 은유.', advice: '수분/휴식/자극 줄이기 중심의 10분 회복 루틴을 하세요.' },
  cough: { key: 'cough', label: '기침', tags: ['건강','회복'], meaning: '목/호흡기 자극을 상징.', advice: '수분/가습/자극 회피를 점검하고 필요 시 진료를 예약하세요.' },
  headache: { key: 'headache', label: '두통', tags: ['건강','스트레스'], meaning: '과부하/수면/시야 피로를 반영.', advice: '빛/스크린타임/수분을 조정하고 10분 휴식 루틴을 가지세요.' },
  stomach_pain: { key: 'stomach_pain', label: '복통', tags: ['건강','스트레스'], meaning: '소화/긴장 문제의 은유.', advice: '자극 식품/스트레스 촉발을 기록하고 온/수분으로 진정하세요.' },
  hospital_visit: { key: 'hospital_visit', label: '병원 방문', tags: ['건강','불안'], meaning: '안전/확인 욕구의 반영.', advice: '기록/보험/문의사항을 정리해 불확실성을 낮추세요.' },
  surgery: { key: 'surgery', label: '수술', tags: ['전환','두려움'], meaning: '과감한 변화/개입의 상징.', advice: '장단/대안/두 번째 의견을 정리해 결정을 돕세요.' },
  injection: { key: 'injection', label: '주사/채혈', tags: ['건강','두려움'], meaning: '짧은 개입/회복을 상징.', advice: '호흡 3회로 긴장을 낮추고 이후 휴식을 계획하세요.' },
  quarantine: { key: 'quarantine', label: '격리/감염', tags: ['건강','경계'], meaning: '경계 강화/사회 연결 부족의 양면.', advice: '연결감 1행동(통화/메시지)과 회복 루틴을 병행하세요.' },

  phone_call: {
    key: 'phone_call', label: '전화/통화', tags: ['연결','소통'],
    meaning: '연결 욕구/소통의 필요를 나타냅니다.',
    advice: '연락이 필요한 사람 1명에게 1문장 메시지를 바로 보내세요.'
  },
  photo_shoot: {
    key: 'photo_shoot', label: '사진/촬영', tags: ['기록','이미지','표현'],
    meaning: '기록/자기이미지 관리의 욕구.',
    advice: '오늘의 장면 1컷을 기록하고, 떠오른 생각을 3줄로 적으세요.'
  },
  sign_contract: {
    key: 'sign_contract', label: '계약/서명', tags: ['합의','책임','결정'],
    meaning: '중요 합의/책임 수락의 상징.',
    advice: '범위/기간/책임 3항목을 명확히 적고 진행/보류를 결정하세요.'
  },
  argue_text: {
    key: 'argue_text', label: '문자/DM 말다툼', tags: ['소통','오해','감정'],
    meaning: '텍스트 환경의 오해/감정 격화를 반영.',
    advice: '텍스트 대신 통화 5분으로 전환하여 맥락을 복구하세요.'
  },
  apology_request: {
    key: 'apology_request', label: '사과/용서', tags: ['관계','회복'],
    meaning: '관계 회복/책임 인식의 신호.',
    advice: '사실-느낌-요구를 분리해 진심 어린 사과/요청을 준비하세요.'
  },

  login_failed: { key: 'login_failed', label: '로그인 실패', tags: ['디지털','접근','불안'], meaning: '접근/정체성 검증 실패의 은유.', advice: '비밀번호/복구/2FA를 정비하고 비상 연락 메모를 준비하세요.' },
  password_forgot: { key: 'password_forgot', label: '비밀번호 잊음', tags: ['디지털','기억','불안'], meaning: '접근 키 분실과 정체성 불안을 반영.', advice: '비밀번호 관리자/백업/2FA 백업코드 정리를 10분 진행하세요.' },
  two_factor: { key: 'two_factor', label: '2단계 인증', tags: ['보안','디지털'], meaning: '보안/경계 강화의 상징.', advice: '핵심 계정 2FA 활성화/백업 코드 인쇄를 확인하세요.' },
  cloud_sync_lost: { key: 'cloud_sync_lost', label: '동기화 끊김', tags: ['디지털','불안'], meaning: '일관성/연속성 상실의 은유.', advice: '스토리지 용량/계정 상태를 점검하고 수동 동기화를 실행하세요.' },
  file_deleted: { key: 'file_deleted', label: '파일 삭제', tags: ['손실','기억','디지털'], meaning: '기억/성과 소실의 불안.', advice: '버전/백업 정책을 정하고 복구 경로를 미리 마련하세요.' },
  storage_full: { key: 'storage_full', label: '저장공간 부족', tags: ['정리','우선순위'], meaning: '과부하/정리 필요의 신호.', advice: '10분 정리로 상위 불필요 항목을 제거하고 공간을 확보하세요.' },
  screen_cracked: { key: 'screen_cracked', label: '화면 깨짐', tags: ['이미지','손상','경계'], meaning: '이미지/경계 손상을 상징.', advice: '디지털 피로를 줄이고 보호장치를 점검하세요.' },

  subway_crowd: { key: 'subway_crowd', label: '지하철 혼잡/환승', tags: ['이동','혼잡','시간'], meaning: '경로/시간 압박과 군중 피로를 반영.', advice: '혼잡 시간 회피/대체 경로/버퍼 시간을 설계하세요.' },
  taxi_lost: { key: 'taxi_lost', label: '택시 길 잃음', tags: ['이동','방향','통제'], meaning: '방향 상실/타인 통제에 대한 불안.', advice: '목적지/경로/요금 기준을 사전 합의하고 필요시 즉시 중단하세요.' },
  passport_lost: { key: 'passport_lost', label: '여권 분실', tags: ['정체성','이동','불안'], meaning: '신원/이동 자유 상실의 두려움.', advice: '신분/결제/연락의 대체 수단을 준비하세요.' },
  phone_dead: { key: 'phone_dead', label: '폰 방전', tags: ['연결','의존','단절'], meaning: '연결 단절/의존도 경고.', advice: '비상 전력/연락 루틴을 준비하고 의존도를 점검하세요.' },
  shoes_missing: { key: 'shoes_missing', label: '신발 분실/맨발', tags: ['준비','취약','경계'], meaning: '준비 부족/취약감 표출.', advice: '내일 필요한 준비물/의복/문구를 5분 점검하세요.' },
  wallet_lost: { key: 'wallet_lost', label: '지갑 분실', tags: ['재정','불안','정체성'], meaning: '통제감/재정 불안을 반영.', advice: '결제/신분 대체 수단과 분실 시 대응 리스트를 작성하세요.' },
  door_locked: { key: 'door_locked', label: '문 잠김', tags: ['경계','접근','차단'], meaning: '경계 과도/접근 차단의 신호.', advice: '접근 권한/요청 문장을 명확히 하고 다른 경로를 검토하세요.' },
  window_broken: { key: 'window_broken', label: '창문 깨짐', tags: ['경계','노출','취약'], meaning: '경계 누수/노출 공포.', advice: '정보 공유 범위를 재설정하고 민감 데이터 접근을 제한하세요.' },
  key_lost: { key: 'key_lost', label: '열쇠 분실', tags: ['접근','통제'], meaning: '통제 키 분실의 은유.', advice: '복구 키/백업을 확인하고 접근 권한을 재발급하세요.' },
  alarm_missed: { key: 'alarm_missed', label: '알람 미스', tags: ['시간','통제','불안'], meaning: '리듬/시간 관리 불안을 반영.', advice: '이중 알람/수면 위생을 점검하고 미리 알림을 설정하세요.' },
  heavy_rain: { key: 'heavy_rain', label: '폭우', tags: ['감정','압도'], meaning: '감정의 강한 방출/압도.', advice: '실내 회복 루틴(물/호흡/정리)으로 감정을 낮추세요.' },
  thunder_lightning: { key: 'thunder_lightning', label: '천둥/번개', tags: ['충격','각성'], meaning: '급격한 통찰/충격 사건의 메타포.', advice: '떠오른 아이디어/걱정을 3줄로 기록해 정돈하세요.' },
  snow_storm: { key: 'snow_storm', label: '폭설', tags: ['정체','지연'], meaning: '진행 지연/에너지 저하의 신호.', advice: '속도를 80%로 낮추고 오늘 최소 달성 목록을 재정의하세요.' },
  fog: { key: 'fog', label: '안개', tags: ['불확실','가시성'], meaning: '목표/정보의 불확실.', advice: '다음 행동을 10분 단위로 쪼개고 가시성을 높일 질문을 쓰세요.' },

  // ── 생활/자주 나오는 상징군 확장 ─────────────────────────────
  lost_way: { key: 'lost_way', label: '길을 잃음', tags: ['방향','불확실','탐색'], meaning: '현재 목표/경로에 대한 불확실성을 반영.', advice: '목표를 1문장으로 다시 쓰고, 다음 행동 1가지를 10분 단위로 정의하세요.' },
  elevator: { key: 'elevator', label: '엘리베이터', tags: ['상승','하강','통제'], meaning: '빠른 상승/하강, 통제감/불안의 스펙트럼.', advice: '현재 단계(층)를 명확히 하고 상향/하향 이유 1가지를 적으세요.' },
  toilet: { key: 'toilet', label: '화장실', tags: ['정화','개인공간','경계'], meaning: '감정 배출/개인 경계의 필요.', advice: '짧은 혼자만의 시간을 만들고 내 감정 3단어를 적으세요.' },
  naked: { key: 'naked', label: '나체/벌거벗음', tags: ['취약','노출','수치'], meaning: '평가/노출에 대한 불안, 진정성의 갈등.', advice: '공개 범위를 정리하고 보여줄/보호할 것을 각 1개씩 정하세요.' },
  snake: { key: 'snake', label: '뱀', tags: ['위협','변화','에너지'], meaning: '두려움/변화/생명 에너지의 상징.', advice: '두려움의 이름을 1단어로 쓰고 노출/회피 중 선택해 작게 시도.' },
  dog: { key: 'dog', label: '개', tags: ['충성','보호','본능'], meaning: '보호/친밀/경계의 균형.', advice: '오늘 나를 지켜줄 작은 규칙 1개를 정하세요.' },
  cat: { key: 'cat', label: '고양이', tags: ['자율','감각','경계'], meaning: '자율성과 섬세한 경계.', advice: '필요한 “거절 1문장”을 준비하고 실제로 써 보세요.' },
  baby: { key: 'baby', label: '아기/아이', tags: ['시작','성장','돌봄'], meaning: '새로운 시작/연약함/돌봄의 필요.', advice: '막 시작한 일의 “작은 돌봄” 1가지를 실행하세요.' },
  funeral: { key: 'funeral', label: '장례/상가', tags: ['종결','애도','전환'], meaning: '관계/단계의 종결과 애도 과정.', advice: '끝난 것에서 배운 1가지를 기록하고, 보낼 의식을 작게 해보세요.' },
  fire: { key: 'fire', label: '불/화재', tags: ['에너지','파괴','경고'], meaning: '급격한 에너지/위험 신호.', advice: '오늘의 위험 트리거 1개를 줄이고 대체 행동을 정하세요.' },
  blood: { key: 'blood', label: '피/출혈', tags: ['생명','에너지','경고'], meaning: '에너지 손실/경고 신호의 은유.', advice: '수면/수분/영양 중 하나를 10분 보정하세요.' },
  mirror: { key: 'mirror', label: '거울', tags: ['자기인식','이미지'], meaning: '자기 인식/정체성 점검.', advice: '오늘의 한 줄 자기정의와 바라는 이미지를 각 1문장.' },
  hair_loss: { key: 'hair_loss', label: '탈모/머리카락 빠짐', tags: ['이미지','불안','통제'], meaning: '이미지/통제감 저하 불안.', advice: '영향력 있는 1가지를 선택해 10분 집중 실행.' },

  // ── 한국에서 자주 거론되는 상징 대량 보강 ─────────────────────
  pig_gold: {
    key: 'pig_gold',
    label: '돼지/황금돼지',
    tags: ['재물','행운','충만'],
    meaning: '살찐 돼지나 황금돼지는 전통적으로 재물 운과 자원 흐름이 커지는 징조로 읽힙니다.',
    advice: '최근 떠오르는 기회 1개를 적고, 5분 내 실행할 작은 실험부터 시작하세요.'
  },
  dragon_ascend: {
    key: 'dragon_ascend',
    label: '용이 하늘로 오름',
    tags: ['출세','성장','권위'],
    meaning: '용이 상승하는 장면은 사회적 지위와 영향력이 빠르게 확대되는 상징입니다.',
    advice: '당장 승격시키고 싶은 역량 1가지를 선택해 이번 주 학습 시간을 블로킹하세요.'
  },
  poop_windfall: {
    key: 'poop_windfall',
    label: '똥/배설물',
    tags: ['재물','정화','에너지'],
    meaning: '배설물은 막힌 자원과 에너지가 한꺼번에 나오는 은유로, 뜻밖의 재물 운으로 해석됩니다.',
    advice: '갑작스레 들어온 수입이 있다면 50% 저축·30% 투자·20% 즐거움 등 배분 원칙을 정하세요.'
  },
  clear_spring: {
    key: 'clear_spring',
    label: '맑은 샘물',
    tags: ['정화','감정','회복'],
    meaning: '맑고 투명한 물은 감정 정화와 회복력을 의미하며, 마음속 부담이 풀릴 신호입니다.',
    advice: '감사한 일 3가지를 적고, 물 한 잔과 함께 호흡 3회를 통해 안정감을 채우세요.'
  },
  muddy_water: {
    key: 'muddy_water',
    label: '흙탕물/탁한 물',
    tags: ['혼탁','불안','경고'],
    meaning: '흙탕물은 감정과 정보가 혼탁해진 상태를 나타내며 갈등/소문을 경계하라는 메시지입니다.',
    advice: '확실치 않은 소식은 “사실/추측”을 분리해 기록하고, 확인 전 행동을 미루세요.'
  },
  typhoon: {
    key: 'typhoon',
    label: '태풍',
    tags: ['혼란','변화','압도'],
    meaning: '태풍 꿈은 거센 외부 변화나 조직 개편 같은 변수가 몰려온다는 신호로 읽힙니다.',
    advice: '최악의 시나리오를 3줄로 쓰고, 대응 플랜 A/B를 빠르게 스케치해 두세요.'
  },
  rainbow: {
    key: 'rainbow',
    label: '무지개',
    tags: ['희망','조화','회복'],
    meaning: '무지개는 폭풍 뒤 찾아오는 균형과 희망의 상징으로, 갈등이 완화될 조짐을 뜻합니다.',
    advice: '지금 감사한 사람 1명에게 짧은 감사 메시지를 보내 긍정의 흐름을 강화하세요.'
  },
  lost_child: {
    key: 'lost_child',
    label: '아이 잃어버림',
    tags: ['책임','불안','돌봄'],
    meaning: '아이를 잃는 꿈은 내가 돌봐야 할 프로젝트/감정이 소홀해졌다는 경고로 해석됩니다.',
    advice: '돌봄이 필요한 과제 1개를 확인하고 오늘 15분 점검 시간을 즉시 캘린더에 넣으세요.'
  },
  found_money: {
    key: 'found_money',
    label: '돈 줍기',
    tags: ['기회','재물','우연'],
    meaning: '길에서 돈을 줍는 꿈은 숨은 기회나 보상 요소를 발견할 신호입니다.',
    advice: '최근 완료한 일 중 추가 보상을 요청할 수 있는 항목을 골라 근거 3줄로 정리하세요.'
  },
  celebrity_meet: {
    key: 'celebrity_meet',
    label: '연예인 만남',
    tags: ['인정','욕구','영감'],
    meaning: '유명인과의 만남은 인정 욕구와 롤모델을 향한 동경이 반영된 장면입니다.',
    advice: '롤모델의 습관 1개를 내 루틴에 옮겨 적고 오늘부터 7일간 실험하세요.'
  },
  public_stage: {
    key: 'public_stage',
    label: '무대에 서기',
    tags: ['표현','평가','용기'],
    meaning: '많은 사람 앞에서 발표하는 꿈은 나의 메시지를 더 크게 드러내고 싶은 욕구와 두려움이 공존함을 뜻합니다.',
    advice: '전달하고 싶은 핵심 문장 1개와 근거 2개를 메모해 즉석 발표 연습을 녹음하세요.'
  },
  haircut: {
    key: 'haircut',
    label: '머리카락을 자름',
    tags: ['전환','정리','이미지'],
    meaning: '머리를 자르는 꿈은 과거 이미지를 정리하고 새로운 정체성으로 넘어가려는 의지를 나타냅니다.',
    advice: '3개월간 붙잡고 있던 낡은 역할 1가지를 과감히 정리할 날짜를 정하세요.'
  },
  long_hair: {
    key: 'long_hair',
    label: '머리카락이 길어짐',
    tags: ['에너지','매력','축적'],
    meaning: '머리가 길게 자라는 꿈은 에너지 축적과 매력/자원 확장을 상징합니다.',
    advice: '현재 쌓고 싶은 역량을 30분 블록으로 예약하고 꾸준히 누적할 구조를 만드세요.'
  },
  wedding_dress: {
    key: 'wedding_dress',
    label: '웨딩드레스 입기',
    tags: ['결정','관계','준비'],
    meaning: '웨딩드레스는 장기 약속과 결정을 앞둔 심리를 반영합니다.',
    advice: '약속하려는 대상/가치를 한 문장으로 쓰고, 필요 조건을 체크리스트로 정리하세요.'
  },
  divorce_paper: {
    key: 'divorce_paper',
    label: '이혼 서류',
    tags: ['종결','경계','재정리'],
    meaning: '관계나 계약을 재정의하려는 욕구가 강할 때 등장합니다.',
    advice: '이어갈 것/멈출 것/새로 만들 것을 3열 표로 작성해 경계를 명확히 하세요.'
  },
  military_draft: {
    key: 'military_draft',
    label: '입영 통지',
    tags: ['의무','규율','긴장'],
    meaning: '강제성이 높은 규율 환경에 투입될 준비가 안 된 심리를 표현합니다.',
    advice: '다가오는 의무에서 필요한 준비물과 지원 요청 대상을 적어 부담을 분산하세요.'
  },
  school_uniform: {
    key: 'school_uniform',
    label: '교복 입음',
    tags: ['과거','규범','학습'],
    meaning: '교복은 학습 모드와 과거 규범으로 돌아가라는 메시지를 줍니다.',
    advice: '배우고 싶은 주제를 1개 정하고, 30분 학습 일정을 이번 주 캘린더에 넣으세요.'
  },
  late_exam: {
    key: 'late_exam',
    label: '시험 지각',
    tags: ['불안','준비','압박'],
    meaning: '시험에 늦는 꿈은 완벽주의와 준비 부족의 충돌을 상징합니다.',
    advice: '이번 주 중요 과제를 “필수/선택”으로 나누고 필수만 먼저 완료하세요.'
  },
  train_missed: {
    key: 'train_missed',
    label: '기차 놓침',
    tags: ['기회','시간','초조'],
    meaning: '기차를 놓치는 장면은 중요한 기회를 놓칠까 두려운 마음을 표현합니다.',
    advice: '현재 진행 중인 기회에 마감일·다음 행동·도움 요청 대상을 명시하세요.'
  },
  bus_missed: {
    key: 'bus_missed',
    label: '버스 놓침',
    tags: ['일상','리듬','조정'],
    meaning: '버스를 놓치는 꿈은 일상 루틴이 어긋났음을 알리는 신호입니다.',
    advice: '하루 시작 루틴을 3단계로 정리하고 내일 아침 즉시 재정렬하세요.'
  },
  traffic_jam: {
    key: 'traffic_jam',
    label: '교통 체증',
    tags: ['지연','스트레스','통제'],
    meaning: '교통 체증은 진행이 느려지는 환경에서 오는 답답함을 드러냅니다.',
    advice: '지연되는 프로젝트에 “대체 경로” 1개를 정의하고 이해관계자와 공유하세요.'
  },
  car_brake_fail: {
    key: 'car_brake_fail',
    label: '브레이크 고장',
    tags: ['통제','위험','경고'],
    meaning: '차량 브레이크가 듣지 않는 꿈은 통제력을 잃을 상황을 경고합니다.',
    advice: '현재 과속 중인 업무를 파악하고, 즉시 속도를 줄일 기준을 명확히 하세요.'
  },
  elevator_freefall: {
    key: 'elevator_freefall',
    label: '엘리베이터 추락',
    tags: ['불안','급락','경고'],
    meaning: '엘리베이터가 추락하는 꿈은 급격한 성과 하락에 대한 두려움을 나타냅니다.',
    advice: '핵심 지표 1개를 선정하고, 하락 시 대응 안건을 미리 정리해 두세요.'
  },
  plane_delay: {
    key: 'plane_delay',
    label: '비행기 지연',
    tags: ['여행','기대','조정'],
    meaning: '비행기 지연은 기대하던 확장 계획이 일정 조정을 겪는다는 뜻입니다.',
    advice: '프로젝트 타임라인에 여유 버퍼를 추가하고, 지연 공지를 사전에 준비하세요.'
  },
  plane_turbulence: {
    key: 'plane_turbulence',
    label: '비행기 난기류',
    tags: ['변동','긴장','적응'],
    meaning: '난기류는 변화 과정의 흔들림을 이겨낼 적응력이 필요함을 시사합니다.',
    advice: '변수 발생 시 대체 계획을 2개 적어두고, 지금 바로 실행할 안전장치를 확인하세요.'
  },
  mountain_peak: {
    key: 'mountain_peak',
    label: '산 정상 도달',
    tags: ['성취','관점','휴식'],
    meaning: '정상에 오르는 꿈은 노력의 결실과 새로운 관점을 얻을 시기임을 의미합니다.',
    advice: '최근 성과를 3줄로 기록하고, 축하/휴식을 위한 작은 보상을 실행하세요.'
  },
  forest_path: {
    key: 'forest_path',
    label: '숲길 걷기',
    tags: ['치유','탐색','직감'],
    meaning: '숲길은 직감과 자연 치유력을 회복하라는 메시지입니다.',
    advice: '자연 속 30분 산책 일정을 잡고, 떠오른 생각을 음성 메모로 남기세요.'
  },
  ocean_swim: {
    key: 'ocean_swim',
    label: '바다 수영',
    tags: ['감정','몰입','도전'],
    meaning: '바다를 헤엄치는 꿈은 깊은 감정 속으로 몰입할 용기와 호기심을 나타냅니다.',
    advice: '감정 기록장을 열고 지금 느끼는 감정을 5단어로 표현해 보세요.'
  },
  shark_attack: {
    key: 'shark_attack',
    label: '상어에게 쫓김',
    tags: ['위협','직장','경쟁'],
    meaning: '상어는 강력한 경쟁자나 공격적인 상황을 은유합니다.',
    advice: '경쟁 상황에서 내 강점을 3줄로 정리하고, 방어가 아닌 협상 전략을 구상하세요.'
  },
  fireworks: {
    key: 'fireworks',
    label: '불꽃놀이',
    tags: ['축하','감정','표현'],
    meaning: '불꽃놀이는 감정 방출과 축하 욕구를 상징합니다.',
    advice: '최근 성취를 주변과 공유하고, 스스로에게도 축하 메시지를 남기세요.'
  },
  blackout: {
    key: 'blackout',
    label: '정전/블랙아웃',
    tags: ['불확실','단절','재시작'],
    meaning: '정전은 갑작스러운 단절과 재시작이 필요한 환경을 비춥니다.',
    advice: '중단되면 곤란한 업무를 파악하고, 오프라인 백업/대체 연락망을 마련하세요.'
  },
  house_invasion: {
    key: 'house_invasion',
    label: '집에 도둑/침입자',
    tags: ['경계','불안','보호'],
    meaning: '집 침입은 개인 경계가 침해받는 상황을 경고합니다.',
    advice: '내 삶의 경계를 3단계(물리/시간/감정)로 나눠 강화할 부분을 정하세요.'
  },
  public_apology: {
    key: 'public_apology',
    label: '공개 사과',
    tags: ['책임','명예','조정'],
    meaning: '공개 사과는 명예와 책임을 회복하려는 의지를 드러냅니다.',
    advice: '사과가 필요한 상대에게 사실-느낌-요구 구조로 메시지를 작성하세요.'
  },
  exam_top_score: {
    key: 'exam_top_score',
    label: '시험 1등/고득점',
    tags: ['성과','인정','자신감'],
    meaning: '고득점은 준비에 대한 확신과 인정 욕구가 충족되는 순간을 예고합니다.',
    advice: '축적해온 실력을 보여줄 무대 1개를 선택해 발표/출품 신청을 완료하세요.'
  },
  reunion_class: {
    key: 'reunion_class',
    label: '동창회 모임',
    tags: ['회상','비교','정체성'],
    meaning: '동창회는 과거와 현재의 자아를 비교하며 정체성을 재정립하려는 마음을 보여줍니다.',
    advice: '과거의 나와 현재의 나를 각 3단어로 적고, 성장한 지점을 확인하세요.'
  },
  parenting_exam: {
    key: 'parenting_exam',
    label: '육아 시험',
    tags: ['돌봄','압박','성장'],
    meaning: '돌봄 역할에 대한 부담과 실력을 검증받고 싶은 마음이 반영됩니다.',
    advice: '양육/돌봄에서 힘든 지점을 1문장으로 쓰고, 지원 요청 대상을 정하세요.'
  },
  coworker_romance: {
    key: 'coworker_romance',
    label: '동료와 썸/연애',
    tags: ['경계','호기심','협업'],
    meaning: '업무와 감정이 뒤섞일 때 등장하는 장면으로, 경계 재설정이 필요함을 시사합니다.',
    advice: '업무 관계 규칙을 3줄로 정하고, 혼란스러운 감정은 개인 저널에 기록하세요.'
  },
  parents_argue: {
    key: 'parents_argue',
    label: '부모님 다툼',
    tags: ['가족','불안','기원'],
    meaning: '기초 관계에서 느끼는 불안과 충돌이 현재 삶의 갈등에 투사된 상황입니다.',
    advice: '현재 관계 갈등에서 반복되는 패턴을 3줄로 적고, 끊어낼 선택을 구체화하세요.'
  },
  junior_competition: {
    key: 'junior_competition',
    label: '후배에게 밀림',
    tags: ['경쟁','자존감','학습'],
    meaning: '후배에게 추월당하는 꿈은 성장 정체와 비교 스트레스를 상징합니다.',
    advice: '강화하고 싶은 기술을 정하고, 후배/동료에게 피드백을 청해 격차를 줄이세요.'
  },
  tooth_implant: {
    key: 'tooth_implant',
    label: '치아 임플란트',
    tags: ['회복','표현','투자'],
    meaning: '손상된 표현 능력을 회복하기 위해 자원을 투자해야 함을 시사합니다.',
    advice: '발표/소통 스킬 강화를 위해 필요한 교육/코칭을 조사하고 예산을 확보하세요.'
  },
  late_night_shift: {
    key: 'late_night_shift',
    label: '야근/밤샘 근무',
    tags: ['과로','성과','경고'],
    meaning: '야근 꿈은 과도한 책임감과 번아웃 위험을 경고합니다.',
    advice: '중요·긴급 매트릭스로 업무를 분류하고, 오늘은 반드시 종료할 시간을 선언하세요.'
  },
  mask_fall_off: {
    key: 'mask_fall_off',
    label: '마스크가 벗겨짐',
    tags: ['정체','진실','노출'],
    meaning: '겉과 속이 다른 모습이 드러날까 두려울 때 등장합니다.',
    advice: '숨기고 있는 사실/감정을 3줄로 정리하고 신뢰할 수 있는 사람과 나눠보세요.'
  },
  payment_declined: {
    key: 'payment_declined',
    label: '결제 거절',
    tags: ['재정','신용','경고'],
    meaning: '재정이나 신뢰도가 흔들리는 상황을 경고합니다.',
    advice: '재정 대시보드를 업데이트하고, 불필요한 구독/지출을 즉시 정리하세요.'
  },

  // === 죽음/생사 === 
  death: {
    key: 'death',
    label: '죽음',
    tags: ['종결','변화','재생'],
    meaning: '기존 정체성이나 상황의 종료를 의미합니다. 새로운 시작을 위한 정화 과정입니다.',
    advice: '끝낼 관계나 습관 1개를 오늘 정리하고 새로운 시작을 위한 공간을 만드세요.'
  },
  resurrection: {
    key: 'resurrection', 
    label: '부활/되살아남',
    tags: ['재생','희망','기적'],
    meaning: '포기했던 것의 재기회나 내면 에너지 회복을 나타냅니다.',
    advice: '중단했던 프로젝트 1개를 재검토하고 재시작 여부를 결정하세요.'
  },
  zombie: {
    key: 'zombie',
    label: '좀비',
    tags: ['미해결','집착','강박'],
    meaning: '죽었지만 끝나지 않은 것. 반복되는 강박적 패턴을 의미합니다.',
    advice: '반복되는 부정적 패턴 1개를 의식적으로 중단하고 새로운 행동을 시도하세요.'
  },

  // === 성적/친밀 ===
  sex: {
    key: 'sex',
    label: '성관계',
    tags: ['친밀','에너지','창조'],
    meaning: '창조적 에너지와 친밀감 욕구를 나타냅니다. 생명력의 표출입니다.',
    advice: '창조적 에너지를 안전한 채널로 표출하세요(운동/예술 30분).'
  },
  affair: {
    key: 'affair',
    label: '불륜/외도', 
    tags: ['욕망','금기','갈등'],
    meaning: '허용되지 않은 욕망이나 현재 관계의 부족감을 나타냅니다.',
    advice: '현재 관계에서 부족한 부분 1개를 직접 대화로 해결하세요.'
  },

  // === 초자연적/환상 ===
  alien: {
    key: 'alien',
    label: '외계인',
    tags: ['타자','미지','소외'],
    meaning: '완전히 다른 관점이나 소외감, 또는 새로운 가능성을 의미합니다.',
    advice: '평소와 완전히 다른 관점에서 문제 1개를 재검토하세요.'
  },
  spaceship: {
    key: 'spaceship',
    label: '우주선',
    tags: ['여행','확장','미래'],
    meaning: '의식의 확장과 새로운 차원으로의 이동을 의미합니다.',
    advice: '현재 한계를 벗어나는 계획 1개를 구체화하세요.'
  },
  ghost: {
    key: 'ghost',
    label: '유령',
    tags: ['과거','미해결','기억'],
    meaning: '과거의 미해결된 것들이나 잊혀지지 않는 기억을 나타냅니다.',
    advice: '과거 미해결 감정 1개를 일기로 정리 후 상징적 해방 의식을 하세요.'
  },
  magic: {
    key: 'magic',
    label: '마법',
    tags: ['변화','가능성','직감'],
    meaning: '상식을 넘어선 변화 가능성과 직감적 힘을 의미합니다.',
    advice: '논리적 접근 말고 직감으로 결정 1개를 내려보세요.'
  },
  monster: {
    key: 'monster',
    label: '괴물',
    tags: ['두려움','그림자','압도'],
    meaning: '억압된 두려움이나 자아의 어두운 면을 나타냅니다.',
    advice: '가장 두려워하는 것 1개를 작은 단계로 직면해보세요.'
  },

  // === 폭력/위험 ===
  violence: {
    key: 'violence',
    label: '폭력',
    tags: ['분노','힘','경계'],
    meaning: '억압된 분노나 힘의 분출 욕구를 나타냅니다.',
    advice: '분노 에너지를 건설적 활동으로 전환하세요(운동/청소 30분).'
  },
  murder: {
    key: 'murder',
    label: '살인',
    tags: ['종결','분노','변화'],
    meaning: '무엇인가를 완전히 끝내고 싶은 강한 욕구를 나타냅니다.',
    advice: '독성 관계나 습관 1개를 단호하게 차단하세요.'
  },
  attack: {
    key: 'attack',
    label: '공격받음',
    tags: ['취약','방어','위기'],
    meaning: '외부 압력이나 비판에 대한 두려움을 나타냅니다.',
    advice: '방어 전략 1개를 구체화하고 지원을 요청하세요.'
  },

  // 변화/변신
  transformation: {
    key: 'transformation',
    label: '변신/변화',
    tags: ['변화','진화','적응'],
    meaning: '근본적 변화 과정과 새로운 정체성을 나타냅니다.',
    advice: '변화하고 싶은 자아 측면 1개를 오늘부터 작은 행동으로 실험하세요.'
  },
  invisible: {
    key: 'invisible',
    label: '투명해짐',
    tags: ['존재감','소외','자유'],
    meaning: '존재감 상실이나 자유로운 관찰자 되기를 나타냅니다.',
    advice: '자신의 존재감을 확인받을 수 있는 활동 1개를 실행하세요.'
  },

  // === 색상 단서 ===
  color_red: {
    key: 'color_red',
    label: '빨간색',
    tags: ['에너지','경고','충동','열정'],
    meaning: '강한 에너지와 경고 신호. 행동에 대한 충동이나 위험을 나타냅니다.',
    advice: '강한 감정을 느끼는 상황에서 3분 호흡 후 신중한 행동을 취하세요.'
  },
  color_blue: {
    key: 'color_blue', 
    label: '파란색',
    tags: ['차분','우울','지적','신뢰'],
    meaning: '차분함과 이성적 사고를 나타내지만, 때로는 우울감의 신호이기도 합니다.',
    advice: '현재 감정 상태를 점검하고 논리적 사고와 감정의 균형을 맞추세요.'
  },
  color_green: {
    key: 'color_green',
    label: '초록색',
    tags: ['회복','성장','자연','치유'],
    meaning: '성장과 회복의 에너지. 자연과의 연결과 치유 과정을 의미합니다.',
    advice: '자연과 접촉할 시간을 만들고 성장하고 있는 부분에 집중하세요.'
  },
  color_black: {
    key: 'color_black',
    label: '검은색',
    tags: ['무의식','두려움','미지','신비'],
    meaning: '무의식의 깊은 영역이나 알려지지 않은 두려움을 나타냅니다.',
    advice: '두려움의 실체를 구체적으로 파악하고 작은 단계로 직면해보세요.'
  },
  color_white: {
    key: 'color_white',
    label: '흰색',
    tags: ['순수','새시작','정화','평화'],
    meaning: '순수성과 새로운 시작. 정화와 평화의 상징입니다.',
    advice: '새로운 시작을 위해 하나의 영역을 깨끗하게 정리하세요.'
  },
  color_purple: {
    key: 'color_purple',
    label: '보라색',
    tags: ['직관','영적','창의','신비'],
    meaning: '직관적 지혜와 창의성. 영적 차원의 통찰을 나타냅니다.',
    advice: '직감을 믿고 창의적 활동에 시간을 할애하세요.'
  },
  color_yellow: {
    key: 'color_yellow',
    label: '노란색',
    tags: ['기쁨','에너지','주의','명료'],
    meaning: '밝은 에너지와 기쁨. 때로는 주의나 경고의 의미도 있습니다.',
    advice: '긍정적 에너지를 다른 사람과 나누고 주의가 필요한 영역을 점검하세요.'
  },

  // === 감정 단서 ===
  emotion_fear: {
    key: 'emotion_fear',
    label: '두려움',
    tags: ['불안','공포','경계','보호'],
    meaning: '위험에 대한 본능적 반응. 보호가 필요한 상황을 알려줍니다.',
    advice: '두려움의 구체적 원인을 파악하고 안전한 환경에서 작은 도전을 시작하세요.'
  },
  emotion_anxiety: {
    key: 'emotion_anxiety',
    label: '불안',
    tags: ['걱정','긴장','스트레스','미래'],
    meaning: '미래에 대한 걱정과 통제할 수 없는 상황에 대한 스트레스를 나타냅니다.',
    advice: '통제 가능한 것과 불가능한 것을 구분하고 현재에 집중하는 연습을 하세요.'
  },
  emotion_joy: {
    key: 'emotion_joy',
    label: '기쁨',
    tags: ['행복','만족','성취','연결'],
    meaning: '진정한 만족과 행복감. 삶의 의미와 연결감을 나타냅니다.',
    advice: '이 긍정적 에너지를 지속할 방법을 찾고 감사한 것들을 기록하세요.'
  },
  emotion_anger: {
    key: 'emotion_anger',
    label: '분노',
    tags: ['화','정의감','경계','힘'],
    meaning: '부당함에 대한 반응이나 경계가 침범당했을 때의 정상적 감정입니다.',
    advice: '분노의 메시지를 파악하고 건설적인 방식으로 경계를 표현하세요.'
  },
  emotion_sadness: {
    key: 'emotion_sadness',
    label: '슬픔',
    tags: ['상실','그리움','애도','치유'],
    meaning: '상실이나 이별에 대한 자연스러운 반응. 치유의 첫 단계입니다.',
    advice: '슬픔을 충분히 느끼되 지지받을 수 있는 환경을 만들고 시간을 가지세요.'
  },

  // === 관계 상황 === 
  breakup: {
    key: 'breakup',
    label: '헤어짐/이별',
    tags: ['이별','종료','상실','새시작'],
    meaning: '관계의 종료와 새로운 시작을 의미합니다. 성장의 기회이기도 합니다.',
    advice: '이별의 의미를 되짚어보고 다음 관계를 위한 교훈을 정리하세요.'
  },
  jealousy: {
    key: 'jealousy',
    label: '질투',
    tags: ['불안','소유욕','비교','경쟁'],
    meaning: '상대방이나 관계에 대한 불안감과 소유욕을 나타냅니다.',
    advice: '질투의 근본 원인을 파악하고 자신의 가치를 재확인하세요.'
  },
  reconciliation: {
    key: 'reconciliation', 
    label: '화해/재결합',
    tags: ['회복','용서','재연결','치유'],
    meaning: '관계의 회복과 새로운 시작을 의미합니다.',
    advice: '진심 어린 대화를 통해 서로의 입장을 이해하고 새로운 약속을 만드세요.'
  },
  new_relationship: {
    key: 'new_relationship',
    label: '새로운 만남',
    tags: ['시작','설렘','가능성','변화'],
    meaning: '새로운 관계의 시작이나 인연에 대한 기대를 나타냅니다.',
    advice: '열린 마음으로 새로운 사람을 받아들이되 자신의 페이스를 유지하세요.'
  },
  ex_lover: {
    key: 'ex_lover',
    label: '전 연인',
    tags: ['과거','미련','비교','회상'],
    meaning: '과거 관계에 대한 미해결된 감정이나 현재와의 비교를 의미합니다.',
    advice: '과거 관계에서 배운 점을 정리하고 현재에 집중하세요.'
  },

  // === 침실/친밀 === 
  bedroom: {
    key: 'bedroom',
    label: '침실/침대',
    tags: ['친밀','휴식','사적공간','안전'],
    meaning: '가장 사적이고 친밀한 공간. 휴식과 재충전의 장소입니다.',
    advice: '개인적인 공간을 정리하고 편안한 환경을 만드세요.'
  },
  intimacy_conflict: {
    key: 'intimacy_conflict',
    label: '친밀감 갈등',
    tags: ['갈등','경계','욕구','조율'],
    meaning: '친밀한 관계에서의 욕구 차이나 경계 설정 문제를 나타냅니다.',
    advice: '서로의 욕구와 경계를 솔직하게 대화로 조율하세요.'
  }
};

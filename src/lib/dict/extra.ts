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
  tsunami: {
    key: 'tsunami', label: '파도/쓰나미', tags: ['감정파동','압도','불안'],
    meaning: '거대한 파도는 감정의 압도/스트레스 파동을 의미합니다.',
    advice: '오늘의 “압도 원인”을 1문장으로 쓰고, 25분 단절(알림 off)로 버퍼를 만드세요.'
  },
  exam: {
    key: 'exam', label: '시험/평가', tags: ['성과압박','준비','표현'],
    meaning: '시험은 평가와 기준의 압박을 상징합니다. 준비 부족/완벽주의가 혼재할 수 있습니다.',
    advice: '모의답 3문장을 소리 내어 읽고, 합격 기준을 나만의 문장으로 낮춰 정의해 보세요.'
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
};

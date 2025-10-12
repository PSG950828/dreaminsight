export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 leading-7 text-sm">
      <h1 className="text-2xl font-bold mb-4">개인정보처리방침</h1>
      <p className="opacity-80 mb-3">DreamInsight(이하 &quot;서비스&quot;)는 이용자의 개인정보를 보호하기 위해 최선을 다합니다.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">1. 수집 항목</h2>
      <p className="opacity-80 mb-2">필수: 디바이스 식별 쿠키(di_uid), 텔레메트리 이벤트(익명/해시 옵션). 선택: 구독/결제 관련 메타데이터.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">2. 이용 목적</h2>
      <p className="opacity-80 mb-2">서비스 제공, 품질 개선(통계/오류 분석), 결제/구독 관리.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">3. 보관/파기</h2>
      <p className="opacity-80 mb-2">법령 또는 서비스 운영상 필요한 기간 동안 보관 후 지체 없이 파기합니다.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">4. 제3자 제공</h2>
      <p className="opacity-80 mb-2">결제 처리(Stripe), 데이터 호스팅(Supabase) 등 서비스 제공을 위한 범위 내에서만 이용됩니다.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">5. 이용자 권리</h2>
      <p className="opacity-80 mb-2">개인정보 열람/정정/삭제 요청은 고객지원 채널을 통해 처리됩니다.</p>
    </main>
  );
}

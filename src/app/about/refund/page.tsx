export default function RefundPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 leading-7 text-sm">
      <h1 className="text-2xl font-bold mb-4">환불정책</h1>
      <p className="opacity-80 mb-3">구독형 상품에 대한 환불 기준입니다.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">1. 신규 결제</h2>
      <p className="opacity-80 mb-2">결제 후 7일 이내 전액 환불 가능(중대한 남용/위반이 없는 경우). 고객지원에 주문 정보와 함께 요청해 주세요.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">2. 갱신 결제</h2>
      <p className="opacity-80 mb-2">자동 갱신 전에 해지하실 수 있으며, 갱신 후 7일 이내에는 부분/전액 환불을 검토합니다.</p>
      <h2 className="text-lg font-semibold mt-6 mb-2">3. 해지</h2>
      <p className="opacity-80 mb-2">해지 즉시 다음 결제부터 과금되지 않습니다. 남은 기간 동안은 Plus 기능을 이용할 수 있습니다.</p>
    </main>
  );
}


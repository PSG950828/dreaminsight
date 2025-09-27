// Hard content moderation helpers (lightweight, no external deps)

export type Violation = {
  code: string; // e.g., 'profanity', 'hate', 'spam', 'contact'
  reason: string;
};

const PROFANITY = [
  // Common Korean profanities/slurs (non-exhaustive, minimized)
  '씨발', '씨팔', 'ㅅㅂ', 'ㅄ', '개새', '병신', 'ㅂㅅ', '꺼져', '좆', '좇', '새끼', '미친놈', '년', 'ㄴㅇㄱ',
  // Hate/offensive categories (avoid overblocking; keep obvious forms)
  '일베', '씹', '니애미', '니엄마', '애미', '애비',
];

const HATE = [
  // Caution: keep only explicit hateful expressions (avoid identity words)
  '병신같', '찌질', '정신병자', '지능이', '거지같',
];

const SPAM_PHRASES = [
  '성인', '야동', '카지노', '도박', '대출', '공짜 돈', '무료 머니', '코인 리딩', '투자 리딩', '홍보',
  '홍보해요', '좋아요 늘려', '팔로워 늘려', '광고 문의', '선물 증정', 'DM 문의', '텔레그램 문의',
  '카톡', '카카오톡', '오픈채팅', '라인 문의', '위챗', 'wechat', 'telegram', 'discord.gg',
];

const URL_RE = /https?:\/\/|www\.[a-z0-9\-]+\.[a-z]{2,}/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(010|01[1-9]|0\d{1,2})[- ]?\d{3,4}[- ]?\d{4}/;

function normalize(s: string) {
  return (s || '').normalize('NFKC');
}

function countEmoji(s: string) {
  // naive emoji count
  const m = s.match(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu);
  return m ? m.length : 0;
}

export function detectViolations(raw: string): Violation[] {
  const t = normalize(raw);
  const lower = t.toLowerCase();
  const out: Violation[] = [];

  // Length / repetition / emoji flood
  if (/(.)\1{7,}/.test(t)) out.push({ code: 'repeat', reason: '동일 문자 과도 반복' });
  const emojis = countEmoji(t);
  if (emojis >= 10 && emojis >= (t.length / 4)) out.push({ code: 'emoji', reason: '이모지 과다 사용' });

  // Contact / solicitation
  if (URL_RE.test(t)) out.push({ code: 'link', reason: '링크 포함' });
  if (EMAIL_RE.test(t)) out.push({ code: 'contact', reason: '이메일 포함' });
  if (PHONE_RE.test(t)) out.push({ code: 'contact', reason: '전화번호 포함' });

  // Spam phrases
  if (SPAM_PHRASES.some(k => lower.includes(k))) out.push({ code: 'spam', reason: '스팸/홍보성 표현' });

  // Profanity / hate
  if (PROFANITY.some(k => t.includes(k))) out.push({ code: 'profanity', reason: '욕설/비속어' });
  if (HATE.some(k => t.includes(k))) out.push({ code: 'hate', reason: '모욕/혐오 표현' });

  return out;
}

export function moderateText(raw: string): { ok: boolean; violations: Violation[] } {
  const v = detectViolations(raw);
  // Hard mode policy: reject if any of these are present (except 1 link allowed?)
  const rejectCodes = new Set(['profanity', 'hate', 'contact', 'spam', 'repeat', 'emoji']);
  const shouldReject = v.some(x => rejectCodes.has(x.code));
  return { ok: !shouldReject, violations: v };
}


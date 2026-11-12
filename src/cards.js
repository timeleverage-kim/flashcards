// 라이트너 초기 상자 번호 및 범위
export const INITIAL_BOX = 1;
const MIN_BOX = 1;
const MAX_BOX = 5;

// 라이트너 상자별 복습 간격(일수)
export const BOX_INTERVALS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

/**
 * 로컬 시간 기준 Date 객체를 YYYY-MM-DD 문자열로 변환한다.
 * @param {Date} [date]
 * @returns {string}
 */
export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 카드 앞면(영어 단어)이 기존 목록과 중복되는지 검사한다.
 * 앞뒤 공백을 제거하고 대소문자를 구분하지 않고 비교한다.
 * @param {Array<object>} cards
 * @param {string} front
 * @returns {boolean}
 */
export function isDuplicateFront(cards, front) {
  const normalizedFront = front.trim().toLowerCase();
  return cards.some((card) => card.front.trim().toLowerCase() === normalizedFront);
}

// 고유 ID 충돌 방지를 위한 일련번호 카운터
let idCounter = 0;

/**
 * 고유한 카드 ID를 생성한다.
 * @param {number} [timestamp]
 * @param {Function} [randomFn]
 * @returns {string}
 */
export function generateCardId(timestamp = Date.now(), randomFn = Math.random) {
  idCounter += 1;
  const randomSuffix = Math.floor(randomFn() * 100000)
    .toString(36)
    .padStart(4, '0');
  return `${timestamp}-${idCounter}-${randomSuffix}`;
}

/**
 * YYYY-MM-DD 날짜 문자열에 지정한 일수를 더한 새 날짜 문자열을 반환한다.
 * @param {string} dateString
 * @param {number} days
 * @returns {string}
 */
export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day + days);
  return getTodayDateString(targetDate);
}

export const addDaysToDateString = addDays;

/**
 * 앞면(영어 단어)과 뒷면(뜻)을 받아 새 카드 객체를 생성한다.
 * 앞면 또는 뒷면이 비어 있거나 공백만 있으면 에러를 던진다.
 * @param {string} front
 * @param {string} back
 * @param {string} [today]
 * @returns {{ id: string, front: string, back: string, box: number, nextReview: string, nextReviewDate: string, createdAt: string }}
 */
export function createCard(front, back, today = getTodayDateString()) {
  const trimmedFront = typeof front === 'string' ? front.trim() : '';
  const trimmedBack = typeof back === 'string' ? back.trim() : '';

  if (!trimmedFront || !trimmedBack) {
    throw new Error('영어 단어와 뜻을 모두 입력해 주세요.');
  }

  return {
    id: generateCardId(),
    front: trimmedFront,
    back: trimmedBack,
    box: INITIAL_BOX,
    nextReview: today,
    nextReviewDate: today,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 카드 1장에 대해 학습 결과(알아요/몰라요)를 반영한 새 카드 객체를 반환한다.
 * 원본 카드 객체는 변경하지 않는다(불변성 유지).
 * @param {object} card
 * @param {boolean} isKnown
 * @param {string} [today]
 * @returns {object}
 */
export function gradeCard(card, isKnown, today = getTodayDateString()) {
  const nextBox = isKnown ? Math.min(card.box + 1, MAX_BOX) : MIN_BOX;
  const intervalDays = BOX_INTERVALS[nextBox];
  const nextReview = addDays(today, intervalDays);

  return {
    ...card,
    box: nextBox,
    nextReview,
    nextReviewDate: nextReview,
  };
}

/**
 * 새 카드를 검증하고 생성하여 새 카드 목록과 결과를 반환한다.
 * @param {Array<object>} cards
 * @param {object} params
 * @param {string} params.front
 * @param {string} params.back
 * @param {string} [params.today]
 * @param {string} [params.now]
 * @param {string} [params.id]
 * @returns {{ ok: boolean, reason?: string, message?: string, card?: object, cards?: Array<object> }}
 */
export function addCard(
  cards,
  { front, back, today = getTodayDateString(), now = new Date().toISOString(), id }
) {
  let baseCard;
  try {
    baseCard = createCard(front, back, today);
  } catch (err) {
    return {
      ok: false,
      reason: 'EMPTY',
      message: err.message,
    };
  }

  if (isDuplicateFront(cards, baseCard.front)) {
    return {
      ok: false,
      reason: 'DUPLICATE',
      message: '이미 등록된 영어 단어입니다.',
    };
  }

  const newCard = {
    ...baseCard,
    id: id || baseCard.id,
    createdAt: now,
  };

  return {
    ok: true,
    card: newCard,
    cards: [...cards, newCard],
  };
}

/**
 * 지정한 ID의 카드를 목록에서 제거한 새 배열을 반환한다.
 * @param {Array<object>} cards
 * @param {string} cardId
 * @returns {Array<object>}
 */
export function deleteCard(cards, cardId) {
  return cards.filter((card) => card.id !== cardId);
}

/**
 * 단일 객체가 유효한 카드 데이터 구조를 갖추었는지 검사한다.
 * @param {unknown} item
 * @returns {boolean}
 */
function isValidCardShape(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const reviewDate = item.nextReview ?? item.nextReviewDate;
  return (
    typeof item.id === 'string' &&
    typeof item.front === 'string' &&
    typeof item.back === 'string' &&
    Number.isInteger(item.box) &&
    item.box >= MIN_BOX &&
    item.box <= MAX_BOX &&
    typeof reviewDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(reviewDate)
  );
}

/**
 * localStorage에서 읽어온 문자열을 파싱해 카드 배열로 복원한다.
 * 데이터가 손상되었거나 형식이 맞지 않으면 빈 배열과 corrupted: true를 반환한다.
 * @param {string | null} rawValue
 * @returns {{ cards: Array<object>, corrupted: boolean }}
 */
export function parseStoredCards(rawValue) {
  if (rawValue === null || rawValue === '') {
    return { cards: [], corrupted: false };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed) || !parsed.every(isValidCardShape)) {
      return { cards: [], corrupted: true };
    }
    return { cards: parsed, corrupted: false };
  } catch {
    return { cards: [], corrupted: true };
  }
}

/**
 * 전체 카드 중 오늘 복습해야 할 카드(nextReview <= today)만 골라 상자 번호 오름차순으로 반환한다.
 * @param {Array<object>} cards
 * @param {string} [today]
 * @returns {Array<object>}
 */
export function getDueCards(cards, today = getTodayDateString()) {
  return cards
    .filter((card) => (card.nextReview ?? card.nextReviewDate) <= today)
    .sort((a, b) => a.box - b.box);
}

/**
 * 원본 배열을 바꾸지 않고 무작위로 섞은 새 카드 배열을 반환한다.
 * @param {Array<object>} cards
 * @param {Function} [randomFn]
 * @returns {Array<object>}
 */
export function shuffleCards(cards, randomFn = Math.random) {
  const copied = [...cards];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

/**
 * 학습 결과(알아요/몰라요)에 따라 해당 카드의 상자 번호와 다음 복습 날짜를 갱신한 새 배열을 반환한다.
 * @param {Array<object>} cards
 * @param {string} cardId
 * @param {boolean} isKnown
 * @param {string} [today]
 * @returns {Array<object>}
 */
export function reviewCard(cards, cardId, isKnown, today = getTodayDateString()) {
  return cards.map((card) => (card.id === cardId ? gradeCard(card, isKnown, today) : card));
}

/**
 * 전체 카드 중 지정한 ID 목록(예: '몰라요'를 선택한 카드 ID)에 해당하는 카드만 골라낸다.
 * @param {Array<object>} cards
 * @param {Array<string>} cardIds
 * @returns {Array<object>}
 */
export function getCardsByIds(cards, cardIds = []) {
  const idSet = new Set(cardIds);
  return cards.filter((card) => idSet.has(card.id));
}

/**
 * 앞면(영어 단어) 또는 뒷면(뜻)에 검색어가 부분 일치하는 카드 목록을 반환한다.
 * 앞뒤 공백을 제거하고 대소문자를 구분하지 않는다.
 * @param {Array<object>} cards
 * @param {string} query
 * @returns {Array<object>}
 */
export function searchCards(cards, query = '') {
  const normalizedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
  if (!normalizedQuery) {
    return [...cards];
  }

  return cards.filter(
    (card) =>
      card.front.toLowerCase().includes(normalizedQuery) ||
      card.back.toLowerCase().includes(normalizedQuery)
  );
}

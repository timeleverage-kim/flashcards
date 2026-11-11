// 라이트너 초기 상자 번호
export const INITIAL_BOX = 1;
const MIN_BOX = 1;
const MAX_BOX = 5;

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

/**
 * 고유한 카드 ID를 생성한다.
 * @param {number} [timestamp]
 * @param {Function} [randomFn]
 * @returns {string}
 */
export function generateCardId(timestamp = Date.now(), randomFn = Math.random) {
  const randomSuffix = Math.floor(randomFn() * 100000)
    .toString(36)
    .padStart(4, '0');
  return `${timestamp}-${randomSuffix}`;
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
  const trimmedFront = typeof front === 'string' ? front.trim() : '';
  const trimmedBack = typeof back === 'string' ? back.trim() : '';

  if (!trimmedFront || !trimmedBack) {
    return {
      ok: false,
      reason: 'EMPTY',
      message: '영어 단어와 뜻을 모두 입력해 주세요.',
    };
  }

  if (isDuplicateFront(cards, trimmedFront)) {
    return {
      ok: false,
      reason: 'DUPLICATE',
      message: '이미 등록된 영어 단어입니다.',
    };
  }

  const newCard = {
    id: id || generateCardId(),
    front: trimmedFront,
    back: trimmedBack,
    box: INITIAL_BOX,
    nextReviewDate: today,
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

  return (
    typeof item.id === 'string' &&
    typeof item.front === 'string' &&
    typeof item.back === 'string' &&
    Number.isInteger(item.box) &&
    item.box >= MIN_BOX &&
    item.box <= MAX_BOX &&
    typeof item.nextReviewDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.nextReviewDate)
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

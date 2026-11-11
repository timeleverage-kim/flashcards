import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_BOX,
  addCard,
  deleteCard,
  getTodayDateString,
  isDuplicateFront,
  parseStoredCards,
} from '../src/cards.js';

describe('F1: 카드 추가 및 입력 검증', () => {
  it('앞면과 뒷면을 입력하면 상자 1, nextReviewDate는 오늘 날짜인 새 카드가 추가된다', () => {
    const today = '2026-11-11';
    const result = addCard([], {
      front: '  apple  ',
      back: '  사과 ',
      today,
      now: '2026-11-11T10:00:00.000Z',
      id: 'card-1',
    });

    assert.equal(result.ok, true);
    assert.equal(result.cards.length, 1);
    assert.deepEqual(result.card, {
      id: 'card-1',
      front: 'apple',
      back: '사과',
      box: INITIAL_BOX,
      nextReviewDate: today,
      createdAt: '2026-11-11T10:00:00.000Z',
    });
  });

  it('앞면 또는 뒷면이 비어 있거나 공백만 있으면 카드가 추가되지 않는다', () => {
    const emptyFront = addCard([], { front: '   ', back: '사과', today: '2026-11-11' });
    const emptyBack = addCard([], { front: 'apple', back: '', today: '2026-11-11' });

    assert.equal(emptyFront.ok, false);
    assert.equal(emptyFront.reason, 'EMPTY');
    assert.equal(emptyBack.ok, false);
    assert.equal(emptyBack.reason, 'EMPTY');
  });

  it('이미 등록된 영어 단어와 대소문자만 다르거나 공백이 달라도 중복으로 막는다', () => {
    const initial = addCard([], {
      front: 'apple',
      back: '사과',
      today: '2026-11-11',
      id: 'card-1',
    }).cards;

    assert.equal(isDuplicateFront(initial, 'Apple'), true);
    assert.equal(isDuplicateFront(initial, '  APPLE '), true);

    const duplicateResult = addCard(initial, {
      front: 'Apple',
      back: '능금',
      today: '2026-11-11',
    });

    assert.equal(duplicateResult.ok, false);
    assert.equal(duplicateResult.reason, 'DUPLICATE');
  });
});

describe('F2: 카드 삭제', () => {
  it('지정한 ID의 카드만 목록에서 제거하고 나머지 카드는 유지한다', () => {
    const cards = [
      { id: 'c1', front: 'apple', back: '사과', box: 1, nextReviewDate: '2026-11-11' },
      { id: 'c2', front: 'book', back: '책', box: 2, nextReviewDate: '2026-11-13' },
    ];

    const updated = deleteCard(cards, 'c1');

    assert.equal(updated.length, 1);
    assert.equal(updated[0].id, 'c2');
    // 원본 배열은 변경되지 않아야 한다.
    assert.equal(cards.length, 2);
  });
});

describe('날짜 및 localStorage 데이터 복원', () => {
  it('getTodayDateString은 로컬 날짜 기준 YYYY-MM-DD 문자열을 반환한다', () => {
    const date = new Date(2026, 10, 5, 23, 59, 59);
    assert.equal(getTodayDateString(date), '2026-11-05');
  });

  it('저장 값이 비어 있으면 빈 목록과 corrupted: false를 반환한다', () => {
    assert.deepEqual(parseStoredCards(null), { cards: [], corrupted: false });
    assert.deepEqual(parseStoredCards(''), { cards: [], corrupted: false });
  });

  it('올바른 JSON 카드 배열이면 그대로 복원한다', () => {
    const raw = JSON.stringify([
      {
        id: 'c1',
        front: 'apple',
        back: '사과',
        box: 1,
        nextReviewDate: '2026-11-11',
        createdAt: '2026-11-11T00:00:00.000Z',
      },
    ]);

    const parsed = parseStoredCards(raw);
    assert.equal(parsed.corrupted, false);
    assert.equal(parsed.cards.length, 1);
    assert.equal(parsed.cards[0].front, 'apple');
  });

  it('JSON이 손상되었거나 카드 형식이 잘못되면 빈 목록과 corrupted: true로 복구한다', () => {
    assert.deepEqual(parseStoredCards('{broken-json'), { cards: [], corrupted: true });
    assert.deepEqual(parseStoredCards('{"not":"array"}'), { cards: [], corrupted: true });
    assert.deepEqual(parseStoredCards('[{"id":"1"}]'), { cards: [], corrupted: true });
  });
});


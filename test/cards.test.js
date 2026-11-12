import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOX_INTERVALS,
  INITIAL_BOX,
  addCard,
  addDaysToDateString,
  deleteCard,
  getCardsByIds,
  getDueCards,
  getTodayDateString,
  isDuplicateFront,
  parseStoredCards,
  reviewCard,
  searchCards,
  shuffleCards,
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

describe('F3: 오늘 복습 대상 선별 및 무작위 섞기', () => {
  it('nextReviewDate가 오늘이거나 과거인 카드만 복습 대상으로 선별한다', () => {
    const cards = [
      { id: 'c1', front: 'past', back: '과거', box: 1, nextReviewDate: '2026-11-10' },
      { id: 'c2', front: 'today', back: '오늘', box: 2, nextReviewDate: '2026-11-12' },
      { id: 'c3', front: 'future', back: '미래', box: 3, nextReviewDate: '2026-11-13' },
    ];

    const due = getDueCards(cards, '2026-11-12');
    assert.deepEqual(
      due.map((c) => c.id),
      ['c1', 'c2']
    );
  });

  it('shuffleCards는 원본 배열을 변경하지 않고 주입된 난수 함수에 따라 순서를 섞는다', () => {
    const cards = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const shuffled = shuffleCards(cards, () => 0);

    assert.equal(cards[0].id, '1');
    assert.equal(shuffled.length, 3);
    assert.deepEqual(
      shuffled.map((c) => c.id),
      ['2', '3', '1']
    );
  });

  it('getCardsByIds는 지정한 ID 목록(몰라요 선택 카드 등)에 해당하는 카드만 반환한다', () => {
    const cards = [
      { id: 'c1', front: 'apple', back: '사과' },
      { id: 'c2', front: 'book', back: '책' },
      { id: 'c3', front: 'cat', back: '고양이' },
    ];

    const picked = getCardsByIds(cards, ['c2', 'deleted-id']);
    assert.deepEqual(
      picked.map((c) => c.id),
      ['c2']
    );
  });
});

describe('F5: 라이트너 상자 이동 및 복습 일정 계산', () => {
  it('상자 1~5에서 알아요를 누르면 상자가 규칙대로 이동하고 각 상자 간격(1, 2, 4, 7, 14일)만큼 복습일이 계산된다', () => {
    const today = '2026-11-12';
    assert.deepEqual(BOX_INTERVALS, { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 });

    // 상자 1 -> 상자 2 (+2일)
    const fromBox1 = reviewCard(
      [{ id: 'c1', front: 'a', back: '가', box: 1, nextReviewDate: today }],
      'c1',
      true,
      today
    )[0];
    assert.equal(fromBox1.box, 2);
    assert.equal(fromBox1.nextReviewDate, '2026-11-14');

    // 상자 2 -> 상자 3 (+4일)
    const fromBox2 = reviewCard([fromBox1], 'c1', true, today)[0];
    assert.equal(fromBox2.box, 3);
    assert.equal(fromBox2.nextReviewDate, '2026-11-16');

    // 상자 3 -> 상자 4 (+7일)
    const fromBox3 = reviewCard([fromBox2], 'c1', true, today)[0];
    assert.equal(fromBox3.box, 4);
    assert.equal(fromBox3.nextReviewDate, '2026-11-19');

    // 상자 4 -> 상자 5 (+14일)
    const fromBox4 = reviewCard([fromBox3], 'c1', true, today)[0];
    assert.equal(fromBox4.box, 5);
    assert.equal(fromBox4.nextReviewDate, '2026-11-26');

    // 상자 5 -> 상자 5 유지 (+14일)
    const fromBox5 = reviewCard([fromBox4], 'c1', true, today)[0];
    assert.equal(fromBox5.box, 5);
    assert.equal(fromBox5.nextReviewDate, '2026-11-26');
  });

  it('어느 상자에 있든 몰라요를 누르면 상자 1로 돌아가고 오늘 + 1일로 설정된다', () => {
    const today = '2026-11-12';
    const cards = [{ id: 'c3', front: 'apple', back: '사과', box: 3, nextReviewDate: today }];

    const updated = reviewCard(cards, 'c3', false, today);
    assert.equal(updated[0].box, 1);
    assert.equal(updated[0].nextReviewDate, '2026-11-13');
    assert.equal(addDaysToDateString('2026-11-30', 2), '2026-12-02');
  });
});

describe('F7: 카드 검색', () => {
  const sampleCards = [
    { id: '1', front: 'apple', back: '사과', box: 1, nextReviewDate: '2026-11-12' },
    { id: '2', front: 'book', back: '책', box: 2, nextReviewDate: '2026-11-14' },
  ];

  it('앞면(영어 단어) 또는 뒷면(뜻) 부분 일치 및 대소문자 무시 검색이 동작한다', () => {
    assert.deepEqual(
      searchCards(sampleCards, 'app').map((c) => c.front),
      ['apple']
    );
    assert.deepEqual(
      searchCards(sampleCards, '  APP ').map((c) => c.front),
      ['apple']
    );
    assert.deepEqual(
      searchCards(sampleCards, '사과').map((c) => c.front),
      ['apple']
    );
  });

  it('검색어가 비어 있거나 공백뿐이면 전체 카드를 반환하고, 일치 항목이 없으면 빈 배열을 반환한다', () => {
    assert.equal(searchCards(sampleCards, '').length, 2);
    assert.equal(searchCards(sampleCards, '   ').length, 2);
    assert.equal(searchCards(sampleCards, 'xyz').length, 0);
  });
});


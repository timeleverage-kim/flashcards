import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCard, gradeCard, getDueCards, addDays } from '../src/cards.js';

test('addDays: 날짜 문자열에 일수를 더한다 (월/연도 넘김 포함)', () => {
    assert.equal(addDays('2026-03-02', 1), '2026-03-03');
    assert.equal(addDays('2026-03-31', 1), '2026-04-01');
    assert.equal(addDays('2026-12-30', 7), '2027-01-06');
});

test('createCard: 앞/뒤 공백을 제거하고 상자 1, 오늘 복습으로 만든다', () => {
    const card = createCard('  apple ', ' 사과 ', '2026-03-02');
    assert.equal(card.front, 'apple');
    assert.equal(card.back, '사과');
    assert.equal(card.box, 1);
    assert.equal(card.nextReview, '2026-03-02');
    assert.ok(card.id, 'id가 있어야 한다');
});

test('createCard: 서로 다른 카드는 서로 다른 id를 가진다', () => {
    const a = createCard('a', '가', '2026-03-02');
    const b = createCard('b', '나', '2026-03-02');
    assert.notEqual(a.id, b.id);
});

test('createCard: 앞면이나 뒷면이 비어 있으면 에러', () => {
    assert.throws(() => createCard('   ', '사과', '2026-03-02'));
    assert.throws(() => createCard('apple', '', '2026-03-02'));
});

test('gradeCard: 맞히면 상자가 1 올라가고 간격만큼 뒤로 미뤄진다', () => {
    const card = createCard('apple', '사과', '2026-03-02');
    const next = gradeCard(card, true, '2026-03-02');
    assert.equal(next.box, 2);
    assert.equal(next.nextReview, '2026-03-04');   // 상자 2의 간격은 2일
});

test('gradeCard: 상자는 5를 넘지 않는다', () => {
    const card = { ...createCard('apple', '사과', '2026-03-02'), box: 5 };
    assert.equal(gradeCard(card, true, '2026-03-02').box, 5);
});

test('gradeCard: 틀리면 상자 1로 돌아가고 내일 다시 복습', () => {
    const card = { ...createCard('apple', '사과', '2026-03-02'), box: 4 };
    const next = gradeCard(card, false, '2026-03-10');
    assert.equal(next.box, 1);
    assert.equal(next.nextReview, '2026-03-11');
});

test('gradeCard: 원본 카드 객체를 바꾸지 않는다 (불변성)', () => {
    const card = createCard('apple', '사과', '2026-03-02');
    gradeCard(card, true, '2026-03-02');
    assert.equal(card.box, 1);
});

test('getDueCards: 오늘이거나 지난 카드만, 상자 번호가 낮은 순으로', () => {
    const today = '2026-03-10';
    const cards = [
        { id: '1', front: 'a', back: '가', box: 3, nextReview: '2026-03-09' },
        { id: '2', front: 'b', back: '나', box: 1, nextReview: '2026-03-10' },
        { id: '3', front: 'c', back: '다', box: 2, nextReview: '2026-03-11' },
    ];
    assert.deepEqual(getDueCards(cards, today).map(c => c.id), ['2', '1']);
});
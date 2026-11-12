import { test } from 'node:test';
import assert from 'node:assert/strict';

function add(a, b) { return a + b; }

test('1 + 2는 3이다', () => {
    assert.equal(add(1, 2), 3);
});
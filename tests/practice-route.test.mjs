import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePracticeRoute, practiceHash, practiceOptions } from '../src/services/practice-route.js';

test('all offered parts, variants, families and additional sets round trip', () => {
  for (const view of ['explorer', 'challenge', 'dragdrop', 'additionalLetters']) {
    const options = practiceOptions(view);
    assert(view === 'dragdrop' ? options.length === 2 : options.length >= 14);
    for (const { hash } of options) {
      const parsed = parsePracticeRoute(hash);
      assert.equal(parsed.view, view);
      assert.equal(practiceHash(view, parsed), hash);
      assert.deepEqual(parsePracticeRoute(encodeURI(hash)), parsed);
    }
  }
});
test('existing section bookmarks remain supported', () => {
  for (const hash of ['#home', '#learn', '#test1', '#test2', '#more']) assert(parsePracticeRoute(hash));
});
test('bad encodings and out-of-range selections are rejected', () => {
  for (const hash of ['#/%E0%A4', '#/learn/part/3/ግእዝ', '#/learn/part/1/nope', '#/test1/set/1/family/999', '#/more/set/missing/learn', '#/test2/part/0/ግእዝ']) assert.equal(parsePracticeRoute(hash), null);
});

test('Test 1 links expose only two parts and old family links still resolve', () => {
  assert.equal(practiceHash('dragdrop', { part: 1, rowIndex: 7 }), '#/test1/part/1');
  assert.deepEqual(parsePracticeRoute('#/test1/part/2'), { view: 'dragdrop', part: 2 });
  assert.equal(parsePracticeRoute('#/test1/set/1/family/3').rowIndex, 2);
  assert.equal(parsePracticeRoute('#/test1/part/3'), null);
});

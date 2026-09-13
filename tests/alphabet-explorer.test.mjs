import test from 'node:test';
import assert from 'node:assert/strict';
import { AlphabetExplorerFeature } from '../src/features/alphabet-explorer.js';

function fixture(completed = true) {
  const letters = ['ሀ', 'ለ', 'ሐ'];
  const explorer = { variantIndex: 0, part: completed ? 2 : 1, reviewSymbols: null };
  const heard = completed ? [...letters] : [];
  const store = {
    getProgress: () => ({ explorer }),
    updateExplorer: patch => Object.assign(explorer, patch),
    getVariantSymbols: () => letters,
    getExplorerProgress: () => heard,
    isExplorerPartComplete: () => heard.length === letters.length,
    markExplorerSymbolHeard: (_variant, _part, symbol) => { if (!heard.includes(symbol)) heard.push(symbol); },
    getText: () => 'Part 2 is ready'
  };
  const audio = { playSymbol: async () => {} };
  return { feature: new AlphabetExplorerFeature(store, audio), explorer, heard, audio, letters };
}

test('review waits for every distinct letter while preserving mastery', async () => {
  const { feature, explorer, heard, letters } = fixture();
  feature.reviewFirstPart();
  assert.deepEqual(explorer.reviewSymbols, []);
  await feature.playSymbol(letters[0]);
  await feature.playSymbol(letters[0]);
  assert.equal(explorer.part, 1);
  assert.equal(explorer.reviewSymbols.length, 1);
  await feature.playSymbol(letters[1]);
  assert.equal(explorer.part, 1);
  assert.deepEqual(heard, letters);
  const result = await feature.playSymbol(letters[2]);
  assert.equal(result.status, 'part-advanced');
  assert.equal(explorer.part, 2);
  assert.equal(explorer.reviewSymbols, null);
});

test('Open Part 2 can leave review early, and a new review starts fresh', async () => {
  const { feature, explorer, letters } = fixture();
  feature.reviewFirstPart();
  await feature.playSymbol(letters[0]);
  feature.openSecondPart();
  assert.equal(explorer.part, 2);
  assert.equal(explorer.reviewSymbols, null);
  feature.reviewFirstPart();
  assert.deepEqual(explorer.reviewSymbols, []);
});

test('failed playback does not count towards review completion', async () => {
  const { feature, explorer, audio, letters } = fixture();
  feature.reviewFirstPart();
  audio.playSymbol = async () => { throw new Error('Playback failed'); };
  await assert.rejects(feature.playSymbol(letters[0]));
  assert.deepEqual(explorer.reviewSymbols, []);
  assert.equal(explorer.part, 1);
});

test('first-time learning still advances only after all letters', async () => {
  const { feature, explorer, letters } = fixture(false);
  assert.throws(() => feature.openSecondPart());
  for (const letter of letters.slice(0, -1)) {
    await feature.playSymbol(letter);
    assert.equal(explorer.part, 1);
  }
  await feature.playSymbol(letters.at(-1));
  assert.equal(explorer.part, 2);
});

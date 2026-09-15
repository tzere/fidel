import test from 'node:test';
import assert from 'node:assert/strict';
import { DragDropFeature } from '../src/features/drag-drop.js';
import { PRIMARY_ROWS } from '../src/data/fidelat-data.js';

test('preparing a bookmarked completed set does not jump to the next set', () => {
  const dragdrop = { part: 1, rowIndex: 2, shuffledSymbols: [...PRIMARY_ROWS[2]], placedSymbols: Array(7).fill(null) };
  const store = {
    getProgress: () => ({ dragdrop }),
    getDragDropProgress: () => PRIMARY_ROWS.map((_, index) => index),
    updateDragDrop: patch => Object.assign(dragdrop, patch)
  };
  new DragDropFeature(store, {}).prepareIfNeeded();
  assert.equal(dragdrop.part, 1);
  assert.equal(dragdrop.rowIndex, 2);
});

test('finishing a bookmarked last family does not claim an unfinished set is complete', async () => {
  const dragdrop = { part: 1, rowIndex: PRIMARY_ROWS.length - 1, completedSet: false };
  const completed = [];
  const store = {
    getProgress: () => ({ dragdrop }),
    getDragDropProgress: () => completed,
    markDragDropRowComplete: (_part, index) => completed.push(index),
    updateDragDrop: patch => Object.assign(dragdrop, patch)
  };
  const feature = new DragDropFeature(store, { playSuccessTone() {} });
  const result = await feature.completeRow([...PRIMARY_ROWS.at(-1)]);
  assert.equal(result.status, 'row-complete');
  assert.equal(dragdrop.rowIndex, 0);
  assert.equal(dragdrop.completedSet, false);
});

test('correct placements play their letter; wrong placements stay silent', async () => {
  let dragdrop = { part: 1, rowIndex: 0, completedSet: false, placedSymbols: Array(7).fill(null) };
  const heard = [];
  const store = { getProgress: () => ({ dragdrop }), updateDragDrop: patch => { dragdrop = { ...dragdrop, ...patch }; } };
  const feature = new DragDropFeature(store, { playSymbol: async symbol => heard.push(symbol) });
  await feature.placeSymbol('ሀ', 1);
  assert.deepEqual(heard, []);
  await feature.placeSymbol('ሀ', 0);
  await feature.placeSymbol('ሁ', 1);
  assert.deepEqual(heard, ['ሀ', 'ሁ']);
  assert.deepEqual(dragdrop.placedSymbols.slice(0, 2), ['ሀ', 'ሁ']);
});

test('final letter finishes before completion sound and progression', async () => {
  let dragdrop = { part: 1, rowIndex: 0, completedSet: false, placedSymbols: [...PRIMARY_ROWS[0].slice(0, 6), null] };
  const completed = [];
  const events = [];
  const store = {
    getProgress: () => ({ dragdrop }),
    updateDragDrop: patch => { dragdrop = { ...dragdrop, ...patch }; },
    getDragDropProgress: () => completed,
    markDragDropRowComplete: (_part, index) => completed.push(index)
  };
  const audio = {
    playSymbol: async symbol => events.push(symbol),
    waitForCurrentAudio: async () => events.push('recording ended'),
    playSuccessTone: () => events.push('celebrate')
  };
  const result = await new DragDropFeature(store, audio).placeSymbol('ሆ', 6);
  assert.deepEqual(events, ['ሆ', 'recording ended', 'celebrate']);
  assert.equal(result.status, 'row-complete');
  assert.equal(dragdrop.rowIndex, 1);
});

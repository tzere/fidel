import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore } from '../src/core/progress-store.js';
import { StorageService, createDefaultProgressState } from '../src/services/storage-service.js';

test('reset clears every section and remains cleared after loading the browser profile again', () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  try {
    const store = new ProgressStore(new StorageService());
    store.ensureLearnerSession();
    const profileId = store.getActiveProfile().id;
    store.setTheme('purple');
    store.markExplorerSymbolHeard(0, 1, 'ሀ');
    store.updateExplorer({ part: 2, reviewSymbols: ['ሀ'] });
    store.markDragDropRowComplete(1, 0);
    store.updateDragDrop({ part: 2, rowIndex: 3, placedSymbols: ['ሀ'], completedSet: true });
    store.updateChallenge({ score: 20, rounds: 23, part: 2, variantIndex: 6, targetSymbol: 'ሆ', courseCompleted: true });
    const group = store.getAdditionalLetterGroup();
    store.markAdditionalLetterHeard(group.id, group.symbols[0]);
    store.updateAdditionalLetters({ completedGroupIds: [group.id], tab: 'dragdrop' });
    store.resetCurrentProfile();
    assert.deepEqual(store.getProgress(), createDefaultProgressState());
    const reloaded = new ProgressStore(new StorageService());
    assert.deepEqual(reloaded.getProgress(), createDefaultProgressState());
    assert.equal(reloaded.getActiveProfile().id, profileId);
    assert.equal(reloaded.getTheme(), 'purple');
  } finally { globalThis.localStorage = original; }
});

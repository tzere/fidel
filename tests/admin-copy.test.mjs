import test from 'node:test';
import assert from 'node:assert/strict';
import { COPY_SECTIONS, createDefaultCopyState, mergeCopyWithDefaults, applyCopyPatch, resolveCopy } from '../src/services/content-service.js';

test('admin groups follow the learner menu and each saved key appears exactly once', () => {
  assert.deepEqual(COPY_SECTIONS.slice(0, 5).map(section => section.title), ['Learn', 'Test 1', 'Test 2', 'More', 'Help']);
  const keys = COPY_SECTIONS.flatMap(section => section.fields.map(field => field.key));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(COPY_SECTIONS.find(section => section.id === 'learn').fields.some(field => field.key === 'explorer.instructions'));
});

test('new instructions are added without replacing any saved manual wording', () => {
  const saved = Object.fromEntries(Object.keys(createDefaultCopyState()).filter(key => key !== 'explorer.instructions').map(key => [key, {
    default: `  ሀ ${key}\nManually edited text  `, female: `Girl ${key}`, male: `Boy ${key}`
  }]));
  saved['explorer.intro'].default = '';
  const merged = mergeCopyWithDefaults(saved);
  for (const [key, value] of Object.entries(saved)) assert.deepEqual(merged[key], value);
  assert.ok(merged['explorer.instructions'].default.includes('Choose a variant'));
  const updated = applyCopyPatch(merged, { 'explorer.instructions': { default: 'First line\nSecond line' } });
  for (const [key, value] of Object.entries(saved)) assert.deepEqual(updated[key], value);
  assert.equal(resolveCopy(updated, 'explorer.instructions', null), 'First line\nSecond line');
  assert.deepEqual(mergeCopyWithDefaults(updated), updated);
});

test('legacy string wording and intentionally blank instructions remain intact', () => {
  const saved = mergeCopyWithDefaults({ 'explorer.intro': 'My original instructions', 'explorer.instructions': { default: '' } });
  assert.equal(saved['explorer.intro'].default, 'My original instructions');
  assert.equal(saved['explorer.instructions'].default, '');
});

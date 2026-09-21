import { VARIANT_NAMES, PRIMARY_ROWS, SECONDARY_ROWS, ADDITIONAL_LETTER_GROUPS } from '../data/fidelat-data.js';

export const SECTION_HASHES = Object.freeze({ home: 'help', explorer: 'learn', dragdrop: 'test1', challenge: 'test2', additionalLetters: 'more' });

export function parsePracticeRoute(hash) {
  let parts;
  try { parts = decodeURIComponent(hash.replace(/^#\/?/, '')).replace(/\/$/, '').split('/'); }
  catch { return null; }
  if (parts.length === 1 && parts[0] === 'home') return { view: 'home' }; // Existing dashboard bookmarks open Help.
  const view = Object.keys(SECTION_HASHES).find(key => SECTION_HASHES[key] === parts[0]);
  if (!view) return null;
  if (parts.length === 1) return { view };
  if (['explorer', 'challenge'].includes(view) && parts.length === 4 && parts[1] === 'part' && /^[12]$/.test(parts[2])) {
    const variantIndex = VARIANT_NAMES.indexOf(parts[3]);
    return variantIndex < 0 ? null : { view, part: Number(parts[2]), variantIndex };
  }
  if (view === 'dragdrop' && parts.length === 3 && parts[1] === 'part' && /^[12]$/.test(parts[2])) return { view, part: Number(parts[2]) };
  if (view === 'dragdrop' && [3, 5].includes(parts.length) && parts[1] === 'set' && /^[12]$/.test(parts[2])) {
    const part = Number(parts[2]);
    const rowIndex = parts.length === 3 ? 0 : Number(parts[4]) - 1;
    const rows = part === 1 ? PRIMARY_ROWS : SECONDARY_ROWS;
    if (parts.length === 5 && (parts[3] !== 'family' || !/^[1-9]\d*$/.test(parts[4]))) return null;
    return Number.isInteger(rowIndex) && rows[rowIndex] ? { view, part, rowIndex } : null;
  }
  if (view === 'additionalLetters' && parts.length === 4 && parts[1] === 'set' && ['learn', 'test'].includes(parts[3])) {
    const group = ADDITIONAL_LETTER_GROUPS.find(group => group.id === parts[2]);
    return group ? { view, groupId: group.id, tab: parts[3] === 'test' ? 'dragdrop' : 'learn' } : null;
  }
  return null;
}

export function practiceHash(view, state) {
  if (view === 'explorer' || view === 'challenge') return `#/${SECTION_HASHES[view]}/part/${state.part}/${VARIANT_NAMES[state.variantIndex]}`;
  if (view === 'dragdrop') return `#/test1/part/${state.part}`;
  if (view === 'additionalLetters') return `#/more/set/${state.groupId}/${state.tab === 'dragdrop' ? 'test' : 'learn'}`;
  return '#help';
}

export function practiceOptions(view) {
  if (['explorer', 'challenge'].includes(view)) return [1, 2].flatMap(part => VARIANT_NAMES.map((name, variantIndex) => ({ label: `Part ${part} · ${name}`, hash: practiceHash(view, { part, variantIndex }) })));
  if (view === 'dragdrop') return [1, 2].map(part => ({ label: `Part ${part}`, hash: practiceHash(view, { part }) }));
  if (view === 'additionalLetters') return ADDITIONAL_LETTER_GROUPS.flatMap(group => ['learn', 'dragdrop'].map(tab => ({ label: `${group.symbols[0]} set · ${tab === 'learn' ? 'Learn' : 'Test'}`, hash: practiceHash(view, { groupId: group.id, tab }) })));
  return [];
}

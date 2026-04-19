import { PRIMARY_ROWS, SECONDARY_ROWS, VARIANT_NAMES } from '../data/fidelat-data.js';

function shuffle(list) {
  return [...list]
    .map((item) => ({ item, weight: Math.random() }))
    .sort((a, b) => a.weight - b.weight)
    .map((entry) => entry.item);
}

export class DragDropFeature {
  constructor(store, audio) {
    this.store = store;
    this.audio = audio;
  }

  getRows(part) {
    return part === 2 ? SECONDARY_ROWS : PRIMARY_ROWS;
  }

  getPartLabel(part) {
    return part === 2 ? 'Second Set' : 'First Set';
  }

  isPartComplete(part) {
    return this.store.getDragDropProgress(part).length >= this.getRows(part).length;
  }

  getCurrentRow() {
    const { dragdrop } = this.store.getProgress();
    return this.getRows(dragdrop.part)[dragdrop.rowIndex] || this.getRows(dragdrop.part)[0] || [];
  }

  getAvailableSymbols() {
    const { dragdrop } = this.store.getProgress();
    return dragdrop.shuffledSymbols.filter((symbol) => !dragdrop.placedSymbols.includes(symbol));
  }

  getNextIncompleteRow(part, startIndex = 0) {
    const rows = this.getRows(part);
    const completed = this.store.getDragDropProgress(part);
    for (let index = startIndex; index < rows.length; index += 1) {
      if (!completed.includes(index)) return index;
    }
    return null;
  }

  startRow(part = this.store.getProgress().dragdrop.part, rowIndex = this.store.getProgress().dragdrop.rowIndex) {
    const row = this.getRows(part)[rowIndex];
    if (!row) {
      throw new Error('No drag-and-drop row is available for this selection yet.');
    }

    this.store.updateDragDrop({
      part,
      rowIndex,
      shuffledSymbols: shuffle(row),
      placedSymbols: Array(row.length).fill(null),
      selectedSymbol: null,
      lastOutcome: null,
      completedSet: false,
      celebrationText: ''
    });
  }

  goToNextSet() {
    this.startRow(2, this.getNextIncompleteRow(2, 0) ?? 0);
  }

  restartJourney() {
    this.store.updateDragDrop({
      part: 1,
      completedRows: { part1: [], part2: [] },
      completedSet: false,
      celebrationText: '',
      lastOutcome: null
    });
    this.startRow(1, 0);
  }

  prepareIfNeeded() {
    const { dragdrop } = this.store.getProgress();

    if (dragdrop.part === 1 && this.isPartComplete(1)) {
      this.startRow(2, this.getNextIncompleteRow(2, 0) ?? 0);
      return;
    }

    const row = this.getRows(dragdrop.part)[dragdrop.rowIndex];
    if (!row) {
      this.startRow(this.isPartComplete(1) ? 2 : 1, 0);
      return;
    }

    const ready = Array.isArray(dragdrop.shuffledSymbols)
      && dragdrop.shuffledSymbols.length === row.length
      && Array.isArray(dragdrop.placedSymbols)
      && dragdrop.placedSymbols.length === row.length;

    if (!ready) {
      this.startRow(dragdrop.part, dragdrop.rowIndex);
    }
  }

  selectSymbol(symbol) {
    this.store.updateDragDrop({
      selectedSymbol: symbol,
      lastOutcome: null,
      celebrationText: this.store.getProgress().dragdrop.completedSet ? this.store.getProgress().dragdrop.celebrationText : ''
    });
  }

  continueAfterCelebration() {
    const { dragdrop } = this.store.getProgress();
    if (dragdrop.completedSet) return;
    this.store.updateDragDrop({ lastOutcome: null, celebrationText: '' });
  }

  removeFromSlot(slotIndex) {
    const { dragdrop } = this.store.getProgress();
    const placedSymbols = [...dragdrop.placedSymbols];
    placedSymbols[slotIndex] = null;
    this.store.updateDragDrop({
      placedSymbols,
      selectedSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  async placeSymbol(symbol, slotIndex) {
    const { dragdrop } = this.store.getProgress();
    if (dragdrop.completedSet) {
      return { ok: false, status: 'complete', message: dragdrop.celebrationText };
    }

    const targetRow = this.getCurrentRow();
    const expectedSymbol = targetRow[slotIndex];
    const correctVariantName = VARIANT_NAMES[targetRow.indexOf(symbol)] || 'the correct slot';

    if (symbol !== expectedSymbol) {
      this.store.updateDragDrop({
        selectedSymbol: symbol,
        lastOutcome: 'wrong',
        celebrationText: `${symbol} does not belong there. Place it under ${correctVariantName}.`
      });
      return {
        ok: false,
        status: 'wrong-slot',
        message: `${symbol} does not fit in that slot. It belongs under ${correctVariantName}.`
      };
    }

    const placedSymbols = [...dragdrop.placedSymbols];
    const existingIndex = placedSymbols.indexOf(symbol);
    if (existingIndex >= 0) {
      placedSymbols[existingIndex] = null;
    }

    placedSymbols[slotIndex] = symbol;
    this.store.updateDragDrop({
      placedSymbols,
      selectedSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });

    if (!placedSymbols.every(Boolean)) {
      return { ok: false, status: 'partial', message: 'Good. Keep placing the rest of the family in order.' };
    }

    return this.completeRow(placedSymbols);
  }

  async completeRow(placedSymbols) {
    const { dragdrop } = this.store.getProgress();
    const currentRow = this.getCurrentRow();
    const familyLabel = currentRow[0] || 'this';

    this.store.markDragDropRowComplete(dragdrop.part, dragdrop.rowIndex);
    this.audio.playSuccessTone();

    const nextRowIndex = this.getNextIncompleteRow(dragdrop.part, dragdrop.rowIndex + 1);
    if (nextRowIndex !== null) {
      const nextRow = this.getRows(dragdrop.part)[nextRowIndex];
      this.startRow(dragdrop.part, nextRowIndex);
      this.store.updateDragDrop({
        lastOutcome: 'correct',
        celebrationText: `Wonderful! You completed the ${familyLabel} family. Next, arrange the ${nextRow[0]} family.`
      });
      return {
        ok: true,
        status: 'row-complete',
        message: `Wonderful! You completed the ${familyLabel} family. Next, arrange the ${nextRow[0]} family.`
      };
    }

    const completionText = dragdrop.part === 1
      ? 'Excellent work. You completed the first set. The second set is ready next.'
      : 'Excellent work. You completed the second set. The whole drag-and-drop journey is complete.';

    await this.audio.playVariantUnlock();

    this.store.updateDragDrop({
      placedSymbols,
      lastOutcome: 'correct',
      completedSet: true,
      celebrationText: completionText
    });

    return { ok: true, status: 'set-complete', message: completionText };
  }

  render() {
    this.prepareIfNeeded();
    const activeProfile = this.store.getActiveProfile();
    const { dragdrop } = this.store.getProgress();
    const currentRow = this.getCurrentRow();
    const availableSymbols = this.getAvailableSymbols();
    const completedCount = this.store.getDragDropProgress(dragdrop.part).length;
    const totalRows = this.getRows(dragdrop.part).length;
    const rowLabel = currentRow[0] || '?';
    const partLabel = this.getPartLabel(dragdrop.part);
    const showCelebration = dragdrop.lastOutcome === 'correct' && Boolean(dragdrop.celebrationText);
    const titleText = this.store.getText('dragdrop.title', {}, activeProfile);
    const titleEnglish = this.store.getEnglishSupportText('dragdrop.title', {}, activeProfile);
    const introText = this.store.getText('dragdrop.intro', {}, activeProfile);
    const introEnglish = this.store.getEnglishSupportText('dragdrop.intro', {}, activeProfile);

    const celebrationMarkup = showCelebration
      ? `
        <div class='celebration-card challenge-celebration dragdrop-celebration ${dragdrop.completedSet ? 'is-final' : ''}'>
          <div class='activity-badge'>${dragdrop.completedSet ? 'Set Complete' : 'Family Complete'}</div>
          <h3 class='activity-title'>${dragdrop.completedSet ? `${partLabel} complete.` : `${rowLabel} family complete.`}</h3>
          <p class='activity-copy'>${dragdrop.celebrationText}</p>
          <div class='activity-actions'>
            ${dragdrop.completedSet
              ? `${dragdrop.part === 1 ? `<button class='primary-btn' type='button' data-action='dragdrop-next-set'>Continue To Second Set</button>` : ''}
                 <button class='ghost-btn' type='button' data-action='dragdrop-restart-journey'>Practice The Whole Journey Again</button>`
              : `<button class='primary-btn' type='button' data-action='dragdrop-continue'>Continue With Next Family</button>`}
          </div>
        </div>
      `
      : '';

    return `
      <section class='workspace'>
        <div class='workspace-top'>
          <div>
            <h2 class='view-title'>${titleText}</h2>
            ${titleEnglish ? `<p class='english-copy'>${titleEnglish}</p>` : ''}
            <p class='panel-copy'>${introText}</p>
            ${introEnglish ? `<p class='english-copy'>${introEnglish}</p>` : ''}
          </div>
          <div class='mode-nav'>
            <button class='ghost-btn' type='button' data-action='dragdrop-restart-row'>Shuffle Again</button>
          </div>
        </div>

        ${celebrationMarkup}

        <section class='panel-card card'>
          <div class='stat-strip'>
            <div class='stat-pill'><strong>${partLabel}</strong>Current Set</div>
            <div class='stat-pill'><strong>${completedCount}</strong>Families Solved</div>
            <div class='stat-pill'><strong>${totalRows}</strong>Families In Set</div>
            <div class='stat-pill'><strong>${rowLabel}</strong>Current Family</div>
          </div>

          <div class='message-box ${dragdrop.lastOutcome === 'correct' ? 'is-success' : dragdrop.lastOutcome === 'wrong' ? 'is-error' : ''}'>
            <div class='message'>
              ${dragdrop.celebrationText || this.store.getText('dragdrop.instructions', {
                rowLabel,
                partLabel
              }, activeProfile)}
            </div>
          </div>

          <div class='drop-grid'>
            ${VARIANT_NAMES.map((variantName, index) => `
              <button
                class='drop-slot ${dragdrop.placedSymbols[index] ? 'is-filled' : ''}'
                type='button'
                data-action='dragdrop-slot'
                data-slot='${index}'
              >
                <span class='drop-label'>${variantName}</span>
                <span class='drop-value'>${dragdrop.placedSymbols[index] || '...'}</span>
              </button>
            `).join('')}
          </div>

          <div class='drag-bank'>
            ${availableSymbols.map((symbol) => `
              <button
                class='symbol-btn ${dragdrop.selectedSymbol === symbol ? 'is-correct' : ''}'
                type='button'
                draggable='true'
                data-action='dragdrop-bank'
                data-symbol='${symbol}'
              >${symbol}</button>
            `).join('')}
          </div>
        </section>
      </section>
    `;
  }
}

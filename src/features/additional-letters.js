import { ADDITIONAL_LETTER_GROUPS, VARIANT_NAMES } from '../data/fidelat-data.js';

function shuffle(list) {
  return [...list]
    .map((item) => ({ item, weight: Math.random() }))
    .sort((a, b) => a.weight - b.weight)
    .map((entry) => entry.item);
}

export class AdditionalLettersFeature {
  constructor(store, audio) {
    this.store = store;
    this.audio = audio;
  }

  getState() {
    return this.store.getAdditionalLettersState();
  }

  getGroup(groupId = this.getState().groupId) {
    return this.store.getAdditionalLetterGroup(groupId);
  }

  getSlotLabels(group) {
    return VARIANT_NAMES.slice(0, group.symbols.length);
  }

  ensureDragdropPrepared() {
    const state = this.getState();
    if (state.tab !== 'dragdrop') return;

    const group = this.getGroup();
    const ready = Array.isArray(state.shuffledSymbols)
      && state.shuffledSymbols.length === group.symbols.length
      && Array.isArray(state.placedSymbols)
      && state.placedSymbols.length === group.symbols.length;

    if (!ready) {
      this.startDragdrop(group.id);
    }
  }

  selectGroup(groupId) {
    const group = this.getGroup(groupId);
    const state = this.getState();

    if (state.tab === 'dragdrop') {
      this.startDragdrop(group.id);
      return;
    }

    this.store.updateAdditionalLetters({
      groupId: group.id,
      selectedSymbol: null,
      lastPlayedSymbol: null,
      selectedDragSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  setTab(tab) {
    const nextTab = tab === 'dragdrop' ? 'dragdrop' : 'learn';
    const group = this.getGroup();

    if (nextTab === 'dragdrop') {
      this.startDragdrop(group.id);
      return;
    }

    this.store.updateAdditionalLetters({
      tab: 'learn',
      selectedDragSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  startDragdrop(groupId = this.getState().groupId) {
    const group = this.getGroup(groupId);
    this.store.updateAdditionalLetters({
      groupId: group.id,
      tab: 'dragdrop',
      shuffledSymbols: shuffle(group.symbols),
      placedSymbols: Array(group.symbols.length).fill(null),
      selectedDragSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  resetDragdrop() {
    this.startDragdrop(this.getState().groupId);
  }

  async playSymbol(symbol) {
    const state = this.getState();
    await this.audio.playSymbol(symbol);
    this.store.markAdditionalLetterHeard(state.groupId, symbol);
    this.store.updateAdditionalLetters({
      selectedSymbol: symbol,
      lastPlayedSymbol: symbol
    });

    return {
      ok: true,
      status: 'played',
      message: `Played ${symbol}.`
    };
  }

  async replayCurrent() {
    const state = this.getState();
    const symbol = state.selectedSymbol || state.lastPlayedSymbol;
    if (!symbol) throw new Error('Choose a letter first, then replay it.');
    await this.audio.playSymbol(symbol);
    this.store.updateAdditionalLetters({
      selectedSymbol: symbol,
      lastPlayedSymbol: symbol
    });
  }

  selectDragSymbol(symbol) {
    this.store.updateAdditionalLetters({
      selectedDragSymbol: symbol,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  removeFromSlot(slotIndex) {
    const state = this.getState();
    const placedSymbols = [...state.placedSymbols];
    placedSymbols[slotIndex] = null;
    this.store.updateAdditionalLetters({
      placedSymbols,
      selectedDragSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });
  }

  async placeSymbol(symbol, slotIndex) {
    const state = this.getState();
    const group = this.getGroup();

    if (state.placedSymbols.every(Boolean)) {
      return {
        ok: false,
        status: 'complete',
        message: state.celebrationText || 'This set is already complete. Shuffle it again or pick another set.'
      };
    }

    const expected = group.symbols[slotIndex];
    const slotLabels = this.getSlotLabels(group);

    if (symbol !== expected) {
      this.store.updateAdditionalLetters({
        selectedDragSymbol: symbol,
        lastOutcome: 'wrong',
        celebrationText: `${symbol} does not belong there. Place it under ${slotLabels[group.symbols.indexOf(symbol)] || 'the correct slot'}.`
      });
      return {
        ok: false,
        status: 'wrong-slot',
        message: `${symbol} does not belong in that position yet.`
      };
    }

    const placedSymbols = [...state.placedSymbols];
    const existingIndex = placedSymbols.indexOf(symbol);
    if (existingIndex >= 0) {
      placedSymbols[existingIndex] = null;
    }

    placedSymbols[slotIndex] = symbol;
    this.store.updateAdditionalLetters({
      placedSymbols,
      selectedDragSymbol: null,
      lastOutcome: null,
      celebrationText: ''
    });

    if (!placedSymbols.every(Boolean)) {
      return {
        ok: false,
        status: 'partial',
        message: 'Good. Keep placing the rest of the letters in order.'
      };
    }

    this.store.markAdditionalLettersGroupComplete(group.id);
    this.audio.playSuccessTone();

    const celebrationText = `Great work. The ${group.symbols[0]} set is complete.`;
    this.store.updateAdditionalLetters({
      placedSymbols,
      lastOutcome: 'correct',
      celebrationText
    });

    return {
      ok: true,
      status: 'set-complete',
      message: celebrationText
    };
  }

  renderSetButtons() {
    const state = this.getState();
    return `
      <div class='additional-set-grid'>
        ${ADDITIONAL_LETTER_GROUPS.map((group) => `
          <button
            class='additional-set-btn ${state.groupId === group.id ? 'is-active' : ''} ${this.store.isAdditionalLettersGroupComplete(group.id) ? 'is-complete' : ''}'
            type='button'
            data-action='additional-set'
            data-group-id='${group.id}'
          >
            <strong>${group.symbols[0]}</strong>
            <span class='additional-preview'>${group.symbols.join(' ')}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  renderLearnPanel(group, activeProfile) {
    const state = this.getState();
    const heard = this.store.getAdditionalLetterHeard(group.id);
    const activeSymbol = state.selectedSymbol || state.lastPlayedSymbol || group.symbols[0] || '?';
    const learnHelper = this.store.getText('additional.learnHelper', {}, activeProfile);
    const learnHelperEnglish = this.store.getEnglishSupportText('additional.learnHelper', {}, activeProfile);
    const replayLabel = this.store.getText('additional.replayLabel', {}, null);

    return `
      <section class='panel-card card'>
        <div class='stat-strip'>
          <div class='stat-pill'><strong>${group.symbols.length}</strong>Letters In Set</div>
          <div class='stat-pill'><strong>${heard.length}</strong>Heard</div>
          <div class='stat-pill'><strong>${this.audio.hasAudio(group.symbols[0]) ? 'Ready' : 'Waiting'}</strong>Audio</div>
        </div>

        <div class='symbol-display'>${activeSymbol}</div>
        <div class='symbol-caption'>
          <div>
            <strong>${group.symbols.join(' ')}</strong>
            <div class='helper-copy'>${learnHelper}</div>
            ${learnHelperEnglish ? `<div class='helper-copy english-copy'>${learnHelperEnglish}</div>` : ''}
          </div>
          <div class='helper-copy'>${activeProfile ? activeProfile.name : 'Learner'}</div>
        </div>

        <div class='activity-actions'>
          <button class='secondary-btn' type='button' data-action='additional-replay'>${replayLabel}</button>
        </div>

        <div class='explorer-grid'>
          ${group.symbols.map((symbol) => `
            <button
              class='symbol-btn ${symbol === state.selectedSymbol ? 'is-correct' : heard.includes(symbol) ? 'is-complete' : ''}'
              type='button'
              data-action='additional-play'
              data-symbol='${symbol}'
            >${symbol}</button>
          `).join('')}
        </div>
      </section>
    `;
  }

  renderDragdropPanel(group) {
    this.ensureDragdropPrepared();
    const state = this.getState();
    const slotLabels = this.getSlotLabels(group);
    const shuffleLabel = this.store.getText('additional.shuffleLabel', {}, null);

    return `
      <section class='panel-card card'>
        <div class='stat-strip'>
          <div class='stat-pill'><strong>${group.symbols.length}</strong>Letters In Set</div>
          <div class='stat-pill'><strong>${this.store.getAdditionalLettersState().completedGroupIds.length}</strong>Sets Solved</div>
          <div class='stat-pill'><strong>${this.store.isAdditionalLettersGroupComplete(group.id) ? 'Complete' : 'Practice'}</strong>Current Set</div>
        </div>

        ${state.celebrationText
          ? `
            <div class='message-box ${state.lastOutcome === 'correct' ? 'is-success' : state.lastOutcome === 'wrong' ? 'is-error' : ''}'>
              <div class='message'>${state.celebrationText}</div>
            </div>
          `
          : ''}

        <div class='drop-grid'>
          ${slotLabels.map((label, index) => `
            <button
              class='drop-slot ${state.placedSymbols[index] ? 'is-filled' : ''}'
              type='button'
              data-action='additional-drag-slot'
              data-slot='${index}'
            >
              <span class='drop-label'>${label}</span>
              <span class='drop-value'>${state.placedSymbols[index] || '...'}</span>
            </button>
          `).join('')}
        </div>

        <div class='drag-bank'>
          ${state.shuffledSymbols.filter((symbol) => !state.placedSymbols.includes(symbol)).map((symbol) => `
            <button
              class='symbol-btn additional-drag-btn ${state.selectedDragSymbol === symbol ? 'is-correct' : ''}'
              type='button'
              data-action='additional-drag-bank'
              data-symbol='${symbol}'
            >${symbol}</button>
          `).join('')}
        </div>

        <div class='activity-actions'>
          <button class='ghost-btn' type='button' data-action='additional-drag-reset'>${shuffleLabel}</button>
        </div>
      </section>
    `;
  }

  render() {
    const activeProfile = this.store.getActiveProfile();
    const state = this.getState();
    const group = this.getGroup();
    const tab = state.tab === 'dragdrop' ? 'dragdrop' : 'learn';
    const titleText = this.store.getText('additional.title', {}, activeProfile);
    const titleEnglish = this.store.getEnglishSupportText('additional.title', {}, activeProfile);
    const introText = this.store.getText('additional.intro', {}, activeProfile);
    const introEnglish = this.store.getEnglishSupportText('additional.intro', {}, activeProfile);
    const learnTabLabel = this.store.getText('additional.learnTabLabel', {}, null);
    const dragdropTabLabel = this.store.getText('additional.dragdropTabLabel', {}, null);

    return `
      <section class='workspace'>
        <div class='workspace-top'>
          <div>
            <h2 class='view-title'>${titleText}</h2>
            ${titleEnglish ? `<p class='english-copy'>${titleEnglish}</p>` : ''}
            <p class='panel-copy'>${introText}</p>
            ${introEnglish ? `<p class='english-copy'>${introEnglish}</p>` : ''}
          </div>
        </div>

        ${this.renderSetButtons()}

        <div class='admin-tabs additional-tabs'>
          <button class='chip-btn ${tab === 'learn' ? 'is-active' : ''}' type='button' data-action='additional-tab' data-tab='learn'>${learnTabLabel}</button>
          <button class='chip-btn ${tab === 'dragdrop' ? 'is-active' : ''}' type='button' data-action='additional-tab' data-tab='dragdrop'>${dragdropTabLabel}</button>
        </div>

        ${tab === 'learn' ? this.renderLearnPanel(group, activeProfile) : this.renderDragdropPanel(group)}
      </section>
    `;
  }
}

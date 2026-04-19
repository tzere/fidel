import { VARIANT_NAMES } from '../data/fidelat-data.js';

export class AlphabetExplorerFeature {
  constructor(store, audio) {
    this.store = store;
    this.audio = audio;
  }

  getPreferredPart(variantIndex) {
    return this.store.isExplorerPartComplete(variantIndex, 1) ? 2 : 1;
  }

  selectVariant(variantIndex) {
    const part = this.getPreferredPart(variantIndex);
    this.store.updateExplorer({ variantIndex, part, selectedSymbol: null, lastPlayedSymbol: null });
    return part;
  }

  openSecondPart() {
    const { variantIndex } = this.store.getProgress().explorer;
    if (!this.store.isExplorerPartComplete(variantIndex, 1)) {
      throw new Error('Finish the first explorer part before opening the second one.');
    }

    this.store.updateExplorer({ part: 2, selectedSymbol: null, lastPlayedSymbol: null });
  }

  reviewFirstPart() {
    this.store.updateExplorer({ part: 1, selectedSymbol: null, lastPlayedSymbol: null });
  }

  async playSymbol(symbol) {
    const { variantIndex, part } = this.store.getProgress().explorer;
    await this.audio.playSymbol(symbol);
    this.store.markExplorerSymbolHeard(variantIndex, part, symbol);

    const partProgress = this.store.getExplorerProgress(variantIndex, part);
    const partTotal = this.store.getVariantSymbols(variantIndex, part).length;
    const partComplete = partProgress.length >= partTotal;

    if (part === 1 && partComplete) {
      this.store.updateExplorer({ part: 2, selectedSymbol: null, lastPlayedSymbol: symbol });
      return {
        status: 'part-advanced',
        message: this.store.getText('explorer.partAdvanceMessage', {
          variantName: VARIANT_NAMES[variantIndex]
        })
      };
    }

    this.store.updateExplorer({ selectedSymbol: symbol, lastPlayedSymbol: symbol });
    return {
      status: partComplete ? 'part-complete' : 'played',
      message: `Played ${symbol}.`
    };
  }

  async replayCurrent() {
    const { selectedSymbol, lastPlayedSymbol } = this.store.getProgress().explorer;
    const symbol = selectedSymbol || lastPlayedSymbol;
    if (!symbol) throw new Error('Choose a symbol first, then play it.');
    await this.audio.playSymbol(symbol);
    this.store.updateExplorer({ selectedSymbol: symbol, lastPlayedSymbol: symbol });
  }

  render() {
    const activeProfile = this.store.getActiveProfile();
    const { explorer } = this.store.getProgress();
    const { variantIndex, part, selectedSymbol, lastPlayedSymbol } = explorer;
    const activeSymbol = selectedSymbol || lastPlayedSymbol || '?';
    const symbols = this.store.getVariantSymbols(variantIndex, part);
    const helper = selectedSymbol
      ? this.store.getText('explorer.helperActive', {}, activeProfile)
      : this.store.getText('explorer.helperIdle', {}, activeProfile);
    const titleText = this.store.getText('explorer.title', {}, activeProfile);
    const titleEnglish = this.store.getEnglishSupportText('explorer.title', {}, activeProfile);
    const introText = this.store.getText('explorer.intro', {}, activeProfile);
    const introEnglish = this.store.getEnglishSupportText('explorer.intro', {}, activeProfile);
    const firstPartComplete = this.store.isExplorerPartComplete(variantIndex, 1);
    const partProgress = this.store.getExplorerProgress(variantIndex, part).length;
    const partTotal = symbols.length;
    const partLabel = part === 2 ? 'Part 2' : 'Part 1';

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
            <button class='secondary-btn' type='button' data-action='explorer-replay'>Replay Current</button>
          </div>
        </div>

        <section class='panel-card card'>
          <div class='selector-row'>
            <label>
              <span class='helper-copy'><strong>Variant</strong></span><br />
              <select class='selector' data-action='explorer-variant'>
                ${VARIANT_NAMES.map((name, index) => `
                  <option value='${index}' ${index === variantIndex ? 'selected' : ''}>${name}</option>
                `).join('')}
              </select>
            </label>
            <div class='stat-strip compact-strip'>
              <div class='stat-pill'><strong>${partLabel}</strong>Current Part</div>
              <div class='stat-pill'><strong>${partProgress}/${partTotal}</strong>Explored</div>
              <div class='stat-pill'><strong>${firstPartComplete ? 'Ready' : 'Learning'}</strong>Second Part</div>
            </div>
          </div>

          ${firstPartComplete
            ? `
              <div class='activity-actions'>
                ${part === 1
                  ? `<button class='primary-btn' type='button' data-action='explorer-open-second-part'>Open Part 2</button>`
                  : `<button class='ghost-btn' type='button' data-action='explorer-review-first-part'>Review Part 1</button>`}
              </div>
            `
            : ''}

          <div class='symbol-display'>${activeSymbol}</div>
          <div class='symbol-caption'>
            <div>
              <strong>${VARIANT_NAMES[variantIndex]} - ${partLabel}</strong>
              <div class='helper-copy'>${helper}</div>
            </div>
            <div class='helper-copy'>${selectedSymbol ? 'Selected: ' + selectedSymbol : 'Tap to hear each letter'}</div>
          </div>

          <div class='explorer-grid'>
            ${symbols.map((symbol) => `
              <button
                class='symbol-btn ${symbol === selectedSymbol ? 'is-correct' : ''}'
                type='button'
                data-action='explorer-symbol'
                data-symbol='${symbol}'
              >${symbol}</button>
            `).join('')}
          </div>
        </section>
      </section>
    `;
  }
}

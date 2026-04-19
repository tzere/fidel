import { VARIANT_NAMES } from './src/data/fidelat-data.js';
import { ProgressStore } from './src/core/progress-store.js';
import { AlphabetExplorerFeature } from './src/features/alphabet-explorer.js';
import { DragDropFeature } from './src/features/drag-drop.js';
import { AdditionalLettersFeature } from './src/features/additional-letters.js';
import { ListenMatchFeature } from './src/features/listen-match.js';
import { AudioService } from './src/services/audio-service.js';
import { StorageService } from './src/services/storage-service.js';
import { THEME_OPTIONS, getThemeFrameVars } from './src/services/theme-service.js';

class FidelatApp {
  constructor(root) {
    this.root = root;
    this.route = this.isAdminRoute() ? 'admin' : 'learner';
    this.storage = new StorageService();
    this.store = new ProgressStore(this.storage);
    this.audio = new AudioService();
    this.explorer = new AlphabetExplorerFeature(this.store, this.audio);
    this.dragdrop = new DragDropFeature(this.store, this.audio);
    this.additionalLetters = new AdditionalLettersFeature(this.store, this.audio);
    this.challenge = new ListenMatchFeature(this.store, this.audio);
    this.audioReady = false;
    this.adminTab = 'copy';
    this.banner = {
      tone: 'info',
      text: 'Loading your learning studio.'
    };
    this.authModal = null;
    this.pointerDrag = null;
    this.suppressAdditionalClickUntil = 0;
  }

  isAdminRoute() {
    const path = String(window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    return /(^|\/)admin(\/|$)/.test(path);
  }

  getRootUrl() {
    return new URL(this.route === 'admin' ? '../' : './', window.location.href).href;
  }

  getAdminUrl() {
    return new URL('admin/', this.getRootUrl()).href;
  }

  goToLearnerUrl() {
    window.location.href = this.getRootUrl();
  }

  goToAdminUrl() {
    window.location.href = this.getAdminUrl();
  }

  async init() {
    this.attachEvents();
    this.render();

    try {
      await this.audio.loadAudioMap();
      this.audioReady = true;
      if (this.route === 'admin') {
        this.setBanner('success', this.store.isAdminAuthenticated()
          ? 'Sounds loaded. Admin controls are ready.'
          : 'Sounds loaded. Log in on this admin page to continue.');
      } else {
        this.setBanner('success', this.store.hasActiveProfile()
          ? 'Sounds loaded. Continue with the learner menu above.'
          : '');
      }
    } catch (error) {
      this.audioReady = false;
      this.setBanner('error', error.message || 'Audio files could not be loaded.');
    }

    this.render();
  }

  attachEvents() {
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('change', (event) => this.handleChange(event));
    this.root.addEventListener('submit', (event) => this.handleSubmit(event));
    this.root.addEventListener('dragstart', (event) => this.handleDragStart(event));
    this.root.addEventListener('dragover', (event) => this.handleDragOver(event));
    this.root.addEventListener('drop', (event) => this.handleDrop(event));
    this.root.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    window.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: false });
    window.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    window.addEventListener('pointercancel', (event) => this.handlePointerCancel(event));
  }

  createPointerDragGhost(symbol) {
    const ghost = document.createElement('div');
    ghost.className = 'pointer-drag-ghost';
    ghost.textContent = symbol;
    document.body.appendChild(ghost);
    return ghost;
  }

  positionPointerDragGhost(drag, clientX, clientY) {
    if (!drag?.ghost) return;
    drag.ghost.style.transform = `translate(${clientX + 18}px, ${clientY + 18}px)`;
  }

  clearPointerDrag(options = {}) {
    const { suppressClick = false } = options;
    if (this.pointerDrag?.ghost) this.pointerDrag.ghost.remove();
    this.pointerDrag = null;
    if (suppressClick) this.suppressAdditionalClickUntil = Date.now() + 400;
  }

  handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    const button = event.target.closest('[data-action="additional-drag-bank"]');
    if (!button) return;

    const activeProfile = this.store.getActiveProfile();
    const activeView = this.store.getProgress().activeView;
    const additionalState = this.store.getAdditionalLettersState();
    if (!activeProfile || activeView !== 'additionalLetters' || additionalState.tab !== 'dragdrop') return;

    this.pointerDrag = {
      pointerId: event.pointerId,
      symbol: button.dataset.symbol,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null
    };
  }

  handlePointerMove(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const movedFarEnough = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 8;
    if (!drag.dragging && !movedFarEnough) return;

    if (!drag.dragging) {
      drag.dragging = true;
      drag.ghost = this.createPointerDragGhost(drag.symbol);
    }

    this.positionPointerDragGhost(drag, event.clientX, event.clientY);
    event.preventDefault();
  }

  async handlePointerUp(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.dragging) {
      this.clearPointerDrag();
      return;
    }

    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-action="additional-drag-slot"]');
    const symbol = drag.symbol;
    this.clearPointerDrag({ suppressClick: true });

    if (!slot) return;

    try {
      const result = await this.additionalLetters.placeSymbol(symbol, Number(slot.dataset.slot));
      await this.handleAdditionalLettersResult(result);
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  handlePointerCancel(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.clearPointerDrag({ suppressClick: drag.dragging });
  }

  getLearnerTypeLabel(profile) {
    return this.store.getText('labels.learnerType', {}, profile);
  }

  getEnglishSupportText(key, variables = {}, profile = this.store.getActiveProfile()) {
    return this.store.getEnglishSupportText(key, variables, profile);
  }

  renderEnglishSupport(key, variables = {}, profile = this.store.getActiveProfile(), className = 'english-copy') {
    const english = this.getEnglishSupportText(key, variables, profile);
    return english ? `<p class='${className}'>${english}</p>` : '';
  }

  getCurrentViewTitle() {
    const activeProfile = this.route === 'admin' ? null : this.store.getActiveProfile();
    if (this.route === 'admin') return this.store.getText('admin.title', {}, null);
    if (!activeProfile) return this.store.getText('menu.brandTitle', {}, null);

    const activeView = this.store.getProgress().activeView;
    if (activeView === 'explorer') return this.store.getText('explorer.title', {}, activeProfile);
    if (activeView === 'dragdrop') return this.store.getText('dragdrop.title', {}, activeProfile);
    if (activeView === 'challenge') return this.store.getText('challenge.title', {}, activeProfile);
    if (activeView === 'additionalLetters') return this.store.getText('additional.title', {}, activeProfile);
    return this.store.getText('home.welcomeTitle', { name: activeProfile.name }, activeProfile);
  }

  updateDocumentTitle() {
    const brand = this.store.getText('menu.brandEyebrow', {}, null) || 'Fidelat House';
    document.title = `${this.getCurrentViewTitle()} | ${brand}`;
  }

  escapeAttribute(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  escapeTextarea(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  formatTimestamp(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  setBanner(tone, text) {
    this.banner = { tone, text };
    this.render();
  }

  openAuthModal(mode = 'login', options = {}) {
    this.authModal = {
      mode,
      message: typeof options.message === 'string' ? options.message : '',
      redirectView: options.redirectView || null
    };
    this.render();
  }

  closeAuthModal() {
    if (!this.authModal) return;
    this.authModal = null;
    this.render();
  }

  async completeLearnerAuthSuccess(message) {
    const redirectView = this.authModal?.redirectView || 'home';
    this.authModal = null;
    this.store.setActiveView(redirectView);

    if (redirectView === 'challenge') {
      const { challenge } = this.store.getProgress();
      if (!challenge.targetSymbol && !challenge.unlockReadyVariantIndex && !challenge.courseCompleted) {
        await this.requireAudio(() => this.challenge.startRound(true));
      }
    }

    this.setBanner('success', message);
  }

  async openView(view, options = {}) {
    if (view === 'admin') {
      this.goToAdminUrl();
      return;
    }

    if (this.route === 'admin') {
      this.setBanner('error', 'Use the learner page to open learner activities.');
      return;
    }

    if (!this.store.hasActiveProfile()) {
      if (view === 'home') {
        this.authModal = null;
        this.store.setActiveView('home');
        this.render();
        return;
      }

      const labels = {
        explorer: 'Learn',
        dragdrop: 'Test 1',
        challenge: 'Test 2',
        additionalLetters: 'More Letters'
      };

      this.openAuthModal('login', {
        message: `Login to keep your progress before opening ${labels[view] || 'this activity'}.`,
        redirectView: view
      });
      return;
    }

    this.store.setActiveView(view);

    if (view === 'challenge' && options.autoStart) {
      const { challenge } = this.store.getProgress();
      if (!challenge.targetSymbol && !challenge.unlockReadyVariantIndex && !challenge.courseCompleted) {
        await this.requireAudio(() => this.challenge.startRound(true));
        this.setBanner('info', 'The first challenge started. Listen and choose the matching symbol.');
        return;
      }
    }

    this.render();
  }

  handleChange(event) {
    const action = event.target.dataset.action;
    if (action === 'theme-select') {
      this.store.setTheme(event.target.value);
      this.render();
      return;
    }

    if (action === 'explorer-variant') {
      const part = this.explorer.selectVariant(Number(event.target.value));
      this.setBanner('info', `Explorer moved to ${part === 2 ? 'part 2' : 'part 1'}. Press any symbol to hear it.`);
    }
  }

  buildCopyPatch(formData) {
    const patch = {};
    this.store.getCopySections().forEach((section) => {
      section.fields.forEach((field) => {
        patch[field.key] = {
          default: String(formData.get(`${field.key}:default`) ?? '').trim(),
          female: field.gendered ? String(formData.get(`${field.key}:female`) ?? '').trim() : '',
          male: field.gendered ? String(formData.get(`${field.key}:male`) ?? '').trim() : ''
        };
      });
    });
    return patch;
  }

  async handleSubmit(event) {
    const form = event.target;
    const action = form.dataset.action;
    if (!action) return;

    event.preventDefault();
    const data = new FormData(form);

    try {
      if (action === 'register-form') {
        this.store.registerProfile(data.get('name'), data.get('email'), data.get('pin'), data.get('sex'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.profileCreated', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'login-form') {
        this.store.loginProfile(data.get('profileId'), data.get('pin'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.loginRestored', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'guest-form') {
        this.store.continueAsGuest(data.get('name'), data.get('sex'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.guestStarted', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'admin-setup-form') {
        this.audio.stop();
        this.store.setupAdmin(data.get('pin'));
        this.adminTab = 'copy';
        this.setBanner('success', 'Administrator access is ready on this device.');
        return;
      }

      if (action === 'admin-login-form') {
        this.audio.stop();
        this.store.loginAdmin(data.get('pin'));
        this.adminTab = 'copy';
        this.setBanner('success', 'Administrator access restored.');
        return;
      }

      if (action === 'admin-copy-form') {
        this.store.updateAdminCopy(this.buildCopyPatch(data));
        this.setBanner('success', 'Page text updated. Learners will see the new wording immediately on this device.');
        return;
      }

      if (action === 'admin-pin-form') {
        this.store.changeAdminPin(data.get('pin'));
        this.setBanner('success', 'The administrator PIN was updated.');
        return;
      }

      if (action === 'admin-profile-form') {
        const profileId = form.dataset.profileId;
        this.store.updateProfileDetails(profileId, {
          name: data.get('name'),
          email: data.get('email'),
          pin: data.get('pin'),
          sex: data.get('sex')
        });
        const updated = this.store.getProfiles().find((profile) => profile.id === profileId);
        this.setBanner('success', `Saved learner details for ${updated?.name || 'the learner'}.`);
        return;
      }
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  handleDragStart(event) {
    const element = event.target.closest('[data-action="dragdrop-bank"]');
    if (!element) return;
    event.dataTransfer.setData('text/plain', element.dataset.symbol);
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event) {
    const slot = event.target.closest('[data-action="dragdrop-slot"]');
    if (!slot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  async handleDrop(event) {
    const dragdropSlot = event.target.closest('[data-action="dragdrop-slot"]');
    if (!dragdropSlot) return;

    event.preventDefault();
    const symbol = event.dataTransfer.getData('text/plain');
    if (!symbol) return;

    const result = await this.dragdrop.placeSymbol(symbol, Number(dragdropSlot.dataset.slot));
    await this.handleDragDropResult(result);
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    if (
      (action === 'additional-drag-bank' || action === 'additional-drag-slot')
      && Date.now() < this.suppressAdditionalClickUntil
    ) {
      return;
    }

    try {
      if (action === 'auth-link') {
        this.openAuthModal(button.dataset.mode || 'login', {
          message: button.dataset.message || '',
          redirectView: button.dataset.redirectView || null
        });
        return;
      }

      if (action === 'auth-switch') {
        this.openAuthModal(button.dataset.mode || 'login', {
          redirectView: button.dataset.redirectView || this.authModal?.redirectView || null
        });
        return;
      }

      if (action === 'close-auth-modal') {
        this.closeAuthModal();
        return;
      }

      if (action === 'navigate') {
        await this.openView(button.dataset.view, {
          autoStart: button.dataset.view === 'challenge'
        });
        return;
      }

      if (action === 'go-to-admin') {
        this.goToAdminUrl();
        return;
      }

      if (action === 'go-to-learner') {
        this.goToLearnerUrl();
        return;
      }

      if (action === 'admin-tab') {
        this.adminTab = button.dataset.tab || 'copy';
        this.render();
        return;
      }

      if (action === 'admin-logout') {
        this.store.logoutAdmin();
        this.adminTab = 'copy';
        this.setBanner('info', 'The administrator was logged out.');
        return;
      }

      if (action === 'admin-reset-copy') {
        const shouldReset = window.confirm('Restore all editable page text back to the built-in defaults for this device?');
        if (!shouldReset) return;
        this.store.resetAdminCopy();
        this.setBanner('info', 'Admin-managed page text was restored to the defaults.');
        return;
      }

      if (action === 'admin-reset-profile') {
        const profile = this.store.getProfiles().find((item) => item.id === button.dataset.profileId);
        const shouldReset = window.confirm(`Reset all saved progress for ${profile?.name || 'this learner'} on this device?`);
        if (!shouldReset) return;
        this.store.resetProfileProgress(button.dataset.profileId);
        this.setBanner('info', `${profile?.name || 'The learner'} now has a fresh start.`);
        return;
      }

      if (action === 'admin-delete-profile') {
        const profile = this.store.getProfiles().find((item) => item.id === button.dataset.profileId);
        const shouldDelete = window.confirm(`Delete ${profile?.name || 'this learner'} and remove the saved progress on this device?`);
        if (!shouldDelete) return;
        this.store.deleteProfile(button.dataset.profileId);
        this.setBanner('info', `${profile?.name || 'The learner'} was deleted from this device.`);
        return;
      }

      if (action === 'logout') {
        const activeProfile = this.store.getActiveProfile();
        const guestMode = this.store.isGuestProfile(activeProfile);
        this.audio.stop();
        this.store.logoutProfile();
        this.setBanner('info', guestMode
          ? `${activeProfile?.name || 'The local learner'} left the local session. Progress stays on this device.`
          : `${activeProfile?.name || 'The learner'} was logged out.`);
        return;
      }

      if (action === 'additional-set') {
        this.additionalLetters.selectGroup(button.dataset.groupId);
        this.render();
        return;
      }

      if (action === 'additional-tab') {
        this.additionalLetters.setTab(button.dataset.tab);
        this.render();
        return;
      }

      if (action === 'additional-play') {
        await this.requireAudio(async () => {
          const result = await this.additionalLetters.playSymbol(button.dataset.symbol);
          this.setBanner('info', result.message);
        });
        return;
      }

      if (action === 'additional-replay') {
        await this.requireAudio(() => this.additionalLetters.replayCurrent());
        this.setBanner('success', 'Replayed the current additional letter.');
        return;
      }

      if (action === 'additional-drag-reset') {
        this.additionalLetters.resetDragdrop();
        this.setBanner('info', 'The current additional-letter set was shuffled again.');
        return;
      }

      if (action === 'additional-drag-bank') {
        this.additionalLetters.selectDragSymbol(button.dataset.symbol);
        this.setBanner('info', `Selected ${button.dataset.symbol}. Now place it into the right position.`);
        return;
      }

      if (action === 'additional-drag-slot') {
        const slotIndex = Number(button.dataset.slot);
        const additionalState = this.store.getAdditionalLettersState();
        const selectedSymbol = additionalState.selectedDragSymbol;
        if (selectedSymbol) {
          const result = await this.additionalLetters.placeSymbol(selectedSymbol, slotIndex);
          await this.handleAdditionalLettersResult(result);
        } else if (additionalState.placedSymbols[slotIndex]) {
          this.additionalLetters.removeFromSlot(slotIndex);
          this.setBanner('info', 'The letter was removed from that slot.');
        }
        return;
      }

      if (action === 'explorer-open-second-part') {
        this.explorer.openSecondPart();
        this.setBanner('success', 'Explorer moved to the second part.');
        return;
      }

      if (action === 'explorer-review-first-part') {
        this.explorer.reviewFirstPart();
        this.setBanner('info', 'Explorer returned to the first part for review.');
        return;
      }

      if (action === 'explorer-symbol') {
        await this.requireAudio(async () => {
          const result = await this.explorer.playSymbol(button.dataset.symbol);
          this.setBanner(result.status === 'part-advanced' ? 'success' : 'info', result.message);
        });
        return;
      }

      if (action === 'explorer-replay') {
        await this.requireAudio(() => this.explorer.replayCurrent());
        this.setBanner('success', 'Replayed the current symbol.');
        return;
      }

      if (action === 'dragdrop-next-set') {
        this.dragdrop.goToNextSet();
        this.setBanner('success', 'Second set opened. Continue arranging the next families.');
        return;
      }

      if (action === 'dragdrop-restart-journey') {
        this.dragdrop.restartJourney();
        this.setBanner('info', 'The whole drag-and-drop journey restarted from the first set.');
        return;
      }

      if (action === 'dragdrop-restart-row') {
        const { dragdrop } = this.store.getProgress();
        if (dragdrop.completedSet) {
          this.dragdrop.restartJourney();
          this.setBanner('info', 'The whole drag-and-drop journey restarted from the first set.');
        } else {
          this.dragdrop.startRow(dragdrop.part, dragdrop.rowIndex);
          this.setBanner('info', 'This family was shuffled again for another try.');
        }
        return;
      }

      if (action === 'dragdrop-continue') {
        this.dragdrop.continueAfterCelebration();
        this.setBanner('info', 'Continue with the next family.');
        return;
      }

      if (action === 'dragdrop-bank') {
        this.dragdrop.selectSymbol(button.dataset.symbol);
        this.setBanner('info', `Selected ${button.dataset.symbol}. Now place it into the right position.`);
        return;
      }

      if (action === 'dragdrop-slot') {
        const slotIndex = Number(button.dataset.slot);
        const { dragdrop } = this.store.getProgress();
        const selectedSymbol = dragdrop.selectedSymbol;
        if (selectedSymbol) {
          const result = await this.dragdrop.placeSymbol(selectedSymbol, slotIndex);
          await this.handleDragDropResult(result);
        } else if (dragdrop.placedSymbols[slotIndex]) {
          this.dragdrop.removeFromSlot(slotIndex);
          this.setBanner('info', 'The letter was removed from that slot.');
        }
        return;
      }

      if (action === 'challenge-variant') {
        await this.requireAudio(() => this.challenge.openVariant(Number(button.dataset.variant)));
        this.setBanner('info', 'The selected variant opened and the next challenge was prepared.');
        return;
      }

      if (action === 'challenge-play') {
        await this.requireAudio(() => this.challenge.replayPrompt());
        this.setBanner('info', 'Prompt played. Choose the matching symbol.');
        return;
      }

      if (action === 'challenge-unlock') {
        await this.requireAudio(() => this.challenge.unlockNextVariant());
        this.setBanner('success', 'The next variant is now open and the first challenge has started.');
        return;
      }

      if (action === 'challenge-guess') {
        const result = await this.challenge.submitGuess(button.dataset.symbol);
        await this.handleChallengeResult(result);
        return;
      }

      if (action === 'challenge-reset') {
        const activeProfile = this.store.getActiveProfile();
        const shouldReset = window.confirm(`Reset all saved progress for ${activeProfile?.name || 'this learner'} on this device?`);
        if (!shouldReset) return;
        this.store.resetCurrentProfile();
        this.setBanner('info', 'This learner now has a fresh start.');
      }
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  async handleDragDropResult(result) {
    if (!result) return;

    if (result.status === 'row-complete' || result.status === 'set-complete') {
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'wrong' || result.status === 'wrong-slot') {
      this.setBanner('error', result.message);
      return;
    }

    if (result.status === 'partial') {
      this.setBanner('info', result.message);
      return;
    }

    this.setBanner(result.ok ? 'success' : 'info', result.message || 'Drag-and-drop updated.');
  }

  async handleChallengeResult(result) {
    if (!result) return;

    if (result.status === 'continue' || result.status === 'part-advanced') {
      await this.requireAudio(() => this.challenge.startRound(true));
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'variant-complete') {
      await this.audio.playVariantUnlock();
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'course-complete') {
      await this.audio.playFinalCelebration();
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'wrong') {
      this.setBanner('error', result.message);
      return;
    }

    if (result.status === 'prompt-started' || result.status === 'blocked') {
      this.setBanner('info', result.message);
      return;
    }

    this.setBanner(result.ok ? 'success' : 'info', result.message || 'Challenge updated.');
  }

  async requireAudio(task) {
    if (!this.audioReady) {
      throw new Error('Audio is not ready yet. Check sounds.json and the audio files first.');
    }
    await task();
  }

  applyTheme() {
    const activeThemeId = this.store.getTheme();
    document.body.dataset.theme = activeThemeId;
    const frameVars = getThemeFrameVars(activeThemeId);
    Object.entries(frameVars).forEach(([key, value]) => {
      document.body.style.setProperty(key, value);
    });
  }

  renderThemePicker() {
    const activeThemeId = this.store.getTheme();

    return `
      <section class='theme-panel' aria-label='Frame themes'>
        <label class='theme-inline'>
          <span class='theme-inline-label'>Choose theme</span>
          <select class='selector theme-select' data-action='theme-select' aria-label='Choose frame theme'>
            ${THEME_OPTIONS.map((theme) => `
              <option value='${theme.id}' ${theme.id === activeThemeId ? 'selected' : ''}>${theme.label}</option>
            `).join('')}
          </select>
        </label>
      </section>
    `;
  }

  renderMenu() {
    const adminRoute = this.route === 'admin';
    const adminActive = adminRoute && this.store.isAdminAuthenticated();
    const activeProfile = adminRoute ? null : this.store.getActiveProfile();
    const activeView = this.store.getProgress().activeView;
    const items = [
      ['home', 'Home'],
      ['explorer', 'Learn'],
      ['dragdrop', 'Test 1'],
      ['challenge', 'Test 2'],
      ['additionalLetters', 'More']
    ];

    const navigation = adminRoute
      ? `
        <nav class='main-menu' aria-label='Admin menu'>
          <button class='menu-btn' type='button' data-action='go-to-learner'>Learner Page</button>
          ${adminActive ? `<button class='menu-btn is-active' type='button'>Admin</button>` : ''}
        </nav>
      `
      : `
        <nav class='main-menu' aria-label='Main menu'>
          ${items.map(([view, label]) => `
            <button class='menu-btn ${activeView === view ? 'is-active' : ''}' type='button' data-action='navigate' data-view='${view}'>${label}</button>
          `).join('')}
        </nav>
      `;

    const roleLabel = adminRoute
      ? this.store.getText('labels.adminRole', {}, null)
      : activeProfile
        ? this.getLearnerTypeLabel(activeProfile)
        : this.store.getText('labels.learnerType', {}, null);

    const profileName = adminRoute
      ? adminActive ? 'Content and learner controls' : 'Admin sign-in'
      : activeProfile
        ? this.store.isGuestProfile(activeProfile) ? `${activeProfile.name} (Guest)` : activeProfile.name
        : 'Login, register, or continue as guest';

    const actionButton = adminRoute
      ? adminActive ? `<button class='ghost-btn' type='button' data-action='admin-logout'>Log out admin</button>` : ''
      : activeProfile
        ? `<button class='ghost-btn' type='button' data-action='logout'>${this.store.isGuestProfile(activeProfile) ? 'Leave Guest Session' : 'Log Out'}</button>`
        : '';

    return `
      <header class='top-shell card'>
        <div class='brand-block'>
          <div class='eyebrow'>${this.store.getText('menu.brandEyebrow', {}, null)}</div>
          <h1>${this.store.getText('menu.brandTitle', {}, null)}</h1>
          ${!adminRoute ? this.renderEnglishSupport('menu.brandTitle', {}, activeProfile, 'english-copy hero-english-copy') : ''}
          <p class='hero-copy'>${adminRoute
            ? this.store.getText('auth.adminIntro', {}, null)
            : this.store.getText('menu.brandCopy', { name: activeProfile?.name || 'learner' }, activeProfile)}</p>
          ${!adminRoute ? this.renderEnglishSupport('menu.brandCopy', { name: activeProfile?.name || 'learner' }, activeProfile, 'english-copy hero-english-copy') : ''}
        </div>
        <div class='menu-side'>
          ${navigation}
          <div class='profile-bar'>
            <div>
              <div class='profile-label'>${roleLabel}</div>
              <div class='profile-name'>${profileName}</div>
            </div>
            ${actionButton}
          </div>
          ${this.renderThemePicker()}
        </div>
      </header>
    `;
  }

  renderBanner() {
    if (!this.banner.text) return '';

    return `
      <section class='banner-card card ${this.banner.tone === 'success' ? 'is-success' : this.banner.tone === 'error' ? 'is-error' : ''}'>
        <div class='message'>${this.banner.text}</div>
      </section>
    `;
  }

  renderAuthLauncher() {
    if (this.store.hasActiveProfile()) return '';

    return `
      <article class='card auth-entry-card'>
        <div class='activity-badge'>Start Here</div>
        <h2 class='section-title'>Login to keep your progress</h2>
        <div class='auth-link-row'>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='login' data-message='Login to keep your progress.'>Login</button>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='register'>Register</button>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='guest'>Continue as Guest</button>
        </div>
      </article>
    `;
  }

  renderAuthModal() {
    if (!this.authModal) return '';

    const mode = this.authModal.mode || 'login';
    const redirectView = this.escapeAttribute(this.authModal.redirectView || '');
    const profiles = this.store.getProfiles();
    const guestProfile = this.store.getGuestProfile();
    const note = this.authModal.message
      ? `<div class='hint-box auth-modal-note'>${this.authModal.message}</div>`
      : '';

    let badge = 'Login';
    let title = this.store.getText('auth.loginTitle', {}, null);
    let intro = this.store.getText('auth.loginIntro', {}, null);
    let content = profiles.length
      ? `
          <form class='auth-form' data-action='login-form'>
            <label>
              <span class='field-label'>Learner</span>
              <select class='selector' name='profileId' required>
                ${profiles.map((profile) => `
                  <option value='${profile.id}'>${profile.name}${profile.email ? ` - ${profile.email}` : ''}</option>
                `).join('')}
              </select>
            </label>
            <label>
              <span class='field-label'>PIN</span>
              <input class='field-input' name='pin' type='password' placeholder='Enter learner PIN' required />
            </label>
            <button class='primary-btn' type='submit'>Log In</button>
          </form>
        `
      : `<div class='message-box'><div class='message'>No learner accounts have been created on this device yet.</div></div>`;

    if (mode === 'register') {
      badge = 'Register';
      title = this.store.getText('auth.registerTitle', {}, null);
      intro = this.store.getText('auth.registerIntro', {}, null);
      content = `
        <form class='auth-form' data-action='register-form'>
          <label>
            <span class='field-label'>Learner name</span>
            <input class='field-input' name='name' type='text' placeholder='Example: Meron' required />
          </label>
          <label>
            <span class='field-label'>M/F</span>
            <select class='selector' name='sex' required>
              <option value=''>Choose one</option>
              <option value='female'>Female</option>
              <option value='male'>Male</option>
            </select>
          </label>
          <label>
            <span class='field-label'>Simple PIN</span>
            <input class='field-input' name='pin' type='password' placeholder='4 digits or letters' required />
          </label>
          <button class='primary-btn' type='submit'>Create Account</button>
        </form>
      `;
    }

    if (mode === 'guest') {
      badge = 'Guest';
      title = this.store.getText('auth.guestTitle', {}, guestProfile);
      intro = this.store.getText('auth.guestIntro', {}, guestProfile);
      content = `
        ${guestProfile
          ? `<div class='hint-box'>${this.store.getText('auth.guestResumeNote', { name: guestProfile.name }, guestProfile)}</div>`
          : ''}
        <form class='auth-form' data-action='guest-form'>
          <label>
            <span class='field-label'>Local learner name</span>
            <input class='field-input' name='name' type='text' value='${this.escapeAttribute(guestProfile?.name || '')}' placeholder='Example: Meron' required />
          </label>
          <label>
            <span class='field-label'>M/F</span>
            <select class='selector' name='sex' required>
              <option value=''>Choose one</option>
              <option value='female' ${guestProfile?.sex === 'female' ? 'selected' : ''}>Female</option>
              <option value='male' ${guestProfile?.sex === 'male' ? 'selected' : ''}>Male</option>
            </select>
          </label>
          <button class='primary-btn' type='submit'>${guestProfile ? 'Continue as Guest' : 'Start Guest Session'}</button>
        </form>
      `;
    }

    return `
      <div class='auth-modal-layer'>
        <button class='modal-backdrop' type='button' data-action='close-auth-modal' aria-label='Close authentication dialog'></button>
        <section class='auth-modal-shell' role='dialog' aria-modal='true' aria-labelledby='auth-modal-title'>
          <article class='card auth-modal-card'>
            <button class='modal-close' type='button' data-action='close-auth-modal' aria-label='Close authentication dialog'>&times;</button>
            <div class='activity-badge'>${badge}</div>
            <h2 class='section-title' id='auth-modal-title'>${title}</h2>
            ${note}
            <p class='panel-copy'>${intro}</p>
            ${content}
            <div class='auth-switch-row'>
              <button class='chip-btn ${mode === 'login' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='login' data-redirect-view='${redirectView}'>Login</button>
              <button class='chip-btn ${mode === 'register' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='register' data-redirect-view='${redirectView}'>Register</button>
              <button class='chip-btn ${mode === 'guest' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='guest' data-redirect-view='${redirectView}'>Continue as Guest</button>
            </div>
          </article>
        </section>
      </div>
    `;
  }

  renderAdminAuthGate() {
    const hasAdminAccount = this.store.hasAdminAccount();

    return `
      <section class='auth-grid admin-auth-grid'>
        <article class='card auth-card'>
          <div class='activity-badge'>Admin</div>
          <h2 class='section-title'>${hasAdminAccount
            ? this.store.getText('auth.adminLoginTitle', {}, null)
            : this.store.getText('auth.adminSetupTitle', {}, null)}</h2>
          <p class='panel-copy'>${this.store.getText('auth.adminIntro', {}, null)}</p>
          ${hasAdminAccount
            ? `
              <form class='auth-form' data-action='admin-login-form'>
                <label>
                  <span class='field-label'>Administrator PIN</span>
                  <input class='field-input' name='pin' type='password' placeholder='Enter administrator PIN' required />
                </label>
                <button class='primary-btn' type='submit'>Open Admin</button>
              </form>
            `
            : `
              <form class='auth-form' data-action='admin-setup-form'>
                <label>
                  <span class='field-label'>Create administrator PIN</span>
                  <input class='field-input' name='pin' type='password' placeholder='At least 4 characters' required />
                </label>
                <button class='primary-btn' type='submit'>Create Admin Access</button>
              </form>
            `}
          <div class='activity-actions'>
            <button class='ghost-btn' type='button' data-action='go-to-learner'>Open Learner Page</button>
          </div>
        </article>
      </section>
    `;
  }

  renderHome() {
    const activeProfile = this.store.getActiveProfile();
    const { challenge } = this.store.getProgress();
    const summaries = VARIANT_NAMES.map((_, index) => this.store.getVariantSummary(index, this.audio.audioMap));
    const learnedTotal = summaries.reduce((total, item) => total + item.learnedCount, 0);
    const dragdropCompleted = this.store.getDragDropProgress(1).length + this.store.getDragDropProgress(2).length;
    const welcomeTitle = activeProfile
      ? this.store.getText('home.welcomeTitle', { name: activeProfile.name }, activeProfile)
      : '';
    const welcomeBody = activeProfile
      ? this.store.getText('home.welcomeBody', { name: activeProfile.name }, activeProfile)
      : '';
    const snapshotSummary = activeProfile
      ? this.store.getText('home.snapshotSummary', {
          learnerType: this.getLearnerTypeLabel(activeProfile),
          variantName: VARIANT_NAMES[challenge.variantIndex],
          part: challenge.part
        }, activeProfile)
      : '';

    return `
      <section class='home-grid'>
        <div class='home-main'>
          ${this.renderAuthLauncher()}
          <article class='card welcome-card'>
            <div class='activity-badge'>${this.store.getText('home.pageBadge', {}, activeProfile)}</div>
            ${welcomeTitle ? `<h2 class='section-title'>${welcomeTitle}</h2>` : ''}
            ${welcomeTitle ? this.renderEnglishSupport('home.welcomeTitle', { name: activeProfile?.name || 'learner' }, activeProfile) : ''}
            ${welcomeBody ? `<p class='panel-copy'>${welcomeBody}</p>` : ''}
            ${welcomeBody ? this.renderEnglishSupport('home.welcomeBody', { name: activeProfile?.name || 'learner' }, activeProfile) : ''}
            <div class='activity-stack'>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.explorerTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.explorerTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.explorerCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.explorerCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='explorer'>Open Learn</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.dragdropTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.dragdropTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.dragdropCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.dragdropCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='dragdrop'>Open Test 1</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.challengeTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.challengeTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.challengeCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.challengeCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='challenge'>Open Test 2</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.additionalTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.additionalTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.additionalCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.additionalCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='additionalLetters'>${this.store.getText('home.additionalButtonLabel', {}, null)}</button>
                </div>
              </article>
            </div>
          </article>
        </div>

        <aside class='home-side'>
          <article class='card side-card'>
            <h2 class='section-title'>${this.store.getText('home.snapshotTitle', {}, activeProfile)}</h2>
            ${this.renderEnglishSupport('home.snapshotTitle', {}, activeProfile)}
            <div class='metrics two-up'>
              <div class='metric'>
                <div class='metric-value'>${learnedTotal}</div>
                <div class='metric-label'>Letters learned</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${this.store.getAccuracy()}%</div>
                <div class='metric-label'>Challenge accuracy</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${dragdropCompleted}</div>
                <div class='metric-label'>Drag & drop rows solved</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${this.store.getUnlockedCount()}/${VARIANT_NAMES.length}</div>
                <div class='metric-label'>Unlocked variants</div>
              </div>
            </div>
            ${snapshotSummary ? `<p class='panel-copy'>${snapshotSummary}</p>` : ''}
            ${snapshotSummary ? this.renderEnglishSupport('home.snapshotSummary', {
              learnerType: this.getLearnerTypeLabel(activeProfile),
              variantName: VARIANT_NAMES[challenge.variantIndex],
              part: challenge.part
            }, activeProfile) : ''}
          </article>

          <article class='card roadmap-card'>
            <h2 class='section-title'>${this.store.getText('home.progressTitle', {}, activeProfile)}</h2>
            ${this.renderEnglishSupport('home.progressTitle', {}, activeProfile)}
            <div class='roadmap-stack'>
              ${summaries.map((summary) => `
                <div class='variant-summary ${summary.complete ? 'is-complete' : ''} ${summary.unlocked ? '' : 'is-locked'}'>
                  <div>
                    <strong>${summary.name}</strong>
                    <div class='roadmap-text'>${summary.learnedCount}/${summary.symbolCount} learned</div>
                  </div>
                  <div class='variant-meta'>${summary.complete ? 'Complete' : summary.unlocked ? 'Open' : 'Locked'}</div>
                </div>
              `).join('')}
            </div>
          </article>
        </aside>
      </section>
    `;
  }

  renderAdminTabs() {
    const tabs = [
      ['copy', 'Page Text'],
      ['users', 'Learners'],
      ['security', 'Security']
    ];

    return `
      <div class='admin-tabs'>
        ${tabs.map(([tab, label]) => `
          <button class='chip-btn ${this.adminTab === tab ? 'is-active' : ''}' type='button' data-action='admin-tab' data-tab='${tab}'>${label}</button>
        `).join('')}
      </div>
    `;
  }

  renderAdminCopyField(field, values) {
    const value = values[field.key] || { default: '', female: '', male: '' };

    if (!field.gendered) {
      return `
        <div class='admin-section'>
          <h3 class='activity-title'>${field.label}</h3>
          <p class='panel-copy'>${field.help}</p>
          <label class='admin-field'>
            <span class='field-label'>Text</span>
            <textarea class='field-input textarea-field' name='${field.key}:default' rows='4'>${this.escapeTextarea(value.default)}</textarea>
          </label>
        </div>
      `;
    }

    return `
      <div class='admin-section'>
        <h3 class='activity-title'>${field.label}</h3>
        <p class='panel-copy'>${field.help}</p>
        <div class='admin-copy-grid'>
          <label class='admin-field'>
            <span class='field-label'>Default wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:default' rows='4'>${this.escapeTextarea(value.default)}</textarea>
          </label>
          <label class='admin-field'>
            <span class='field-label'>Female wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:female' rows='4'>${this.escapeTextarea(value.female)}</textarea>
          </label>
          <label class='admin-field'>
            <span class='field-label'>Male wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:male' rows='4'>${this.escapeTextarea(value.male)}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  renderAdminCopyPanel() {
    const copy = this.store.getCopyState();

    return `
      <article class='card panel-card admin-panel'>
        <div class='hint-box'>${this.store.getText('admin.copyHint', {}, null)}</div>
        <form class='auth-form' data-action='admin-copy-form'>
          ${this.store.getCopySections().map((section) => `
            <section class='workspace'>
              <div>
                <div class='activity-badge'>${section.title}</div>
                <p class='panel-copy'>${section.description}</p>
              </div>
              <div class='admin-user-list'>
                ${section.fields.map((field) => this.renderAdminCopyField(field, copy)).join('')}
              </div>
            </section>
          `).join('')}
          <div class='activity-actions'>
            <button class='primary-btn' type='submit'>Save Text Changes</button>
            <button class='ghost-btn' type='button' data-action='admin-reset-copy'>Restore Default Text</button>
          </div>
        </form>
      </article>
    `;
  }

  renderAdminUsersPanel() {
    const profiles = this.store.getProfiles();
    const femaleCount = profiles.filter((profile) => profile.sex === 'female').length;
    const maleCount = profiles.filter((profile) => profile.sex === 'male').length;

    return `
      <article class='card panel-card admin-panel'>
        <div class='stat-strip'>
          <div class='stat-pill'><strong>${profiles.length}</strong>Learners</div>
          <div class='stat-pill'><strong>${femaleCount}</strong>Female profiles</div>
          <div class='stat-pill'><strong>${maleCount}</strong>Male profiles</div>
          <div class='stat-pill'><strong>${this.store.hasAdminAccount() ? 'Ready' : 'Not set'}</strong>Admin access</div>
        </div>
        ${profiles.length
          ? `
            <div class='admin-user-list'>
              ${profiles.map((profile) => `
                <form class='admin-user-card admin-section' data-action='admin-profile-form' data-profile-id='${profile.id}'>
                  <div>
                    <h3 class='activity-title'>${profile.name}</h3>
                    <div class='admin-meta'>${this.getLearnerTypeLabel(profile)}. ${profile.email || 'No email saved yet.'} Created ${this.formatTimestamp(profile.createdAt)}. Last login ${this.formatTimestamp(profile.lastLoginAt)}.</div>
                  </div>
                  <div class='admin-copy-grid'>
                    <label class='admin-field'>
                      <span class='field-label'>Learner name</span>
                      <input class='field-input' name='name' type='text' value="${this.escapeAttribute(profile.name)}" required />
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>Email</span>
                      <input class='field-input' name='email' type='email' value="${this.escapeAttribute(profile.email || '')}" />
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>M/F</span>
                      <select class='selector' name='sex' required>
                        <option value='female' ${profile.sex === 'female' ? 'selected' : ''}>Female</option>
                        <option value='male' ${profile.sex === 'male' ? 'selected' : ''}>Male</option>
                      </select>
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>PIN</span>
                      <input class='field-input' name='pin' type='password' value="${this.escapeAttribute(profile.pin)}" required />
                    </label>
                  </div>
                  <div class='activity-actions'>
                    <button class='primary-btn' type='submit'>Save Learner</button>
                    <button class='ghost-btn' type='button' data-action='admin-reset-profile' data-profile-id='${profile.id}'>Reset Progress</button>
                    <button class='secondary-btn' type='button' data-action='admin-delete-profile' data-profile-id='${profile.id}'>Delete Learner</button>
                  </div>
                </form>
              `).join('')}
            </div>
          `
          : `
            <div class='message-box'>
              <div class='message'>No learner accounts have been created on this device yet.</div>
            </div>
          `}
      </article>
    `;
  }

  renderAdminSecurityPanel() {
    const admin = this.store.getAdminState();

    return `
      <article class='card panel-card admin-panel'>
        <div class='hint-box'>${this.store.getText('admin.securityHint', {}, null)}</div>
        <div class='admin-user-list'>
          <section class='admin-section'>
            <div class='activity-badge'>Security</div>
            <h3 class='activity-title'>Change administrator PIN</h3>
            <p class='panel-copy'>Update the local PIN used to open the admin controls.</p>
            <form class='auth-form' data-action='admin-pin-form'>
              <label>
                <span class='field-label'>New administrator PIN</span>
                <input class='field-input' name='pin' type='password' placeholder='At least 4 characters' required />
              </label>
              <button class='primary-btn' type='submit'>Save New PIN</button>
            </form>
          </section>

          <section class='admin-section'>
            <div class='activity-badge'>Status</div>
            <h3 class='activity-title'>Administrator session</h3>
            <p class='panel-copy'>Last admin sign-in: ${this.formatTimestamp(admin.lastLoginAt)}.</p>
            <div class='activity-actions'>
              <button class='ghost-btn' type='button' data-action='admin-logout'>Log Out Admin</button>
            </div>
          </section>
        </div>
      </article>
    `;
  }

  renderAdminView() {
    let panel = this.renderAdminCopyPanel();
    if (this.adminTab === 'users') panel = this.renderAdminUsersPanel();
    if (this.adminTab === 'security') panel = this.renderAdminSecurityPanel();

    return `
      <section class='workspace'>
        <div class='workspace-top'>
          <div>
            <h2 class='view-title'>${this.store.getText('admin.title', {}, null)}</h2>
            <p class='panel-copy'>${this.store.getText('admin.intro', {}, null)}</p>
          </div>
        </div>
        ${this.renderAdminTabs()}
        ${panel}
      </section>
    `;
  }

  renderActiveLearnerView() {
    const activeProfile = this.store.getActiveProfile();
    const activeView = activeProfile ? this.store.getProgress().activeView : 'home';
    if (activeView === 'explorer' && activeProfile) return this.explorer.render();
    if (activeView === 'dragdrop' && activeProfile) return this.dragdrop.render();
    if (activeView === 'challenge' && activeProfile) return this.challenge.render(this.audioReady);
    if (activeView === 'additionalLetters' && activeProfile) return this.additionalLetters.render();
    return this.renderHome();
  }

  renderMainContent() {
    if (this.route === 'admin') {
      return this.store.isAdminAuthenticated() ? this.renderAdminView() : this.renderAdminAuthGate();
    }

    return this.renderActiveLearnerView();
  }

  render() {
    this.updateDocumentTitle();
    this.applyTheme();
    this.root.innerHTML = `
      <div class='app-frame'>
        <div class='studio-shell'>
          ${this.renderMenu()}
          ${this.renderBanner()}
          ${this.renderMainContent()}
        </div>
      </div>
      ${this.renderAuthModal()}
    `;
  }
}

const app = new FidelatApp(document.getElementById('app'));
app.init();

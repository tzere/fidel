import { VARIANT_NAMES } from './src/data/fidelat-data.js';
import { ProgressStore } from './src/core/progress-store.js';
import { AlphabetExplorerFeature } from './src/features/alphabet-explorer.js';
import { DragDropFeature } from './src/features/drag-drop.js';
import { ListenMatchFeature } from './src/features/listen-match.js';
import { AudioService } from './src/services/audio-service.js';
import { StorageService } from './src/services/storage-service.js';
import { THEME_OPTIONS, getThemeOption } from './src/services/theme-service.js';

class FidelatApp {
  constructor(root) {
    this.root = root;
    this.route = this.isAdminRoute() ? 'admin' : 'learner';
    this.storage = new StorageService();
    this.store = new ProgressStore(this.storage);
    this.audio = new AudioService();
    this.explorer = new AlphabetExplorerFeature(this.store, this.audio);
    this.dragdrop = new DragDropFeature(this.store, this.audio);
    this.challenge = new ListenMatchFeature(this.store, this.audio);
    this.audioReady = false;
    this.adminTab = 'copy';
    this.banner = {
      tone: 'info',
      text: 'Loading your learning studio.'
    };
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
          : 'Sounds loaded. Create an account, log in, or continue locally to begin.');
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
  }

  getLearnerTypeLabel(profile) {
    return this.store.getText('labels.learnerType', {}, profile);
  }

  getCurrentViewTitle() {
    const activeProfile = this.route === 'admin' ? null : this.store.getActiveProfile();
    if (this.route === 'admin') return this.store.getText('admin.title', {}, null);
    if (!activeProfile) return this.store.getText('menu.brandTitle', {}, null);

    const activeView = this.store.getProgress().activeView;
    if (activeView === 'explorer') return this.store.getText('explorer.title', {}, activeProfile);
    if (activeView === 'dragdrop') return this.store.getText('dragdrop.title', {}, activeProfile);
    if (activeView === 'challenge') return this.store.getText('challenge.title', {}, activeProfile);
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
      this.setBanner('error', 'Create an account, log in, or continue locally before opening learner activities.');
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
        this.setBanner('success', this.store.getText('system.profileCreated', { name: profile.name }, profile));
        return;
      }

      if (action === 'login-form') {
        this.store.loginProfile(data.get('profileId'), data.get('pin'));
        const profile = this.store.getActiveProfile();
        this.setBanner('success', this.store.getText('system.loginRestored', { name: profile.name }, profile));
        return;
      }

      if (action === 'guest-form') {
        this.store.continueAsGuest(data.get('name'), data.get('sex'));
        const profile = this.store.getActiveProfile();
        this.setBanner('success', this.store.getText('system.guestStarted', { name: profile.name }, profile));
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
    const slot = event.target.closest('[data-action="dragdrop-slot"]');
    if (!slot) return;
    event.preventDefault();
    const symbol = event.dataTransfer.getData('text/plain');
    if (!symbol) return;

    const result = await this.dragdrop.placeSymbol(symbol, Number(slot.dataset.slot));
    await this.handleDragDropResult(result);
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    try {
      if (action === 'navigate') {
        await this.openView(button.dataset.view, {
          autoStart: button.dataset.view === 'challenge'
        });
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
    document.body.dataset.theme = this.store.getTheme();
  }

  renderThemePicker() {
    const activeThemeId = this.store.getTheme();
    const activeTheme = getThemeOption(activeThemeId);

    return `
      <section class='theme-panel' aria-label='Frame themes'>
        <div class='theme-panel-head'>
          <div>
            <div class='profile-label'>Frame Theme</div>
            <div class='theme-title'>Choose a frame style</div>
          </div>
          <div class='theme-preview' aria-hidden='true'></div>
        </div>
        <label class='theme-select-wrap'>
          <span class='field-label'>Theme options</span>
          <select class='selector theme-select' data-action='theme-select' aria-label='Choose frame theme'>
            ${THEME_OPTIONS.map((theme) => `
              <option value='${theme.id}' ${theme.id === activeThemeId ? 'selected' : ''}>${theme.label}</option>
            `).join('')}
          </select>
        </label>
        <p class='theme-note'>Current frame: ${activeTheme.label}. The frame stays just outside the app and adapts to phone, tablet, and desktop screens.</p>
      </section>
    `;
  }

  renderMenu() {
    const adminRoute = this.route === 'admin';
    const adminActive = adminRoute && this.store.isAdminAuthenticated();
    const activeProfile = adminRoute ? null : this.store.getActiveProfile();
    const items = [
      ['home', 'Home'],
      ['explorer', 'Learn'],
      ['dragdrop', 'Drag & Drop'],
      ['challenge', 'Test']
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
          ${activeProfile ? items.map(([view, label]) => `
            <button class='menu-btn ${this.store.getProgress().activeView === view ? 'is-active' : ''}' type='button' data-action='navigate' data-view='${view}'>${label}</button>
          `).join('') : ''}
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
        ? this.store.isGuestProfile(activeProfile) ? `${activeProfile.name} (Local)` : activeProfile.name
        : 'Choose a learner path';

    const actionButton = adminRoute
      ? adminActive ? `<button class='ghost-btn' type='button' data-action='admin-logout'>Log out admin</button>` : ''
      : activeProfile
        ? `<button class='ghost-btn' type='button' data-action='logout'>${this.store.isGuestProfile(activeProfile) ? 'Leave Local Session' : 'Log Out'}</button>`
        : '';

    return `
      <header class='top-shell card'>
        <div class='brand-block'>
          <div class='eyebrow'>${this.store.getText('menu.brandEyebrow', {}, null)}</div>
          <h1>${this.store.getText('menu.brandTitle', {}, null)}</h1>
          <p class='hero-copy'>${adminRoute
            ? this.store.getText('auth.adminIntro', {}, null)
            : this.store.getText('menu.brandCopy', { name: activeProfile?.name || 'learner' }, activeProfile)}</p>
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
    return `
      <section class='banner-card card ${this.banner.tone === 'success' ? 'is-success' : this.banner.tone === 'error' ? 'is-error' : ''}'>
        <div class='message'>${this.banner.text}</div>
      </section>
    `;
  }

  renderLearnerAuthGate() {
    const profiles = this.store.getProfiles();
    const guestProfile = this.store.getGuestProfile();

    return `
      <section class='auth-grid'>
        <article class='card auth-card'>
          <div class='activity-badge'>Account</div>
          <h2 class='section-title'>${this.store.getText('auth.registerTitle', {}, null)}</h2>
          <p class='panel-copy'>${this.store.getText('auth.registerIntro', {}, null)}</p>
          <form class='auth-form' data-action='register-form'>
            <label>
              <span class='field-label'>Learner name</span>
              <input class='field-input' name='name' type='text' placeholder='Example: Meron' required />
            </label>
            <label>
              <span class='field-label'>Email</span>
              <input class='field-input' name='email' type='email' placeholder='meron@example.com' required />
            </label>
            <label>
              <span class='field-label'>Sex</span>
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
        </article>

        <article class='card auth-card'>
          <div class='activity-badge'>Log In</div>
          <h2 class='section-title'>${this.store.getText('auth.loginTitle', {}, null)}</h2>
          <p class='panel-copy'>${this.store.getText('auth.loginIntro', {}, null)}</p>
          ${profiles.length
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
                <button class='secondary-btn' type='submit'>Log In</button>
              </form>
            `
            : `<p class='panel-copy'>No learner accounts have been created on this device yet.</p>`}
        </article>

        <article class='card auth-card'>
          <div class='activity-badge'>Local</div>
          <h2 class='section-title'>${this.store.getText('auth.guestTitle', {}, guestProfile)}</h2>
          <p class='panel-copy'>${this.store.getText('auth.guestIntro', {}, guestProfile)}</p>
          ${guestProfile
            ? `<div class='hint-box'>${this.store.getText('auth.guestResumeNote', { name: guestProfile.name }, guestProfile)}</div>`
            : ''}
          <form class='auth-form' data-action='guest-form'>
            <label>
              <span class='field-label'>Local learner name</span>
              <input class='field-input' name='name' type='text' value='${this.escapeAttribute(guestProfile?.name || '')}' placeholder='Example: Meron' required />
            </label>
            <label>
              <span class='field-label'>Sex</span>
              <select class='selector' name='sex' required>
                <option value=''>Choose one</option>
                <option value='female' ${guestProfile?.sex === 'female' ? 'selected' : ''}>Female</option>
                <option value='male' ${guestProfile?.sex === 'male' ? 'selected' : ''}>Male</option>
              </select>
            </label>
            <button class='ghost-btn' type='submit'>${guestProfile ? 'Continue Local Session' : 'Continue Without Account'}</button>
          </form>
        </article>
      </section>
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

    return `
      <section class='home-grid'>
        <div class='home-main'>
          <article class='card welcome-card'>
            <div class='activity-badge'>${this.store.getText('home.pageBadge', {}, activeProfile)}</div>
            <h2 class='section-title'>${this.store.getText('home.welcomeTitle', { name: activeProfile?.name || 'learner' }, activeProfile)}</h2>
            <p class='panel-copy'>${this.store.getText('home.welcomeBody', { name: activeProfile?.name || 'learner' }, activeProfile)}</p>
            <div class='activity-stack'>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.explorerTitle', {}, activeProfile)}</h3>
                <p class='activity-copy'>${this.store.getText('home.explorerCopy', {}, activeProfile)}</p>
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='explorer'>Open Explorer</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.dragdropTitle', {}, activeProfile)}</h3>
                <p class='activity-copy'>${this.store.getText('home.dragdropCopy', {}, activeProfile)}</p>
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='dragdrop'>Open Drag & Drop</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.challengeTitle', {}, activeProfile)}</h3>
                <p class='activity-copy'>${this.store.getText('home.challengeCopy', {}, activeProfile)}</p>
                <div class='activity-actions'>
                  <button class='secondary-btn' type='button' data-action='navigate' data-view='challenge'>Continue Challenge</button>
                </div>
              </article>
            </div>
          </article>
        </div>

        <aside class='home-side'>
          <article class='card side-card'>
            <h2 class='section-title'>${this.store.getText('home.snapshotTitle', {}, activeProfile)}</h2>
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
            <p class='panel-copy'>${this.store.getText('home.snapshotSummary', {
              learnerType: this.getLearnerTypeLabel(activeProfile),
              variantName: VARIANT_NAMES[challenge.variantIndex],
              part: challenge.part
            }, activeProfile)}</p>
          </article>

          <article class='card roadmap-card'>
            <h2 class='section-title'>${this.store.getText('home.progressTitle', {}, activeProfile)}</h2>
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
                      <input class='field-input' name='email' type='email' value="${this.escapeAttribute(profile.email || '')}" required />
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>Sex</span>
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
    const activeView = this.store.getProgress().activeView;
    if (activeView === 'explorer') return this.explorer.render();
    if (activeView === 'dragdrop') return this.dragdrop.render();
    if (activeView === 'challenge') return this.challenge.render(this.audioReady);
    return this.renderHome();
  }

  renderMainContent() {
    if (this.route === 'admin') {
      return this.store.isAdminAuthenticated() ? this.renderAdminView() : this.renderAdminAuthGate();
    }

    return this.store.hasActiveProfile() ? this.renderActiveLearnerView() : this.renderLearnerAuthGate();
  }

  render() {
    this.updateDocumentTitle();
    this.applyTheme();
    this.root.innerHTML = `
      <div class='studio-shell'>
        ${this.renderMenu()}
        ${this.renderBanner()}
        ${this.renderMainContent()}
      </div>
    `;
  }
}

const app = new FidelatApp(document.getElementById('app'));
app.init();

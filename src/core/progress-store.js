import {
  countPlayableSymbols,
  createEmptyMastery,
  getHighestUnlockedVariant,
  getSymbolsForVariant,
  isVariantComplete,
  VARIANT_NAMES
} from '../data/fidelat-data.js';
import { COPY_SECTIONS } from '../services/content-service.js';
import { createDefaultProgressState } from '../services/storage-service.js';

function getMasteryEntry(mastery, variantIndex) {
  return mastery[variantIndex] || { part1: [], part2: [] };
}

function combineUnique(listA = [], listB = []) {
  return [...new Set([...(Array.isArray(listA) ? listA : []), ...(Array.isArray(listB) ? listB : [])])];
}

export class ProgressStore {
  constructor(storage) {
    this.storage = storage;
    this.state = storage.load();
  }

  getState() {
    return this.state;
  }

  getProgress() {
    return this.state.progress;
  }

  getProfiles() {
    return this.state.session.profiles;
  }

  hasGuestProfile() {
    return Boolean(this.state.session.guestProfile);
  }

  getGuestProfile() {
    return this.state.session.guestProfile || null;
  }

  getAdminState() {
    return this.state.admin;
  }

  getCopyState() {
    return this.state.admin.copy;
  }

  getCopySections() {
    return COPY_SECTIONS;
  }

  getTheme() {
    return this.state.session.themeId;
  }

  getActiveProfile() {
    return this.storage.getActiveProfile(this.state);
  }

  hasActiveProfile() {
    return Boolean(this.getActiveProfile());
  }

  isGuestProfile(profile = this.getActiveProfile()) {
    return Boolean(profile?.localOnly);
  }

  hasAdminAccount() {
    return Boolean(this.state.admin.pin);
  }

  isAdminAuthenticated() {
    return Boolean(this.state.admin.pin && this.state.admin.loggedIn);
  }

  getText(key, variables = {}, profile = this.getActiveProfile()) {
    return this.storage.getText(this.state, key, profile, variables);
  }

  registerProfile(name, email, pin, sex) {
    this.state = this.storage.registerProfile({ name, email, pin, sex }, this.state);
  }

  continueAsGuest(name, sex) {
    this.state = this.storage.continueAsGuest({ name, sex }, this.state);
  }

  loginProfile(profileId, pin) {
    this.state = this.storage.loginProfile({ profileId, pin }, this.state);
  }

  logoutProfile() {
    this.state = this.storage.logout(this.state);
  }

  setupAdmin(pin) {
    this.state = this.storage.setupAdmin({ pin }, this.state);
  }

  loginAdmin(pin) {
    this.state = this.storage.loginAdmin({ pin }, this.state);
  }

  logoutAdmin() {
    this.state = this.storage.logoutAdmin(this.state);
  }

  changeAdminPin(pin) {
    this.state = this.storage.changeAdminPin({ pin }, this.state);
  }

  updateAdminCopy(copyPatch) {
    this.state = this.storage.updateAdminCopy(copyPatch, this.state);
  }

  resetAdminCopy() {
    this.state = this.storage.resetAdminCopy(this.state);
  }

  updateProfileDetails(profileId, patch) {
    this.state = this.storage.updateProfile({ profileId, ...patch }, this.state);
  }

  deleteProfile(profileId) {
    this.state = this.storage.deleteProfile(profileId, this.state);
  }

  resetProfileProgress(profileId) {
    this.state = this.storage.resetProfileProgress(profileId, this.state);
  }

  save() {
    this.storage.save(this.state);
  }

  setTheme(themeId) {
    this.state = this.storage.updateTheme(themeId, this.state);
  }

  setActiveView(view) {
    this.state.progress.activeView = view;
    this.save();
  }

  updateExplorer(patch) {
    this.state.progress.explorer = {
      ...this.state.progress.explorer,
      ...patch
    };
    this.save();
  }

  updateDragDrop(patch) {
    this.state.progress.dragdrop = {
      ...this.state.progress.dragdrop,
      ...patch,
      completedRows: {
        ...this.state.progress.dragdrop.completedRows,
        ...(patch.completedRows || {})
      }
    };
    this.save();
  }

  updateChallenge(patch) {
    this.state.progress.challenge = {
      ...this.state.progress.challenge,
      ...patch
    };
    this.save();
  }

  clearChallengeCelebration() {
    this.state.progress.challenge = {
      ...this.state.progress.challenge,
      unlockReadyVariantIndex: null,
      courseCompleted: false,
      celebrationText: ''
    };
    this.save();
  }

  resetCurrentProfile() {
    const activeProfile = this.getActiveProfile();
    if (!activeProfile) {
      this.state.progress = createDefaultProgressState();
      return;
    }

    this.state.progress = this.storage.resetProgressForProfile(activeProfile.id);
    this.save();
  }

  getAccuracy() {
    const { score, rounds } = this.state.progress.challenge;
    if (!rounds) return 0;
    return Math.round((score / rounds) * 100);
  }

  getUnlockedCount() {
    return getHighestUnlockedVariant(this.state.progress.challenge.mastery) + 1;
  }

  isVariantUnlocked(variantIndex) {
    return variantIndex <= getHighestUnlockedVariant(this.state.progress.challenge.mastery);
  }

  isVariantCompleteByIndex(variantIndex) {
    return isVariantComplete(this.state.progress.challenge.mastery, variantIndex);
  }

  getVariantSummary(variantIndex, audioMap) {
    const mastery = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    const symbols = [
      ...getSymbolsForVariant(variantIndex, 1),
      ...getSymbolsForVariant(variantIndex, 2)
    ];
    const learnedCount = mastery.part1.length + mastery.part2.length;
    return {
      name: VARIANT_NAMES[variantIndex],
      symbolCount: symbols.length,
      learnedCount,
      playableCount: countPlayableSymbols(symbols, audioMap),
      complete: this.isVariantCompleteByIndex(variantIndex),
      unlocked: this.isVariantUnlocked(variantIndex)
    };
  }

  getVariantSymbols(variantIndex, part) {
    return getSymbolsForVariant(variantIndex, part);
  }

  getExplorerProgress(variantIndex, part) {
    const key = part === 2 ? 'part2' : 'part1';
    const explorerEntry = getMasteryEntry(this.state.progress.explorer.mastery, variantIndex);
    const challengeEntry = getMasteryEntry(this.state.progress.challenge.mastery, variantIndex);
    return combineUnique(explorerEntry[key], challengeEntry[key]);
  }

  isExplorerPartComplete(variantIndex, part) {
    return this.getExplorerProgress(variantIndex, part).length >= this.getVariantSymbols(variantIndex, part).length;
  }

  markExplorerSymbolHeard(variantIndex, part, symbol) {
    const key = part === 2 ? 'part2' : 'part1';
    const variant = getMasteryEntry(this.state.progress.explorer.mastery, variantIndex);
    if (!variant[key].includes(symbol)) {
      const nextVariant = {
        ...variant,
        [key]: [...variant[key], symbol]
      };
      const mastery = [...this.state.progress.explorer.mastery];
      mastery[variantIndex] = nextVariant;
      this.state.progress.explorer = {
        ...this.state.progress.explorer,
        mastery
      };
      this.save();
    }
  }

  getPartProgress(variantIndex, part) {
    const mastery = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    return part === 1 ? mastery.part1 : mastery.part2;
  }

  markSymbolLearned(variantIndex, part, symbol) {
    const variant = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    const key = part === 1 ? 'part1' : 'part2';
    if (!variant[key].includes(symbol)) {
      variant[key] = [...variant[key], symbol];
      this.state.progress.challenge.mastery[variantIndex] = variant;
      this.save();
    }
  }

  getDragDropProgress(part) {
    const key = part === 2 ? 'part2' : 'part1';
    return this.state.progress.dragdrop.completedRows[key] || [];
  }

  markDragDropRowComplete(part, rowIndex) {
    const key = part === 2 ? 'part2' : 'part1';
    const rows = this.getDragDropProgress(part);
    if (!rows.includes(rowIndex)) {
      this.state.progress.dragdrop.completedRows[key] = [...rows, rowIndex];
      this.save();
    }
  }
}

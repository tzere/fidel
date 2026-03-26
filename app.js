const STORAGE_KEY = 'geez-fidelat-progress-v3';

const variantNames = ['ግእዝ', 'ካዕብ', 'ሣልስ', 'ራብዕ', 'ኀምስ', 'ሳድስ', 'ሳብዕ'];

const primaryRows = [
  ['ሀ','ሁ','ሂ','ሃ','ሄ','ህ','ሆ'],
  ['ለ','ሉ','ሊ','ላ','ሌ','ል','ሎ'],
  ['ሐ','ሑ','ሒ','ሓ','ሔ','ሕ','ሖ'],
  ['መ','ሙ','ሚ','ማ','ሜ','ም','ሞ'],
  ['ሰ','ሱ','ሲ','ሳ','ሴ','ስ','ሶ'],
  ['ረ','ሩ','ሪ','ራ','ሬ','ር','ሮ'],
  ['ሸ','ሹ','ሺ','ሻ','ሼ','ሽ','ሾ'],
  ['ቀ','ቁ','ቂ','ቃ','ቄ','ቅ','ቆ'],
  ['በ','ቡ','ቢ','ባ','ቤ','ብ','ቦ'],
  ['ተ','ቱ','ቲ','ታ','ቴ','ት','ቶ'],
  ['ነ','ኑ','ኒ','ና','ኔ','ን','ኖ'],
  ['አ','ኡ','ኢ','ኣ','ኤ','እ','ኦ'],
  ['ከ','ኩ','ኪ','ካ','ኬ','ክ','ኮ'],
  ['ጸ','ጹ','ጺ','ጻ','ጼ','ጽ','ጾ']
];

const secondaryRows = [
  ['ሠ','ሡ','ሢ','ሣ','ሤ','ሥ','ሦ'],
  ['ኀ','ኁ','ኂ','ኃ','ኄ','ኅ','ኆ'],
  ['ፀ','ፁ','ፂ','ፃ','ፄ','ፅ','ፆ'],
  ['ዘ','ዙ','ዚ','ዛ','ዜ','ዝ','ዞ'],
  ['ዠ','ዡ','ዢ','ዣ','ዤ','ዥ','ዦ'],
  ['የ','ዩ','ዪ','ያ','ዬ','ይ','ዮ'],
  ['ደ','ዱ','ዲ','ዳ','ዴ','ድ','ዶ'],
  ['ገ','ጉ','ጊ','ጋ','ጌ','ግ','ጎ'],
  ['ጠ','ጡ','ጢ','ጣ','ጤ','ጥ','ጦ'],
  ['ጨ','ጩ','ጪ','ጫ','ጬ','ጭ','ጮ'],
  ['ወ','ዉ','ዊ','ዋ','ዌ','ው','ዎ'],
  ['ዐ','ዑ','ዒ','ዓ','ዔ','ዕ','ዖ'],
  ['ፈ','ፉ','ፊ','ፋ','ፌ','ፍ','ፎ']
];

function makeEmptyMastery() {
  return variantNames.map(() => ({ part1: [], part2: [] }));
}

let currentVariant = 0;
let currentPart = 1;
let target = null;
let score = 0;
let rounds = 0;
let gameStarted = false;
let recordedAudio = {};
let mastery = makeEmptyMastery();
let currentAudio = null;
let celebration = null;

const introOverlay = document.getElementById('introOverlay');
const enterGameBtn = document.getElementById('enterGameBtn');
const continueBtn = document.getElementById('continueBtn');
const restartIntroBtn = document.getElementById('restartIntroBtn');

const scoreEl = document.getElementById('score');
const roundsEl = document.getElementById('rounds');
const accuracyEl = document.getElementById('accuracy');
const unlockedCountEl = document.getElementById('unlockedCount');
const messageEl = document.getElementById('message');
const helperNoteEl = document.getElementById('helperNote');
const variantGrid = document.getElementById('variantGrid');
const partGrid = document.getElementById('partGrid');
const letterGrid = document.getElementById('letterGrid');
const activeVariantNote = document.getElementById('activeVariantNote');
const symbolCountPill = document.getElementById('symbolCountPill');
const replayBtn = document.getElementById('replayBtn');
const resetBtn = document.getElementById('resetBtn');

const soundReveal = document.getElementById('soundReveal');
const soundRevealText = document.getElementById('soundRevealText');
const soundDots = document.getElementById('soundDots');
const partFinishedBanner = document.getElementById('partFinishedBanner');
const messageBox = document.getElementById('messageBox');

const celebrationOverlay = document.getElementById('celebrationOverlay');
const celebrationBadge = document.getElementById('celebrationBadge');
const celebrationTitle = document.getElementById('celebrationTitle');
const celebrationText = document.getElementById('celebrationText');
const celebrationContinueBtn = document.getElementById('celebrationContinueBtn');
const celebrationNextBtn = document.getElementById('celebrationNextBtn');
const starsLayer = document.getElementById('starsLayer');

function getSymbolsFor(variantIndex, part) {
  const rows = part === 1 ? primaryRows : secondaryRows;
  return rows.map((row) => row[variantIndex]).filter(Boolean);
}

function getMasteryFor(variantIndex, part) {
  return part === 1 ? mastery[variantIndex].part1 : mastery[variantIndex].part2;
}

function visibleLetters() {
  return getSymbolsFor(currentVariant, currentPart);
}

function activeMastery() {
  return getMasteryFor(currentVariant, currentPart);
}

function activePlayable() {
  return visibleLetters().filter((symbol) => typeof recordedAudio[symbol] === 'string' && recordedAudio[symbol].trim());
}

function isVariantComplete(variantIndex) {
  return (
    mastery[variantIndex].part1.length === getSymbolsFor(variantIndex, 1).length &&
    mastery[variantIndex].part2.length === getSymbolsFor(variantIndex, 2).length
  );
}

function getHighestUnlockedVariant() {
  let highest = 0;
  for (let i = 0; i < variantNames.length - 1; i += 1) {
    if (isVariantComplete(i)) highest = i + 1;
    else break;
  }
  return highest;
}

function getVisibleVariantIndexes() {
  const highestUnlocked = getHighestUnlockedVariant();
  const list = [];
  for (let i = 0; i <= highestUnlocked; i += 1) list.push(i);
  return list;
}

function hasSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return !!JSON.parse(raw);
  } catch {
    return false;
  }
}

function updateContinueButton() {
  continueBtn.style.display = hasSavedProgress() ? 'inline-flex' : 'none';
}

function updateStats() {
  scoreEl.textContent = score;
  roundsEl.textContent = rounds;
  const accuracy = rounds === 0 ? 0 : Math.round((score / rounds) * 100);
  accuracyEl.textContent = accuracy + '%';
  unlockedCountEl.textContent = (getHighestUnlockedVariant() + 1) + '/7';
}

function updateStageNote() {
  activeVariantNote.textContent =
    'Active stage: ' + variantNames[currentVariant] + ' — Part ' + currentPart +
    '. Mastered ' + activeMastery().length + ' of ' + visibleLetters().length + ' letters.';
  symbolCountPill.textContent = visibleLetters().length + ' letters';
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentVariant,
      currentPart,
      score,
      rounds,
      mastery
    }));
  } catch (e) {}
  updateContinueButton();
}

function setMessageTone(tone) {
  messageBox.className = 'message-box ' + tone;
}

function setRevealState(mode, label) {
  soundReveal.classList.remove('showing');
  soundDots.style.display = 'none';

  if (mode === 'showing') {
    soundReveal.classList.add('showing');
    soundDots.style.display = 'inline-flex';
  }

  soundRevealText.textContent = label;
}

function setReplayButtonState(mode) {
  replayBtn.classList.remove('ready', 'attention');

  if (mode === 'ready') replayBtn.classList.add('ready');
  if (mode === 'attention') replayBtn.classList.add('ready', 'attention');
}

function showPartFinishedBanner(text) {
  partFinishedBanner.style.display = 'block';
  partFinishedBanner.className = 'part-finished-banner';
  partFinishedBanner.textContent = text;
}

function hidePartFinishedBanner() {
  partFinishedBanner.style.display = 'none';
  partFinishedBanner.textContent = '';
}

function speakCelebration(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

function stopAudio() {
  if (!currentAudio) return;
  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } catch (e) {}
  currentAudio = null;
}

function playCorrectChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.24);
    });
  } catch (e) {}
}

function playSound(symbol) {
  if (!symbol) return;
  stopAudio();
  const path = recordedAudio[symbol];
  if (!path) {
    setMessageTone('error');
    messageEl.textContent = 'No sound was found for this letter.';
    helperNoteEl.textContent = 'This letter does not yet have an audio file.';
    return;
  }
  const audio = new Audio(path);
  currentAudio = audio;
  audio.play().catch(() => {
    setMessageTone('error');
    messageEl.textContent = 'Sound playback was blocked or the file path is not reachable.';
    helperNoteEl.textContent = 'Check browser audio permissions and the file path.';
  });
}

function launchStars() {
  starsLayer.innerHTML = '';
  const icons = ['⭐', '🌟', '✨', '🎉'];
  for (let i = 0; i < 18; i += 1) {
    const star = document.createElement('div');
    star.className = 'star-burst';
    star.textContent = icons[i % icons.length];
    star.style.left = (8 + Math.random() * 84) + '%';
    star.style.bottom = (10 + Math.random() * 12) + '%';
    star.style.animationDelay = (Math.random() * 0.22) + 's';
    star.style.fontSize = (1.2 + Math.random() * 1.2) + 'rem';
    starsLayer.appendChild(star);
  }

  const confettiColors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff8fab'];
  for (let i = 0; i < 24; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = (4 + Math.random() * 92) + '%';
    piece.style.top = (-10 - Math.random() * 25) + 'px';
    piece.style.background = confettiColors[i % confettiColors.length];
    piece.style.animationDelay = (Math.random() * 0.35) + 's';
    piece.style.transform = 'rotate(' + Math.round(Math.random() * 180) + 'deg)';
    starsLayer.appendChild(piece);
  }
}

function showCelebration(data) {
  celebration = data;
  celebrationBadge.textContent = data.badge;
  celebrationTitle.textContent = data.title;
  celebrationText.textContent = data.text;
  celebrationContinueBtn.textContent = data.continueLabel;

  celebrationNextBtn.style.display = 'none';

  setMessageTone('celebrate');
  setRevealState('idle', 'Celebration!');
  setReplayButtonState('ready');
  celebrationOverlay.style.display = 'flex';
  launchStars();
  speakCelebration(data.voiceText || data.title);
}

function hideCelebration() {
  celebration = null;
  celebrationOverlay.style.display = 'none';
  starsLayer.innerHTML = '';
}

function buildVariantButtons() {
  variantGrid.innerHTML = '';
  const visibleIndexes = getVisibleVariantIndexes();

  visibleIndexes.forEach((variantIndex) => {
    const btn = document.createElement('button');
    btn.className = 'variant-btn';
    if (variantIndex === currentVariant) btn.classList.add('active');
    if (isVariantComplete(variantIndex)) btn.classList.add('complete');
    btn.type = 'button';
    btn.textContent = variantNames[variantIndex];
    btn.addEventListener('click', () => {
      currentVariant = variantIndex;
      currentPart = 1;
      gameStarted = false;
      target = null;
      render();
      messageEl.textContent = 'Opened ' + variantNames[variantIndex] + '.';
      helperNoteEl.textContent = 'Reviewing ' + variantNames[variantIndex] + '. A sound will play now.';
      setTimeout(() => chooseAndPlayNext(currentVariant, currentPart), 80);
    });
    variantGrid.appendChild(btn);
  });
}

function buildPartButtons() {
  partGrid.innerHTML = '';

  const p1 = document.createElement('button');
  p1.className = 'part-btn' + (currentPart === 1 ? ' active' : '');
  p1.type = 'button';
  p1.textContent = 'Part 1';
  p1.addEventListener('click', () => {
    currentPart = 1;
    gameStarted = false;
    target = null;
    render();
    messageEl.textContent = 'Opened part 1.';
    helperNoteEl.textContent = 'A sound will play now.';
    setTimeout(() => chooseAndPlayNext(currentVariant, 1), 80);
  });

  const p2 = document.createElement('button');
  p2.className = 'part-btn' + (currentPart === 2 ? ' active' : '');
  p2.type = 'button';
  p2.textContent = 'Part 2';
  p2.addEventListener('click', () => {
    currentPart = 2;
    gameStarted = false;
    target = null;
    render();
    messageEl.textContent = 'Opened part 2.';
    helperNoteEl.textContent = 'A sound will play now.';
    setTimeout(() => chooseAndPlayNext(currentVariant, 2), 80);
  });

  partGrid.appendChild(p1);
  partGrid.appendChild(p2);
}

function buildLetterButtons() {
  letterGrid.innerHTML = '';
  visibleLetters().forEach((symbol) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.type = 'button';
    btn.textContent = symbol;
    btn.addEventListener('click', () => handleGuess(symbol, btn));
    letterGrid.appendChild(btn);
  });
}

function clearLetterStates() {
  document.querySelectorAll('.letter-btn').forEach((btn) => {
    btn.classList.remove('correct', 'wrong');
  });
}

function render() {
  buildVariantButtons();
  buildPartButtons();
  buildLetterButtons();
  updateStats();
  updateStageNote();
}

function chooseAndPlayNext(variantIndex = currentVariant, part = currentPart) {
  const letters = getSymbolsFor(variantIndex, part);
  const mastered = getMasteryFor(variantIndex, part);
  const pool = letters.filter((symbol) => typeof recordedAudio[symbol] === 'string' && recordedAudio[symbol].trim());

  if (!pool.length) {
    target = null;
    gameStarted = false;
    setMessageTone('error');
    setRevealState('idle', 'No sound');
    setReplayButtonState('ready');
    messageEl.textContent = 'This part has no playable sounds yet.';
    helperNoteEl.textContent = 'Add audio files for this part, then press Start / Hear Again.';
    return;
  }

  hidePartFinishedBanner();
  clearLetterStates();

  const remaining = pool.filter((symbol) => !mastered.includes(symbol));
  const candidates = remaining.length ? remaining : pool;
  target = candidates[Math.floor(Math.random() * candidates.length)];
  gameStarted = true;

  setMessageTone('info');
  setRevealState('showing', 'Showing sound...');
  setReplayButtonState('attention');
  messageEl.textContent = 'Listen carefully. A new sound is being played.';
  helperNoteEl.textContent = 'After listening, tap the matching letter.';

  setTimeout(() => {
    playSound(target);
    setRevealState('idle', 'Listen now');
    setReplayButtonState('ready');
    setMessageTone('info');
    messageEl.textContent = 'Now tap the matching letter.';
  }, 220);

  saveProgress();
}

async function loadSounds() {
  try {
    const response = await fetch('sounds.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load sounds.json');
    const data = await response.json();
    const resolvedMap = data.symbols && typeof data.symbols === 'object' ? data.symbols : data;
    const usableEntries = Object.entries(resolvedMap).filter(([, value]) => typeof value === 'string' && value.trim());
    recordedAudio = Object.fromEntries(usableEntries);

    if (!usableEntries.length) {
      setMessageTone('error');
      messageEl.textContent = 'sounds.json loaded, but it does not contain any usable sound paths yet.';
      helperNoteEl.textContent = 'Add entries like "ሀ": "audio/ሀ.mp3".';
      return false;
    }

    helperNoteEl.textContent = 'Sounds loaded! The first sound will play now.';
    return true;
  } catch (e) {
    recordedAudio = {};
    setMessageTone('error');
    messageEl.textContent = 'The page could not load sounds.json.';
    helperNoteEl.textContent = 'Keep sounds.json beside this HTML file and make sure it contains valid audio paths.';
    return false;
  }
}

function handleGuess(symbol, button) {
  if (!gameStarted || !target) {
    messageEl.textContent = 'Tap Start / Hear Again to begin.';
    return;
  }

  if (!activePlayable().includes(symbol)) {
    setMessageTone('error');
    messageEl.textContent = 'This letter does not have a recorded sound yet.';
    helperNoteEl.textContent = 'Use letters with audio in the open part, or add the missing sound file.';
    return;
  }

  rounds += 1;
  clearLetterStates();

  if (symbol === target) {
    score += 1;
    button.classList.add('correct');
    playCorrectChime();
    setMessageTone('success');
    setRevealState('idle', 'Correct!');

    const masteryList = getMasteryFor(currentVariant, currentPart);
    if (!masteryList.includes(symbol)) masteryList.push(symbol);

    updateStats();
    updateStageNote();
    saveProgress();

    const partComplete = masteryList.length === getSymbolsFor(currentVariant, currentPart).length;

    if (partComplete) {
      gameStarted = false;
      target = null;

      if (currentPart === 1) {
        showPartFinishedBanner('✅ Part 1 complete!');
        showCelebration({
          title: '🎉 Part 1 Complete! 🎉',
          text: 'Wonderful! You finished part 1 of ' + variantNames[currentVariant] + '. Now let us practice part 2.',
          badge: '🌟 Great Job! 🌟',
          continueLabel: 'Open Part 2',
          action: 'next-part',
          final: false,
          voiceText: 'Great job! Part one is complete.'
        });
        return;
      }

      const variantDone = isVariantComplete(currentVariant);
      if (variantDone && currentVariant < variantNames.length - 1) {
        showPartFinishedBanner('🌟 Variant complete!');
        showCelebration({
          title: '🎉 Variant Complete! 🎉',
          text: 'Wonderful! You mastered ' + variantNames[currentVariant] + '. ' + variantNames[currentVariant + 1] + ' is now unlocked.',
          badge: '🌟 New Variant! 🌟',
          continueLabel: 'Open ' + variantNames[currentVariant + 1],
          action: 'next-variant',
          final: false,
          voiceText: 'Wonderful! A new variant is unlocked.'
        });
        return;
      }

      if (variantDone && currentVariant === variantNames.length - 1) {
        showPartFinishedBanner('🏆 All variants complete!');
        showCelebration({
          title: '🏆 Amazing! You finished all variants! 🏆',
          text: 'You completed all seven Geez variants. Fantastic work!',
          badge: '🎊 Superstar! 🎊',
          continueLabel: 'Play Again',
          action: 'restart',
          final: true,
          voiceText: 'Amazing! You finished all variants!'
        });
        return;
      }
    }

    messageEl.textContent = 'Wonderful! Here comes the next sound.';
    setTimeout(() => {
      clearLetterStates();
      chooseAndPlayNext();
    }, 900);
  } else {
    button.classList.add('wrong');
    setMessageTone('error');
    setRevealState('idle', 'Try again');
    setReplayButtonState('attention');
    updateStats();
    updateStageNote();
    saveProgress();
    messageEl.textContent = 'Almost! Listen again and try once more.';
    helperNoteEl.textContent = 'You are still working in ' + variantNames[currentVariant] + ' — Part ' + currentPart + '.';
    setTimeout(() => playSound(target), 260);
  }
}

function handleReplay() {
  if (!activePlayable().length) {
    setMessageTone('error');
    setRevealState('idle', 'No sound');
    messageEl.textContent = 'This part has no playable sounds yet.';
    helperNoteEl.textContent = 'Check your audio files for the open part.';
    return;
  }

  if (!target || !gameStarted || !activePlayable().includes(target)) {
    chooseAndPlayNext();
    return;
  }

  setRevealState('showing', 'Playing again...');
  setReplayButtonState('attention');
  setMessageTone('info');

  setTimeout(() => {
    playSound(target);
    setRevealState('idle', 'Listen again');
    setReplayButtonState('ready');
    messageEl.textContent = 'Listen again, then tap the matching letter.';
  }, 120);
}

function confirmAndReset() {
  const ok = window.confirm('Delete saved progress on this device and start again from ግእዝ?');
  if (!ok) return;
  resetProgress();
}

function resetProgress() {
  score = 0;
  rounds = 0;
  target = null;
  gameStarted = false;
  currentVariant = 0;
  currentPart = 1;
  mastery = makeEmptyMastery();
  hideCelebration();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  render();
  setMessageTone('info');
  setRevealState('idle', 'Fresh start');
  setReplayButtonState('ready');
  hidePartFinishedBanner();
  messageEl.textContent = 'Fresh start ready. Tap Start / Hear Again to begin with ግእዝ.';
  helperNoteEl.textContent = 'Only ግእዝ is open now.';
  updateContinueButton();
}

function loadSavedProgressIntoState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed) return false;

    currentVariant = typeof parsed.currentVariant === 'number' ? parsed.currentVariant : 0;
    currentPart = parsed.currentPart === 2 ? 2 : 1;
    score = typeof parsed.score === 'number' ? parsed.score : 0;
    rounds = typeof parsed.rounds === 'number' ? parsed.rounds : 0;

    if (Array.isArray(parsed.mastery) && parsed.mastery.length === variantNames.length) {
      mastery = parsed.mastery.map((item) => ({
        part1: Array.isArray(item.part1) ? item.part1 : [],
        part2: Array.isArray(item.part2) ? item.part2 : []
      }));
    } else {
      mastery = makeEmptyMastery();
    }

    return true;
  } catch {
    return false;
  }
}

function handleCelebrationContinue() {
  const action = celebration && celebration.action;
  hideCelebration();

  if (action === 'next-part') {
    currentPart = 2;
    render();
    saveProgress();
    messageEl.textContent = 'Great! Now listen for a sound from ' + variantNames[currentVariant] + ' part 2.';
    helperNoteEl.textContent = 'You finished part 1. Let us begin part 2.';
    setTimeout(() => chooseAndPlayNext(currentVariant, 2), 100);
    return;
  }

  if (action === 'next-variant') {
    currentVariant += 1;
    currentPart = 1;
    render();
    saveProgress();
    messageEl.textContent = 'Great! ' + variantNames[currentVariant] + ' is ready.';
    helperNoteEl.textContent = 'Let us begin ' + variantNames[currentVariant] + ' — Part 1.';
    setTimeout(() => chooseAndPlayNext(currentVariant, 1), 100);
    return;
  }

  if (action === 'restart') {
    resetProgress();
  }
}

async function handleIntroStart() {
  introOverlay.style.display = 'none';
  const ok = await loadSounds();
  currentVariant = 0;
  currentPart = 1;
  render();
  setMessageTone('info');
  setRevealState('idle', 'Starting');
  setReplayButtonState('ready');
  saveProgress();
  if (ok) setTimeout(() => chooseAndPlayNext(0, 1), 100);
}

async function handleContinueStart() {
  const restored = loadSavedProgressIntoState();
  introOverlay.style.display = 'none';
  const ok = await loadSounds();
  if (!restored) {
    currentVariant = 0;
    currentPart = 1;
  }
  render();
  setMessageTone('info');
  setRevealState('idle', 'Welcome back');
  setReplayButtonState('ready');
  saveProgress();
  if (ok) {
    messageEl.textContent = 'Welcome back! Continuing from ' + variantNames[currentVariant] + ' — Part ' + currentPart + '.';
    helperNoteEl.textContent = 'Your saved progress has been restored.';
    setTimeout(() => chooseAndPlayNext(currentVariant, currentPart), 120);
  }
}

async function handleFreshStart() {
  confirmAndReset();
  if (hasSavedProgress()) return;
  introOverlay.style.display = 'none';
  const ok = await loadSounds();
  render();
  saveProgress();
  if (ok) setTimeout(() => chooseAndPlayNext(0, 1), 100);
}

enterGameBtn.addEventListener('click', handleIntroStart);
continueBtn.addEventListener('click', handleContinueStart);
restartIntroBtn.addEventListener('click', handleFreshStart);
replayBtn.addEventListener('click', handleReplay);
resetBtn.addEventListener('click', confirmAndReset);
celebrationContinueBtn.addEventListener('click', handleCelebrationContinue);

render();
updateContinueButton();
setMessageTone('info');
setRevealState('idle', 'Ready');
setReplayButtonState('ready');
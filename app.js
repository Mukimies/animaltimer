'use strict';

// ---------- Data ----------

// Each animal has a face emoji, the food it eats, and a background color for its day.
const ANIMALS = [
  { name: 'Mouse',       emoji: '🐭', food: '🧀', foodName: 'cheese',     bg: '#fff4d6' },
  { name: 'Horse',       emoji: '🐴', food: '🍎', foodName: 'apples',     bg: '#ffe3dc' },
  { name: 'Dog',         emoji: '🐶', food: '🌭', foodName: 'sausages',   bg: '#ffeccc' },
  { name: 'Fly',         emoji: '🪰', food: '💩', foodName: 'poop',       bg: '#eef3d2' },
  { name: 'Rabbit',      emoji: '🐰', food: '🥕', foodName: 'carrots',    bg: '#e8f6dc' },
  { name: 'Monkey',      emoji: '🐵', food: '🍌', foodName: 'bananas',    bg: '#fff7c2' },
  { name: 'Panda',       emoji: '🐼', food: '🎋', foodName: 'bamboo',     bg: '#e3f4e1' },
  { name: 'Bear',        emoji: '🐻', food: '🍯', foodName: 'honey',      bg: '#fdebc8' },
  { name: 'Cat',         emoji: '🐱', food: '🐟', foodName: 'fish',       bg: '#dff0fb' },
  { name: 'Squirrel',    emoji: '🐿️', food: '🌰', foodName: 'nuts',       bg: '#f6e6d6' },
  { name: 'Koala',       emoji: '🐨', food: '🌿', foodName: 'eucalyptus', bg: '#e4f1e8' },
  { name: 'Bee',         emoji: '🐝', food: '🌼', foodName: 'flowers',    bg: '#fff6cf' },
  { name: 'Penguin',     emoji: '🐧', food: '🦐', foodName: 'shrimp',     bg: '#e0f0fb' },
  { name: 'Pig',         emoji: '🐷', food: '🌽', foodName: 'corn',       bg: '#ffe4ec' },
  { name: 'Frog',        emoji: '🐸', food: '🪰', foodName: 'flies',      bg: '#e6f5d6' },
  { name: 'Bird',        emoji: '🐦', food: '🪱', foodName: 'worms',      bg: '#e2f1fb' },
  { name: 'Caterpillar', emoji: '🐛', food: '🍃', foodName: 'leaves',     bg: '#ecf7d8' },
  { name: 'Cow',         emoji: '🐮', food: '🌾', foodName: 'hay',        bg: '#f4f0dc' },
  { name: 'Hamster',     emoji: '🐹', food: '🌻', foodName: 'sunflowers', bg: '#fff1d0' },
  { name: 'Shark',       emoji: '🦈', food: '🐙', foodName: 'octopuses',  bg: '#dcecf8' },
  { name: 'Unicorn',     emoji: '🦄', food: '🍭', foodName: 'lollipops',  bg: '#f6e4fb' },
  { name: 'Hedgehog',    emoji: '🦔', food: '🐌', foodName: 'snails',     bg: '#f1eadf' },
];

const MINUTE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 45, 50, 60];
const PER_ROW = 6;          // 6 foods per row…
const BITE_MS = 10_000;     // …one every 10 seconds = one row per minute

const STORE_SETTINGS = 'animaltimer.settings';
const STORE_RUN = 'animaltimer.run';

// ---------- Animal of the day ----------

function localDayNumber(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle the animals once per "cycle" so every animal shows up once before any repeats.
function animalIndexForDay(day) {
  const n = ANIMALS.length;
  const cycle = Math.floor(day / n);
  const rand = mulberry32(cycle * 9973 + 17);
  const order = [...ANIMALS.keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order[day % n];
}

// ---------- Settings ----------

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable */ }
}

// settings.animal: name of a hand-picked animal, or null for the daily surprise.
const settings = Object.assign({ hidden: [], sound: true, showClock: true, animal: null }, loadJSON(STORE_SETTINGS, {}));
const saveSettings = () => saveJSON(STORE_SETTINGS, settings);

// ---------- DOM ----------

const $ = (id) => document.getElementById(id);
const homeEl = $('home'), timerEl = $('timer'), doneEl = $('done');
const boardWrap = $('boardWrap'), board = $('board'), eater = $('eater');
const clockEl = $('clock'), pauseBtn = $('pauseBtn');

let todayAnimalIndex = 0;

function currentAnimalIndex() {
  const picked = ANIMALS.findIndex((a) => a.name === settings.animal);
  return picked >= 0 ? picked : animalIndexForDay(localDayNumber());
}

function setTheme(animal) {
  document.documentElement.style.setProperty('--bg', animal.bg);
  document.querySelector('meta[name="theme-color"]').content = animal.bg;
}

function renderHome() {
  todayAnimalIndex = currentAnimalIndex();
  const a = ANIMALS[todayAnimalIndex];
  setTheme(a);
  $('todayLabel').textContent = settings.animal ? 'Your animal' : "Today's animal";
  $('todayAnimal').textContent = a.emoji;
  $('todayTitle').textContent = `${a.name} eats ${a.foodName}`;

  const wrap = $('minutes');
  wrap.replaceChildren();
  for (const m of MINUTE_OPTIONS) {
    if (settings.hidden.includes(m)) continue;
    const b = document.createElement('button');
    b.className = 'minute-btn';
    b.innerHTML = `${m}<small>min</small>`;
    b.setAttribute('aria-label', `${m} minute${m > 1 ? 's' : ''}`);
    b.addEventListener('click', () => startTimer(m));
    wrap.append(b);
  }
}

// ---------- Timer state ----------
// run = { minutes, animal, start, pausedAt|null, pausedTotal }
let run = null;
let cells = [];
let lastEaten = -1;
let rafId = 0, tickId = 0;
let audioCtx = null;
let wakeLock = null;

function totalMs() { return run.minutes * 60_000; }
function elapsedMs(now = Date.now()) {
  const ref = run.pausedAt ?? now;
  return Math.min(totalMs(), Math.max(0, ref - run.start - run.pausedTotal));
}

function startTimer(minutes) {
  unlockAudio();
  run = { minutes, animal: todayAnimalIndex, start: Date.now(), pausedAt: null, pausedTotal: 0 };
  saveJSON(STORE_RUN, run);
  showTimer();
}

function showTimer() {
  const a = ANIMALS[run.animal];
  setTheme(a);
  homeEl.hidden = true;
  doneEl.hidden = true;
  timerEl.hidden = false;
  $('eaterEmoji').textContent = a.emoji;
  clockEl.classList.toggle('hidden-clock', !settings.showClock);

  // Build the grid of food.
  const count = run.minutes * PER_ROW;
  cells = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    const f = document.createElement('span');
    f.className = 'food';
    f.textContent = a.food;
    c.append(f);
    cells.push(c);
    frag.append(c);
  }
  board.replaceChildren(eater, frag);
  lastEaten = -1;

  // Place the animal without the slide animation, then re-enable it.
  eater.style.transition = 'none';
  sizeBoard();
  eater.offsetWidth; // flush
  eater.style.transition = '';
  updatePausedUI();
  requestWakeLock();
  loop();
  clearInterval(tickId);
  tickId = setInterval(update, 1000); // keeps going when rAF is throttled
}

function sizeBoard() {
  if (!run) return;
  const rows = run.minutes;
  const style = getComputedStyle(boardWrap);
  const w = boardWrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = boardWrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  // 6.4 columns wide: room for the animal to poke out on the left of the first column.
  const byWidth = w / (PER_ROW + 0.4);
  const byHeight = h / rows;
  const cell = Math.max(36, Math.min(byWidth, byHeight, 110));
  document.documentElement.style.setProperty('--cell', `${Math.floor(cell)}px`);
  lastEaten = -1; // force reposition
  update();
}

function loop() {
  cancelAnimationFrame(rafId);
  const frame = () => {
    if (!run) return;
    update();
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
}

function update() {
  if (!run || timerEl.hidden) return;
  const elapsed = elapsedMs();
  const total = totalMs();
  const eaten = Math.floor(elapsed / BITE_MS);
  const bite = (elapsed % BITE_MS) / BITE_MS;

  if (eaten !== lastEaten) {
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.toggle('eaten', i < eaten);
      cells[i].classList.toggle('current', i === eaten);
    }
    const target = cells[Math.min(eaten, cells.length - 1)];
    if (target) {
      const size = target.offsetWidth;
      eater.style.transform = `translate(${target.offsetLeft - size * 0.45}px, ${target.offsetTop}px)`;
      // Keep the current row in view on long timers.
      const rowTop = target.offsetTop;
      const wrapH = boardWrap.clientHeight;
      if (rowTop < boardWrap.scrollTop || rowTop + size > boardWrap.scrollTop + wrapH) {
        boardWrap.scrollTop = rowTop - size;
      }
    }
    lastEaten = eaten;
  }
  if (cells[eaten]) cells[eaten].style.setProperty('--bite', bite.toFixed(3));

  const remaining = Math.ceil((total - elapsed) / 1000);
  const text = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  if (clockEl.textContent !== text) clockEl.textContent = text;

  if (elapsed >= total) finish();
}

function togglePause() {
  if (!run) return;
  if (run.pausedAt == null) {
    run.pausedAt = Date.now();
  } else {
    run.pausedTotal += Date.now() - run.pausedAt;
    run.pausedAt = null;
  }
  saveJSON(STORE_RUN, run);
  updatePausedUI();
}

function updatePausedUI() {
  const paused = run?.pausedAt != null;
  timerEl.classList.toggle('paused', paused);
  $('pausedBanner').hidden = !paused;
  pauseBtn.textContent = paused ? '▶️' : '⏸';
  pauseBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
}

function stopTimer() {
  cancelAnimationFrame(rafId);
  clearInterval(tickId);
  run = null;
  saveJSON(STORE_RUN, null);
  releaseWakeLock();
  timerEl.hidden = true;
  homeEl.hidden = false;
  renderHome();
}

function finish() {
  const a = ANIMALS[run.animal];
  cancelAnimationFrame(rafId);
  clearInterval(tickId);
  run = null;
  saveJSON(STORE_RUN, null);
  releaseWakeLock();

  $('doneAnimal').textContent = a.emoji;
  $('doneText').textContent = `Yum! No more ${a.foodName}!`;
  timerEl.hidden = true;
  doneEl.hidden = false;
  if (settings.sound) playAlarm();
  navigator.vibrate?.([300, 150, 300, 150, 600]);
}

// ---------- Sound ----------

function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio */ }
}

function playAlarm() {
  unlockAudio();
  if (!audioCtx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  const t0 = audioCtx.currentTime + 0.05;
  for (let rep = 0; rep < 3; rep++) {
    notes.forEach((freq, i) => {
      const t = t0 + rep * 1.1 + i * 0.16;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
}

// ---------- Screen wake lock ----------

async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not allowed */ }
}
function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

// ---------- Animal picker ----------

function openAnimalPicker() {
  const grid = $('animalGrid');
  grid.replaceChildren();
  const options = [{ name: null, label: 'Daily surprise', pics: '🎲' },
    ...ANIMALS.map((a) => ({ name: a.name, label: a.name, pics: a.emoji + a.food }))];
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'animal-option';
    b.setAttribute('aria-pressed', String(settings.animal === o.name));
    const pics = document.createElement('span');
    pics.className = 'pics';
    pics.textContent = o.pics;
    b.append(pics, o.label);
    b.addEventListener('click', () => {
      settings.animal = o.name;
      saveSettings();
      renderHome();
      $('animalPicker').close();
    });
    grid.append(b);
  }
  $('animalPicker').showModal();
}

// ---------- Settings dialog ----------

function openSettings() {
  const wrap = $('minuteChecks');
  wrap.replaceChildren();
  for (const m of MINUTE_OPTIONS) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !settings.hidden.includes(m);
    cb.addEventListener('change', () => {
      settings.hidden = cb.checked ? settings.hidden.filter((x) => x !== m) : [...settings.hidden, m];
      saveSettings();
      renderHome();
    });
    label.append(cb, String(m));
    wrap.append(label);
  }
  $('soundToggle').checked = settings.sound;
  $('clockToggle').checked = settings.showClock;
  $('settings').showModal();
}

$('soundToggle').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); });
$('clockToggle').addEventListener('change', (e) => { settings.showClock = e.target.checked; saveSettings(); });

// ---------- Wiring ----------

$('settingsBtn').addEventListener('click', openSettings);
$('animalBtn').addEventListener('click', openAnimalPicker);
pauseBtn.addEventListener('click', togglePause);
$('stopBtn').addEventListener('click', () => {
  if (confirm('Stop the timer?')) stopTimer();
});
$('doneBtn').addEventListener('click', () => {
  doneEl.hidden = true;
  homeEl.hidden = false;
  renderHome();
});

window.addEventListener('resize', sizeBoard);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (run) { requestWakeLock(); update(); }
  else if (!homeEl.hidden) renderHome(); // the day may have changed
});

// Resume a timer that was running when the page was closed or reloaded.
renderHome();
const saved = loadJSON(STORE_RUN, null);
if (saved && ANIMALS[saved.animal] && MINUTE_OPTIONS.includes(saved.minutes)) {
  run = saved;
  showTimer();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

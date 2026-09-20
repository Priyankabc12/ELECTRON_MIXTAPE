// ===== TAB SWITCHING =====
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
  });
});

// ===== TRANSPORT BUTTON ELEMENTS =====
const btnPrev = document.getElementById('btnPrev');
const btnPlay = document.getElementById('btnPlay');
const btnStop = document.getElementById('btnStop');
const btnNext = document.getElementById('btnNext');
const vinyl = document.getElementById('vinyl');
const vinylTrackNo = document.getElementById('vinylTrackNo');
const tracklistEl = document.getElementById('tracklist');
const arcEl = document.getElementById('arc');
const elapsedTimeEl = document.getElementById('elapsedTime');
const totalTimeEl = document.getElementById('totalTime');
const timeFillEl = document.getElementById('timeFill');

const trackColors = ['#2f5fa8', '#111111', '#e0577e', '#c94a3a', '#3a8f6f', '#9a5fb0'];

// "emphasize the key on click" — flashes a button's pressed state for a beat,
// works whether the press came from a real click or a keyboard shortcut.
function flashButton(btn) {
  if (!btn) return;
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 140);
}

function flashCursorRow() {
  const row = tracklistEl.querySelector('.track-row.cursor');
  if (!row) return;
  row.style.transform = 'translateX(4px)';
  setTimeout(() => (row.style.transform = ''), 120);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

let lastSongMenuLength = -1;
let lastState = null;

function render(state) {
  lastState = state;
  const { songMenu, cursorIndex, isPause, elapsedDuration, totalDuration, isLoaded } = state;

  // rebuild list + arc only if the song count changed (avoids re-render thrash on every 50ms tick)
  if (songMenu.length !== lastSongMenuLength) {
    lastSongMenuLength = songMenu.length;
    tracklistEl.innerHTML = '';
    arcEl.innerHTML = '';

    songMenu.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.dataset.index = i;
      const label = song.replace(/\.mp3$/i, '');
      row.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="name">${label}</span>
        <span class="now-icon"></span>
      `;
      row.addEventListener('click', () => window.api.playIndex(i));
      tracklistEl.appendChild(row);

      const chip = document.createElement('div');
      chip.className = 'track-chip';
      chip.style.background = trackColors[i % trackColors.length];
      chip.dataset.index = i;
      chip.textContent = i + 1;
      arcEl.appendChild(chip);
    });

    positionArc();
  }

  // highlight cursor row + "now playing" icon
  tracklistEl.querySelectorAll('.track-row').forEach((row) => {
    const i = Number(row.dataset.index);
    row.classList.toggle('cursor', i === cursorIndex);
    row.querySelector('.now-icon').textContent = i === cursorIndex && isLoaded ? (isPause ? '❚❚' : '▶') : '';
  });
  arcEl.querySelectorAll('.track-chip').forEach((chip) => {
    chip.classList.toggle('current', Number(chip.dataset.index) === cursorIndex);
  });

  // vinyl spin + label
  vinyl.classList.toggle('playing', isLoaded && !isPause);
  vinylTrackNo.textContent = String(cursorIndex + 1).padStart(2, '0');

  // play/pause button label
  btnPlay.textContent = isLoaded && !isPause ? '❚❚ PAUSE' : '▶ PLAY';

  // time bar
  elapsedTimeEl.textContent = formatTime(elapsedDuration);
  totalTimeEl.textContent = formatTime(totalDuration);
  const pct = totalDuration > 0 ? Math.min(100, (elapsedDuration / totalDuration) * 100) : 0;
  timeFillEl.style.width = `${pct}%`;
}

function positionArc() {
  const chips = arcEl.querySelectorAll('.track-chip');
  const n = chips.length;
  const spread = 150; // total degrees the fan covers
  const start = -spread / 2;
  const radius = 150;
  chips.forEach((chip, i) => {
    const angle = n === 1 ? 0 : start + (spread / (n - 1)) * i;
    const rad = (angle * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const y = -Math.cos(rad) * radius - 40;
    chip.style.transform = `translate(${x}px, ${y}px)`;
  });
}

window.api.onState(render);

// ===== BUTTON CLICKS =====
btnPrev.addEventListener('click', () => { window.api.prev(); flashButton(btnPrev); });
btnNext.addEventListener('click', () => { window.api.next(); flashButton(btnNext); });
btnStop.addEventListener('click', () => { window.api.stop(); flashButton(btnStop); });
btnPlay.addEventListener('click', () => {
  flashButton(btnPlay);
  // nothing loaded yet -> start the highlighted track; otherwise toggle play/pause
  if (lastState && !lastState.isLoaded) {
    window.api.playCursor();
  } else {
    window.api.togglePlay();
  }
});

// ===== KEYBOARD SHORTCUTS (mirrors your original stdin byte-matching) =====
window.addEventListener('keydown', (e) => {
  // ignore keystrokes while typing in the profile form
  if (e.target.tagName === 'INPUT') return;

  switch (e.key) {
    case 'n':
      window.api.next();
      flashButton(btnNext);
      break;
    case 'b':
      window.api.prev();
      flashButton(btnPrev);
      break;
    case 'p':
      window.api.togglePlay();
      flashButton(btnPlay);
      break;
    case 'Enter':
      window.api.playCursor();
      flashButton(btnPlay);
      break;
    case 's':
      window.api.stop();
      flashButton(btnStop);
      break;
    case 'ArrowUp':
      e.preventDefault();
      window.api.moveCursor(-1);
      flashCursorRow();
      break;
    case 'ArrowDown':
      e.preventDefault();
      window.api.moveCursor(1);
      flashCursorRow();
      break;
  }
});

// ===== PROFILE PAGE (passport) =====
const photoBox = document.getElementById('photoBox');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');

photoBox.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    photoPreview.src = reader.result;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
    localStorage.setItem('mixtape_photo', reader.result);
  };
  reader.readAsDataURL(file);
});

const profileFields = ['pName', 'pSince', 'pHome', 'pGenre', 'pMood', 'pArtist', 'pSignature'];

function loadProfile() {
  profileFields.forEach((id) => {
    const saved = localStorage.getItem('mixtape_' + id);
    if (saved) document.getElementById(id).value = saved;
  });
  const savedPhoto = localStorage.getItem('mixtape_photo');
  if (savedPhoto) {
    photoPreview.src = savedPhoto;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  }
  const createdField = document.getElementById('pCreated');
  const storedCreated = localStorage.getItem('mixtape_pCreated');
  createdField.value = storedCreated || new Date().toISOString().slice(0, 10);
  if (!storedCreated) localStorage.setItem('mixtape_pCreated', createdField.value);
}

document.getElementById('btnSave').addEventListener('click', () => {
  profileFields.forEach((id) => {
    localStorage.setItem('mixtape_' + id, document.getElementById(id).value);
  });
  const note = document.getElementById('savedNote');
  note.classList.add('show');
  setTimeout(() => note.classList.remove('show'), 1400);
});

loadProfile();

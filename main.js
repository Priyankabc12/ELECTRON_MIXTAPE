const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ===== STATE (this replaces your top-level `let` variables) =====
let mainWindow;
let playerProcess = undefined;   // same role as your playerProcess
let isPause = true;              // same role as your isPause
let cursorIndex = 0;             // same role as your userChoice
let elapsedDuration = 0;
let totalDuration = 0;
let songMenu = [];
let tickTimer = null;

// ===== SONG LIST =====
// Reads every .mp3 in /song so you don't have to hardcode filenames.
// Falls back to your original placeholder list if the folder is empty.
function loadSongs() {
  const songDir = path.join(__dirname, 'song');
  try {
    songMenu = fs
      .readdirSync(songDir)
      .filter((f) => f.toLowerCase().endsWith('.mp3'));
  } catch (e) {
    songMenu = [];
  }
  if (songMenu.length === 0) {
    songMenu = ['TereBin.mp3', 'TumSeHi.mp3', 'Udaarian.mp3']; // placeholders — drop real files in /song
  }
}

// ===== YOUR afinfo DURATION LOGIC, made async instead of fire-and-forget =====
function getTotalDurationOfSong(songPath) {
  return new Promise((resolve) => {
    const afInfoProcess = spawn('afinfo', [songPath]);
    let raw = '';
    afInfoProcess.stdout.on('data', (data) => {
      raw += data.toString();
    });
    afInfoProcess.on('close', () => {
      try {
        const dur = Number(raw.split('estimated duration: ')[1].split('.')[0]);
        resolve(Number.isNaN(dur) ? 0 : dur);
      } catch (e) {
        resolve(0); // afinfo is macOS-only — if it's missing/fails, just show 0 instead of crashing
      }
    });
    afInfoProcess.on('error', () => resolve(0));
  });
}

function killPlayer() {
  if (playerProcess) {
    try {
      playerProcess.kill('SIGKILL');
    } catch (e) {}
    playerProcess = undefined;
  }
}

// ===== YOUR CORE ACTIONS, same behavior, now callable from the UI =====

// Enter key equivalent: play whatever is currently highlighted
async function playIndex(index) {
  if (songMenu.length === 0) return;
  killPlayer();
  cursorIndex = index;
  elapsedDuration = 0;
  const songPath = path.join(__dirname, 'song', songMenu[cursorIndex]);
  totalDuration = await getTotalDurationOfSong(songPath);
  playerProcess = spawn('vlc', ['--intf', 'rc', songPath]);
  isPause = false;
  broadcastState();
}

// 'p' key equivalent: play/pause via vlc's rc stdin protocol
function togglePlayPause() {
  if (!playerProcess) return;
  if (isPause) {
    playerProcess.stdin.write('play\n');
    isPause = false;
  } else {
    playerProcess.stdin.write('pause\n');
    isPause = true;
  }
  broadcastState();
}

// Arrow key equivalent: move the highlight only, no playback change
function moveCursor(delta) {
  if (songMenu.length === 0) return;
  cursorIndex = (cursorIndex + delta + songMenu.length) % songMenu.length;
  broadcastState();
}

// 'n' key equivalent: move AND play immediately
function nextSong() {
  if (songMenu.length === 0) return;
  playIndex((cursorIndex + 1) % songMenu.length);
}

// 'b' key equivalent: move AND play immediately
function prevSong() {
  if (songMenu.length === 0) return;
  playIndex((cursorIndex - 1 + songMenu.length) % songMenu.length);
}

// New: a real Stop, since Ctrl+C used to just kill the whole terminal app.
// Here we want Stop to end playback without closing the window.
function stopPlayback() {
  killPlayer();
  isPause = true;
  elapsedDuration = 0;
  totalDuration = 0;
  broadcastState();
}

function broadcastState() {
  if (!mainWindow) return;
  mainWindow.webContents.send('state-update', {
    songMenu,
    cursorIndex,
    isPause,
    elapsedDuration,
    totalDuration,
    isLoaded: !!playerProcess,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 600,
    backgroundColor: '#f4f1e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  loadSongs();
  createWindow();
  mainWindow.webContents.once('did-finish-load', broadcastState);

  // this is your setInterval(..., 50) loop, unchanged in spirit
  tickTimer = setInterval(() => {
    if (isPause === false && playerProcess !== undefined) {
      elapsedDuration += 0.05;
    }
    broadcastState();
  }, 50);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  killPlayer();
  clearInterval(tickTimer);
  if (process.platform !== 'darwin') app.quit();
});

// ===== IPC — the UI calls these instead of writing raw bytes to stdin =====
ipcMain.on('play-index', (e, index) => playIndex(index));
ipcMain.on('play-cursor', () => playIndex(cursorIndex));
ipcMain.on('next-song', () => nextSong());
ipcMain.on('prev-song', () => prevSong());
ipcMain.on('toggle-play', () => togglePlayPause());
ipcMain.on('move-cursor', (e, delta) => moveCursor(delta));
ipcMain.on('stop-playback', () => stopPlayback());

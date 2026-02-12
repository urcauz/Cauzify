// ─── CAUZIFY MUSIC PLAYER ─────────────────────────────
// Main Application - v1.0 with PWA Support

// ─── STATE MANAGEMENT ──────────────────────────────────
const state = {
  server: '', user: '', pass: '', salt: '', token: '',
  connected: false,
  albums: [], songs: [], artists: [],
  queue: [], queueIdx: -1,
  playing: false, shuffle: false, repeat: 'none',
  currentSong: null, progress: 0, duration: 0,
  volume: 0.8, favs: new Set(),
  loaded: { home: false, songs: false, albums: false, artists: false }
};

// ─── PWA VARIABLES ─────────────────────────────────────
let deferredPrompt;
let isOnline = navigator.onLine;

// ─── SUBSONIC API ──────────────────────────────────────
function makeSalt() {
  return Math.random().toString(36).substring(2, 10);
}

function apiUrl(method, params = {}) {
  const salt = makeSalt();
  const token = md5(state.pass + salt);
  const base = `${state.server}/rest/${method}`;
  const p = new URLSearchParams({
    u: state.user, t: token, s: salt, v: '1.16.1',
    c: 'Cauzify-mobile', f: 'json', ...params
  });
  return `${base}?${p}`;
}

async function api(method, params = {}) {
  const url = apiUrl(method, params);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const resp = data['subsonic-response'];
    if (resp.status !== 'ok') throw new Error(resp.error?.message || 'API error');
    return resp;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function coverArtUrl(id) {
  if (!id) return null;
  const salt = makeSalt();
  const token = md5(state.pass + salt);
  return `${state.server}/rest/getCoverArt?u=${state.user}&t=${token}&s=${salt}&v=1.16.1&c=Cauzify-mobile&id=${id}&size=300`;
}

function streamUrl(id) {
  const salt = makeSalt();
  const token = md5(state.pass + salt);
  return `${state.server}/rest/stream?u=${state.user}&t=${token}&s=${salt}&v=1.16.1&c=Cauzify-mobile&id=${id}`;
}

// ─── AUTHENTICATION ────────────────────────────────────
async function doLogin() {
  const serverEl = document.getElementById('server-url');
  const userEl   = document.getElementById('username');
  const passEl   = document.getElementById('password');
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  let server = serverEl.value.trim().replace(/\/$/, '');
  const user = userEl.value.trim();
  const pass = passEl.value;

  if (!server || !user || !pass) {
    showError(errEl, 'Please fill in all fields');
    return;
  }
  if (!server.startsWith('http')) server = 'http://' + server;

  btn.classList.add('loading');
  btn.textContent = 'Connecting…';
  errEl.style.display = 'none';

  state.server = server;
  state.user = user;
  state.pass = pass;

  try {
    const resp = await api('ping');
    showToast('✓ Connected to Navidrome');
    state.connected = true;

    // Store session token instead of password
    const sessionToken = btoa(`${user}:${Date.now()}`);
    localStorage.setItem('Cauzify_server', server);
    localStorage.setItem('Cauzify_user', user);
    localStorage.setItem('Cauzify_session', sessionToken);
    localStorage.setItem('Cauzify_pass', pass); // Still needed for API calls

    showApp();
    loadHome();
  } catch (e) {
    console.error('Login error:', e);
    showError(errEl, `Connection failed: ${e.message}`);
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Connect';
  }
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function disconnect() {
  localStorage.clear();
  state.connected = false;
  state.server = state.user = state.pass = '';
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('settings-screen').classList.remove('active', 'open');
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('audio-el').pause();
  state.playing = false;
  state.loaded = { home: false, songs: false, albums: false, artists: false };
  closeSettings();
  showToast('🔓 Disconnected');
}

// ─── SCREENS ───────────────────────────────────────────
function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('server-badge-wrap').style.display = 'block';
  document.getElementById('server-name-badge').textContent = new URL(state.server).hostname;
  document.getElementById('settings-server-url').textContent = state.server;
  document.getElementById('settings-username').textContent = state.user;
}

function openPlayer() {
  const ps = document.getElementById('player-screen');
  ps.classList.add('active', 'open');
}

function closePlayer() {
  const ps = document.getElementById('player-screen');
  ps.classList.remove('open');
  setTimeout(() => ps.classList.remove('active'), 350);
}

function openSettings() {
  const ss = document.getElementById('settings-screen');
  ss.classList.add('active', 'open');
  updateCacheStatus();
}

function closeSettings() {
  const ss = document.getElementById('settings-screen');
  ss.classList.remove('open');
  setTimeout(() => ss.classList.remove('active'), 300);
}

// ─── TABS ──────────────────────────────────────────────
let currentTab = 'home';
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const tabs = ['home','songs','albums','artists','search'];
    t.classList.toggle('active', tabs[i] === tab);
  });
  ['home','songs','albums','artists','search'].forEach(p => {
    document.getElementById(`page-${p}`).style.display = p === tab ? 'block' : 'none';
  });
  currentTab = tab;
  if (tab === 'songs' && !state.loaded.songs) loadSongs();
  if (tab === 'albums' && !state.loaded.albums) loadAlbums();
  if (tab === 'artists' && !state.loaded.artists) loadArtists();
}

// ─── LOAD DATA ─────────────────────────────────────────
async function loadHome() {
  try {
    const [recAlb, topSongs] = await Promise.all([
      api('getAlbumList', { type: 'newest', size: 12 }),
      api('getAlbumList', { type: 'frequent', size: 8 })
        .then(r => {
          const albums = r.albumList?.album || [];
          return Promise.all(albums.slice(0, 5).map(a =>
            api('getAlbum', { id: a.id })
              .then(r2 => (r2.album?.song || []).slice(0, 2))
              .catch(() => [])
          ));
        })
    ]);

    const recentAlbums = recAlb.albumList?.album || [];
    renderRecentAlbums(recentAlbums);
    const flat = topSongs.flat();
    renderPopularSongs(flat.slice(0, 15));

    document.getElementById('home-loading').style.display = 'none';
    document.getElementById('home-content').style.display = 'block';
    state.loaded.home = true;

    // Cache album data
    if ('caches' in window) {
      cacheAlbumData(recentAlbums);
    }

    document.getElementById('settings-stats').textContent =
      `${recentAlbums.length}+ albums loaded`;
  } catch(e) {
    console.error('Load home error:', e);
    document.getElementById('home-loading').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Load failed</div>
      <div class="empty-state-sub">${e.message}</div></div>`;
  }
}

async function loadSongs() {
  try {
    const r = await api('getAlbumList', { type: 'newest', size: 30 });
    const albums = r.albumList?.album || [];
    const songsAll = [];
    
    // Parallel loading instead of sequential
    const songPromises = albums.slice(0, 8).map(alb =>
      api('getAlbum', { id: alb.id })
        .then(r2 => r2.album?.song || [])
        .catch(() => [])
    );
    
    const songArrays = await Promise.all(songPromises);
    songArrays.forEach(songs => songs.forEach(s => songsAll.push(s)));
    
    state.songs = songsAll;
    renderSongsList(songsAll, 'songs-list');
    document.getElementById('songs-loading').style.display = 'none';
    state.loaded.songs = true;
  } catch(e) {
    console.error('Load songs error:', e);
    document.getElementById('songs-loading').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Load failed</div>
      <div class="empty-state-sub">${e.message}</div></div>`;
  }
}

async function loadAlbums() {
  try {
    const r = await api('getAlbumList', { type: 'alphabeticalByName', size: 50 });
    const albums = r.albumList?.album || [];
    state.albums = albums;
    renderAlbumsGrid(albums);
    document.getElementById('albums-loading').style.display = 'none';
    document.getElementById('albums-grid').style.display = 'grid';
    state.loaded.albums = true;
  } catch(e) {
    console.error('Load albums error:', e);
    document.getElementById('albums-loading').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Load failed</div>
      <div class="empty-state-sub">${e.message}</div></div>`;
  }
}

async function loadArtists() {
  try {
    const r = await api('getArtists');
    const index = r.artists?.index || [];
    const artists = index.flatMap(i => i.artist || []);
    state.artists = artists;
    renderArtistsRow(artists.slice(0, 15));
    renderArtistsList(artists);
    document.getElementById('artists-loading').style.display = 'none';
    document.getElementById('artists-content').style.display = 'block';
    state.loaded.artists = true;
  } catch(e) {
    console.error('Load artists error:', e);
    document.getElementById('artists-loading').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Load failed</div>
      <div class="empty-state-sub">${e.message}</div></div>`;
  }
}

function refreshLib() {
  state.loaded = { home: false, songs: false, albums: false, artists: false };
  loadHome();
  closeSettings();
  switchTab('home');
  showToast('🔄 Refreshing library…');
}

// ─── RENDER HELPERS ────────────────────────────────────
function albumThumb(alb) {
  const url = alb.coverArt ? coverArtUrl(alb.coverArt) : null;
  if (url) return `<img src="${url}" loading="lazy" alt="${esc(alb.title || 'Album')}" onerror="this.style.display='none';this.parentElement.querySelector('.album-art-placeholder').style.display='flex'">
    <div class="album-art-placeholder" style="display:none">💿</div>`;
  return `<div class="album-art-placeholder">💿</div>`;
}

function renderRecentAlbums(albums) {
  const el = document.getElementById('recent-albums');
  el.innerHTML = albums.map(a => `
    <div class="album-card" onclick="app.playAlbum('${a.id}', '${esc(a.title)}')">
      <div class="album-art">${albumThumb(a)}
        <div class="album-play-overlay">
          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
      <div class="album-name">${esc(a.title || a.name || 'Unknown')}</div>
      <div class="album-artist">${esc(a.artist || '—')}</div>
    </div>
  `).join('');
}

function renderPopularSongs(songs) {
  renderSongsList(songs, 'popular-songs');
}

function renderSongsList(songs, containerId) {
  const el = document.getElementById(containerId);
  if (!songs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎵</div>
      <div class="empty-state-title">No songs found</div></div>`;
    return;
  }
  el.innerHTML = songs.map((s, i) => {
    const cover = s.coverArt ? coverArtUrl(s.coverArt) : null;
    const dur = formatDur(s.duration || 0);
    const songsJson = JSON.stringify([s]).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const queueJson = JSON.stringify(songs.slice(Math.max(0,i-1)).map(x=>x.id)).replace(/"/g,'&quot;');
    return `
    <div class="song-item" id="song-${s.id}" onclick="app.playSong(${songsJson}, 0, ${queueJson})">
      <div class="song-thumb">${cover ? `<img src="${cover}" loading="lazy" alt="${esc(s.title || 'Song')}" onerror="this.style.display='none'">` : '🎵'}</div>
      <div class="song-info">
        <div class="song-name">${esc(s.title || s.name || 'Unknown')}</div>
        <div class="song-meta">${esc(s.artist || '—')} · ${esc(s.album || '')}</div>
      </div>
      <div class="song-dur">${dur}</div>
    </div>`;
  }).join('');
}

function renderAlbumsGrid(albums) {
  const el = document.getElementById('albums-grid');
  el.innerHTML = albums.map(a => {
    const url = a.coverArt ? coverArtUrl(a.coverArt) : null;
    return `<div class="lib-card" onclick="app.playAlbum('${a.id}', '${esc(a.title)}')">
      ${url ? `<img src="${url}" loading="lazy" alt="${esc(a.title || 'Album')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35;border-radius:13px;z-index:0" onerror="this.style.display='none'">` : ''}
      <div style="position:relative;z-index:1">
        <div class="lib-card-icon">💿</div>
        <div class="lib-card-title">${esc(a.title || a.name || 'Unknown')}</div>
        <div class="lib-card-count">${esc(a.artist || '—')}</div>
      </div>
    </div>`;
  }).join('');
}

function renderArtistsRow(artists) {
  const el = document.getElementById('artists-row');
  el.innerHTML = artists.map(a => `
    <div class="artist-chip" onclick="app.showToast('📂 Loading ${esc(a.name)}…')">
      <div class="artist-avatar">🎤</div>
      <div class="artist-chip-name">${esc(a.name)}</div>
    </div>
  `).join('');
}

function renderArtistsList(artists) {
  const el = document.getElementById('artists-alpha');
  el.innerHTML = artists.map(a => `
    <div class="song-item" onclick="app.showToast('📂 Loading ${esc(a.name)}…')">
      <div class="song-thumb" style="font-size:22px">🎤</div>
      <div class="song-info">
        <div class="song-name">${esc(a.name)}</div>
        <div class="song-meta">${a.albumCount || 0} albums</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" width="16" height="16" style="stroke:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `).join('');
}

// ─── PLAYBACK ──────────────────────────────────────────
async function playAlbum(id, name) {
  showToast(`▶ Loading ${name}…`);
  try {
    const r = await api('getAlbum', { id });
    const songs = r.album?.song || [];
    if (!songs.length) {
      showToast('No songs in album');
      return;
    }
    loadQueue(songs, 0);
  } catch(e) {
    console.error('Play album error:', e);
    showToast('⚠ ' + e.message);
  }
}

function playSong(songs, idx, queueIds) {
  loadQueue(songs, idx);
}

function loadQueue(songs, startIdx) {
  if (!songs.length) return;
  state.queue = songs;
  state.queueIdx = state.shuffle ? Math.floor(Math.random() * songs.length) : startIdx;
  playCurrent();
  renderQueue();
}

function playCurrent() {
  const song = state.queue[state.queueIdx];
  if (!song) return;
  state.currentSong = song;

  const audio = document.getElementById('audio-el');
  audio.src = streamUrl(song.id);
  audio.volume = state.volume;
  audio.play().catch(err => {
    console.error('Playback error:', err);
    showToast('⚠ Playback failed');
  });

  updateNowPlayingUI(song);
  document.getElementById('player-bar').classList.remove('hidden');

  // Update Media Session API
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: song.artist || 'Unknown',
      album: song.album || 'Unknown',
      artwork: song.coverArt ? [
        { src: coverArtUrl(song.coverArt), sizes: '300x300', type: 'image/jpeg' }
      ] : []
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
  }

  // Scrobble
  api('scrobble', { id: song.id, submission: false }).catch(err => 
    console.error('Scrobble error:', err)
  );
}

function updateNowPlayingUI(song) {
  const title  = song.title || song.name || 'Unknown';
  const artist = song.artist || '—';
  const cover  = song.coverArt ? coverArtUrl(song.coverArt) : null;

  ['pbar-title','pfull-title'].forEach(id => {
    document.getElementById(id).textContent = title;
  });
  ['pbar-artist','pfull-artist'].forEach(id => {
    document.getElementById(id).textContent = artist;
  });

  const bt = document.getElementById('pbar-thumb');
  bt.innerHTML = cover ? `<img src="${cover}" alt="Album art" onerror="this.style.display='none'">` : '🎵';

  const ph = document.getElementById('pfull-art-placeholder');
  const pi = document.getElementById('pfull-art-img');
  if (cover) {
    pi.src = cover;
    pi.style.display = 'block';
    ph.style.display = 'none';
  } else {
    pi.style.display = 'none';
    ph.style.display = 'flex';
  }

  document.querySelectorAll('.song-item').forEach(el => el.classList.remove('playing'));
  const songEl = document.getElementById(`song-${song.id}`);
  if (songEl) songEl.classList.add('playing');

  document.getElementById('seek-dur').textContent = formatDur(song.duration || 0);
  state.duration = song.duration || 0;
}

function togglePlay() {
  const audio = document.getElementById('audio-el');
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function nextTrack() {
  if (!state.queue.length) return;
  if (state.shuffle) {
    state.queueIdx = Math.floor(Math.random() * state.queue.length);
  } else {
    state.queueIdx = (state.queueIdx + 1) % state.queue.length;
  }
  playCurrent();
}

function prevTrack() {
  const audio = document.getElementById('audio-el');
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  state.queueIdx = (state.queueIdx - 1 + state.queue.length) % state.queue.length;
  playCurrent();
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  document.getElementById('shuffle-btn').classList.toggle('on', state.shuffle);
  showToast(state.shuffle ? '🔀 Shuffle on' : '🔀 Shuffle off');
}

function toggleRepeat() {
  const modes = ['none', 'all', 'one'];
  state.repeat = modes[(modes.indexOf(state.repeat) + 1) % 3];
  document.getElementById('repeat-btn').classList.toggle('on', state.repeat !== 'none');
  showToast({ none: '🔁 Repeat off', all: '🔁 Repeat all', one: '🔂 Repeat one' }[state.repeat]);
}

function toggleFav() {
  const song = state.currentSong;
  if (!song) return;
  const btn = document.getElementById('fav-btn');
  if (state.favs.has(song.id)) {
    state.favs.delete(song.id);
    btn.classList.remove('active');
    api('unstar', { id: song.id }).catch(err => console.error('Unstar error:', err));
    showToast('💔 Removed from favorites');
  } else {
    state.favs.add(song.id);
    btn.classList.add('active');
    api('star', { id: song.id }).catch(err => console.error('Star error:', err));
    showToast('❤️ Added to favorites');
  }
}

function seekTo(e) {
  const bar = document.getElementById('seek-bar');
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const audio = document.getElementById('audio-el');
  audio.currentTime = ratio * audio.duration;
}

function setVolume(e) {
  const bar = document.getElementById('vol-bar');
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.volume = ratio;
  document.getElementById('audio-el').volume = ratio;
  document.getElementById('vol-fill').style.width = (ratio * 100) + '%';
}

// ─── AUDIO EVENTS ──────────────────────────────────────
const audio = document.getElementById('audio-el');

audio.addEventListener('play', () => {
  state.playing = true;
  updatePlayButtons(true);
});

audio.addEventListener('pause', () => {
  state.playing = false;
  updatePlayButtons(false);
});

audio.addEventListener('ended', () => {
  if (state.repeat === 'one') {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextTrack();
  }
  if (state.currentSong) {
    api('scrobble', { id: state.currentSong.id, submission: true })
      .catch(err => console.error('Scrobble submit error:', err));
  }
});

audio.addEventListener('timeupdate', () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
  document.getElementById('pbar-prog').style.width = pct + '%';
  document.getElementById('seek-fill').style.width = pct + '%';
  document.getElementById('seek-cur').textContent = formatDur(Math.floor(audio.currentTime));
});

audio.addEventListener('error', (e) => {
  console.error('Audio error:', e);
  showToast('⚠ Stream error — trying next');
  setTimeout(nextTrack, 1000);
});

function updatePlayButtons(playing) {
  const icon = playing
    ? `<line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/>`
    : `<polygon points="5 3 19 12 5 21 5 3"/>`;
  document.getElementById('pbar-play-icon').innerHTML = icon;
  document.getElementById('pfull-play-icon').innerHTML = icon;
}

// ─── QUEUE ─────────────────────────────────────────────
function toggleQueue() {
  const panel = document.getElementById('queue-panel');
  const backdrop = document.getElementById('queue-backdrop');
  const open = panel.classList.toggle('open');
  backdrop.style.display = open ? 'block' : 'none';
  if (open) renderQueue();
}

function renderQueue() {
  const el = document.getElementById('queue-body');
  el.innerHTML = state.queue.map((s, i) => {
    const cur = i === state.queueIdx;
    return `<div class="queue-item ${cur ? 'current' : ''}" onclick="app.jumpQueue(${i})">
      <div class="queue-num">${cur ? '▶' : i + 1}</div>
      <div class="song-thumb" style="width:40px;height:40px;border-radius:6px;font-size:16px">🎵</div>
      <div class="song-info">
        <div class="song-name">${esc(s.title || 'Unknown')}</div>
        <div class="song-meta">${esc(s.artist || '—')}</div>
      </div>
      <div class="song-dur">${formatDur(s.duration || 0)}</div>
    </div>`;
  }).join('');
}

function jumpQueue(idx) {
  state.queueIdx = idx;
  playCurrent();
  toggleQueue();
}

// ─── SEARCH ────────────────────────────────────────────
let searchTimer;
function doSearch(q) {
  clearTimeout(searchTimer);
  const el = document.getElementById('search-results');
  if (!q.trim()) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><div class="loading-text">Searching…</div></div>`;
  searchTimer = setTimeout(async () => {
    try {
      const r = await api('search3', { query: q, songCount: 20, albumCount: 10, artistCount: 5 });
      const sr = r.searchResult3 || {};
      const songs = sr.song || [];
      const albums = sr.album || [];
      const artists = sr.artist || [];
      let html = '';
      if (artists.length) {
        html += `<div class="section-title" style="margin-bottom:12px">Artists</div>`;
        html += artists.map(a => `
          <div class="song-item" onclick="app.showToast('📂 ${esc(a.name)}')">
            <div class="song-thumb" style="font-size:22px">🎤</div>
            <div class="song-info"><div class="song-name">${esc(a.name)}</div>
            <div class="song-meta">${a.albumCount || 0} albums</div></div>
          </div>`).join('');
      }
      if (albums.length) {
        html += `<div class="section-title" style="margin:16px 0 12px">Albums</div>`;
        html += albums.map(a => `
          <div class="song-item" onclick="app.playAlbum('${a.id}','${esc(a.name || a.title)}')">
            <div class="song-thumb" style="font-size:22px">💿</div>
            <div class="song-info"><div class="song-name">${esc(a.name || a.title || 'Unknown')}</div>
            <div class="song-meta">${esc(a.artist || '—')}</div></div>
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" width="16" height="16" style="stroke:var(--text3);flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>`).join('');
      }
      if (songs.length) {
        html += `<div class="section-title" style="margin:16px 0 12px">Songs</div>`;
        html += songs.map((s, i) => {
          const cover = s.coverArt ? coverArtUrl(s.coverArt) : null;
          return `<div class="song-item" onclick='app.loadQueue(${JSON.stringify(songs)},${i})'>
            <div class="song-thumb">${cover ? `<img src="${cover}" loading="lazy" alt="${esc(s.title)}">` : '🎵'}</div>
            <div class="song-info">
              <div class="song-name">${esc(s.title || 'Unknown')}</div>
              <div class="song-meta">${esc(s.artist || '—')} · ${esc(s.album || '')}</div>
            </div>
            <div class="song-dur">${formatDur(s.duration || 0)}</div>
          </div>`;
        }).join('');
      }
      if (!songs.length && !albums.length && !artists.length) {
        html = `<div class="empty-state"><div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No results</div>
          <div class="empty-state-sub">Try a different search</div></div>`;
      }
      el.innerHTML = html;
    } catch(e) {
      console.error('Search error:', e);
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Search failed</div>
        <div class="empty-state-sub">${e.message}</div></div>`;
    }
  }, 400);
}

// ─── NAV ───────────────────────────────────────────────
function showNav(name) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${name}`);
  if (navEl) navEl.classList.add('active');
}

// ─── UTILS ─────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDur(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(Math.floor(s)).padStart(2,'0')}`;
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── PWA FUNCTIONS ─────────────────────────────────────
async function updateCacheStatus() {
  const statusEl = document.getElementById('cache-status');
  if (!statusEl) return;
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const totalSize = await Promise.all(
        cacheNames.map(async name => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return keys.length;
        })
      );
      const total = totalSize.reduce((a, b) => a + b, 0);
      statusEl.textContent = `${total} items cached`;
    } catch (error) {
      console.error('Cache status error:', error);
      statusEl.textContent = 'Cache unavailable';
    }
  } else {
    statusEl.textContent = 'Cache not supported';
  }
}

async function clearCache() {
  if (!('caches' in window)) {
    showToast('⚠ Cache not supported');
    return;
  }
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    showToast('✓ Cache cleared');
    updateCacheStatus();
  } catch (error) {
    console.error('Clear cache error:', error);
    showToast('⚠ Failed to clear cache');
  }
}

async function cacheAlbumData(albums) {
  if (!('caches' in window)) return;
  
  try {
    const cache = await caches.open('cauzify-images-v1');
    const urls = albums
      .filter(a => a.coverArt)
      .map(a => coverArtUrl(a.coverArt))
      .slice(0, 20); // Limit to first 20
    
    await Promise.all(
      urls.map(url => 
        fetch(url)
          .then(response => response.ok ? cache.put(url, response) : null)
          .catch(err => console.error('Cache fetch error:', err))
      )
    );
  } catch (error) {
    console.error('Cache album data error:', error);
  }
}

function installPWA() {
  if (!deferredPrompt) {
    showToast('⚠ Install not available');
    return;
  }
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choiceResult => {
    if (choiceResult.outcome === 'accepted') {
      showToast('✓ App installing…');
    }
    deferredPrompt = null;
    document.getElementById('install-prompt').style.display = 'none';
  });
}

// ─── NETWORK STATUS ────────────────────────────────────
function updateNetworkStatus() {
  isOnline = navigator.onLine;
  const statusEl = document.getElementById('network-status');
  if (statusEl) {
    statusEl.style.display = isOnline ? 'none' : 'block';
  }
  
  const badge = document.getElementById('server-badge');
  if (badge && !isOnline) {
    badge.style.background = 'rgba(248,113,113,.1)';
    badge.style.borderColor = 'rgba(248,113,113,.25)';
    badge.querySelector('.server-badge-dot').style.background = '#f87171';
  } else if (badge && isOnline) {
    badge.style.background = 'rgba(74,222,128,.1)';
    badge.style.borderColor = 'rgba(74,222,128,.25)';
    badge.querySelector('.server-badge-dot').style.background = '#4ade80';
  }
}

// ─── INIT ──────────────────────────────────────────────
function init() {
  // Auto-login if credentials exist
  const sv = localStorage.getItem('Cauzify_server');
  const su = localStorage.getItem('Cauzify_user');
  const sp = localStorage.getItem('Cauzify_pass');
  const session = localStorage.getItem('Cauzify_session');
  
  if (sv && su && sp && session) {
    document.getElementById('server-url').value = sv;
    document.getElementById('username').value = su;
    document.getElementById('password').value = sp;
    state.server = sv;
    state.user = su;
    state.pass = sp;
    
    api('ping')
      .then(() => {
        state.connected = true;
        showApp();
        loadHome();
      })
      .catch(err => {
        console.error('Auto-login failed:', err);
      });
  }

  // Enter key to login
  ['server-url','username','password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
      });
    }
  });

  // Touch gestures for full player
  let touchY = 0;
  const ps = document.getElementById('player-screen');
  ps.addEventListener('touchstart', e => {
    touchY = e.touches[0].clientY;
  }, { passive: true });
  
  ps.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - touchY;
    if (dy > 80) closePlayer();
  }, { passive: true });

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-prompt').style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    showToast('✓ App installed successfully');
    deferredPrompt = null;
    document.getElementById('install-prompt').style.display = 'none';
  });

  // Network status
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // Prevent pull-to-refresh
  let lastTouchY = 0;
  let preventPullToRefresh = false;

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    lastTouchY = e.touches[0].clientY;
    preventPullToRefresh = window.pageYOffset === 0;
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    const touchY = e.touches[0].clientY;
    const touchYDelta = touchY - lastTouchY;
    lastTouchY = touchY;
    
    if (preventPullToRefresh && touchYDelta > 0) {
      e.preventDefault();
      return false;
    }
  }, { passive: false });
}

// ─── GLOBAL APP OBJECT ─────────────────────────────────
// Expose functions to global scope for onclick handlers
const app = {
  doLogin,
  disconnect,
  openPlayer,
  closePlayer,
  openSettings,
  closeSettings,
  switchTab,
  playAlbum,
  playSong,
  loadQueue,
  togglePlay,
  nextTrack,
  prevTrack,
  toggleShuffle,
  toggleRepeat,
  toggleFav,
  seekTo,
  setVolume,
  toggleQueue,
  jumpQueue,
  doSearch,
  showNav,
  showToast,
  refreshLib,
  clearCache,
  installPWA
};

// Make app globally available
window.app = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('✓ Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.error('✗ Service Worker registration failed:', err);
      });
  });
}

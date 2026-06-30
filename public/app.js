/* ═══════════════════════════════════════════════════════════
   QUINELA MUNDIAL 2026 - Frontend Application
   ═══════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────
let matchesData = {};
let participantsData = [];
let currentPredictions = {};
let selectedParticipant = null;
let isAdmin = false;
let betsEnabled = true;
let betsEnabledR32 = true;
let betsEnabledR16 = true;
let betsEnabledQF = true;
let betsEnabledSF = true;
let betsEnabledThird = true;
let betsEnabledFinal = true;
let showPredictions = true; // Group stage
let showPredictionsR32 = true;
let showPredictionsR16 = true;
let showPredictionsQF = true;
let showPredictionsSF = true;
let showPredictionsThird = true;
let showPredictionsFinal = true;
let showAciertos = true;
let showPendientes = true;
let adEnabled = false;
let adTitle = "";
let adDescription = "";
let adLink = "";
let adImage = "";
let adFrequency = "session";
let pointsWin = 3;
let pointsDraw = 1;
let pointsKoResult = 2;
let pointsKoScoreA = 1;
let pointsKoScoreB = 1;
let predictionStats = {};
let standingsData = {};
let flagEffectsData = {};
let adminShowGroupHistory = false;
let activeAdminVersusRound = 'R32';
let tempPredictions = {};
let activeTendenciasFilter = 'all';
let lastSeenLeaderboardMaxPoints = -1;
let unlockedGroups = {};
let unlockedMatches = {};

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23818cf8" rx="40"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="36" fill="white">⚽</text></svg>');

// ─── DOM Elements ───────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  setupKnockoutTabs();
  loadData();
  loadBracket();
});

// ─── Tab Navigation ─────────────────────────────────────
function setupTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      $(`#section${capitalize(targetTab)}`).classList.add('active');
      
      if (targetTab === 'knockout') {
        loadBracket();
      }
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Event Listeners ────────────────────────────────────
function setupEventListeners() {
  // Add participant
  $('#btnAddParticipant').addEventListener('click', addParticipant);
  $('#participantName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addParticipant();
  });

  // Reset participant password (Admin)
  if ($('#btnResetPassword')) {
    $('#btnResetPassword').addEventListener('click', adminResetPassword);
    $('#resetPasswordInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') adminResetPassword();
    });
  }

  // Participant Login
  $('#btnParticipantLogin').addEventListener('click', participantLogin);
  $('#loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') participantLogin();
  });
  
  // Participant Logout
  $('#btnParticipantLogout').addEventListener('click', participantLogout);

  // Admin login & logout
  $('#btnAdminLogin').addEventListener('click', adminLogin);
  $('#adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') adminLogin();
  });

  // Bets toggle
  $('#betsToggle').addEventListener('change', toggleBets);

  // Knockout phase toggles
  const phases = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
  phases.forEach(phase => {
    const pToggle = $(`#betsToggle${phase}`);
    if (pToggle) {
      pToggle.addEventListener('change', () => toggleBetsPhase(phase));
    }
  });

  // Predictions toggle
  if ($('#predictionsToggle')) {
    $('#predictionsToggle').addEventListener('change', () => togglePredictionsVisibility('groups'));
  }
  phases.forEach(phase => {
    const pToggle = $(`#predictionsToggle${phase}`);
    if (pToggle) {
      pToggle.addEventListener('change', () => togglePredictionsVisibilityPhase(phase));
    }
  });
  if ($('#aciertosToggle')) {
    $('#aciertosToggle').addEventListener('change', toggleAciertosVisibility);
  }
  if ($('#pendientesToggle')) {
    $('#pendientesToggle').addEventListener('change', togglePendientesVisibility);
  }

  // Celebrations toggle
  if ($('#celebrationsToggle')) {
    $('#celebrationsToggle').addEventListener('change', toggleCelebrations);
  }

  // Participant history select
  $('#historyParticipantSelect').addEventListener('change', (e) => {
    const id = e.target.value;
    if (id) {
      loadParticipantHistory(id);
    } else {
      $('#historyContainer').style.display = 'none';
    }
  });
  $('#btnAdminLogout').addEventListener('click', adminLogout);
  $('#formTestMatch').addEventListener('submit', createTestMatch);
  $('#btnSaveTheme').addEventListener('click', saveTheme);
  
  // Rules PDF Upload
  const formUploadRules = $('#formUploadRules');
  if (formUploadRules) {
    formUploadRules.addEventListener('submit', uploadRulesPDF);
  }
  
  if ($('#btnSavePoints')) {
    $('#btnSavePoints').addEventListener('click', savePoints);
  }

  if ($('#btnResetMatches')) {
    $('#btnResetMatches').addEventListener('click', resetMatches);
  }

  // Knockout Advance
  if ($('#btnAdvancePhase')) {
    $('#btnAdvancePhase').addEventListener('click', advanceTournamentPhase);
  }
  if ($('#btnResetPhase')) {
    $('#btnResetPhase').addEventListener('click', resetTournamentPhase);
  }
  if ($('#btnResetPoints')) {
    $('#btnResetPoints').addEventListener('click', resetPoints);
  }

  // Virus Gratis
  $('#btnVirus').addEventListener('click', openVirusModal);
  $('#btnVirusClose').addEventListener('click', () => $('#virusModal').classList.remove('show'));
  $('#virusModal').addEventListener('click', (e) => {
    if (e.target === $('#virusModal')) $('#virusModal').classList.remove('show');
  });

  // Modal close
  const historyModal = $('#historyModal');
  if ($('#btnModalClose')) {
    $('#btnModalClose').addEventListener('click', () => {
      historyModal.classList.remove('show');
    });
  }
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) {
        historyModal.classList.remove('show');
      }
    });
  }

  // Interactive Flags
  setupInteractiveFlags();
}

let currentFlagTarget = null;
function setupInteractiveFlags() {
  document.addEventListener('click', (e) => {
    const flag = e.target.closest('.team-flag');
    const menu = $('#flagContextMenu');
    
    if (flag) {
      e.preventDefault();
      currentFlagTarget = flag;
      
      const rect = flag.getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
      menu.style.left = `${rect.left + window.scrollX}px`;
      menu.classList.add('show');
    } else if (!e.target.closest('.flag-menu')) {
      if (menu) menu.classList.remove('show');
    }
  });

  $('#btnFestejo').addEventListener('click', async () => {
    if (!currentFlagTarget) return;
    
    const flagCode = currentFlagTarget.dataset.flag;
    
    currentFlagTarget.classList.remove('defeat-anim', 'celebrate-anim');
    void currentFlagTarget.offsetWidth; // Trigger reflow
    currentFlagTarget.classList.add('celebrate-anim');
    
    const parent = currentFlagTarget.parentElement;
    if (parent && parent.style.position === 'relative') {
      let badge = parent.querySelector('.mini-confetti-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'mini-confetti-badge';
        badge.textContent = '🎉';
        parent.appendChild(badge);
      }
    }
    
    if (window.confetti && window.celebrationsEnabled !== false) {
      const rect = currentFlagTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({ particleCount: 50, spread: 60, origin: { x, y }, colors: ['#fbbf24', '#ffffff', '#3b82f6'] });
    }
    
    $('#flagContextMenu').classList.remove('show');
    
    if (flagCode) {
      await fetch('/api/flags/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flagCode, effect: 'celebrate-anim' })
      });
      flagEffectsData[flagCode] = { effect: 'celebrate-anim' };
    }
  });

  $('#btnDerrota').addEventListener('click', async () => {
    if (!currentFlagTarget) return;
    
    const flagCode = currentFlagTarget.dataset.flag;
    
    currentFlagTarget.classList.remove('celebrate-anim', 'defeat-anim');
    void currentFlagTarget.offsetWidth;
    currentFlagTarget.classList.add('defeat-anim');
    
    const parent = currentFlagTarget.parentElement;
    if (parent && parent.style.position === 'relative') {
      const badge = parent.querySelector('.mini-confetti-badge');
      if (badge) badge.remove();
    }
    
    $('#flagContextMenu').classList.remove('show');
    
    if (flagCode) {
      await fetch('/api/flags/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flagCode, effect: 'defeat-anim' })
      });
      flagEffectsData[flagCode] = { effect: 'defeat-anim' };
    }
  });
}

let tournamentPhase = 'groups';
window.allGlobalPredictions = { enabled: false, data: [] };

// ─── Data Loading ───────────────────────────────────────
async function loadData() {
  try {
    const [matchesRes, participantsRes, statsRes, settingsRes, predStatsRes, standingsRes, flagsRes, allMatchesRes, allPredsRes] = await Promise.all([
      fetch('/api/matches'),
      fetch('/api/participants'),
      fetch('/api/stats'),
      fetch('/api/settings'),
      fetch('/api/stats/predictions'),
      fetch('/api/standings'),
      fetch('/api/flags/effects'),
      fetch('/api/matches/all'),
      fetch('/api/predictions/all')
    ]);
    
    matchesData = await matchesRes.json();
    participantsData = await participantsRes.json();
    const stats = await statsRes.json();
    const settings = await settingsRes.json();
    predictionStats = await predStatsRes.json();
    standingsData = await standingsRes.json();
    flagEffectsData = await flagsRes.json();
    
    if (allPredsRes.ok) {
      window.allGlobalPredictions = await allPredsRes.json();
    }
    
    const allMatchesFlat = await allMatchesRes.json();
    if (!window.previousMatchesFlat) {
      window.previousMatchesFlat = allMatchesFlat;
    }
    
    // Theme application
    document.documentElement.style.setProperty('--theme-color', settings.theme);
    if ($('#themeColorPicker')) $('#themeColorPicker').value = settings.theme;

    // Bets enabled state
    betsEnabled = settings.betsEnabled;
    betsEnabledR32 = settings.betsEnabledR32 !== undefined ? settings.betsEnabledR32 : true;
    betsEnabledR16 = settings.betsEnabledR16 !== undefined ? settings.betsEnabledR16 : true;
    betsEnabledQF = settings.betsEnabledQF !== undefined ? settings.betsEnabledQF : true;
    betsEnabledSF = settings.betsEnabledSF !== undefined ? settings.betsEnabledSF : true;
    betsEnabledThird = settings.betsEnabledThird !== undefined ? settings.betsEnabledThird : true;
    betsEnabledFinal = settings.betsEnabledFinal !== undefined ? settings.betsEnabledFinal : true;
    updateBetsUI();

    // Predictions visibility state
    showPredictions = settings.showPredictions !== undefined ? settings.showPredictions : true;
    showPredictionsR32 = settings.showPredictionsR32 !== undefined ? settings.showPredictionsR32 : true;
    showPredictionsR16 = settings.showPredictionsR16 !== undefined ? settings.showPredictionsR16 : true;
    showPredictionsQF = settings.showPredictionsQF !== undefined ? settings.showPredictionsQF : true;
    showPredictionsSF = settings.showPredictionsSF !== undefined ? settings.showPredictionsSF : true;
    showPredictionsThird = settings.showPredictionsThird !== undefined ? settings.showPredictionsThird : true;
    showPredictionsFinal = settings.showPredictionsFinal !== undefined ? settings.showPredictionsFinal : true;
    updatePredictionsUI();
    
    // Aciertos visibility state
    showAciertos = settings.showAciertos !== undefined ? settings.showAciertos : true;
    showPendientes = settings.showPendientes !== undefined ? settings.showPendientes : true;
    updateAciertosUI();
    
    // Celebrations state
    window.celebrationsEnabled = settings.celebrationsEnabled !== undefined ? settings.celebrationsEnabled : true;
    if (typeof updateCelebrationsUI === 'function') {
      updateCelebrationsUI(window.celebrationsEnabled);
    }
    
    // Points settings
    pointsWin = settings.pointsWin !== undefined ? settings.pointsWin : 3;
    pointsDraw = settings.pointsDraw !== undefined ? settings.pointsDraw : 1;
    pointsKoResult = settings.pointsKoResult !== undefined ? settings.pointsKoResult : 2;
    pointsKoScoreA = settings.pointsKoScoreA !== undefined ? settings.pointsKoScoreA : 1;
    pointsKoScoreB = settings.pointsKoScoreB !== undefined ? settings.pointsKoScoreB : 1;
    
    if ($('#inputPointsWin')) $('#inputPointsWin').value = pointsWin;
    if ($('#inputPointsDraw')) $('#inputPointsDraw').value = pointsDraw;
    if ($('#inputPointsKoResult')) $('#inputPointsKoResult').value = pointsKoResult;
    if ($('#inputPointsKoScoreA')) $('#inputPointsKoScoreA').value = pointsKoScoreA;
    if ($('#inputPointsKoScoreB')) $('#inputPointsKoScoreB').value = pointsKoScoreB;

    // Tournament Phase
    tournamentPhase = settings.tournamentPhase || 'groups';
    
    if (tournamentPhase === 'knockout') {
      await loadBracket();
    }

    // Ad settings
    adEnabled = settings.adEnabled;
    adTitle = settings.adTitle || '';
    adDescription = settings.adDescription || '';
    adLink = settings.adLink || '';
    adImage = settings.adImage || '';
    adFrequency = settings.adFrequency || 'session';

    // Update Ad Control Card in Admin Panel
    if ($('#adToggle')) $('#adToggle').checked = adEnabled;
    if ($('#adInputTitle')) $('#adInputTitle').value = adTitle;
    if ($('#adInputDescription')) $('#adInputDescription').value = adDescription;
    if ($('#adInputLink')) $('#adInputLink').value = adLink;
    if ($('#adSelectFrequency')) $('#adSelectFrequency').value = adFrequency;
    if ($('#adImagePreview')) {
      if (adImage) {
        $('#adImagePreview').src = adImage;
        $('#adImagePreviewContainer').style.display = 'block';
        $('#adFileName').textContent = adImage.split('/').pop();
      } else {
        $('#adImagePreviewContainer').style.display = 'none';
        $('#adFileName').textContent = 'Ningún archivo seleccionado';
      }
    }

    // Try showing ad modal
    checkAndShowAd();
    
    updateStats(stats);
    renderLeaderboard();
    renderGroups();
    if (!window.skipAdminPanelRender) renderAdminPanel();
    renderTendencias();
    loadFunFacts();
  } catch (err) {
    showToast('Error al cargar datos', 'error');
    console.error(err);
  }
}

function updateStats(stats) {
  $('#statParticipants').textContent = stats.totalParticipants;
  if (tournamentPhase === 'knockout') {
    $('#statPlayed').textContent = `${stats.knockoutPlayed}/${stats.knockoutTotal}`;
  } else {
    $('#statPlayed').textContent = `${stats.groupPlayed}/${stats.groupTotal}`;
  }
  $('#capacityText').textContent = `${stats.totalParticipants}/75 participantes`;
}

// ─── Participants ───────────────────────────────────────
async function addParticipant() {
  const input = $('#participantName');
  const inputPwd = $('#participantPassword');
  const name = input.value.trim();
  const password = inputPwd.value.trim();
  
  if (!name || !password) {
    showToast('El nombre y la contraseña son requeridos', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }
    
    input.value = '';
    inputPwd.value = '';
    showToast(`✅ ${name} agregado con éxito`, 'success');
    loadData();
  } catch (err) {
    showToast('Error al agregar participante', 'error');
  }
}

async function deleteParticipant(id, name) {
  if (!confirm(`¿Eliminar a "${name}" de la quinela? Se borrarán todas sus predicciones.`)) return;
  
  try {
    await fetch(`/api/participants/${id}`, { method: 'DELETE' });
    showToast(`❌ ${name} eliminado`, 'success');
    loadData();
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

async function adminResetPassword() {
  const select = $('#resetPasswordParticipant');
  const inputPwd = $('#resetPasswordInput');
  const id = select.value;
  const password = inputPwd.value.trim();

  if (!id) {
    showToast('Selecciona un participante', 'error');
    return;
  }
  if (!password) {
    showToast('Ingresa una nueva contraseña', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/participants/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Error al restablecer contraseña', 'error');
      return;
    }

    inputPwd.value = '';
    select.value = '';
    const pName = select.options[select.selectedIndex].text;
    showToast(`✅ Contraseña actualizada para ${pName}`, 'success');
  } catch (err) {
    showToast('Error al restablecer contraseña', 'error');
  }
}

async function participantLogin() {
  const name = $('#loginName').value.trim();
  const password = $('#loginPassword').value.trim();

  if (!name || !password) {
    showToast('Ingresa tu nombre y contraseña', 'error');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }

    selectedParticipant = data;
    $('#loggedInName').textContent = data.name;
    $('#loggedInNickname').textContent = data.nickname ? `"${data.nickname}"` : '';
    
    // Set header avatar
    const avatarSrc = data.avatar || DEFAULT_AVATAR;
    $('#headerAvatarImg').src = avatarSrc;
    
    $('#participantLoginCard').style.display = 'none';
    $('#participantHeaderCard').style.display = 'flex';
    $('#groupsGrid').style.display = 'grid';
    $('#participantHeaderStats').style.display = 'flex';
    
    showToast(`👋 ¡Hola ${data.nickname || data.name}!`, 'success');
    loadPredictions(selectedParticipant.id);
  } catch (err) {
    showToast('Error al iniciar sesión', 'error');
  }
}

function participantLogout() {
  selectedParticipant = null;
  currentPredictions = {};
  tempPredictions = {};
  unlockedGroups = {};
  unlockedMatches = {};
  
  $('#loginPassword').value = '';
  $('#participantLoginCard').style.display = 'flex';
  $('#participantHeaderCard').style.display = 'none';
  $('#groupsGrid').style.display = 'none';
  $('#headerAvatarImg').src = DEFAULT_AVATAR;
  $('#loggedInNickname').textContent = '';
  
  renderGroups();
  renderLeaderboard();
  renderBracket();
  showToast('🔒 Has cerrado sesión', 'success');
}

// ─── Leaderboard ────────────────────────────────────────
function renderLeaderboard() {
  const container = $('#leaderboardContainer');
  const empty = $('#emptyLeaderboard');
  
  if (participantsData.length === 0) {
    container.innerHTML = '';
    container.appendChild(createEmptyState());
    return;
  }
  
  const totalMatches = Object.values(matchesData).reduce((sum, group) => sum + group.length, 0);
  
  // Calculate highest points to support multiple co-winners
  const maxPoints = Math.max(...participantsData.map(p => p.points));
  
  // Confetti burst on leader score updates
  if (maxPoints > 0 && maxPoints > lastSeenLeaderboardMaxPoints) {
    triggerLeaderboardCelebration();
    lastSeenLeaderboardMaxPoints = maxPoints;
  }
  
  const table = document.createElement('table');
  table.className = 'leaderboard-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>Participante</th>
        ${showAciertos ? '<th style="text-align:center">Aciertos</th>' : ''}
        ${showPendientes ? '<th style="text-align:center">Pendientes</th>' : ''}
        <th style="text-align:center">Puntos</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        let currentRank = 1;
        let lastPoints = null;
        
        return participantsData.map((p, i) => {
          if (lastPoints !== null && p.points < lastPoints) {
            currentRank++;
          }
          lastPoints = p.points;
          const rank = currentRank;
          
          const isPodium = rank <= 3 && p.points > 0;
          const rankClass = isPodium ? `rank-${rank}` : 'rank-default';
          
          // Highlight all participants sharing the max score
          const isLeader = maxPoints > 0 && p.points === maxPoints;
          const rowClass = isLeader ? 'leaderboard-leader-row' : '';
          
          const medal = isPodium ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : '';
          const pending = p.pending_predictions !== undefined ? p.pending_predictions : Math.max(0, totalMatches - p.total_predictions);
          
          const isClickable = isAdmin || 
                              (selectedParticipant && selectedParticipant.id === p.id) || 
                              showPredictions || 
                              showPredictionsR32 || 
                              showPredictionsR16 || 
                              showPredictionsQF || 
                              showPredictionsSF || 
                              showPredictionsThird || 
                              showPredictionsFinal;
          const clickableClass = isClickable ? 'clickable-row' : 'non-clickable-row';
          
          if (selectedParticipant && p.id === selectedParticipant.id) {
            updateHeaderStats({
              points: p.points,
              rank: rank,
              aciertos: p.aciertos,
              pending: pending
            });
          }

          const avatarClass = isPodium ? `rank-${rank}-avatar` : '';
          const avatarSrc = p.avatar || DEFAULT_AVATAR;
          const displayName = p.nickname
            ? `<span class="leaderboard-name-group">
                 <span class="leaderboard-nickname">${escapeHtml(p.nickname)}</span>
                 <span class="leaderboard-realname">${escapeHtml(p.name)}</span>
               </span>`
            : `<span>${escapeHtml(p.name)}</span>`;
          
          return `
            <tr class="leaderboard-row-animate ${rowClass} ${clickableClass}" style="animation-delay: ${i * 0.05}s" onclick="handleLeaderboardRowClick(${p.id}, '${escapeHtml(p.name)}')">
              <td class="rank-cell">
                <span class="rank-badge ${rankClass}">${medal || rank}</span>
              </td>
              <td class="name-cell">
                <div style="position: relative; display: inline-flex; align-items: center; vertical-align: middle; margin-right: 8px;">
                  <img class="leaderboard-avatar ${avatarClass}" src="${avatarSrc}" alt="${escapeHtml(p.name)}" onerror="this.src='${DEFAULT_AVATAR}'">
                  ${isPodium && rank === 1 ? '<span class="mini-rank-badge gold-badge">✨</span>' : ''}
                  ${isPodium && rank === 2 ? '<span class="mini-rank-badge bronze-badge">✨</span>' : ''}
                  ${isPodium && rank === 3 ? '<span class="mini-rank-badge silver-badge">✨</span>' : ''}
                </div>
                ${displayName}
              </td>
              ${showAciertos ? `<td class="aciertos-cell" style="text-align:center">${p.aciertos}</td>` : ''}
              ${showPendientes ? `
              <td class="pending-cell" style="text-align:center">
                <span class="badge ${pending > 0 ? 'badge-warning' : 'badge-success'}">${pending}</span>
              </td>
              ` : ''}
              <td class="points-cell" style="text-align:center; font-weight: 800; color: var(--gold);">${p.points}</td>
              <td>
                ${isAdmin ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteParticipant(${p.id}, '${escapeHtml(p.name)}')" title="Eliminar">🗑️</button>` : ''}
              </td>
            </tr>
          `;
        }).join('');
      })()}
    </tbody>
  `;
  
  container.innerHTML = '';
  container.appendChild(table);
}

// Function to trigger two side confetti sprays celebrating the leaders
function triggerLeaderboardCelebration() {
  if (window.confetti && window.celebrationsEnabled !== false) {
    // Left spray
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.85 }
    });
    // Right spray
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.85 }
    });
  }
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <span class="empty-icon">📋</span>
    <p>No hay participantes aún</p>
    <p class="empty-sub">Agrega participantes para comenzar la quinela</p>
  `;
  return div;
}

// ─── Utilities & Helpers ─────────────────────────────────
function getFlagUrl(flagCode) {
  if (!flagCode) return 'https://flagcdn.com/w40/un.png';
  if (flagCode.startsWith('/')) return flagCode; // Local upload
  return `https://flagcdn.com/w40/${flagCode}.png`;
}

let activeVersusRound = 'R32';
let activeGroupViewTab = 'versus'; // 'versus' o 'history'

function setGroupViewTab(tab) {
  activeGroupViewTab = tab;
  renderGroups();
}

function renderGroups() {
  const grid = $('#groupsGrid');
  grid.innerHTML = '';
  
  // Si estamos en fase de eliminación, mostrar sub-pestañas
  if (tournamentPhase === 'knockout') {
    grid.style.display = 'block'; // Quitar el grid para permitir encabezados anchos
    
    // Contenedor de Sub-Pestañas
    const subTabsHeader = document.createElement('div');
    subTabsHeader.className = 'sub-tabs-container';
    subTabsHeader.innerHTML = `
      <button class="sub-tab-btn ${activeGroupViewTab === 'versus' ? 'active' : ''}" onclick="setGroupViewTab('versus')">
        ⚔️ Duelos de Eliminatoria
      </button>
      <button class="sub-tab-btn ${activeGroupViewTab === 'history' ? 'active' : ''}" onclick="setGroupViewTab('history')">
        📋 Historial de Grupos
      </button>
    `;
    grid.appendChild(subTabsHeader);
    
    // Renderizar según sub-pestaña
    if (activeGroupViewTab === 'versus') {
      const versusContainer = document.createElement('div');
      versusContainer.className = 'versus-container';
      grid.appendChild(versusContainer);
      renderKnockoutVersus(versusContainer);
    } else {
      // Vista Historial de Grupos
      const historyHeader = document.createElement('div');
      historyHeader.className = 'knockout-phase-banner history-phase-banner';
      historyHeader.style.marginBottom = '25px';
      historyHeader.innerHTML = `
        <h3>📋 Historial de Fase de Grupos</h3>
        <p>Las apuestas e historial de esta fase se encuentran bloqueados y cerrados para consulta.</p>
      `;
      grid.appendChild(historyHeader);
      
      const groupsContainer = document.createElement('div');
      groupsContainer.className = 'groups-grid';
      groupsContainer.style.display = 'grid'; // Restaurar el comportamiento de grid internamente
      grid.appendChild(groupsContainer);
      
      renderGroupStageCards(groupsContainer, true);
    }
    return;
  }
  
  // Vista normal de grupos activos
  grid.style.display = '';
  renderGroupStageCards(grid, false);
}

function renderGroupStageCards(container, isHistoryView) {
  const groupNames = Object.keys(matchesData).sort((a, b) => {
    if (a === 'Prueba') return -1;
    if (b === 'Prueba') return 1;
    return a.localeCompare(b);
  });
  for (const groupName of groupNames) {
    const matches = matchesData[groupName];
    const card = document.createElement('div');
    card.className = 'group-card';
    
    const groupStandings = standingsData[groupName];
    const standingsHtml = groupStandings ? renderStandingsTable(groupStandings) : '';
    
    const isGroupSaved = matches.length > 0 && matches.every(m => {
      const pred = tempPredictions[m.id];
      const saved = currentPredictions[m.id];
      return saved !== undefined && pred === saved;
    });

    card.innerHTML = `
      <div class="group-header">
        <span class="group-letter">Grupo ${groupName}</span>
        <span class="group-label">${matches.length} partidos</span>
      </div>
      ${standingsHtml}
      <div class="group-matches">
        ${matches.map(m => renderMatchCard(m)).join('')}
      </div>
      ${selectedParticipant && !isHistoryView && betsEnabled ? `
        <div class="group-footer" style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; background: rgba(0,0,0,0.1); gap: 8px;">
          ${isGroupSaved && !unlockedGroups[groupName] ? `
            <button class="btn btn-secondary btn-modify-group" onclick="unlockGroup('${groupName}')" style="display: flex; align-items: center; gap: 6px;">
              <span>✏️ Modificar Pronósticos</span>
            </button>
          ` : `
            <button class="btn btn-primary btn-save-group" onclick="saveGroupBets(this, '${groupName}')">
              <span class="btn-text">💾 Guardar Apuestas</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>
          `}
        </div>
      ` : ''}
    `;
    
    container.appendChild(card);
  }
}

function renderKnockoutVersus(container) {
  // Phase banner
  const banner = document.createElement('div');
  banner.className = 'knockout-phase-banner';
  banner.innerHTML = `
    <h3>⚔️ Fase de Eliminatorias</h3>
    <p>${selectedParticipant ? 'Selecciona al ganador de cada duelo' : 'Inicia sesión para hacer tus pronósticos'}</p>
    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; font-style: italic;">* Ganador o Empate dentro del Tiempo Regular, 90 min Reglamentarios</p>
  `;
  container.appendChild(banner);
  
  // Round tabs
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'knockout-groups-tabs';
  
  const VERSUS_ROUND_LABELS = {
    'R32': '⚔️ Ronda de 32',
    'R16': '🏅 Octavos',
    'QF': '🔥 Cuartos',
    'SF': '💎 Semifinales',
  'Third': '🥉 Tercer Lugar',
    'Third': '🥉 Tercer Lugar',
    'Final': '🏆 Final'
  };
  
  for (const round of ROUND_ORDER) {
    const tab = document.createElement('button');
    let isDisabled = false;
    
    // Tab is enabled consistently with other rounds
    
    tab.className = `knockout-groups-tab ${round === activeVersusRound ? 'active' : ''} ${isDisabled ? 'disabled-tab' : ''}`;
    tab.textContent = VERSUS_ROUND_LABELS[round] || round;
    
    if (isDisabled) {
      tab.disabled = true;
      tab.style.opacity = '0.4';
      tab.style.cursor = 'not-allowed';
      tab.title = 'Se habilitará automáticamente al definirse los equipos';
    } else {
      tab.addEventListener('click', () => {
        activeVersusRound = round;
        renderGroups();
      });
    }
    tabsDiv.appendChild(tab);
  }
  container.appendChild(tabsDiv);
  
  // VS Cards for the active round
  const roundMatches = bracketData[activeVersusRound] || [];
  
  if (roundMatches.length === 0) {
    container.innerHTML += `
      <div class="empty-state">
        <span class="empty-icon">🔒</span>
        <p>No hay partidos definidos para esta ronda</p>
      </div>
    `;
    return;
  }
  
  for (let i = 0; i < roundMatches.length; i++) {
    const match = roundMatches[i];
    const isTBD = match.team_a === 'A definir' || match.team_b === 'A definir';
    const hasResult = match.result !== null;
    const prediction = tempPredictions[match.id] || currentPredictions[match.id];
    const savedPrediction = currentPredictions[match.id];
    
    let isSaved = false;
    if (savedPrediction) {
      const p1 = typeof prediction === 'object' ? prediction : { prediction: prediction, score_a: null, score_b: null };
      const p2 = typeof savedPrediction === 'object' ? savedPrediction : { prediction: savedPrediction, score_a: null, score_b: null };
      isSaved = p1.prediction === p2.prediction && p1.score_a === p2.score_a && p1.score_b === p2.score_b;
    }
    
    // prediction is either a string outcome (e.g. legacy) or object with score_a/b
    const pred_score_a = (prediction && typeof prediction === 'object' && prediction.score_a !== null) ? prediction.score_a : '';
    const pred_score_b = (prediction && typeof prediction === 'object' && prediction.score_b !== null) ? prediction.score_b : '';
    const pred_outcome = (prediction && typeof prediction === 'object') ? prediction.prediction : prediction;

    const card = document.createElement('div');
    card.className = `vs-card ${hasResult ? 'has-result' : ''} ${isTBD ? 'tbd-card' : ''}`;
    card.style.animationDelay = `${i * 0.06}s`;
    
    // Date (Hidden per user request)
    let dateHtml = '';
    // Winner/loser classes
    const teamAClass = hasResult ? (match.result === 'A' ? 'winner-team' : 'loser-team') : '';
    const teamBClass = hasResult ? (match.result === 'B' ? 'winner-team' : 'loser-team') : '';
    
    // Effects
    const effectA = flagEffectsData[match.flag_a] ? flagEffectsData[match.flag_a].effect : '';
    const effectB = flagEffectsData[match.flag_b] ? flagEffectsData[match.flag_b].effect : '';
    
    // Prediction inputs
    let predictionHtml = '';
    const phaseLocked = isKnockoutPhaseLocked(activeVersusRound);
    if (selectedParticipant && !isTBD) {
      const disabledAttr = (phaseLocked || (isSaved && !unlockedMatches[match.id]) || hasResult) ? 'disabled' : '';
      predictionHtml = `
        <div class="vs-prediction-row" style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 12px; margin-bottom: 8px;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase;">Goles Local</span>
            <input type="number" class="score-input" value="${pred_score_a}" min="0" max="99" 
                   style="width: 46px; text-align: center; padding: 6px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-family: inherit; font-size: 0.95rem; font-weight: bold;" 
                   oninput="setVsScore(${match.id}, 'A', this.value)" ${disabledAttr}>
          </div>
          <span style="font-weight: bold; margin-top: 15px; color: var(--text-muted);">-</span>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase;">Goles Visita</span>
            <input type="number" class="score-input" value="${pred_score_b}" min="0" max="99" 
                   style="width: 46px; text-align: center; padding: 6px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-family: inherit; font-size: 0.95rem; font-weight: bold;" 
                   oninput="setVsScore(${match.id}, 'B', this.value)" ${disabledAttr}>
          </div>
        </div>
        <div class="prediction-row" style="margin-top: 10px; margin-bottom: 5px;">
          <button id="btn-pred-${match.id}-A" class="pred-btn ${pred_outcome === 'A' ? 'selected-a' : ''}" 
                  style="pointer-events: none;" ${disabledAttr}>
            ${match.team_a}
            <span class="pred-label">Gana</span>
          </button>
          <button id="btn-pred-${match.id}-D" class="pred-btn ${pred_outcome === 'D' ? 'selected-d' : ''}" 
                  style="pointer-events: none;" ${disabledAttr}>
            Empate
          </button>
          <button id="btn-pred-${match.id}-B" class="pred-btn ${pred_outcome === 'B' ? 'selected-b' : ''}" 
                  style="pointer-events: none;" ${disabledAttr}>
            ${match.team_b}
            <span class="pred-label">Gana</span>
          </button>
        </div>
        ${hasResult ? '' : (!phaseLocked ? `
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 10px;">
            <button class="btn-save-single-match" 
                    onclick="saveSinglePrediction(${match.id}, this, true)" 
                    ${isSaved && !unlockedMatches[match.id] ? 'disabled' : ''} 
                    style="flex: 1; margin: 0;">
              <span>${isSaved && !unlockedMatches[match.id] ? '✅ Pronóstico Guardado' : '💾 Guardar Pronóstico'}</span>
            </button>
            ${isSaved && !unlockedMatches[match.id] ? `
              <button class="btn btn-secondary btn-modify-prediction" 
                      onclick="unlockPrediction(${match.id})" 
                      style="padding: 6px 12px; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; border-radius: var(--radius); height: 100%; border: 1px solid var(--border);">
                ✏️ Modificar
              </button>
            ` : ''}
          </div>
        ` : '<div class="vs-result-badge vs-result-pending">🔒 Pronósticos cerrados para esta fase</div>')}
      `;
    } else if (selectedParticipant && !hasResult && isTBD) {
      predictionHtml = `<div class="vs-result-badge vs-result-pending">⏳ Equipos por definir</div>`;
    } else if (!selectedParticipant && !isTBD) {
      predictionHtml = `<div class="vs-result-badge vs-result-pending">🔒 Inicia sesión para pronosticar</div>`;
    }
    
    // Result badge & points display
    let resultBadge = '';
    let pointsEarnedHtml = '';
    if (hasResult && selectedParticipant) {
      if (!prediction || pred_outcome === null) {
        resultBadge = `<div class="vs-result-badge vs-result-pending">⚪ Sin pronóstico (0 pts)</div>`;
        pointsEarnedHtml = `
          <div style="position: absolute; top: -10px; left: 10px; background: var(--red-dim); border: 1px solid rgba(248, 113, 113, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; color: var(--red); box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 10; display: flex; align-items: center;">
            +0 pts
          </div>
        `;
      } else {
        const matchOutcome = match.result;
        const predOutcome = pred_outcome;
        
        const ptsKoResult = window.pointsRules?.knockout?.result ?? 2;
        const ptsKoScoreA = window.pointsRules?.knockout?.score_a ?? 1;
        const ptsKoScoreB = window.pointsRules?.knockout?.score_b ?? 1;

        const winnerPts = (predOutcome === matchOutcome) ? ptsKoResult : 0;
        const exactScoreAPts = (pred_score_a === match.score_a && pred_score_a !== null && match.score_a !== null) ? ptsKoScoreA : 0;
        const exactScoreBPts = (pred_score_b === match.score_b && pred_score_b !== null && match.score_b !== null) ? ptsKoScoreB : 0;
        
        const earned = winnerPts + exactScoreAPts + exactScoreBPts;
        
        const badgeColor = earned > 0 ? 'var(--green)' : 'var(--red)';
        const badgeBg = earned > 0 ? 'var(--green-dim)' : 'var(--red-dim)';
        const badgeBorder = earned > 0 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)';
        
        pointsEarnedHtml = `
          <div style="position: absolute; top: -10px; left: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; color: ${badgeColor}; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 10; display: flex; align-items: center;">
            +${earned} pt${earned !== 1 ? 's' : ''}
          </div>
        `;
        
        if (predOutcome === matchOutcome) {
          let detailHtml = [];
          if (winnerPts) detailHtml.push(`+${ptsKoResult} por Ganador`);
          if (exactScoreAPts) detailHtml.push(`+${ptsKoScoreA} por goles local`);
          if (exactScoreBPts) detailHtml.push(`+${ptsKoScoreB} por goles visita`);
          
          resultBadge = `
            <div class="vs-result-badge vs-result-correct" style="display: flex; flex-direction: column; align-items: center; line-height: 1.4;">
              <span>✅ ¡Acertaste!</span>
              <span style="font-size: 0.75rem; font-weight: normal; opacity: 0.9;">(${detailHtml.join(', ')})</span>
            </div>
          `;
        } else {
          let detailHtml = [];
          if (exactScoreAPts) detailHtml.push(`+${ptsKoScoreA} por goles local`);
          if (exactScoreBPts) detailHtml.push(`+${ptsKoScoreB} por goles visita`);
          
          if (earned > 0) {
            resultBadge = `
              <div class="vs-result-badge vs-result-wrong" style="display: flex; flex-direction: column; align-items: center; line-height: 1.4; background: rgba(251, 191, 36, 0.15); border-color: var(--gold); color: var(--gold);">
                <span>⚖️ Fallaste el ganador</span>
                <span style="font-size: 0.75rem; font-weight: normal; opacity: 0.9;">(${detailHtml.join(', ')})</span>
              </div>
            `;
          } else {
            resultBadge = `<div class="vs-result-badge vs-result-wrong">❌ Fallaste (0 pts)</div>`;
          }
        }
      }
    } else if (hasResult && !selectedParticipant) {
      resultBadge = `<div class="vs-result-badge vs-result-pending">🏆 Partido Finalizado</div>`;
    }

    const middleText = '<span class="vs-badge">VS</span>';
    
    let finalResultBadge = '';
    if (hasResult) {
      let scoreText = '';
      if (match.score_a !== null && match.score_b !== null && match.score_a !== undefined) {
         scoreText = `${match.score_a} - ${match.score_b}`;
      } else {
         scoreText = match.result === 'A' ? match.team_a : match.result === 'B' ? match.team_b : 'Empate';
      }
      finalResultBadge = `
        <div class="official-result-badge">
          <span style="color: var(--text-muted); text-transform: uppercase; font-size: 0.70rem; letter-spacing: 0.5px;">Resultado Oficial</span>
          <span style="color: var(--gold); font-size: 1.15rem; font-weight: 900; letter-spacing: 1px;">${scoreText}</span>
        </div>
      `;
    }
    
    card.style.position = 'relative';
    card.innerHTML = `
      ${finalResultBadge}
      ${pointsEarnedHtml}
      ${dateHtml}
      <div class="vs-teams-row">
        <div class="vs-team ${teamAClass}">
          <div style="position: relative; display: inline-flex;">
            <img class="vs-team-flag ${effectA}" data-flag="${match.flag_a}" src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            ${effectA === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class="mini-confetti-badge">🎉</span>' : ''}
          </div>
          <span class="vs-team-name">${match.team_a}</span>
        </div>
        ${middleText}
        <div class="vs-team ${teamBClass}">
          <div style="position: relative; display: inline-flex;">
            <img class="vs-team-flag ${effectB}" data-flag="${match.flag_b}" src="${getFlagUrl(match.flag_b)}" alt="${match.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            ${effectB === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class="mini-confetti-badge">🎉</span>' : ''}
          </div>
          <span class="vs-team-name">${match.team_b}</span>
        </div>
      </div>
      ${predictionHtml}
      ${resultBadge}
    `;
    
    container.appendChild(card);
  }

  if (selectedParticipant && roundMatches.length > 0) {
    const footer = document.createElement('div');
    footer.style = "padding: 12px 16px; margin-top: 20px; display: flex; justify-content: flex-end; width: 100%; box-sizing: border-box;";
    footer.innerHTML = `
      <button class="btn btn-primary btn-save-group" onclick="saveKnockoutBets(this)">
        <span class="btn-text">💾 Guardar Apuestas</span>
        <span class="btn-spinner" style="display:none;">⏳</span>
      </button>
    `;
    container.appendChild(footer);
  }
}

function renderStandingsTable(groupData) {
  const { teams, played, total, isComplete } = groupData;
  if (played === 0) return '';
  
  const statusBadge = isComplete 
    ? '<span class="standings-badge complete">✅ Grupo Cerrado</span>' 
    : `<span class="standings-badge in-progress">⚽ ${played}/${total} jugados</span>`;
  
  return `
    <div class="standings-container">
      <div class="standings-title">
        <span>📋 Tabla de Posiciones</span>
        ${statusBadge}
      </div>
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map((t, i) => {
            const rowClass = t.classified ? 'classified-row' : (isComplete && i >= 2) ? 'eliminated-row' : '';
            return `
              <tr class="${rowClass}">
                <td class="pos-cell">
                  ${t.classified ? '🟢' : (isComplete && i >= 2) ? '🔴' : (i + 1)}
                </td>
                <td class="team-cell">
                  <img src="${getFlagUrl(t.flag)}" alt="${t.name}" onerror="this.src='https://flagcdn.com/w40/un.png'">
                  <span>${t.name}</span>
                </td>
                <td>${t.pj}</td>
                <td>${t.w}</td>
                <td>${t.d}</td>
                <td>${t.l}</td>
                <td class="pts-cell">${t.pts}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMatchCard(match) {
  const hasResult = match.result !== null;
  const prediction = tempPredictions[match.id];
  const noParticipant = !selectedParticipant;
  
  const groupMatches = matchesData[match.group_name] || [];
  const isGroupSaved = groupMatches.length > 0 && groupMatches.every(m => {
    const pred = tempPredictions[m.id];
    const saved = currentPredictions[m.id];
    return saved !== undefined && pred === saved;
  });
  const isLocked = isGroupSaved && !unlockedGroups[match.group_name];
  
  const teamAClass = prediction === 'A' ? 'selected' : '';
  const teamBClass = prediction === 'B' ? 'selected' : '';
  const drawClass = prediction === 'D' ? 'selected' : '';
  
  const effectA = flagEffectsData[match.flag_a] ? flagEffectsData[match.flag_a].effect : '';
  const effectB = flagEffectsData[match.flag_b] ? flagEffectsData[match.flag_b].effect : '';
  
  let resultBadge = '';
  if (hasResult && selectedParticipant) {
    if (!prediction) {
      resultBadge = `<div class="match-result-badge result-no-pred">⚪ Sin predicción</div>`;
    } else if (prediction === match.result) {
      const pts = match.result === 'D' ? pointsDraw : pointsWin;
      const reason = match.result === 'D' ? 'empate' : 'ganador';
      resultBadge = `
        <div class="match-result-badge result-correct" style="display: flex; flex-direction: column; align-items: center; line-height: 1.4;">
          <span>✅ ¡Acertaste!</span>
          <span style="font-size: 0.75rem; font-weight: normal; opacity: 0.9;">(+${pts} por acertar al ${reason})</span>
        </div>
      `;
    } else {
      resultBadge = `<div class="match-result-badge result-wrong">❌ Fallaste</div>`;
    }
  } else if (hasResult) {
    const resultText = match.result === 'A' ? `Ganó ${match.team_a}` : match.result === 'B' ? `Ganó ${match.team_b}` : 'Empate';
    resultBadge = `<div class="match-result-badge result-no-pred">📋 ${resultText}</div>`;
  }
  
  return `
    <div class="match-card ${hasResult ? 'has-result' : ''}" style="position: relative;">
      <!-- Date hidden -->
      <div class="match-teams">
        <div class="match-team">
          <div style="position: relative; display: inline-flex;">
            <img class="team-flag ${match.result === 'A' ? 'winner-flag' : ''} ${effectA}" data-flag="${match.flag_a}" src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            ${effectA === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class="mini-confetti-badge">🎉</span>' : ''}
          </div>
          <span class="team-name">${match.team_a}</span>
        </div>
        <span class="match-vs">VS</span>
        <div class="match-team team-b">
          <span class="team-name">${match.team_b}</span>
          <div style="position: relative; display: inline-flex;">
            <img class="team-flag ${match.result === 'B' ? 'winner-flag' : ''} ${effectB}" data-flag="${match.flag_b}" src="${getFlagUrl(match.flag_b)}" alt="${match.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            ${effectB === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class="mini-confetti-badge">🎉</span>' : ''}
          </div>
        </div>
      </div>
      ${!noParticipant ? `
        <div class="prediction-row">
          <button class="pred-btn ${prediction === 'A' ? 'selected-a' : ''}" 
                  onclick="setLocalPrediction(${match.id}, 'A')" 
                  ${hasResult || !betsEnabled || isLocked ? 'disabled' : ''}>
            ${match.team_a}
            <span class="pred-label">Gana</span>
          </button>
          <button class="pred-btn ${prediction === 'D' ? 'selected-d' : ''}" 
                  onclick="setLocalPrediction(${match.id}, 'D')" 
                  ${hasResult || !betsEnabled || isLocked ? 'disabled' : ''}>
            Empate
            <span class="pred-label">1 pt</span>
          </button>
          <button class="pred-btn ${prediction === 'B' ? 'selected-b' : ''}" 
                  onclick="setLocalPrediction(${match.id}, 'B')" 
                  ${hasResult || !betsEnabled || isLocked ? 'disabled' : ''}>
            ${match.team_b}
            <span class="pred-label">Gana</span>
          </button>
        </div>
        ${!betsEnabled && !hasResult ? '<div class="bets-closed-banner">🔒 Apuestas cerradas por el administrador</div>' : ''}
      ` : `<div class="pred-summary">Selecciona tu nombre arriba para predecir</div>`}
      ${resultBadge}
    </div>
  `;
}

// ─── Predictions ────────────────────────────────────────
async function saveGroupBets(btn, groupName) {
  if (!selectedParticipant) {
    showToast('Inicia sesión para guardar tus apuestas', 'error');
    return;
  }
  
  const matches = matchesData[groupName] || [];
  if (matches.length === 0) return;
  
  // Gather predictions for this group from tempPredictions
  const groupPredictions = [];
  for (const m of matches) {
    const pred = tempPredictions[m.id];
    if (pred) {
      groupPredictions.push({ match_id: m.id, prediction: pred });
    }
  }
  
  if (groupPredictions.length === 0) {
    showToast('Selecciona al menos una predicción antes de guardar', 'error');
    return;
  }
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Guardando...</span>';
  btn.classList.add('saving');
  
  try {
    const res = await fetch('/api/predictions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: selectedParticipant.id,
        predictions: groupPredictions
      })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error || 'Error al guardar apuestas', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saving');
      return;
    }
    
    // Sync currentPredictions with tempPredictions for this group
    for (const m of matches) {
      if (tempPredictions[m.id]) {
        currentPredictions[m.id] = tempPredictions[m.id];
      }
    }
    
    btn.innerHTML = '<span class="btn-text">✅ ¡Guardado!</span>';
    btn.classList.replace('saving', 'saved');
    btn.classList.remove('btn-primary');
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 0 15px rgba(52, 211, 153, 0.5)';
    
    if (window.confetti && window.celebrationsEnabled !== false) {
      const rect = btn.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({ particleCount: 30, spread: 40, origin: { x, y }, colors: ['#34d399', '#ffffff'] });
    }
    
    // Avoid loadData() to prevent UI flicker
    // await loadData();
    
    unlockedGroups[groupName] = false;
    
    // Revert after 2 seconds
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saved');
      btn.classList.add('btn-primary');
      btn.style.background = '';
      btn.style.color = '';
      btn.style.boxShadow = '';
      renderGroups();
    }, 2000);
    
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('saving');
  }
}

async function loadPredictions(participantId) {
  try {
    const res = await fetch(`/api/predictions/${participantId}`);
    currentPredictions = await res.json();
    tempPredictions = { ...currentPredictions }; // Copy to buffer
    unlockedGroups = {};
    unlockedMatches = {};
    renderGroups();
    renderLeaderboard();
  } catch (err) {
    showToast('Error al cargar predicciones', 'error');
  }
}

window.setLocalPrediction = function(matchId, prediction) {
  if (!selectedParticipant) {
    showToast('Selecciona tu nombre primero', 'error');
    return;
  }
  let predObj = tempPredictions[matchId];
  if (!predObj || typeof predObj !== 'object') {
    predObj = { prediction: prediction, score_a: null, score_b: null };
  } else {
    predObj.prediction = prediction;
  }
  tempPredictions[matchId] = predObj;
  
  const buttons = document.querySelectorAll(`button[onclick="setLocalPrediction(${matchId}, 'A')"], button[onclick="setLocalPrediction(${matchId}, 'B')"], button[onclick="setLocalPrediction(${matchId}, 'D')"]`);
  buttons.forEach(btn => {
    btn.classList.remove('selected-a', 'selected-b', 'selected-d');
    if (btn.getAttribute('onclick').includes(`'${prediction}'`)) {
      btn.classList.add(`selected-${prediction.toLowerCase()}`);
    }
  });
};

window.saveSinglePrediction = async function(matchId, btn, isKnockout = false) {
  if (!selectedParticipant) {
    showToast('Inicia sesión para guardar tus apuestas', 'error');
    return;
  }

  const pred = tempPredictions[matchId];
  if (!pred) {
    showToast('Por favor, selecciona una predicción primero', 'error');
    return;
  }

  let payload = {
    participant_id: selectedParticipant.id,
    match_id: matchId
  };

  if (isKnockout) {
    if (typeof pred === 'object') {
      if (!pred.prediction) {
        showToast('Debes seleccionar quién gana o empata usando los botones de abajo', 'error');
        return;
      }
      payload.prediction = pred.prediction;
      payload.score_a = (pred.score_a !== null && pred.score_a !== '') ? parseInt(pred.score_a, 10) : null;
      payload.score_b = (pred.score_b !== null && pred.score_b !== '') ? parseInt(pred.score_b, 10) : null;
    } else {
      payload.prediction = pred;
    }
  } else {
    if (typeof pred === 'object') {
      payload.prediction = pred.prediction;
    } else {
      payload.prediction = pred;
    }
  }

  const originalHtml = btn.innerHTML;
  const originalBackground = btn.style.background;
  const originalColor = btn.style.color;
  const originalBorder = btn.style.border;
  const originalBoxShadow = btn.style.boxShadow;

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Guardando...</span>';
  btn.classList.add('saving');

  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Error al guardar la predicción', 'error');
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      btn.classList.remove('saving');
      return;
    }

    if (isKnockout) {
      currentPredictions[matchId] = { 
        prediction: payload.prediction, 
        score_a: payload.score_a, 
        score_b: payload.score_b 
      };
      unlockedMatches[matchId] = false;
    } else {
      currentPredictions[matchId] = payload.prediction;
    }
    tempPredictions[matchId] = currentPredictions[matchId];

    showToast('⚽ Pronóstico guardado con éxito', 'success');

    btn.innerHTML = '<span>✅ Guardado</span>';
    btn.style.background = 'rgba(52, 211, 153, 0.15)';
    btn.style.color = 'var(--green)';
    btn.style.border = '1px solid var(--green)';
    btn.style.boxShadow = 'none';

    if (window.confetti && window.celebrationsEnabled !== false) {
      const rect = btn.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({ particleCount: 15, spread: 30, origin: { x, y }, colors: ['#34d399', '#ffffff'] });
    }

    const card = btn.closest('.vs-card, .match-card');
    if (card) {
      const inputs = card.querySelectorAll('.score-input, .pred-btn');
      inputs.forEach(el => el.disabled = true);
    }

    setTimeout(() => {
      btn.disabled = true;
      btn.classList.remove('saving');
      renderGroups();
    }, 1000);

  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    btn.style.background = originalBackground;
    btn.style.color = originalColor;
    btn.style.border = originalBorder;
    btn.style.boxShadow = originalBoxShadow;
    btn.classList.remove('saving');
  }
};

async function setPrediction(matchId, prediction) {
  if (!selectedParticipant) {
    showToast('Selecciona tu nombre primero', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: selectedParticipant.id,
        match_id: matchId,
        prediction
      })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }
    
    currentPredictions[matchId] = prediction;
    tempPredictions[matchId] = prediction; // Keep buffer in sync
    renderGroups();
  } catch (err) {
    showToast('Error al guardar predicción', 'error');
  }
}

window.setVsScore = function(matchId, team, val) {
  if (!selectedParticipant) {
    showToast('Selecciona tu nombre primero', 'error');
    return;
  }
  
  let predObj = tempPredictions[matchId];
  if (!predObj || typeof predObj !== 'object') {
    // If it was a string (legacy/group stage) or empty, initialize as object
    const legacyPred = (predObj && typeof predObj === 'string') ? predObj : null;
    predObj = { prediction: legacyPred, score_a: null, score_b: null };
  }
  
  const valInt = val.trim() === '' ? null : parseInt(val, 10);
  if (team === 'A') {
    predObj.score_a = valInt;
  } else {
    predObj.score_b = valInt;
  }
  
  // Automate prediction calculation based on scores
  if (predObj.score_a !== null && predObj.score_b !== null) {
    if (predObj.score_a > predObj.score_b) {
      predObj.prediction = 'A';
    } else if (predObj.score_a < predObj.score_b) {
      predObj.prediction = 'B';
    } else {
      predObj.prediction = 'D'; // Empate
    }
  } else {
    predObj.prediction = null;
  }
  
  tempPredictions[matchId] = predObj;
  
  // Update button visual states dynamically
  const btnA = document.getElementById(`btn-pred-${matchId}-A`);
  const btnD = document.getElementById(`btn-pred-${matchId}-D`);
  const btnB = document.getElementById(`btn-pred-${matchId}-B`);
  
  if (btnA) {
    btnA.classList.remove('selected-a');
    if (predObj.prediction === 'A') btnA.classList.add('selected-a');
  }
  if (btnD) {
    btnD.classList.remove('selected-d');
    if (predObj.prediction === 'D') btnD.classList.add('selected-d');
  }
  if (btnB) {
    btnB.classList.remove('selected-b');
    if (predObj.prediction === 'B') btnB.classList.add('selected-b');
  }
};

async function saveKnockoutBets(btn) {
  if (!selectedParticipant) {
    showToast('Inicia sesión para guardar tus apuestas', 'error');
    return;
  }
  
  const knockoutMatches = [];
  for (const round of ['R32', 'R16', 'QF', 'SF', 'Third', 'Final']) {
    if (bracketData[round]) knockoutMatches.push(...bracketData[round]);
  }
  
  const predictionsToSave = [];
  for (const m of knockoutMatches) {
    const pred = tempPredictions[m.id];
    if (pred) {
      const curr = currentPredictions[m.id];
      const hasChanged = !curr || 
                         (typeof pred === 'object' && typeof curr === 'object' && (pred.score_a !== curr.score_a || pred.score_b !== curr.score_b)) ||
                         (typeof pred === 'object' && typeof curr !== 'object') || // Switched format
                         (typeof pred !== 'object' && pred !== curr);
      
      if (hasChanged) {
        if (typeof pred === 'object') {
          if (!pred.prediction) {
            showToast('Te falta seleccionar quién gana o empata usando los botones en uno de los pronósticos', 'error');
            return;
          }
          if (pred.prediction !== null) {
            predictionsToSave.push({ 
              match_id: m.id, 
              prediction: pred.prediction,
              score_a: pred.score_a,
              score_b: pred.score_b
            });
          }
        } else {
          predictionsToSave.push({ match_id: m.id, prediction: pred });
        }
      }
    }
  }
  
  if (predictionsToSave.length === 0) {
    showToast('No hay cambios para guardar', 'error');
    return;
  }
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Guardando...</span>';
  btn.classList.add('saving');
  
  try {
    const res = await fetch('/api/predictions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: selectedParticipant.id,
        predictions: predictionsToSave
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Error al guardar apuestas', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saving');
      return;
    }
    
    for (const p of predictionsToSave) {
      if (p.score_a !== undefined) {
        currentPredictions[p.match_id] = { prediction: p.prediction, score_a: p.score_a, score_b: p.score_b };
      } else {
        currentPredictions[p.match_id] = p.prediction;
      }
    }
    
    btn.innerHTML = '<span class="btn-text">✅ ¡Guardado!</span>';
    btn.classList.replace('saving', 'saved');
    btn.classList.remove('btn-primary');
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    
    if (window.confetti && window.celebrationsEnabled !== false) {
      const rect = btn.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({ particleCount: 30, spread: 40, origin: { x, y }, colors: ['#34d399', '#ffffff'] });
    }
    
    // await loadData();
    if (document.getElementById('sectionKnockout').classList.contains('active')) {
       loadBracket();
    }
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saved');
      btn.classList.add('btn-primary');
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
    
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('saving');
  }
}

// ─── Admin ──────────────────────────────────────────────
function adminLogin() {
  const pwd = $('#adminPassword').value;
  if (pwd === 'admin2026') {
    isAdmin = true;
    $('#adminLock').style.display = 'none';
    $('#adminPanel').style.display = 'block';
    renderAdminPanel();
    renderLeaderboard();
    showToast('🛡️ Acceso de administrador concedido', 'success');
  } else {
    showToast('Contraseña incorrecta', 'error');
  }
}

function adminLogout() {
  isAdmin = false;
  $('#adminPassword').value = '';
  $('#adminPanel').style.display = 'none';
  $('#adminLock').style.display = 'block';
  renderLeaderboard();
  showToast('🔒 Sesión de administrador cerrada', 'success');
}

window.changeAdminVersusRound = function(round) {
  activeAdminVersusRound = round;
  renderAdminPanel();
};

window.toggleAdminGroupHistory = function() {
  adminShowGroupHistory = !adminShowGroupHistory;
  renderAdminPanel();
};

function renderAdminPanel() {
  if (!isAdmin) return;
  
  const container = $('#adminGroups');
  container.innerHTML = '';
  
  // Populate history select dropdown
  populateHistorySelect();
  
  // We render a round selector for the versus rounds
  const headerEl = document.createElement('div');
  headerEl.className = 'admin-knockout-header';
  headerEl.style.marginBottom = '20px';
  headerEl.style.width = '100%';
  headerEl.style.gridColumn = '1 / -1';
  headerEl.style.background = 'var(--bg-card)';
  headerEl.style.padding = '20px';
  headerEl.style.borderRadius = 'var(--radius-lg)';
  headerEl.style.border = '1px solid var(--border)';
  
  const VERSUS_ROUND_LABELS = {
    'R32': '⚔️ Ronda de 32',
    'R16': '🏅 Octavos',
    'QF': '🔥 Cuartos',
    'SF': '💎 Semifinales',
    'Third': '🥉 Tercer Lugar',
    'Final': '🏆 Final'
  };
  
  let tabsHtml = `<div class="knockout-groups-tabs" style="margin-bottom: 15px; display: flex; gap: 8px;">`;
  for (const round of ROUND_ORDER) {
    tabsHtml += `
      <button class="knockout-groups-tab ${round === activeAdminVersusRound ? 'active' : ''}" 
              onclick="event.preventDefault(); changeAdminVersusRound('${round}')"
              style="flex: 1; text-align: center; font-size: 0.85rem; padding: 10px 5px;">
        ${VERSUS_ROUND_LABELS[round] || round}
      </button>
    `;
  }
  tabsHtml += `</div>`;
  
  headerEl.innerHTML = `
    <h3 style="margin-bottom: 12px; color: var(--gold); display: flex; align-items: center; gap: 8px;">
      🏟️ Administrar Resultados de Eliminatorias
    </h3>
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
      Selecciona la ronda y registra el ganador de cada versus. Los ganadores avanzarán automáticamente en el bracket.
    </p>
    ${tabsHtml}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px;">
      <span style="font-size: 0.85rem; color: var(--text-muted);">¿Necesitas ver o editar la fase de grupos?</span>
      <button class="btn btn-secondary" onclick="event.preventDefault(); toggleAdminGroupHistory()" style="font-size: 0.8rem; padding: 6px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-primary);">
        ${adminShowGroupHistory || tournamentPhase !== 'knockout' ? '👁️ Ocultar Historial de Grupos' : '👁️ Ver Historial de Grupos'}
      </button>
    </div>
  `;
  
  container.appendChild(headerEl);
  
  // Render Knockout versus matches for the active round
  const roundMatches = bracketData[activeAdminVersusRound] || [];
  const roundCard = document.createElement('div');
  roundCard.className = 'group-card';
  roundCard.style.gridColumn = '1 / -1';
  
  if (roundMatches.length === 0) {
    roundCard.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⏳</span>
        <p>Cargando partidos de eliminatorias...</p>
      </div>
    `;
  } else {
    roundCard.innerHTML = `
      <div class="group-header">
        <span class="group-letter">${VERSUS_ROUND_LABELS[activeAdminVersusRound] || activeAdminVersusRound}</span>
        <span class="group-label">${roundMatches.length} partidos</span>
      </div>
      <div class="group-matches" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 15px; padding: 15px;">
        ${roundMatches.map(m => renderAdminMatchCard(m)).join('')}
      </div>
    `;
  }
  container.appendChild(roundCard);
  
  // If not knockout phase, OR if adminShowGroupHistory is true, render the group stage matches
  if (tournamentPhase !== 'knockout' || adminShowGroupHistory) {
    const groupSectionHeader = document.createElement('div');
    groupSectionHeader.style.gridColumn = '1 / -1';
    if (tournamentPhase === 'knockout') {
      groupSectionHeader.innerHTML = `
        <h3 style="margin: 30px 0 15px; color: var(--text-secondary); border-bottom: 2px solid var(--border); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          📋 Historial: Fase de Grupos
        </h3>
      `;
      container.appendChild(groupSectionHeader);
    }
    
    const groupNames = Object.keys(matchesData).sort((a, b) => {
      if (a === 'Prueba') return -1;
      if (b === 'Prueba') return 1;
      return a.localeCompare(b);
    });
    
    for (const groupName of groupNames) {
      const matches = matchesData[groupName];
      const card = document.createElement('div');
      card.className = 'group-card';
      
      card.innerHTML = `
        <div class="group-header">
          <span class="group-letter">Grupo ${groupName}</span>
          <span class="group-label">Resultados oficiales</span>
        </div>
        <div class="group-matches">
          ${matches.map(m => renderAdminMatchCard(m)).join('')}
        </div>
      `;
      
      container.appendChild(card);
    }
  }
}

function renderAdminMatchCard(match) {
  const r = match.result;
  const isKnockout = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(match.group_name);
  const score_a_val = (match.result !== null && match.score_a !== null) ? match.score_a : '';
  const score_b_val = (match.result !== null && match.score_b !== null) ? match.score_b : '';
  
  let resultRowHtml = '';
  if (isKnockout) {
    resultRowHtml = `
      <div style="margin-top: 10px;">
        <div class="admin-result-row" style="display: flex; gap: 10px; align-items: center; justify-content: center;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">Goles Local</span>
            <input type="number" class="score-input" id="admin_score_a_${match.id}" value="${score_a_val}" min="0" max="99" 
                   style="width: 44px; text-align: center; padding: 6px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-weight: bold; font-family: inherit;"
                   oninput="checkAdminScoreTie(${match.id})">
          </div>
          <span style="font-weight: bold; margin-top: 15px; color: var(--text-muted);">-</span>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">Goles Visita</span>
            <input type="number" class="score-input" id="admin_score_b_${match.id}" value="${score_b_val}" min="0" max="99" 
                   style="width: 44px; text-align: center; padding: 6px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-weight: bold; font-family: inherit;"
                   oninput="checkAdminScoreTie(${match.id})">
          </div>
          <button class="btn btn-primary" onclick="saveAdminScore(${match.id})" style="align-self: flex-end; height: 32px; padding: 0 10px; font-size: 0.8rem; justify-content: center; margin-top: 15px;">
            Guardar
          </button>
          ${r !== null ? `
          <button class="result-btn clear-btn" onclick="setResult(${match.id}, null)" title="Limpiar resultado" style="align-self: flex-end; height: 32px; background: rgba(239, 68, 68, 0.1); color: var(--red); border-color: rgba(239, 68, 68, 0.2); font-weight: bold; margin-top: 15px;">
            ↩️
          </button>
          ` : ''}
        </div>
        
        <div class="advanced-team-row" id="adv_row_${match.id}" style="display: ${score_a_val !== '' && score_b_val !== '' && parseInt(score_a_val, 10) === parseInt(score_b_val, 10) ? 'flex' : 'none'}; flex-direction: column; align-items: center; margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; font-weight: bold;">Avanza / Gana en Penales</span>
          <select id="admin_adv_${match.id}" style="padding: 6px 12px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-family: inherit; font-size: 0.85rem; font-weight: bold; outline: none; width: 180px;">
            <option value="A" ${match.advanced_team === 'A' ? 'selected' : ''}>👉 Avanza ${match.team_a}</option>
            <option value="B" ${match.advanced_team === 'B' ? 'selected' : ''}>👉 Avanza ${match.team_b}</option>
          </select>
        </div>
      </div>
    `;
  } else {
    resultRowHtml = `
      <div class="admin-result-row">
        <button class="result-btn ${r === 'A' ? 'active-result-a' : ''}" onclick="setResult(${match.id}, 'A')">
          Gana ${match.team_a}
        </button>
        <button class="result-btn ${r === 'D' ? 'active-result-d' : ''}" onclick="setResult(${match.id}, 'D')">
          Empate
        </button>
        <button class="result-btn ${r === 'B' ? 'active-result-b' : ''}" onclick="setResult(${match.id}, 'B')">
          Gana ${match.team_b}
        </button>
        ${r !== null ? `
        <button class="result-btn clear-btn" onclick="setResult(${match.id}, null)" title="Limpiar resultado" style="background: rgba(239, 68, 68, 0.1); color: var(--red); border-color: rgba(239, 68, 68, 0.2); font-weight: bold;">
          ↩️
        </button>
        ` : ''}
        <button class="result-btn clear-btn" onclick="deleteMatch(${match.id}, '${match.team_a}', '${match.team_b}')" title="Eliminar partido permanentemente">
          ✕
        </button>
      </div>
    `;
  }

  return `
    <div class="admin-match-card" id="admin_match_card_${match.id}">
      <!-- Date hidden -->
      <div class="match-teams">
        <div class="match-team">
          <img class="team-flag ${r === 'A' ? 'winner-flag' : ''}" src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
          <span class="team-name">${match.team_a}</span>
        </div>
        <span class="match-vs">${match.score_a !== null && match.score_b !== null ? `${match.score_a} - ${match.score_b}` : 'VS'}</span>
        <div class="match-team team-b">
          <span class="team-name">${match.team_b}</span>
          <img class="team-flag ${r === 'B' ? 'winner-flag' : ''}" src="${getFlagUrl(match.flag_b)}" alt="${match.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
        </div>
      </div>
      ${resultRowHtml}
    </div>
  `;
}

window.checkAdminScoreTie = function(matchId) {
  const sa = $(`#admin_score_a_${matchId}`).value;
  const sb = $(`#admin_score_b_${matchId}`).value;
  const row = $(`#adv_row_${matchId}`);
  if (row) {
    if (sa.trim() !== '' && sb.trim() !== '' && parseInt(sa, 10) === parseInt(sb, 10)) {
      row.style.display = 'flex';
    } else {
      row.style.display = 'none';
    }
  }
};

window.saveAdminScore = async function(matchId) {
  const saVal = $(`#admin_score_a_${matchId}`).value;
  const sbVal = $(`#admin_score_b_${matchId}`).value;
  if (saVal.trim() === '' || sbVal.trim() === '') {
    showToast('Ingresa ambos marcadores', 'error');
    return;
  }
  const score_a = parseInt(saVal, 10);
  const score_b = parseInt(sbVal, 10);
  if (isNaN(score_a) || isNaN(score_b) || score_a < 0 || score_b < 0) {
    showToast('Marcadores inválidos', 'error');
    return;
  }
  
  let advanced_team = null;
  if (score_a === score_b) {
    advanced_team = $(`#admin_adv_${matchId}`).value;
  }
  
  try {
    const res = await fetch(`/api/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score_a, score_b, advanced_team })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }
    
    showToast('✅ Resultado guardado', 'success');
    if (window.confetti && window.celebrationsEnabled !== false) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    window.skipAdminPanelRender = true;
    await loadData();
    await loadBracket();
    window.skipAdminPanelRender = false;
    
    const cardEl = document.getElementById(`admin_match_card_${matchId}`);
    if (cardEl) {
      let updatedMatch;
      for (const group of Object.values(matchesData)) {
         updatedMatch = group.find(m => m.id === matchId);
         if (updatedMatch) break;
      }
      if (updatedMatch) {
         cardEl.outerHTML = renderAdminMatchCard(updatedMatch);
      }
    }
  } catch (err) {
    showToast('Error al guardar resultado', 'error');
  }
};

async function setResult(matchId, result) {
  try {
    const res = await fetch(`/api/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }
    
    showToast(result ? '✅ Resultado guardado' : '↩️ Resultado eliminado', 'success');
    if (result && window.confetti && window.celebrationsEnabled !== false) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    window.skipAdminPanelRender = true;
    await loadData();
    await loadBracket();
    window.skipAdminPanelRender = false;
    
    const cardEl = document.getElementById(`admin_match_card_${matchId}`);
    if (cardEl) {
      let updatedMatch;
      for (const group of Object.values(matchesData)) {
         updatedMatch = group.find(m => m.id === matchId);
         if (updatedMatch) break;
      }
      if (updatedMatch) {
         cardEl.outerHTML = renderAdminMatchCard(updatedMatch);
      }
    }
  } catch (err) {
    showToast('Error al guardar resultado', 'error');
  }
}

async function createTestMatch(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  try {
    const res = await fetch('/api/test-match', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }
    
    form.reset();
    showToast('✅ Partido de prueba creado', 'success');
    loadData();
  } catch(err) {
    showToast('Error al crear partido de prueba', 'error');
  }
}

async function deleteMatch(id, teamA, teamB) {
  if (!confirm(`¿Estás seguro de eliminar permanentemente el partido ${teamA} vs ${teamB}?\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    const res = await fetch(`/api/matches/${id}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }
    
    showToast('🗑️ Partido eliminado con éxito', 'success');
    loadData();
  } catch (err) {
    showToast('Error al eliminar el partido', 'error');
  }
}

async function resetMatches() {
  if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará todos los resultados oficiales que has ingresado. Los marcadores volverán a estar "pendientes" y las tablas de posiciones se resetearán a 0.\n\nNota: ¡Las predicciones de los participantes NO se borrarán!')) {
    return;
  }
  
  try {
    const res = await fetch('/api/matches/reset', {
      method: 'POST'
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }
    
    showToast('🔄 Todos los resultados han sido limpiados', 'success');
    loadData();
  } catch (err) {
    showToast('Error al reiniciar los marcadores', 'error');
  }
}

// ─── Bets Control ───────────────────────────────────────
function updateBetsUI() {
  const toggle = $('#betsToggle');
  const label = $('#betsStatusLabel');
  const card = document.querySelector('.bets-control-card');
  
  if (toggle) toggle.checked = betsEnabled;
  
  if (label) {
    label.textContent = betsEnabled ? 'Habilitadas' : 'Deshabilitadas';
    label.classList.toggle('disabled', !betsEnabled);
  }
  
  if (card) {
    card.classList.toggle('bets-disabled', !betsEnabled);
  }

  // Knockout phase toggles
  const phases = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
  const states = {
    'R32': betsEnabledR32,
    'R16': betsEnabledR16,
    'QF': betsEnabledQF,
    'SF': betsEnabledSF,
    'Third': betsEnabledThird,
    'Final': betsEnabledFinal
  };

  phases.forEach(phase => {
    const pToggle = $(`#betsToggle${phase}`);
    if (pToggle) {
      pToggle.checked = states[phase];
    }
  });
}

async function toggleBets() {
  const newState = $('#betsToggle').checked;
  
  try {
    const res = await fetch('/api/settings/bets_enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    });
    
    if (res.ok) {
      betsEnabled = newState;
      updateBetsUI();
      renderGroups();
      if (document.getElementById('sectionKnockout') && document.getElementById('sectionKnockout').classList.contains('active')) {
        renderBracket();
      }
      showToast(newState ? '✅ Apuestas de grupos habilitadas' : '🔒 Apuestas de grupos deshabilitadas', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar estado de apuestas', 'error');
    // Revert toggle
    $('#betsToggle').checked = !newState;
  }
}

async function toggleBetsPhase(phase) {
  const toggle = $(`#betsToggle${phase}`);
  if (!toggle) return;
  const newState = toggle.checked;
  
  try {
    const res = await fetch('/api/settings/bets_enabled_phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, enabled: newState })
    });
    
    if (res.ok) {
      if (phase === 'R32') betsEnabledR32 = newState;
      else if (phase === 'R16') betsEnabledR16 = newState;
      else if (phase === 'QF') betsEnabledQF = newState;
      else if (phase === 'SF') betsEnabledSF = newState;
      else if (phase === 'Third') betsEnabledThird = newState;
      else if (phase === 'Final') betsEnabledFinal = newState;

      updateBetsUI();
      renderGroups();
      renderBracket();
      showToast(`🔒 Configuración de fase ${phase} actualizada`, 'success');
    }
  } catch (err) {
    showToast('Error al cambiar estado de apuestas por fase', 'error');
    // Revert toggle
    toggle.checked = !newState;
  }
}

function isKnockoutPhaseLocked(groupName) {
  if (tournamentPhase !== 'knockout') return true;
  if (groupName === 'R32') return !betsEnabledR32;
  if (groupName === 'R16') return !betsEnabledR16;
  if (groupName === 'QF') return !betsEnabledQF;
  if (groupName === 'SF') return !betsEnabledSF;
  if (groupName === 'Third') return !betsEnabledThird;
  if (groupName === 'Final') return !betsEnabledFinal;
  return !betsEnabled;
}

function canViewPredictionsForPhase(phase, participantId) {
  if (isAdmin) return true;
  if (selectedParticipant && selectedParticipant.id === participantId) return true;
  
  if (phase === 'R32') return showPredictionsR32;
  if (phase === 'R16') return showPredictionsR16;
  if (phase === 'QF') return showPredictionsQF;
  if (phase === 'SF') return showPredictionsSF;
  if (phase === 'Third') return showPredictionsThird;
  if (phase === 'Final') return showPredictionsFinal;
  
  // For Groups phase, which includes Group A, Group B, etc.
  return showPredictions; 
}

function updatePredictionsUI() {
  const toggleGroups = $('#predictionsToggle');
  if (toggleGroups) toggleGroups.checked = showPredictions;
  
  if ($('#predictionsToggleR32')) $('#predictionsToggleR32').checked = showPredictionsR32;
  if ($('#predictionsToggleR16')) $('#predictionsToggleR16').checked = showPredictionsR16;
  if ($('#predictionsToggleQF')) $('#predictionsToggleQF').checked = showPredictionsQF;
  if ($('#predictionsToggleSF')) $('#predictionsToggleSF').checked = showPredictionsSF;
  if ($('#predictionsToggleThird')) $('#predictionsToggleThird').checked = showPredictionsThird;
  if ($('#predictionsToggleFinal')) $('#predictionsToggleFinal').checked = showPredictionsFinal;
}

function updateAciertosUI() {
  const toggle = $('#aciertosToggle');
  if (toggle) toggle.checked = showAciertos;
  
  const label = $('#aciertosStatusLabel');
  if (label) {
    label.textContent = showAciertos ? 'Visible' : 'Oculto';
    label.classList.toggle('disabled', !showAciertos);
  }
  
  const card = $('.aciertos-control-card');
  if (card) {
    card.classList.toggle('predictions-disabled', !showAciertos);
  }
}

function updatePendientesUI() {
  const toggle = $('#pendientesToggle');
  if (toggle) toggle.checked = showPendientes;
  
  const label = $('#pendientesStatusLabel');
  if (label) {
    label.textContent = showPendientes ? 'Visible' : 'Oculto';
    label.classList.toggle('disabled', !showPendientes);
  }
}

window.updateHeaderStats = function(stats) {
  if (!$('#headerPoints')) return;
  
  $('#headerPoints').textContent = stats.points;
  $('#headerRank').textContent = '#' + stats.rank;
  $('#headerPending').textContent = stats.pending;
  
  if (tournamentPhase === 'knockout') {
    $('#headerAciertosDiv').style.display = 'none';
  } else {
    $('#headerAciertosDiv').style.display = 'block';
    $('#headerAciertos').textContent = stats.aciertos;
  }
}

function updateCelebrationsUI(celebrationsEnabled) {
  window.celebrationsEnabled = celebrationsEnabled;
  const toggle = $('#celebrationsToggle');
  const label = $('#celebrationsStatusLabel');
  const card = $('#celebrationsControlCard');
  if (toggle) toggle.checked = celebrationsEnabled;
  if (label) {
    label.textContent = celebrationsEnabled ? 'Habilitados' : 'Ocultos';
    label.classList.toggle('disabled', !celebrationsEnabled);
    if(celebrationsEnabled) {
      label.style.background = 'rgba(251,191,36,0.1)';
      label.style.color = 'var(--gold)';
    } else {
      label.style.background = '';
      label.style.color = '';
    }
  }
}

async function toggleCelebrations() {
  const newState = $('#celebrationsToggle').checked;
  try {
    const res = await fetch('/api/settings/celebrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    });
    if (!res.ok) throw new Error('Error al cambiar configuración');
    
    updateCelebrationsUI(newState);
    showToast('✨ Festejos ' + (newState ? 'habilitados' : 'deshabilitados'), 'success');
  } catch (err) {
    console.error(err);
    showToast('Error al cambiar configuración de festejos', 'error');
    // Revert toggle
    $('#celebrationsToggle').checked = !newState;
  }
}

async function togglePredictionsVisibility(phase = 'groups') {
  const toggle = $('#predictionsToggle');
  const newState = toggle.checked;
  
  try {
    const res = await fetch('/api/settings/show_predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show: newState })
    });
    
    if (res.ok) {
      showPredictions = newState;
      updatePredictionsUI();
      renderLeaderboard();
      await loadData(); // Reload predictions data for tooltips
      if (document.getElementById('sectionKnockout').classList.contains('active')) {
        renderBracket();
      }
      showToast(newState ? '✅ Votos grupales visibles' : '🔒 Votos grupales ocultos', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar visibilidad', 'error');
    toggle.checked = !newState;
  }
}

async function togglePredictionsVisibilityPhase(phase) {
  const toggle = $(`#predictionsToggle${phase}`);
  const newState = toggle.checked;
  
  try {
    const res = await fetch('/api/settings/show_predictions_phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, show: newState })
    });
    
    if (res.ok) {
      if (phase === 'R32') showPredictionsR32 = newState;
      else if (phase === 'R16') showPredictionsR16 = newState;
      else if (phase === 'QF') showPredictionsQF = newState;
      else if (phase === 'SF') showPredictionsSF = newState;
      else if (phase === 'Third') showPredictionsThird = newState;
      else if (phase === 'Final') showPredictionsFinal = newState;
      
      updatePredictionsUI();
      renderLeaderboard();
      await loadData();
      if (document.getElementById('sectionKnockout').classList.contains('active')) {
        renderBracket();
      }
      showToast(newState ? `✅ Votos ${phase} visibles` : `🔒 Votos ${phase} ocultos`, 'success');
    }
  } catch (err) {
    showToast('Error al cambiar visibilidad de fase', 'error');
    toggle.checked = !newState;
  }
}

async function toggleAciertosVisibility() {
  const newState = $('#aciertosToggle').checked;
  
  try {
    const res = await fetch('/api/settings/show_aciertos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show: newState })
    });
    
    if (res.ok) {
      showAciertos = newState;
      updateAciertosUI();
      renderLeaderboard();
      showToast(newState ? '✅ Columna de aciertos visible' : '🔒 Columna de aciertos oculta', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar visibilidad de aciertos', 'error');
    // Revert toggle
    $('#aciertosToggle').checked = !newState;
  }
}

async function togglePendientesVisibility() {
  const newState = $('#pendientesToggle').checked;
  
  try {
    const res = await fetch('/api/settings/show_pendientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show: newState })
    });
    
    if (res.ok) {
      showPendientes = newState;
      updatePendientesUI();
      renderLeaderboard();
      showToast(newState ? '✅ Columna de pendientes visible' : '🔒 Columna de pendientes oculta', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar visibilidad de pendientes', 'error');
    // Revert toggle
    $('#pendientesToggle').checked = !newState;
  }
}

async function savePoints() {
  const win = parseInt($('#inputPointsWin').value, 10);
  const draw = parseInt($('#inputPointsDraw').value, 10);
  const koResult = parseInt($('#inputPointsKoResult').value, 10);
  const koScoreA = parseInt($('#inputPointsKoScoreA').value, 10);
  const koScoreB = parseInt($('#inputPointsKoScoreB').value, 10);
  
  if (isNaN(win) || isNaN(draw) || win < 0 || draw < 0 ||
      isNaN(koResult) || isNaN(koScoreA) || isNaN(koScoreB) ||
      koResult < 0 || koScoreA < 0 || koScoreB < 0) {
    showToast('Los puntos deben ser números válidos mayores o iguales a 0', 'error');
    return;
  }
  
  const btn = $('#btnSavePoints');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Guardando...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/settings/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ win, draw, koResult, koScoreA, koScoreB })
    });
    
    if (res.ok) {
      pointsWin = win;
      pointsDraw = draw;
      pointsKoResult = koResult;
      pointsKoScoreA = koScoreA;
      pointsKoScoreB = koScoreB;
      
      btn.innerHTML = '¡Guardado!';
      btn.classList.add('saved');
      btn.style.background = 'var(--green)';
      btn.style.color = '#fff';
      
      showToast('🎯 Puntos actualizados', 'success');
      
      // Reload leaderboard to reflect new points logic
      loadData();
    } else {
      throw new Error();
    }
  } catch (err) {
    showToast('Error al guardar configuración de puntos', 'error');
  } finally {
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saved');
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  }
}


// ─── Participant History (Admin) ────────────────────────
function populateHistorySelect() {
  const select = $('#historyParticipantSelect');
  const resetSelect = $('#resetPasswordParticipant');
  
  const currentValue = select ? select.value : '';
  const currentResetValue = resetSelect ? resetSelect.value : '';
  
  if (select) select.innerHTML = '<option value="">— Selecciona un participante —</option>';
  if (resetSelect) resetSelect.innerHTML = '<option value="">— Selecciona un participante —</option>';
  
  for (const p of participantsData) {
    if (select) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.points} pts)`;
      select.appendChild(opt);
    }
    if (resetSelect) {
      const optReset = document.createElement('option');
      optReset.value = p.id;
      optReset.textContent = p.name;
      resetSelect.appendChild(optReset);
    }
  }
  
  // Restore previous selection
  if (select && currentValue) select.value = currentValue;
  if (resetSelect && currentResetValue) resetSelect.value = currentResetValue;
}

async function loadParticipantHistory(participantId) {
  const container = $('#historyContainer');
  const summaryEl = $('#historySummary');
  const predsEl = $('#historyPredictions');
  
  try {
    await renderHistoryToElements(participantId, summaryEl, predsEl);
    container.style.display = 'block';
  } catch (err) {
    showToast('Error al cargar historial', 'error');
  }
}

function handleLeaderboardRowClick(participantId, participantName) {
  const isClickable = isAdmin || 
                      (selectedParticipant && selectedParticipant.id === participantId) || 
                      showPredictions || 
                      showPredictionsR32 || 
                      showPredictionsR16 || 
                      showPredictionsQF || 
                      showPredictionsSF || 
                      showPredictionsThird || 
                      showPredictionsFinal;
                      
  if (!isClickable) {
    showToast('🔒 El administrador ha ocultado todos los votos.', 'error');
    return;
  }
  openHistoryModal(participantId, participantName);
}

async function openHistoryModal(participantId, participantName) {
  const modal = $('#historyModal');
  const nameEl = $('#modalParticipantName');
  const containerEl = $('#modalHistoryContainer');
  
  nameEl.textContent = participantName;
  containerEl.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⏳</span>
      <p>Cargando historial...</p>
    </div>
  `;
  
  modal.classList.add('show');
  
  // Create temp elements to use the same render function
  const summaryEl = document.createElement('div');
  summaryEl.className = 'history-summary';
  const predsEl = document.createElement('div');
  predsEl.className = 'history-predictions';
  
  try {
    await renderHistoryToElements(participantId, summaryEl, predsEl);
    containerEl.innerHTML = '';
    containerEl.appendChild(summaryEl);
    containerEl.appendChild(predsEl);
  } catch (err) {
    containerEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">❌</span>
        <p>Error al cargar el historial</p>
      </div>
    `;
  }
}

let modalActiveRound = null;
let modalPredictionsCache = [];
let modalParticipantId = null;

async function renderHistoryToElements(participantId, summaryEl, predsEl) {
  const res = await fetch(`/api/participants/${participantId}/history`);
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error);
  
  const { predictions, summary } = data;
  modalPredictionsCache = predictions; // Cache predictions for fast updates
  modalParticipantId = participantId;
  
  const totalWrong = summary.totalPlayed - summary.totalCorrect - (predictions.filter(p => p.result !== null && p.prediction === null).length);
  
  // Render stats
  summaryEl.innerHTML = `
    <div class="history-stat-pill">
      <span class="history-stat-value points">${summary.totalPoints}</span>
      <span class="history-stat-label">Puntos</span>
    </div>
    <div class="history-stat-pill">
      <span class="history-stat-value correct">${summary.totalCorrect}</span>
      <span class="history-stat-label">Aciertos</span>
    </div>
    <div class="history-stat-pill">
      <span class="history-stat-value wrong">${totalWrong > 0 ? totalWrong : 0}</span>
      <span class="history-stat-label">Fallos</span>
    </div>
    <div class="history-stat-pill">
      <span class="history-stat-value predicted">${summary.totalPredicted}</span>
      <span class="history-stat-label">Predicciones</span>
    </div>
  `;
  
  // Determine default active round
  if (tournamentPhase === 'knockout') {
    const KNOCKOUT_ROUNDS = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
    let detectedRound = null;
    for (const r of KNOCKOUT_ROUNDS) {
      const roundPreds = predictions.filter(p => p.group_name === r);
      if (roundPreds.length > 0 && roundPreds.some(p => p.result === null)) {
        detectedRound = r;
        break;
      }
    }
    modalActiveRound = detectedRound || activeVersusRound || 'R32';
  } else {
    modalActiveRound = 'groups';
  }
  
  updateModalPredictionsUI(predsEl);
}

window.updateModalPredictionsUI = function(predsEl) {
  if (!predsEl) predsEl = document.querySelector('#modalHistoryContainer .history-predictions');
  if (!predsEl) return;
  
  const predictions = modalPredictionsCache;
  let html = '';
  
  if (tournamentPhase === 'knockout') {
    const VERSUS_ROUND_LABELS = {
      'groups': '📋 Grupos',
      'R32': 'Ronda 32',
      'R16': '🏅 Octavos',
      'QF': '🔥 Cuartos',
      'SF': '💎 Semis',
      'Third': '🥉 Tercer',
      'Final': '🏆 Final'
    };
    
    // Render round selector tabs inside the modal
    html += `
      <div class="modal-round-tabs" style="display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px; border-bottom: 1px solid var(--border);">
        ${['groups', 'R32', 'R16', 'QF', 'SF', 'Third', 'Final'].map(round => {
          const count = round === 'groups' 
            ? predictions.filter(p => !['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(p.group_name)).length
            : predictions.filter(p => p.group_name === round).length;
            
          if (count === 0 && round !== 'groups') return '';
          const isActive = modalActiveRound === round;
          return `
            <button class="tab-btn ${isActive ? 'active' : ''}" 
                    onclick="modalActiveRound='${round}'; updateModalPredictionsUI();"
                    style="padding: 6px 12px; font-size: 0.75rem; border-radius: 20px; border: 1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}; background: ${isActive ? 'rgba(212, 163, 89, 0.15)' : 'rgba(0,0,0,0.1)'}; color: ${isActive ? 'var(--gold)' : 'var(--text-secondary)'}; cursor: pointer; font-weight: 600; white-space: nowrap; transition: all 0.2s;">
              ${VERSUS_ROUND_LABELS[round]} (${count})
            </button>
          `;
        }).join('')}
      </div>
    `;
  }
  
  let activePreds = [];
  let finishedPreds = [];
  
  const phaseToCheck = (tournamentPhase === 'groups' || modalActiveRound === 'groups') ? 'groups' : modalActiveRound;
  
  if (!canViewPredictionsForPhase(phaseToCheck, modalParticipantId)) {
    predsEl.innerHTML = html + `
      <div style="margin-bottom: 12px; color: var(--gold); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        🔒 Votos Ocultos
      </div>
      <div class="history-empty" style="padding: 30px; border-radius: var(--radius); background: rgba(255,255,255,0.02); text-align: center; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border);">
        <div style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.8;">🤫</div>
        <strong>Votos en Secreto</strong><br>
        <span style="font-size: 0.8rem; margin-top: 5px; display: inline-block;">El administrador ha ocultado las predicciones de esta fase temporalmente.</span>
      </div>
    `;
    return;
  }
  
  if (tournamentPhase === 'groups' || modalActiveRound === 'groups') {
    activePreds = predictions.filter(p => !['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(p.group_name) && p.result === null);
    finishedPreds = predictions.filter(p => !['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(p.group_name) && p.result !== null);
  } else {
    activePreds = predictions.filter(p => p.group_name === modalActiveRound && p.result === null);
    finishedPreds = predictions.filter(p => p.group_name === modalActiveRound && p.result !== null);
  }
  
  const activeTitle = (tournamentPhase === 'groups' || modalActiveRound === 'groups') ? '🔮 Apuestas Grupales Pendientes' : `🔮 Duelos Pendientes - ${modalActiveRound === 'R16' ? 'Octavos de Final' : modalActiveRound === 'QF' ? 'Cuartos de Final' : modalActiveRound === 'SF' ? 'Semifinales' : modalActiveRound === 'Third' ? 'Tercer Lugar' : modalActiveRound === 'Final' ? 'Gran Final' : 'Ronda de 32'}`;
  
  html += `
    <div style="margin-bottom: 12px; color: var(--gold); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      ${activeTitle} (${activePreds.length})
    </div>
  `;
  
  if (activePreds.length === 0) {
    html += `<div class="history-empty" style="padding: 20px; border-radius: var(--radius); background: rgba(255,255,255,0.02); text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border);">
               No hay apuestas pendientes en esta fase.
             </div>`;
  } else {
    html += `<div class="active-predictions-list" style="margin-bottom: 20px;">`;
    html += renderPredictionListHtml(activePreds);
    html += `</div>`;
  }
  
  if (finishedPreds.length > 0) {
    const showByDefault = activePreds.length === 0;
    
    html += `
      <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="toggleFinishedHistory(this)" style="width:100%; justify-content: center; font-size: 0.8rem; padding: 10px 15px; background: ${showByDefault ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'}; border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          ${showByDefault ? '🙈 Ocultar Historial de Apuestas Finalizadas' : '👁️ Ver Historial de Apuestas Finalizadas'} (${finishedPreds.length})
        </button>
        <div id="finishedHistoryContainer" style="display: ${showByDefault ? 'block' : 'none'}; margin-top: 15px; animation: fadeIn 0.3s ease;">
          ${renderPredictionListHtml(finishedPreds)}
        </div>
      </div>
    `;
  }
  
  predsEl.innerHTML = html;
};

function renderPredictionListHtml(predsList) {
  const grouped = {};
  for (const p of predsList) {
    if (!grouped[p.group_name]) grouped[p.group_name] = [];
    grouped[p.group_name].push(p);
  }
  
  let html = '';
  const groupNames = Object.keys(grouped).sort((a, b) => {
    if (a === 'Prueba') return -1;
    if (b === 'Prueba') return 1;
    return a.localeCompare(b);
  });
  
  for (const gName of groupNames) {
    const isKnockout = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(gName);
    const label = isKnockout ? `Ronda ${gName === 'R16' ? 'Octavos' : gName === 'QF' ? 'Cuartos' : gName === 'SF' ? 'Semis' : gName === 'Third' ? 'Tercer' : gName === 'Final' ? 'Final' : '32'}` : `Grupo ${gName}`;
    html += `<div class="history-group-label">${label}</div>`;
    
    for (const p of grouped[gName]) {
      const predText = getPredictionText(p, isKnockout);
      const statusClass = getStatusClass(p.status);
      const pointsText = p.points_earned > 0 ? `+${p.points_earned} pts` : '';
      
      let pointsExplHtml = '';
      if (p.points_earned > 0 && isKnockout) {
        let expl = '';
        if (p.status === 'correct_exact') expl = 'Ganador + Marcador';
        else if (p.status === 'correct') expl = p.points_earned > 1 ? 'Ganador + Extra' : 'Ganador';
        else if (p.status === 'wrong') expl = 'Extra (Goles)';
        if (expl) {
          pointsExplHtml = `<div style="font-size: 0.65rem; color: var(--gold); text-align: right; margin-top: 3px; font-weight: 600;">${expl}</div>`;
        }
      }

      if (isKnockout) {
        const matchScoreHtml = (p.match_score_a !== null && p.match_score_b !== null) 
          ? `<span class="modern-score-real">${p.match_score_a} - ${p.match_score_b}</span>`
          : `<span class="modern-score-pending">vs</span>`;

        html += `
          <div class="history-item modern-history-item">
            <div class="history-item-match modern-match">
              <div class="modern-team modern-team-a">
                <span>${truncName(p.team_a)}</span>
                <img src="${getFlagUrl(p.flag_a)}" alt="${p.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
              </div>
              <div class="modern-score-center">
                ${matchScoreHtml}
              </div>
              <div class="modern-team modern-team-b">
                <img src="${getFlagUrl(p.flag_b)}" alt="${p.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
                <span>${truncName(p.team_b)}</span>
              </div>
            </div>
            <div class="history-item-prediction modern-prediction" style="flex-direction: column; align-items: flex-end; justify-content: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="history-pred-badge ${statusClass}">${predText}</span>
                <span class="history-points-badge">${pointsText}</span>
              </div>
              ${pointsExplHtml}
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="history-item">
            <div class="history-item-match">
              <img src="${getFlagUrl(p.flag_a)}" alt="${p.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
              <span>${truncName(p.team_a)}</span>
              <span class="vs-sep">vs</span>
              <span>${truncName(p.team_b)}</span>
              <img src="${getFlagUrl(p.flag_b)}" alt="${p.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            </div>
            <div class="history-item-prediction">
              <span class="history-pred-badge ${statusClass}">${predText}</span>
              <span class="history-points-badge">${pointsText}</span>
            </div>
          </div>
        `;
      }
    }
  }
  
  if (predsList.length === 0) {
    html = '<div class="history-empty">📋 No hay partidos registrados</div>';
  }
  return html;
}

window.toggleFinishedHistory = function(btn) {
  const container = document.getElementById('finishedHistoryContainer');
  if (!container) return;
  const isHidden = container.style.display === 'none';
  if (isHidden) {
    container.style.display = 'block';
    btn.innerHTML = `🙈 Ocultar Historial de Apuestas Finalizadas`;
    btn.style.background = 'rgba(255,255,255,0.05)';
  } else {
    container.style.display = 'none';
    btn.innerHTML = `👁️ Ver Historial de Apuestas Finalizadas`;
    btn.style.background = 'rgba(255,255,255,0.02)';
  }
};

function getPredictionText(pred, isKnockout = false) {
  if (!pred.prediction && pred.result === null) return '⏳ Pendiente';
  if (!pred.prediction) return '⚪ Sin apuesta';
  
  const predLabel = pred.prediction === 'A' ? pred.team_a : pred.prediction === 'B' ? pred.team_b : 'Empate';
  
  if (isKnockout) {
    const scoreText = (pred.pred_score_a !== null && pred.pred_score_b !== null) ? ` (${pred.pred_score_a}-${pred.pred_score_b})` : '';
    
    if (pred.result === null) return `🎯 Pronóstico: ${predLabel}${scoreText}`;
    if (pred.status === 'correct_exact') {
      return `🔥 Marcador Exacto${scoreText}`;
    }
    if (pred.status === 'correct' || pred.status === 'correct_draw') return `✅ Acierto${scoreText}`;
    return `❌ Fallo${scoreText}`;
  } else {
    if (pred.result === null) return `🎯 ${predLabel}`;
    if (pred.status === 'correct_exact') {
      const scoreText = (pred.pred_score_a !== null && pred.pred_score_b !== null) ? ` (${pred.pred_score_a}-${pred.pred_score_b})` : '';
      return `🔥 Marcador Exacto ${scoreText}`;
    }
    if (pred.status === 'correct' || pred.status === 'correct_draw') return `✅ ${predLabel}`;
    return `❌ ${predLabel}`;
  }
}

function getStatusClass(status) {
  switch(status) {
    case 'correct_exact':
    case 'correct':
    case 'correct_draw': return 'correct';
    case 'wrong': return 'wrong';
    case 'pending': return 'pending';
    case 'no_prediction': return 'no-pred';
    default: return 'pending';
  }
}

function truncName(name) {
  return name.length > 10 ? name.substring(0, 9) + '…' : name;
}

// ─── Tendencias (Estadísticas) ──────────────────────────
function renderTendencias() {
  const container = $('#tendenciasContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // If bracket data not loaded yet, fetch it and retry
  if (!bracketData || Object.keys(bracketData).length === 0) {
    loadBracket().then(() => renderTendencias());
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⏳</span>
        <p>Cargando tendencias del Mundial...</p>
      </div>
    `;
    return;
  }

  // Sort group names
  const groupNames = Object.keys(matchesData).sort((a, b) => {
    if (a === 'Prueba') return -1;
    if (b === 'Prueba') return 1;
    return a.localeCompare(b);
  });
  
  // Categorize matches into Knockout versus and Group stage matches
  const knockoutGroups = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
  const knockoutMatches = [];
  const groupMatches = [];
  
  for (const groupName of groupNames) {
    const matches = matchesData[groupName] || [];
    groupMatches.push(...matches.map(m => ({ ...m, groupName })));
  }
  
  for (const round of knockoutGroups) {
    const matches = bracketData[round] || [];
    knockoutMatches.push(...matches.map(m => ({ ...m, groupName: round })));
  }
  
  // Helper function to build a trend card
  const createTrendCard = (match, isKnockout = false) => {
    const stats = predictionStats[match.id] || { A: 0, B: 0, D: 0, total: 0 };
    const total = stats.total;
    const pctA = total > 0 ? Math.round((stats.A / total) * 100) : 0;
    const pctB = total > 0 ? Math.round((stats.B / total) * 100) : 0;
    const pctD = total > 0 ? Math.round((stats.D / total) * 100) : 0;
    
    const labelGroup = isKnockout ? ROUND_LABELS[match.groupName] || match.groupName : `Grupo ${match.groupName}`;
    const showDraw = !isKnockout; // Knockout matches do not have draws in predictions
    
    let barContainer = '';
    let labelsRow = '';
    
    if (total > 0) {
      if (showDraw) {
        barContainer = `
          <div class="tendencia-bar-container">
            <div class="tendencia-bar bar-a" style="width: ${pctA}%"></div>
            <div class="tendencia-bar bar-d" style="width: ${pctD}%"></div>
            <div class="tendencia-bar bar-b" style="width: ${pctB}%"></div>
          </div>
        `;
        labelsRow = `
          <div class="tendencia-labels">
            <div class="tendencia-label label-a">L ${pctA}%</div>
            <div class="tendencia-label label-d">E ${pctD}%</div>
            <div class="tendencia-label label-b">V ${pctB}%</div>
          </div>
        `;
      } else {
        barContainer = `
          <div class="tendencia-bar-container">
            <div class="tendencia-bar bar-a" style="width: ${pctA}%"></div>
            <div class="tendencia-bar bar-d" style="width: ${pctD}%"></div>
            <div class="tendencia-bar bar-b" style="width: ${pctB}%"></div>
          </div>
        `;
        labelsRow = `
          <div class="tendencia-labels">
            <div class="tendencia-label label-a" title="${match.team_a}">${match.team_a.length > 3 ? match.team_a.substring(0, 3) + '.' : match.team_a} ${pctA}%</div>
            <div class="tendencia-label label-d">E ${pctD}%</div>
            <div class="tendencia-label label-b" title="${match.team_b}">${match.team_b.length > 3 ? match.team_b.substring(0, 3) + '.' : match.team_b} ${pctB}%</div>
          </div>
        `;
      }
    } else {
      barContainer = `<div class="tendencia-empty">Aún no hay predicciones para este partido</div>`;
    }
    
    const isTBD = match.team_a === 'A definir' || match.team_b === 'A definir';
    const hasResult = match.result !== null && match.result !== undefined;
    
    let cardClass = 'tendencia-card';
    if (isTBD) cardClass += ' tbd-card';
    if (hasResult) cardClass += ' finished-card';
    
    const card = document.createElement('div');
    card.className = cardClass;
    if (isTBD) card.style.opacity = '0.5';
    if (hasResult) {
      card.style.opacity = '0.5';
      card.style.filter = 'grayscale(1)';
    }
    
    card.innerHTML = `
      <div class="tendencia-header">
        <span class="tendencia-group" style="${isKnockout ? 'color: var(--gold); font-weight: 800;' : ''}">${labelGroup}</span>
        <span class="tendencia-votes">👁️ ${total} votos</span>
      </div>
      
      <div class="tendencia-teams">
        <div class="tendencia-team">
          <img src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
          <span>${match.team_a}</span>
        </div>
        <span class="vs-sep">vs</span>
        <div class="tendencia-team" style="text-align:right;">
          <span>${match.team_b}</span>
          <img src="${getFlagUrl(match.flag_b)}" alt="${match.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
        </div>
      </div>
      
      <div class="tendencia-bars">
        ${barContainer}
        ${labelsRow}
      </div>
    `;
    
    return card;
  };

  // Create Filter Navigation Bar
  const filterBar = document.createElement('div');
  filterBar.className = 'tendencias-filter-bar';
  
  const filters = [
    { id: 'all', label: '🌐 Todos' },
    { id: 'groups', label: '📋 Fase de Grupos' },
    { id: 'R32', label: '⚔️ Ronda 32' },
    { id: 'R16', label: '🏅 Octavos' },
    { id: 'QF', label: '🔥 Cuartos' },
    { id: 'SF', label: '💎 Semis' },
    { id: 'Third', label: '🥉 Tercer Lugar' },
        { id: 'Final', label: '🏆 Final' }
  ];
  
  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = `tendencias-filter-btn ${activeTendenciasFilter === f.id ? 'active' : ''}`;
    btn.innerHTML = f.label;
    btn.addEventListener('click', () => {
      activeTendenciasFilter = f.id;
      renderTendencias();
    });
    filterBar.appendChild(btn);
  });
  container.appendChild(filterBar);

  // Render Grid Content based on active filter
  const renderFilterContent = (filterId) => {
    if (filterId === 'all') {
      // 1. Group Stage Section
      const groupTitle = document.createElement('div');
      groupTitle.className = 'tendencias-section-title';
      groupTitle.innerHTML = '📋 Fase de Grupos';
      container.appendChild(groupTitle);
      
      const groupGrid = document.createElement('div');
      groupGrid.className = 'tendencias-grid';
      groupMatches.forEach(m => groupGrid.appendChild(createTrendCard(m, false)));
      container.appendChild(groupGrid);
      
      // 2. Knockout Stage Sections
      knockoutGroups.forEach(round => {
        const roundMatches = knockoutMatches.filter(m => m.groupName === round);
        if (roundMatches.length > 0) {
          const roundTitle = document.createElement('div');
          roundTitle.className = 'tendencias-section-title';
          roundTitle.style.color = 'var(--gold)';
          roundTitle.innerHTML = `🏟️ ${ROUND_LABELS[round] || round}`;
          container.appendChild(roundTitle);
          
          const roundGrid = document.createElement('div');
          roundGrid.className = 'tendencias-grid';
          roundMatches.forEach(m => roundGrid.appendChild(createTrendCard(m, true)));
          container.appendChild(roundGrid);
        }
      });
    } else if (filterId === 'groups') {
      // Show only Group stage matches
      const groupTitle = document.createElement('div');
      groupTitle.className = 'tendencias-section-title';
      groupTitle.innerHTML = '📋 Fase de Grupos';
      container.appendChild(groupTitle);
      
      const groupGrid = document.createElement('div');
      groupGrid.className = 'tendencias-grid';
      groupMatches.forEach(m => groupGrid.appendChild(createTrendCard(m, false)));
      container.appendChild(groupGrid);
    } else {
      // Show specific knockout round matches
      const roundMatches = knockoutMatches.filter(m => m.groupName === filterId);
      
      const roundTitle = document.createElement('div');
      roundTitle.className = 'tendencias-section-title';
      roundTitle.style.color = 'var(--gold)';
      roundTitle.innerHTML = `🏟️ ${ROUND_LABELS[filterId] || filterId}`;
      container.appendChild(roundTitle);
      
      if (roundMatches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
          <span class="empty-icon">⏳</span>
          <p>No hay partidos definidos para esta ronda aún</p>
        `;
        container.appendChild(empty);
      } else {
        const roundGrid = document.createElement('div');
        roundGrid.className = 'tendencias-grid';
        roundMatches.forEach(m => roundGrid.appendChild(createTrendCard(m, true)));
        container.appendChild(roundGrid);
      }
    }
  };

  renderFilterContent(activeTendenciasFilter);
}

async function saveTheme() {
  const color = $('#themeColorPicker').value;
  try {
    const res = await fetch('/api/settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: color })
    });
    if (res.ok) {
      document.documentElement.style.setProperty('--theme-color', color);
      showToast('🎨 Tema actualizado para todos', 'success');
      if (window.confetti && window.celebrationsEnabled !== false) confetti({ particleCount: 50, spread: 60 });
    }
  } catch (err) {
    showToast('Error al guardar el tema', 'error');
  }
}

async function uploadRulesPDF(e) {
  e.preventDefault();
  
  const fileInput = $('#rulesPdfInput');
  if (!fileInput || fileInput.files.length === 0) {
    showToast('Selecciona un archivo PDF primero', 'error');
    return;
  }
  
  const file = fileInput.files[0];
  if (file.type !== 'application/pdf') {
    showToast('Solo se permiten archivos en formato PDF', 'error');
    return;
  }
  
  const btn = $('#btnUploadRules');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Subiendo...</span>';
  
  const formData = new FormData();
  formData.append('rules', file);
  
  try {
    const res = await fetch('/api/admin/upload-rules', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('✅ Reglas actualizadas con éxito', 'success');
      fileInput.value = ''; // Clear file input
    } else {
      showToast(data.error || 'Error al subir el archivo', 'error');
    }
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ─── Virus Gratis (Fun Facts) ───────────────────────────
let funFactsData = [];

async function loadFunFacts() {
  try {
    const res = await fetch('/api/fun-facts');
    funFactsData = await res.json();
    renderAdminFacts();
    
    // Check if there are new facts since the last seen count
    const stored = localStorage.getItem('last_seen_fact_count');
    const btnVirus = document.getElementById('btnVirus');
    if (btnVirus) {
      if (stored === null) {
        localStorage.setItem('last_seen_fact_count', funFactsData.length);
      } else {
        const lastSeenCount = parseInt(stored, 10);
        if (funFactsData.length > lastSeenCount) {
          btnVirus.classList.add('has-new');
        } else {
          btnVirus.classList.remove('has-new');
        }
      }
    }
  } catch (err) {
    console.error('Error loading fun facts:', err);
  }
}

async function openVirusModal() {
  const modal = $('#virusModal');
  const container = $('#virusFactsContainer');
  
  modal.classList.add('show');
  
  // Clear notification badge
  const btnVirus = document.getElementById('btnVirus');
  if (btnVirus) {
    btnVirus.classList.remove('has-new');
  }
  
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⏳</span>
      <p>Cargando...</p>
    </div>
  `;
  
  try {
    const res = await fetch('/api/fun-facts');
    const facts = await res.json();
    
    // Save new count to local storage
    localStorage.setItem('last_seen_fact_count', facts.length);
    
    if (facts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🧪</span>
          <p>Aún no hay datos curiosos</p>
          <p class="empty-sub">El administrador puede agregar datos desde el panel de admin</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    facts.forEach((fact, i) => {
      const card = document.createElement('div');
      card.className = 'virus-fact-card';
      card.style.animationDelay = `${i * 0.07}s`;
      card.innerHTML = `
        <span class="virus-fact-number">${facts.length - i}</span>
        <span class="virus-fact-text">${escapeHtml(fact.text)}</span>
        ${fact.image_url ? `<img src="${fact.image_url}" alt="Dato curioso" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">` : ''}
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">❌</span>
        <p>Error al cargar los datos</p>
      </div>
    `;
  }
}

async function addFunFact() {
  const input = $('#virusFactInput');
  const fileInput = $('#virusImageInput');
  const text = input.value.trim();
  
  if (!text) {
    showToast('Escribe un dato curioso primero', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('text', text);
  if (fileInput && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }
  
  try {
    const res = await fetch('/api/fun-facts', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Error al agregar dato', 'error');
      return;
    }
    
    input.value = '';
    if (fileInput) fileInput.value = '';
    showToast('🦠 Dato curioso agregado', 'success');
    loadFunFacts();
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
  }
}

async function deleteFunFact(id) {
  if (!confirm('¿Eliminar este dato curioso?')) return;
  
  try {
    await fetch(`/api/fun-facts/${id}`, { method: 'DELETE' });
    showToast('🗑️ Dato eliminado', 'success');
    loadFunFacts();
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

function renderAdminFacts() {
  const container = $('#adminFactsList');
  if (!container) return;
  
  if (funFactsData.length === 0) {
    container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">No hay datos curiosos aún</p>';
    return;
  }
  
  container.innerHTML = funFactsData.map(f => `
    <div class="admin-fact-item">
      <span class="fact-text">${f.image_url ? '🖼️ ' : ''}${escapeHtml(f.text)}</span>
      <button class="fact-delete" onclick="deleteFunFact(${f.id})" title="Eliminar">🗑️</button>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
//  KNOCKOUT BRACKET
// ═══════════════════════════════════════════════════════════

let bracketData = {};
let allTeams = [];
let activeKnockoutRound = 'R32';

const ROUND_LABELS = {
  'R32': 'Dieciseisavos de final',
  'R16': 'Octavos de Final',
  'QF': 'Cuartos de Final',
  'SF': 'Semifinales',
  'Third': 'Tercer Lugar',
  'Final': 'Gran Final'
};

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];

// ─── Ghost Tooltip Helpers (Fixed to Body) ──────────────
// Global reference to the active tooltip for cleanup
window._activeGhostTooltip = null;
window._activeGhostSlot = null;

function removeActiveGhostTooltip() {
  if (window._activeGhostTooltip) {
    window._activeGhostTooltip.remove();
    window._activeGhostTooltip = null;
  }
  if (window._activeGhostSlot) {
    window._activeGhostSlot.classList.remove('tooltip-active');
    window._activeGhostSlot = null;
  }
}

function positionGhostTooltip(tooltip, slotEl) {
  const slotRect = slotEl.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const GAP = 10; // px gap between slot and tooltip
  const EDGE_MARGIN = 10; // px margin from viewport edges

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // ── Vertical: prefer above, fall back to below ──
  let top;
  let isBelow = false;

  if (slotRect.top - tipRect.height - GAP >= EDGE_MARGIN) {
    // Enough space above
    top = slotRect.top - tipRect.height - GAP;
  } else if (slotRect.bottom + tipRect.height + GAP <= vpH - EDGE_MARGIN) {
    // Place below
    top = slotRect.bottom + GAP;
    isBelow = true;
  } else {
    // Not enough space either way — place above but clamp
    top = Math.max(EDGE_MARGIN, slotRect.top - tipRect.height - GAP);
  }

  // ── Horizontal: center on slot, clamp to viewport ──
  let left = slotRect.left + slotRect.width / 2 - tipRect.width / 2;
  left = Math.max(EDGE_MARGIN, Math.min(left, vpW - tipRect.width - EDGE_MARGIN));

  // Apply position
  tooltip.style.top = top + 'px';
  tooltip.style.left = left + 'px';

  // Arrow direction class
  if (isBelow) {
    tooltip.classList.add('tooltip-below');
  } else {
    tooltip.classList.remove('tooltip-below');
  }

  // Adjust arrow horizontal position to point at slot center
  const slotCenterX = slotRect.left + slotRect.width / 2;
  const arrowOffset = slotCenterX - left;
  // Clamp arrow to stay within tooltip bounds (with padding)
  const clampedArrow = Math.max(20, Math.min(arrowOffset, tipRect.width - 20));
  tooltip.style.setProperty('--arrow-left', clampedArrow + 'px');
}

// Close tooltip on any outside touch (mobile)
document.addEventListener('touchstart', (e) => {
  if (window._activeGhostTooltip && !window._activeGhostTooltip.contains(e.target)) {
    const slot = window._activeGhostSlot;
    if (!slot || !slot.contains(e.target)) {
      removeActiveGhostTooltip();
    }
  }
}, { passive: true });

async function loadBracket() {
  try {
    const [bracketRes, teamsRes] = await Promise.all([
      fetch('/api/knockout'),
      fetch('/api/teams')
    ]);
    bracketData = await bracketRes.json();
    allTeams = await teamsRes.json();
    renderBracket();
  } catch (err) {
    console.error('Error loading bracket:', err);
  }
}

function renderBracket() {
  const container = $('#bracketContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const saveContainer = document.getElementById('bracketSaveContainer');
  if (saveContainer) {
    saveContainer.style.display = (selectedParticipant && bracketData['R32'] && bracketData['R32'].length > 0) ? 'flex' : 'none';
  }
  
  // Determine which rounds to show based on active tab
  // Show active round + next rounds for bracket context
  const startIdx = ROUND_ORDER.indexOf(activeKnockoutRound);
  const visibleRounds = ROUND_ORDER.slice(startIdx, startIdx + 3);
  
  // Set up container styling for relative positioning
  container.style.position = 'relative';
  
  visibleRounds.forEach((round, relIdx) => {
    const matches = bracketData[round] || [];
    if (matches.length === 0) return;
    
    const roundCol = document.createElement('div');
    roundCol.className = 'bracket-round';
    roundCol.dataset.colIdx = relIdx;
    
    // Spacing configuration dynamically based on column index for tree bracket
    if (relIdx === 0) {
      roundCol.style.gap = '24px';
      roundCol.style.paddingTop = '0px';
    } else if (relIdx === 1) {
      roundCol.style.gap = '148px';
      roundCol.style.paddingTop = '62px';
    } else if (relIdx === 2) {
      roundCol.style.gap = '396px';
      roundCol.style.paddingTop = '186px';
    }
    
    const label = document.createElement('div');
    label.className = 'bracket-round-label';
    label.textContent = ROUND_LABELS[round] || round;
    roundCol.appendChild(label);
    
    for (const match of matches) {
      roundCol.appendChild(createBracketMatch(match, round));
    }
    
    container.appendChild(roundCol);
  });
  
  // Draw the tracking connector lines after DOM renders completely
  setTimeout(() => {
    drawBracketConnectors(visibleRounds);
  }, 60);
}

// Function to draw connecting tracking lines between tournament rounds with arrows and glow
function drawBracketConnectors(visibleRounds) {
  const container = $('#bracketContainer');
  if (!container) return;
  
  // Remove existing SVG
  const oldSvg = document.getElementById('bracketConnectorsSvg');
  if (oldSvg) oldSvg.remove();
  
  const containerRect = container.getBoundingClientRect();
  
  // Create dynamic SVG container covering the entire bracket container
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'bracketConnectorsSvg';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = container.scrollWidth + 'px';
  svg.style.height = container.scrollHeight + 'px';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '0'; // Draw behind cards but above backdrop
  
  // Append SVG defs for arrow marker markers
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Gold arrow marker
  const markerGold = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  markerGold.setAttribute('id', 'arrow-gold');
  markerGold.setAttribute('viewBox', '0 0 10 10');
  markerGold.setAttribute('refX', '8');
  markerGold.setAttribute('refY', '5');
  markerGold.setAttribute('markerWidth', '6');
  markerGold.setAttribute('markerHeight', '6');
  markerGold.setAttribute('orient', 'auto-start-reverse');
  const pathGold = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathGold.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
  pathGold.setAttribute('fill', 'var(--gold)');
  markerGold.appendChild(pathGold);
  defs.appendChild(markerGold);
  
  // Dim arrow marker
  const markerDim = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  markerDim.setAttribute('id', 'arrow-dim');
  markerDim.setAttribute('viewBox', '0 0 10 10');
  markerDim.setAttribute('refX', '8');
  markerDim.setAttribute('refY', '5');
  markerDim.setAttribute('markerWidth', '6');
  markerDim.setAttribute('markerHeight', '6');
  markerDim.setAttribute('orient', 'auto-start-reverse');
  const pathDim = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathDim.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
  pathDim.setAttribute('fill', 'rgba(255, 255, 255, 0.2)');
  markerDim.appendChild(pathDim);
  defs.appendChild(markerDim);
  
  svg.appendChild(defs);
  container.appendChild(svg);
  
  const cols = container.querySelectorAll('.bracket-round');
  if (cols.length < 2) return;
  
  // Draw connectors between successive columns
  for (let cIdx = 0; cIdx < cols.length - 1; cIdx++) {
    const col = cols[cIdx];
    const nextCol = cols[cIdx + 1];
    
    const roundName = visibleRounds[cIdx];
    const nextRoundName = visibleRounds[cIdx + 1];
    
    const matches = bracketData[roundName] || [];
    const nextMatches = bracketData[nextRoundName] || [];
    
    matches.forEach(m => {
      const card = col.querySelector(`[data-match-id="${m.id}"]`);
      if (!card) return;
      
      const nextPos = Math.ceil(m.bracket_position / 2);
      const nextMatch = nextMatches.find(nm => nm.bracket_position === nextPos);
      if (!nextMatch) return;
      
      const nextCard = nextCol.querySelector(`[data-match-id="${nextMatch.id}"]`);
      if (!nextCard) return;
      
      const isOdd = (m.bracket_position % 2 === 1);
      const slotEl = nextCard.querySelector(`.bracket-team-slot[data-slot="${isOdd ? 'A' : 'B'}"]`);
      if (!slotEl) return;
      
      const cardRect = card.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      
      // Calculate coordinates relative to bracket container scroll offset
      const x0 = cardRect.right - containerRect.left + container.scrollLeft;
      const y0 = cardRect.top + cardRect.height / 2 - containerRect.top + container.scrollTop;
      
      const x1 = slotRect.left - containerRect.left + container.scrollLeft;
      const y1 = slotRect.top + slotRect.height / 2 - containerRect.top + container.scrollTop;
      
      // Stepped connecting line
      const midX = x0 + (x1 - x0) / 2;
      const pathData = `M ${x0} ${y0} L ${midX} ${y0} L ${midX} ${y1} L ${x1} ${y1}`;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      
      // Highlight winner flow path
      const isWinnerA = (m.result === 'A' && isOdd);
      const isWinnerB = (m.result === 'B' && !isOdd);
      const isCorrectPath = (m.result && (m.result === 'A' || m.result === 'B'));
      
      if (isCorrectPath && (isWinnerA || isWinnerB)) {
        path.setAttribute('stroke', 'var(--gold)');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('filter', 'drop-shadow(0 0 4px rgba(212, 163, 89, 0.6))');
        path.setAttribute('marker-end', 'url(#arrow-gold)');
      } else {
        path.setAttribute('stroke', 'rgba(255, 255, 255, 0.15)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-dasharray', '4, 4');
        path.setAttribute('marker-end', 'url(#arrow-dim)');
      }
      
      svg.appendChild(path);
    });
  }
}

// Redraw connectors on screen size change to guarantee exact spacing alignment
window.addEventListener('resize', () => {
  if ($('#bracketContainer') && bracketData[activeKnockoutRound]) {
    const startIdx = ROUND_ORDER.indexOf(activeKnockoutRound);
    const visibleRounds = ROUND_ORDER.slice(startIdx, startIdx + 3);
    drawBracketConnectors(visibleRounds);
  }
});

function createBracketMatch(match, round) {
  const card = document.createElement('div');
  card.className = `bracket-match ${match.result ? 'has-result' : ''}`;
  card.dataset.matchId = match.id;
  
  // Match number badge
  const numBadge = document.createElement('span');
  numBadge.className = 'bracket-match-number';
  numBadge.textContent = `#${match.bracket_position}`;
  card.appendChild(numBadge);
  
  // Date hidden per user request
  
  // Team A slot
  card.appendChild(createTeamSlot(match, 'A'));
  // Team B slot
  card.appendChild(createTeamSlot(match, 'B'));
  
  return card;
}

function createTeamSlot(match, slot) {
  const team = slot === 'A' ? match.team_a : match.team_b;
  const flag = slot === 'A' ? match.flag_a : match.flag_b;
  const isTBD = team === 'A definir';
  
  const el = document.createElement('div');
  el.className = 'bracket-team-slot';
  el.dataset.matchId = match.id;
  el.dataset.slot = slot;
  
  // Winner/loser styling
  if (match.result) {
    const isWinner = (match.result === slot);
    el.classList.add(isWinner ? 'winner' : 'loser');
  }
  

  // Flag
  const flagImg = document.createElement('img');
  flagImg.className = 'team-flag-small';
  flagImg.src = getFlagUrl(flag);
  flagImg.alt = team;
  flagImg.onerror = function() { this.src = 'https://flagcdn.com/w40/un.png'; };
  el.appendChild(flagImg);
  
  // Team name
  const nameSpan = document.createElement('span');
  nameSpan.className = `team-name-small ${isTBD ? 'tbd' : ''}`;
  nameSpan.textContent = team;
  el.appendChild(nameSpan);
  
  // Admin features
  if (isAdmin) {
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'bracket-edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Editar equipo';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTeamSelector(match.id, slot, el.closest('.bracket-match'));
    });
    el.appendChild(editBtn);
    
    // Drag and drop
    if (!isTBD) {
      el.classList.add('admin-draggable');
      el.setAttribute('draggable', 'true');
      
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          matchId: match.id,
          slot: slot
        }));
        el.classList.add('dragging');
      });
      
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        $$('.bracket-team-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
      });
    }
    
    // Drop target
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    
    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over');
    });
    
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      
      try {
        const source = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetMatchId = match.id;
        const targetSlot = slot;
        
        if (source.matchId === targetMatchId && source.slot === targetSlot) return;
        
        const res = await fetch('/api/knockout/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceMatchId: source.matchId,
            sourceSlot: source.slot,
            targetMatchId,
            targetSlot
          })
        });
        
        if (res.ok) {
          showToast('🔄 Equipos intercambiados', 'success');
          loadBracket();
        }
      } catch (err) {
        showToast('Error al intercambiar equipos', 'error');
      }
    });
  }
  
  // Participant prediction (click to predict winner)
  if (selectedParticipant && !isKnockoutPhaseLocked(match.group_name) && !match.result && !isTBD) {
    const otherTeam = slot === 'A' ? match.team_b : match.team_a;
    if (otherTeam !== 'A definir') {
      el.classList.add('predictable');
      
      const prediction = tempPredictions[match.id] || currentPredictions[match.id];
      if (prediction === slot) {
        el.classList.add('predicted');
      }
      
      el.addEventListener('click', () => {
        setLocalPrediction(match.id, slot);
      });
    }
  }
  
  // Hover Tooltip for voters (only if show_predictions is enabled for this phase and not TBD)
  const phaseVis = window.allGlobalPredictions && window.allGlobalPredictions.phaseVisibility;
  const matchRound = match.group_name; // e.g. 'R32', 'R16', etc.
  const isPhaseVisible = isAdmin || (phaseVis && (phaseVis[matchRound] !== false));
  if (window.allGlobalPredictions && window.allGlobalPredictions.enabled && !isTBD && isPhaseVisible) {
    
    const showGhostTooltip = () => {
      // Remove any existing tooltip first
      removeActiveGhostTooltip();

      const voters = window.allGlobalPredictions.data.filter(p => p.match_id === match.id && p.prediction === slot);
      if (voters.length === 0) return;

      // Deduplicate by participant name
      const seen = new Set();
      const uniqueVoters = voters.filter(v => {
        const key = v.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const tooltip = document.createElement('div');
      tooltip.className = 'voters-ghost-tooltip';

      // Header with team name and count
      const header = document.createElement('div');
      header.className = 'voters-tooltip-header';
      header.innerHTML = `
        <span class="voters-tooltip-title">Votaron por ${escapeHtml(team)}</span>
        <span class="voters-tooltip-count">${uniqueVoters.length}</span>
      `;
      tooltip.appendChild(header);

      // Divider
      const divider = document.createElement('div');
      divider.className = 'voters-tooltip-divider';
      tooltip.appendChild(divider);

      // Voter list
      const list = document.createElement('div');
      list.className = 'voters-tooltip-list';
      uniqueVoters.forEach(v => {
        const item = document.createElement('div');
        item.className = 'voter-item';
        const displayName = v.nickname ? v.nickname : v.name;
        item.innerHTML = `<span class="voter-icon">👤</span><span class="voter-name">${escapeHtml(displayName)}</span>`;
        list.appendChild(item);
      });
      tooltip.appendChild(list);

      // Append to body (escapes overflow:hidden of parent containers)
      document.body.appendChild(tooltip);
      el.classList.add('tooltip-active');

      // Store global reference for cleanup
      window._activeGhostTooltip = tooltip;
      window._activeGhostSlot = el;

      // Position after DOM render so we can measure tooltip dimensions
      requestAnimationFrame(() => {
        positionGhostTooltip(tooltip, el);
        tooltip.classList.add('show');
      });
    };

    const hideGhostTooltip = () => {
      el.classList.remove('tooltip-active');
      if (window._activeGhostTooltip) {
        const tip = window._activeGhostTooltip;
        tip.classList.remove('show');
        window._activeGhostTooltip = null;
        window._activeGhostSlot = null;
        setTimeout(() => tip.remove(), 200);
      }
    };

    // Desktop: mouse events
    el.addEventListener('mouseenter', showGhostTooltip);
    el.addEventListener('mouseleave', hideGhostTooltip);

    // Mobile: touch events
    el.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (window._activeGhostSlot === el) {
        hideGhostTooltip();
      } else {
        showGhostTooltip();
      }
    }, { passive: true });
  }
  
  return el;
}

function openTeamSelector(matchId, slot, matchCard) {
  // Remove any existing selector
  const existing = matchCard.querySelector('.bracket-team-select');
  if (existing) { existing.remove(); matchCard.style.zIndex = ''; return; }
  
  const oldZIndex = matchCard.style.zIndex;
  matchCard.style.zIndex = '999';
  
  const dropdown = document.createElement('div');
  dropdown.className = 'bracket-team-select';
  
  const cleanup = () => {
    dropdown.remove();
    matchCard.style.zIndex = oldZIndex;
  };
  
  // Clear option
  const clearOpt = document.createElement('div');
  clearOpt.className = 'bracket-team-option clear-option';
  clearOpt.textContent = '🧹 Limpiar (A definir)';
  clearOpt.addEventListener('click', () => {
    updateKnockoutTeam(matchId, slot, 'A definir', 'un');
    cleanup();
  });
  dropdown.appendChild(clearOpt);
  
  // Team options
  for (const team of allTeams) {
    const opt = document.createElement('div');
    opt.className = 'bracket-team-option';
    
    const img = document.createElement('img');
    img.src = getFlagUrl(team.flag);
    img.onerror = function() { this.src = 'https://flagcdn.com/w40/un.png'; };
    opt.appendChild(img);
    
    const name = document.createElement('span');
    name.textContent = team.name;
    opt.appendChild(name);
    
    opt.addEventListener('click', () => {
      updateKnockoutTeam(matchId, slot, team.name, team.flag);
      cleanup();
    });
    
    dropdown.appendChild(opt);
  }
  
  matchCard.appendChild(dropdown);
  
  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        cleanup();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
}

async function updateKnockoutTeam(matchId, slot, teamName, flagCode) {
  try {
    const body = {};
    if (slot === 'A') {
      body.team_a = teamName;
      body.flag_a = flagCode;
    } else {
      body.team_b = teamName;
      body.flag_b = flagCode;
    }
    
    const res = await fetch(`/api/knockout/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (res.ok) {
      showToast(`✅ ${teamName} asignado correctamente`, 'success');
      loadBracket();
    }
  } catch (err) {
    showToast('Error al actualizar equipo', 'error');
  }
}

// Setup knockout round tab listeners
function setupKnockoutTabs() {
  const tabs = $$('.knockout-round-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeKnockoutRound = tab.dataset.round;
      renderBracket();
    });
  });
}
// ─── Tournament Phase Management ────────────────────────
async function advanceTournamentPhase(e) {
  if (e) e.preventDefault();
  
  if (!confirm('¿Estás seguro de habilitar las Eliminatorias? Esto abrirá las pestañas de eliminatorias para que los participantes empiecen a llenar sus pronósticos. La fase de grupos seguirá visible.')) {
    return;
  }
  
  const btn = $('#btnAdvancePhase');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Procesando...</span>';
  
  try {
    const res = await fetch('/api/admin/start-knockout', { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      showToast('✅ ¡Eliminatorias habilitadas! Los participantes ya pueden empezar a llenar sus pronósticos de eliminación.', 'success');
      
      // 🎉 Fire confetti
      if (window.confetti && window.celebrationsEnabled !== false) {
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 10000 });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 10000 });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
      }
      
      await loadData(); // reload everything to get new phase and bracket
    } else {
      showToast(data.error || 'Error al iniciar eliminatorias', 'error');
    }
  } catch (err) {
    showToast('Error de red', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── Reset de Puntos ─────────────────────────────────────────
async function resetPoints(e) {
  if (e) e.preventDefault();
  
  if (!confirm('⚠️ ATENCIÓN: Esto borrará TODAS las predicciones de la fase de grupos de todos los participantes y sus puntos bajarán a 0.\n\n¿Estás seguro?')) {
    return;
  }
  
  if (!confirm('🔴 ÚLTIMA CONFIRMACIÓN: Esta acción es IRREVERSIBLE. Las apuestas de la fase de grupos se perderán para siempre.\n\n¿Confirmas que deseas continuar?')) {
    return;
  }
  
  const btn = $('#btnResetPoints');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳ Reseteando...</span>';
  
  try {
    const res = await fetch('/api/admin/reset-points', { method: 'POST' });
    
    if (res.ok) {
      showToast('🔄 ¡Puntos reseteados! Todas las predicciones de grupo han sido eliminadas. Los participantes empiezan de 0.', 'success');
      await loadData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Error al resetear puntos', 'error');
    }
  } catch (err) {
    showToast('Error de red', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// Classified Modal Events
document.addEventListener('DOMContentLoaded', () => {
  const closeClassified = () => {
    $('#knockoutStartModal').classList.remove('show');
    // Switch to Grupos tab (which now shows Versus)
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    
    const tab = $('#tabGroups');
    const section = $('#sectionGroups');
    if (tab) tab.classList.add('active');
    if (section) section.classList.add('active');
  };
  
  if ($('#btnClassifiedClose')) $('#btnClassifiedClose').addEventListener('click', closeClassified);
  if ($('#btnGoToVersus')) $('#btnGoToVersus').addEventListener('click', closeClassified);
});

async function resetTournamentPhase(e) {
  if (e) e.preventDefault();
  
  if (!confirm('⚠️ PELIGRO: ¿Estás seguro de reiniciar la Fase de Grupos? Se borrarán todos los equipos asignados al bracket y las apuestas de la fase final.')) {
    return;
  }
  
  const btn = $('#btnResetPhase');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner">⏳...</span>';
  
  try {
    const res = await fetch('/api/admin/reset-knockout', { method: 'POST' });
    if (res.ok) {
      showToast('🔄 Torneo reiniciado a Fase de Grupos', 'success');
      
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      
      const tab = $('#tabGroups');
      const section = $('#sectionGroups');
      if (tab) tab.classList.add('active');
      if (section) section.classList.add('active');
      
      // Clear in-memory predictions
      currentPredictions = {};
      
      await loadData();
      
      if (selectedParticipant) {
        await loadPredictions(selectedParticipant.id);
      } else {
        renderGroups();
      }
    } else {
      const data = await res.json();
      showToast(data.error || 'Error al reiniciar', 'error');
    }
  } catch (err) {
    showToast('Error de red', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}


// ─── Profile Modal ──────────────────────────────────────
let profileAvatarFile = null;

function openProfileModal() {
  if (!selectedParticipant) return;
  
  const modal = $('#profileModal');
  
  // Fill current data
  const avatarSrc = selectedParticipant.avatar || DEFAULT_AVATAR;
  $('#profileAvatarPreview').src = avatarSrc;
  $('#profileNickname').value = selectedParticipant.nickname || '';
  
  // Find stats
  const pData = participantsData.find(p => p.id === selectedParticipant.id);
  if (pData) {
    const rank = participantsData.indexOf(pData) + 1;
    $('#profileStatPoints').textContent = pData.points;
    $('#profileStatAciertos').textContent = pData.aciertos;
    $('#profileStatRank').textContent = rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`;
  }
  
  profileAvatarFile = null;
  modal.classList.add('show');
}

function closeProfileModal() {
  $('#profileModal').classList.remove('show');
  profileAvatarFile = null;
}

// Close modal events
document.addEventListener('DOMContentLoaded', () => {
  const profileModal = $('#profileModal');
  if ($('#btnProfileClose')) {
    $('#btnProfileClose').addEventListener('click', closeProfileModal);
  }
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfileModal();
    });
  }
  
  // Avatar preview
  if ($('#profileAvatarInput')) {
    $('#profileAvatarInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        showToast('La imagen no puede pesar más de 8MB', 'error');
        return;
      }
      profileAvatarFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        $('#profileAvatarPreview').src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  
  // Save profile
  if ($('#btnSaveProfile')) {
    $('#btnSaveProfile').addEventListener('click', saveProfile);
  }
});

async function saveProfile() {
  if (!selectedParticipant) return;
  
  const btn = $('#btnSaveProfile');
  const btnText = btn.querySelector('.btn-text');
  const btnSpinner = btn.querySelector('.btn-spinner');
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline';
  
  try {
    const formData = new FormData();
    formData.append('participant_id', selectedParticipant.id);
    formData.append('nickname', $('#profileNickname').value.trim());
    
    if (profileAvatarFile) {
      formData.append('avatar', profileAvatarFile);
    }
    
    const res = await fetch('/api/participants/update-profile', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Update local state
      selectedParticipant.nickname = data.nickname;
      selectedParticipant.avatar = data.avatar;
      
      // Update header
      $('#loggedInName').textContent = selectedParticipant.name;
      $('#loggedInNickname').textContent = data.nickname ? `"${data.nickname}"` : '';
      $('#headerAvatarImg').src = data.avatar || DEFAULT_AVATAR;
      
      showToast('✅ ¡Perfil actualizado!', 'success');
      closeProfileModal();
      
      // Reload to update leaderboard
      await loadData();
    } else {
      showToast(data.error || 'Error al guardar perfil', 'error');
    }
  } catch (err) {
    showToast('Error de red', 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

// ─── Utilities ──────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast show toast-${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ─── Real-time Celebration & Update Polling ───────────────
window.previousMatchesFlat = null;

function triggerFullscreenCelebration(match) {
  if (window.celebrationsEnabled === false) return;
  
  const overlay = document.getElementById('matchWinnerCelebration');
  if (!overlay) return;
  
  // Fill details
  document.getElementById('celFlagA').src = getFlagUrl(match.flag_a);
  document.getElementById('celNameA').textContent = truncName(match.team_a);
  document.getElementById('celFlagB').src = getFlagUrl(match.flag_b);
  document.getElementById('celNameB').textContent = truncName(match.team_b);
  
  const titleEl = document.getElementById('celebrationResultTitle');
  const winnerEl = document.getElementById('celebrationResultWinner');
  
  if (match.result === 'D') {
    titleEl.textContent = '🤝 ¡EMPATE OFICIAL! 🤝';
    winnerEl.innerHTML = '<span class="celebration-draw-text">Tablas del Partido</span>';
  } else {
    const isA = match.result === 'A';
    const winTeam = isA ? match.team_a : match.team_b;
    const winFlag = isA ? match.flag_a : match.flag_b;
    titleEl.textContent = '🏆 ¡GANADOR OFICIAL! 🏆';
    winnerEl.innerHTML = `
      <img src="${getFlagUrl(winFlag)}" class="celebration-winner-flag-img" onerror="this.src='https://flagcdn.com/w160/un.png'">
      <span class="celebration-winner-name-text">${winTeam}</span>
    `;
  }
  
  // Show overlay
  overlay.classList.add('show');
  
  // Massive confetti storm!
  if (window.confetti && window.celebrationsEnabled !== false) {
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100005 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  }
  
  // Hide after 6.5 seconds
  setTimeout(() => {
    overlay.classList.remove('show');
  }, 6500);
}

async function pollMatchUpdates() {
  try {
    // Also load fun facts to update the notification dot if needed
    await loadFunFacts();

    const res = await fetch('/api/matches/all');
    if (!res.ok) return;
    const newMatchesFlat = await res.json();
    
    // Check if we have previous matches cached
    if (window.previousMatchesFlat) {
      for (const newM of newMatchesFlat) {
        const oldM = window.previousMatchesFlat.find(m => m.id === newM.id);
        if (oldM && oldM.result === null && newM.result !== null) {
          // A new winner was registered!
          triggerFullscreenCelebration(newM);
          
          // Force a full reload of standings, leaderboard, stats, etc. to sync the UI
          await loadData();
          break; // Trigger one celebration at a time
        }
      }
    }
    
    // Cache the flat matches
    window.previousMatchesFlat = newMatchesFlat;
  } catch (err) {
    console.error('Real-time poll error:', err);
  }
}

// Start polling for real-time match completions every 8 seconds
setInterval(pollMatchUpdates, 8000);

// Sync settings (visibility toggles, etc.) every 10 seconds so all clients stay up to date
async function pollSettingsSync() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    const changed = 
      showPredictions !== (settings.showPredictions !== undefined ? settings.showPredictions : true) ||
      showPredictionsR32 !== (settings.showPredictionsR32 !== undefined ? settings.showPredictionsR32 : true) ||
      showPredictionsR16 !== (settings.showPredictionsR16 !== undefined ? settings.showPredictionsR16 : true) ||
      showPredictionsQF !== (settings.showPredictionsQF !== undefined ? settings.showPredictionsQF : true) ||
      showPredictionsSF !== (settings.showPredictionsSF !== undefined ? settings.showPredictionsSF : true) ||
      showPredictionsThird !== (settings.showPredictionsThird !== undefined ? settings.showPredictionsThird : true) ||
      showPredictionsFinal !== (settings.showPredictionsFinal !== undefined ? settings.showPredictionsFinal : true) ||
      showAciertos !== (settings.showAciertos !== undefined ? settings.showAciertos : true);

    if (changed) {
      showPredictions = settings.showPredictions !== undefined ? settings.showPredictions : true;
      showPredictionsR32 = settings.showPredictionsR32 !== undefined ? settings.showPredictionsR32 : true;
      showPredictionsR16 = settings.showPredictionsR16 !== undefined ? settings.showPredictionsR16 : true;
      showPredictionsQF = settings.showPredictionsQF !== undefined ? settings.showPredictionsQF : true;
      showPredictionsSF = settings.showPredictionsSF !== undefined ? settings.showPredictionsSF : true;
      showPredictionsThird = settings.showPredictionsThird !== undefined ? settings.showPredictionsThird : true;
      showPredictionsFinal = settings.showPredictionsFinal !== undefined ? settings.showPredictionsFinal : true;
      showAciertos = settings.showAciertos !== undefined ? settings.showAciertos : true;
      
      updatePredictionsUI();
      updateAciertosUI();
      renderLeaderboard();
      
      // Reload predictions data so tooltips respect new settings
      const allPredsRes = await fetch('/api/predictions/all');
      if (allPredsRes.ok) {
        window.allGlobalPredictions = await allPredsRes.json();
      }
    }
  } catch (err) {
    // Silent fail - settings sync is non-critical
  }
}
setInterval(pollSettingsSync, 10000);

// ─── Excel Report Export ──────────────────────────────────────
window.downloadCSVReport = async function() {
  showToast('📊 Generando reporte Excel...', 'success');
  
  try {
    const res = await fetch('/api/admin/export-excel');
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Error al generar reporte', 'error');
      return;
    }
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `quinela_reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Prevent immediate revocation to allow browser to download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    showToast('📥 Reporte Excel descargado con éxito', 'success');
  } catch (err) {
    showToast('Error de red al descargar reporte', 'error');
  }
};


// ─── PDF Report Export (Fase Dinámica) ──────────────────────
window.downloadPhasePDF = async function() {
  const currentPhase = window.tournamentPhase || 'groups';
  const phaseName = currentPhase === 'knockout' ? 'Eliminatorias' : 'Fase de Grupos';
  showToast(`📄 Generando PDF de ${phaseName}...`, 'success');
  
  try {
    const { jsPDF } = window.jspdf;
    
    // Fetch fresh data
    const [matchesRes, participantsRes, predRes] = await Promise.all([
      fetch('/api/matches/all'),
      fetch('/api/participants'),
      fetch('/api/predictions/all')
    ]);
    
    if (!matchesRes.ok || !participantsRes.ok || !predRes.ok) {
      throw new Error("No se pudo obtener la información completa");
    }
    
    const allMatches = await matchesRes.json();
    const participants = await participantsRes.json();
    const predResponse = await predRes.json();
    const allPredictions = predResponse.data || predResponse || [];
    
    const currentPhase = window.tournamentPhase || 'groups';
    const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
    
    // Select matches based on current phase
    let targetMatches = [];
    if (currentPhase === 'knockout') {
      targetMatches = allMatches.filter(m => knockoutRounds.includes(m.group_name));
    } else {
      targetMatches = allMatches.filter(m => !knockoutRounds.includes(m.group_name) && m.group_name !== 'Prueba');
    }
    
    // Create prediction map
    const predMap = {};
    for (const pr of allPredictions) {
      if (!predMap[pr.participant_id]) predMap[pr.participant_id] = {};
      predMap[pr.participant_id][pr.match_id] = pr.prediction;
    }
    
    // Setup PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    let isFirstPage = true;
    
    let groupOrder = [];
    if (currentPhase === 'knockout') {
      groupOrder = knockoutRounds.filter(r => targetMatches.some(m => m.group_name === r));
    } else {
      groupOrder = [...new Set(targetMatches.map(m => m.group_name))].sort();
    }
    
    // Helper to calculate group points
    function calcGroupPoints(participantId, gMatches) {
      let pts = 0, aci = 0;
      for (const m of gMatches) {
        const pred = predMap[participantId]?.[m.id];
        if (m.result && pred === m.result) {
          aci++;
          pts += m.result === 'D' ? window.pointsDraw : window.pointsWin;
        }
      }
      return { pts, aci };
    }
    
    for (const groupName of groupOrder) {
      const gMatches = targetMatches.filter(m => m.group_name === groupName);
      if (gMatches.length === 0) continue;
      
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      const phaseTitle = currentPhase === 'knockout' ? 'Eliminatorias' : 'Fase de Grupos';
      const roundNameMap = { 'R32': '16avos de Final', 'R16': 'Octavos de Final', 'QF': 'Cuartos de Final', 'SF': 'Semifinales', 'Third': 'Tercer Lugar', 'Final': 'Final' };
      const groupDisplay = currentPhase === 'knockout' ? (roundNameMap[groupName] || groupName) : `GRUPO ${groupName}`;
      doc.text(`Quinela Mundial 2026 - ${phaseTitle} : ${groupDisplay}`, 14, 15);
      
      const head = currentPhase === 'knockout' ? [['Participante', 'Puntos']] : [['Participante', 'Aciertos', 'Puntos']];
      for (const m of gMatches) {
        const shortA = m.team_a.substring(0, 3).toUpperCase();
        const shortB = m.team_b.substring(0, 3).toUpperCase();
        head[0].push(`${shortA} vs ${shortB}`);
      }
      
      const body = [];
      
      // Sort participants by points in this group
      const sortedParticipants = [...participants].sort((a, b) => {
         const statsA = calcGroupPoints(a.id, gMatches);
         const statsB = calcGroupPoints(b.id, gMatches);
         return statsB.pts - statsA.pts || statsB.aci - statsA.aci;
      });
      
      for (const p of sortedParticipants) {
        const stats = calcGroupPoints(p.id, gMatches);
        const rowData = currentPhase === 'knockout' ? [p.name, stats.pts.toString()] : [p.name, stats.aci.toString(), stats.pts.toString()];
        
        for (const m of gMatches) {
          const pred = predMap[p.id]?.[m.id];
          let cellText = 'Sin apuesta';
          if (pred === 'A') cellText = `${m.team_a.substring(0, 3).toUpperCase()}`;
          else if (pred === 'B') cellText = `${m.team_b.substring(0, 3).toUpperCase()}`;
          else if (pred === 'D') cellText = 'Empate';
          
          if (m.result) {
            if (!pred) cellText = 'SIN APUESTA';
            else if (pred === m.result) {
               const earned = m.result === 'D' ? window.pointsDraw : window.pointsWin;
               cellText += ` (+${earned})`;
            } else {
               cellText += ' (0)';
            }
          }
          
          // Color logic setup via jspdf-autotable hooks
          rowData.push({
            content: cellText,
            styles: {
               fillColor: m.result ? (!pred ? [156, 163, 175] : (pred === m.result ? [34, 197, 94] : [239, 68, 68])) : [255, 255, 255],
               textColor: m.result ? [255, 255, 255] : [51, 65, 85],
               fontStyle: m.result && pred === m.result ? 'bold' : 'normal'
            }
          });
        }
        body.push(rowData);
      }
      
      doc.autoTable({
        startY: 20,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'center', fontSize: 10 },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', minCellWidth: 40 },
          1: { halign: 'center', minCellWidth: 15 },
          2: { halign: 'center', minCellWidth: 15 },
        },
        styles: { fontSize: 8, halign: 'center', valign: 'middle' },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 2) {
             const raw = data.cell.raw;
             if (raw && raw.styles) {
               data.cell.styles.fillColor = raw.styles.fillColor;
               data.cell.styles.textColor = raw.styles.textColor;
               data.cell.styles.fontStyle = raw.styles.fontStyle;
             }
          }
        }
      });
    }
    
    const fileNameSuffix = currentPhase === 'knockout' ? 'Eliminatorias' : 'Fase_Grupos';
    doc.save(`Quinela_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('📥 PDF generado con éxito', 'success');
    
  } catch (err) {
    console.error(err);
    showToast('Error al generar el PDF', 'error');
  }
};

// ─── App Tour (Onboarding) ──────────────────────────────────
const AppTour = {
  steps: [
    {
      target: '.tabs-nav',
      title: '🧭 Navegación Principal',
      text: 'Muévete por el Mundial. Aquí podrás alternar entre la Tabla General, los Grupos, Tendencias y la Fase Final.'
    },
    {
      target: () => selectedParticipant ? '#participantHeaderCard' : '#participantLoginCard',
      title: '🔑 Tu Acceso a la Quinela',
      text: 'Para empezar a predecir, necesitas iniciar sesión con el usuario y contraseña que te proporcionó el Administrador.',
      onBefore: () => { 
        const tab = document.querySelector('.tab[data-tab="groups"]');
        if (tab) tab.click(); 
      }
    },
    {
      target: '#sectionLeaderboard .section-header',
      title: '🏆 Tabla General',
      text: 'Sigue la acción en tiempo real. Aquí verás quién lidera la competencia, tus aciertos y puntos totales.',
      onBefore: () => { 
        const tab = document.querySelector('.tab[data-tab="leaderboard"]');
        if (tab) tab.click(); 
      }
    },
    {
      target: '#btnVirus',
      title: '🦠 Datos Curiosos',
      text: 'Descubre increíbles datos mundialistas tocando el Virus o consulta el reglamento oficial en cualquier momento.'
    },
    {
      target: '.header-stats',
      title: '🎉 ¡Listo para la Gloria!',
      text: '¡Estás preparado! Recuerda siempre hacer click en "💾 Guardar Apuestas" cada vez que pronostiques. ¡Mucha suerte!'
    }
  ],
  currentStep: 0,
  isActive: false,
  resizeTimeout: null,

  init() {
    $('#btnStartTour').addEventListener('click', () => this.start());
    $('#tourBtnNext').addEventListener('click', () => this.next());
    $('#tourBtnPrev').addEventListener('click', () => this.prev());
    
    // Auto-start si es la primera vez (después de 1.5s)
    setTimeout(() => {
      if (!localStorage.getItem('quinela_tour_visto')) {
        this.start();
      }
    }, 1500);
    
    window.addEventListener('resize', () => {
      if (!this.isActive) return;
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.recalcPosition(), 100);
    });
    
    window.addEventListener('scroll', () => {
      if (this.isActive) this.recalcPosition();
    }, { passive: true });
  },

  start() {
    this.isActive = true;
    this.currentStep = 0;
    $('#tourBackdrop').classList.add('active');
    this.renderStep();
    localStorage.setItem('quinela_tour_visto', 'true');
  },

  end() {
    this.isActive = false;
    $('#tourBackdrop').classList.remove('active');
    $('#tourDialog').classList.remove('visible');
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.end();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  renderStep() {
    const step = this.steps[this.currentStep];
    
    if (step.onBefore) step.onBefore();
    
    $('#tourTitle').innerHTML = step.title;
    $('#tourText').innerHTML = step.text;
    
    const dotsHtml = this.steps.map((_, i) => `<div class="tour-dot ${i === this.currentStep ? 'active' : ''}"></div>`).join('');
    $('#tourDots').innerHTML = dotsHtml;
    
    $('#tourBtnPrev').style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    $('#tourBtnNext').innerHTML = this.currentStep === this.steps.length - 1 ? 'Terminar' : 'Siguiente';
    
    // Ocultar modal temporalmente mientras hace scroll
    $('#tourDialog').classList.remove('visible');
    $('#tourHighlight').style.opacity = '0';
    
    setTimeout(() => this.updateHighlight(), 50);
  },

  updateHighlight() {
    if (!this.isActive) return;
    const step = this.steps[this.currentStep];
    const targetSelector = typeof step.target === 'function' ? step.target() : step.target;
    const targetEl = document.querySelector(targetSelector);
    
    if (!targetEl) {
      // Fallback si no encuentra el elemento
      setTimeout(() => this.recalcPosition(), 100);
      return;
    }
    
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
      $('#tourHighlight').style.opacity = '1';
      this.recalcPosition();
    }, 400); // Dar tiempo al scroll de terminar
  },

  recalcPosition() {
    const step = this.steps[this.currentStep];
    const targetSelector = typeof step.target === 'function' ? step.target() : step.target;
    const targetEl = document.querySelector(targetSelector);
    
    const highlight = $('#tourHighlight');
    const dialog = $('#tourDialog');
    
    if (!targetEl) {
      dialog.classList.add('visible');
      highlight.style.opacity = '0';
      return;
    }
    
    const rect = targetEl.getBoundingClientRect();
    
    // Padding para que la luz envuelva al elemento
    const p = 8;
    highlight.style.top = (rect.top - p) + 'px';
    highlight.style.left = (rect.left - p) + 'px';
    highlight.style.width = (rect.width + p * 2) + 'px';
    highlight.style.height = (rect.height + p * 2) + 'px';
    
    // Posicionar el cuadro de diálogo inteligentemente
    dialog.classList.add('visible');
    let dTop = rect.bottom + 15;
    let dLeft = rect.left + (rect.width / 2) - 160; // Centrado respecto al elemento
    
    // Si no cabe abajo, ponlo arriba
    if (dTop + 180 > window.innerHeight) {
      dTop = rect.top - dialog.offsetHeight - 15;
      if (dTop < 10) dTop = 10; // Margen superior mínimo
    }
    
    // Bounds horizontales
    if (dLeft < 10) dLeft = 10;
    if (dLeft + 320 > window.innerWidth) dLeft = window.innerWidth - 330;
    
    dialog.style.top = dTop + 'px';
    dialog.style.left = dLeft + 'px';
  }
};

window.unlockGroup = function(groupName) {
  unlockedGroups[groupName] = true;
  renderGroups();
};

window.unlockPrediction = function(matchId) {
  unlockedMatches[matchId] = true;
  renderGroups();
};

// Start the tour initializer after all DOM loads
window.addEventListener('load', () => {
  AppTour.init();
});

// ─── Ad Modal Functions ──────────────────────────────────
function checkAndShowAd() {
  if (!adEnabled) return;
  
  if (adFrequency === 'session') {
    if (sessionStorage.getItem('adShown')) return;
    sessionStorage.setItem('adShown', 'true');
  }
  
  showAdModal();
}

function showAdModal() {
  const overlay = $('#adModalOverlay');
  const body = $('#adModalBody');
  if (!overlay || !body) return;

  let imageHtml = '';
  if (adImage) {
    imageHtml = `
      <a href="${adLink || '#'}" target="${adLink ? '_blank' : '_self'}" class="ad-banner-link">
        <img src="${adImage}" alt="${adTitle}" class="ad-banner-img">
      </a>
    `;
  }

  let ctaHtml = '';
  if (adLink) {
    ctaHtml = `
      <a href="${adLink}" target="_blank" class="ad-action-btn">
        🔗 Visitar Anuncio
      </a>
    `;
  }

  body.innerHTML = `
    ${imageHtml}
    <h3 class="ad-title">${adTitle || '¡Anuncio Publicitario!'}</h3>
    <p class="ad-desc">${adDescription || ''}</p>
    ${ctaHtml}
  `;

  overlay.style.display = 'flex';
  // Trigger reflow to run transition
  overlay.offsetHeight; 
  overlay.classList.add('show');

  // Dismiss on clicking close btn
  const closeBtn = $('#btnAdModalClose');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeAdModal();
    };
  }

  // Dismiss on overlay click (which includes card click since it propagates)
  overlay.onclick = () => {
    closeAdModal();
  };
}

function closeAdModal() {
  const overlay = $('#adModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 400); // matches transition time
}

window.handleAdImageUpload = async function(input) {
  const file = input.files[0];
  if (!file) return;

  $('#adFileName').textContent = file.name;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/settings/ad/image', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }

    const data = await res.json();
    adImage = data.imagePath;

    // Show preview
    $('#adImagePreview').src = adImage;
    $('#adImagePreviewContainer').style.display = 'block';
    showToast('📸 Imagen de anuncio cargada', 'success');
  } catch (err) {
    showToast('Error al subir la imagen', 'error');
  }
};

window.saveAdSettings = async function(btn) {
  const enabled = $('#adToggle').checked;
  const title = $('#adInputTitle').value.trim();
  const description = $('#adInputDescription').value.trim();
  const link = $('#adInputLink').value.trim();
  const frequency = $('#adSelectFrequency').value;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Guardando...';

  try {
    const res = await fetch('/api/settings/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, title, description, link, frequency })
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, 'error');
      return;
    }

    adEnabled = enabled;
    adTitle = title;
    adDescription = description;
    adLink = link;
    adFrequency = frequency;

    showToast('✅ Configuración de anuncio guardada', 'success');
  } catch (err) {
    showToast('Error al guardar la configuración del anuncio', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

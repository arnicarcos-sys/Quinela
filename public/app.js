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
let showPredictions = true;
let pointsWin = 3;
let pointsDraw = 1;
let predictionStats = {};
let standingsData = {};
let flagEffectsData = {};
let adminShowGroupHistory = false;
let activeAdminVersusRound = 'R32';
let tempPredictions = {};
let activeTendenciasFilter = 'all';
let lastSeenLeaderboardMaxPoints = -1;

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

  // Predictions toggle
  if ($('#predictionsToggle')) {
    $('#predictionsToggle').addEventListener('change', togglePredictionsVisibility);
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
    updateBetsUI();

    // Predictions visibility state
    showPredictions = settings.showPredictions !== undefined ? settings.showPredictions : true;
    updatePredictionsUI();
    
    // Celebrations state
    window.celebrationsEnabled = settings.celebrationsEnabled !== undefined ? settings.celebrationsEnabled : true;
    if (typeof updateCelebrationsUI === 'function') {
      updateCelebrationsUI(window.celebrationsEnabled);
    }
    
    // Points settings
    pointsWin = settings.pointsWin !== undefined ? settings.pointsWin : 3;
    pointsDraw = settings.pointsDraw !== undefined ? settings.pointsDraw : 1;
    if ($('#inputPointsWin')) $('#inputPointsWin').value = pointsWin;
    if ($('#inputPointsDraw')) $('#inputPointsDraw').value = pointsDraw;

    // Tournament Phase
    tournamentPhase = settings.tournamentPhase || 'groups';
    
    if (tournamentPhase === 'knockout') {
      await loadBracket();
    }
    
    updateStats(stats);
    renderLeaderboard();
    renderGroups();
    renderAdminPanel();
    renderTendencias();
    loadFunFacts();
  } catch (err) {
    showToast('Error al cargar datos', 'error');
    console.error(err);
  }
}

function updateStats(stats) {
  $('#statParticipants').textContent = stats.totalParticipants;
  $('#statPlayed').textContent = `${stats.playedMatches}/72`;
  $('#capacityText').textContent = `${stats.totalParticipants}/50 participantes`;
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
        <th style="text-align:center">Aciertos</th>
        <th style="text-align:center">Pendientes</th>
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
            currentRank = i + 1;
          }
          lastPoints = p.points;
          const rank = currentRank;
          
          const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-default';
          
          // Highlight all participants sharing the max score
          const isLeader = maxPoints > 0 && p.points === maxPoints;
          const rowClass = isLeader ? 'leaderboard-leader-row' : '';
          
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
          const pending = Math.max(0, totalMatches - p.total_predictions);
          
          const isClickable = isAdmin || showPredictions || (selectedParticipant && selectedParticipant.id === p.id);
          const clickableClass = isClickable ? 'clickable-row' : 'non-clickable-row';

          const avatarClass = rank <= 3 ? `rank-${rank}-avatar` : '';
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
                  ${rank === 1 ? '<span class="mini-rank-badge gold-badge">✨</span>' : ''}
                  ${rank === 2 ? '<span class="mini-rank-badge bronze-badge">✨</span>' : ''}
                  ${rank === 3 ? '<span class="mini-rank-badge silver-badge">✨</span>' : ''}
                </div>
                ${displayName}
              </td>
              <td class="aciertos-cell" style="text-align:center">${p.aciertos}</td>
              <td class="pending-cell" style="text-align:center">
                <span class="badge ${pending > 0 ? 'badge-warning' : 'badge-success'}">${pending}</span>
              </td>
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
    
    card.innerHTML = `
      <div class="group-header">
        <span class="group-letter">Grupo ${groupName}</span>
        <span class="group-label">${matches.length} partidos</span>
      </div>
      ${standingsHtml}
      <div class="group-matches">
        ${matches.map(m => renderMatchCard(m)).join('')}
      </div>
      ${selectedParticipant && !isHistoryView ? `
        <div class="group-footer" style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; background: rgba(0,0,0,0.1);">
          <button class="btn btn-primary btn-save-group" onclick="saveGroupBets(this, '${groupName}')">
            <span class="btn-text">💾 Guardar Apuestas</span>
            <span class="btn-spinner" style="display:none;">⏳</span>
          </button>
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
    
    // Deshabilitar pestaña del Tercer Lugar si el partido aún no está definido
    if (round === 'Third') {
      const thirdMatches = bracketData['Third'] || [];
      const thirdMatch = thirdMatches[0];
      if (!thirdMatch || thirdMatch.team_a === 'A definir' || thirdMatch.team_b === 'A definir') {
        isDisabled = true;
      }
    }
    
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
    
    const card = document.createElement('div');
    card.className = `vs-card ${hasResult ? 'has-result' : ''} ${isTBD ? 'tbd-card' : ''}`;
    card.style.animationDelay = `${i * 0.06}s`;
    
    // Date
    let dateHtml = '';
    if (match.match_datetime) {
      dateHtml = `<div class="vs-card-date">🕒 ${new Date(match.match_datetime).toLocaleString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>`;
    }
    
    // Winner/loser classes
    const teamAClass = hasResult ? (match.result === 'A' ? 'winner-team' : 'loser-team') : '';
    const teamBClass = hasResult ? (match.result === 'B' ? 'winner-team' : 'loser-team') : '';
    
    // Effects
    const effectA = flagEffectsData[match.flag_a] ? flagEffectsData[match.flag_a].effect : '';
    const effectB = flagEffectsData[match.flag_b] ? flagEffectsData[match.flag_b].effect : '';
    
    // Prediction buttons
    let predictionHtml = '';
    if (selectedParticipant && !hasResult && !isTBD && betsEnabled) {
      predictionHtml = `
        <div class="vs-prediction-row">
          <button class="vs-pred-btn ${prediction === 'A' ? 'selected' : ''}" 
                  onclick="setVsPrediction(${match.id}, 'A')">
            🟢 ${match.team_a}
          </button>
          <button class="vs-pred-btn ${prediction === 'B' ? 'selected' : ''}" 
                  onclick="setVsPrediction(${match.id}, 'B')">
            🟢 ${match.team_b}
          </button>
        </div>
      `;
    } else if (selectedParticipant && !hasResult && isTBD) {
      predictionHtml = `<div class="vs-result-badge vs-result-pending">⏳ Equipos por definir</div>`;
    } else if (!selectedParticipant && !isTBD) {
      predictionHtml = `<div class="vs-result-badge vs-result-pending">🔒 Inicia sesión para pronosticar</div>`;
    }
    
    // Result badge
    let resultBadge = '';
    if (hasResult && selectedParticipant) {
      if (!prediction) {
        resultBadge = `<div class="vs-result-badge vs-result-pending">⚪ Sin pronóstico</div>`;
      } else if (prediction === match.result) {
        resultBadge = `<div class="vs-result-badge vs-result-correct">✅ ¡Acertaste! +${pointsWin} pts</div>`;
      } else {
        resultBadge = `<div class="vs-result-badge vs-result-wrong">❌ Fallaste</div>`;
      }
    } else if (hasResult && !selectedParticipant) {
      const winnerName = match.result === 'A' ? match.team_a : match.team_b;
      resultBadge = `<div class="vs-result-badge vs-result-pending">🏆 Ganó ${winnerName}</div>`;
    }
    
    card.innerHTML = `
      ${dateHtml}
      <div class="vs-teams-row">
        <div class="vs-team ${teamAClass}">
          <div style="position: relative; display: inline-flex;">
            <img class="vs-team-flag ${effectA}" data-flag="${match.flag_a}" src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
            ${effectA === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class="mini-confetti-badge">🎉</span>' : ''}
          </div>
          <span class="vs-team-name">${match.team_a}</span>
        </div>
        <span class="vs-badge">VS</span>
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
      resultBadge = `<div class="match-result-badge result-correct">✅ ¡Acertaste! +${pts} pts</div>`;
    } else {
      resultBadge = `<div class="match-result-badge result-wrong">❌ Fallaste</div>`;
    }
  } else if (hasResult) {
    const resultText = match.result === 'A' ? `Ganó ${match.team_a}` : match.result === 'B' ? `Ganó ${match.team_b}` : 'Empate';
    resultBadge = `<div class="match-result-badge result-no-pred">📋 ${resultText}</div>`;
  }
  
  return `
    <div class="match-card ${hasResult ? 'has-result' : ''}">
      ${match.match_datetime ? `<div class="match-date" style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-bottom: 8px;">🕒 ${new Date(match.match_datetime).toLocaleString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
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
                  ${hasResult || !betsEnabled || tournamentPhase === 'knockout' ? 'disabled' : ''}>
            ${match.team_a}
            <span class="pred-label">Gana</span>
          </button>
          <button class="pred-btn ${prediction === 'D' ? 'selected-d' : ''}" 
                  onclick="setLocalPrediction(${match.id}, 'D')" 
                  ${hasResult || !betsEnabled || tournamentPhase === 'knockout' ? 'disabled' : ''}>
            Empate
            <span class="pred-label">1 pt</span>
          </button>
          <button class="pred-btn ${prediction === 'B' ? 'selected-b' : ''}" 
                  onclick="setLocalPrediction(${match.id}, 'B')" 
                  ${hasResult || !betsEnabled || tournamentPhase === 'knockout' ? 'disabled' : ''}>
            ${match.team_b}
            <span class="pred-label">Gana</span>
          </button>
        </div>
        ${tournamentPhase === 'knockout' && !hasResult ? '<div class="bets-closed-banner">🔒 Fase de Grupos Finalizada</div>' : (!betsEnabled && !hasResult ? '<div class="bets-closed-banner">🔒 Apuestas cerradas por el administrador</div>' : '')}
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
    
    // Reload data to update leaderboard/standings/stats
    await loadData();
    
    // Revert after 2 seconds
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.remove('saved');
      btn.classList.add('btn-primary');
      btn.style.background = '';
      btn.style.color = '';
      btn.style.boxShadow = '';
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
  tempPredictions[matchId] = prediction;
  
  if (tournamentPhase === 'knockout') {
    if (document.getElementById('sectionKnockout').classList.contains('active')) {
      loadBracket();
    }
  }
  renderGroups();
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

async function setVsPrediction(matchId, prediction) {
  setLocalPrediction(matchId, prediction);
}

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
    if (pred && pred !== currentPredictions[m.id]) {
      predictionsToSave.push({ match_id: m.id, prediction: pred });
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
      currentPredictions[p.match_id] = p.prediction;
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
    
    await loadData();
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
  
  // If knockout phase, we render a round selector for the versus rounds
  if (tournamentPhase === 'knockout') {
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
          ${adminShowGroupHistory ? '👁️ Ocultar Historial de Grupos' : '👁️ Ver Historial de Grupos'}
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
  }
  
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
  
  return `
    <div class="admin-match-card">
      ${match.match_datetime ? `<div class="match-date" style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-bottom: 8px;">🕒 ${new Date(match.match_datetime).toLocaleString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
      <div class="match-teams">
        <div class="match-team">
          <img class="team-flag ${r === 'A' ? 'winner-flag' : ''}" src="${getFlagUrl(match.flag_a)}" alt="${match.team_a}" onerror="this.src='https://flagcdn.com/w40/un.png'">
          <span class="team-name">${match.team_a}</span>
        </div>
        <span class="match-vs">VS</span>
        <div class="match-team team-b">
          <span class="team-name">${match.team_b}</span>
          <img class="team-flag ${r === 'B' ? 'winner-flag' : ''}" src="${getFlagUrl(match.flag_b)}" alt="${match.team_b}" onerror="this.src='https://flagcdn.com/w40/un.png'">
        </div>
      </div>
      <div class="admin-result-row">
        <button class="result-btn ${r === 'A' ? 'active-result-a' : ''}" onclick="setResult(${match.id}, 'A')">
          Gana ${match.team_a}
        </button>
        ${!isKnockout ? `
        <button class="result-btn ${r === 'D' ? 'active-result-d' : ''}" onclick="setResult(${match.id}, 'D')">
          Empate
        </button>
        ` : ''}
        <button class="result-btn ${r === 'B' ? 'active-result-b' : ''}" onclick="setResult(${match.id}, 'B')">
          Gana ${match.team_b}
        </button>
        ${r !== null ? `
        <button class="result-btn clear-btn" onclick="setResult(${match.id}, null)" title="Limpiar resultado" style="background: rgba(239, 68, 68, 0.1); color: var(--red); border-color: rgba(239, 68, 68, 0.2); font-weight: bold;">
          ↩️
        </button>
        ` : ''}
        ${!isKnockout ? `
        <button class="result-btn clear-btn" onclick="deleteMatch(${match.id}, '${match.team_a}', '${match.team_b}')" title="Eliminar partido permanentemente">
          ✕
        </button>
        ` : ''}
      </div>
    </div>
  `;
}

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
    loadData();
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
      showToast(newState ? '✅ Apuestas habilitadas' : '🔒 Apuestas deshabilitadas', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar estado de apuestas', 'error');
    // Revert toggle
    $('#betsToggle').checked = !newState;
  }
}

// ─── Predictions Visibility Control ───────────────────────
function updatePredictionsUI() {
  const toggle = $('#predictionsToggle');
  const label = $('#predictionsStatusLabel');
  const card = document.querySelector('.predictions-control-card');
  
  if (toggle) toggle.checked = showPredictions;
  
  if (label) {
    label.textContent = showPredictions ? 'Permitido' : 'Oculto';
    label.classList.toggle('disabled', !showPredictions);
  }
  
  if (card) {
    card.classList.toggle('predictions-disabled', !showPredictions);
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

async function togglePredictionsVisibility() {
  const newState = $('#predictionsToggle').checked;
  
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
      showToast(newState ? '✅ Visibilidad de votos activada' : '🔒 Visibilidad de votos desactivada', 'success');
    }
  } catch (err) {
    showToast('Error al cambiar visibilidad de votos', 'error');
    // Revert toggle
    $('#predictionsToggle').checked = !newState;
  }
}

async function savePoints() {
  const win = parseInt($('#inputPointsWin').value, 10);
  const draw = parseInt($('#inputPointsDraw').value, 10);
  
  if (isNaN(win) || isNaN(draw) || win < 0 || draw < 0) {
    showToast('Los puntos deben ser números válidos mayores a 0', 'error');
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
      body: JSON.stringify({ win, draw })
    });
    
    if (res.ok) {
      pointsWin = win;
      pointsDraw = draw;
      
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
  const isClickable = isAdmin || showPredictions || (selectedParticipant && selectedParticipant.id === participantId);
  if (!isClickable) {
    showToast('🔒 El administrador ha deshabilitado la visualización de predicciones de otros.', 'error');
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

async function renderHistoryToElements(participantId, summaryEl, predsEl) {
  const res = await fetch(`/api/participants/${participantId}/history`);
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error);
  
  const { predictions, summary } = data;
  modalPredictionsCache = predictions; // Cache predictions for fast updates
  
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
      'R32': 'Ronda 32',
      'R16': '🏅 Octavos',
      'QF': '🔥 Cuartos',
      'SF': '💎 Semis',
      'Final': '🏆 Final'
    };
    
    // Render round selector tabs inside the modal
    html += `
      <div class="modal-round-tabs" style="display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px; border-bottom: 1px solid var(--border);">
        ${['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].map(round => {
          const count = predictions.filter(p => p.group_name === round).length;
          if (count === 0) return '';
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
  
  if (tournamentPhase === 'groups') {
    activePreds = predictions.filter(p => !['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(p.group_name) && p.result === null);
    finishedPreds = predictions.filter(p => p.result !== null);
  } else {
    activePreds = predictions.filter(p => p.group_name === modalActiveRound && p.result === null);
    finishedPreds = predictions.filter(p => p.result !== null);
  }
  
  const activeTitle = tournamentPhase === 'groups' ? '🔮 Apuestas Grupales Pendientes' : `🔮 Duelos Pendientes - ${modalActiveRound === 'R16' ? 'Octavos de Final' : modalActiveRound === 'QF' ? 'Cuartos de Final' : modalActiveRound === 'SF' ? 'Semifinales' : modalActiveRound === 'Final' ? 'Gran Final' : 'Ronda de 32'}`;
  
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
    html += `
      <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="toggleFinishedHistory(this)" style="width:100%; justify-content: center; font-size: 0.8rem; padding: 10px 15px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          👁️ Ver Historial de Apuestas Finalizadas (${finishedPreds.length})
        </button>
        <div id="finishedHistoryContainer" style="display: none; margin-top: 15px; animation: fadeIn 0.3s ease;">
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
    const label = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'].includes(gName) ? `Ronda ${gName === 'R16' ? 'Octavos' : gName === 'QF' ? 'Cuartos' : gName === 'SF' ? 'Semis' : gName === 'Third' ? 'Tercer' : gName === 'Final' ? 'Final' : '32'}` : `Grupo ${gName}`;
    html += `<div class="history-group-label">${label}</div>`;
    
    for (const p of grouped[gName]) {
      const predText = getPredictionText(p);
      const statusClass = getStatusClass(p.status);
      const pointsText = p.points_earned > 0 ? `+${p.points_earned} pts` : '';
      
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

function getPredictionText(pred) {
  if (!pred.prediction && pred.result === null) return '⏳ Pendiente';
  if (!pred.prediction) return '⚪ Sin apuesta';
  
  const predLabel = pred.prediction === 'A' ? pred.team_a : pred.prediction === 'B' ? pred.team_b : 'Empate';
  
  if (pred.result === null) return `🎯 ${predLabel}`;
  if (pred.status === 'correct' || pred.status === 'correct_draw') return `✅ ${predLabel}`;
  return `❌ ${predLabel}`;
}

function getStatusClass(status) {
  switch(status) {
    case 'correct': case 'correct_draw': return 'correct';
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
        const totalAB = stats.A + stats.B;
        const pctA_KO = totalAB > 0 ? Math.round((stats.A / totalAB) * 100) : 0;
        const pctB_KO = totalAB > 0 ? Math.round((stats.B / totalAB) * 100) : 0;
        
        barContainer = `
          <div class="tendencia-bar-container">
            <div class="tendencia-bar bar-a" style="width: ${pctA_KO}%"></div>
            <div class="tendencia-bar bar-b" style="width: ${pctB_KO}%"></div>
          </div>
        `;
        labelsRow = `
          <div class="tendencia-labels">
            <div class="tendencia-label label-a">${match.team_a} ${pctA_KO}%</div>
            <div class="tendencia-label label-b">${match.team_b} ${pctB_KO}%</div>
          </div>
        `;
      }
    } else {
      barContainer = `<div class="tendencia-empty">Aún no hay predicciones para este partido</div>`;
    }
    
    const isTBD = match.team_a === 'A definir' || match.team_b === 'A definir';
    const cardClass = isTBD ? 'tendencia-card tbd-card' : 'tendencia-card';
    
    const card = document.createElement('div');
    card.className = cardClass;
    if (isTBD) card.style.opacity = '0.5';
    
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

// ─── Virus Gratis (Fun Facts) ───────────────────────────
let funFactsData = [];

async function loadFunFacts() {
  try {
    const res = await fetch('/api/fun-facts');
    funFactsData = await res.json();
    renderAdminFacts();
  } catch (err) {
    console.error('Error loading fun facts:', err);
  }
}

async function openVirusModal() {
  const modal = $('#virusModal');
  const container = $('#virusFactsContainer');
  
  modal.classList.add('show');
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⏳</span>
      <p>Cargando...</p>
    </div>
  `;
  
  try {
    const res = await fetch('/api/fun-facts');
    const facts = await res.json();
    
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
  const text = input.value.trim();
  
  if (!text) {
    showToast('Escribe un dato curioso primero', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/fun-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Error al agregar dato', 'error');
      return;
    }
    
    input.value = '';
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
      <span class="fact-text">${escapeHtml(f.text)}</span>
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
  
  // Date
  if (match.match_datetime) {
    const dateEl = document.createElement('div');
    dateEl.className = 'bracket-match-date';
    dateEl.textContent = new Date(match.match_datetime).toLocaleString('es-MX', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    card.appendChild(dateEl);
  }
  
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
  if (selectedParticipant && betsEnabled && !match.result && !isTBD) {
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
  
  // Hover Tooltip for voters (only if show_predictions is enabled and not TBD)
  if (window.allGlobalPredictions && window.allGlobalPredictions.enabled && !isTBD) {
    
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
  if (existing) { existing.remove(); return; }
  
  const dropdown = document.createElement('div');
  dropdown.className = 'bracket-team-select';
  
  // Clear option
  const clearOpt = document.createElement('div');
  clearOpt.className = 'bracket-team-option clear-option';
  clearOpt.textContent = '🧹 Limpiar (A definir)';
  clearOpt.addEventListener('click', () => {
    updateKnockoutTeam(matchId, slot, 'A definir', 'un');
    dropdown.remove();
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
      dropdown.remove();
    });
    
    dropdown.appendChild(opt);
  }
  
  matchCard.appendChild(dropdown);
  
  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.remove();
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
  
  if (!confirm('¿Estás seguro de terminar la Fase de Grupos y avanzar a Eliminatorias? Esto seleccionará a los 32 mejores equipos automáticamente y abrirá el bracket.')) {
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
      showToast(`✅ Eliminatorias iniciadas. Se clasificaron ${data.count} equipos.`, 'success');
      
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
      
      // Populate classified modal
      const grid = $('#classifiedGrid');
      if (grid && data.groups) {
        grid.innerHTML = '';
        const groupKeys = Object.keys(data.groups).sort();
        
        for (const g of groupKeys) {
          const teams = data.groups[g];
          const groupCard = document.createElement('div');
          groupCard.className = 'classified-group-card';
          
          let teamsHtml = '';
          teams.forEach((t, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            teamsHtml += `
              <div class="classified-team-item">
                <span class="classified-medal">${medal}</span>
                <img src="${getFlagUrl(t.flag)}" alt="${t.name}">
                <span>${t.name}</span>
              </div>
            `;
          });
          
          groupCard.innerHTML = `
            <div class="classified-group-title">Grupo ${g}</div>
            ${teamsHtml}
          `;
          grid.appendChild(groupCard);
        }
      }
      
      // Show modal
      $('#knockoutStartModal').classList.add('show');
      
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

// Classified Modal Events
document.addEventListener('DOMContentLoaded', () => {
  const closeClassified = () => {
    $('#knockoutStartModal').classList.remove('show');
    // Switch to Grupos tab (which now shows Versus)
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    
    $('#tabGrupos').classList.add('active');
    $('#sectionGrupos').classList.add('active');
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
      
      $('#tabGrupos').classList.add('active');
      $('#sectionGrupos').classList.add('active');
      
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
      
      const head = [['Participante', 'Aciertos', 'Puntos']];
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
        const rowData = [p.name, stats.aci.toString(), stats.pts.toString()];
        
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

// Start the tour initializer after all DOM loads
window.addEventListener('load', () => {
  AppTour.init();
});

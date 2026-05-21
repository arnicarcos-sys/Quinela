const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = process.env.DATA_DIR || __dirname;

// Upload setup
// If running on Railway with a volume mounted at /app/data, store uploads there.
const uploadDir = path.join(process.env.DATA_DIR ? DATA_DIR : path.join(__dirname, 'public'), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Explicitly serve the uploads directory so it works even if moved outside 'public'
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// ─── Database Setup ──────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'quinela.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    flag_a TEXT DEFAULT '',
    flag_b TEXT DEFAULT '',
    match_date TEXT DEFAULT '',
    match_datetime TEXT,
    result TEXT DEFAULT NULL,
    bracket_position INTEGER DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    prediction TEXT NOT NULL CHECK(prediction IN ('A', 'B', 'D')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id),
    FOREIGN KEY (match_id) REFERENCES matches(id),
    UNIQUE(participant_id, match_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '#3b82f6');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('show_predictions', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('points_win', '3');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('points_draw', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tournament_phase', 'groups');
`);

// Add bracket_position column for existing databases
try {
  db.prepare("ALTER TABLE matches ADD COLUMN bracket_position INTEGER DEFAULT NULL").run();
} catch (e) {
  // Column already exists, ignore
}

// Add profile columns for existing databases
try {
  db.prepare("ALTER TABLE participants ADD COLUMN nickname TEXT DEFAULT NULL").run();
} catch (e) { /* already exists */ }
try {
  db.prepare("ALTER TABLE participants ADD COLUMN avatar TEXT DEFAULT NULL").run();
} catch (e) { /* already exists */ }

// ─── Avatar upload directory ─────────────────────────────────
const avatarDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

// ─── Seed matches if empty ────────────────────────────────────
const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
if (matchCount.count === 0) {
  const groups = [
    { name: 'A', teams: [
      { name: 'México', flag: '🇲🇽', code: 'mx' },
      { name: 'Sudáfrica', flag: '🇿🇦', code: 'za' },
      { name: 'Corea del Sur', flag: '🇰🇷', code: 'kr' },
      { name: 'Rep. Checa', flag: '🇨🇿', code: 'cz' }
    ]},
    { name: 'B', teams: [
      { name: 'Canadá', flag: '🇨🇦', code: 'ca' },
      { name: 'Bosnia', flag: '🇧🇦', code: 'ba' },
      { name: 'Qatar', flag: '🇶🇦', code: 'qa' },
      { name: 'Suiza', flag: '🇨🇭', code: 'ch' }
    ]},
    { name: 'C', teams: [
      { name: 'Brasil', flag: '🇧🇷', code: 'br' },
      { name: 'Marruecos', flag: '🇲🇦', code: 'ma' },
      { name: 'Haití', flag: '🇭🇹', code: 'ht' },
      { name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'gb-sct' }
    ]},
    { name: 'D', teams: [
      { name: 'EE.UU.', flag: '🇺🇸', code: 'us' },
      { name: 'Paraguay', flag: '🇵🇾', code: 'py' },
      { name: 'Australia', flag: '🇦🇺', code: 'au' },
      { name: 'Turquía', flag: '🇹🇷', code: 'tr' }
    ]},
    { name: 'E', teams: [
      { name: 'Alemania', flag: '🇩🇪', code: 'de' },
      { name: 'Curazao', flag: '🇨🇼', code: 'cw' },
      { name: 'Costa de Marfil', flag: '🇨🇮', code: 'ci' },
      { name: 'Ecuador', flag: '🇪🇨', code: 'ec' }
    ]},
    { name: 'F', teams: [
      { name: 'Países Bajos', flag: '🇳🇱', code: 'nl' },
      { name: 'Japón', flag: '🇯🇵', code: 'jp' },
      { name: 'Suecia', flag: '🇸🇪', code: 'se' },
      { name: 'Túnez', flag: '🇹🇳', code: 'tn' }
    ]},
    { name: 'G', teams: [
      { name: 'Bélgica', flag: '🇧🇪', code: 'be' },
      { name: 'Egipto', flag: '🇪🇬', code: 'eg' },
      { name: 'Irán', flag: '🇮🇷', code: 'ir' },
      { name: 'Nueva Zelanda', flag: '🇳🇿', code: 'nz' }
    ]},
    { name: 'H', teams: [
      { name: 'España', flag: '🇪🇸', code: 'es' },
      { name: 'Cabo Verde', flag: '🇨🇻', code: 'cv' },
      { name: 'Arabia Saudita', flag: '🇸🇦', code: 'sa' },
      { name: 'Uruguay', flag: '🇺🇾', code: 'uy' }
    ]},
    { name: 'I', teams: [
      { name: 'Francia', flag: '🇫🇷', code: 'fr' },
      { name: 'Senegal', flag: '🇸🇳', code: 'sn' },
      { name: 'Iraq', flag: '🇮🇶', code: 'iq' },
      { name: 'Noruega', flag: '🇳🇴', code: 'no' }
    ]},
    { name: 'J', teams: [
      { name: 'Argentina', flag: '🇦🇷', code: 'ar' },
      { name: 'Argelia', flag: '🇩🇿', code: 'dz' },
      { name: 'Austria', flag: '🇦🇹', code: 'at' },
      { name: 'Jordania', flag: '🇯🇴', code: 'jo' }
    ]},
    { name: 'K', teams: [
      { name: 'Portugal', flag: '🇵🇹', code: 'pt' },
      { name: 'RD Congo', flag: '🇨🇩', code: 'cd' },
      { name: 'Uzbekistán', flag: '🇺🇿', code: 'uz' },
      { name: 'Colombia', flag: '🇨🇴', code: 'co' }
    ]},
    { name: 'L', teams: [
      { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'gb-eng' },
      { name: 'Croacia', flag: '🇭🇷', code: 'hr' },
      { name: 'Ghana', flag: '🇬🇭', code: 'gh' },
      { name: 'Panamá', flag: '🇵🇦', code: 'pa' }
    ]}
  ];

  const insertMatch = db.prepare(
    'INSERT INTO matches (group_name, team_a, team_b, flag_a, flag_b) VALUES (?, ?, ?, ?, ?)'
  );

  const seedMatches = db.transaction(() => {
    for (const group of groups) {
      const t = group.teams;
      const matchups = [
        [0, 1], [2, 3],
        [0, 2], [1, 3],
        [0, 3], [1, 2]
      ];
      for (const [a, b] of matchups) {
        // We will store the flag as the country code to use in the frontend
        insertMatch.run(group.name, t[a].name, t[b].name, t[a].code, t[b].code);
      }
    }
  });

  seedMatches();
  console.log('✅ Base de datos inicializada con los 72 partidos del Mundial 2026');
}

// ─── Seed Knockout Stage matches if they don't exist ─────────
const knockoutCount = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name IN ('R32','R16','QF','SF','Final')").get();
if (knockoutCount.count === 0) {
  const insertKnockout = db.prepare(
    'INSERT INTO matches (group_name, team_a, team_b, flag_a, flag_b, match_datetime, bracket_position) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const seedKnockout = db.transaction(() => {
    // ─── R32: 16 matches (positions 1-16) ────────────────────
    const r32Dates = [
      '2026-06-28T13:00', '2026-06-29T19:00', '2026-06-29T14:30', '2026-06-30T15:00',
      '2026-07-01T14:00', '2026-07-01T18:00', '2026-07-02T13:00', '2026-07-02T17:00',
      '2026-06-29T11:00', '2026-06-30T11:00', '2026-06-30T19:00', '2026-07-01T10:00',
      '2026-07-02T21:00', '2026-07-02T11:00', '2026-06-28T16:00', '2026-06-28T19:00'
    ];
    for (let pos = 1; pos <= 16; pos++) {
      insertKnockout.run('R32', 'A definir', 'A definir', 'un', 'un', r32Dates[pos - 1], pos);
    }

    // ─── R16: 8 matches (positions 1-8) ──────────────────────
    const r16Dates = [
      '2026-07-04T11:00', '2026-07-04T15:00', '2026-07-06T18:00', '2026-07-06T13:00',
      '2026-07-05T14:00', '2026-07-05T18:00', '2026-07-05T11:00', '2026-07-05T15:00'
    ];
    for (let pos = 1; pos <= 8; pos++) {
      insertKnockout.run('R16', 'A definir', 'A definir', 'un', 'un', r16Dates[pos - 1], pos);
    }

    // ─── QF: 4 matches (positions 1-4) ───────────────────────
    const qfDates = [
      '2026-07-09T14:00', '2026-07-10T13:00', '2026-07-09T18:00', '2026-07-10T17:00'
    ];
    for (let pos = 1; pos <= 4; pos++) {
      insertKnockout.run('QF', 'A definir', 'A definir', 'un', 'un', qfDates[pos - 1], pos);
    }

    // ─── SF: 2 matches (positions 1-2) ───────────────────────
    insertKnockout.run('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T15:00', 1);
    insertKnockout.run('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T19:00', 2);

    // ─── F: 1 match (position 1) ─────────────────────────────
    insertKnockout.run('Final', 'A definir', 'A definir', 'un', 'un', '2026-07-13T16:00', 1);
  });

  seedKnockout();
  console.log('✅ Fase de eliminación directa inicializada (31 partidos: R32→R16→QF→SF→F)');
}

// ─── API Routes ──────────────────────────────────────────────

// Get all matches grouped (group stage only)
app.get('/api/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT * FROM matches 
    WHERE group_name NOT IN ('R32','R16','QF','SF','Final')
    ORDER BY CASE WHEN group_name = 'Prueba' THEN 0 ELSE 1 END, group_name, id
  `).all();
  const grouped = {};
  for (const m of matches) {
    if (!grouped[m.group_name]) grouped[m.group_name] = [];
    grouped[m.group_name].push(m);
  }
  res.json(grouped);
});

// Get all matches flat (for real-time update check)
app.get('/api/matches/all', (req, res) => {
  try {
    const matches = db.prepare('SELECT * FROM matches ORDER BY id').all();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all participants with scores
app.get('/api/participants', (req, res) => {
  const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
  const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
  const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
  
  const ptsWin = pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3;
  const ptsDraw = pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1;
  const currentPhase = phaseRow ? phaseRow.value : 'groups';

  let matchFilter = "m.group_name NOT IN ('R32','R16','QF','SF','Final', 'Prueba')";
  if (currentPhase === 'knockout') {
    matchFilter = "m.group_name IN ('R32','R16','QF','SF','Final')";
  }

  const participants = db.prepare(`
    SELECT p.id, p.name, p.nickname, p.avatar,
      COALESCE(SUM(
        CASE 
          WHEN m.result IS NOT NULL AND pr.prediction = m.result AND m.result = 'D' THEN ${ptsDraw}
          WHEN m.result IS NOT NULL AND pr.prediction = m.result THEN ${ptsWin}
          ELSE 0
        END
      ), 0) as points,
      COUNT(CASE WHEN m.result IS NOT NULL AND pr.prediction = m.result THEN 1 END) as aciertos,
      COUNT(m.id) as total_predictions
    FROM participants p
    LEFT JOIN predictions pr ON p.id = pr.participant_id
    LEFT JOIN matches m ON pr.match_id = m.id AND ${matchFilter}
    GROUP BY p.id
    ORDER BY points DESC, aciertos DESC, p.name ASC
  `).all();
  res.json(participants);
});

// Add participant
app.post('/api/participants', (req, res) => {
  const { name, password } = req.body;
  if (!name || name.trim().length === 0 || !password || password.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre y la contraseña son obligatorios' });
  }
  
  const count = db.prepare('SELECT COUNT(*) as count FROM participants').get();
  if (count.count >= 50) {
    return res.status(400).json({ error: 'Se alcanzó el límite de 50 participantes' });
  }

  try {
    const result = db.prepare('INSERT INTO participants (name, password) VALUES (?, ?)').run(name.trim(), password.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un participante con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Participant Login
app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const user = db.prepare('SELECT id, name, nickname, avatar FROM participants WHERE name = ? AND password = ?').get(name.trim(), password.trim());
  
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

// Update participant profile
app.post('/api/participants/update-profile', uploadAvatar.single('avatar'), (req, res) => {
  try {
    const { participant_id, nickname } = req.body;
    if (!participant_id) return res.status(400).json({ error: 'ID de participante requerido' });

    const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participant_id);
    if (!participant) return res.status(404).json({ error: 'Participante no encontrado' });

    let avatarPath = participant.avatar;

    // If a new avatar was uploaded, delete old one
    if (req.file) {
      if (participant.avatar) {
        const oldPath = path.join(avatarDir, path.basename(participant.avatar));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const cleanNickname = nickname ? nickname.trim().slice(0, 20) : null;

    db.prepare('UPDATE participants SET nickname = ?, avatar = ? WHERE id = ?')
      .run(cleanNickname, avatarPath, participant_id);

    res.json({ success: true, nickname: cleanNickname, avatar: avatarPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete participant
app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM predictions WHERE participant_id = ?').run(id);
  db.prepare('DELETE FROM participants WHERE id = ?').run(id);
  res.json({ success: true });
});

// Get all predictions globally (respects show_predictions setting)
app.get('/api/predictions/all', (req, res) => {
  const showPredictions = db.prepare("SELECT value FROM settings WHERE key = 'show_predictions'").get();
  if (showPredictions && showPredictions.value === 'false') {
    return res.json({ enabled: false, data: [] });
  }
  
  const predictions = db.prepare(`
    SELECT pr.match_id, pr.prediction, p.name, p.nickname
    FROM predictions pr
    JOIN participants p ON pr.participant_id = p.id
  `).all();
  
  res.json({ enabled: true, data: predictions });
});

// Get predictions for a participant
app.get('/api/predictions/:participantId', (req, res) => {
  const predictions = db.prepare(
    'SELECT match_id, prediction FROM predictions WHERE participant_id = ?'
  ).all(req.params.participantId);
  
  const map = {};
  for (const p of predictions) {
    map[p.match_id] = p.prediction;
  }
  res.json(map);
});

// Save prediction
app.post('/api/predictions', (req, res) => {
  const { participant_id, match_id, prediction } = req.body;
  
  if (!['A', 'B', 'D'].includes(prediction)) {
    return res.status(400).json({ error: 'Predicción inválida' });
  }

  // Check if bets are enabled globally
  const betsEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled'").get();
  if (betsEnabled && betsEnabled.value === 'false') {
    return res.status(403).json({ error: '🔒 Las apuestas están cerradas por el administrador' });
  }

  // Check if match already has a result
  const match = db.prepare('SELECT result FROM matches WHERE id = ?').get(match_id);
  if (match && match.result) {
    return res.status(400).json({ error: 'Este partido ya tiene resultado, no se puede cambiar la predicción' });
  }

  try {
    db.prepare(`
      INSERT INTO predictions (participant_id, match_id, prediction) 
      VALUES (?, ?, ?)
      ON CONFLICT(participant_id, match_id) 
      DO UPDATE SET prediction = excluded.prediction
    `).run(participant_id, match_id, prediction);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save predictions in batch
app.post('/api/predictions/batch', (req, res) => {
  const { participant_id, predictions } = req.body;

  if (!participant_id || !Array.isArray(predictions)) {
    return res.status(400).json({ error: 'Datos de lote inválidos' });
  }

  // Check if bets are enabled globally
  const betsEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled'").get();
  if (betsEnabled && betsEnabled.value === 'false') {
    return res.status(403).json({ error: '🔒 Las apuestas están cerradas por el administrador' });
  }

  const batchTransaction = db.transaction(() => {
    const insertPrediction = db.prepare(`
      INSERT INTO predictions (participant_id, match_id, prediction) 
      VALUES (?, ?, ?)
      ON CONFLICT(participant_id, match_id) 
      DO UPDATE SET prediction = excluded.prediction
    `);

    const getMatchResult = db.prepare('SELECT result FROM matches WHERE id = ?');

    for (const p of predictions) {
      const { match_id, prediction } = p;
      if (!['A', 'B', 'D'].includes(prediction)) {
        throw new Error('Predicción inválida: ' + prediction);
      }

      // Check if match already has a result
      const match = getMatchResult.get(match_id);
      if (match && match.result) {
        throw new Error('Un partido seleccionado ya tiene resultado oficial');
      }

      insertPrediction.run(participant_id, match_id, prediction);
    }
  });

  try {
    batchTransaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bracket Progression Helper ──────────────────────────────
const KNOCKOUT_ROUNDS = ['R32', 'R16', 'QF', 'SF', 'Final'];

function getNextRound(round) {
  const idx = KNOCKOUT_ROUNDS.indexOf(round);
  if (idx === -1 || idx >= KNOCKOUT_ROUNDS.length - 1) return null;
  return KNOCKOUT_ROUNDS[idx + 1];
}

function advanceWinner(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || !match.result || !match.bracket_position) return;
  
  const nextRound = getNextRound(match.group_name);
  if (!nextRound) return; // This is the Final, no next round
  
  // Determine winner info
  const winnerTeam = match.result === 'A' ? match.team_a : match.result === 'B' ? match.team_b : null;
  const winnerFlag = match.result === 'A' ? match.flag_a : match.result === 'B' ? match.flag_b : null;
  
  if (!winnerTeam || match.result === 'D') return; // Draws in knockout shouldn't auto-advance (admin handles extra time/penalties manually)
  
  const pos = match.bracket_position;
  const nextPos = Math.ceil(pos / 2);
  const slot = (pos % 2 === 1) ? 'A' : 'B'; // Odd positions → team_a, Even → team_b
  
  const nextMatch = db.prepare('SELECT * FROM matches WHERE group_name = ? AND bracket_position = ?').get(nextRound, nextPos);
  if (!nextMatch) return;
  
  if (slot === 'A') {
    db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(winnerTeam, winnerFlag, nextMatch.id);
  } else {
    db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(winnerTeam, winnerFlag, nextMatch.id);
  }
}

// Admin: Set match result
app.post('/api/matches/:id/result', (req, res) => {
  const { result } = req.body;
  
  if (!['A', 'B', 'D', null].includes(result)) {
    return res.status(400).json({ error: 'Resultado inválido' });
  }

  db.prepare('UPDATE matches SET result = ? WHERE id = ?').run(result, req.params.id);
  
  // If this is a knockout match with a definitive result, advance winner
  if (result && result !== 'D') {
    advanceWinner(parseInt(req.params.id));
  }
  
  res.json({ success: true });
});

// ─── Knockout Bracket Endpoints ──────────────────────────────

// Get all knockout matches organized by round
app.get('/api/knockout', (req, res) => {
  try {
    const matches = db.prepare(`
      SELECT * FROM matches 
      WHERE group_name IN ('R32','R16','QF','SF','Final')
      ORDER BY group_name, bracket_position
    `).all();
    
    const bracket = {};
    for (const m of matches) {
      if (!bracket[m.group_name]) bracket[m.group_name] = [];
      bracket[m.group_name].push(m);
    }
    res.json(bracket);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Manual override - edit any knockout match teams
app.put('/api/knockout/:id', (req, res) => {
  try {
    const { team_a, team_b, flag_a, flag_b } = req.body;
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    
    const updates = [];
    const values = [];
    
    if (team_a !== undefined) { updates.push('team_a = ?'); values.push(team_a); }
    if (team_b !== undefined) { updates.push('team_b = ?'); values.push(team_b); }
    if (flag_a !== undefined) { updates.push('flag_a = ?'); values.push(flag_a); }
    if (flag_b !== undefined) { updates.push('flag_b = ?'); values.push(flag_b); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    
    values.push(req.params.id);
    db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    res.json({ success: true, match: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Swap two teams between bracket slots
app.post('/api/knockout/swap', (req, res) => {
  try {
    const { sourceMatchId, sourceSlot, targetMatchId, targetSlot } = req.body;
    
    const sourceMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(sourceMatchId);
    const targetMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(targetMatchId);
    
    if (!sourceMatch || !targetMatch) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    // Get source team/flag
    const srcTeam = sourceSlot === 'A' ? sourceMatch.team_a : sourceMatch.team_b;
    const srcFlag = sourceSlot === 'A' ? sourceMatch.flag_a : sourceMatch.flag_b;
    
    // Get target team/flag
    const tgtTeam = targetSlot === 'A' ? targetMatch.team_a : targetMatch.team_b;
    const tgtFlag = targetSlot === 'A' ? targetMatch.flag_a : targetMatch.flag_b;
    
    // Swap them in a transaction
    const swapTransaction = db.transaction(() => {
      if (sourceSlot === 'A') {
        db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(tgtTeam, tgtFlag, sourceMatchId);
      } else {
        db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(tgtTeam, tgtFlag, sourceMatchId);
      }
      
      if (targetSlot === 'A') {
        db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(srcTeam, srcFlag, targetMatchId);
      } else {
        db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(srcTeam, srcFlag, targetMatchId);
      }
    });
    
    swapTransaction();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all teams for admin dropdown
app.get('/api/teams', (req, res) => {
  try {
    // Get unique teams from group stage matches
    const teams = db.prepare(`
      SELECT DISTINCT team_a as name, flag_a as flag FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Final','Prueba')
      UNION
      SELECT DISTINCT team_b as name, flag_b as flag FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Final','Prueba')
      ORDER BY name
    `).all();
    res.json(teams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Add Test Match
app.post('/api/test-match', upload.fields([{ name: 'flag_a', maxCount: 1 }, { name: 'flag_b', maxCount: 1 }]), (req, res) => {
  // ... existing logic ...
  // (Note: I'll include the full function in the TargetContent to ensure match)
  const { team_a, team_b, match_datetime } = req.body;
  if (!team_a || !team_b || !match_datetime) return res.status(400).json({ error: 'Faltan datos del partido' });

  let flag_a = 'un';
  if (req.files && req.files['flag_a']) {
    flag_a = '/uploads/' + req.files['flag_a'][0].filename;
  }

  let flag_b = 'un';
  if (req.files && req.files['flag_b']) {
    flag_b = '/uploads/' + req.files['flag_b'][0].filename;
  }

  try {
    db.prepare(`
      INSERT INTO matches (group_name, team_a, team_b, flag_a, flag_b, match_datetime)
      VALUES ('Prueba', ?, ?, ?, ?, ?)
    `).run(team_a.trim(), team_b.trim(), flag_a, flag_b, match_datetime);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Match
app.delete('/api/matches/:id', (req, res) => {
  const { id } = req.params;
  try {
    // First delete predictions for this match to maintain integrity
    db.prepare('DELETE FROM predictions WHERE match_id = ?').run(id);
    const result = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Partido no encontrado' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reset all match results
app.post('/api/matches/reset', (req, res) => {
  try {
    db.prepare('UPDATE matches SET result = NULL').run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Group standings endpoint
app.get('/api/standings', (req, res) => {
  try {
    const matches = db.prepare('SELECT * FROM matches ORDER BY group_name, id').all();
    
    // Group matches
    const groups = {};
    for (const m of matches) {
      if (m.group_name === 'Prueba') continue;
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    }
    
    const standings = {};
    
    for (const [groupName, groupMatches] of Object.entries(groups)) {
      // Collect unique teams in this group
      const teamsMap = {};
      for (const m of groupMatches) {
        if (!teamsMap[m.team_a]) teamsMap[m.team_a] = { name: m.team_a, flag: m.flag_a, w: 0, d: 0, l: 0, pts: 0, pj: 0 };
        if (!teamsMap[m.team_b]) teamsMap[m.team_b] = { name: m.team_b, flag: m.flag_b, w: 0, d: 0, l: 0, pts: 0, pj: 0 };
      }
      
      // Calculate stats from results
      let playedCount = 0;
      for (const m of groupMatches) {
        if (m.result === null) continue;
        playedCount++;
        
        const tA = teamsMap[m.team_a];
        const tB = teamsMap[m.team_b];
        
        tA.pj++;
        tB.pj++;
        
        if (m.result === 'A') {
          tA.w++; tA.pts += 3;
          tB.l++;
        } else if (m.result === 'B') {
          tB.w++; tB.pts += 3;
          tA.l++;
        } else if (m.result === 'D') {
          tA.d++; tA.pts += 1;
          tB.d++; tB.pts += 1;
        }
      }
      
      // Sort by points, then wins, then name
      const sorted = Object.values(teamsMap).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.w !== a.w) return b.w - a.w;
        return a.name.localeCompare(b.name);
      });
      
      const isComplete = playedCount === 6;
      
      // Mark classified teams (top 2)
      sorted.forEach((team, i) => {
        team.position = i + 1;
        team.classified = isComplete && i < 2;
      });
      
      standings[groupName] = {
        teams: sorted,
        played: playedCount,
        total: groupMatches.length,
        isComplete
      };
    }
    
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
  const playedMatches = db.prepare('SELECT COUNT(*) as count FROM matches WHERE result IS NOT NULL').get().count;
  const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM participants').get().count;
  const totalPredictions = db.prepare('SELECT COUNT(*) as count FROM predictions').get().count;
  
  res.json({
    totalMatches,
    playedMatches,
    totalParticipants,
    totalPredictions
  });
});

// ─── Admin: Start Knockout Phase ─────────────────────────────
app.post('/api/admin/start-knockout', (req, res) => {
  try {
    // 1. Update setting
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_phase', 'knockout')").run();

    // 2. Auto-fill R32 if they are currently "A definir"
    // Get all group matches with a result
    const groupMatches = db.prepare("SELECT * FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Final','Prueba') AND result IS NOT NULL").all();

    const teamStats = {};
    groupMatches.forEach(m => {
      if (!teamStats[m.team_a]) teamStats[m.team_a] = { name: m.team_a, flag: m.flag_a, points: 0, group: m.group_name };
      if (!teamStats[m.team_b]) teamStats[m.team_b] = { name: m.team_b, flag: m.flag_b, points: 0, group: m.group_name };

      if (m.result === 'A') teamStats[m.team_a].points += 3;
      else if (m.result === 'B') teamStats[m.team_b].points += 3;
      else if (m.result === 'D') {
        teamStats[m.team_a].points += 1;
        teamStats[m.team_b].points += 1;
      }
    });

    // Group teams
    const groups = {};
    Object.values(teamStats).forEach(t => {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    });

    const qualifiedTeams = [];
    const thirdPlaces = [];

    Object.keys(groups).forEach(g => {
      // Sort by points (simple sorting, ignoring goal difference as we don't track goals)
      const sorted = groups[g].sort((a, b) => b.points - a.points);
      if (sorted[0]) qualifiedTeams.push(sorted[0]); // 1st
      if (sorted[1]) qualifiedTeams.push(sorted[1]); // 2nd
      if (sorted[2]) thirdPlaces.push(sorted[2]); // 3rd
    });

    // Sort 3rd places and take top 8
    thirdPlaces.sort((a, b) => b.points - a.points);
    const top8Thirds = thirdPlaces.slice(0, 8);

    qualifiedTeams.push(...top8Thirds);
    
    // Build a nice object for the frontend modal
    const classifiedByGroup = {};
    qualifiedTeams.forEach(t => {
      if (!classifiedByGroup[t.group]) classifiedByGroup[t.group] = [];
      classifiedByGroup[t.group].push(t);
    });

    // If we have teams, fill R32
    if (qualifiedTeams.length > 0) {
      // Get R32 matches
      const r32Matches = db.prepare("SELECT * FROM matches WHERE group_name = 'R32' ORDER BY bracket_position").all();

      let teamIndex = 0;
      const updateMatch = db.prepare("UPDATE matches SET team_a = ?, flag_a = ?, team_b = ?, flag_b = ? WHERE id = ? AND team_a = 'A definir'");

      for (const m of r32Matches) {
        const tA = qualifiedTeams[teamIndex++] || { name: 'A definir', flag: 'un' };
        const tB = qualifiedTeams[teamIndex++] || { name: 'A definir', flag: 'un' };

        updateMatch.run(tA.name, tA.flag, tB.name, tB.flag, m.id);
      }
    }

    res.json({ success: true, count: qualifiedTeams.length, groups: classifiedByGroup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Reset Knockout Phase ─────────────────────────────
app.post('/api/admin/reset-knockout', (req, res) => {
  try {
    const resetTransaction = db.transaction(() => {
      // 1. Revert setting to groups
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_phase', 'groups')").run();
      
      // 2. Clear all predictions for knockout matches
      db.prepare(`
        DELETE FROM predictions 
        WHERE match_id IN (SELECT id FROM matches WHERE group_name IN ('R32','R16','QF','SF','Final'))
      `).run();
      
      // 3. Reset knockout matches back to TBD
      db.prepare(`
        UPDATE matches 
        SET team_a = 'A definir', team_b = 'A definir', flag_a = 'un', flag_b = 'un', result = NULL
        WHERE group_name IN ('R32','R16','QF','SF','Final')
      `).run();
    });
    
    resetTransaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    const theme = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get();
    const betsEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled'").get();
    const showPredictions = db.prepare("SELECT value FROM settings WHERE key = 'show_predictions'").get();
    const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
    const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
    const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
    
    res.json({
      theme: theme ? theme.value : '#3b82f6',
      betsEnabled: betsEnabled ? betsEnabled.value === 'true' : true,
      showPredictions: showPredictions ? showPredictions.value === 'true' : true,
      pointsWin: pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3,
      pointsDraw: pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1,
      tournamentPhase: phaseRow ? phaseRow.value : 'groups'
    });
  } catch(e) {
    res.json({ theme: '#3b82f6', betsEnabled: true, showPredictions: true, pointsWin: 3, pointsDraw: 1, tournamentPhase: 'groups' });
  }
});

app.post('/api/settings/theme', (req, res) => {
  try {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)").run(req.body.theme);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle bets enabled/disabled
app.post('/api/settings/bets_enabled', (req, res) => {
  try {
    const enabled = req.body.enabled ? 'true' : 'false';
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('bets_enabled', ?)").run(enabled);
    res.json({ success: true, betsEnabled: enabled === 'true' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle show predictions to all
app.post('/api/settings/show_predictions', (req, res) => {
  try {
    const show = req.body.show ? 'true' : 'false';
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('show_predictions', ?)").run(show);
    res.json({ success: true, showPredictions: show === 'true' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Update points rules
app.post('/api/settings/points', (req, res) => {
  try {
    const { win, draw } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('points_win', ?)").run(win.toString());
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('points_draw', ?)").run(draw.toString());
    res.json({ success: true, pointsWin: parseInt(win, 10), pointsDraw: parseInt(draw, 10) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Flag effects
app.get('/api/flags/effects', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'flag_effects'").get();
    let effects = row ? JSON.parse(row.value) : {};
    
    // Clean up expired effects (20 hours)
    const now = Date.now();
    let changed = false;
    for (const flag in effects) {
      if (effects[flag].expires < now) {
        delete effects[flag];
        changed = true;
      }
    }
    
    if (changed) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('flag_effects', ?)").run(JSON.stringify(effects));
    }
    
    res.json(effects);
  } catch (e) {
    res.json({});
  }
});

app.post('/api/flags/effects', (req, res) => {
  try {
    const { flag, effect } = req.body;
    if (!flag || !effect) return res.status(400).json({ error: 'Missing flag or effect' });
    
    const row = db.prepare("SELECT value FROM settings WHERE key = 'flag_effects'").get();
    let effects = row ? JSON.parse(row.value) : {};
    
    // Set expiration to 20 hours from now
    effects[flag] = {
      effect,
      expires: Date.now() + (20 * 60 * 60 * 1000)
    };
    
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('flag_effects', ?)").run(JSON.stringify(effects));
    res.json({ success: true, effects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Get detailed history for a participant
app.get('/api/participants/:id/history', (req, res) => {
  try {
    const participant = db.prepare('SELECT id, name FROM participants WHERE id = ?').get(req.params.id);
    if (!participant) return res.status(404).json({ error: 'Participante no encontrado' });

    const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
    const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
    const ptsWin = pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3;
    const ptsDraw = pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1;

    const predictions = db.prepare(`
      SELECT 
        m.id as match_id,
        m.group_name,
        m.team_a,
        m.team_b,
        m.flag_a,
        m.flag_b,
        m.result,
        p.prediction,
        p.created_at as prediction_date,
        CASE 
          WHEN m.result IS NULL THEN 'pending'
          WHEN p.prediction IS NULL THEN 'no_prediction'
          WHEN p.prediction = m.result AND m.result = 'D' THEN 'correct_draw'
          WHEN p.prediction = m.result THEN 'correct'
          ELSE 'wrong'
        END as status,
        CASE 
          WHEN m.result IS NOT NULL AND p.prediction = m.result AND m.result = 'D' THEN ${ptsDraw}
          WHEN m.result IS NOT NULL AND p.prediction = m.result THEN ${ptsWin}
          ELSE 0
        END as points_earned
      FROM matches m
      LEFT JOIN predictions p ON m.id = p.match_id AND p.participant_id = ?
      ORDER BY m.group_name, m.id
    `).all(req.params.id);

    const totalPoints = predictions.reduce((sum, p) => sum + p.points_earned, 0);
    const totalCorrect = predictions.filter(p => p.status === 'correct' || p.status === 'correct_draw').length;
    const totalPredicted = predictions.filter(p => p.prediction !== null).length;
    const totalPlayed = predictions.filter(p => p.result !== null).length;

    res.json({
      participant,
      predictions,
      summary: {
        totalPoints,
        totalCorrect,
        totalPredicted,
        totalPlayed,
        totalMatches: predictions.length
      }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Get global prediction stats for matches
app.get('/api/stats/predictions', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        match_id, 
        prediction, 
        COUNT(*) as count
      FROM predictions
      GROUP BY match_id, prediction
    `).all();

    const formattedStats = {};
    for (const row of stats) {
      if (!formattedStats[row.match_id]) {
        formattedStats[row.match_id] = { A: 0, B: 0, D: 0, total: 0 };
      }
      formattedStats[row.match_id][row.prediction] = row.count;
      formattedStats[row.match_id].total += row.count;
    }

    res.json(formattedStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Fun Facts ("Virus Gratis") ──────────────────────────────
// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS fun_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Get all fun facts
app.get('/api/fun-facts', (req, res) => {
  try {
    const facts = db.prepare('SELECT * FROM fun_facts ORDER BY id DESC').all();
    res.json(facts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a fun fact (admin)
app.post('/api/fun-facts', (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'El dato curioso no puede estar vacío' });
  }
  try {
    const result = db.prepare('INSERT INTO fun_facts (text) VALUES (?)').run(text.trim());
    res.json({ id: result.lastInsertRowid, text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a fun fact (admin)
app.delete('/api/fun-facts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM fun_facts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let networkIp = 'No detectada';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        networkIp = net.address;
        break;
      }
    }
  }

  console.log(`\n⚽ ══════════════════════════════════════════════════ ⚽`);
  console.log(`   QUINELA MUNDIAL 2026 corriendo en:`);
  console.log(`   → Local:   http://localhost:${PORT}`);
  console.log(`   → Network: http://${networkIp}:${PORT}  <-- (Usa esto en el Wi-Fi)`);
  console.log(`⚽ ══════════════════════════════════════════════════ ⚽\n`);
});

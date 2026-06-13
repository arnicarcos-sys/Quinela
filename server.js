const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Custom route for rules PDF (before express.static to override)
app.get('/Quiniela%20Mundialista%202026.pdf', (req, res) => {
  const customPdfPath = path.join(DATA_DIR, 'Quiniela_Mundialista_2026.pdf');
  if (fs.existsSync(customPdfPath)) {
    return res.sendFile(customPdfPath);
  }
  res.sendFile(path.join(__dirname, 'public', 'Quiniela Mundialista 2026.pdf'));
});

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
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_R32', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_R16', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_QF', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_SF', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_Third', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bets_enabled_Final', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('show_predictions', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('celebrations_enabled', 'true');
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

// ─── Rules PDF storage configuration ─────────────────────────
const rulesStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DATA_DIR),
  filename: (req, file, cb) => cb(null, 'Quiniela_Mundialista_2026.pdf')
});
const uploadRules = multer({
  storage: rulesStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

// Admin: Upload custom rules PDF
app.post('/api/admin/upload-rules', uploadRules.single('rules'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    res.json({ success: true, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
const knockoutCount = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name IN ('R32','R16','QF','SF','Third','Final')").get();
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

    // ─── Third Place: 1 match (position 1) ───────────────────
    insertKnockout.run('Third', 'A definir', 'A definir', 'un', 'un', '2026-07-12T16:00', 1);

    // ─── F: 1 match (position 1) ─────────────────────────────
    insertKnockout.run('Final', 'A definir', 'A definir', 'un', 'un', '2026-07-13T16:00', 1);
  });

  seedKnockout();
  console.log('✅ Fase de eliminación directa inicializada (31 partidos: R32→R16→QF→SF→F)');
}

// ─── Self-healing migration for existing databases ───────────
const finalMatchCount = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name = 'Final'").get().count;
const thirdMatchCount = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name = 'Third'").get().count;

if (finalMatchCount === 0) {
  db.prepare(
    "INSERT INTO matches (group_name, team_a, team_b, flag_a, flag_b, match_datetime, bracket_position) VALUES ('Final', 'A definir', 'A definir', 'un', 'un', '2026-07-13T16:00', 1)"
  ).run();
  console.log("🛠️ Migración: Se agregó el partido de la Final.");
}

if (thirdMatchCount === 0) {
  db.prepare(
    "INSERT INTO matches (group_name, team_a, team_b, flag_a, flag_b, match_datetime, bracket_position) VALUES ('Third', 'A definir', 'A definir', 'un', 'un', '2026-07-12T16:00', 1)"
  ).run();
  console.log("🛠️ Migración: Se agregó el partido del Tercer Lugar.");
}


// ─── API Routes ──────────────────────────────────────────────

// Get all matches grouped (group stage only)
app.get('/api/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT * FROM matches 
    WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final')
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

  let matchFilter = "m.group_name NOT IN ('R32','R16','QF','SF','Third','Final', 'Prueba')";
  if (currentPhase === 'knockout') {
    matchFilter = "m.group_name IN ('R32','R16','QF','SF','Third','Final')";
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
  if (count.count >= 70) {
    return res.status(400).json({ error: 'Se alcanzó el límite de 70 participantes' });
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

// Admin: Reset password
app.put('/api/participants/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.trim() === '') {
    return res.status(400).json({ error: 'La nueva contraseña es obligatoria' });
  }
  try {
    const result = db.prepare('UPDATE participants SET password = ? WHERE id = ?').run(password.trim(), id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all predictions globally (respects show_predictions setting)
app.get('/api/predictions/all', (req, res) => {
  const showPredictions = db.prepare("SELECT value FROM settings WHERE key = 'show_predictions'").get();
  if (showPredictions && showPredictions.value === 'false') {
    return res.json({ enabled: false, data: [] });
  }
  
  const predictions = db.prepare(`
    SELECT pr.participant_id, pr.match_id, pr.prediction, p.name, p.nickname
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

  // Check if match already has a result
  const match = db.prepare('SELECT group_name, result FROM matches WHERE id = ?').get(match_id);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }
  if (match.result) {
    return res.status(400).json({ error: 'Este partido ya tiene resultado, no se puede cambiar la predicción' });
  }

  // Check lock by phase
  const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
  if (knockoutRounds.includes(match.group_name)) {
    const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
    const currentPhase = phaseRow ? phaseRow.value : 'groups';
    if (currentPhase === 'groups') {
      return res.status(403).json({ error: '🔒 Las eliminatorias aún no han comenzado' });
    }
    const phaseKey = `bets_enabled_${match.group_name}`;
    const phaseEnabled = db.prepare("SELECT value FROM settings WHERE key = ?").get(phaseKey);
    if (phaseEnabled && phaseEnabled.value === 'false') {
      return res.status(403).json({ error: `🔒 Las predicciones para la fase ${match.group_name} están cerradas` });
    }
  } else {
    // Group stage / test matches
    const betsEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled'").get();
    if (betsEnabled && betsEnabled.value === 'false') {
      return res.status(403).json({ error: '🔒 Las apuestas de la fase de grupos están cerradas por el administrador' });
    }
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

  const batchTransaction = db.transaction(() => {
    const insertPrediction = db.prepare(`
      INSERT INTO predictions (participant_id, match_id, prediction) 
      VALUES (?, ?, ?)
      ON CONFLICT(participant_id, match_id) 
      DO UPDATE SET prediction = excluded.prediction
    `);

    const getMatch = db.prepare('SELECT group_name, result FROM matches WHERE id = ?');
    const getSetting = db.prepare("SELECT value FROM settings WHERE key = ?");

    const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];

    for (const p of predictions) {
      const { match_id, prediction } = p;
      if (!['A', 'B', 'D'].includes(prediction)) {
        throw new Error('Predicción inválida: ' + prediction);
      }

      // Check if match already has a result
      const match = getMatch.get(match_id);
      if (!match) {
        throw new Error('Partido no encontrado');
      }
      if (match.result) {
        throw new Error('Un partido seleccionado ya tiene resultado oficial');
      }

      if (knockoutRounds.includes(match.group_name)) {
        const phaseRow = getSetting.get('tournament_phase');
        const currentPhase = phaseRow ? phaseRow.value : 'groups';
        if (currentPhase === 'groups') {
          throw new Error('🔒 Las eliminatorias aún no han comenzado');
        }
        const phaseKey = `bets_enabled_${match.group_name}`;
        const phaseEnabled = getSetting.get(phaseKey);
        if (phaseEnabled && phaseEnabled.value === 'false') {
          throw new Error(`🔒 Las predicciones para la fase ${match.group_name} están cerradas`);
        }
      } else {
        const betsEnabled = getSetting.get('bets_enabled');
        if (betsEnabled && betsEnabled.value === 'false') {
          throw new Error('🔒 Las apuestas de la fase de grupos están cerradas por el administrador');
        }
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
function getNextRound(round) {
  const map = {
    'R32': 'R16',
    'R16': 'QF',
    'QF': 'SF'
  };
  return map[round] || null;
}

function advanceWinner(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || !match.result || !match.bracket_position) return;
  
  if (match.result === 'D') return; // Draws in knockout shouldn't auto-advance
  
  // Special logic for Semifinals
  if (match.group_name === 'SF') {
    const winnerTeam = match.result === 'A' ? match.team_a : match.team_b;
    const winnerFlag = match.result === 'A' ? match.flag_a : match.flag_b;
    
    const loserTeam = match.result === 'A' ? match.team_b : match.team_a;
    const loserFlag = match.result === 'A' ? match.flag_b : match.flag_a;
    
    const slot = (match.bracket_position === 1) ? 'A' : 'B';
    
    const finalMatch = db.prepare("SELECT * FROM matches WHERE group_name = 'Final' AND bracket_position = 1").get();
    const thirdMatch = db.prepare("SELECT * FROM matches WHERE group_name = 'Third' AND bracket_position = 1").get();
    
    if (finalMatch) {
      if (slot === 'A') {
        db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(winnerTeam, winnerFlag, finalMatch.id);
      } else {
        db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(winnerTeam, winnerFlag, finalMatch.id);
      }
    }
    
    if (thirdMatch) {
      if (slot === 'A') {
        db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(loserTeam, loserFlag, thirdMatch.id);
      } else {
        db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(loserTeam, loserFlag, thirdMatch.id);
      }
    }
    return;
  }
  
  // Normal progression for R32, R16, QF
  const nextRound = getNextRound(match.group_name);
  if (!nextRound) return;
  
  const winnerTeam = match.result === 'A' ? match.team_a : match.team_b;
  const winnerFlag = match.result === 'A' ? match.flag_a : match.flag_b;
  
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
  try {
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
  } catch (err) {
    console.error('Error setting match result:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Knockout Bracket Endpoints ──────────────────────────────

// Get all knockout matches organized by round
app.get('/api/knockout', (req, res) => {
  try {
    const matches = db.prepare(`
      SELECT * FROM matches 
      WHERE group_name IN ('R32','R16','QF','SF','Third','Final')
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
    
    // Swap or copy depending on whether target is Third Place match from another match
    const isTargetThird = targetMatch.group_name === 'Third' && sourceMatchId !== targetMatchId;
    
    const swapTransaction = db.transaction(() => {
      if (!isTargetThird) {
        if (sourceSlot === 'A') {
          db.prepare('UPDATE matches SET team_a = ?, flag_a = ? WHERE id = ?').run(tgtTeam, tgtFlag, sourceMatchId);
        } else {
          db.prepare('UPDATE matches SET team_b = ?, flag_b = ? WHERE id = ?').run(tgtTeam, tgtFlag, sourceMatchId);
        }
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
      SELECT DISTINCT team_a as name, flag_a as flag FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba')
      UNION
      SELECT DISTINCT team_b as name, flag_b as flag FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba')
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
  const groupTotal = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba')").get().count;
  const groupPlayed = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba') AND result IS NOT NULL").get().count;
  const knockoutTotal = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name IN ('R32','R16','QF','SF','Third','Final')").get().count;
  const knockoutPlayed = db.prepare("SELECT COUNT(*) as count FROM matches WHERE group_name IN ('R32','R16','QF','SF','Third','Final') AND result IS NOT NULL").get().count;
  const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM participants').get().count;
  const totalPredictions = db.prepare('SELECT COUNT(*) as count FROM predictions').get().count;
  
  res.json({
    totalMatches: groupTotal + knockoutTotal,
    playedMatches: groupPlayed + knockoutPlayed,
    groupTotal,
    groupPlayed,
    knockoutTotal,
    knockoutPlayed,
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
    const groupMatches = db.prepare("SELECT * FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba') AND result IS NOT NULL").all();

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
        WHERE match_id IN (SELECT id FROM matches WHERE group_name IN ('R32','R16','QF','SF','Third','Final'))
      `).run();
      
      // 3. Reset knockout matches back to TBD
      db.prepare(`
        UPDATE matches 
        SET team_a = 'A definir', team_b = 'A definir', flag_a = 'un', flag_b = 'un', result = NULL
        WHERE group_name IN ('R32','R16','QF','SF','Third','Final')
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
    const betsEnabledR32 = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_R32'").get();
    const betsEnabledR16 = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_R16'").get();
    const betsEnabledQF = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_QF'").get();
    const betsEnabledSF = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_SF'").get();
    const betsEnabledThird = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_Third'").get();
    const betsEnabledFinal = db.prepare("SELECT value FROM settings WHERE key = 'bets_enabled_Final'").get();
    const showPredictions = db.prepare("SELECT value FROM settings WHERE key = 'show_predictions'").get();
    const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
    const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
    const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
    const celebrationsRow = db.prepare("SELECT value FROM settings WHERE key = 'celebrations_enabled'").get();
    
    res.json({
      theme: theme ? theme.value : '#3b82f6',
      betsEnabled: betsEnabled ? betsEnabled.value === 'true' : true,
      betsEnabledR32: betsEnabledR32 ? betsEnabledR32.value === 'true' : true,
      betsEnabledR16: betsEnabledR16 ? betsEnabledR16.value === 'true' : true,
      betsEnabledQF: betsEnabledQF ? betsEnabledQF.value === 'true' : true,
      betsEnabledSF: betsEnabledSF ? betsEnabledSF.value === 'true' : true,
      betsEnabledThird: betsEnabledThird ? betsEnabledThird.value === 'true' : true,
      betsEnabledFinal: betsEnabledFinal ? betsEnabledFinal.value === 'true' : true,
      showPredictions: showPredictions ? showPredictions.value === 'true' : true,
      celebrationsEnabled: celebrationsRow ? celebrationsRow.value === 'true' : true,
      pointsWin: pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3,
      pointsDraw: pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1,
      tournamentPhase: phaseRow ? phaseRow.value : 'groups'
    });
  } catch(e) {
    res.json({
      theme: '#3b82f6',
      betsEnabled: true,
      betsEnabledR32: true,
      betsEnabledR16: true,
      betsEnabledQF: true,
      betsEnabledSF: true,
      betsEnabledThird: true,
      betsEnabledFinal: true,
      showPredictions: true,
      celebrationsEnabled: true,
      pointsWin: 3,
      pointsDraw: 1,
      tournamentPhase: 'groups'
    });
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

// Toggle bets by phase
app.post('/api/settings/bets_enabled_phase', (req, res) => {
  try {
    const { phase, enabled } = req.body;
    const validPhases = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ error: 'Fase inválida' });
    }
    const val = enabled ? 'true' : 'false';
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`bets_enabled_${phase}`, val);
    res.json({ success: true, phase, enabled: enabled === true });
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

// Toggle celebration effects
app.post('/api/settings/celebrations', (req, res) => {
  try {
    const enabled = req.body.enabled ? 'true' : 'false';
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('celebrations_enabled', ?)").run(enabled);
    res.json({ success: true, celebrationsEnabled: enabled === 'true' });
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
      WHERE m.group_name != 'Prueba'
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

// ─── Excel Report Export ─────────────────────────────────────
app.get('/api/admin/export-excel', async (req, res) => {
  try {
    const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
    const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
    const ptsWin = pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3;
    const ptsDraw = pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1;

    // Fetch all data
    const participants = db.prepare('SELECT id, name, nickname FROM participants ORDER BY name').all();
    const allMatches = db.prepare('SELECT * FROM matches ORDER BY id').all();
    const allPredictions = db.prepare('SELECT participant_id, match_id, prediction FROM predictions').all();

    // Build prediction lookup: { participantId: { matchId: prediction } }
    const predMap = {};
    for (const pr of allPredictions) {
      if (!predMap[pr.participant_id]) predMap[pr.participant_id] = {};
      predMap[pr.participant_id][pr.match_id] = pr.prediction;
    }

    // Separate matches
    const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
    const groupMatches = allMatches.filter(m => !knockoutRounds.includes(m.group_name) && m.group_name !== 'Prueba');
    const knockoutMatches = allMatches.filter(m => knockoutRounds.includes(m.group_name));

    // Calculate total points per participant (all phases combined)
    function calcPoints(participant, matchList) {
      let points = 0, aciertos = 0, total = 0;
      for (const m of matchList) {
        const pred = predMap[participant.id]?.[m.id];
        if (pred) total++;
        if (m.result && pred === m.result) {
          aciertos++;
          points += m.result === 'D' ? ptsDraw : ptsWin;
        }
      }
      return { points, aciertos, total };
    }

    // ── Create Workbook ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quinela Mundial 2026';
    workbook.created = new Date();

    // ── Styles ──
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
    const redFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
    const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9CA3AF' } };
    const goldFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };
    const silverFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
    const bronzeFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ══════════════════════════════════════════════════════════
    // HOJA 1: Tabla General
    // ══════════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('🏆 Tabla General');

    // Calculate combined stats for summary
    const summaryData = participants.map(p => {
      const gStats = calcPoints(p, groupMatches);
      const kStats = calcPoints(p, knockoutMatches);
      return {
        ...p,
        ptsGroups: gStats.points,
        aciertosGroups: gStats.aciertos,
        ptsKnockout: kStats.points,
        aciertosKnockout: kStats.aciertos,
        totalPoints: gStats.points + kStats.points,
        totalAciertos: gStats.aciertos + kStats.aciertos,
        totalPredictions: gStats.total + kStats.total
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalAciertos - a.totalAciertos);

    ws1.columns = [
      { header: '#', key: 'pos', width: 5 },
      { header: 'Participante', key: 'name', width: 22 },
      { header: 'Apodo', key: 'nickname', width: 18 },
      { header: 'Pts Grupos', key: 'ptsGroups', width: 12 },
      { header: 'Aciertos Grupos', key: 'aciertosGroups', width: 16 },
      { header: 'Pts Eliminatoria', key: 'ptsKnockout', width: 17 },
      { header: 'Aciertos Eliminatoria', key: 'aciertosKnockout', width: 22 },
      { header: 'Puntos Totales', key: 'totalPoints', width: 15 },
      { header: 'Aciertos Totales', key: 'totalAciertos', width: 17 },
      { header: 'Apuestas Hechas', key: 'totalPredictions', width: 16 }
    ];

    // Style header row
    const headerRow1 = ws1.getRow(1);
    headerRow1.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });
    headerRow1.height = 28;

    summaryData.forEach((p, i) => {
      const row = ws1.addRow({
        pos: i + 1,
        name: p.name,
        nickname: p.nickname || '',
        ptsGroups: p.ptsGroups,
        aciertosGroups: p.aciertosGroups,
        ptsKnockout: p.ptsKnockout,
        aciertosKnockout: p.aciertosKnockout,
        totalPoints: p.totalPoints,
        totalAciertos: p.totalAciertos,
        totalPredictions: p.totalPredictions
      });
      row.eachCell(cell => { cell.border = thinBorder; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
      row.getCell('name').alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell('nickname').alignment = { horizontal: 'left', vertical: 'middle' };

      // Medal rows
      if (i === 0) row.eachCell(cell => { cell.fill = goldFill; cell.font = { bold: true }; });
      if (i === 1) row.eachCell(cell => { cell.fill = silverFill; cell.font = { bold: true }; });
      if (i === 2) row.eachCell(cell => { cell.fill = bronzeFill; cell.font = { bold: true }; });
    });

    ws1.views = [{ state: 'frozen', ySplit: 1 }];

    // ══════════════════════════════════════════════════════════
    // HOJA 2: Fase de Grupos — Detallado
    // ══════════════════════════════════════════════════════════
    const ws2 = workbook.addWorksheet('⚽ Fase de Grupos');

    // Group matches by group_name, maintaining order
    const groupOrder = [...new Set(groupMatches.map(m => m.group_name))].sort();

    // Build columns: Participante + one column per match
    const groupCols = [
      { header: 'Participante', key: 'name', width: 22 }
    ];
    const groupMatchList = []; // ordered list of matches for indexing
    for (const g of groupOrder) {
      const gm = groupMatches.filter(m => m.group_name === g);
      for (const m of gm) {
        const colKey = `m_${m.id}`;
        const shortA = m.team_a.substring(0, 3).toUpperCase();
        const shortB = m.team_b.substring(0, 3).toUpperCase();
        groupCols.push({ header: `${shortA} vs ${shortB}`, key: colKey, width: 16 });
        groupMatchList.push(m);
      }
    }
    groupCols.push({ header: 'Aciertos', key: 'aciertos', width: 10 });
    groupCols.push({ header: 'Puntos', key: 'puntos', width: 10 });

    ws2.columns = groupCols;

    // Build a group-header row (merge cells per group)
    // Insert group labels row ABOVE match headers
    ws2.spliceRows(1, 0, []);  // insert empty row at top
    let colIdx = 2; // start after 'Participante'
    for (const g of groupOrder) {
      const count = groupMatches.filter(m => m.group_name === g).length;
      const startCol = colIdx;
      const endCol = colIdx + count - 1;
      if (count > 1) {
        ws2.mergeCells(1, startCol, 1, endCol);
      }
      const cell = ws2.getCell(1, startCol);
      cell.value = `Grupo ${g}`;
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: 'FFFBBF24' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      // Fill remaining merged cells borders
      for (let c = startCol; c <= endCol; c++) {
        ws2.getCell(1, c).border = thinBorder;
      }
      colIdx += count;
    }
    // Style the "Participante" cell on row 1
    const partCell1 = ws2.getCell(1, 1);
    partCell1.value = '';
    partCell1.fill = headerFill;
    partCell1.border = thinBorder;
    // Totals header cells
    ws2.getCell(1, colIdx).value = '';
    ws2.getCell(1, colIdx).fill = headerFill;
    ws2.getCell(1, colIdx).border = thinBorder;
    ws2.getCell(1, colIdx + 1).value = '';
    ws2.getCell(1, colIdx + 1).fill = headerFill;
    ws2.getCell(1, colIdx + 1).border = thinBorder;

    // Style match-header row (row 2)
    const headerRow2 = ws2.getRow(2);
    headerRow2.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow2.height = 30;

    // Fill participant rows
    for (const p of participants) {
      const rowData = { name: p.name };
      let pts = 0, aci = 0;

      for (const m of groupMatchList) {
        const pred = predMap[p.id]?.[m.id];
        const colKey = `m_${m.id}`;

        if (!pred) {
          rowData[colKey] = 'Sin apuesta';
        } else if (pred === 'A') {
          rowData[colKey] = `Gana ${m.team_a.substring(0, 3).toUpperCase()}`;
        } else if (pred === 'B') {
          rowData[colKey] = `Gana ${m.team_b.substring(0, 3).toUpperCase()}`;
        } else {
          rowData[colKey] = 'Empate';
        }

        // Add points info if match has result
        if (m.result) {
          if (!pred) {
            rowData[colKey] = 'SIN APUESTA (0)';
          } else if (pred === m.result) {
            const earned = m.result === 'D' ? ptsDraw : ptsWin;
            pts += earned;
            aci++;
            rowData[colKey] += ` (+${earned})`;
          } else {
            rowData[colKey] += ' (0)';
          }
        }
      }

      rowData['aciertos'] = aci;
      rowData['puntos'] = pts;

      const row = ws2.addRow(rowData);

      // Color cells
      let ci = 2;
      for (const m of groupMatchList) {
        const cell = row.getCell(ci);
        const pred = predMap[p.id]?.[m.id];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
        cell.border = thinBorder;

        if (m.result) {
          if (!pred) {
            cell.fill = grayFill;
            cell.font = { size: 9, color: { argb: 'FFFFFFFF' }, italic: true };
          } else if (pred === m.result) {
            cell.fill = greenFill;
            cell.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          } else {
            cell.fill = redFill;
            cell.font = { size: 9, color: { argb: 'FFFFFFFF' } };
          }
        }
        ci++;
      }

      // Style name and totals
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(1).border = thinBorder;
      row.getCell(ci).border = thinBorder;
      row.getCell(ci).alignment = { horizontal: 'center' };
      row.getCell(ci).font = { bold: true };
      row.getCell(ci + 1).border = thinBorder;
      row.getCell(ci + 1).alignment = { horizontal: 'center' };
      row.getCell(ci + 1).font = { bold: true };
    }

    ws2.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    // ══════════════════════════════════════════════════════════
    // HOJA 3: Eliminatorias — Detallado
    // ══════════════════════════════════════════════════════════
    const ws3 = workbook.addWorksheet('🏟️ Eliminatorias');

    const roundLabels = { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', Final: 'Final' };
    const koRoundOrder = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];

    const koCols = [{ header: 'Participante', key: 'name', width: 22 }];
    const koMatchList = [];
    for (const round of koRoundOrder) {
      const rm = knockoutMatches.filter(m => m.group_name === round).sort((a, b) => a.bracket_position - b.bracket_position);
      for (const m of rm) {
        const colKey = `m_${m.id}`;
        const shortA = m.team_a === 'A definir' ? '???' : m.team_a.substring(0, 3).toUpperCase();
        const shortB = m.team_b === 'A definir' ? '???' : m.team_b.substring(0, 3).toUpperCase();
        koCols.push({ header: `${shortA} vs ${shortB}`, key: colKey, width: 16 });
        koMatchList.push(m);
      }
    }
    koCols.push({ header: 'Aciertos', key: 'aciertos', width: 10 });
    koCols.push({ header: 'Puntos', key: 'puntos', width: 10 });

    ws3.columns = koCols;

    // Round header row
    ws3.spliceRows(1, 0, []);
    colIdx = 2;
    for (const round of koRoundOrder) {
      const count = knockoutMatches.filter(m => m.group_name === round).length;
      if (count === 0) continue;
      const startCol = colIdx;
      const endCol = colIdx + count - 1;
      if (count > 1) {
        ws3.mergeCells(1, startCol, 1, endCol);
      }
      const cell = ws3.getCell(1, startCol);
      cell.value = roundLabels[round] || round;
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: 'FFFBBF24' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      for (let c = startCol; c <= endCol; c++) {
        ws3.getCell(1, c).border = thinBorder;
      }
      colIdx += count;
    }
    const partCell3 = ws3.getCell(1, 1);
    partCell3.value = '';
    partCell3.fill = headerFill;
    partCell3.border = thinBorder;
    ws3.getCell(1, colIdx).value = '';
    ws3.getCell(1, colIdx).fill = headerFill;
    ws3.getCell(1, colIdx).border = thinBorder;
    ws3.getCell(1, colIdx + 1).value = '';
    ws3.getCell(1, colIdx + 1).fill = headerFill;
    ws3.getCell(1, colIdx + 1).border = thinBorder;

    const headerRow3 = ws3.getRow(2);
    headerRow3.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow3.height = 30;

    for (const p of participants) {
      const rowData = { name: p.name };
      let pts = 0, aci = 0;

      for (const m of koMatchList) {
        const pred = predMap[p.id]?.[m.id];
        const colKey = `m_${m.id}`;

        if (!pred) {
          rowData[colKey] = 'Sin apuesta';
        } else if (pred === 'A') {
          rowData[colKey] = `Gana ${m.team_a.substring(0, 3).toUpperCase()}`;
        } else if (pred === 'B') {
          rowData[colKey] = `Gana ${m.team_b.substring(0, 3).toUpperCase()}`;
        } else {
          rowData[colKey] = 'Empate';
        }

        if (m.result) {
          if (!pred) {
            rowData[colKey] = 'SIN APUESTA (0)';
          } else if (pred === m.result) {
            const earned = m.result === 'D' ? ptsDraw : ptsWin;
            pts += earned;
            aci++;
            rowData[colKey] += ` (+${earned})`;
          } else {
            rowData[colKey] += ' (0)';
          }
        }
      }

      rowData['aciertos'] = aci;
      rowData['puntos'] = pts;

      const row = ws3.addRow(rowData);

      let ci = 2;
      for (const m of koMatchList) {
        const cell = row.getCell(ci);
        const pred = predMap[p.id]?.[m.id];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
        cell.border = thinBorder;

        if (m.result) {
          if (!pred) {
            cell.fill = grayFill;
            cell.font = { size: 9, color: { argb: 'FFFFFFFF' }, italic: true };
          } else if (pred === m.result) {
            cell.fill = greenFill;
            cell.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          } else {
            cell.fill = redFill;
            cell.font = { size: 9, color: { argb: 'FFFFFFFF' } };
          }
        }
        ci++;
      }

      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(1).border = thinBorder;
      row.getCell(ci).border = thinBorder;
      row.getCell(ci).alignment = { horizontal: 'center' };
      row.getCell(ci).font = { bold: true };
      row.getCell(ci + 1).border = thinBorder;
      row.getCell(ci + 1).alignment = { horizontal: 'center' };
      row.getCell(ci + 1).font = { bold: true };
    }

    ws3.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    // ── Send file ──
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=quinela_reporte_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
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

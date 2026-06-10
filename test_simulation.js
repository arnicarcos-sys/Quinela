const Database = require('better-sqlite3');
const fs = require('fs');

async function runSimulation() {
  console.log('🔄 Iniciando simulación de pruebas...');
  
  // 1. Crear una copia de la base de datos para pruebas
  const dbFile = 'test_simulation.db';
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }
  
  // Copiar la base de datos original si existe, o empezar una limpia
  if (fs.existsSync('quinela.db')) {
    fs.copyFileSync('quinela.db', dbFile);
    console.log('📋 Base de datos de prueba copiada de quinela.db');
  } else {
    console.error('❌ No se encontró quinela.db para clonar.');
    process.exit(1);
  }
  
  const db = new Database(dbFile);
  
  try {
    // 2. Insertar un participante de prueba
    db.prepare("INSERT OR IGNORE INTO participants (id, name, password) VALUES (999, 'TestUser', 'pass123')").run();
    console.log('👤 Participante de prueba creado (ID: 999)');
    
    // Obtener un partido de grupo y uno de eliminatorias (R32) para las pruebas
    const groupMatch = db.prepare("SELECT id FROM matches WHERE group_name NOT IN ('R32','R16','QF','SF','Third','Final','Prueba') LIMIT 1").get();
    const r32Match = db.prepare("SELECT id FROM matches WHERE group_name = 'R32' LIMIT 1").get();
    
    if (!groupMatch || !r32Match) {
      throw new Error('No se encontraron partidos de grupos o de R32 en la base de datos.');
    }
    
    console.log(`🏟️ Partido de Grupo seleccionado: ID ${groupMatch.id}`);
    console.log(`🏟️ Partido de Eliminatoria (R32) seleccionado: ID ${r32Match.id}`);

    // --- ESCENARIO 1: Fase de Grupos activa ---
    console.log('\n--- ESCENARIO 1: Fase de Grupos activa ---');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_phase', 'groups')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('bets_enabled', 'true')").run();
    
    // Predicción en grupo: Debería funcionar
    try {
      db.prepare(`
        INSERT INTO predictions (participant_id, match_id, prediction) 
        VALUES (999, ?, 'A')
        ON CONFLICT(participant_id, match_id) DO UPDATE SET prediction = excluded.prediction
      `).run(groupMatch.id);
      console.log('✅ Acierto: Predicción en Fase de Grupos guardada correctamente.');
    } catch (e) {
      console.error('❌ Error: No se pudo guardar predicción en Fase de Grupos:', e.message);
    }
    
    // Predicción en eliminatoria (R32) durante grupos: Debería fallar según la lógica que implementamos
    // Simularemos la verificación que hace server.js
    const testPrediction = (matchId, prediction) => {
      const match = db.prepare('SELECT group_name, result FROM matches WHERE id = ?').get(matchId);
      if (match.result) throw new Error('El partido ya tiene resultado');
      
      const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
      if (knockoutRounds.includes(match.group_name)) {
        const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
        const currentPhase = phaseRow ? phaseRow.value : 'groups';
        if (currentPhase === 'groups') {
          throw new Error('🔒 Las eliminatorias aún no han comenzado');
        }
      }
      
      db.prepare(`
        INSERT INTO predictions (participant_id, match_id, prediction) 
        VALUES (999, ?, ?)
        ON CONFLICT(participant_id, match_id) DO UPDATE SET prediction = excluded.prediction
      `).run(matchId, prediction);
    };

    try {
      testPrediction(r32Match.id, 'A');
      console.error('❌ Fallo: Se permitió una predicción de eliminatoria en Fase de Grupos.');
    } catch (e) {
      if (e.message.includes('Las eliminatorias aún no han comenzado')) {
        console.log('✅ Acierto: Bloqueada correctamente la predicción de eliminatoria (Mensaje:', e.message, ')');
      } else {
        console.error('❌ Error inesperado:', e.message);
      }
    }

    // --- ESCENARIO 2: Empezar Eliminatorias y Bloqueos de Fase ---
    console.log('\n--- ESCENARIO 2: Fase de Eliminatorias activa ---');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_phase', 'knockout')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('bets_enabled_R32', 'true')").run();
    
    // Ahora debería funcionar predecir en R32 ya que empezó la fase y está desbloqueada R32
    const testPredictionWithPhaseLocks = (matchId, prediction) => {
      const match = db.prepare('SELECT group_name, result FROM matches WHERE id = ?').get(matchId);
      const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
      
      if (knockoutRounds.includes(match.group_name)) {
        const phaseRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_phase'").get();
        const currentPhase = phaseRow ? phaseRow.value : 'groups';
        if (currentPhase === 'groups') {
          throw new Error('🔒 Las eliminatorias aún no han comenzado');
        }
        const phaseKey = `bets_enabled_${match.group_name}`;
        const phaseEnabled = db.prepare("SELECT value FROM settings WHERE key = ?").get(phaseKey);
        if (phaseEnabled && phaseEnabled.value === 'false') {
          throw new Error(`🔒 Las predicciones para la fase ${match.group_name} están cerradas`);
        }
      }
      
      db.prepare(`
        INSERT INTO predictions (participant_id, match_id, prediction) 
        VALUES (999, ?, ?)
        ON CONFLICT(participant_id, match_id) DO UPDATE SET prediction = excluded.prediction
      `).run(matchId, prediction);
    };

    try {
      testPredictionWithPhaseLocks(r32Match.id, 'A');
      console.log('✅ Acierto: Predicción en R32 guardada correctamente cuando está desbloqueada.');
    } catch (e) {
      console.error('❌ Error: No se pudo guardar predicción en R32:', e.message);
    }

    // --- ESCENARIO 3: Bloquear R32 ---
    console.log('\n--- ESCENARIO 3: Bloquear R32 ---');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('bets_enabled_R32', 'false')").run();
    
    try {
      testPredictionWithPhaseLocks(r32Match.id, 'B');
      console.error('❌ Fallo: Se permitió guardar predicción en R32 estando la fase bloqueada.');
    } catch (e) {
      if (e.message.includes('están cerradas')) {
        console.log('✅ Acierto: Bloqueada correctamente la predicción de R32 (Mensaje:', e.message, ')');
      } else {
        console.error('❌ Error inesperado:', e.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Error general durante la simulación:', err.message);
  } finally {
    db.close();
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log('\n🧹 Limpieza completada: Base de datos temporal eliminada.');
    }
  }
}

runSimulation();

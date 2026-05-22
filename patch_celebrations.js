const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Add Event Listener
if (!app.includes("toggleCelebrations")) {
  app = app.replace(
    "// Predictions toggle\nif ($('#predictionsToggle')) {\n  $('#predictionsToggle').addEventListener('change', togglePredictionsVisibility);\n}",
    "// Predictions toggle\nif ($('#predictionsToggle')) {\n  $('#predictionsToggle').addEventListener('change', togglePredictionsVisibility);\n}\n// Celebrations toggle\nif ($('#celebrationsToggle')) {\n  $('#celebrationsToggle').addEventListener('change', toggleCelebrations);\n}"
  );
}

// 2. Add functions
if (!app.includes("updateCelebrationsUI")) {
  app = app.replace(
    "async function togglePredictionsVisibility() {",
    `function updateCelebrationsUI(celebrationsEnabled) {
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

async function togglePredictionsVisibility() {`
  );
}

// 3. Update initDashboard to parse celebrationsEnabled
app = app.replace(
  "updatePredictionsUI(statsData.showPredictions);",
  "updatePredictionsUI(statsData.showPredictions);\n  updateCelebrationsUI(statsData.celebrationsEnabled);"
);

app = app.replace(
  "window.betsEnabled = true;\n  window.showPredictions = true;",
  "window.betsEnabled = true;\n  window.showPredictions = true;\n  window.celebrationsEnabled = true;"
);
app = app.replace(
  "window.betsEnabled = statsData.betsEnabled;\n    window.showPredictions = statsData.showPredictions;",
  "window.betsEnabled = statsData.betsEnabled;\n    window.showPredictions = statsData.showPredictions;\n    window.celebrationsEnabled = statsData.celebrationsEnabled;"
);


// 4. Wrap confetti calls
app = app.replace(/if\s*\(window\.confetti\)\s*\{/g, "if (window.confetti && window.celebrationsEnabled !== false) {");
// For single-line without braces:
app = app.replace(/if\s*\(window\.confetti\)\s*confetti\(/g, "if (window.confetti && window.celebrationsEnabled !== false) confetti(");
app = app.replace(/if\s*\(result && window\.confetti\)\s*\{/g, "if (result && window.confetti && window.celebrationsEnabled !== false) {");

// 5. Suppress `celebrate-anim` if false
app = app.replace(
  "if (effectA === 'celebrate-anim') {",
  "if (effectA === 'celebrate-anim' && window.celebrationsEnabled !== false) {"
);
app = app.replace(
  "if (effectB === 'celebrate-anim') {",
  "if (effectB === 'celebrate-anim' && window.celebrationsEnabled !== false) {"
);
app = app.replace(
  "class=\"\${effectA === 'celebrate-anim' \\? 'winner-flag' : ''}\"",
  "class=\"\${effectA === 'celebrate-anim' && window.celebrationsEnabled !== false ? 'winner-flag' : ''}\""
);
app = app.replace(
  "class=\"\${effectB === 'celebrate-anim' \\? 'winner-flag' : ''}\"",
  "class=\"\${effectB === 'celebrate-anim' && window.celebrationsEnabled !== false ? 'winner-flag' : ''}\""
);
app = app.replace(
  "class=\"\${effect === 'celebrate-anim' \\? 'winner-flag' : ''}\"",
  "class=\"\${effect === 'celebrate-anim' && window.celebrationsEnabled !== false ? 'winner-flag' : ''}\""
);
app = app.replace(
  /\$\{effectA === 'celebrate-anim' \? '<span class="mini-confetti-badge">🎉<\/span>' : ''\}/g,
  "${effectA === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class=\"mini-confetti-badge\">🎉</span>' : ''}"
);
app = app.replace(
  /\$\{effectB === 'celebrate-anim' \? '<span class="mini-confetti-badge">🎉<\/span>' : ''\}/g,
  "${effectB === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class=\"mini-confetti-badge\">🎉</span>' : ''}"
);
app = app.replace(
  /\$\{effect === 'celebrate-anim' \? '<span class="mini-confetti-badge">🎉<\/span>' : ''\}/g,
  "${effect === 'celebrate-anim' && window.celebrationsEnabled !== false ? '<span class=\"mini-confetti-badge\">🎉</span>' : ''}"
);

fs.writeFileSync('public/app.js', app);
console.log('App patched!');

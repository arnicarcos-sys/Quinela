const fs = require('fs');

let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\['R32', 'R16', 'QF', 'SF', 'Final'\]/g, "['R32', 'R16', 'QF', 'SF', 'Third', 'Final']");
app = app.replace(/'R32','R16','QF','SF','Final'/g, "'R32','R16','QF','SF','Third','Final'");
app = app.replace(/'SF': '💎 Semifinales',/g, "'SF': '💎 Semifinales',\n    'Third': '🥉 Tercer Lugar',");
app = app.replace(/'SF': '💎 Semifinales',/g, "'SF': '💎 Semifinales',\n  'Third': '🥉 Tercer Lugar',");
app = app.replace(/round === 'Final' \? 'Gran Final'/g, "round === 'Third' ? 'Tercer Lugar' : round === 'Final' ? 'Gran Final'");
app = app.replace(/gName === 'Final' \? 'Final'/g, "gName === 'Third' ? 'Tercer' : gName === 'Final' ? 'Final'");
app = app.replace(/{ id: 'Final', label: '🏆 Final' }/g, "{ id: 'Third', label: '🥉 Tercer Lugar' },\n        { id: 'Final', label: '🏆 Final' }");
app = app.replace(/'SF': 'Semifinales',/g, "'SF': 'Semifinales',\n  'Third': 'Tercer Lugar',");
fs.writeFileSync('public/app.js', app);

let server = fs.readFileSync('server.js', 'utf8');
server = server.replace(/\['R32', 'R16', 'QF', 'SF', 'Final'\]/g, "['R32', 'R16', 'QF', 'SF', 'Third', 'Final']");
server = server.replace(/'R32','R16','QF','SF','Final','Prueba'/g, "'R32','R16','QF','SF','Third','Final','Prueba'");
server = server.replace(/'R32','R16','QF','SF','Final'/g, "'R32','R16','QF','SF','Third','Final'");
// Add the Third place match seed:
server = server.replace(/\/\/ ─── SF: 2 matches \(positions 1-2\) ───────────────────────\n    insertKnockout\.run\('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T15:00', 1\);\n    insertKnockout\.run\('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T19:00', 2\);/g, 
"// ─── SF: 2 matches (positions 1-2) ───────────────────────\n    insertKnockout.run('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T15:00', 1);\n    insertKnockout.run('SF', 'A definir', 'A definir', 'un', 'un', '2026-07-11T19:00', 2);\n\n    // ─── Third Place: 1 match (position 1) ───────────────────\n    insertKnockout.run('Third', 'A definir', 'A definir', 'un', 'un', '2026-07-12T16:00', 1);");

fs.writeFileSync('server.js', server);
console.log('Done modifying files');

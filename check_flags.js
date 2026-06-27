const db = require('better-sqlite3')('quinela.db');
// Check settings table for flag effects
const flagRows = db.prepare("SELECT * FROM settings WHERE key LIKE '%flag%' OR key LIKE '%effect%'").all();
console.log("Flag/effect settings:", JSON.stringify(flagRows, null, 2));

// Also check ALL settings
const allSettings = db.prepare("SELECT * FROM settings").all();
console.log("\nAll settings:", JSON.stringify(allSettings, null, 2));
db.close();

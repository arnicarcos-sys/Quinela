const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3000 });

  console.log(`\n🌍 ══════════════════════════════════════════════════════════ 🌍`);
  console.log(`   ¡QUINELA MUNDIAL 2026 - ENLACE PÚBLICO!`);
  console.log(`   → Comparte este link: ${tunnel.url}`);
  console.log(`   → Cualquier persona con este enlace puede acceder`);
  console.log(`🌍 ══════════════════════════════════════════════════════════ 🌍\n`);

  tunnel.on('close', () => {
    console.log('❌ El túnel se cerró.');
    process.exit(0);
  });

  tunnel.on('error', (err) => {
    console.error('Error en el túnel:', err);
  });

  // Keep alive
  process.on('SIGINT', () => {
    tunnel.close();
    process.exit(0);
  });
})();

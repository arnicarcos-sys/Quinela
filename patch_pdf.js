const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

const pdfCode = `
// ─── PDF Report Export (Fase de Grupos) ──────────────────────
window.downloadGroupsPDF = async function() {
  showToast('📄 Generando PDF de Fase de Grupos...', 'success');
  
  try {
    const { jsPDF } = window.jspdf;
    
    // Fetch fresh data
    const [matchesRes, participantsRes, predRes] = await Promise.all([
      fetch('/api/matches'),
      fetch('/api/participants'),
      fetch('/api/predictions/all')
    ]);
    
    if (!matchesRes.ok || !participantsRes.ok || !predRes.ok) {
      throw new Error("No se pudo obtener la información completa");
    }
    
    const matches = await matchesRes.json();
    const participants = await participantsRes.json();
    const allPredictions = await predRes.json();
    
    // Only group matches
    const groupMatches = matches.filter(m => !['R32', 'R16', 'QF', 'SF', 'Third', 'Final', 'Prueba'].includes(m.group_name));
    
    // Create prediction map
    const predMap = {};
    for (const pr of allPredictions) {
      if (!predMap[pr.participant_id]) predMap[pr.participant_id] = {};
      predMap[pr.participant_id][pr.match_id] = pr.prediction;
    }
    
    // Setup PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    let isFirstPage = true;
    
    const groupOrder = [...new Set(groupMatches.map(m => m.group_name))].sort();
    
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
      const gMatches = groupMatches.filter(m => m.group_name === groupName);
      if (gMatches.length === 0) continue;
      
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(\`Quinela Mundial 2026 - Fase de Grupos : GRUPO \${groupName}\`, 14, 15);
      
      const head = [['Participante', 'Aciertos', 'Puntos']];
      for (const m of gMatches) {
        const shortA = m.team_a.substring(0, 3).toUpperCase();
        const shortB = m.team_b.substring(0, 3).toUpperCase();
        head[0].push(\`\${shortA} vs \${shortB}\`);
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
          if (pred === 'A') cellText = \`\${m.team_a.substring(0, 3).toUpperCase()}\`;
          else if (pred === 'B') cellText = \`\${m.team_b.substring(0, 3).toUpperCase()}\`;
          else if (pred === 'D') cellText = 'Empate';
          
          if (m.result) {
            if (!pred) cellText = 'SIN APUESTA';
            else if (pred === m.result) {
               const earned = m.result === 'D' ? window.pointsDraw : window.pointsWin;
               cellText += \` (+\${earned})\`;
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
    
    doc.save(\`Quinela_Fase_Grupos_\${new Date().toISOString().split('T')[0]}.pdf\`);
    showToast('📥 PDF generado con éxito', 'success');
    
  } catch (err) {
    console.error(err);
    showToast('Error al generar el PDF', 'error');
  }
};
`;

if (!app.includes("downloadGroupsPDF")) {
  app += "\n" + pdfCode;
  fs.writeFileSync('public/app.js', app);
  console.log('App patched with PDF logic!');
} else {
  console.log('Already patched');
}

const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const fs = require('fs');

async function testExcel() {
  try {
    const db = new Database('quinela.db');
    const pointsWinRow = db.prepare("SELECT value FROM settings WHERE key = 'points_win'").get();
    const pointsDrawRow = db.prepare("SELECT value FROM settings WHERE key = 'points_draw'").get();
    const ptsWin = pointsWinRow ? parseInt(pointsWinRow.value, 10) : 3;
    const ptsDraw = pointsDrawRow ? parseInt(pointsDrawRow.value, 10) : 1;

    const participants = db.prepare('SELECT id, name, nickname FROM participants ORDER BY name').all();
    const allMatches = db.prepare('SELECT * FROM matches ORDER BY id').all();
    const allPredictions = db.prepare('SELECT participant_id, match_id, prediction FROM predictions').all();

    const predMap = {};
    for (const pr of allPredictions) {
      if (!predMap[pr.participant_id]) predMap[pr.participant_id] = {};
      predMap[pr.participant_id][pr.match_id] = pr.prediction;
    }

    const knockoutRounds = ['R32', 'R16', 'QF', 'SF', 'Third', 'Final'];
    const groupMatches = allMatches.filter(m => !knockoutRounds.includes(m.group_name) && m.group_name !== 'Prueba');
    const knockoutMatches = allMatches.filter(m => knockoutRounds.includes(m.group_name));

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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quinela Mundial 2026';
    workbook.created = new Date();

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

    // HOJA 1
    const ws1 = workbook.addWorksheet('🏆 Tabla General');
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
      if (i === 0) row.eachCell(cell => { cell.fill = goldFill; cell.font = { bold: true }; });
      if (i === 1) row.eachCell(cell => { cell.fill = silverFill; cell.font = { bold: true }; });
      if (i === 2) row.eachCell(cell => { cell.fill = bronzeFill; cell.font = { bold: true }; });
    });

    ws1.views = [{ state: 'frozen', ySplit: 1 }];

    // HOJA 2
    const ws2 = workbook.addWorksheet('⚽ Fase de Grupos');
    const groupOrder = [...new Set(groupMatches.map(m => m.group_name))].sort();
    const groupCols = [{ header: 'Participante', key: 'name', width: 22 }];
    const groupMatchList = [];
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

    ws2.spliceRows(1, 0, []);
    let colIdx = 2;
    for (const g of groupOrder) {
      const count = groupMatches.filter(m => m.group_name === g).length;
      if (count === 0) continue;
      const startCol = colIdx;
      const endCol = colIdx + count - 1;
      if (count > 1) ws2.mergeCells(1, startCol, 1, endCol);
      const cell = ws2.getCell(1, startCol);
      cell.value = `Grupo ${g}`;
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: 'FFFBBF24' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      for (let c = startCol; c <= endCol; c++) ws2.getCell(1, c).border = thinBorder;
      colIdx += count;
    }
    const partCell1 = ws2.getCell(1, 1);
    partCell1.value = ''; partCell1.fill = headerFill; partCell1.border = thinBorder;
    ws2.getCell(1, colIdx).value = ''; ws2.getCell(1, colIdx).fill = headerFill; ws2.getCell(1, colIdx).border = thinBorder;
    ws2.getCell(1, colIdx + 1).value = ''; ws2.getCell(1, colIdx + 1).fill = headerFill; ws2.getCell(1, colIdx + 1).border = thinBorder;

    const headerRow2 = ws2.getRow(2);
    headerRow2.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow2.height = 30;

    for (const p of participants) {
      const rowData = { name: p.name };
      let pts = 0, aci = 0;
      for (const m of groupMatchList) {
        const pred = predMap[p.id]?.[m.id];
        const colKey = `m_${m.id}`;
        if (!pred) rowData[colKey] = 'Sin apuesta';
        else if (pred === 'A') rowData[colKey] = `Gana ${m.team_a.substring(0, 3).toUpperCase()}`;
        else if (pred === 'B') rowData[colKey] = `Gana ${m.team_b.substring(0, 3).toUpperCase()}`;
        else rowData[colKey] = 'Empate';

        if (m.result) {
          if (!pred) rowData[colKey] = 'SIN APUESTA (0)';
          else if (pred === m.result) {
            const earned = m.result === 'D' ? ptsDraw : ptsWin;
            pts += earned; aci++;
            rowData[colKey] += ` (+${earned})`;
          } else rowData[colKey] += ' (0)';
        }
      }
      rowData['aciertos'] = aci; rowData['puntos'] = pts;
      const row = ws2.addRow(rowData);
      let ci = 2;
      for (const m of groupMatchList) {
        const cell = row.getCell(ci);
        const pred = predMap[p.id]?.[m.id];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 }; cell.border = thinBorder;
        if (m.result) {
          if (!pred) { cell.fill = grayFill; cell.font = { size: 9, color: { argb: 'FFFFFFFF' }, italic: true }; }
          else if (pred === m.result) { cell.fill = greenFill; cell.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }; }
          else { cell.fill = redFill; cell.font = { size: 9, color: { argb: 'FFFFFFFF' } }; }
        }
        ci++;
      }
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }; row.getCell(1).border = thinBorder;
      row.getCell(ci).border = thinBorder; row.getCell(ci).alignment = { horizontal: 'center' }; row.getCell(ci).font = { bold: true };
      row.getCell(ci + 1).border = thinBorder; row.getCell(ci + 1).alignment = { horizontal: 'center' }; row.getCell(ci + 1).font = { bold: true };
    }
    ws2.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    // HOJA 3
    const ws3 = workbook.addWorksheet('🏟️ Eliminatorias');
    const roundLabels = { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', Third: 'Tercer Lugar', Final: 'Final' };
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

    ws3.spliceRows(1, 0, []);
    colIdx = 2;
    for (const round of koRoundOrder) {
      const count = knockoutMatches.filter(m => m.group_name === round).length;
      if (count === 0) continue;
      const startCol = colIdx;
      const endCol = colIdx + count - 1;
      if (count > 1) ws3.mergeCells(1, startCol, 1, endCol);
      const cell = ws3.getCell(1, startCol);
      cell.value = roundLabels[round] || round;
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: 'FFFBBF24' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      for (let c = startCol; c <= endCol; c++) ws3.getCell(1, c).border = thinBorder;
      colIdx += count;
    }
    const partCell3 = ws3.getCell(1, 1);
    partCell3.value = ''; partCell3.fill = headerFill; partCell3.border = thinBorder;
    if(colIdx > 2) {
        ws3.getCell(1, colIdx).value = ''; ws3.getCell(1, colIdx).fill = headerFill; ws3.getCell(1, colIdx).border = thinBorder;
        ws3.getCell(1, colIdx + 1).value = ''; ws3.getCell(1, colIdx + 1).fill = headerFill; ws3.getCell(1, colIdx + 1).border = thinBorder;
    }
    
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
        if (!pred) rowData[colKey] = 'Sin apuesta';
        else if (pred === 'A') rowData[colKey] = `Gana ${m.team_a.substring(0, 3).toUpperCase()}`;
        else if (pred === 'B') rowData[colKey] = `Gana ${m.team_b.substring(0, 3).toUpperCase()}`;
        else rowData[colKey] = 'Empate';

        if (m.result) {
          if (!pred) rowData[colKey] = 'SIN APUESTA (0)';
          else if (pred === m.result) {
            const earned = m.result === 'D' ? ptsDraw : ptsWin;
            pts += earned; aci++;
            rowData[colKey] += ` (+${earned})`;
          } else rowData[colKey] += ' (0)';
        }
      }
      rowData['aciertos'] = aci; rowData['puntos'] = pts;
      const row = ws3.addRow(rowData);
      let ci = 2;
      for (const m of koMatchList) {
        const cell = row.getCell(ci);
        const pred = predMap[p.id]?.[m.id];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 }; cell.border = thinBorder;
        if (m.result) {
          if (!pred) { cell.fill = grayFill; cell.font = { size: 9, color: { argb: 'FFFFFFFF' }, italic: true }; }
          else if (pred === m.result) { cell.fill = greenFill; cell.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }; }
          else { cell.fill = redFill; cell.font = { size: 9, color: { argb: 'FFFFFFFF' } }; }
        }
        ci++;
      }
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }; row.getCell(1).border = thinBorder;
      row.getCell(ci).border = thinBorder; row.getCell(ci).alignment = { horizontal: 'center' }; row.getCell(ci).font = { bold: true };
      row.getCell(ci + 1).border = thinBorder; row.getCell(ci + 1).alignment = { horizontal: 'center' }; row.getCell(ci + 1).font = { bold: true };
    }
    ws3.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    await workbook.xlsx.writeFile('test.xlsx');
    console.log('Successfully wrote test.xlsx');
  } catch (err) {
    console.error('Error:', err);
  }
}
testExcel();

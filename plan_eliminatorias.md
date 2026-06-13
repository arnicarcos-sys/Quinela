# Plan de Implementación: Marcadores y Penales en Eliminatorias

El objetivo es permitir que en la fase de eliminatorias (octavos, cuartos, semifinales, etc.) los usuarios ingresen el **marcador exacto** del partido. En caso de que el marcador sea un empate, se mostrará una opción adicional para ingresar el marcador de los **penales**, evitando así la opción de "Empate general".

> [!WARNING]
> **Cambios Estructurales en la Base de Datos**
> Actualmente, la tabla `predictions` tiene una restricción `CHECK(prediction IN ('A', 'B', 'D'))`. En SQLite, no se puede alterar directamente una restricción `CHECK`. Para solucionarlo sin tener que recrear la tabla completa y arriesgar datos existentes, el plan propone **agregar nuevas columnas** (score_a, score_b, pen_a, pen_b) y seguir usando la columna `prediction` para guardar al ganador final ('A' o 'B') según el marcador de goles o penales.

## Open Questions (Preguntas para el usuario)

> [!IMPORTANT]
> Necesito tu confirmación en los siguientes puntos antes de proceder a programar:
> 
> 1. **Puntuación (Puntos)**: Al habilitar marcadores exactos, ¿cómo quieres que se calculen los puntos? 
>    - ¿Damos los mismos puntos (ej. 3 puntos) solo por atinarle a quién avanza (ganador final)?
>    - ¿O quieres dar puntos extra por atinarle al marcador exacto (ej. +2 puntos por marcador perfecto)?
> 2. **Base de Datos**: ¿Estás de acuerdo con el enfoque de agregar nuevas columnas (`score_a`, `score_b`, `pen_a`, `pen_b`) tanto a los partidos como a las predicciones para no romper la estructura actual?

## Proposed Changes

---

### Base de Datos (`server.js`)

Se actualizará la inicialización de la base de datos para agregar las nuevas columnas si no existen.

#### [MODIFY] [server.js](file:///c:/Users/DELL/.gemini/antigravity/scratch/quinela_mundial/server.js)
- Ejecutar un script seguro en el arranque que haga `ALTER TABLE predictions` y `ALTER TABLE matches` para agregar:
  - `score_a` (INTEGER)
  - `score_b` (INTEGER)
  - `pen_a` (INTEGER)
  - `pen_b` (INTEGER)
- Esto asegurará que los datos de grupos sigan funcionando como siempre.

---

### Backend / API (`server.js`)

Se adaptarán los endpoints que guardan predicciones y los que evalúan resultados.

#### [MODIFY] [server.js](file:///c:/Users/DELL/.gemini/antigravity/scratch/quinela_mundial/server.js)
- **Guardar Predicción (`/api/predictions` y `/api/predictions/batch`)**:
  - Recibir los campos opcionales `score_a`, `score_b`, `pen_a`, `pen_b`.
  - Si es eliminatoria, validar que se envíen los marcadores.
  - Si `score_a == score_b`, validar que también se envíen `pen_a` y `pen_b`, y deducir automáticamente si gana 'A' o 'B' para guardarlo en la columna `prediction` y respetar la restricción actual de SQLite.
- **Guardar Resultado de un Partido (`/api/admin/matches/:id/result`)**:
  - Permitir guardar el resultado con los marcadores y penales.
- **Cálculo de Puntos (`/api/leaderboard`, `/api/admin/export-excel`)**:
  - Ajustar el cálculo de puntos para eliminatorias (dependiendo de tu respuesta a la pregunta 1).

---

### Frontend / Interfaz de Usuario (`public/app.js` y `public/index.html`)

Se modificará la forma en que se muestran los partidos de las fases eliminatorias.

#### [MODIFY] [public/index.html](file:///c:/Users/DELL/.gemini/antigravity/scratch/quinela_mundial/public/index.html)
- Agregar un poco de HTML/CSS para los inputs numéricos (marcadores).

#### [MODIFY] [public/app.js](file:///c:/Users/DELL/.gemini/antigravity/scratch/quinela_mundial/public/app.js)
- En la función que renderiza las tarjetas de los partidos (`renderMatches` o similar), revisar la fase (`group_name`).
- Si es fase de grupos, mostrar los botones clásicos (Local, Empate, Visita).
- Si es fase de eliminatorias (Octavos, Cuartos, etc.):
  - Mostrar dos `<input type="number">` al lado de las banderas para el marcador.
  - Agregar un evento `onchange`: si los dos marcadores son iguales, mostrar una sección extra "Penales" con dos inputs más para el resultado de los penales.
- Al hacer clic en "Guardar Predicciones", construir el objeto incluyendo estos nuevos datos.

## Verification Plan

### Automated Tests
- No hay pruebas automatizadas formales en el proyecto, pero validaré que el servidor levante sin errores de sintaxis (`node server.js`).

### Manual Verification
- Te pediré que abras la app, vayas a la sección de "Octavos de Final".
- Intentes ingresar un marcador donde gane el equipo A.
- Intentes ingresar un empate, verificar que aparezcan las casillas de penales y puedas guardarlo.
- Verificar desde el panel de administrador que el partido se pueda resolver con un marcador y probar si los puntos se asignan correctamente en la tabla de posiciones.

@echo off
title Quinela Mundial 2026 - Compartir Link
echo.
echo  ================================================
echo       QUINELA MUNDIAL 2026 - LINK PUBLICO
echo  ================================================
echo.
echo  Generando enlace publico estable (sin pantallas de bloqueo)...
echo  (El servidor debe estar corriendo en otra ventana)
echo.
cd /d "%~dp0"
if not exist cloudflared.exe (
    echo [INFO] Descargando componente de red seguro (solo la primera vez)...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)
echo.
echo ========================================================
echo BUSCA UNA LINEA ABAJO QUE DIGA:
echo "https://ALGUN-NOMBRE-RARO.trycloudflare.com"
echo.
echo ESE ES TU LINK PARA COMPARTIR. COPIALO Y ENVIALO.
echo ========================================================
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
